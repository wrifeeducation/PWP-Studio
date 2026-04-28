/**
 * WF-008: Mastery Tracking — pure functions, no side effects.
 * All DB writes happen in the calling hook; this file only computes.
 */

import type { MasteryTracking, Nullable } from '../types/index'

// ─── constants ────────────────────────────────────────────────────────────────

const GATE_THRESHOLD = 80
const GATE_WINDOW = 5
const FAST_TRACK_THRESHOLD = 95
const FAST_TRACK_WINDOW = 3
const CONSOLIDATION_THRESHOLD = 60
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

  // Rolling average over last 5
  const windowAvg = rollingAverage(allScores, GATE_WINDOW)

  // Gate: 5 consecutive sessions all ≥ 80
  const gatePassed =
    (existing?.gate_passed ?? false) ||
    allAboveThreshold(allScores, GATE_WINDOW, GATE_THRESHOLD)

  const gatePassed_at = gatePassed && !(existing?.gate_passed ?? false)
    ? new Date().toISOString()
    : (existing?.gate_passed_at ?? null)

  // Fast track: average > 95 over last 3 sessions
  const fastTrackEligible =
    (existing?.fast_track_eligible ?? false) ||
    allAboveThreshold(allScores, FAST_TRACK_WINDOW, FAST_TRACK_THRESHOLD)

  // Consolidation: average < 60
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

/** Convenience: upsert mastery after a session — returns computed update */
export const buildMasteryUpsert = (
  pupilId: string,
  levelId: number,
  existing: Partial<MasteryTracking> | null,
  newScore: number
): Omit<MasteryTracking, 'id' | 'created_at' | 'updated_at'> => {
  const update = computeMasteryUpdate(existing, newScore)
  return {
    pupil_id: pupilId as import('../types/index').UUID,
    level_id: levelId,
    ...update,
    // Phase 1: scaffold defaults (preserve existing if present)
    scaffold_stage: existing?.scaffold_stage ?? 1,
    scaffold_advanced_at: existing?.scaffold_advanced_at ?? null,
    weak_word_class: existing?.weak_word_class ?? null,
    ai_mastery_check: existing?.ai_mastery_check ?? null,
  }
}
