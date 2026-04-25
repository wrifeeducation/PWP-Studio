-- WriFe Platform Row Level Security (RLS) Policies
-- Ensures pupils, teachers, school admins, and parents can only access their data

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if user is a teacher and pupil is in one of their classes
CREATE OR REPLACE FUNCTION is_teacher_of_pupil(pupil_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM classes c
    WHERE c.teacher_id = auth.uid()
      AND c.id = (
        SELECT class_id
        FROM profiles
        WHERE id = pupil_id AND role = 'pupil'
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is school admin of pupil's school
CREATE OR REPLACE FUNCTION is_school_admin_of_pupil(pupil_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles admin
    WHERE admin.id = auth.uid()
      AND admin.role = 'school_admin'
      AND admin.school_id = (
        SELECT school_id
        FROM profiles
        WHERE id = pupil_id
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is approved parent of pupil
CREATE OR REPLACE FUNCTION is_approved_parent_of_pupil(pupil_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM parent_pupil
    WHERE parent_id = auth.uid()
      AND pupil_id = pupil_id
      AND approved = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's school_id
CREATE OR REPLACE FUNCTION get_user_school_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT school_id FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS VARCHAR AS $$
BEGIN
  RETURN (SELECT role FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_pupil ENABLE ROW LEVEL SECURITY;
ALTER TABLE formula_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE paragraph_starters ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE pupil_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE pupil_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE formula_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE paragraph_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mastery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing_pieces ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SCHOOLS TABLE POLICIES
-- ============================================================================

-- All authenticated users can read their own school
CREATE POLICY schools_read_own_school ON schools
FOR SELECT
USING (
  id = (SELECT school_id FROM profiles WHERE id = auth.uid())
);

-- Only school admins and Supabase admins can modify schools
CREATE POLICY schools_admin_write ON schools
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND role = 'school_admin'
      AND school_id = schools.id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND role = 'school_admin'
      AND school_id = schools.id
  )
);

-- ============================================================================
-- CLASSES TABLE POLICIES
-- ============================================================================

-- Teachers can read their own classes; pupils can read their class; admins can read all in school
CREATE POLICY classes_read ON classes
FOR SELECT
USING (
  teacher_id = auth.uid()
  OR id = (SELECT class_id FROM profiles WHERE id = auth.uid())
  OR school_id = (SELECT school_id FROM profiles WHERE id = auth.uid() AND role = 'school_admin')
);

-- Only teachers can insert/update their own classes
CREATE POLICY classes_write ON classes
FOR INSERT
WITH CHECK (
  teacher_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND role = 'teacher'
      AND school_id = classes.school_id
  )
);

CREATE POLICY classes_update ON classes
FOR UPDATE
USING (
  teacher_id = auth.uid()
  OR school_id = (SELECT school_id FROM profiles WHERE id = auth.uid() AND role = 'school_admin')
)
WITH CHECK (
  teacher_id = auth.uid()
  OR school_id = (SELECT school_id FROM profiles WHERE id = auth.uid() AND role = 'school_admin')
);

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

-- Pupils can read themselves and classmates
CREATE POLICY profiles_pupil_read ON profiles
FOR SELECT
USING (
  id = auth.uid()
  OR (
    role = 'pupil'
    AND class_id = (SELECT class_id FROM profiles WHERE id = auth.uid())
  )
  OR (
    (SELECT get_user_role()) = 'pupil'
    AND school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
  )
);

-- Teachers can read pupils in their classes and other teachers
CREATE POLICY profiles_teacher_read ON profiles
FOR SELECT
USING (
  id = auth.uid()
  OR (
    (SELECT get_user_role()) = 'teacher'
    AND school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
  )
  OR (
    (SELECT get_user_role()) = 'teacher'
    AND class_id IN (
      SELECT id FROM classes WHERE teacher_id = auth.uid()
    )
  )
);

-- School admins can read all profiles in their school
CREATE POLICY profiles_admin_read ON profiles
FOR SELECT
USING (
  (SELECT get_user_role()) = 'school_admin'
  AND school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
);

-- Parents can read their linked pupils
CREATE POLICY profiles_parent_read ON profiles
FOR SELECT
USING (
  (SELECT get_user_role()) = 'parent'
  AND id IN (
    SELECT pupil_id
    FROM parent_pupil
    WHERE parent_id = auth.uid() AND approved = TRUE
  )
);

-- Pupils can update their own profile (limited fields)
CREATE POLICY profiles_pupil_update ON profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND role = (SELECT role FROM profiles WHERE id = auth.uid()) -- Can't change role
  AND school_id = (SELECT school_id FROM profiles WHERE id = auth.uid()) -- Can't change school
);

-- Teachers can update pupils in their classes
CREATE POLICY profiles_teacher_update_pupils ON profiles
FOR UPDATE
USING (
  (SELECT get_user_role()) = 'teacher'
  AND role = 'pupil'
  AND class_id IN (SELECT id FROM classes WHERE teacher_id = auth.uid())
)
WITH CHECK (
  (SELECT get_user_role()) = 'teacher'
  AND role = 'pupil'
  AND class_id IN (SELECT id FROM classes WHERE teacher_id = auth.uid())
);

-- School admins can update profiles in their school (except roles)
CREATE POLICY profiles_admin_update ON profiles
FOR UPDATE
USING (
  (SELECT get_user_role()) = 'school_admin'
  AND school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
  (SELECT get_user_role()) = 'school_admin'
  AND school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
);

-- ============================================================================
-- PARENT_PUPIL TABLE POLICIES
-- ============================================================================

-- Parents can read/insert their own links (only with approved = false initially)
CREATE POLICY parent_pupil_parent_read ON parent_pupil
FOR SELECT
USING (
  parent_id = auth.uid()
  OR (
    (SELECT get_user_role()) = 'school_admin'
    AND (SELECT school_id FROM profiles WHERE id = parent_id) =
        (SELECT school_id FROM profiles WHERE id = auth.uid())
  )
);

-- Pupils can read (but not approve)
CREATE POLICY parent_pupil_pupil_read ON parent_pupil
FOR SELECT
USING (
  pupil_id = auth.uid()
  AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'pupil'
);

CREATE POLICY parent_pupil_parent_insert ON parent_pupil
FOR INSERT
WITH CHECK (
  parent_id = auth.uid()
  AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'parent'
);

-- Only school admins can approve parent links
CREATE POLICY parent_pupil_admin_update ON parent_pupil
FOR UPDATE
USING (
  (SELECT get_user_role()) = 'school_admin'
  AND (SELECT school_id FROM profiles WHERE id = parent_id) =
      (SELECT school_id FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
  (SELECT get_user_role()) = 'school_admin'
  AND (SELECT school_id FROM profiles WHERE id = parent_id) =
      (SELECT school_id FROM profiles WHERE id = auth.uid())
);

-- ============================================================================
-- LEARNING CONTENT (Read-only for most users)
-- ============================================================================

CREATE POLICY formula_levels_read ON formula_levels
FOR SELECT
USING (TRUE); -- All authenticated users can read

CREATE POLICY word_banks_read ON word_banks
FOR SELECT
USING (TRUE);

CREATE POLICY paragraph_starters_read ON paragraph_starters
FOR SELECT
USING (TRUE);

CREATE POLICY writing_tasks_read ON writing_tasks
FOR SELECT
USING (TRUE);

CREATE POLICY badges_read ON badges
FOR SELECT
USING (TRUE);

-- Only admins can write learning content
CREATE POLICY formula_levels_admin_write ON formula_levels
FOR ALL
USING (
  (SELECT get_user_role()) = 'school_admin'
  OR auth.role() = 'service_role'
);

CREATE POLICY word_banks_admin_write ON word_banks
FOR ALL
USING (
  (SELECT get_user_role()) = 'school_admin'
  OR auth.role() = 'service_role'
);

CREATE POLICY badges_admin_write ON badges
FOR ALL
USING (
  (SELECT get_user_role()) = 'school_admin'
  OR auth.role() = 'service_role'
);

-- ============================================================================
-- PUPIL_PROGRESS TABLE POLICIES
-- ============================================================================

-- Pupils can read their own progress
CREATE POLICY pupil_progress_pupil_read ON pupil_progress
FOR SELECT
USING (pupil_id = auth.uid());

-- Teachers can read progress for pupils in their classes
CREATE POLICY pupil_progress_teacher_read ON pupil_progress
FOR SELECT
USING (
  is_teacher_of_pupil(pupil_id)
);

-- School admins can read all in their school
CREATE POLICY pupil_progress_admin_read ON pupil_progress
FOR SELECT
USING (
  is_school_admin_of_pupil(pupil_id)
);

-- Parents can read approved pupil progress
CREATE POLICY pupil_progress_parent_read ON pupil_progress
FOR SELECT
USING (
  is_approved_parent_of_pupil(pupil_id)
);

-- Edge Functions (service role) can write
CREATE POLICY pupil_progress_service_write ON pupil_progress
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- PUPIL_BADGES TABLE POLICIES
-- ============================================================================

CREATE POLICY pupil_badges_pupil_read ON pupil_badges
FOR SELECT
USING (pupil_id = auth.uid());

CREATE POLICY pupil_badges_teacher_read ON pupil_badges
FOR SELECT
USING (is_teacher_of_pupil(pupil_id));

CREATE POLICY pupil_badges_admin_read ON pupil_badges
FOR SELECT
USING (is_school_admin_of_pupil(pupil_id));

CREATE POLICY pupil_badges_parent_read ON pupil_badges
FOR SELECT
USING (is_approved_parent_of_pupil(pupil_id));

CREATE POLICY pupil_badges_service_write ON pupil_badges
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- FORMULA_SESSIONS TABLE POLICIES
-- ============================================================================

CREATE POLICY formula_sessions_pupil_read ON formula_sessions
FOR SELECT
USING (pupil_id = auth.uid());

CREATE POLICY formula_sessions_pupil_insert ON formula_sessions
FOR INSERT
WITH CHECK (pupil_id = auth.uid());

CREATE POLICY formula_sessions_teacher_read ON formula_sessions
FOR SELECT
USING (is_teacher_of_pupil(pupil_id));

CREATE POLICY formula_sessions_admin_read ON formula_sessions
FOR SELECT
USING (is_school_admin_of_pupil(pupil_id));

CREATE POLICY formula_sessions_parent_read ON formula_sessions
FOR SELECT
USING (is_approved_parent_of_pupil(pupil_id));

CREATE POLICY formula_sessions_service_write ON formula_sessions
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- PARAGRAPH_SESSIONS TABLE POLICIES
-- ============================================================================

CREATE POLICY paragraph_sessions_pupil_read ON paragraph_sessions
FOR SELECT
USING (pupil_id = auth.uid());

CREATE POLICY paragraph_sessions_pupil_insert ON paragraph_sessions
FOR INSERT
WITH CHECK (pupil_id = auth.uid());

CREATE POLICY paragraph_sessions_teacher_read ON paragraph_sessions
FOR SELECT
USING (is_teacher_of_pupil(pupil_id));

CREATE POLICY paragraph_sessions_admin_read ON paragraph_sessions
FOR SELECT
USING (is_school_admin_of_pupil(pupil_id));

CREATE POLICY paragraph_sessions_parent_read ON paragraph_sessions
FOR SELECT
USING (is_approved_parent_of_pupil(pupil_id));

CREATE POLICY paragraph_sessions_service_write ON paragraph_sessions
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- MASTERY_TRACKING TABLE POLICIES
-- ============================================================================

CREATE POLICY mastery_tracking_pupil_read ON mastery_tracking
FOR SELECT
USING (pupil_id = auth.uid());

CREATE POLICY mastery_tracking_teacher_read ON mastery_tracking
FOR SELECT
USING (is_teacher_of_pupil(pupil_id));

CREATE POLICY mastery_tracking_admin_read ON mastery_tracking
FOR SELECT
USING (is_school_admin_of_pupil(pupil_id));

CREATE POLICY mastery_tracking_parent_read ON mastery_tracking
FOR SELECT
USING (is_approved_parent_of_pupil(pupil_id));

CREATE POLICY mastery_tracking_service_write ON mastery_tracking
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- WRITING_PIECES TABLE POLICIES
-- ============================================================================

CREATE POLICY writing_pieces_pupil_read ON writing_pieces
FOR SELECT
USING (pupil_id = auth.uid());

CREATE POLICY writing_pieces_pupil_insert ON writing_pieces
FOR INSERT
WITH CHECK (pupil_id = auth.uid());

CREATE POLICY writing_pieces_pupil_update ON writing_pieces
FOR UPDATE
USING (pupil_id = auth.uid() AND status IN ('draft'))
WITH CHECK (pupil_id = auth.uid() AND status IN ('draft', 'submitted'));

CREATE POLICY writing_pieces_teacher_read ON writing_pieces
FOR SELECT
USING (is_teacher_of_pupil(pupil_id));

-- Teachers can review and update status
CREATE POLICY writing_pieces_teacher_update ON writing_pieces
FOR UPDATE
USING (
  is_teacher_of_pupil(pupil_id)
  AND status IN ('submitted', 'assessed')
)
WITH CHECK (
  is_teacher_of_pupil(pupil_id)
  AND (status IN ('submitted', 'assessed', 'published'))
);

CREATE POLICY writing_pieces_admin_read ON writing_pieces
FOR SELECT
USING (is_school_admin_of_pupil(pupil_id));

CREATE POLICY writing_pieces_parent_read ON writing_pieces
FOR SELECT
USING (is_approved_parent_of_pupil(pupil_id));

CREATE POLICY writing_pieces_service_write ON writing_pieces
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- AI_ASSESSMENTS TABLE POLICIES
-- ============================================================================

CREATE POLICY ai_assessments_pupil_read ON ai_assessments
FOR SELECT
USING (
  piece_id IN (
    SELECT id FROM writing_pieces WHERE pupil_id = auth.uid()
  )
);

CREATE POLICY ai_assessments_teacher_read ON ai_assessments
FOR SELECT
USING (
  piece_id IN (
    SELECT id FROM writing_pieces WHERE is_teacher_of_pupil(pupil_id)
  )
);

CREATE POLICY ai_assessments_admin_read ON ai_assessments
FOR SELECT
USING (
  piece_id IN (
    SELECT id FROM writing_pieces WHERE is_school_admin_of_pupil(pupil_id)
  )
);

CREATE POLICY ai_assessments_parent_read ON ai_assessments
FOR SELECT
USING (
  piece_id IN (
    SELECT id FROM writing_pieces WHERE is_approved_parent_of_pupil(pupil_id)
  )
);

CREATE POLICY ai_assessments_service_write ON ai_assessments
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- TEACHER_ANNOTATIONS TABLE POLICIES
-- ============================================================================

CREATE POLICY teacher_annotations_creator_read ON teacher_annotations
FOR SELECT
USING (teacher_id = auth.uid());

CREATE POLICY teacher_annotations_pupil_read ON teacher_annotations
FOR SELECT
USING (
  (
    piece_id IN (
      SELECT id FROM writing_pieces WHERE pupil_id = auth.uid()
    )
  )
  OR (
    paragraph_session_id IN (
      SELECT id FROM paragraph_sessions WHERE pupil_id = auth.uid()
    )
  )
);

CREATE POLICY teacher_annotations_other_teachers_read ON teacher_annotations
FOR SELECT
USING (
  (SELECT get_user_role()) = 'teacher'
  AND (
    (piece_id IN (
      SELECT id FROM writing_pieces
      WHERE is_teacher_of_pupil(pupil_id)
    ))
    OR (paragraph_session_id IN (
      SELECT id FROM paragraph_sessions
      WHERE is_teacher_of_pupil(pupil_id)
    ))
  )
);

CREATE POLICY teacher_annotations_teacher_insert ON teacher_annotations
FOR INSERT
WITH CHECK (
  teacher_id = auth.uid()
  AND (SELECT get_user_role()) = 'teacher'
);

CREATE POLICY teacher_annotations_teacher_update ON teacher_annotations
FOR UPDATE
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

-- ============================================================================
-- TEACHER_TASK_ASSIGNMENTS TABLE POLICIES
-- ============================================================================

CREATE POLICY teacher_task_assignments_teacher_read ON teacher_task_assignments
FOR SELECT
USING (teacher_id = auth.uid());

CREATE POLICY teacher_task_assignments_pupil_read ON teacher_task_assignments
FOR SELECT
USING (pupil_id = auth.uid());

CREATE POLICY teacher_task_assignments_teacher_write ON teacher_task_assignments
FOR INSERT
WITH CHECK (
  teacher_id = auth.uid()
  AND (SELECT get_user_role()) = 'teacher'
);

CREATE POLICY teacher_task_assignments_teacher_update ON teacher_task_assignments
FOR UPDATE
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

-- ============================================================================
-- INTERVENTION_LOG TABLE POLICIES
-- ============================================================================

CREATE POLICY intervention_log_pupil_read ON intervention_log
FOR SELECT
USING (pupil_id = auth.uid());

CREATE POLICY intervention_log_teacher_read ON intervention_log
FOR SELECT
USING (is_teacher_of_pupil(pupil_id));

CREATE POLICY intervention_log_admin_read ON intervention_log
FOR SELECT
USING (is_school_admin_of_pupil(pupil_id));

CREATE POLICY intervention_log_service_write ON intervention_log
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- NOTES ON RLS ARCHITECTURE
-- ============================================================================

/*
AUTHORIZATION HIERARCHY:
1. Service role (Edge Functions): bypass all RLS (used for automated scoring, badge awarding)
2. School admin: full access to school data
3. Teacher: access to pupils in their classes + cross-teacher visibility within school
4. Pupil: own data + classmates
5. Parent: approved linked pupils only (read-only)

KEY DESIGN DECISIONS:
- Helper functions (is_teacher_of_pupil, etc.) use SECURITY DEFINER to bypass row policies
  when checking intermediate tables, preventing infinite recursion
- Foreign key targets (e.g., teacher_id in classes) require separate index-based checks
  because they don't automatically inherit row policies
- No DELETE policies defined; soft deletes recommended via status columns
- Service role queries (created by Cron Functions or webhooks) bypass RLS entirely
*/
