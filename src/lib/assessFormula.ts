/**
 * WF-007: AI Formula Assessment
 * Calls the Supabase Edge Function 'assess-formula' and
 * saves the result to formula_sessions + pupil_progress.
 * Contract follows ai-prompts/formula-assessment.md exactly.
 */

import { supabase } from './supabase'
import type { FormulaLevel, FormulaAssessmentResult, Phase } from '../types/index'

// ─── Edge Function input shape (mirrors formula-assessment.md) ───────────────

export interface AssessFormulaInput {
  level_id: string
  formula_definition: {
    slots: Array<{
      position: number
      word_class: string
      colour: string
    }>
  }
  pupil_sentence: string
  word_banks_used: string[]
  year_group: number
  phase: Phase
  attempt_number: 1 | 2
  /** Phase 3: full curated word bank available to the pupil (base forms only).
   *  Exempts word-bank-sourced verbs from subject_agreement penalty. */
  available_word_banks?: Record<string, string[]>
}

// ─── Edge Function raw output shape (before we map to our types) ─────────────

export interface RawAssessmentResult {
  element_scores: Array<{
    slot: string
    word_class: string
    score: number
    feedback_short: string
    feedback_detail: string
  }>
  overall_score: number
  top_strength: string
  primary_improvement: string
  common_error_type: string | null
  confidence: number
}

// ─── colour labels (to send to AI) ───────────────────────────────────────────

const WORD_CLASS_COLOUR_LABEL: Record<string, string> = {
  determiner: 'Purple',
  adjective: 'Green',
  noun: 'Blue',
  verb: 'Red',
  adverb: 'Orange',
  preposition: 'Brown',
  pronoun: 'Pink',
  conjunction: 'Yellow',
}

// ─── XP calculation ──────────────────────────────────────────────────────────

export const calculateXP = (levelId: number, score: number): number => {
  const base = 10 * levelId
  const bonus = score >= 80 ? Math.round(base * 0.5) : 0
  return base + bonus
}

// ─── main function ────────────────────────────────────────────────────────────

export interface AssessFormulaParams {
  pupilId: string
  level: FormulaLevel
  sentence: string
  wordsUsed: string[]
  yearGroup: number
  attemptNumber?: 1 | 2
  /** Scaffold stage 1–4 (Phase 2) */
  scaffoldStage?: number
  /** Word classes the pupil used hints for (Phase 2) */
  hintsUsed?: string[]
  /** Session number on this level (Phase 2) */
  sessionNumberOnLevel?: number
  /** Phase 3: AI-generated context sentence shown during session */
  contextSentence?: string | null
  /** Phase 3: subject used in this session (from rotation) */
  subjectUsed?: string | null
  /** Phase 3: distractor words used (wrong-class words added to word bank) */
  distractorWordsUsed?: Record<string, string[]> | null
  /** Phase 3: full word bank available to the pupil (base forms). Passed to the
   *  assessor so it does not penalise for verb agreement on word-bank verbs. */
  availableWordBanks?: Record<string, string[]> | null
}

export const assessFormula = async (
  params: AssessFormulaParams
): Promise<{ raw: RawAssessmentResult; sessionId: string; xpEarned: number }> => {
  const {
    pupilId, level, sentence, wordsUsed, yearGroup,
    attemptNumber = 1,
    scaffoldStage = 1,
    hintsUsed = [],
    sessionNumberOnLevel,
    contextSentence = null,
    subjectUsed = null,
    distractorWordsUsed = null,
    availableWordBanks = null,
  } = params

  // Build input per Edge Function contract
  const input: AssessFormulaInput = {
    level_id: `L${level.id}`,
    formula_definition: {
      slots: level.formula_elements.map((el) => ({
        position: el.position,
        word_class: el.word_class,
        colour: WORD_CLASS_COLOUR_LABEL[el.word_class] ?? 'Grey',
      })),
    },
    pupil_sentence: sentence,
    word_banks_used: wordsUsed,
    year_group: yearGroup,
    phase: level.phase,
    attempt_number: attemptNumber,
    // Phase 3: pass full bank so assessor doesn't penalise base-form verbs
    ...(availableWordBanks ? { available_word_banks: availableWordBanks } : {}),
  }

  // Call Edge Function
  const { data, error } = await supabase.functions.invoke<RawAssessmentResult>('assess-formula', {
    body: input,
  })

  if (error || !data) {
    // Return a fallback score so offline mode still works
    console.error('[assessFormula] Edge Function error:', error)
    throw new Error(error?.message ?? 'Assessment service unavailable')
  }

  // Phase 2: apply hint deduction at scaffold stage 3 (−5 pts per unique word class hinted)
  const HINT_DEDUCTION = 5
  const hintPenalty = scaffoldStage === 3 ? hintsUsed.length * HINT_DEDUCTION : 0
  const adjustedScore = Math.max(0, data.overall_score - hintPenalty)

  const xpEarned = calculateXP(level.id, adjustedScore)

  // Persist to formula_sessions
  const { data: sessionData, error: sessionError } = await supabase
    .from('formula_sessions')
    .insert({
      pupil_id: pupilId,
      level_id: level.id,
      session_date: new Date().toISOString().split('T')[0],
      formula_score: adjustedScore,
      sentence_built: sentence,
      scaffold_used: scaffoldStage <= 2,
      scaffold_type: {
        phase: level.phase,
        scaffold_stage: scaffoldStage,
        hints_used: hintsUsed,
        hint_penalty: hintPenalty,
        concept_cards_viewed: true,
      },
      is_lens_lab: false,
      xp_earned: xpEarned,
      semantic_purpose_score: null,
      semantic_audience_score: null,
      semantic_effect_score: null,
      session_number_on_level: sessionNumberOnLevel ?? null,
      scaffold_stage: scaffoldStage,
      context_sentence: contextSentence,       // Phase 3
      subject_used: subjectUsed,               // Phase 3
      distractor_words_used: distractorWordsUsed, // Phase 3
      ai_mastery_check: null,      // Phase 7
    })
    .select('id')
    .single()

  // Update raw result with adjusted score for upstream consumption
  data.overall_score = adjustedScore

  if (sessionError || !sessionData) {
    throw new Error(sessionError?.message ?? 'Failed to save session')
  }

  // Note: pupil_progress total_xp update is handled by the calling page
  // (FormulaPage) to centralise XP + streak + progression logic (WF-009/013).

  return {
    raw: data,
    sessionId: sessionData.id as string,
    xpEarned,
  }
}

// Re-export FormulaAssessmentResult for convenience
export type { FormulaAssessmentResult }
