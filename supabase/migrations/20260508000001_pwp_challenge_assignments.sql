-- Migration: pwp_challenge_assignments
-- Allows teachers, parents, and the AI engine to assign extension challenges
-- to a whole class or an individual pupil after they have built their formula sentence.
--
-- source values:
--   'teacher'      — school teacher assigned explicitly from wrife.co.uk (future)
--   'parent'       — parent assigned from PWP Studio parent view
--   'independent'  — independent teacher assigned from PWP Studio teacher view
--   'ai_suggested' — AI flagged readiness; teacher/parent confirmed with one click
--   'ai_auto'      — AI auto-activated fallback (no teacher action after threshold)
--
-- challenge_type values:
--   'sentence_type' — transform statement → question / imperative / exclamatory
--   'add_list'      — extend noun phrase with a comma-separated list
--   'compound'      — join two clauses with a coordinating conjunction (FANBOYS)
--   'complex'       — add a subordinate clause with a subordinating conjunction

CREATE TABLE IF NOT EXISTS public.pwp_challenge_assignments (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who assigned it (auth.uid() of the assigning teacher/parent, or null for AI-auto)
  assigned_by_user_id UUID      REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Scope: class-wide (pupil_id IS NULL) OR individual pupil (class_id optional)
  class_id          UUID        REFERENCES public.classes(id) ON DELETE CASCADE,
  pupil_id          UUID        REFERENCES public.pupils(id)  ON DELETE CASCADE,

  -- What kind of challenge
  challenge_type    TEXT        NOT NULL
    CHECK (challenge_type IN ('sentence_type', 'add_list', 'compound', 'complex')),

  -- Who/what created this row
  source            TEXT        NOT NULL
    CHECK (source IN ('teacher', 'parent', 'independent', 'ai_suggested', 'ai_auto')),

  -- Lifecycle
  active            BOOLEAN     NOT NULL DEFAULT true,
  assigned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date          TIMESTAMPTZ,

  -- At least one scope target must be set
  CONSTRAINT challenge_has_target CHECK (class_id IS NOT NULL OR pupil_id IS NOT NULL)
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

-- Fast lookup: which challenges are active for a given class?
CREATE INDEX idx_pwp_challenges_class
  ON public.pwp_challenge_assignments (class_id, active)
  WHERE class_id IS NOT NULL;

-- Fast lookup: which challenges are active for a given pupil?
CREATE INDEX idx_pwp_challenges_pupil
  ON public.pwp_challenge_assignments (pupil_id, active)
  WHERE pupil_id IS NOT NULL;

-- Prevent duplicate active class-wide challenges of the same type
CREATE UNIQUE INDEX uniq_active_class_challenge
  ON public.pwp_challenge_assignments (class_id, challenge_type)
  WHERE pupil_id IS NULL AND active = true;

-- Prevent duplicate active pupil-specific challenges of the same type
CREATE UNIQUE INDEX uniq_active_pupil_challenge
  ON public.pwp_challenge_assignments (pupil_id, challenge_type)
  WHERE active = true;

-- ── Row-Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.pwp_challenge_assignments ENABLE ROW LEVEL SECURITY;

-- Teachers and home-account users (parents / independent teachers):
-- they own classes where classes.teacher_id = auth.uid()
-- Both school teachers (profiles) and home accounts (home_accounts.auth_user_id)
-- use teacher_id = auth.uid() on the classes table, so one policy covers all.

CREATE POLICY "Assigners can manage challenges for their classes"
  ON public.pwp_challenge_assignments
  FOR ALL
  USING (
    class_id IN (
      SELECT id FROM public.classes WHERE teacher_id = auth.uid()
    )
    OR (
      pupil_id IS NOT NULL AND class_id IS NULL AND
      pupil_id IN (
        SELECT cm.pupil_id
        FROM public.class_members cm
        JOIN public.classes c ON c.id = cm.class_id
        WHERE c.teacher_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    class_id IN (
      SELECT id FROM public.classes WHERE teacher_id = auth.uid()
    )
    OR (
      pupil_id IS NOT NULL AND class_id IS NULL AND
      pupil_id IN (
        SELECT cm.pupil_id
        FROM public.class_members cm
        JOIN public.classes c ON c.id = cm.class_id
        WHERE c.teacher_id = auth.uid()
      )
    )
  );

-- Pupils: can only read active challenges assigned to their class or directly to them
CREATE POLICY "Pupils can read their active challenges"
  ON public.pwp_challenge_assignments
  FOR SELECT
  USING (
    active = true
    AND (
      -- Class-wide challenge for a class the pupil belongs to
      class_id IN (
        SELECT cm.class_id
        FROM public.class_members cm
        JOIN public.pupils p ON p.id = cm.pupil_id
        WHERE p.auth_user_id = auth.uid()
      )
      OR
      -- Pupil-specific challenge assigned directly to them
      pupil_id IN (
        SELECT id FROM public.pupils WHERE auth_user_id = auth.uid()
      )
    )
  );
