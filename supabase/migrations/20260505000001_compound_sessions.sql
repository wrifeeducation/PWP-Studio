-- Migration: compound_sessions
-- Applied: 2026-05-05 (Session 21 — Phase 3 Compound/Complex Sentence Builder)
--
-- Creates the pwp_compound_sessions table to store each pupil's attempt to extend
-- their chain anchor sentence into a compound or complex sentence.
--
-- Schema notes:
--   conjunction_type CHECK enforces only the three valid ConjunctionType values.
--   class_id is nullable: a pupil may not be in a class (home learner / parent signup).
--   xp_earned records XP granted at the time (default 5 for accepted, 0 for skipped).
--   accepted = false covers both rejected attempts AND skipped (skip is accepted=false,
--   attempts=0 by convention).

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pwp_compound_sessions (
  id                     uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pupil_id               uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id               uuid                 REFERENCES public.classes(id)  ON DELETE SET NULL,
  session_date           date        NOT NULL DEFAULT CURRENT_DATE,
  anchor_sentence        text        NOT NULL,
  conjunction            text        NOT NULL DEFAULT '',
  second_clause          text        NOT NULL DEFAULT '',
  conjunction_type       text                 CHECK (
                                                conjunction_type IN (
                                                  'coordinating',
                                                  'subordinating_basic',
                                                  'subordinating_extended'
                                                )
                                              ),
  full_compound_sentence text        NOT NULL DEFAULT '',
  accepted               boolean     NOT NULL DEFAULT false,
  attempts               integer     NOT NULL DEFAULT 0,
  xp_earned              integer     NOT NULL DEFAULT 0,
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- Index: teacher dashboard queries filter by class_id + session_date
CREATE INDEX IF NOT EXISTS pwp_compound_sessions_class_date_idx
  ON public.pwp_compound_sessions (class_id, session_date DESC);

-- Index: pupil history queries filter by pupil_id
CREATE INDEX IF NOT EXISTS pwp_compound_sessions_pupil_idx
  ON public.pwp_compound_sessions (pupil_id, session_date DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.pwp_compound_sessions ENABLE ROW LEVEL SECURITY;

-- Pupils: read their own rows
CREATE POLICY "Pupils read own compound sessions"
  ON public.pwp_compound_sessions
  FOR SELECT
  USING (pupil_id = auth.uid());

-- Pupils: insert their own rows
CREATE POLICY "Pupils insert own compound sessions"
  ON public.pwp_compound_sessions
  FOR INSERT
  WITH CHECK (pupil_id = auth.uid());

-- Teachers: read sessions for pupils in their classes
CREATE POLICY "Teachers read compound sessions for their classes"
  ON public.pwp_compound_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.class_memberships cm
      JOIN public.classes c ON c.id = cm.class_id
      WHERE cm.pupil_id  = pwp_compound_sessions.pupil_id
        AND c.teacher_id = auth.uid()
    )
  );

-- School admins: read all sessions in their school
CREATE POLICY "School admins read all compound sessions in their school"
  ON public.pwp_compound_sessions
  FOR SELECT
  USING (public.is_school_admin());
