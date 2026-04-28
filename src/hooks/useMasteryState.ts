/**
 * Phase 2: useMasteryState
 * Fetches mastery_tracking for the pupil's current formula level and
 * exposes scaffold stage, session count, stuck status, and gate pass.
 *
 * Used by FormulaPage to determine which scaffold configuration to show
 * and whether to trigger teacher notifications.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { MasteryTracking } from '../types/index'

// A pupil is "stuck" if they have this many sessions on a level without passing the gate
const STUCK_SESSION_THRESHOLD = 12

export interface MasteryState {
  /** Current scaffold stage for this pupil on this level (1–4) */
  scaffoldStage: number
  /** Total sessions completed on this level */
  sessionsOnLevel: number
  /** True once the mastery gate has been passed */
  gatePassed: boolean
  /** True if pupil is eligible for fast-track advancement */
  fastTrackEligible: boolean
  /** True if consolidation sessions are required */
  consolidationRequired: boolean
  /** True when sessions > STUCK threshold without gate pass */
  isStuck: boolean
  /** The raw mastery_tracking row, or null if none exists yet */
  raw: MasteryTracking | null
  isLoading: boolean
  isError: boolean
}

export const useMasteryState = (
  pupilId: string | undefined,
  levelId: number | undefined
): MasteryState => {
  const { data, isLoading, isError } = useQuery<MasteryTracking | null>({
    queryKey: ['mastery_tracking', pupilId, levelId],
    queryFn: async () => {
      if (!pupilId || !levelId) return null
      const { data: row, error } = await supabase
        .from('mastery_tracking')
        .select('*')
        .eq('pupil_id', pupilId)
        .eq('level_id', levelId)
        .maybeSingle()
      if (error) throw error
      return row as MasteryTracking | null
    },
    enabled: !!pupilId && !!levelId,
    staleTime: 1000 * 30,
  })

  const raw = data ?? null
  const scaffoldStage = raw?.scaffold_stage ?? 1
  const sessionsOnLevel = raw?.sessions_completed ?? 0
  const gatePassed = raw?.gate_passed ?? false
  const fastTrackEligible = raw?.fast_track_eligible ?? false
  const consolidationRequired = raw?.consolidation_required ?? false
  const isStuck = !gatePassed && sessionsOnLevel >= STUCK_SESSION_THRESHOLD

  return {
    scaffoldStage,
    sessionsOnLevel,
    gatePassed,
    fastTrackEligible,
    consolidationRequired,
    isStuck,
    raw,
    isLoading,
    isError,
  }
}
