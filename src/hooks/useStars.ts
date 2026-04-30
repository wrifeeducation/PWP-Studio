/**
 * useStars — WF-050: Stars Freemium Model
 *
 * Replaces the old play-count gate with a daily star allocation system.
 *
 * Rules:
 *  - Every pupil starts each day with 3 stars (free tier).
 *  - Stars are deducted on mistakes (failed submission, failed AI, hint overuse).
 *  - A perfect session (no mistakes) earns back 1 star (up to the daily max of 3).
 *  - When stars_last_replenished < today, stars are auto-reset to 3.
 *  - star_shield_active absorbs the next mistake without cost.
 *  - Pro / School tier: stars mechanics are bypassed entirely (unlimited practice).
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export const DAILY_STAR_MAX = 3

export interface StarsState {
  isPro: boolean            // true if membership_tier is 'pro' or 'school'
  isFree: boolean           // true if membership_tier is 'free'
  starsRemaining: number    // 0–3 (always 3 for pro/school — displayed but unlimited)
  isOutOfStars: boolean     // true when free user has 0 stars
  shieldActive: boolean     // next mistake is absorbed for free
  loading: boolean
  /** Deduct stars on a mistake. Amount defaults to 1. Shield absorbs if active. */
  deductStar: (amount?: number) => Promise<void>
  /** Award 1 star on a perfect session (capped at DAILY_STAR_MAX). */
  awardStar: () => Promise<void>
}

export function useStars(): StarsState {
  const { profile } = useAuthStore()
  const [starsRemaining, setStarsRemaining] = useState(DAILY_STAR_MAX)
  const [shieldActive, setShieldActive] = useState(false)
  const [loading, setLoading] = useState(true)

  const tier = profile?.membership_tier ?? 'free'
  const isPro = tier === 'pro' || tier === 'school'
  const isFree = !isPro

  // ── Load + auto-replenish ────────────────────────────────────────────────
  useEffect(() => {
    if (!profile?.id) {
      setLoading(false)
      return
    }

    // Pro/school users never need star tracking
    if (isPro) {
      setStarsRemaining(DAILY_STAR_MAX)
      setLoading(false)
      return
    }

    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    supabase
      .from('pupil_progress')
      .select('stars_remaining, stars_last_replenished, star_shield_active')
      .eq('pupil_id', profile.id)
      .single()
      .then(async ({ data, error }) => {
        if (error || !data) {
          setLoading(false)
          return
        }

        const lastReplenished = data.stars_last_replenished
        const needsReplenish = !lastReplenished || lastReplenished < today

        if (needsReplenish) {
          // New day — reset stars to 3
          await supabase
            .from('pupil_progress')
            .update({
              stars_remaining: DAILY_STAR_MAX,
              stars_last_replenished: today,
              star_shield_active: false,
            })
            .eq('pupil_id', profile.id)

          setStarsRemaining(DAILY_STAR_MAX)
          setShieldActive(false)
        } else {
          setStarsRemaining(data.stars_remaining ?? DAILY_STAR_MAX)
          setShieldActive(data.star_shield_active ?? false)
        }

        setLoading(false)
      })
  }, [profile?.id, isPro])

  // ── Deduct star ──────────────────────────────────────────────────────────
  const deductStar = useCallback(async (amount = 1) => {
    if (isPro || !profile?.id) return

    // Shield absorbs the hit
    if (shieldActive) {
      await supabase
        .from('pupil_progress')
        .update({ star_shield_active: false })
        .eq('pupil_id', profile.id)
      setShieldActive(false)
      return
    }

    const newStars = Math.max(0, starsRemaining - amount)
    setStarsRemaining(newStars)

    await supabase
      .from('pupil_progress')
      .update({ stars_remaining: newStars })
      .eq('pupil_id', profile.id)
  }, [isPro, profile?.id, shieldActive, starsRemaining])

  // ── Award star (perfect session) ─────────────────────────────────────────
  const awardStar = useCallback(async () => {
    if (isPro || !profile?.id) return

    const newStars = Math.min(DAILY_STAR_MAX, starsRemaining + 1)
    if (newStars === starsRemaining) return // already at max

    setStarsRemaining(newStars)

    await supabase
      .from('pupil_progress')
      .update({ stars_remaining: newStars })
      .eq('pupil_id', profile.id)
  }, [isPro, profile?.id, starsRemaining])

  return {
    isPro,
    isFree,
    starsRemaining,
    isOutOfStars: isFree && starsRemaining === 0,
    shieldActive,
    loading,
    deductStar,
    awardStar,
  }
}
