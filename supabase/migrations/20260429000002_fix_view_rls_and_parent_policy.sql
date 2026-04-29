-- Migration: fix_view_rls_and_parent_policy
-- Applied: 2026-04-29 (Session 16)
--
-- PROBLEMS:
--   1. All 3 views (v_class_formula_progress, v_pupil_transfer_rate,
--      v_pending_writing_reviews) use the default security_definer mode,
--      meaning they bypass RLS. Any authenticated user can query cross-school
--      pupil data. This is a critical data isolation breach.
--
--   2. No profiles_parent_read RLS policy exists. Parents can only read their
--      own profile row (id = auth.uid()), so the ParentPage query
--      profiles.select().in('id', pupilIds) returns 0 rows — parent dashboard
--      shows no children.
--
-- FIXES:
--   1. Recreate all 3 views with:
--      a) WITH (security_invoker = true)  — view runs as the calling user,
--         so underlying RLS is respected.
--      b) Explicit WHERE c.teacher_id = auth.uid()  — belt-and-braces teacher
--         scope that doesn't rely on every joined table having RLS configured.
--
--   2. Add profiles_parent_read policy:
--      Parents may SELECT profiles rows for their approved linked pupils
--      (via parent_pupil table, approved = true).

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 1: Fix views — security_invoker + explicit teacher scope
-- ─────────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS public.v_class_formula_progress;

CREATE VIEW public.v_class_formula_progress
WITH (security_invoker = true)
AS
SELECT
  p.id AS pupil_id,
  p.first_name,
  p.class_id,
  p.school_id,
  c.name AS class_name,
  c.year_group,
  pp.current_formula_level,
  pp.current_streak,
  pp.longest_streak,
  pp.total_xp,
  pp.writing_studio_unlocked,
  pp.last_session_date,
  round(avg(fs.formula_score) FILTER (WHERE fs.session_date >= CURRENT_DATE - INTERVAL '30 days'), 1) AS avg_score_30d,
  count(fs.id) FILTER (WHERE fs.session_date >= CURRENT_DATE - INTERVAL '30 days') AS sessions_30d,
  bool_or(mt.consolidation_required) AS has_consolidation_flag
FROM profiles p
LEFT JOIN classes c ON c.id = p.class_id
LEFT JOIN pupil_progress pp ON pp.pupil_id = p.id
LEFT JOIN formula_sessions fs ON fs.pupil_id = p.id
LEFT JOIN mastery_tracking mt ON mt.pupil_id = p.id AND mt.consolidation_required = true
WHERE p.role = 'pupil'
  AND c.teacher_id = auth.uid()
GROUP BY
  p.id, p.first_name, p.class_id, p.school_id,
  c.name, c.year_group,
  pp.current_formula_level, pp.current_streak, pp.longest_streak,
  pp.total_xp, pp.writing_studio_unlocked, pp.last_session_date;

-- ─────────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS public.v_pupil_transfer_rate;

CREATE VIEW public.v_pupil_transfer_rate
WITH (security_invoker = true)
AS
SELECT
  pp.pupil_id,
  p.class_id,
  pp.current_formula_level,
  (
    count(CASE WHEN fs.formula_score >= 80 THEN 1 END)::double precision
    / NULLIF(count(*), 0)::double precision
  ) AS success_rate_last_5,
  max(fs.session_date) AS last_session_date
FROM pupil_progress pp
JOIN profiles p ON p.id = pp.pupil_id
LEFT JOIN formula_sessions fs ON fs.pupil_id = pp.pupil_id
  AND fs.session_date >= CURRENT_DATE - INTERVAL '30 days'
WHERE p.class_id IN (
  SELECT id FROM classes WHERE teacher_id = auth.uid()
)
GROUP BY pp.pupil_id, p.class_id, pp.current_formula_level;

-- ─────────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS public.v_pending_writing_reviews;

CREATE VIEW public.v_pending_writing_reviews
WITH (security_invoker = true)
AS
SELECT
  wp.id,
  wp.pupil_id,
  p.first_name AS pupil_name,
  p.class_id,
  wp.genre,
  wp.word_count,
  wp.submitted_at,
  (CURRENT_DATE - wp.submitted_at::date) AS days_pending,
  c.teacher_id
FROM writing_pieces wp
JOIN profiles p ON p.id = wp.pupil_id
LEFT JOIN classes c ON c.id = p.class_id
WHERE wp.status = 'submitted'
  AND c.teacher_id = auth.uid()
ORDER BY wp.submitted_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 2: Add profiles_parent_read policy
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop existing policy if it exists (idempotent)
DROP POLICY IF EXISTS profiles_parent_read ON profiles;

-- Parents can SELECT profiles of pupils they are approved to be linked with.
-- The parent_pupil table is the source of truth for parent↔pupil relationships.
CREATE POLICY profiles_parent_read ON profiles
  FOR SELECT
  USING (
    id IN (
      SELECT pupil_id
      FROM parent_pupil
      WHERE parent_id = auth.uid()
        AND approved = true
    )
  );
