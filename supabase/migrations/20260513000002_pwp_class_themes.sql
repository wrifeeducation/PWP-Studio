-- Migration: pwp_class_themes + teacher RLS for PWP tables
-- Phase 16 — Teacher dashboard
--
-- 1. Creates pwp_class_themes — teacher sets a weekly formula focus for their class
-- 2. Adds teacher SELECT policies on formula_progress, pwp_quiz_attempts, pwp_pupil_badges
--    so the teacher dashboard can read pupil progress data
-- 3. Adds pwp_quiz_attempts table (used by QuizPage but never migrated explicitly)

-- ─── pwp_quiz_attempts ────────────────────────────────────────────────────────
-- Written by QuizPage.tsx after each quiz session.
-- One row per attempt (same pupil may attempt a quiz multiple times).

CREATE TABLE IF NOT EXISTS public.pwp_quiz_attempts (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  pupil_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id        integer     NOT NULL,
  attempt_number integer     NOT NULL DEFAULT 1,
  score          integer     NOT NULL DEFAULT 0,   -- correct answers
  total_prompts  integer     NOT NULL DEFAULT 0,
  passed         boolean     NOT NULL DEFAULT false,
  xp_earned      integer     NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now() NOT NULL,
  UNIQUE (pupil_id, quiz_id, attempt_number)
);

ALTER TABLE public.pwp_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Pupils: own rows only
CREATE POLICY "pwp_quiz_attempts_pupil_select" ON public.pwp_quiz_attempts
  FOR SELECT USING (auth.uid() = pupil_id);

CREATE POLICY "pwp_quiz_attempts_pupil_insert" ON public.pwp_quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = pupil_id);

CREATE INDEX IF NOT EXISTS idx_pwp_quiz_attempts_pupil
  ON public.pwp_quiz_attempts (pupil_id);

-- ─── pwp_quiz_results ─────────────────────────────────────────────────────────
-- JSONB per-prompt breakdown (used by QuizPage, not for the dashboard).

CREATE TABLE IF NOT EXISTS public.pwp_quiz_results (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id      integer     NOT NULL,
  pupil_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompts      jsonb       NOT NULL DEFAULT '[]',
  overall_passed boolean   NOT NULL DEFAULT false,
  completed_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.pwp_quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pwp_quiz_results_pupil_select" ON public.pwp_quiz_results
  FOR SELECT USING (auth.uid() = pupil_id);

CREATE POLICY "pwp_quiz_results_pupil_insert" ON public.pwp_quiz_results
  FOR INSERT WITH CHECK (auth.uid() = pupil_id);

-- ─── pwp_class_themes ────────────────────────────────────────────────────────
-- Teachers set a weekly formula-level focus for their class.
-- One active theme per class at a time; historical rows are kept for reference.

CREATE TABLE IF NOT EXISTS public.pwp_class_themes (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id            uuid        NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  formula_level       integer     NOT NULL CHECK (formula_level BETWEEN 1 AND 35),
  theme_label         text,               -- optional teacher note / title
  week_start          date        NOT NULL DEFAULT CURRENT_DATE,
  active              boolean     NOT NULL DEFAULT true,
  set_by              uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.pwp_class_themes ENABLE ROW LEVEL SECURITY;

-- Teachers own the classes they manage
CREATE POLICY "pwp_class_themes_teacher_all" ON public.pwp_class_themes
  FOR ALL
  USING  (class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid()))
  WITH CHECK (class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid()));

-- Pupils can read the active theme for their class
CREATE POLICY "pwp_class_themes_pupil_read" ON public.pwp_class_themes
  FOR SELECT
  USING (
    active = true
    AND class_id IN (
      SELECT class_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_pwp_class_themes_class_active
  ON public.pwp_class_themes (class_id, active);

-- ─── Teacher RLS: formula_progress ───────────────────────────────────────────
-- Teachers may read formula_progress rows for pupils in their classes.
-- (Pupils can already SELECT their own row via the existing owner policy.)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'formula_progress'
      AND policyname = 'formula_progress_teacher_read'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY formula_progress_teacher_read ON public.formula_progress
        FOR SELECT
        USING (
          pupil_id IN (
            SELECT p.id
            FROM   public.profiles p
            JOIN   public.classes  c ON c.id = p.class_id
            WHERE  c.teacher_id = auth.uid()
              AND  p.role = 'pupil'
          )
        )
    $policy$;
  END IF;
END $$;

-- ─── Teacher RLS: pwp_quiz_attempts ──────────────────────────────────────────

CREATE POLICY "pwp_quiz_attempts_teacher_read" ON public.pwp_quiz_attempts
  FOR SELECT
  USING (
    pupil_id IN (
      SELECT p.id
      FROM   public.profiles p
      JOIN   public.classes  c ON c.id = p.class_id
      WHERE  c.teacher_id = auth.uid()
        AND  p.role = 'pupil'
    )
  );

-- ─── Teacher RLS: pwp_pupil_badges ───────────────────────────────────────────

CREATE POLICY "pwp_pupil_badges_teacher_read" ON public.pwp_pupil_badges
  FOR SELECT
  USING (
    pupil_id IN (
      SELECT p.id
      FROM   public.profiles p
      JOIN   public.classes  c ON c.id = p.class_id
      WHERE  c.teacher_id = auth.uid()
        AND  p.role = 'pupil'
    )
  );
