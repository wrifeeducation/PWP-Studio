// ── PWP Programme types ──────────────────────────────────────────────────────

export type WordBankPhase = 'A' | 'B' | 'C' | 'D'
export type StepType = 'new_element' | 'consolidation' | 'tense_variety' | 'transition' | 'three_stage'
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'green' | 'platinum'

export interface PwpLevel {
  id: number
  level_number: number
  title: string
  new_element: string
  trigger_note: string | null
  is_paragraph_phase: boolean
  word_bank_phase: WordBankPhase
  sort_order: number
}

export interface PwpStep {
  id: number
  level_id: number
  step_number: number
  formula: string
  step_type: StepType
  example: string
  subject_prompt: string
  target_sentence: string
  is_paragraph_step: boolean
  sort_order: number
  word_bank_config?: PwpWordBankConfig | null
}

export interface PwpWordBankConfig {
  id: number
  step_id: number
  bank_words: string[]
  gap_slots: GapSlot[] | null
  distractors: string[] | null
  phase_override: string | null
}

export interface GapSlot {
  position: number        // index in the formula where this gap appears
  word_class: string      // e.g. 'adjective', 'adverb-manner'
  label: string           // e.g. 'ADJ', 'ADV-manner', 'ADJ₁'
}

export interface PwpQuiz {
  id: number
  quiz_number: number
  title: string
  inserted_after_level: number
  audio_key: string
  prompts?: PwpQuizPrompt[]
}

export interface PwpQuizPrompt {
  id: number
  quiz_id: number
  prompt_number: number
  subject: string
  verb: string
  instruction: string
  target_sentence: string
  sort_order: number
}

// ── Path node (union of level and quiz) ──────────────────────────────────────
export type PathNodeType = 'level' | 'quiz'

export interface LevelPathNode {
  type: 'level'
  id: number
  level_number: number
  title: string
  is_paragraph_phase: boolean
  word_bank_phase: WordBankPhase
  status: 'locked' | 'active' | 'complete'
}

export interface QuizPathNode {
  type: 'quiz'
  id: number
  quiz_number: number
  title: string
  inserted_after_level: number
  status: 'locked' | 'unlocked' | 'passed'
  score?: number
  total_prompts?: number
}

export type PathNode = LevelPathNode | QuizPathNode

// ── Pupil progress (from formula_progress + gamification columns) ────────────
export interface PwpPupilProgress {
  pupil_id: string
  total_xp: number
  streak_days: number
  last_active_date: string | null
  word_bank_phase_override: WordBankPhase | null
  highest_level_reached: number
  current_pwp_level_id: number | null
  current_pwp_step_id: number | null
}

// ── Gamification ─────────────────────────────────────────────────────────────
export interface PwpBadge {
  id: string
  name: string
  description: string
  category: string
  rarity: string
  trigger_type: string
  icon_key: string
}

export interface PwpPupilBadge {
  pupil_id: string
  badge_id: string
  awarded_at: string
}

export type LevelTitle =
  | 'Apprentice Writer'
  | 'Sentence Builder'
  | 'Phrase Crafter'
  | 'Paragraph Writer'
  | 'Master Composer'

// ── Feedback ─────────────────────────────────────────────────────────────────
export type FeedbackState = 'correct_first' | 'correct_retry' | 'needs_revision'

export interface AssessmentResult {
  is_correct: boolean
  error_type: string | null
  error_words: string[]      // indices/words to underline in the submitted sentence
  targeted_prompt: string | null
  xp_earned: number
}

// ── Word class chip colours (used across formula bar, guidance, word bank) ───
export const WORD_CLASS_COLOURS: Record<string, string> = {
  D:    '#3B82F6',
  N:    '#6C5CE7',
  V:    '#F97316',
  Adj:  '#22C55E',
  Adv:  '#00b894',
  Pro:  '#F43F5E',
  Prep: '#6B7280',
  Conj: '#EAB308',
}

export const WORD_CLASS_LABELS: Record<string, string> = {
  determiner:   'D',
  noun:         'N',
  verb:         'V',
  adjective:    'Adj',
  adverb:       'Adv',
  pronoun:      'Pro',
  preposition:  'Prep',
  conjunction:  'Conj',
}
