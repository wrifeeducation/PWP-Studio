/**
 * WF-017 — assessWriting
 * Calls the `assess-writing` Supabase Edge Function per the contract in
 * ai-prompts/writing-studio-assessment.md.
 *
 * Input:  full_text, genre, year_group, task_prompt_text, word_count, plan_data (optional)
 * Output: WritingAssessmentResult (stored in ai_assessments; writing_pieces updated)
 */

import { supabase } from './supabase'
import type {
  Genre,
  WritingDimension,
  AssessmentBand,
} from '../types/index'

// ─── Request / response types ─────────────────────────────────────────────────

export interface AssessWritingInput {
  piece_id: string
  genre: Genre
  year_group: number
  task_prompt_text: string
  full_text: string
  word_count: number
  pwp_formula_level?: string
  plan_submitted?: boolean
}

export interface AssessWritingDimensionResult {
  score: AssessmentBand          // 0-3
  confidence: number             // 0-1
  evidence_citation: string
}

export interface AssessWritingOutput {
  composition: AssessWritingDimensionResult
  vocabulary: AssessWritingDimensionResult
  grammar: AssessWritingDimensionResult
  punctuation: AssessWritingDimensionResult
  spelling: AssessWritingDimensionResult
  purpose_audience_effect: AssessWritingDimensionResult
  overall_band: AssessmentBand
  low_confidence_flags: WritingDimension[]
  raw_ai_response: Record<string, unknown>
  pupil_feedback: {
    warm_comment: string
    grow_1: { comment: string; example_rewrite: string }
    grow_2: { comment: string; example_rewrite: string }
    next_steps: string
  }
  teacher_summary: string
  taf_band_label: string
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Invokes the Edge Function, saves the result, and returns structured output.
 * Also updates the writing_pieces row (status → assessed, submitted_at, word_count).
 */
export const assessWriting = async (
  input: AssessWritingInput
): Promise<AssessWritingOutput> => {
  // 1. Call Edge Function
  const { data, error } = await supabase.functions.invoke('assess-writing', {
    body: {
      genre: input.genre,
      year_group: input.year_group,
      task_prompt: input.task_prompt_text,
      full_text: input.full_text,
      word_count: input.word_count,
      pwp_formula_level: input.pwp_formula_level ?? 'L1',
      plan_submitted: input.plan_submitted ?? false,
    },
  })

  if (error) throw new Error(`assess-writing failed: ${error.message}`)

  const raw = data as Record<string, unknown>

  // 2. Map Edge Function response → AssessWritingOutput
  const result: AssessWritingOutput = {
    composition: {
      score: (raw.composition_score as AssessmentBand) ?? 0,
      confidence: (raw.confidence_scores as Record<string, number>)?.composition ?? 0.5,
      evidence_citation: (raw.evidence_citations as Record<string, string>)?.composition ?? '',
    },
    vocabulary: {
      score: (raw.vocabulary_score as AssessmentBand) ?? 0,
      confidence: (raw.confidence_scores as Record<string, number>)?.vocabulary ?? 0.5,
      evidence_citation: (raw.evidence_citations as Record<string, string>)?.vocabulary ?? '',
    },
    grammar: {
      score: (raw.grammar_score as AssessmentBand) ?? 0,
      confidence: (raw.confidence_scores as Record<string, number>)?.grammar ?? 0.5,
      evidence_citation: (raw.evidence_citations as Record<string, string>)?.grammar ?? '',
    },
    punctuation: {
      score: (raw.punctuation_score as AssessmentBand) ?? 0,
      confidence: (raw.confidence_scores as Record<string, number>)?.punctuation ?? 0.5,
      evidence_citation: (raw.evidence_citations as Record<string, string>)?.punctuation ?? '',
    },
    spelling: {
      score: (raw.spelling_score as AssessmentBand) ?? 0,
      confidence: (raw.confidence_scores as Record<string, number>)?.spelling ?? 0.5,
      evidence_citation: (raw.evidence_citations as Record<string, string>)?.spelling ?? '',
    },
    purpose_audience_effect: {
      score: (raw.purpose_audience_effect_score as AssessmentBand) ?? 0,
      confidence: (raw.confidence_scores as Record<string, number>)?.pae ?? 0.5,
      evidence_citation: (raw.evidence_citations as Record<string, string>)?.pae ?? '',
    },
    overall_band: (raw.overall_band as AssessmentBand) ?? 0,
    low_confidence_flags: (raw.low_confidence_flags as WritingDimension[]) ?? [],
    raw_ai_response: raw,
    pupil_feedback: (raw.pupil_feedback as AssessWritingOutput['pupil_feedback']) ?? {
      warm_comment: '',
      grow_1: { comment: '', example_rewrite: '' },
      grow_2: { comment: '', example_rewrite: '' },
      next_steps: '',
    },
    teacher_summary: (raw.teacher_summary as string) ?? '',
    taf_band_label: (raw.taf_band_label as string) ?? '',
  }

  // 3. Update writing_pieces row → assessed
  await supabase
    .from('writing_pieces')
    .update({
      status: 'assessed',
      submitted_at: new Date().toISOString(),
      word_count: input.word_count,
    })
    .eq('id', input.piece_id)

  // 4. Insert ai_assessments row
  await supabase.from('ai_assessments').insert({
    piece_id: input.piece_id,
    year_group_assessed: input.year_group,
    composition_score: result.composition.score,
    vocabulary_score: result.vocabulary.score,
    grammar_score: result.grammar.score,
    punctuation_score: result.punctuation.score,
    spelling_score: result.spelling.score,
    purpose_audience_effect_score: result.purpose_audience_effect.score,
    overall_band: result.overall_band,
    confidence_scores: {
      composition: result.composition.confidence,
      vocabulary: result.vocabulary.confidence,
      grammar: result.grammar.confidence,
      punctuation: result.punctuation.confidence,
      spelling: result.spelling.confidence,
      purpose_audience_effect: result.purpose_audience_effect.confidence,
    },
    evidence_citations: {
      composition: [result.composition.evidence_citation],
      vocabulary: [result.vocabulary.evidence_citation],
      grammar: [result.grammar.evidence_citation],
      punctuation: [result.punctuation.evidence_citation],
      spelling: [result.spelling.evidence_citation],
      purpose_audience_effect: [result.purpose_audience_effect.evidence_citation],
    },
    flags: { low_confidence_dims: result.low_confidence_flags },
    raw_ai_response: result.raw_ai_response,
    model_used: 'gpt-4o',
    assessed_at: new Date().toISOString(),
  })

  return result
}
