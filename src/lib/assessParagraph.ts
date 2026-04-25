/**
 * WF-012: AI Paragraph Assessment
 * Calls the Supabase Edge Function 'assess-paragraph' and
 * saves the result to paragraph_sessions.
 * Contract follows ai-prompts/paragraph-assessment.md exactly.
 */

import { supabase } from './supabase'
import type { Genre, Phase, ParagraphDimension } from '../types/index'

// ─── Edge Function input shape (mirrors paragraph-assessment.md) ──────────────

export interface AssessParagraphInput {
  level_id: string
  genre: Genre
  phase: Phase
  lead_sentence: string
  support_sentences: string[]
  close_sentence: string
  year_group: number
  expected_support_types?: string[]
  tense_target: string | null
  register_target: string | null
}

// ─── Edge Function raw output shape ──────────────────────────────────────────

export interface RawParagraphAssessment {
  cohesion_score: number          // 0-3
  genre_match_score: number       // 0-3
  tense_register_score: number | null   // 0-3 or null
  close_quality_score: number     // 0-3
  composite_score: number         // 0-100
  strongest_sentence: string
  weakest_sentence_position: string
  primary_feedback: string
  secondary_feedback: string
  genre_type_feedback: string | null
  confidence: number              // 0-1
}

// ─── Parameters for assessParagraph ─────────────────────────────────────────

export interface AssessParagraphParams {
  pupilId: string
  levelId: number
  genre: Genre
  phase: Phase
  leadSentence: string
  supportSentences: string[]
  closeSentence: string
  yearGroup: number
  formulaScore: number // Needed for composite XP calculation
  paragraphActive: boolean
}

// ─── Result returned to callers ───────────────────────────────────────────────

export interface ParagraphAssessmentOutput {
  raw: RawParagraphAssessment
  sessionId: string
  xpEarned: number
  compositeScore: number // 70% formula + 30% paragraph
  dimensionScores: Record<ParagraphDimension, number | null>
}

// ─── XP helpers ───────────────────────────────────────────────────────────────

const calcParagraphXP = (compositeScore: number): number => {
  return Math.max(10, Math.round((compositeScore / 100) * 100))
}

// ─── main function ────────────────────────────────────────────────────────────

export const assessParagraph = async (
  params: AssessParagraphParams
): Promise<ParagraphAssessmentOutput> => {
  const {
    pupilId,
    levelId,
    genre,
    phase,
    leadSentence,
    supportSentences,
    closeSentence,
    yearGroup,
    formulaScore,
    paragraphActive,
  } = params

  // Build input per Edge Function contract
  const input: AssessParagraphInput = {
    level_id: `P${levelId}${phase}`,
    genre,
    phase,
    lead_sentence: leadSentence,
    support_sentences: supportSentences,
    close_sentence: closeSentence,
    year_group: yearGroup,
    tense_target: null,
    register_target: null,
  }

  // Call Edge Function
  const { data, error } = await supabase.functions.invoke<RawParagraphAssessment>(
    'assess-paragraph',
    { body: input }
  )

  if (error || !data) {
    console.error('[assessParagraph] Edge Function error:', error)
    throw new Error(error?.message ?? 'Paragraph assessment service unavailable')
  }

  // Compute composite: 70% formula + 30% paragraph
  const compositeScore = paragraphActive
    ? Math.round(formulaScore * 0.7 + data.composite_score * 0.3)
    : formulaScore

  const xpEarned = calcParagraphXP(compositeScore)

  // Map dimension scores
  const dimensionScores: Record<ParagraphDimension, number | null> = {
    cohesion: data.cohesion_score,
    genre_match: data.genre_match_score,
    tense_register: data.tense_register_score,
    close_quality: data.close_quality_score,
  }

  // Persist to paragraph_sessions
  const { data: sessionData, error: sessionError } = await supabase
    .from('paragraph_sessions')
    .insert({
      pupil_id: pupilId,
      level_id: levelId,
      session_date: new Date().toISOString().split('T')[0],
      genre,
      phase,
      lead_sentence: leadSentence,
      support_sentences: supportSentences,
      close_sentence: closeSentence,
      cohesion_score: data.cohesion_score,
      genre_match_score: data.genre_match_score,
      tense_register_score: data.tense_register_score,
      close_quality_score: data.close_quality_score,
      composite_paragraph_score: data.composite_score,
      scaffold_used: phase === 'A',
      scaffold_type: { phase },
      semantic_paragraph_score: null,
      xp_earned: xpEarned,
      ai_feedback: {
        primary: data.primary_feedback,
        secondary: data.secondary_feedback,
        genre: data.genre_type_feedback,
        strongest_sentence: data.strongest_sentence,
        weakest_position: data.weakest_sentence_position,
        confidence: data.confidence,
      },
    })
    .select('id')
    .single()

  if (sessionError || !sessionData) {
    throw new Error(sessionError?.message ?? 'Failed to save paragraph session')
  }

  // Update pupil_progress: total_xp
  const { data: progressData } = await supabase
    .from('pupil_progress')
    .select('total_xp')
    .eq('pupil_id', pupilId)
    .single()

  await supabase
    .from('pupil_progress')
    .update({
      total_xp: (progressData?.total_xp ?? 0) + xpEarned,
      last_session_date: new Date().toISOString().split('T')[0],
    })
    .eq('pupil_id', pupilId)

  return {
    raw: data,
    sessionId: sessionData.id as string,
    xpEarned,
    compositeScore,
    dimensionScores,
  }
}
