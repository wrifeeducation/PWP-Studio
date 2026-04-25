/**
 * WF-047 — Session Expiry Hook
 * Checks Supabase session expiry every 60 seconds.
 * Returns minutes until expiry and whether session is expiring soon.
 */

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface SessionExpiryState {
  expiresInMinutes: number | null
  isExpiringSoon: boolean
}

const WARN_THRESHOLD_MINUTES = 5
const CHECK_INTERVAL_MS = 60_000

export function useSessionExpiry(): SessionExpiryState {
  const [state, setState] = useState<SessionExpiryState>({
    expiresInMinutes: null,
    isExpiringSoon: false,
  })

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.expires_at) {
        setState({ expiresInMinutes: null, isExpiringSoon: false })
        return
      }

      const expiresAtMs = session.expires_at * 1000
      const nowMs = Date.now()
      const diffMs = expiresAtMs - nowMs
      const diffMinutes = Math.floor(diffMs / 60_000)

      setState({
        expiresInMinutes: diffMinutes,
        isExpiringSoon: diffMinutes >= 0 && diffMinutes <= WARN_THRESHOLD_MINUTES,
      })
    }

    check()
    const interval = setInterval(check, CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  return state
}
