/**
 * WF-008: Mastery Tracking — pure functions, no side effects.
 * All DB writes happen in the calling hook; this file only computes.
 */

import type { MasteryTracking, Nullable } from '../types/index'

// ─── constants ────────────────────────────────────────────────────────────────

const GATE_THRESHOLD = 70      // rolling average required to pass the level gate
const GATE_WINDOW = 3          // number of sessions in the rolling window
const FAST_TRACK_THRESHOLD = 95
const FAST_TRACK_WINDOW = 3
const CONSOLIDATION_THRESHOLD = 50  // flag for extra help if average falls below this
const MAX_SESSIONS = 7

// ─── types ────────────────────────────────────────────────────────────────────

export interface MasteryUpdate {
  session_1_score: Nullable<number>
  session_2_score: Nullable<number>
  session_3_score: Nullable<number>
  session_4_score: Nullable<number>
  session_5_score: Nullable<number>
  session_6_score: Nullable<number>
  session_7_score: Nullable<number>
  sessions_completed: number
  current_window_average: Nullable<number>
  gate_passed: boolean
  gate_passed_at: Nullable<string>
  fast_track_eligible: boolean
  consolidation_required: boolean
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Extract all non-null scores from a MasteryTracking row in order */
export const extractScores = (tracking: Partial<MasteryTracking>): number[] => {
  const slots: Array<keyof MasteryTracking> = [
    'session_1_score',
    'session_2_score',
    'session_3_score',
    'session_4_score',
    'session_5_score',
    'session_6_score',
    'session_7_score',
  ]
  return slots
    .map((k) => tracking[k] as Nullable<number>)
    .filter((v): v is number => v !== null && v !== undefined)
}

/** Compute rolling average of the last N scores */
export const rollingAverage = (scores: number[], windowSize: number): Nullable<number> => {
  if (!scores.length) return null
  const window = scores.slice(-windowSize)
  return Math.round(window.reduce((a, b) => a + b, 0) / window.length)
}

/**
 * Returns true if the last `windowSize` scores all meet or exceed `threshold`.
 */
export const allAboveThreshold = (
  scores: number[],
  windowSize: number,
  threshold: number
): boolean => {
  if (scores.length < windowSize) return false
  return scores.slice(-windowSize).every((s) => s >= threshold)
}

// ─── main: compute the updated mastery state after adding a new score ─────────

export const computeMasteryUpdate = (
  existing: Partial<MasteryTracking> | null,
  newScore: number
): MasteryUpdate => {
  // Slot names in order
  const slotKeys = [
    'session_1_score',
    'session_2_score',
    'session_3_score',
    'session_4_score',
    'session_5_score',
    'session_6_score',
    'session_7_score',
  ] as const

  // Extract current scores
  const currentScores = existing ? extractScores(existing) : []

  // Append new score (cap at MAX_SESSIONS — overwrite oldest if full)
  const allScores = [...currentScores, newScore].slice(-MAX_SESSIONS)

  // Build the new slot map
  const slotValues: Record<string, Nullable<number>> = {}
  for (let i = 0; i < MAX_SESSIONS; i++) {
    slotValues[slotKeys[i]] = i < allScores.length ? allScores[i] : null
  }

  const sessionsCompleted = allScores.length

  // Rolling average over last 3
  const windowAvg = rollingAverage(allScores, GATE_WINDOW)

  // Gate: rolling 3-session average ≥ 70 (achievable for learners, ensures real progress)
  const gatePassed =
    (existing?.gate_passed ?? false) ||
    (allScores.length >= GATE_WINDOW && (windowAvg ?? 0) >= GATE_THRESHOLD)

  const gatePassed_at = gatePassed && !(existing?.gate_passed ?? false)
    ? new Date().toISOString()
    : (existing?.gate_passed_at ?? null)

  // Fast track: average > 95 over last 3 sessions
  const fastTrackEligible =
    (existing?.fast_track_eligible ?? false) ||
    allAboveThreshold(allScores, FAST_TRACK_WINDOW, FAST_TRACK_THRESHOLD)

  // Consolidation: rolling average < 50 (signals pupil needs extra support)
  const consolidationRequired =
    windowAvg !== null && windowAvg < CONSOLIDATION_THRESHOLD

  return {
    session_1_score: slotValues['session_1_score'] as Nullable<number>,
    session_2_score: slotValues['session_2_score'] as Nullable<number>,
    session_3_score: slotValues['session_3_score'] as Nullable<number>,
    session_4_score: slotValues['session_4_score'] as Nullable<number>,
    session_5_score: slotValues['session_5_score'] as Nullable<number>,
    session_6_score: slotValues['session_6_score'] as Nullable<number>,
    session_7_score: slotValues['session_7_score'] as Nullable<number>,
    sessions_completed: sessionsCompleted,
    current_window_average: windowAvg,
    gate_passed: gatePassed,
    gate_passed_at: gatePassed_at,
    fast_track_eligible: fastTrackEligible,
    consolidation_required: consolidationRequired,
  }
}

// ─── scaffold stage advancement ───────────────────────────────────────────────

/**
 * Stage thresholds per the adaptive progression plan (§3.1):
 *   Stage 1 → 2: No gate — all pupils complete 3 sessions at Stage 1
 *   Stage 2 → 3: ≥75% on 2 of the last 3 sessions
 *   Stage 3 → 4: ≥85% on 2 consecutive sessions
 *
 * Returns the new scaffold stage (1–4). Never regresses.
 */
export const computeNextScaffoldStage = (
  currentStage: number,
  allScores: number[]
): number => {
  if (currentStage >= 4) return 4

  if (currentStage === 1) {
    // Auto-advance after 3 sessions
    return allScores.length >= 3 ? 2 : 1
  }

  if (currentStage === 2) {
    // ≥75% on 2 of last 3
    const last3 = allScores.slice(-3)
    const passing = last3.filter((s) => s >= 75).length
    return passing >= 2 ? 3 : 2
  }

  if (currentStage === 3) {
    // ≥85% on 2 consecutive
    if (allScores.length < 2) return 3
    const last2 = allScores.slice(-2)
    return last2.every((s) => s >= 85) ? 4 : 3
  }

  return currentStage
}

/**
 * Accelerated stage jump: if pupil scores ≥90% on 3 consecutive sessions
 * at Stage 2 or 3, skip ahead one additional stage.
 */
export const checkFastStageJump = (
  newStage: number,
  allScores: number[]
): number => {
  if (newStage < 2 || newStage > 3) return newStage
  const last3 = allScores.slice(-3)
  if (last3.length === 3 && last3.every((s) => s >= 90)) {
    return Math.min(newStage + 1, 4)
  }
  return newStage
}

/** Convenience: upsert mastery after a session — returns computed update */
export const buildMasteryUpsert = (
  pupilId: string,
  levelId: number,
  existing: Partial<MasteryTracking> | null,
  newScore: number
): Omit<MasteryTracking, 'id' | 'created_at' | 'updated_at'> => {
  const update = computeMasteryUpdate(existing, newScore)

  // Compute updated scaffold stage
  const allScores = [
    ...([1, 2, 3, 4, 5, 6, 7] as const)
      .map((n) => (existing as Record<string, unknown> | null)?.[`session_${n}_score`] as number | null | undefined)
      .filter((v): v is number => v != null),
    newScore,
  ]
  const prevStage = existing?.scaffold_stage ?? 1
  let nextStage = computeNextScaffoldStage(prevStage, allScores)
  nextStage = checkFastStageJump(nextStage, allScores)

  // Record when each stage was first reached
  const scaffoldAdvancedAt: Record<string, string> = {
    ...(existing?.scaffold_advanced_at as Record<string, string> | null ?? {}),
  }
  if (nextStage > prevStage) {
    scaffoldAdvancedAt[String(nextStage)] = new Date().toISOString()
  }

  return {
    pupil_id: pupilId as import('../types/index').UUID,
    level_id: levelId,
    ...update,
    scaffold_stage: nextStage,
    scaffold_advanced_at: scaffoldAdvancedAt,
    weak_word_class: existing?.weak_word_class ?? null,
    ai_mastery_check: existing?.ai_mastery_check ?? null,
  }
}
