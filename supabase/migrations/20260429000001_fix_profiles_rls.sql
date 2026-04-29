-- Migration: fix_profiles_rls
-- Applied: 2026-04-29 (Session 14 — documented 2026-04-29)
--
-- PROBLEM: The original profiles RLS policies used inline subqueries on the
-- profiles table within profiles policies, e.g.:
--   AND school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
-- PostgreSQL evaluates the subquery under the same RLS context, causing
-- infinite recursion → HTTP 500 on every profile read for any non-trivial query.
--
-- SOLUTION: Replace all profiles policies with non-recursive equivalents:
--   1. Own-row policies: `id = auth.uid()` (no join needed)
--   2. is_school_admin() SECURITY DEFINER function (bypasses RLS)
--   3. Classes join for teacher visibility (avoids looping back through profiles)

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Create / replace the is_school_admin() SECURITY DEFINER function
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_school_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'school_admin'
  );
END;
$$;

-- Ensure existing SECURITY DEFINER helpers also have explicit search_path
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT role FROM profiles WHERE id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_school_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT school_id FROM profiles WHERE id = auth.uid());
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Drop all old profiles policies
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS profiles_pupil_read               ON profiles;
DROP POLICY IF EXISTS profiles_teacher_read             ON profiles;
DROP POLICY IF EXISTS profiles_admin_read               ON profiles;
DROP POLICY IF EXISTS profiles_parent_read              ON profiles;
DROP POLICY IF EXISTS profiles_pupil_update             ON profiles;
DROP POLICY IF EXISTS profiles_teacher_update_pupils    ON profiles;
DROP POLICY IF EXISTS profiles_admin_update             ON profiles;
-- Also drop any partial fixes that may have been applied interactively
DROP POLICY IF EXISTS profiles_own_read                 ON profiles;
DROP POLICY IF EXISTS profiles_own_insert               ON profiles;
DROP POLICY IF EXISTS profiles_own_update               ON profiles;
DROP POLICY IF EXISTS profiles_teacher_class_read       ON profiles;
DROP POLICY IF EXISTS profiles_admin_school_read        ON profiles;
DROP POLICY IF EXISTS "school_admin read all profiles"  ON profiles;
DROP POLICY IF EXISTS "school_admin update all profiles" ON profiles;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Create clean non-recursive policies
-- ─────────────────────────────────────────────────────────────────────────────

-- Every user can read their own row (non-recursive, safe)
CREATE POLICY profiles_own_read ON profiles
  FOR SELECT USING (id = auth.uid());

-- Every user can insert their own row (also covered by handle_new_user trigger)
CREATE POLICY profiles_own_insert ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Every user can update their own row
CREATE POLICY profiles_own_update ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Teachers can read profiles of pupils in classes they teach
CREATE POLICY profiles_teacher_class_read ON profiles
  FOR SELECT
  USING (
    class_id IN (
      SELECT id FROM classes WHERE teacher_id = auth.uid()
    )
  );

-- Teachers and school admins can see each other within the same school
-- (anchored via classes to avoid a back-join through profiles)
CREATE POLICY profiles_admin_school_read ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.school_id = profiles.school_id
        AND classes.teacher_id = auth.uid()
    )
    OR auth.uid() = id
  );

-- School admins can read all profiles in their school
CREATE POLICY "school_admin read all profiles" ON profiles
  FOR SELECT USING (is_school_admin());

-- School admins can update any profile in their school
CREATE POLICY "school_admin update all profiles" ON profiles
  FOR UPDATE
  USING (is_school_admin())
  WITH CHECK (is_school_admin());

-- Teachers can update pupil profiles in their classes
CREATE POLICY profiles_teacher_update_pupils ON profiles
  FOR UPDATE
  USING (
    (role)::text = 'pupil'
    AND class_id IN (SELECT id FROM classes WHERE teacher_id = auth.uid())
  )
  WITH CHECK (
    (role)::text = 'pupil'
    AND class_id IN (SELECT id FROM classes WHERE teacher_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: Ensure handle_new_user trigger is in place
-- (creates a profiles row automatically when auth.users is inserted)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, role, membership_tier, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'pupil'),
    'free',
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create the trigger if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'on_auth_user_created'
      AND event_object_schema = 'auth'
      AND event_object_table = 'users'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END;
$$;
