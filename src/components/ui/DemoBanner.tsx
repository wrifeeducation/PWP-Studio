// DemoBanner — shown when a visitor is browsing in demo mode (demo@wrife.co.uk)
// Floats at the top of the screen with a subtle frosted-glass style strip.

import { useAuthStore } from '@/stores/authStore'

export const DEMO_EMAIL = 'demo@wrife.co.uk'

export function isDemoUser(email?: string | null): boolean {
  return email === DEMO_EMAIL
}

/**
 * Drop this component inside any page's top-level return.
 * It renders nothing when the user is not the demo account.
 */
export function DemoBanner() {
  const user = useAuthStore((s) => s.user)

  if (!isDemoUser(user?.email)) return null

  return (
    <div
      data-testid="demo-banner"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'rgba(108, 92, 231, 0.92)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 20px',
        fontSize: '13px',
        fontFamily: 'inherit',
        gap: '12px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
      }}
    >
      {/* Left: demo label */}
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, letterSpacing: '0.01em' }}>
        <span style={{ fontSize: '16px' }}>✏️</span>
        Demo Mode
        <span style={{ fontWeight: 400, opacity: 0.82 }}>— You're exploring WriFe as a guest</span>
      </span>

      {/* Right: CTAs */}
      <span style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <a
          href="https://wrife.co.uk/register"
          target="_top"
          style={{
            background: '#F5A623',
            color: '#fff',
            fontWeight: 700,
            fontSize: '12px',
            padding: '5px 14px',
            borderRadius: '20px',
            textDecoration: 'none',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 6px rgba(245,166,35,0.35)',
          }}
        >
          Register Free →
        </a>
        <a
          href="https://wrife.co.uk"
          target="_top"
          style={{
            color: 'rgba(255,255,255,0.88)',
            fontSize: '12px',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            borderBottom: '1px solid rgba(255,255,255,0.4)',
            paddingBottom: '1px',
          }}
        >
          ← Back to WriFe
        </a>
      </span>
    </div>
  )
}

/**
 * Call this where a gated action is attempted (e.g. PDF download, save to account).
 * Returns true if the action should be blocked (i.e. we are in demo mode).
 * Pass the user email from useAuthStore.
 */
export function blockIfDemo(email?: string | null): boolean {
  return isDemoUser(email)
}

/** Standard alert shown when a demo user tries a gated action */
export function demoBlocAlert() {
  alert(
    '✏️ This feature is available to registered WriFe users.\n\nVisit wrife.co.uk to create your free account — it only takes 30 seconds!'
  )
}
