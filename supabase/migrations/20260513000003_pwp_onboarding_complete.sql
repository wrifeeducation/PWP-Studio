-- Migration: pwp_onboarding_complete flag on formula_progress
-- Phase 17 — Onboarding flow
--
-- After a pupil completes the onboarding walkthrough, this flag is set to true
-- so they are never shown the walkthrough again.
-- DashboardPage reads this flag and redirects to /onboarding when false.

ALTER TABLE public.formula_progress
  ADD COLUMN IF NOT EXISTS pwp_onboarding_complete boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.formula_progress.pwp_onboarding_complete IS
  'Set to true after the pupil completes the PWP first-login onboarding walkthrough. Prevents re-showing.';
