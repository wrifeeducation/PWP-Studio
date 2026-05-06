-- Migration: add_parent_role_to_profiles_check
-- Applied: 2026-05-06 (Session 26 — home-learner E2E)
-- Adds 'parent' to the profiles role check constraint so parent accounts can sign up.

ALTER TABLE public.profiles
  DROP CONSTRAINT profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['teacher'::text, 'pupil'::text, 'admin'::text, 'school_admin'::text, 'parent'::text]));
