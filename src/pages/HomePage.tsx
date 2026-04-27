import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Role } from '../types/index'

function getDashboardRoute(role: string): string {
  if (role === Role.TEACHER)      return '/teacher'
  if (role === Role.SCHOOL_ADMIN) return '/admin'
  if (role === Role.PARENT)       return '/parent'
  return '/dashboard'
}

// ---------------------------------------------------------------------------
// Colour tokens — all explicit hex values; NO CSS variables (index.css uses a
// different colour scheme for the learning app UI, not this landing page).
// ---------------------------------------------------------------------------
const C = {
  purple:   '#6C5CE7',
  orange:   '#F5A623',
  gold:     '#F5C500',
  cream:    '#FDF8EE',
  dark:     '#2D3436',
  muted:    '#636E72',
  border:   '#E8E0D5',
  teal:     '#00B894',
  blue:     '#0984E3',
  white:    '#FFFFFF',
  world1bg: '#F0EEFF',
  world2bg: '#E0FAF4',
  world3bg: '#FFF4E0',
} as const

// ---------------------------------------------------------------------------
// Sub-components (inline, no external CSS classes)
// ---------------------------------------------------------------------------

function BookSVG() {
  return (
    <svg viewBox="0 0 16 14" fill="none" width="16" height="14">
      <rect x="0.5" y="0.5" width="7" height="13" rx="1" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5"/>
      <rect x="8.5" y="0.5" width="7" height="13" rx="1" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5"/>
      <line x1="8" y1="1" x2="8" y2="13" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5"/>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Badge data — exactly 5, one from each category to show the range
// ---------------------------------------------------------------------------
const BADGES = [
  { emoji: '🎯', name: 'First Steps',        rarity: 'Common', rarityColor: C.teal,   bg: '#E0FAF4', borderColor: '#00B894' },
  { emoji: '🔥', name: 'On Fire',            rarity: 'Common', rarityColor: C.teal,   bg: '#FFE8D6', borderColor: '#F5A623' },
  { emoji: '✏️', name: 'Paragraph Pioneer',  rarity: 'Common', rarityColor: C.teal,   bg: '#F0EEFF', borderColor: '#6C5CE7' },
  { emoji: '👑', name: 'Fortnight Champion', rarity: 'Rare',   rarityColor: C.blue,   bg: '#E3F2FD', borderColor: '#0984E3' },
  { emoji: '💎', name: 'Greater Depth',      rarity: 'Epic',   rarityColor: C.orange, bg: '#FFF4E0', borderColor: '#F5C500' },
]

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function HomePage() {
  const navigate = useNavigate()
  const { session, profile, isInitialised } = useAuthStore()

  // While auth initialises, show nothing (prevents flash)
  if (!isInitialised) return null

  const isLoggedIn = !!(session && profile)
  const dashboardRoute = isLoggedIn ? getDashboardRoute(profile!.role) : '/'

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", background: C.cream, color: C.dark, minHeight: '100vh' }}>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav style={{
        background: C.purple,
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30,
            height: 26,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <BookSVG />
          </div>
          <span style={{ fontSize: 19, fontWeight: 800, color: C.white }}>WriFe</span>
        </div>

        {/* Nav actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          {isLoggedIn ? (
            <button
              onClick={() => navigate(dashboardRoute)}
              style={{
                background: C.white,
                border: 'none',
                color: C.purple,
                padding: '5px 14px',
                borderRadius: 8,
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Go to Dashboard →
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                style={{
                  background: 'none',
                  border: '1.5px solid rgba(255,255,255,0.6)',
                  color: C.white,
                  padding: '5px 14px',
                  borderRadius: 8,
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Log in
              </button>
              <button
                onClick={() => navigate('/login')}
                style={{
                  background: C.white,
                  border: 'none',
                  color: C.purple,
                  padding: '5px 14px',
                  borderRadius: 8,
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Sign up free
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div style={{ background: C.purple, padding: '28px 24px 24px', color: '#fff' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', alignItems: 'flex-start', gap: 16 }}>

          {/* Hero text */}
          <div style={{ flex: 1 }}>
            <span style={{
              display: 'inline-block',
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '4px 10px',
              borderRadius: 20,
              marginBottom: 8,
            }}>
              Level up your writing
            </span>

            <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.25, margin: '0 0 8px', color: '#fff' }}>
              Write.{' '}
              <span style={{ color: C.gold }}>Earn.</span>
              {' '}Grow.
            </h1>

            <p style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.8)',
              lineHeight: 1.55,
              maxWidth: 280,
              margin: '0 0 12px',
            }}>
              Daily grammar missions, XP rewards, streaks and badges — the most fun way to master writing.
            </p>

            <button
              onClick={() => navigate('/login')}
              style={{
                background: C.orange,
                color: C.white,
                border: 'none',
                padding: '10px 20px',
                borderRadius: 10,
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Start earning XP →
            </button>
          </div>

          {/* XP Widget */}
          <div style={{
            background: C.white,
            borderRadius: 14,
            border: 'none',
            padding: 12,
            width: 130,
            flexShrink: 0,
          }}>
            {/* Streak top row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
              <span style={{ fontSize: 16 }}>🔥</span>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.orange }}>7</div>
                <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>Day streak</div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ background: 'rgba(255,255,255,0.3)', borderRadius: 20, height: 6, marginBottom: 6 }}>
              <div style={{ background: C.orange, borderRadius: 20, height: 6, width: '65%' }} />
            </div>

            {/* Level + XP */}
            <div style={{ fontSize: 10, fontWeight: 800, color: C.purple }}>Level 12 · 650 XP</div>

            {/* Badge dots */}
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#FFF8D6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>🏆</div>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#F0EEFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>⭐</div>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#E0FAF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>🎯</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── GAMIFICATION ROW ─────────────────────────────────────────────── */}
      <div style={{
        background: C.white,
        borderBottom: `1px solid ${C.border}`,
        padding: '14px 20px',
        display: 'flex',
        justifyContent: 'space-around',
        textAlign: 'center',
      }}>
        {[
          { icon: '⚡', name: 'XP every session',  desc: 'Earn more for harder levels', circleBg: '#FFF8D6' },
          { icon: '🔥', name: 'Daily streaks',      desc: 'Protect with a shield',       circleBg: '#FFE8D6' },
          { icon: '🏅', name: '15 badges',          desc: 'Common to epic',              circleBg: '#F0EEFF' },
          { icon: '📜', name: 'Certificates',       desc: 'Earn at every gate',          circleBg: '#E0FAF4' },
        ].map((item) => (
          <div key={item.name}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: item.circleBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              margin: '0 auto 6px',
            }}>{item.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.dark }}>{item.name}</div>
            <div style={{ fontSize: 9, color: C.muted, marginTop: 1 }}>{item.desc}</div>
          </div>
        ))}
      </div>

      {/* ── BADGE SHOWCASE ───────────────────────────────────────────────── */}
      <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
        {/* Section heading with mascot */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: C.cream,
            border: `1.5px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            <img src="/mascot/mascot_std_3.png" alt="" role="presentation" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <p style={{
            fontSize: 10,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: C.muted,
            margin: 0,
          }}>
            Badges to collect
          </p>
        </div>

        {/* Badge grid — 5 badges */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {BADGES.map((badge) => (
            <div key={badge.name} style={{ textAlign: 'center' }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: badge.bg,
                border: `2px solid ${badge.borderColor}`,
                margin: '0 auto 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
              }}>
                {badge.emoji}
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.dark, lineHeight: 1.3 }}>{badge.name}</div>
              <div style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: badge.rarityColor }}>
                {badge.rarity}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TRUST STRIP ──────────────────────────────────────────────────── */}
      <div style={{
        background: C.purple,
        color: C.white,
        padding: '14px 20px',
        display: 'flex',
        justifyContent: 'space-around',
      }}>
        {[
          { num: '67', label: 'Levels'  },
          { num: '15', label: 'Badges'  },
          { num: '4',  label: 'Genres'  },
          { num: '3',  label: 'Layers'  },
        ].map((item) => (
          <div key={item.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{item.num}</div>
            <div style={{ fontSize: 9, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* ── CTA CARDS ────────────────────────────────────────────────────── */}
      <div style={{ padding: '16px 20px', maxWidth: 600, margin: '0 auto' }}>
        <div style={{
          background: C.white,
          borderRadius: 16,
          padding: '20px',
          border: `1px solid ${C.border}`,
        }}>
        <p style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: C.muted,
          marginBottom: 8,
          margin: '0 0 8px',
        }}>
          Where would you like to start?
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

          {/* Pupil card */}
          <button
            onClick={() => navigate('/login')}
            style={{
              background: C.orange,
              border: 'none',
              borderRadius: 12,
              padding: 14,
              cursor: 'pointer',
              textAlign: 'left',
              height: 110,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 18 }}>🎒</span>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>For pupils</span>
            </div>
            <p style={{ fontSize: 13, fontWeight: 800, color: C.white, lineHeight: 1.25, margin: 0 }}>
              I'm a pupil —<br />start my adventure
            </p>
            <span style={{
              alignSelf: 'flex-start',
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: 11,
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: 6,
              background: C.white,
              color: C.orange,
            }}>
              Play now →
            </span>
          </button>

          {/* Teacher card */}
          <button
            onClick={() => navigate('/login')}
            style={{
              background: C.purple,
              border: 'none',
              borderRadius: 12,
              padding: 14,
              cursor: 'pointer',
              textAlign: 'left',
              height: 110,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 18 }}>📋</span>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>For teachers</span>
            </div>
            <p style={{ fontSize: 13, fontWeight: 800, color: C.white, lineHeight: 1.25, margin: 0 }}>
              I'm a teacher —<br />set up my class
            </p>
            <span style={{
              alignSelf: 'flex-start',
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: 11,
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: 6,
              background: C.white,
              color: C.purple,
            }}>
              Get started →
            </span>
          </button>

        </div>
        </div>
      </div>

      {/* ── DARK TEACHER STRIP ───────────────────────────────────────────── */}
      <div style={{
        background: C.dark,
        padding: '18px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.white, marginBottom: 3 }}>
            Set up your class in 60 seconds
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
            Track progress, assign writing tasks, review with AI feedback
          </div>
        </div>
        <button
          onClick={() => navigate('/login')}
          style={{
            background: C.orange,
            color: C.white,
            border: 'none',
            padding: '8px 16px',
            borderRadius: 8,
            fontFamily: 'inherit',
            fontSize: 12,
            fontWeight: 800,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Create my class →
        </button>
      </div>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{
        background: C.cream,
        borderTop: `1px solid ${C.border}`,
        padding: '14px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 15, fontWeight: 800 }}>WriFe</span>
        <span style={{ fontSize: 11, color: C.muted }}>pwp-studio.wrife.co.uk</span>
      </footer>

    </div>
  )
}
