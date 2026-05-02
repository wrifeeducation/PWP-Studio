/**
 * useSessionContent — Phase 3 (WF-Phase3)
 *
 * Fetches a session-specific content payload from the `generate-session-content`
 * Edge Function. The result is memoised for the lifetime of the component
 * (refetch only happens when level or pupil changes).
 *
 * Returns:
 *   subject           — the chosen subject for this session
 *   contextSentence   — AI-generated model sentence (may be null if AI unavailable)
 *   wordBankSubset    — curated word bank (override for level.word_banks)
 *   distractorWords   — wrong-class distractors for stage 3+ (may be empty)
 *   isLoading         — true while fetching
 *   isError           — true if the call failed
 *   fallback          — true if using level defaults (Edge Function unavailable)
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface SessionContent {
  subject: string
  contextSentence: string | null
  wordBankSubset: Record<string, string[]>
  distractorWords: Record<string, string[]>
  fallback: boolean
}

interface UseSessionContentParams {
  pupilId: string | null
  levelId: number | undefined
  scaffoldStage?: number
  /** Fallback word_banks from formula_levels (used when Edge Function unavailable) */
  fallbackWordBanks?: Record<string, string[]>
  /** Fallback subject (from getDailySubjectIndex) */
  fallbackSubject?: string | null
}

export function useSessionContent({
  pupilId,
  levelId,
  scaffoldStage = 1,
  fallbackWordBanks,
  fallbackSubject,
}: UseSessionContentParams) {
  const query = useQuery({
    queryKey: ['session-content', pupilId, levelId, scaffoldStage],
    queryFn: async (): Promise<SessionContent> => {
      const { data, error } = await supabase.functions.invoke<{
        subject: string
        context_sentence: string | null
        word_bank_subset: Record<string, string[]>
        distractor_words: Record<string, string[]>
      }>('generate-session-content', {
        body: {
          pupil_id: pupilId,
          level_id: levelId,
          scaffold_stage: scaffoldStage,
        },
      })

      if (error || !data) {
        throw new Error(error?.message ?? 'Session content fetch failed')
      }

      return {
        subject: data.subject,
        contextSentence: data.context_sentence,
        wordBankSubset: data.word_bank_subset,
        distractorWords: data.distractor_words,
        fallback: false,
      }
    },
    enabled: !!pupilId && !!levelId,
    // Cache for the session duration — don't refetch until level changes
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60,
    // On failure, fall back to level defaults immediately (don't block pupil)
    retry: 1,
    retryDelay: 2000,
  })

  // Construct fallback content from level defaults when Edge Function is unavailable
  const fallbackContent: SessionContent | null =
    fallbackWordBanks && fallbackSubject != null
      ? {
          subject: fallbackSubject ?? '',
          contextSentence: null,
          wordBankSubset: fallbackWordBanks,
          distractorWords: {},
          fallback: true,
        }
      : null

  const content = query.data ?? fallbackContent

  return {
    content,
    isLoading: query.isLoading && !fallbackContent,
    isError: query.isError && !fallbackContent,
  }
}
