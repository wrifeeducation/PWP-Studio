import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Role } from '../types/index'

// ── Colour tokens (matching HomePage/LoginPage palette) ──────────────────────
const C = {
  purple: '#6C5CE7',
  orange: '#F5A623',
  gold:   '#F5C500',
  cream:  '#FDF8EE',
  dark:   '#2D3436',
  muted:  '#636E72',
  border: '#E8E0D5',
  white:  '#FFFFFF',
  red:    '#D63031',
  lightRed: '#FFEAEA',
} as const

// ── Book SVG (matches HomePage) ───────────────────────────────────────────────
function BookSVG() {
  return (
    <svg viewBox="0 0 16 14" fill="none" width="16" height="14">
      <rect x="0.5" y="0.5" width="7" height="13" rx="1" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5"/>
      <rect x="8.5" y="0.5" width="7" height="13" rx="1" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5"/>
      <line x1="8" y1="1" x2="8" y2="13" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5"/>
    </svg>
  )
}

// ── Year group options ────────────────────────────────────────────────────────
const YEAR_GROUPS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

type Step = 'account' | 'child'

interface FormErrors {
  email?: string
  password?: string
  confirmPassword?: string
  childName?: string
  general?: string
}

export default function HomeSignupPage() {
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('account')

  // Account step
  const [email, setEmail]                   = useState('')
  const [password, setPassword]             = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword]     = useState(false)

  // Child step
  const [childName, setChildName]     = useState('')
  const [yearGroup, setYearGroup]     = useState<number>(4)

  // UI state
  const [isLoading, setIsLoading]   = useState(false)
  const [errors, setErrors]         = useState<FormErrors>({})

  function clearErrors() { setErrors({}) }

  // ── Step 1: Create parent Supabase auth account ────────────────────────────
  async function handleAccountSubmit(e: FormEvent) {
    e.preventDefault()
    clearErrors()

    if (!email.trim()) return setErrors({ email: 'Email address is required' })
    if (!email.includes('@')) return setErrors({ email: 'Please enter a valid email address' })
    if (password.length < 8) return setErrors({ password: 'Password must be at least 8 characters' })
    if (password !== confirmPassword) return setErrors({ confirmPassword: 'Passwords do not match' })

    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { role: Role.PARENT },
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      })

      if (error) {
        const msg = error.message.toLowerCase()
        if (msg.includes('already registered') || msg.includes('user already exists')) {
          setErrors({ general: 'An account with this email already exists. Try signing in instead.' })
        } else if (msg.includes('rate limit')) {
          setErrors({ general: 'Too many attempts — please wait a moment and try again.' })
        } else {
          setErrors({ general: error.message })
        }
        return
      }

      if (data.user) {
        // Account created — move to child details step
        setStep('child')
      }
    } catch {
      setErrors({ general: 'Something went wrong. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  // ── Step 2: Save child details and redirect to pricing ─────────────────────
  function handleChildSubmit(e: FormEvent) {
    e.preventDefault()
    clearErrors()

    if (!childName.trim()) {
      return setErrors({ childName: "Please enter your child's first name or nickname" })
    }

    // Store pending child details — ParentPage picks these up after Stripe checkout
    // and calls the create-child-profile Edge Function automatically
    sessionStorage.setItem(
      'wrife_pending_child',
      JSON.stringify({ nickname: childName.trim(), year_group: yearGroup }),
    )

    navigate('/pricing', { replace: true })
  }

  // ── Shared field style ─────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: `1.5px solid ${C.border}`,
    fontFamily: 'inherit',
    fontSize: 14,
    color: C.dark,
    background: C.white,
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: C.muted,
    marginBottom: 5,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  }

  const errorStyle: React.CSSProperties = {
    fontSize: 12,
    color: C.red,
    marginTop: 4,
    fontWeight: 600,
  }

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", background: C.cream, color: C.dark, minHeight: '100vh' }}>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
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
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: 0,
          }}
        >
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
        </button>

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
          Sign in
        </button>
      </nav>

      {/* ── HERO BAND ────────────────────────────────────────────────────── */}
      <div style={{ background: C.purple, padding: '20px 24px 16px', color: C.white, textAlign: 'center' }}>
        <span style={{
          display: 'inline-block',
          background: 'rgba(255,255,255,0.15)',
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          padding: '4px 12px',
          borderRadius: 20,
          marginBottom: 8,
        }}>
          Home learning plan
        </span>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', color: C.white }}>
          Get started in 2 minutes
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.5 }}>
          Create your free account, then choose a plan that suits your family.
        </p>
      </div>

      {/* ── STEP INDICATOR ───────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 8,
        padding: '16px 20px 0',
      }}>
        {(['account', 'child'] as Step[]).map((s, i) => {
          const isActive    = step === s
          const isCompleted = step === 'child' && s === 'account'
          const label = s === 'account' ? 'Your account' : 'Your child'
          return (
            <div
              key={s}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                opacity: isActive || isCompleted ? 1 : 0.4,
              }}
            >
              <div style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: isCompleted ? '#00B894' : isActive ? C.orange : C.border,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 800,
                color: isCompleted || isActive ? C.white : C.muted,
                flexShrink: 0,
              }}>
                {isCompleted ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? C.dark : C.muted }}>
                {label}
              </span>
              {i < 1 && (
                <div style={{
                  width: 24,
                  height: 1.5,
                  background: step === 'child' ? '#00B894' : C.border,
                  marginLeft: 2,
                }} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── FORM CARD ────────────────────────────────────────────────────── */}
      <div style={{ padding: '16px 20px 32px', maxWidth: 420, margin: '0 auto' }}>
        <div style={{
          background: C.white,
          borderRadius: 18,
          border: `1px solid ${C.border}`,
          padding: '24px 20px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>

          {/* ── STEP 1: Account details ── */}
          {step === 'account' && (
            <form onSubmit={handleAccountSubmit} noValidate>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: C.dark, margin: '0 0 4px' }}>
                Create your account
              </h2>
              <p style={{ fontSize: 12, color: C.muted, margin: '0 0 20px', lineHeight: 1.5 }}>
                You'll use this to log in and manage your child's subscription.
              </p>

              {/* General error */}
              {errors.general && (
                <div style={{
                  background: C.lightRed,
                  border: `1.5px solid ${C.red}`,
                  borderRadius: 8,
                  padding: '10px 12px',
                  marginBottom: 16,
                  fontSize: 13,
                  color: C.red,
                  fontWeight: 600,
                }}>
                  {errors.general}
                  {errors.general.includes('already exists') && (
                    <span>
                      {' '}
                      <button
                        type="button"
                        onClick={() => navigate('/login')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: C.purple,
                          fontWeight: 800,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          fontSize: 13,
                          textDecoration: 'underline',
                          padding: 0,
                        }}
                      >
                        Sign in →
                      </button>
                    </span>
                  )}
                </div>
              )}

              {/* Email */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="email"
                  data-testid="home-signup-email"
                  style={{
                    ...inputStyle,
                    borderColor: errors.email ? C.red : C.border,
                  }}
                />
                {errors.email && <p style={errorStyle}>{errors.email}</p>}
              </div>

              {/* Password */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    data-testid="home-signup-password"
                    style={{
                      ...inputStyle,
                      borderColor: errors.password ? C.red : C.border,
                      paddingRight: 42,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 16,
                      color: C.muted,
                      padding: 4,
                    }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {errors.password && <p style={errorStyle}>{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: 22 }}>
                <label style={labelStyle}>Confirm password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  data-testid="home-signup-confirm-password"
                  style={{
                    ...inputStyle,
                    borderColor: errors.confirmPassword ? C.red : C.border,
                  }}
                />
                {errors.confirmPassword && <p style={errorStyle}>{errors.confirmPassword}</p>}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                data-testid="home-signup-account-submit"
                style={{
                  width: '100%',
                  background: isLoading ? C.border : C.orange,
                  color: C.white,
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px 20px',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'opacity 0.15s',
                }}
              >
                {isLoading ? 'Creating account…' : 'Continue →'}
              </button>

              <p style={{ fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
                By creating an account you agree to WriFe's terms of service and privacy policy.
              </p>
            </form>
          )}

          {/* ── STEP 2: Child details ── */}
          {step === 'child' && (
            <form onSubmit={handleChildSubmit} noValidate>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 22 }}>🎒</span>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: C.dark, margin: 0 }}>
                  Tell us about your child
                </h2>
              </div>
              <p style={{ fontSize: 12, color: C.muted, margin: '0 0 20px', lineHeight: 1.5 }}>
                We'll use this to personalise their learning path. You can add more children later.
              </p>

              {/* Child name */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>First name or nickname</label>
                <input
                  type="text"
                  value={childName}
                  onChange={e => setChildName(e.target.value)}
                  placeholder="e.g. Alex"
                  autoFocus
                  data-testid="home-signup-child-name"
                  style={{
                    ...inputStyle,
                    borderColor: errors.childName ? C.red : C.border,
                  }}
                />
                {errors.childName && <p style={errorStyle}>{errors.childName}</p>}
              </div>

              {/* Year group */}
              <div style={{ marginBottom: 22 }}>
                <label style={labelStyle}>School year</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {YEAR_GROUPS.map(yr => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setYearGroup(yr)}
                      data-testid={`home-signup-year-${yr}`}
                      style={{
                        padding: '9px 6px',
                        borderRadius: 8,
                        border: `1.5px solid ${yearGroup === yr ? C.purple : C.border}`,
                        background: yearGroup === yr ? `${C.purple}15` : C.white,
                        color: yearGroup === yr ? C.purple : C.dark,
                        fontFamily: 'inherit',
                        fontSize: 13,
                        fontWeight: yearGroup === yr ? 800 : 500,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      Year {yr}
                    </button>
                  ))}
                </div>
              </div>

              {/* What happens next info box */}
              <div style={{
                background: '#F0EEFF',
                borderRadius: 10,
                padding: '12px 14px',
                marginBottom: 20,
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>💳</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: C.purple, marginBottom: 3 }}>
                    Next: choose your plan
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
                    Free access to the first 10 levels. Unlock all 67 with a subscription — cancel any time.
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                data-testid="home-signup-child-submit"
                style={{
                  width: '100%',
                  background: C.orange,
                  color: C.white,
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px 20px',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                See plans →
              </button>

              <button
                type="button"
                onClick={() => setStep('account')}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: C.muted,
                  fontFamily: 'inherit',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: 10,
                  padding: '6px 0',
                }}
              >
                ← Back
              </button>
            </form>
          )}
        </div>

        {/* Sign-in prompt */}
        <p style={{ textAlign: 'center', fontSize: 12, color: C.muted, marginTop: 16 }}>
          Already have an account?{' '}
          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'none',
              border: 'none',
              color: C.purple,
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}
