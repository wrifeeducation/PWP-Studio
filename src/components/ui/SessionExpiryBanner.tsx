/**
 * WF-047 — Session Expiry Warning Banner
 * Amber banner shown when session is about to expire.
 */

import { supabase } from '../../lib/supabase'
import { useSessionExpiry } from '../../hooks/useSessionExpiry'

export function SessionExpiryBanner() {
  const { expiresInMinutes, isExpiringSoon } = useSessionExpiry()

  if (!isExpiringSoon || expiresInMinutes === null) return null

  const handleStaySignedIn = async () => {
    await supabase.auth.refreshSession()
  }

  return (
    <div
      role="alert"
      data-testid="session-expiry-banner"
      className="flex items-center justify-between px-4 py-2 text-sm"
      style={{
        backgroundColor: '#FEF3C7',
        borderBottom: '1px solid #FCD34D',
        color: '#92400E',
      }}
    >
      <span data-tts={`Your session expires in ${expiresInMinutes} minutes`}>
        Your session expires in {expiresInMinutes} minute{expiresInMinutes !== 1 ? 's' : ''}.
      </span>
      <button
        type="button"
        onClick={handleStaySignedIn}
        data-testid="stay-signed-in-button"
        className="ml-4 px-3 py-1 rounded text-xs font-semibold"
        style={{ backgroundColor: '#F59E0B', color: '#fff' }}
      >
        Stay signed in
      </button>
    </div>
  )
}
