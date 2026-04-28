/**
 * WF-013: Progression Engine — pure functions for level advancement.
 * No side effects; all DB writes happen in the calling hook.
 */

import type { MasteryTracking } from '../types/index'

// ─── constants ────────────────────────────────────────────────────────────────

const MAX_LEVEL = 67
// Phase 1: structural gate at L4 (mastery criteria are the real lock — see §4.2)
const PARAGRAPH_UNLOCK_LEVEL = 4
const WRITING_STUDIO_UNLOCK_LEVEL = 35
// Minimum levels mastered before Paragraph Builder can unlock (Criterion C)
const PARAGRAPH_MIN_LEVELS_MASTERED = 2

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
 * Returns true if the structural paragraph gate is open (level ≥ L4).
 * The full mastery-based unlock also requires gate_passed + levels_mastered_count ≥ 2.
 * Use checkParagraphMasteryUnlock() for the complete check.
 */
export const isParagraphUnlocked = (level: number): boolean => {
  return level >= PARAGRAPH_UNLOCK_LEVEL
}

/**
 * Full mastery-based Paragraph Builder unlock check (§4.2):
 *   A) Structural richness: level ≥ 4 (paragraph_active = true in DB)
 *   B) Formula mastery: gate_passed on current level
 *   C) Pattern variety: ≥ 2 levels mastered in total
 */
export const checkParagraphMasteryUnlock = (
  currentLevel: number,
  gatePassed: boolean,
  levelsMasteredCount: number
): boolean => {
  return (
    currentLevel >= PARAGRAPH_UNLOCK_LEVEL &&
    gatePassed &&
    levelsMasteredCount >= PARAGRAPH_MIN_LEVELS_MASTERED
  )
}

/**
 * Returns true if Writing Studio should be unlocked.
 * Requires either teacher confirmation OR reaching the structural unlock level.
 */
export const isWritingStudioUnlocked = (
  level: number,
  teacherConfirmed: boolean
): boolean => {
  return teacherConfirmed || level >= WRITING_STUDIO_UNLOCK_LEVEL
}

/**
 * Returns true if transitioning from oldLevel to newLevel crosses
 * the paragraph structural gate (L3 → L4).
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
