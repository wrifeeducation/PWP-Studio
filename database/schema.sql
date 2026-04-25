-- WriFe Platform Database Schema
-- Gamified digital literacy for UK primary/secondary schools
-- Built on Supabase (PostgreSQL)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- HELPER FUNCTION: Updated At Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CORE ORGANIZATIONAL TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  urn VARCHAR(10) NOT NULL UNIQUE,
  address_line1 VARCHAR(255),
  city VARCHAR(100),
  postcode VARCHAR(10),
  phase VARCHAR(50) NOT NULL CHECK (phase IN ('primary', 'secondary', 'all_through')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_urn CHECK (urn ~ '^\d{6}$')
);

CREATE INDEX idx_schools_urn ON schools(urn);

CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  year_group SMALLINT NOT NULL CHECK (year_group >= 1 AND year_group <= 13),
  teacher_id UUID,
  academic_year VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_academic_year CHECK (academic_year ~ '^\d{4}-\d{2}$')
);

CREATE INDEX idx_classes_school_id ON classes(school_id);
CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX idx_classes_year_group ON classes(year_group);

-- Extended user profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  role VARCHAR(20) NOT NULL CHECK (role IN ('pupil', 'teacher', 'school_admin', 'parent')),
  first_name VARCHAR(100) NOT NULL,
  year_group SMALLINT CHECK (year_group IS NULL OR (year_group >= 1 AND year_group <= 13)),
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  avatar_colour VARCHAR(20) NOT NULL DEFAULT 'blue',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_school_id ON profiles(school_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_class_id ON profiles(class_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Parent-pupil relationships (many-to-many)
CREATE TABLE IF NOT EXISTS parent_pupil (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pupil_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT parent_is_parent CHECK (
    (SELECT role FROM profiles WHERE id = parent_id) = 'parent'
  ),
  CONSTRAINT pupil_is_pupil CHECK (
    (SELECT role FROM profiles WHERE id = pupil_id) = 'pupil'
  ),
  CONSTRAINT no_self_link CHECK (parent_id != pupil_id),
  UNIQUE(parent_id, pupil_id)
);

CREATE INDEX idx_parent_pupil_parent_id ON parent_pupil(parent_id);
CREATE INDEX idx_parent_pupil_pupil_id ON parent_pupil(pupil_id);

-- ============================================================================
-- LEARNING CONTENT & DEFINITIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS formula_levels (
  id SMALLINT PRIMARY KEY,
  phase VARCHAR(1) NOT NULL CHECK (phase IN ('A', 'B', 'C', 'D')),
  formula_elements JSONB NOT NULL, -- Array of {position, word_class, instruction, example}
  word_banks JSONB NOT NULL,
  subject_rotation_bank JSONB NOT NULL, -- Array of subject strings
  paragraph_active BOOLEAN DEFAULT FALSE,
  paragraph_genre_rotation JSONB, -- Array of genres when active
  nc_year_group_min SMALLINT NOT NULL CHECK (nc_year_group_min >= 1),
  nc_year_group_max SMALLINT NOT NULL CHECK (nc_year_group_max >= nc_year_group_min),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_level_id CHECK (id >= 1 AND id <= 67)
);

CREATE INDEX idx_formula_levels_phase ON formula_levels(phase);
CREATE INDEX idx_formula_levels_nc_year_group ON formula_levels(nc_year_group_min, nc_year_group_max);

CREATE TABLE IF NOT EXISTS word_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id SMALLINT NOT NULL REFERENCES formula_levels(id) ON DELETE CASCADE,
  word_class VARCHAR(20) NOT NULL CHECK (word_class IN (
    'determiner', 'adjective', 'noun', 'verb', 'adverb',
    'preposition', 'pronoun', 'conjunction'
  )),
  words JSONB NOT NULL, -- Array of word strings
  images JSONB NOT NULL, -- Array of {word, image_key}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_word_banks_level_id ON word_banks(level_id);
CREATE INDEX idx_word_banks_word_class ON word_banks(word_class);

CREATE TABLE IF NOT EXISTS paragraph_starters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  genre VARCHAR(20) NOT NULL CHECK (genre IN ('narrative', 'non_fiction', 'persuasive', 'poetry')),
  phase VARCHAR(1) NOT NULL CHECK (phase IN ('A', 'B', 'C', 'D')),
  slot_type VARCHAR(20) NOT NULL CHECK (slot_type IN ('support_1', 'support_2', 'close')),
  year_group_min SMALLINT NOT NULL CHECK (year_group_min >= 1),
  year_group_max SMALLINT NOT NULL CHECK (year_group_max >= year_group_min),
  starter_text VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_paragraph_starters_genre_phase ON paragraph_starters(genre, phase);

CREATE TABLE IF NOT EXISTS writing_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  genre VARCHAR(20) NOT NULL CHECK (genre IN ('narrative', 'non_fiction', 'persuasive', 'poetry')),
  year_group_min SMALLINT NOT NULL CHECK (year_group_min >= 1),
  year_group_max SMALLINT NOT NULL CHECK (year_group_max >= year_group_min),
  title VARCHAR(255) NOT NULL,
  prompt_text TEXT NOT NULL,
  word_count_min SMALLINT NOT NULL DEFAULT 100,
  word_count_max SMALLINT NOT NULL,
  success_criteria JSONB NOT NULL, -- Array of criteria strings
  planning_scaffold_type VARCHAR(50),
  is_teacher_assignable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_word_counts CHECK (word_count_max >= word_count_min)
);

CREATE INDEX idx_writing_tasks_genre ON writing_tasks(genre);
CREATE INDEX idx_writing_tasks_year_group ON writing_tasks(year_group_min, year_group_max);

-- ============================================================================
-- GAMIFICATION CORE
-- ============================================================================

CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'formula_practice', 'paragraph_builder', 'writing_studio', 'shared'
  )),
  rarity VARCHAR(20) NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic')),
  trigger_type VARCHAR(50) NOT NULL, -- e.g. 'mastery_gate', 'streak', 'badge_unlock'
  trigger_value JSONB NOT NULL, -- Trigger-specific data
  icon_key VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(name)
);

CREATE INDEX idx_badges_category ON badges(category);
CREATE INDEX idx_badges_rarity ON badges(rarity);

-- ============================================================================
-- PUPIL PROGRESS & STATE
-- ============================================================================

CREATE TABLE IF NOT EXISTS pupil_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pupil_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  current_formula_level SMALLINT NOT NULL DEFAULT 1 CHECK (current_formula_level >= 1 AND current_formula_level <= 67),
  current_paragraph_phase VARCHAR(1) DEFAULT 'A' CHECK (current_paragraph_phase IN ('A', 'B', 'C', 'D')),
  writing_studio_unlocked BOOLEAN DEFAULT FALSE,
  current_streak SMALLINT DEFAULT 0,
  longest_streak SMALLINT DEFAULT 0,
  streak_shield_active BOOLEAN DEFAULT FALSE,
  last_session_date DATE,
  total_xp BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pupil_progress_pupil_id ON pupil_progress(pupil_id);

CREATE TRIGGER update_pupil_progress_updated_at BEFORE UPDATE ON pupil_progress
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS pupil_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pupil_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  source JSONB, -- {type: 'formula_session_id'|'paragraph_session_id'|'writing_piece_id', value: uuid}
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(pupil_id, badge_id)
);

CREATE INDEX idx_pupil_badges_pupil_id ON pupil_badges(pupil_id);
CREATE INDEX idx_pupil_badges_badge_id ON pupil_badges(badge_id);

-- ============================================================================
-- SESSION DATA
-- ============================================================================

CREATE TABLE IF NOT EXISTS formula_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pupil_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  level_id SMALLINT NOT NULL REFERENCES formula_levels(id) ON DELETE RESTRICT,
  session_date DATE NOT NULL,
  formula_score SMALLINT NOT NULL CHECK (formula_score >= 0 AND formula_score <= 100),
  semantic_purpose_score SMALLINT CHECK (semantic_purpose_score IS NULL OR (semantic_purpose_score >= 0 AND semantic_purpose_score <= 100)),
  semantic_audience_score SMALLINT CHECK (semantic_audience_score IS NULL OR (semantic_audience_score >= 0 AND semantic_audience_score <= 100)),
  semantic_effect_score SMALLINT CHECK (semantic_effect_score IS NULL OR (semantic_effect_score >= 0 AND semantic_effect_score <= 100)),
  sentence_built TEXT,
  scaffold_used BOOLEAN DEFAULT FALSE,
  scaffold_type JSONB,
  is_lens_lab BOOLEAN DEFAULT FALSE,
  xp_earned SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_formula_sessions_pupil_id ON formula_sessions(pupil_id);
CREATE INDEX idx_formula_sessions_level_id ON formula_sessions(level_id);
CREATE INDEX idx_formula_sessions_session_date ON formula_sessions(session_date);

CREATE TABLE IF NOT EXISTS paragraph_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pupil_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  level_id SMALLINT NOT NULL REFERENCES formula_levels(id) ON DELETE RESTRICT,
  session_date DATE NOT NULL,
  genre VARCHAR(20) NOT NULL CHECK (genre IN ('narrative', 'non_fiction', 'persuasive', 'poetry')),
  phase VARCHAR(1) NOT NULL CHECK (phase IN ('A', 'B', 'C', 'D')),
  lead_sentence TEXT NOT NULL,
  support_sentences JSONB NOT NULL, -- Array of text
  close_sentence TEXT NOT NULL,
  cohesion_score SMALLINT CHECK (cohesion_score IS NULL OR (cohesion_score >= 0 AND cohesion_score <= 3)),
  genre_match_score SMALLINT CHECK (genre_match_score IS NULL OR (genre_match_score >= 0 AND genre_match_score <= 3)),
  tense_register_score SMALLINT CHECK (tense_register_score IS NULL OR (tense_register_score >= 0 AND tense_register_score <= 3)),
  close_quality_score SMALLINT CHECK (close_quality_score IS NULL OR (close_quality_score >= 0 AND close_quality_score <= 3)),
  composite_paragraph_score SMALLINT CHECK (composite_paragraph_score IS NULL OR (composite_paragraph_score >= 0 AND composite_paragraph_score <= 100)),
  scaffold_used BOOLEAN DEFAULT FALSE,
  scaffold_type JSONB,
  semantic_paragraph_score SMALLINT CHECK (semantic_paragraph_score IS NULL OR (semantic_paragraph_score >= 0 AND semantic_paragraph_score <= 100)),
  xp_earned SMALLINT NOT NULL DEFAULT 0,
  ai_feedback JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_paragraph_sessions_pupil_id ON paragraph_sessions(pupil_id);
CREATE INDEX idx_paragraph_sessions_level_id ON paragraph_sessions(level_id);
CREATE INDEX idx_paragraph_sessions_genre ON paragraph_sessions(genre);
CREATE INDEX idx_paragraph_sessions_session_date ON paragraph_sessions(session_date);

-- ============================================================================
-- MASTERY TRACKING & PROGRESSION GATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS mastery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pupil_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  level_id SMALLINT NOT NULL REFERENCES formula_levels(id) ON DELETE CASCADE,
  session_1_score SMALLINT CHECK (session_1_score IS NULL OR (session_1_score >= 0 AND session_1_score <= 100)),
  session_2_score SMALLINT CHECK (session_2_score IS NULL OR (session_2_score >= 0 AND session_2_score <= 100)),
  session_3_score SMALLINT CHECK (session_3_score IS NULL OR (session_3_score >= 0 AND session_3_score <= 100)),
  session_4_score SMALLINT CHECK (session_4_score IS NULL OR (session_4_score >= 0 AND session_4_score <= 100)),
  session_5_score SMALLINT CHECK (session_5_score IS NULL OR (session_5_score >= 0 AND session_5_score <= 100)),
  session_6_score SMALLINT CHECK (session_6_score IS NULL OR (session_6_score >= 0 AND session_6_score <= 100)),
  session_7_score SMALLINT CHECK (session_7_score IS NULL OR (session_7_score >= 0 AND session_7_score <= 100)),
  sessions_completed SMALLINT NOT NULL DEFAULT 0 CHECK (sessions_completed >= 0 AND sessions_completed <= 7),
  current_window_average DECIMAL(5, 2),
  gate_passed BOOLEAN DEFAULT FALSE,
  gate_passed_at TIMESTAMPTZ,
  fast_track_eligible BOOLEAN DEFAULT FALSE,
  consolidation_required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(pupil_id, level_id)
);

CREATE INDEX idx_mastery_tracking_pupil_id ON mastery_tracking(pupil_id);
CREATE INDEX idx_mastery_tracking_gate_passed ON mastery_tracking(gate_passed);

CREATE TRIGGER update_mastery_tracking_updated_at BEFORE UPDATE ON mastery_tracking
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- WRITING STUDIO
-- ============================================================================

CREATE TABLE IF NOT EXISTS writing_pieces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pupil_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  genre VARCHAR(20) NOT NULL CHECK (genre IN ('narrative', 'non_fiction', 'persuasive', 'poetry')),
  task_prompt_id UUID REFERENCES writing_tasks(id) ON DELETE SET NULL,
  task_prompt_text TEXT NOT NULL,
  full_text TEXT NOT NULL,
  word_count SMALLINT NOT NULL CHECK (word_count > 0),
  plan_data JSONB,
  self_review_scores JSONB, -- {composition, vocabulary, grammar, punctuation, spelling, purpose_audience_effect}
  pupil_confidence SMALLINT CHECK (pupil_confidence IS NULL OR (pupil_confidence >= 1 AND pupil_confidence <= 5)),
  submitted_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'assessed', 'published')),
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_writing_pieces_pupil_id ON writing_pieces(pupil_id);
CREATE INDEX idx_writing_pieces_genre ON writing_pieces(genre);
CREATE INDEX idx_writing_pieces_status ON writing_pieces(status);
CREATE INDEX idx_writing_pieces_teacher_id ON writing_pieces(teacher_id);

CREATE TRIGGER update_writing_pieces_updated_at BEFORE UPDATE ON writing_pieces
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS ai_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  piece_id UUID NOT NULL UNIQUE REFERENCES writing_pieces(id) ON DELETE CASCADE,
  year_group_assessed SMALLINT NOT NULL CHECK (year_group_assessed >= 1 AND year_group_assessed <= 13),
  composition_score SMALLINT CHECK (composition_score IS NULL OR (composition_score >= 0 AND composition_score <= 3)),
  vocabulary_score SMALLINT CHECK (vocabulary_score IS NULL OR (vocabulary_score >= 0 AND vocabulary_score <= 3)),
  grammar_score SMALLINT CHECK (grammar_score IS NULL OR (grammar_score >= 0 AND grammar_score <= 3)),
  punctuation_score SMALLINT CHECK (punctuation_score IS NULL OR (punctuation_score >= 0 AND punctuation_score <= 3)),
  spelling_score SMALLINT CHECK (spelling_score IS NULL OR (spelling_score >= 0 AND spelling_score <= 3)),
  purpose_audience_effect_score SMALLINT CHECK (purpose_audience_effect_score IS NULL OR (purpose_audience_effect_score >= 0 AND purpose_audience_effect_score <= 3)),
  overall_band SMALLINT CHECK (overall_band IS NULL OR (overall_band >= 0 AND overall_band <= 3)),
  confidence_scores JSONB, -- One confidence value per dimension
  evidence_citations JSONB, -- Text snippets supporting scores
  flags JSONB, -- {low_confidence_dims: [list]}
  raw_ai_response JSONB,
  model_used VARCHAR(100),
  assessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_assessments_piece_id ON ai_assessments(piece_id);
CREATE INDEX idx_ai_assessments_overall_band ON ai_assessments(overall_band);

-- ============================================================================
-- TEACHER FEEDBACK & ANNOTATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS teacher_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  piece_id UUID REFERENCES writing_pieces(id) ON DELETE CASCADE,
  paragraph_session_id UUID REFERENCES paragraph_sessions(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  range_start INTEGER,
  range_end INTEGER,
  comment_text TEXT NOT NULL,
  dimension_override VARCHAR(50), -- e.g. 'composition', 'vocabulary', etc.
  override_score SMALLINT CHECK (override_score IS NULL OR (override_score >= 0 AND override_score <= 3)),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT annotation_target CHECK (
    (piece_id IS NOT NULL AND paragraph_session_id IS NULL) OR
    (piece_id IS NULL AND paragraph_session_id IS NOT NULL)
  ),
  CONSTRAINT valid_range CHECK (
    range_start IS NULL OR range_end IS NULL OR range_start < range_end
  )
);

CREATE INDEX idx_teacher_annotations_piece_id ON teacher_annotations(piece_id);
CREATE INDEX idx_teacher_annotations_paragraph_session_id ON teacher_annotations(paragraph_session_id);
CREATE INDEX idx_teacher_annotations_teacher_id ON teacher_annotations(teacher_id);

-- ============================================================================
-- TEACHER TASK ASSIGNMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS teacher_task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  pupil_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  writing_task_id UUID NOT NULL REFERENCES writing_tasks(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT target_specificity CHECK (
    (class_id IS NOT NULL AND pupil_id IS NULL) OR
    (class_id IS NULL AND pupil_id IS NOT NULL)
  )
);

CREATE INDEX idx_teacher_task_assignments_teacher_id ON teacher_task_assignments(teacher_id);
CREATE INDEX idx_teacher_task_assignments_class_id ON teacher_task_assignments(class_id);
CREATE INDEX idx_teacher_task_assignments_pupil_id ON teacher_task_assignments(pupil_id);
CREATE INDEX idx_teacher_task_assignments_writing_task_id ON teacher_task_assignments(writing_task_id);

-- ============================================================================
-- INTERVENTION & SUPPORT
-- ============================================================================

CREATE TABLE IF NOT EXISTS intervention_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pupil_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trigger_layer VARCHAR(20) NOT NULL CHECK (trigger_layer IN ('formula', 'paragraph', 'writing')),
  trigger_date DATE NOT NULL,
  error_pattern JSONB NOT NULL, -- e.g. {category: 'subject_verb_agreement', frequency: 0.6}
  action_taken TEXT NOT NULL,
  consolidation_pack_generated BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intervention_log_pupil_id ON intervention_log(pupil_id);
CREATE INDEX idx_intervention_log_trigger_date ON intervention_log(trigger_date);

CREATE TRIGGER update_intervention_log_updated_at BEFORE UPDATE ON intervention_log
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

CREATE OR REPLACE VIEW v_class_formula_progress AS
SELECT
  c.id,
  c.name,
  c.school_id,
  COUNT(DISTINCT p.id) as total_pupils,
  ROUND(AVG(pp.current_formula_level)::NUMERIC, 1) as avg_formula_level,
  COUNT(DISTINCT CASE WHEN pp.writing_studio_unlocked THEN p.id END) as writing_studio_unlocked_count,
  ROUND(AVG(COALESCE(pp.total_xp, 0))::NUMERIC, 0) as avg_total_xp
FROM classes c
LEFT JOIN profiles p ON p.class_id = c.id AND p.role = 'pupil'
LEFT JOIN pupil_progress pp ON pp.pupil_id = p.id
GROUP BY c.id, c.name, c.school_id;

CREATE OR REPLACE VIEW v_pupil_transfer_rate AS
SELECT
  pp.pupil_id,
  p.class_id,
  pp.current_formula_level,
  COUNT(CASE WHEN fs.formula_score >= 80 THEN 1 END)::FLOAT /
    NULLIF(COUNT(*), 0) as success_rate_last_5,
  MAX(fs.session_date) as last_session_date
FROM pupil_progress pp
JOIN profiles p ON p.id = pp.pupil_id
LEFT JOIN formula_sessions fs ON fs.pupil_id = pp.pupil_id
  AND fs.session_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY pp.pupil_id, p.class_id, pp.current_formula_level;

CREATE OR REPLACE VIEW v_pending_writing_reviews AS
SELECT
  wp.id,
  wp.pupil_id,
  p.first_name as pupil_name,
  p.class_id,
  wp.genre,
  wp.word_count,
  wp.submitted_at,
  CURRENT_DATE - wp.submitted_at::DATE as days_pending,
  c.teacher_id
FROM writing_pieces wp
JOIN profiles p ON p.id = wp.pupil_id
LEFT JOIN classes c ON c.id = p.class_id
WHERE wp.status = 'submitted'
ORDER BY wp.submitted_at ASC;

-- ============================================================================
-- PERMISSIONS: Create special roles for application logic
-- ============================================================================

-- Grant appropriate permissions (assumes Supabase setup with service role)
-- Note: RLS policies are in the separate rls-policies.sql file
