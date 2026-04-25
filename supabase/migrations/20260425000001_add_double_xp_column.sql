-- WF-035: Add double_xp_until column to pupil_progress
-- Migration: add_double_xp_column

ALTER TABLE pupil_progress
  ADD COLUMN IF NOT EXISTS double_xp_until TIMESTAMPTZ;

COMMENT ON COLUMN pupil_progress.double_xp_until IS
  'When set, XP is doubled until this timestamp. Set by XP Shop purchase.';
