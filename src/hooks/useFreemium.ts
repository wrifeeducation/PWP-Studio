/**
 * useFreemium — reads membership_tier from authStore and counts today's
 * formula_sessions to enforce freemium play limits.
 *
 * Freemium limits (membership_tier === 'free'):
 *   - Max 3 formula practice sessions per day
 *   - No paragraph builder access
 *   - No writing studio access
 *   - Rewards (XP, badges, streaks) hidden
 *
 * Pro / School tiers: unlimited access to everything.
 */

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export const FREE_DAILY_LIMIT = 3

export interface FreemiumState {
  isPro: boolean           // true if membership_tier is 'pro' or 'school'
  isFree: boolean          // true if membership_tier is 'free'
  playsToday: number       // formula sessions completed today
  playsRemaining: number   // sessions left today (0 if at limit)
  isAtLimit: boolean       // true when free user has hit daily cap
  loading: boolean
}

export function useFreemium(): FreemiumState {
  const { profile } = useAuthStore()
  const [playsToday, setPlaysToday] = useState(0)
  const [loading, setLoading] = useState(true)

  const tier = profile?.membership_tier ?? 'free'
  const isPro = tier === 'pro' || tier === 'school'
  const isFree = !isPro

  useEffect(() => {
    if (!profile?.id || isPro) {
      setLoading(false)
      return
    }

    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    supabase
      .from('formula_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('pupil_id', profile.id)
      .eq('session_date', today)
      .then(({ count }) => {
        setPlaysToday(count ?? 0)
        setLoading(false)
      })
  }, [profile?.id, isPro])

  const playsRemaining = Math.max(0, FREE_DAILY_LIMIT - playsToday)
  const isAtLimit = isFree && playsRemaining === 0

  return { isPro, isFree, playsToday, playsRemaining, isAtLimit, loading }
}
