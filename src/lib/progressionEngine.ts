/**
 * WF-013: Progression Engine — pure functions for level advancement.
 * No side effects; all DB writes happen in the calling hook.
 */

import type { MasteryTracking } from '../types/index'

// ─── constants ────────────────────────────────────────────────────────────────

const MAX_LEVEL = 67
// Phase 1: structural gate at L4
const PARAGRAPH_UNLOCK_LEVEL = 4
const WRITING_STUDIO_UNLOCK_LEVEL = 35

/**
 * Progressive Depth model (Phase A):
 * Pupils auto-advance after completing this many sessions at a level,
 * regardless of score. No score gate — forward momentum is always maintained.
 * Mastery scores are tracked silently for teacher insight only.
 */
export const MIN_SESSIONS_TO_ADVANCE = 3

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Progressive Depth model: advance after MIN_SESSIONS_TO_ADVANCE sessions,
 * regardless of score. No gate — pupils always move forward after enough practice.
 * The consolidation_required flag is surfaced to teachers but never blocks progression.
 */
export const shouldAdvance = (mastery: Pick<MasteryTracking, 'sessions_completed'>): boolean => {
  return (mastery.sessions_completed ?? 0) >= MIN_SESSIONS_TO_ADVANCE
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
 * Paragraph Builder unlock check:
 * Unlocks automatically when a pupil reaches L4+ — no score gate required.
 * The structural level progression ensures readiness by the time they arrive here.
 */
export const checkParagraphMasteryUnlock = (
  currentLevel: number,
  _gatePassed: boolean,
  _levelsMasteredCount: number
): boolean => {
  return currentLevel >= PARAGRAPH_UNLOCK_LEVEL
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
