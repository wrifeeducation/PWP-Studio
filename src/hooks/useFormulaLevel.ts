/**
 * WF-004: Formula Level Loader
 * Fetches pupil's current formula_level from pupil_progress,
 * loads the matching row from formula_levels, and picks
 * today's subject deterministically from subject_rotation_bank.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { FormulaLevel, PupilProgress } from '../types/index'

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Returns a consistent day-of-week index (0–6) for the current date in UTC
 * so every pupil sees the same subject on the same calendar day.
 */
export const getDailySubjectIndex = (bank: string[]): number => {
  if (!bank.length) return 0
  const now = new Date()
  const dayOfYear =
    Math.floor(
      (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
        Date.UTC(now.getUTCFullYear(), 0, 0)) /
        86_400_000
    )
  return dayOfYear % bank.length
}

export const getTodaysSubject = (bank: string[]): string | null => {
  if (!bank.length) return null
  return bank[getDailySubjectIndex(bank)]
}

// ─── hook ───────────────────────────────────────────────────────────────────

interface FormulaLevelData {
  level: FormulaLevel
  todaysSubject: string | null
  progress: PupilProgress
}

/**
 * Loads a formula level for a pupil.
 *
 * @param overrideLevelId — when provided, load this specific level instead of
 *   the pupil's current_formula_level. Used for the Level Library / review mode
 *   so pupils can revisit any completed level without it affecting progression.
 */
export const useFormulaLevel = (overrideLevelId?: number) => {
  const { user } = useAuthStore()
  const pupilId = user?.id ?? null

  // Step 1: always fetch pupil_progress (needed for XP, streak, and progression)
  const progressQuery = useQuery({
    queryKey: ['pupil_progress', pupilId],
    queryFn: async (): Promise<PupilProgress> => {
      if (!pupilId) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('pupil_progress')
        .select('*')
        .eq('pupil_id', pupilId)
        .single()
      if (error) throw error
      return data as PupilProgress
    },
    enabled: !!pupilId,
    staleTime: 1000 * 60 * 5,
  })

  // Step 2: determine which level to load — override takes priority
  const levelId = overrideLevelId ?? progressQuery.data?.current_formula_level ?? 1

  // Step 3: fetch the formula_levels row
  const levelQuery = useQuery({
    queryKey: ['formula_level', levelId],
    queryFn: async (): Promise<FormulaLevel> => {
      const { data, error } = await supabase
        .from('formula_levels')
        .select('*')
        .eq('id', levelId)
        .single()
      if (error) throw error
      return data as FormulaLevel
    },
    // When overriding, we don't need to wait for progressQuery to succeed
    enabled: overrideLevelId ? true : progressQuery.isSuccess,
    staleTime: 1000 * 60 * 30, // formula definitions rarely change
  })

  const level = levelQuery.data
  const progress = progressQuery.data

  const result: FormulaLevelData | null =
    level && progress
      ? {
          level,
          progress,
          todaysSubject: getTodaysSubject(level.subject_rotation_bank ?? []),
        }
      : null

  return {
    data: result,
    isLoading: progressQuery.isLoading || levelQuery.isLoading,
    isError: progressQuery.isError || levelQuery.isError,
    error: progressQuery.error ?? levelQuery.error,
    refetch: () => {
      progressQuery.refetch()
      levelQuery.refetch()
    },
  }
}
