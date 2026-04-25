/**
 * WF-009: Streak Engine — pure functions, no side effects.
 * Computes the new streak state given existing progress + today's date.
 */

import type { PupilProgress } from '../types/index'
import { shouldAdvanceStreak, shouldBreakStreak } from './xpEngine'

export interface StreakUpdate {
  current_streak: number
  longest_streak: number
  streak_shield_active: boolean
  last_session_date: string
}

/**
 * Compute the new streak values after a session has been completed.
 * Call this ONCE per session (not per attempt).
 *
 * Rules:
 * - If shieldActive and a miss occurred: absorb the miss, set shield=false, keep streak
 * - If a miss occurred (no shield): reset streak to 1
 * - If no miss: increment streak by 1
 */
export const updateStreak = (
  progress: Pick<
    PupilProgress,
    'current_streak' | 'longest_streak' | 'streak_shield_active' | 'last_session_date'
  >,
  today: string // ISO date string YYYY-MM-DD
): StreakUpdate => {
  const { current_streak, longest_streak, streak_shield_active, last_session_date } = progress

  const sessionDate = last_session_date

  // Same day — don't change streak
  if (sessionDate === today) {
    return {
      current_streak,
      longest_streak,
      streak_shield_active,
      last_session_date: today,
    }
  }

  const breaks = shouldBreakStreak(sessionDate, streak_shield_active)
  const advances = shouldAdvanceStreak(sessionDate)

  let newStreak: number
  let newShield = streak_shield_active

  if (breaks && streak_shield_active) {
    // Shield absorbs the miss — keep streak, deactivate shield
    newStreak = current_streak
    newShield = false
  } else if (breaks && !streak_shield_active) {
    // Streak broken — reset to 1 (today counts as day 1)
    newStreak = 1
  } else if (advances) {
    // Next consecutive school day — increment
    newStreak = current_streak + 1
  } else {
    // Same day or weekend — no change to count
    newStreak = current_streak
  }

  const newLongest = Math.max(longest_streak, newStreak)

  return {
    current_streak: newStreak,
    longest_streak: newLongest,
    streak_shield_active: newShield,
    last_session_date: today,
  }
}
