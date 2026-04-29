-- Migration: schools_quota_and_status
-- Applied: 2026-04-29 (Session 16)
--
-- Adds access management and quota columns to the schools table.
-- These power the expanded Admin → Schools tab and enforce per-school limits.
--
-- subscription_tier values: trial | starter | professional | enterprise
-- status values: active | trial | suspended | expired

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS contact_email    VARCHAR,
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT    NOT NULL DEFAULT 'trial'
      CHECK (subscription_tier IN ('trial', 'starter', 'professional', 'enterprise')),
  ADD COLUMN IF NOT EXISTS max_teachers     INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_pupils       INTEGER NOT NULL DEFAULT 150,
  ADD COLUMN IF NOT EXISTS status           TEXT    NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'trial', 'suspended', 'expired')),
  ADD COLUMN IF NOT EXISTS admin_user_id    UUID    REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes            TEXT;

CREATE INDEX IF NOT EXISTS idx_schools_status ON schools(status);

COMMENT ON COLUMN schools.subscription_tier IS
  'trial=free limited; starter=up to 5 teachers 150 pupils; professional=up to 20/600; enterprise=unlimited';
COMMENT ON COLUMN schools.max_teachers IS 'Max teacher accounts under this school licence';
COMMENT ON COLUMN schools.max_pupils   IS 'Max pupil accounts under this school licence';
COMMENT ON COLUMN schools.status       IS 'active=normal; trial=onboarding; suspended=payment lapsed; expired=licence ended';
COMMENT ON COLUMN schools.admin_user_id IS 'Designated school admin profile for this school';
