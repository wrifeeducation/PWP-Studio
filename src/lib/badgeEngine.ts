/**
 * WF-010: Badge Engine — evaluates badge trigger conditions.
 * Pure functions only; DB writes happen in the calling hook.
 */

import type { Badge, MasteryTracking, PupilProgress } from '../types/index'

// ─── Badge trigger context ────────────────────────────────────────────────────

export interface BadgeEvalContext {
  /** Pupil progress row */
  progress: PupilProgress
  /** Existing (pre-session) mastery tracking row */
  mastery: MasteryTracking | null
  /** Updated mastery row (post-session computation) */
  updatedMastery: Pick<MasteryTracking, 'gate_passed' | 'fast_track_eligible'>
  /** Number of paragraph sessions completed by this pupil on the current level */
  paragraphSessionCount: number
  /** Last 5 paragraph composite scores, for consecutive streak check */
  recentParagraphScores: number[]
  /** Whether this is the first formula session the pupil has ever submitted */
  isFirstFormulaSession: boolean
  /** Whether this is the first paragraph session the pupil has ever submitted */
  isFirstParagraphSession: boolean
  /** Badges already earned by this pupil (to prevent duplicates) */
  earnedBadgeIds: string[]
  /** All available badge definitions from the `badges` table */
  allBadges: Badge[]
  // Writing Studio context (WF-018)
  /** Whether this is the pupil's first writing submission */
  isFirstWritingSubmission?: boolean
  /** Overall band from AI assessment (0-3) */
  writingOverallBand?: number
}

// ─── Known badge trigger_type values ─────────────────────────────────────────

const TRIGGER = {
  FIRST_SENTENCE: 'first_sentence',
  MASTERY_GATE: 'mastery_gate',
  STREAK_3: 'streak_3',
  STREAK_7: 'streak_7',
  STREAK_14: 'streak_14',
  STREAK_30: 'streak_30',
  LEVEL_10: 'level_10',
  LEVEL_20: 'level_20',
  LEVEL_30: 'level_30',
  PARAGRAPH_FIRST: 'paragraph_first',
  PARAGRAPH_MASTERY: 'paragraph_mastery',
  WRITING_STUDIO_UNLOCK: 'writing_studio_unlock',
  // WF-018 Writing Studio triggers
  WRITING_FIRST_SUBMISSION: 'writing_first_submission',
  WRITING_FIRST_BAND2: 'writing_first_band2',
  WRITING_FIRST_BAND3: 'writing_first_band3',
} as const

// ─── Condition evaluators ─────────────────────────────────────────────────────

const CONDITIONS: Record<string, (ctx: BadgeEvalContext) => boolean> = {
  [TRIGGER.FIRST_SENTENCE]: (ctx) => ctx.isFirstFormulaSession,

  [TRIGGER.MASTERY_GATE]: (ctx) =>
    ctx.updatedMastery.gate_passed && !(ctx.mastery?.gate_passed ?? false),

  [TRIGGER.STREAK_3]: (ctx) => ctx.progress.current_streak >= 3,
  [TRIGGER.STREAK_7]: (ctx) => ctx.progress.current_streak >= 7,
  [TRIGGER.STREAK_14]: (ctx) => ctx.progress.current_streak >= 14,
  [TRIGGER.STREAK_30]: (ctx) => ctx.progress.current_streak >= 30,

  [TRIGGER.LEVEL_10]: (ctx) => ctx.progress.current_formula_level >= 10,
  [TRIGGER.LEVEL_20]: (ctx) => ctx.progress.current_formula_level >= 20,
  [TRIGGER.LEVEL_30]: (ctx) => ctx.progress.current_formula_level >= 30,

  [TRIGGER.PARAGRAPH_FIRST]: (ctx) => ctx.isFirstParagraphSession,

  [TRIGGER.PARAGRAPH_MASTERY]: (ctx) => {
    // 5 consecutive paragraph sessions with composite >= 80
    const recent = ctx.recentParagraphScores
    if (recent.length < 5) return false
    return recent.slice(-5).every((s) => s >= 80)
  },

  [TRIGGER.WRITING_STUDIO_UNLOCK]: (ctx) => ctx.progress.writing_studio_unlocked,

  // WF-018 Writing Studio badge triggers
  [TRIGGER.WRITING_FIRST_SUBMISSION]: (ctx) => ctx.isFirstWritingSubmission === true,
  [TRIGGER.WRITING_FIRST_BAND2]: (ctx) => (ctx.writingOverallBand ?? -1) >= 2,
  [TRIGGER.WRITING_FIRST_BAND3]: (ctx) => (ctx.writingOverallBand ?? -1) >= 3,
}

// ─── Main evaluator ───────────────────────────────────────────────────────────

/**
 * Evaluates all badge trigger conditions and returns the array of Badge objects
 * that should be newly awarded.
 *
 * Does NOT insert into DB — caller must do that.
 */
export const evaluateBadges = (ctx: BadgeEvalContext): Badge[] => {
  const newBadges: Badge[] = []

  for (const badge of ctx.allBadges) {
    // Skip already-earned badges
    if (ctx.earnedBadgeIds.includes(badge.id)) continue

    const condition = CONDITIONS[badge.trigger_type]
    if (!condition) continue // unknown trigger — skip

    if (condition(ctx)) {
      newBadges.push(badge)
    }
  }

  return newBadges
}
