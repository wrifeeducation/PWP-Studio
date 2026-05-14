-- PWP pupil badges — awarded when gamification milestones are reached.
-- badge_key is a short identifier like 'pwp:first_level', 'pwp:streak_7', etc.
-- Unique constraint prevents duplicate awards.

CREATE TABLE IF NOT EXISTS public.pwp_pupil_badges (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  pupil_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_key   text        NOT NULL,
  awarded_at  timestamptz DEFAULT now() NOT NULL,
  UNIQUE (pupil_id, badge_key)
);

ALTER TABLE public.pwp_pupil_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pwp_pupil_badges_select" ON public.pwp_pupil_badges
  FOR SELECT USING (auth.uid() = pupil_id);

CREATE POLICY "pwp_pupil_badges_insert" ON public.pwp_pupil_badges
  FOR INSERT WITH CHECK (auth.uid() = pupil_id);

-- Add streak tracking columns to formula_progress if not already present
ALTER TABLE public.formula_progress
  ADD COLUMN IF NOT EXISTS streak_days      integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_session_date date    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS longest_streak   integer DEFAULT 0;

-- Index for fast pupil lookups
CREATE INDEX IF NOT EXISTS idx_pwp_pupil_badges_pupil
  ON public.pwp_pupil_badges (pupil_id);
