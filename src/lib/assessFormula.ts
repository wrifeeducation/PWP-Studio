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
}

export const assessFormula = async (
  params: AssessFormulaParams
): Promise<{ raw: RawAssessmentResult; sessionId: string; xpEarned: number }> => {
  const { pupilId, level, sentence, wordsUsed, yearGroup, attemptNumber = 1 } = params

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

  const xpEarned = calculateXP(level.id, data.overall_score)

  // Persist to formula_sessions
  const { data: sessionData, error: sessionError } = await supabase
    .from('formula_sessions')
    .insert({
      pupil_id: pupilId,
      level_id: level.id,
      session_date: new Date().toISOString().split('T')[0],
      formula_score: data.overall_score,
      sentence_built: sentence,
      scaffold_used: level.phase === 'A',
      scaffold_type: { phase: level.phase },
      is_lens_lab: false,
      xp_earned: xpEarned,
      semantic_purpose_score: null,
      semantic_audience_score: null,
      semantic_effect_score: null,
    })
    .select('id')
    .single()

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
