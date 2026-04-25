/**
 * WriFe Platform Type Definitions
 * Gamified digital literacy for UK primary/secondary schools
 * Supabase-backed, fully type-safe
 */

// ============================================================================
// ENUMS & CATEGORICAL TYPES
// ============================================================================

export enum Role {
  PUPIL = 'pupil',
  TEACHER = 'teacher',
  SCHOOL_ADMIN = 'school_admin',
  PARENT = 'parent',
}

export enum Phase {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
}

export enum Genre {
  NARRATIVE = 'narrative',
  NON_FICTION = 'non_fiction',
  PERSUASIVE = 'persuasive',
  POETRY = 'poetry',
}

export enum WordClass {
  DETERMINER = 'determiner',
  ADJECTIVE = 'adjective',
  NOUN = 'noun',
  VERB = 'verb',
  ADVERB = 'adverb',
  PREPOSITION = 'preposition',
  PRONOUN = 'pronoun',
  CONJUNCTION = 'conjunction',
}

// Word class to colour mapping for UI
export const WORD_CLASS_COLOUR: Record<WordClass, string> = {
  [WordClass.DETERMINER]: '#9B59B6', // purple
  [WordClass.ADJECTIVE]: '#27AE60', // green
  [WordClass.NOUN]: '#3498DB', // blue
  [WordClass.VERB]: '#E74C3C', // red
  [WordClass.ADVERB]: '#F39C12', // orange
  [WordClass.PREPOSITION]: '#8B4513', // brown
  [WordClass.PRONOUN]: '#E91E63', // pink
  [WordClass.CONJUNCTION]: '#FFEB3B', // yellow
};

export enum AssessmentBand {
  PRE_EMERGENT = 0,
  WORKING_TOWARDS = 1,
  EXPECTED = 2,
  GREATER_DEPTH = 3,
}

export enum BadgeCategory {
  FORMULA_PRACTICE = 'formula_practice',
  PARAGRAPH_BUILDER = 'paragraph_builder',
  WRITING_STUDIO = 'writing_studio',
  SHARED = 'shared',
}

export enum BadgeRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
}

export enum ParagraphDimension {
  COHESION = 'cohesion',
  GENRE_MATCH = 'genre_match',
  TENSE_REGISTER = 'tense_register',
  CLOSE_QUALITY = 'close_quality',
}

export enum WritingDimension {
  COMPOSITION = 'composition',
  VOCABULARY = 'vocabulary',
  GRAMMAR = 'grammar',
  PUNCTUATION = 'punctuation',
  SPELLING = 'spelling',
  PURPOSE_AUDIENCE_EFFECT = 'purpose_audience_effect',
}

export enum WritingStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  ASSESSED = 'assessed',
  PUBLISHED = 'published',
}

export enum InterventionTrigger {
  FORMULA = 'formula',
  PARAGRAPH = 'paragraph',
  WRITING = 'writing',
}

export enum SchoolPhase {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  ALL_THROUGH = 'all_through',
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type WithTimestamps = {
  created_at: string; // ISO 8601
  updated_at?: string; // ISO 8601
};

export type Nullable<T> = T | null;

export type UUID = string & { readonly __brand: 'UUID' };

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

// ============================================================================
// DATABASE ENTITY TYPES
// ============================================================================

export interface School extends WithTimestamps {
  id: UUID;
  name: string;
  urn: string; // UK school reference number (6 digits)
  address_line1: Nullable<string>;
  city: Nullable<string>;
  postcode: Nullable<string>;
  phase: SchoolPhase;
}

export interface Profile extends WithTimestamps {
  id: UUID; // Matches auth.users.id
  school_id: UUID;
  role: Role;
  first_name: string;
  year_group: Nullable<number>; // 1-13
  class_id: Nullable<UUID>;
  avatar_colour: string;
}

export interface Class extends WithTimestamps {
  id: UUID;
  school_id: UUID;
  name: string;
  year_group: number; // 1-13
  teacher_id: Nullable<UUID>;
  academic_year: string; // Format: "2025-26"
}

export interface ParentPupil {
  id: UUID;
  parent_id: UUID;
  pupil_id: UUID;
  approved: boolean;
  created_at: string;
}

export interface FormulaLevel {
  id: number; // 1-67
  phase: Phase;
  formula_elements: FormulaElement[];
  word_banks: Record<WordClass, string[]>;
  subject_rotation_bank: string[];
  paragraph_active: boolean;
  paragraph_genre_rotation: Nullable<Genre[]>;
  nc_year_group_min: number;
  nc_year_group_max: number;
  created_at: string;
}

export interface FormulaElement {
  position: number;
  word_class: WordClass;
  instruction: string;
  example: string;
}

export interface WordBank extends WithTimestamps {
  id: UUID;
  level_id: number;
  word_class: WordClass;
  words: string[];
  images: Array<{
    word: string;
    image_key: string;
  }>;
}

export interface ParagraphStarter extends WithTimestamps {
  id: UUID;
  genre: Genre;
  phase: Phase;
  slot_type: 'support_1' | 'support_2' | 'close';
  year_group_min: number;
  year_group_max: number;
  starter_text: string;
}

export interface WritingTask extends WithTimestamps {
  id: UUID;
  genre: Genre;
  year_group_min: number;
  year_group_max: number;
  title: string;
  prompt_text: string;
  word_count_min: number;
  word_count_max: number;
  success_criteria: string[];
  planning_scaffold_type: Nullable<string>;
  is_teacher_assignable: boolean;
}

export interface Badge extends WithTimestamps {
  id: UUID;
  name: string;
  description: Nullable<string>;
  category: BadgeCategory;
  rarity: BadgeRarity;
  trigger_type: string; // e.g. 'mastery_gate', 'streak'
  trigger_value: Record<string, unknown>; // Trigger-specific data
  icon_key: string;
}

export interface PupilProgress extends WithTimestamps {
  id: UUID;
  pupil_id: UUID;
  current_formula_level: number; // 1-67
  current_paragraph_phase: Phase;
  writing_studio_unlocked: boolean;
  current_streak: number;
  longest_streak: number;
  streak_shield_active: boolean;
  last_session_date: Nullable<string>; // Date ISO format
  total_xp: number;
  /** WF-035: Set when pupil buys Double XP Day from the XP Shop */
  double_xp_until: Nullable<string>; // ISO timestamp
}

export interface PupilBadge extends WithTimestamps {
  id: UUID;
  pupil_id: UUID;
  badge_id: UUID;
  awarded_at: string;
  source: Nullable<{
    type: 'formula_session_id' | 'paragraph_session_id' | 'writing_piece_id';
    value: UUID;
  }>;
}

export interface FormulaSession extends WithTimestamps {
  id: UUID;
  pupil_id: UUID;
  level_id: number;
  session_date: string; // Date ISO format
  formula_score: number; // 0-100
  semantic_purpose_score: Nullable<number>;
  semantic_audience_score: Nullable<number>;
  semantic_effect_score: Nullable<number>;
  sentence_built: Nullable<string>;
  scaffold_used: boolean;
  scaffold_type: Nullable<Record<string, unknown>>;
  is_lens_lab: boolean;
  xp_earned: number;
}

export interface ParagraphSession extends WithTimestamps {
  id: UUID;
  pupil_id: UUID;
  level_id: number;
  session_date: string; // Date ISO format
  genre: Genre;
  phase: Phase;
  lead_sentence: string;
  support_sentences: string[];
  close_sentence: string;
  cohesion_score: Nullable<number>; // 0-3
  genre_match_score: Nullable<number>; // 0-3
  tense_register_score: Nullable<number>; // 0-3
  close_quality_score: Nullable<number>; // 0-3
  composite_paragraph_score: Nullable<number>; // 0-100
  scaffold_used: boolean;
  scaffold_type: Nullable<Record<string, unknown>>;
  semantic_paragraph_score: Nullable<number>;
  xp_earned: number;
  ai_feedback: Nullable<Record<string, unknown>>;
}

export interface MasteryTracking extends WithTimestamps {
  id: UUID;
  pupil_id: UUID;
  level_id: number;
  session_1_score: Nullable<number>;
  session_2_score: Nullable<number>;
  session_3_score: Nullable<number>;
  session_4_score: Nullable<number>;
  session_5_score: Nullable<number>;
  session_6_score: Nullable<number>;
  session_7_score: Nullable<number>;
  sessions_completed: number; // 0-7
  current_window_average: Nullable<number>;
  gate_passed: boolean;
  gate_passed_at: Nullable<string>;
  fast_track_eligible: boolean;
  consolidation_required: boolean;
}

export interface WritingPiece extends WithTimestamps {
  id: UUID;
  pupil_id: UUID;
  genre: Genre;
  task_prompt_id: Nullable<UUID>;
  task_prompt_text: string;
  full_text: string;
  word_count: number;
  plan_data: Nullable<Record<string, unknown>>;
  self_review_scores: Nullable<Record<WritingDimension, number>>;
  pupil_confidence: Nullable<number>; // 1-5
  submitted_at: Nullable<string>;
  status: WritingStatus;
  teacher_id: Nullable<UUID>;
  reviewed_at: Nullable<string>;
  published_at: Nullable<string>;
}

export interface AIAssessment extends WithTimestamps {
  id: UUID;
  piece_id: UUID;
  year_group_assessed: number; // 1-13
  composition_score: Nullable<AssessmentBand>;
  vocabulary_score: Nullable<AssessmentBand>;
  grammar_score: Nullable<AssessmentBand>;
  punctuation_score: Nullable<AssessmentBand>;
  spelling_score: Nullable<AssessmentBand>;
  purpose_audience_effect_score: Nullable<AssessmentBand>;
  overall_band: Nullable<AssessmentBand>;
  confidence_scores: Nullable<Record<WritingDimension, number>>; // 0-1
  evidence_citations: Nullable<Record<WritingDimension, string[]>>;
  flags: Nullable<{
    low_confidence_dims: WritingDimension[];
  }>;
  raw_ai_response: Nullable<Record<string, unknown>>;
  model_used: Nullable<string>;
  assessed_at: string;
}

export interface TeacherAnnotation extends WithTimestamps {
  id: UUID;
  piece_id: Nullable<UUID>;
  paragraph_session_id: Nullable<UUID>;
  teacher_id: UUID;
  range_start: Nullable<number>;
  range_end: Nullable<number>;
  comment_text: string;
  dimension_override: Nullable<WritingDimension>;
  override_score: Nullable<AssessmentBand>;
}

export interface TeacherTaskAssignment extends WithTimestamps {
  id: UUID;
  teacher_id: UUID;
  class_id: Nullable<UUID>;
  pupil_id: Nullable<UUID>;
  writing_task_id: UUID;
  assigned_at: string;
  due_date: Nullable<string>; // Date ISO format
}

export interface InterventionLog extends WithTimestamps {
  id: UUID;
  pupil_id: UUID;
  trigger_layer: InterventionTrigger;
  trigger_date: string; // Date ISO format
  error_pattern: {
    category: string;
    frequency: number; // 0-1
  };
  action_taken: string;
  consolidation_pack_generated: boolean;
  /** WF-032: Set when mastery_tracking.consolidation_required = true triggered this intervention */
  consolidation_required: boolean;
  resolved_at: Nullable<string>;
}

// ============================================================================
// SUPABASE DATABASE TYPE WRAPPER
// ============================================================================

export interface Database {
  public: {
    Tables: {
      schools: {
        Row: School;
        Insert: Omit<School, 'id' | 'created_at'>;
        Update: DeepPartial<Omit<School, 'id' | 'created_at'>>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: DeepPartial<Omit<Profile, 'id' | 'created_at'>>;
      };
      classes: {
        Row: Class;
        Insert: Omit<Class, 'id' | 'created_at'>;
        Update: DeepPartial<Omit<Class, 'id' | 'created_at'>>;
      };
      parent_pupil: {
        Row: ParentPupil;
        Insert: Omit<ParentPupil, 'id' | 'created_at'>;
        Update: DeepPartial<Omit<ParentPupil, 'id' | 'created_at'>>;
      };
      formula_levels: {
        Row: FormulaLevel;
        Insert: Omit<FormulaLevel, 'created_at'>;
        Update: DeepPartial<Omit<FormulaLevel, 'created_at'>>;
      };
      word_banks: {
        Row: WordBank;
        Insert: Omit<WordBank, 'id' | 'created_at'>;
        Update: DeepPartial<Omit<WordBank, 'id' | 'created_at'>>;
      };
      paragraph_starters: {
        Row: ParagraphStarter;
        Insert: Omit<ParagraphStarter, 'id' | 'created_at'>;
        Update: DeepPartial<Omit<ParagraphStarter, 'id' | 'created_at'>>;
      };
      writing_tasks: {
        Row: WritingTask;
        Insert: Omit<WritingTask, 'id' | 'created_at'>;
        Update: DeepPartial<Omit<WritingTask, 'id' | 'created_at'>>;
      };
      badges: {
        Row: Badge;
        Insert: Omit<Badge, 'id' | 'created_at'>;
        Update: DeepPartial<Omit<Badge, 'id' | 'created_at'>>;
      };
      pupil_progress: {
        Row: PupilProgress;
        Insert: Omit<PupilProgress, 'id' | 'created_at' | 'updated_at'>;
        Update: DeepPartial<Omit<PupilProgress, 'id' | 'created_at'>>;
      };
      pupil_badges: {
        Row: PupilBadge;
        Insert: Omit<PupilBadge, 'id' | 'created_at'>;
        Update: DeepPartial<Omit<PupilBadge, 'id' | 'created_at'>>;
      };
      formula_sessions: {
        Row: FormulaSession;
        Insert: Omit<FormulaSession, 'id' | 'created_at'>;
        Update: DeepPartial<Omit<FormulaSession, 'id' | 'created_at'>>;
      };
      paragraph_sessions: {
        Row: ParagraphSession;
        Insert: Omit<ParagraphSession, 'id' | 'created_at'>;
        Update: DeepPartial<Omit<ParagraphSession, 'id' | 'created_at'>>;
      };
      mastery_tracking: {
        Row: MasteryTracking;
        Insert: Omit<MasteryTracking, 'id' | 'created_at' | 'updated_at'>;
        Update: DeepPartial<Omit<MasteryTracking, 'id' | 'created_at'>>;
      };
      writing_pieces: {
        Row: WritingPiece;
        Insert: Omit<WritingPiece, 'id' | 'created_at' | 'updated_at'>;
        Update: DeepPartial<Omit<WritingPiece, 'id' | 'created_at'>>;
      };
      ai_assessments: {
        Row: AIAssessment;
        Insert: Omit<AIAssessment, 'id' | 'created_at'>;
        Update: DeepPartial<Omit<AIAssessment, 'id' | 'created_at'>>;
      };
      teacher_annotations: {
        Row: TeacherAnnotation;
        Insert: Omit<TeacherAnnotation, 'id' | 'created_at'>;
        Update: DeepPartial<Omit<TeacherAnnotation, 'id' | 'created_at'>>;
      };
      teacher_task_assignments: {
        Row: TeacherTaskAssignment;
        Insert: Omit<TeacherTaskAssignment, 'id' | 'created_at'>;
        Update: DeepPartial<Omit<TeacherTaskAssignment, 'id' | 'created_at'>>;
      };
      intervention_log: {
        Row: InterventionLog;
        Insert: Omit<InterventionLog, 'id' | 'created_at' | 'updated_at'>;
        Update: DeepPartial<Omit<InterventionLog, 'id' | 'created_at'>>;
      };
    };
    Views: {
      v_class_formula_progress: {
        Row: ClassFormulaProgress;
      };
      v_pupil_transfer_rate: {
        Row: PupilTransferRate;
      };
      v_pending_writing_reviews: {
        Row: PendingWritingReview;
      };
    };
  };
}

// ============================================================================
// VIEW TYPES
// ============================================================================

export interface ClassFormulaProgress {
  id: UUID;
  name: string;
  school_id: UUID;
  total_pupils: number;
  avg_formula_level: Nullable<number>;
  writing_studio_unlocked_count: number;
  avg_total_xp: Nullable<number>;
}

export interface PupilTransferRate {
  pupil_id: UUID;
  class_id: Nullable<UUID>;
  current_formula_level: number;
  success_rate_last_5: Nullable<number>;
  last_session_date: Nullable<string>;
}

export interface PendingWritingReview {
  id: UUID;
  pupil_id: UUID;
  pupil_name: string;
  class_id: Nullable<UUID>;
  genre: Genre;
  word_count: number;
  submitted_at: string;
  days_pending: number;
  teacher_id: Nullable<UUID>;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface AssessmentScore {
  band: AssessmentBand;
  confidence: number; // 0-1
  evidence: string[];
}

export interface FormulaAssessmentResult {
  session_id: UUID;
  formula_score: number; // 0-100
  semantic_scores: {
    purpose: Nullable<number>;
    audience: Nullable<number>;
    effect: Nullable<number>;
  };
  xp_earned: number;
  mastery_progress: {
    sessions_in_window: number; // 1-7
    window_average: Nullable<number>;
    gate_passed: boolean;
  };
  badge_unlocked: Nullable<Badge>;
  next_level_unlocked: boolean;
}

export interface ParagraphAssessmentResult {
  session_id: UUID;
  dimension_scores: Record<ParagraphDimension, Nullable<number>>;
  composite_score: number; // 0-100
  ai_feedback: {
    strengths: string[];
    areas_for_growth: string[];
    specific_examples: Array<{
      category: string;
      text_excerpt: string;
    }>;
  };
  xp_earned: number;
  badge_unlocked: Nullable<Badge>;
}

export interface WritingAssessmentResult {
  piece_id: UUID;
  assessment_id: UUID;
  dimension_scores: Record<WritingDimension, AssessmentScore>;
  overall_band: AssessmentBand;
  confidence: number;
  flags: {
    low_confidence_dims: WritingDimension[];
    requires_manual_review: boolean;
  };
  ncf_alignment: {
    year_group: number;
    aligned_to_band: AssessmentBand;
    key_criteria_met: string[];
  };
  feedback_for_pupil: string;
  feedback_for_teacher: string;
}

export interface SessionSummaryResponse {
  session_type: 'formula' | 'paragraph' | 'writing';
  xp_earned: number;
  streak_info: {
    current: number;
    longest: number;
    shield_active: boolean;
  };
  badges_awarded: Badge[];
  next_milestone: {
    type: string;
    progress_percent: number;
    label: string;
  };
  level_unlocks: {
    formula_level: Nullable<number>;
    paragraph_phase: Nullable<Phase>;
    writing_studio: boolean;
  };
}

// ============================================================================
// UI COMPONENT PROP TYPES
// ============================================================================

export interface FormulaTileProps {
  level: number;
  isUnlocked: boolean;
  isCurrentLevel: boolean;
  phase: Phase;
  masteryProgress: number; // 0-100
  sessionCount: number;
  isGatePassed: boolean;
  onClick: () => void;
  showDetails: boolean;
}

export interface FormulaSlotProps {
  position: number;
  wordClass: WordClass;
  instruction: string;
  example: string;
  selectedWord: Nullable<string>;
  availableWords: string[];
  isHighlighted: boolean;
  onWordSelect: (word: string) => void;
}

export interface ParagraphFrameProps {
  genre: Genre;
  phase: Phase;
  leadSentence: Nullable<string>;
  supportSentences: string[];
  closeSentence: Nullable<string>;
  starters: {
    support_1: string[];
    support_2: string[];
    close: string[];
  };
  isEditable: boolean;
  onChange: (field: string, value: string) => void;
  onSubmit: () => void;
  isValidating: boolean;
}

export interface SessionSummaryProps {
  sessionType: 'formula' | 'paragraph' | 'writing';
  result: FormulaAssessmentResult | ParagraphAssessmentResult | WritingAssessmentResult;
  pupilName: string;
  previousXP: number;
  streakInfo: {
    current: number;
    longest: number;
  };
  badgeRewards: Badge[];
  onContinue: () => void;
  showComparison: boolean;
}

export interface WritingPromptCardProps {
  task: WritingTask;
  genre: Genre;
  isAssigned: boolean;
  dueDate: Nullable<Date>;
  isDraft: boolean;
  wordCount: Nullable<number>;
  successCriteria: string[];
  onStart: () => void;
  onContinue: () => void;
}

export interface DashboardWidgetProps {
  title: string;
  dataType: 'progress' | 'badges' | 'streaks' | 'writing';
  pupilId: Nullable<UUID>;
  classId: Nullable<UUID>;
  schoolId: Nullable<UUID>;
  role: Role;
  isLoading: boolean;
  error: Nullable<string>;
}

// ============================================================================
// STORE TYPES (Zustand)
// ============================================================================

export interface SessionState {
  currentSessionId: Nullable<UUID>;
  sessionType: Nullable<'formula' | 'paragraph' | 'writing'>;
  isActive: boolean;
  startTime: Nullable<Date>;
  responses: Record<string, unknown>;
}

export interface SessionStore extends SessionState {
  startSession: (
    sessionType: 'formula' | 'paragraph' | 'writing',
    contentId: UUID
  ) => Promise<UUID>;
  updateResponse: (key: string, value: unknown) => void;
  endSession: () => Promise<FormulaAssessmentResult | ParagraphAssessmentResult | WritingAssessmentResult>;
  clearSession: () => void;
}

export interface PupilStoreState {
  pupilId: Nullable<UUID>;
  profile: Nullable<Profile>;
  progress: Nullable<PupilProgress>;
  badges: Badge[];
  currentLevel: number;
  currentPhase: Phase;
  isStudioUnlocked: boolean;
}

export interface PupilStore extends PupilStoreState {
  setPupil: (pupilId: UUID) => Promise<void>;
  updateProgress: (progress: Partial<PupilProgress>) => void;
  addBadge: (badge: Badge) => void;
  refreshFromDatabase: () => Promise<void>;
}

export interface GamificationStoreState {
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  shieldActive: boolean;
  badges: Badge[];
  recentAchievements: Array<{
    type: string;
    badge: Badge;
    timestamp: Date;
  }>;
}

export interface GamificationStore extends GamificationStoreState {
  addXP: (amount: number) => void;
  updateStreak: (increment: number) => void;
  activateShield: () => void;
  awardBadge: (badge: Badge) => void;
  sync: (pupilId: UUID) => Promise<void>;
}

export interface DashboardStoreState {
  selectedPupilIds: UUID[];
  selectedClassIds: UUID[];
  selectedSchoolId: Nullable<UUID>;
  filters: {
    genre: Nullable<Genre>;
    status: Nullable<WritingStatus>;
    dateRange: {
      start: Nullable<Date>;
      end: Nullable<Date>;
    };
  };
  isLoading: boolean;
  data: {
    classProgress: ClassFormulaProgress[];
    pendingReviews: PendingWritingReview[];
    interventionFlags: InterventionLog[];
  };
}

export interface DashboardStore extends DashboardStoreState {
  setSelectedPupils: (pupilIds: UUID[]) => void;
  setSelectedClasses: (classIds: UUID[]) => void;
  setFilter: (filterKey: string, value: unknown) => void;
  fetchDashboardData: () => Promise<void>;
  refreshData: () => Promise<void>;
}

// ============================================================================
// OFFLINE & SYNC TYPES
// ============================================================================

export type OfflineQueueItemType =
  | 'formula_session'
  | 'paragraph_session'
  | 'writing_piece_update'
  | 'annotation'
  | 'progress_update';

export interface OfflineQueueItem {
  id: UUID;
  type: OfflineQueueItemType;
  timestamp: Date;
  data: Record<string, unknown>;
  retryCount: number;
  maxRetries: number;
  lastError: Nullable<string>;
}

export enum SyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  SUCCESS = 'success',
  ERROR = 'error',
  CONFLICT = 'conflict',
}

export interface SyncState {
  status: SyncStatus;
  queueLength: number;
  lastSyncTime: Nullable<Date>;
  error: Nullable<string>;
  conflictedItems: OfflineQueueItem[];
}

// ============================================================================
// UTILITY & HELPER TYPES
// ============================================================================

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details: Nullable<Record<string, unknown>>;
}

export interface AuthUser {
  id: UUID;
  email: string;
  profile: Profile;
}

export interface GatewayScore {
  level: number;
  score: number; // 0-100 composite
  sessionDate: Date;
  isIncluded: boolean; // Whether counted in 5-window
}

export interface MasteryGateResult {
  level: number;
  scores: GatewayScore[];
  windowAverage: Nullable<number>;
  gatePassed: boolean;
  fastTrackEligible: boolean;
  consolidationRequired: boolean;
  recommendation: 'progress' | 'consolidate' | 'fast_track';
}

export interface BadgeAwardContext {
  pupilId: UUID;
  badge: Badge;
  sourceId: UUID; // Session or piece ID
  sourceType: 'formula_session_id' | 'paragraph_session_id' | 'writing_piece_id';
  timestamp: Date;
  notificationMessage: string;
}

export interface ConsolidationPack {
  level: number;
  errorPatterns: Array<{
    category: string;
    frequency: number;
    exampleSentences: string[];
    targetExercises: string[];
  }>;
  estimatedDuration: number; // minutes
  difficultyAdjustments: {
    scaffoldType: string;
    wordBankSize: number;
  };
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export const isFormulaLevel = (value: unknown): value is number => {
  return typeof value === 'number' && value >= 1 && value <= 67;
};

export const isPhase = (value: unknown): value is Phase => {
  return Object.values(Phase).includes(value as Phase);
};

export const isGenre = (value: unknown): value is Genre => {
  return Object.values(Genre).includes(value as Genre);
};

export const isRole = (value: unknown): value is Role => {
  return Object.values(Role).includes(value as Role);
};

export const isAssessmentBand = (value: unknown): value is AssessmentBand => {
  return typeof value === 'number' && value >= 0 && value <= 3;
};

// ============================================================================
// CONSTANTS
// ============================================================================

export const FORMULA_LEVELS = {
  MIN: 1,
  MAX: 67,
  PARAGRAPH_UNLOCK: 8,
  WRITING_UNLOCK: 35, // Approximate
} as const;

export const MASTERY_GATE_THRESHOLD = 0.8; // 80%
export const MASTERY_GATE_WINDOW = 5; // Sessions
export const WORD_CLASS_COUNT = 8;
export const UK_YEAR_GROUPS = Array.from({ length: 13 }, (_, i) => i + 1);
export const SCHOOL_DAYS_PER_YEAR = 190;

export const DIMENSIONS = {
  WRITING: [
    WritingDimension.COMPOSITION,
    WritingDimension.VOCABULARY,
    WritingDimension.GRAMMAR,
    WritingDimension.PUNCTUATION,
    WritingDimension.SPELLING,
    WritingDimension.PURPOSE_AUDIENCE_EFFECT,
  ] as const,
  PARAGRAPH: [
    ParagraphDimension.COHESION,
    ParagraphDimension.GENRE_MATCH,
    ParagraphDimension.TENSE_REGISTER,
    ParagraphDimension.CLOSE_QUALITY,
  ] as const,
} as const;
