/**
 * WF-013: Progression Engine — pure functions for level advancement.
 * No side effects; all DB writes happen in the calling hook.
 */

import type { MasteryTracking } from '../types/index'

// ─── constants ────────────────────────────────────────────────────────────────

const MAX_LEVEL = 67
const PARAGRAPH_UNLOCK_LEVEL = 8
const WRITING_STUDIO_UNLOCK_LEVEL = 35

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true if the mastery gate has been passed (trigger advancement).
 */
export const shouldAdvance = (mastery: Pick<MasteryTracking, 'gate_passed' | 'consolidation_required'>): boolean => {
  return mastery.gate_passed && !mastery.consolidation_required
}

/**
 * Compute the next level number, respecting fast-track and max level.
 *
 * - Normal: increment by 1
 * - Fast-track: increment by 2
 * - Never exceed MAX_LEVEL
 */
export const nextLevel = (
  currentLevel: number,
  mastery: Pick<MasteryTracking, 'fast_track_eligible'>
): number => {
  const increment = mastery.fast_track_eligible ? 2 : 1
  return Math.min(currentLevel + increment, MAX_LEVEL)
}

/**
 * Returns true if the paragraph builder is unlocked at this level.
 */
export const isParagraphUnlocked = (level: number): boolean => {
  return level >= PARAGRAPH_UNLOCK_LEVEL
}

/**
 * Returns true if Writing Studio should be unlocked.
 * Requires either teacher assignment OR reaching the unlock level.
 */
export const isWritingStudioUnlocked = (
  level: number,
  teacherAssigned: boolean
): boolean => {
  return teacherAssigned || level >= WRITING_STUDIO_UNLOCK_LEVEL
}

/**
 * Returns true if transitioning from `oldLevel` to `newLevel` crosses
 * the paragraph unlock boundary (L7 → L8).
 */
export const didUnlockParagraph = (oldLevel: number, newLevel: number): boolean => {
  return oldLevel < PARAGRAPH_UNLOCK_LEVEL && newLevel >= PARAGRAPH_UNLOCK_LEVEL
}

/**
 * Returns a composite score from formula + paragraph scores.
 * For levels before paragraph_active: composite = formula score.
 * For L8+: composite = formula × 0.7 + paragraph × 0.3
 */
export const calcCompositeScore = (
  formulaScore: number,
  paragraphScore: number | null,
  paragraphActive: boolean
): number => {
  if (!paragraphActive || paragraphScore === null) {
    return formulaScore
  }
  return Math.round(formulaScore * 0.7 + paragraphScore * 0.3)
}
