/**
 * WF-009: XP Engine — pure functions, no side effects.
 * All DB writes happen in the calling hook; this file only computes.
 */

// ─── constants ────────────────────────────────────────────────────────────────

const BASE_XP_PER_LEVEL = 10
const HIGH_SCORE_MULTIPLIER = 1.5 // 80+ formula score
const PARAGRAPH_BASE = 50
const STREAK_BONUS_BASE = 5
const MAX_STREAK_BONUS = 50

// ─── XP calculations ─────────────────────────────────────────────────────────

/**
 * Calculate XP earned from a formula session.
 * Base = 10 × levelId. If score ≥ 80, add 50% bonus.
 */
export const calcFormulaXP = (levelId: number, score: number): number => {
  const base = BASE_XP_PER_LEVEL * levelId
  const bonus = score >= 80 ? Math.round(base * (HIGH_SCORE_MULTIPLIER - 1)) : 0
  return base + bonus
}

/**
 * Calculate XP earned from a paragraph session.
 * 70% weight on formula, 30% on paragraph composite score.
 */
export const calcParagraphXP = (compositeScore: number): number => {
  // Composite score is 0-100; scale to a base of 50 for paragraphs
  return Math.max(10, Math.round((compositeScore / 100) * PARAGRAPH_BASE * 2))
}

/**
 * Streak bonus XP: 5 XP per streak day, capped at 50.
 */
export const calcStreakBonus = (currentStreak: number): number => {
  if (currentStreak <= 0) return 0
  return Math.min(STREAK_BONUS_BASE * currentStreak, MAX_STREAK_BONUS)
}

// ─── Streak logic ─────────────────────────────────────────────────────────────

/**
 * Returns true if today advances the streak (next school day after last session).
 * School days = Mon–Fri only.
 */
export const shouldAdvanceStreak = (lastSessionDate: string | null): boolean => {
  if (!lastSessionDate) return true // first session ever

  const today = new Date()
  const last = new Date(lastSessionDate)

  // Normalise to midnight UTC
  today.setUTCHours(0, 0, 0, 0)
  last.setUTCHours(0, 0, 0, 0)

  if (today <= last) return false // same day or past

  // Walk forward from last session — count school days
  const cursor = new Date(last)
  cursor.setUTCDate(cursor.getUTCDate() + 1) // next calendar day

  // Skip weekends between last session and today
  while (cursor < today) {
    const day = cursor.getUTCDay()
    if (day !== 0 && day !== 6) {
      // There's a school day between last session and today — would break streak
      return false
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  // Today itself must be a school day (Mon–Fri)
  const todayDay = today.getUTCDay()
  return todayDay !== 0 && todayDay !== 6
}

// ─── Writing Studio XP (WF-018) ──────────────────────────────────────────────

/**
 * Calculate XP earned from a Writing Studio submission.
 * Base = 200 XP. +100 if overall_band >= 2 (Expected). +200 if band = 3 (Greater Depth).
 */
export const calcWritingXP = (overallBand: number): number => {
  let xp = 200
  if (overallBand >= 2) xp += 100
  if (overallBand >= 3) xp += 200
  return xp
}

// ─── Double XP (WF-035) ───────────────────────────────────────────────────────

/**
 * Doubles XP if current time is before doubleXpUntil timestamp.
 * @param baseXP - The base XP amount to potentially double
 * @param doubleXpUntil - ISO timestamp string, or null if no active double XP
 */
export const applyDoubleXP = (baseXP: number, doubleXpUntil: string | null): number => {
  if (!doubleXpUntil) return baseXP
  const until = new Date(doubleXpUntil)
  const now = new Date()
  if (now < until) return baseXP * 2
  return baseXP
}

/**
 * Returns true if the streak should break (missed a school day, no shield).
 */
export const shouldBreakStreak = (
  lastSessionDate: string | null,
  shieldActive: boolean
): boolean => {
  if (!lastSessionDate) return false // no streak to break
  if (shieldActive) return false // shield absorbs one miss

  const today = new Date()
  const last = new Date(lastSessionDate)

  today.setUTCHours(0, 0, 0, 0)
  last.setUTCHours(0, 0, 0, 0)

  if (today <= last) return false // same day

  // Count missed school days
  const cursor = new Date(last)
  cursor.setUTCDate(cursor.getUTCDate() + 1)
  let missedSchoolDays = 0

  while (cursor < today) {
    const day = cursor.getUTCDay()
    if (day !== 0 && day !== 6) {
      missedSchoolDays++
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return missedSchoolDays >= 1
}
