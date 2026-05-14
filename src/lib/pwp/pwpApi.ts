/**
 * PWP API — wrappers for all five PWP Edge Functions.
 * All AI calls route through Supabase Edge Functions (never browser-direct).
 */

import { supabase } from '../supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChainStep {
  elementId: string
  code: string
  formulaLabel: string
  description: string
  sortOrder: number
  example: string
}

export interface GenerateChainResponse {
  chain: ChainStep[]
  source: 'auto' | 'custom'
  highestLesson: number
}

// ── Formula-aware assessment result (PWP_Assessment_Feedback_Prompt.md §1) ──

export type ErrorType =
  | 'missing_element'
  | 'wrong_order'
  | 'wrong_tense'
  | 'wrong_subject_type'
  | 'wrong_determiner'
  | 'extra_element'
  | 'incomplete_sentence'
  | 'wrong_word_class'

export interface AssessmentResult {
  is_correct:           boolean
  error_type:           ErrorType | null
  error_word:           string | null
  error_position:       number | null
  formula_position:     number | null
  expected_word_class:  string | null
  found_word_class:     string | null
  correction_hint:      string | null
  tense_found:          string | null
  tense_required:       string | null
  /** Grammar insight shown on correct answer (from pwp_steps.grammar_insight) */
  grammar_insight?:     string | null
}

export interface AssessStepResponse {
  passed: boolean
  feedback: string
  suggestedRevision: string | null
  confidence: number
  /** Present when the Edge Function returns formula-aware results */
  assessment?: AssessmentResult
}

export interface AssessParagraphCloseResponse {
  passed: boolean
  feedback: string
  suggestedRevision: string | null
  complexity_notes: string
}

export interface QuizPrompt {
  id: string
  instruction: string
  elementCodes: string[]
}

export interface GenerateQuizResponse {
  prompts: QuizPrompt[]
}

export interface QuizPromptResponse extends QuizPrompt {
  pupilSentence: string
}

export interface SinglePromptResult {
  id: string
  passed: boolean
  feedback: string
}

export interface AssessQuizResponse {
  responses: SinglePromptResult[]
  overallPassed: boolean
  summary: string
  readyForNextElement: boolean
}

export interface SuggestSubjectsResponse {
  suggestions: string[]
}

// ─── EF1: Generate formula chain ─────────────────────────────────────────────

export async function generateChain(
  pupilId: string,
  highestLesson: number,
  customElementIds?: string[]
): Promise<GenerateChainResponse> {
  const { data, error } = await supabase.functions.invoke<GenerateChainResponse>(
    'pwp-generate-chain',
    { body: { pupilId, highestLesson, customElementIds } }
  )
  if (error || !data) throw new Error(error?.message ?? 'Failed to generate formula chain')
  return data
}

// ─── EF2: Assess formula step ─────────────────────────────────────────────────

export async function assessStep(params: {
  sentence: string
  formulaLabel: string
  elementCode: string
  previousSentence?: string
  /** @deprecated — subjectNoun is no longer used; pass subject_type instead */
  subjectNoun?: string
  subject_type?: 'proper_noun' | 'det_noun' | 'pronoun'
  tense?: 'past' | 'present' | 'continuous' | 'any'
  step_type?: 'new_element' | 'consolidation' | 'tense_variety' | 'transition'
  attemptNumber?: number
  genreHint?: string
}): Promise<AssessStepResponse> {
  const { data, error } = await supabase.functions.invoke<AssessStepResponse>(
    'pwp-assess-step',
    { body: params }
  )
  if (error || !data) throw new Error(error?.message ?? 'Step assessment unavailable')
  return data
}

// ─── EF3: Assess paragraph close ─────────────────────────────────────────────

export async function assessParagraphClose(params: {
  leadSentence: string
  supportSentences: string[]
  closeSentence: string
  scaffoldMode?: boolean
  genreHint?: string
}): Promise<AssessParagraphCloseResponse> {
  const { data, error } = await supabase.functions.invoke<AssessParagraphCloseResponse>(
    'pwp-assess-paragraph-close',
    { body: params }
  )
  if (error || !data) throw new Error(error?.message ?? 'Paragraph assessment unavailable')
  return data
}

// ─── EF4: Generate mastery quiz ───────────────────────────────────────────────

export async function generateQuiz(params: {
  elementCodes: string[]
  highestLesson: number
  sessionSubjectNoun?: string
}): Promise<GenerateQuizResponse> {
  const { data, error } = await supabase.functions.invoke<GenerateQuizResponse>(
    'pwp-generate-quiz',
    { body: params }
  )
  if (error || !data) throw new Error(error?.message ?? 'Quiz generation unavailable')
  return data
}

// ─── EF6: Suggest subject nouns ───────────────────────────────────────────────

export async function suggestSubjects(params: {
  pupilId: string
  themeNoun: string
  genreHint?: string
}): Promise<SuggestSubjectsResponse> {
  const { data, error } = await supabase.functions.invoke<SuggestSubjectsResponse>(
    'pwp-suggest-subjects',
    { body: params }
  )
  if (error || !data) return { suggestions: [] }
  return data
}

// ─── EF5: Assess quiz responses ───────────────────────────────────────────────

export async function assessQuiz(params: {
  prompts: QuizPromptResponse[]
  highestLesson: number
}): Promise<AssessQuizResponse> {
  const { data, error } = await supabase.functions.invoke<AssessQuizResponse>(
    'pwp-assess-quiz',
    { body: params }
  )
  if (error || !data) throw new Error(error?.message ?? 'Quiz assessment unavailable')
  return data
}
