-- ============================================================================
-- Migration: fix school pupil membership_tier
-- Date: 2026-05-07
--
-- Problem: The handle_new_user trigger always inserts membership_tier = 'free',
-- and the create_pupil admin-action upsert used ignoreDuplicates=true so it
-- never overwrote the trigger's value. School pupils therefore got the free-tier
-- star gate even though they should have unlimited access.
--
-- Fix:
--  1. Update handle_new_user trigger to derive membership_tier from user metadata:
--     if school_id is present in raw_user_meta_data → 'school', else 'free'.
--  2. Backfill all existing school pupils (school_id IS NOT NULL, role = 'pupil')
--     from 'free' to 'school'.
-- ============================================================================

-- ── 1. Replace handle_new_user trigger function ───────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id text;
BEGIN
  -- Read school_id from user metadata to assign the correct membership tier.
  -- Pupils with a school_id are school-linked and get 'school' tier (unlimited stars).
  -- All other new users start on 'free'.
  v_school_id := NEW.raw_user_meta_data->>'school_id';

  INSERT INTO public.profiles (id, first_name, role, membership_tier, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'pupil'),
    CASE WHEN v_school_id IS NOT NULL AND v_school_id <> '' THEN 'school' ELSE 'free' END,
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ── 2. Backfill existing school pupils ───────────────────────────────────────
-- Any pupil with a non-null school_id has been placed in a school account and
-- should never hit the free-tier star gate.
UPDATE public.profiles
SET
  membership_tier = 'school',
  updated_at = now()
WHERE
  role = 'pupil'
  AND school_id IS NOT NULL
  AND membership_tier = 'free';
