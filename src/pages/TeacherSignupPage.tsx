/**
 * Route D — Independent teacher sign-up for PWP Studio.
 * Creates a Supabase Auth account with role = 'teacher'.
 * After sign-up, teacher must confirm email; AuthConfirmPage redirects to /teacher.
 */
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Role } from '../types/index'

const C = {
  purple:   '#6C5CE7',
  orange:   '#F5A623',
  cream:    '#FDF8EE',
  dark:     '#2D3436',
  muted:    '#636E72',
  border:   '#E8E0D5',
  white:    '#FFFFFF',
  red:      '#D63031',
  lightRed: '#FFEAEA',
  green:    '#00B894',
  lightGreen: '#E0FAF4',
} as const

function BookSVG() {
  return (
    <svg viewBox="0 0 16 14" fill="none" width="16" height="14">
      <rect x="0.5" y="0.5" width="7" height="13" rx="1" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5"/>
      <rect x="8.5" y="0.5" width="7" height="13" rx="1" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5"/>
      <line x1="8" y1="1" x2="8" y2="13" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5"/>
    </svg>
  )
}

interface FormErrors {
  firstName?: string
  email?: string
  password?: string
  confirmPassword?: string
  general?: string
}

type Step = 'form' | 'check-email'

export default function TeacherSignupPage() {
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('form')
  const [firstName, setFirstName]           = useState('')
  const [email, setEmail]                   = useState('')
  const [password, setPassword]             = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword]     = useState(false)
  const [isLoading, setIsLoading]           = useState(false)
  const [errors, setErrors]                 = useState<FormErrors>({})

  function clearErrors() { setErrors({}) }

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    clearErrors()

    if (!firstName.trim()) return setErrors({ firstName: 'First name is required' })
    if (!email.trim() || !email.includes('@')) return setErrors({ email: 'A valid email address is required' })
    if (password.length < 8) return setErrors({ password: 'Password must be at least 8 characters' })
    if (password !== confirmPassword) return setErrors({ confirmPassword: 'Passwords do not match' })

    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { first_name: firstName.trim(), role: Role.TEACHER },
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      })

      if (error) {
        const msg = error.message.toLowerCase()
        if (msg.includes('already registered') || msg.includes('user already exists')) {
          setErrors({ general: 'An account with this email already exists. Sign in instead.' })
        } else if (msg.includes('rate limit')) {
          setErrors({ general: 'Too many attempts — please wait a moment and try again.' })
        } else {
          setErrors({ general: error.message })
        }
        return
      }

      if (data.user) {
        setStep('check-email')
      }
    } catch {
      setErrors({ general: 'Something went wrong. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", background: C.cream, color: C.dark, minHeight: '100vh' }}>

      {/* Nav */}
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
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: 0 }}
        >
          <div style={{ width: 30, height: 26, background: 'rgba(255,255,255,0.2)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookSVG />
          </div>
          <span style={{ fontSize: 19, fontWeight: 800, color: C.white }}>WriFe</span>
        </button>
        <button
          onClick={() => navigate('/login')}
          style={{ background: 'none', border: '1.5px solid rgba(255,255,255,0.6)', color: C.white, padding: '5px 14px', borderRadius: 8, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          Sign in
        </button>
      </nav>

      {/* Hero band */}
      <div style={{ background: C.purple, padding: '20px 24px 16px', color: C.white, textAlign: 'center' }}>
        <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 12px', borderRadius: 20, marginBottom: 8 }}>
          Independent teacher plan
        </span>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', color: C.white }}>
          Create your free teacher account
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.5 }}>
          Set up your class, share the code with pupils, and track their progress — all in one place.
        </p>
      </div>

      {/* Card */}
      <div style={{ padding: '24px 20px 48px', maxWidth: 420, margin: '0 auto' }}>
        <div style={{ background: C.white, borderRadius: 18, border: `1px solid ${C.border}`, padding: '24px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

          {step === 'form' && (
            <form onSubmit={handleSubmit} noValidate data-testid="teacher-signup-form">
              <h2 style={{ fontSize: 17, fontWeight: 800, color: C.dark, margin: '0 0 4px' }}>
                Your account
              </h2>
              <p style={{ fontSize: 12, color: C.muted, margin: '0 0 20px', lineHeight: 1.5 }}>
                You'll use these details to sign in and manage your classes.
              </p>

              {errors.general && (
                <div style={{ background: C.lightRed, border: `1.5px solid ${C.red}`, borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 13, color: C.red, fontWeight: 600 }}>
                  {errors.general}
                  {errors.general.includes('already exists') && (
                    <> {' '}<button type="button" onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: C.purple, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, textDecoration: 'underline', padding: 0 }}>Sign in →</button></>
                  )}
                </div>
              )}

              {/* First name */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>First name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="e.g. Sarah"
                  autoComplete="given-name"
                  autoFocus
                  data-testid="teacher-signup-firstname"
                  style={{ ...inputStyle, borderColor: errors.firstName ? C.red : C.border }}
                />
                {errors.firstName && <p style={errorStyle}>{errors.firstName}</p>}
              </div>

              {/* Email */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@school.com"
                  autoComplete="email"
                  data-testid="teacher-signup-email"
                  style={{ ...inputStyle, borderColor: errors.email ? C.red : C.border }}
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
                    data-testid="teacher-signup-password"
                    style={{ ...inputStyle, borderColor: errors.password ? C.red : C.border, paddingRight: 42 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: C.muted, padding: 4 }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {errors.password && <p style={errorStyle}>{errors.password}</p>}
              </div>

              {/* Confirm password */}
              <div style={{ marginBottom: 22 }}>
                <label style={labelStyle}>Confirm password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  data-testid="teacher-signup-confirm"
                  style={{ ...inputStyle, borderColor: errors.confirmPassword ? C.red : C.border }}
                />
                {errors.confirmPassword && <p style={errorStyle}>{errors.confirmPassword}</p>}
              </div>

              {/* What happens next */}
              <div style={{ background: '#F0EEFF', borderRadius: 10, padding: '12px 14px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>📋</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: C.purple, marginBottom: 3 }}>After sign-up</div>
                  <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
                    Confirm your email, then create a class to get your unique class code. Share it with pupils so they can log in and start practising.
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                data-testid="teacher-signup-submit"
                style={{ width: '100%', background: isLoading ? C.border : C.purple, color: C.white, border: 'none', borderRadius: 10, padding: '12px 20px', fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'opacity 0.15s' }}
              >
                {isLoading ? 'Creating account…' : 'Create account →'}
              </button>

              <p style={{ fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
                By creating an account you agree to WriFe's terms of service and privacy policy.
              </p>
            </form>
          )}

          {step === 'check-email' && (
            <div style={{ textAlign: 'center' }} data-testid="teacher-signup-check-email">
              <div style={{ fontSize: 48, marginBottom: 12 }}>📧</div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: C.dark, margin: '0 0 8px' }}>
                Check your email
              </h2>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: '0 0 20px' }}>
                We've sent a confirmation link to <strong style={{ color: C.dark }}>{email}</strong>.
                Click the link to activate your account — it may take a minute or two.
              </p>
              <div style={{ background: C.lightGreen, borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#005E52', fontWeight: 600, textAlign: 'left' }}>
                ✓ Once confirmed, you'll be taken straight to your teacher dashboard where you can create your first class.
              </div>
              <button
                type="button"
                onClick={() => navigate('/login')}
                style={{ background: 'none', border: `1.5px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: '8px 20px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Back to sign in
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: C.muted, marginTop: 16 }}>
          Already have an account?{' '}
          <button
            onClick={() => navigate('/login')}
            style={{ background: 'none', border: 'none', color: C.purple, fontFamily: 'inherit', fontSize: 12, fontWeight: 800, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}
