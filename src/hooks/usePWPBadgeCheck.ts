// usePWPBadgeCheck — evaluates and awards PWP gamification badges.
//
// Badge keys (stored in pwp_pupil_badges.badge_key):
//   pwp:first_level   — completed any level for the first time
//   pwp:streak_3      — 3-day streak reached
//   pwp:streak_7      — 7-day streak reached
//   pwp:streak_14     — 14-day streak reached
//   pwp:streak_30     — 30-day streak reached
//   pwp:level_10      — reached level 10
//   pwp:level_20      — reached level 20
//   pwp:level_30      — reached level 30
//   pwp:quiz_pass     — passed any mastery quiz
//
// Returns `BadgeInfo[]` — array of newly awarded badges, ready for BadgeToast.

import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface BadgeInfo {
  key:         string
  name:        string
  description: string
  icon:        string
  rarity:      'common' | 'uncommon' | 'rare' | 'epic'
}

// ─── BADGE CATALOGUE ─────────────────────────────────────────────────────────

const PWP_BADGE_CATALOGUE: Record<string, BadgeInfo> = {
  'pwp:first_level': {
    key:         'pwp:first_level',
    name:        'First Steps',
    description: 'Completed your first PWP level!',
    icon:        '🌱',
    rarity:      'common',
  },
  'pwp:streak_3': {
    key:         'pwp:streak_3',
    name:        'On a Roll',
    description: 'Practised 3 days in a row.',
    icon:        '🔥',
    rarity:      'common',
  },
  'pwp:streak_7': {
    key:         'pwp:streak_7',
    name:        'Week Warrior',
    description: 'Kept a 7-day streak — impressive!',
    icon:        '🔥',
    rarity:      'uncommon',
  },
  'pwp:streak_14': {
    key:         'pwp:streak_14',
    name:        'Fortnight Fire',
    description: '14 consecutive days of writing practice.',
    icon:        '🏅',
    rarity:      'rare',
  },
  'pwp:streak_30': {
    key:         'pwp:streak_30',
    name:        'Month Master',
    description: '30-day streak — you\'re unstoppable!',
    icon:        '🏆',
    rarity:      'epic',
  },
  'pwp:level_10': {
    key:         'pwp:level_10',
    name:        'Phrase Crafter',
    description: 'Reached Level 10 of the formula programme.',
    icon:        '✏️',
    rarity:      'uncommon',
  },
  'pwp:level_20': {
    key:         'pwp:level_20',
    name:        'Sentence Shaper',
    description: 'Reached Level 20 — halfway through the programme!',
    icon:        '📝',
    rarity:      'rare',
  },
  'pwp:level_30': {
    key:         'pwp:level_30',
    name:        'Formula Master',
    description: 'Reached Level 30 — nearly there!',
    icon:        '🌟',
    rarity:      'epic',
  },
  'pwp:quiz_pass': {
    key:         'pwp:quiz_pass',
    name:        'Quiz Champion',
    description: 'Passed your first mastery quiz.',
    icon:        '🎯',
    rarity:      'uncommon',
  },
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getPupilId(): string | null {
  const { user } = useAuthStore.getState()
  if (user?.id) return user.id
  try {
    const raw = localStorage.getItem('pupilSession')
    if (raw) { const p = JSON.parse(raw); return p.pupilId ?? p.id ?? null }
  } catch { /* ignore */ }
  return null
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────

export interface CheckBadgesParams {
  highestLevelReached: number
  streakDays:          number
  isFirstLevel:        boolean    // true when this is the pupil's very first level completion
  isQuizPass?:         boolean    // true when a quiz was just passed for the first time
}

/**
 * Returns a `checkAndAward` function.
 * Call it after a level/quiz completes with the updated progress values.
 * It returns only the newly awarded badges (already-earned keys are skipped).
 */
export function usePWPBadgeCheck() {
  const checkAndAward = useCallback(async (params: CheckBadgesParams): Promise<BadgeInfo[]> => {
    const pupilId = getPupilId()
    if (!pupilId) return []

    const { highestLevelReached, streakDays, isFirstLevel, isQuizPass = false } = params

    // ── 1. Fetch already-earned badge keys ─────────────────────────────────
    const { data: existing } = await supabase
      .from('pwp_pupil_badges')
      .select('badge_key')
      .eq('pupil_id', pupilId)

    const earnedKeys = new Set<string>((existing ?? []).map((r: { badge_key: string }) => r.badge_key))

    // ── 2. Determine which new badges qualify ─────────────────────────────
    const candidates: string[] = []

    if (isFirstLevel)                              candidates.push('pwp:first_level')
    if (streakDays >= 3)                           candidates.push('pwp:streak_3')
    if (streakDays >= 7)                           candidates.push('pwp:streak_7')
    if (streakDays >= 14)                          candidates.push('pwp:streak_14')
    if (streakDays >= 30)                          candidates.push('pwp:streak_30')
    if (highestLevelReached >= 10)                 candidates.push('pwp:level_10')
    if (highestLevelReached >= 20)                 candidates.push('pwp:level_20')
    if (highestLevelReached >= 30)                 candidates.push('pwp:level_30')
    if (isQuizPass)                                candidates.push('pwp:quiz_pass')

    const newKeys = candidates.filter(k => !earnedKeys.has(k))
    if (newKeys.length === 0) return []

    // ── 3. Insert new badges ───────────────────────────────────────────────
    try {
      await supabase
        .from('pwp_pupil_badges')
        .insert(newKeys.map(key => ({ pupil_id: pupilId, badge_key: key })))
    } catch (err) {
      console.warn('[usePWPBadgeCheck] insert failed (possibly duplicate):', err)
    }

    // ── 4. Return BadgeInfo for each new badge ────────────────────────────
    return newKeys
      .map(k => PWP_BADGE_CATALOGUE[k])
      .filter(Boolean)
  }, [])

  return { checkAndAward }
}
