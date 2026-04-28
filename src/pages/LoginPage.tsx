import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { Role } from '../types/index'
import type { Profile } from '../types/index'
import { APP_VERSION } from '../lib/version'

type LoginMode = 'teacher' | 'pupil'
type AuthMode = 'login' | 'signup'

interface FormErrors {
  email?: string
  password?: string
  pin?: string
  general?: string
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as { authMode?: AuthMode; loginMode?: LoginMode } | null
  const [loginMode, setLoginMode] = useState<LoginMode>(locationState?.loginMode ?? 'teacher')
  const [authMode, setAuthMode] = useState<AuthMode>(locationState?.authMode ?? 'login')

  // Teacher fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')

  // Pupil fields
  const [pin, setPin] = useState('')

  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const clearErrors = () => setErrors({})

  const handleRoleRedirect = (role: Role) => {
    if (role === Role.PUPIL) navigate('/dashboard', { replace: true })
    else if (role === Role.TEACHER) navigate('/teacher', { replace: true })
    else if (role === Role.SCHOOL_ADMIN) navigate('/admin', { replace: true })
    else navigate('/dashboard', { replace: true })
  }

  const handleTeacherLogin = async (e: FormEvent) => {
    e.preventDefault()
    clearErrors()

    if (!email) return setErrors({ email: 'Email is required' })
    if (!password) return setErrors({ password: 'Password is required' })

    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setErrors({ general: error.message })
        return
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()

        if (profile) {
          handleRoleRedirect((profile as Profile).role)
        } else {
          navigate('/teacher', { replace: true })
        }
      }
    } catch {
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTeacherSignup = async (e: FormEvent) => {
    e.preventDefault()
    clearErrors()

    if (!firstName.trim()) return setErrors({ email: 'First name is required' })
    if (!email) return setErrors({ email: 'Email is required' })
    if (password.length < 8) return setErrors({ password: 'Password must be at least 8 characters' })

    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { first_name: firstName, role: Role.TEACHER },
        },
      })

      if (error) {
        setErrors({ general: error.message })
        return
      }

      if (data.user) {
        setSuccessMessage(
          'Account created! Please check your email to verify your account before logging in.'
        )
        setAuthMode('login')
        setPassword('')
      }
    } catch {
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePupilPinLogin = async (e: FormEvent) => {
    e.preventDefault()
    clearErrors()

    if (!pin || pin.length < 4 || pin.length > 6) {
      return setErrors({ pin: 'PIN must be 4–6 digits' })
    }

    setIsLoading(true)
    try {
      // Each pupil has a Supabase Auth account: pupil-{pin}@wrife.school / password = pin
      const email = `pupil-${pin}@wrife.school`
      const { error } = await supabase.auth.signInWithPassword({ email, password: pin })

      if (error) {
        setErrors({ pin: 'Invalid PIN. Please check with your teacher.' })
        return
      }

      // AuthInitialiser's onAuthStateChange picks up the new session,
      // fetches the profile, and populates the store — then ProtectedRoute
      // allows /dashboard access automatically.
      navigate('/dashboard', { replace: true })
    } catch {
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const wordClasses = [
    { label: 'Det', color: 'var(--color-determiner)' },
    { label: 'Adj', color: 'var(--color-adjective)' },
    { label: 'Noun', color: 'var(--color-noun)' },
    { label: 'Verb', color: 'var(--color-verb)' },
    { label: 'Adv', color: 'var(--color-adverb)' },
  ]

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: 'var(--color-background)' }}
      data-testid="login-page"
    >
      {/* Brand header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-10"
      >
        {/* Word class colour bar */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {wordClasses.map((wc) => (
            <span
              key={wc.label}
              className="px-2 py-1 rounded text-white text-xs font-semibold"
              style={{ backgroundColor: wc.color }}
              data-tts={wc.label}
            >
              {wc.label}
            </span>
          ))}
        </div>

        <h1
          className="text-5xl font-bold tracking-tight mb-2"
          style={{ color: 'var(--color-brand-dark)' }}
          data-tts="WriFe"
        >
          WriFe
        </h1>
        <p
          className="text-base"
          style={{ color: 'var(--color-text-muted)' }}
          data-tts="Progressive Writing Practice for Schools"
        >
          Progressive Writing Practice for Schools
        </p>
      </motion.div>

      {/* Role switcher */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex rounded-xl p-1 mb-6 gap-1"
        style={{ backgroundColor: 'var(--color-border)' }}
        role="tablist"
        aria-label="Login type"
      >
        {(['teacher', 'pupil'] as LoginMode[]).map((mode) => (
          <button
            key={mode}
            role="tab"
            aria-selected={loginMode === mode}
            onClick={() => {
              setLoginMode(mode)
              clearErrors()
              setSuccessMessage('')
            }}
            className="px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 capitalize min-w-[110px]"
            style={{
              backgroundColor: loginMode === mode ? 'var(--color-brand-secondary)' : 'transparent',
              color:
                loginMode === mode ? 'var(--color-text-light)' : 'var(--color-text-muted)',
              boxShadow: loginMode === mode ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
            }}
            data-testid={`tab-${mode}`}
            data-tts={`${mode} login`}
          >
            {mode === 'teacher' ? 'Teacher / Admin' : 'Pupil'}
          </button>
        ))}
      </motion.div>

      {/* Login card + mascot wrapper */}
      <div className="w-full max-w-md flex items-end gap-4">
        {/* Mascot beside the card */}
        <div className="hidden sm:flex flex-col items-center justify-end pb-4 flex-shrink-0">
          <img
            src="/mascot/mascot_std_1.png"
            alt=""
            aria-hidden="true"
            style={{ height: '120px', width: 'auto' }}
          />
        </div>

      {/* Login card */}
      <motion.div
        key={loginMode}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="flex-1 rounded-2xl p-8 shadow-lg"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(26, 58, 92, 0.12)',
        }}
        data-testid="login-card"
      >
        {loginMode === 'teacher' ? (
          <>
            {/* Teacher/Admin auth mode switcher */}
            <div className="flex gap-4 mb-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
              {(['login', 'signup'] as AuthMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setAuthMode(mode)
                    clearErrors()
                    setSuccessMessage('')
                  }}
                  className="pb-3 text-sm font-semibold capitalize transition-colors"
                  style={{
                    color:
                      authMode === mode
                        ? 'var(--color-brand-primary)'
                        : 'var(--color-text-muted)',
                    borderBottom:
                      authMode === mode
                        ? '2px solid var(--color-brand-primary)'
                        : '2px solid transparent',
                  }}
                  data-testid={`auth-mode-${mode}`}
                  data-tts={mode === 'login' ? 'Sign in' : 'Create account'}
                >
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            {successMessage && (
              <div
                className="mb-4 p-3 rounded-lg text-sm"
                style={{
                  backgroundColor: '#DCFCE7',
                  color: '#166534',
                  border: '1px solid #BBF7D0',
                }}
                data-testid="success-message"
                data-tts={successMessage}
              >
                {successMessage}
              </div>
            )}

            {errors.general && (
              <div
                className="mb-4 p-3 rounded-lg text-sm"
                style={{
                  backgroundColor: '#FEE2E2',
                  color: '#991B1B',
                  border: '1px solid #FECACA',
                }}
                data-testid="error-general"
                data-tts={errors.general}
              >
                {errors.general}
              </div>
            )}

            <form
              onSubmit={authMode === 'login' ? handleTeacherLogin : handleTeacherSignup}
              className="space-y-4"
              data-testid="teacher-form"
              noValidate
            >
              {authMode === 'signup' && (
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium mb-1"
                    style={{ color: 'var(--color-text)' }}
                  >
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Your first name"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{
                      backgroundColor: 'var(--color-background)',
                      border: '1.5px solid var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = 'var(--color-brand-primary)')
                    }
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                    data-testid="input-firstname"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--color-text)' }}
                >
                  School Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.edu"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    border: `1.5px solid ${errors.email ? 'var(--color-verb)' : 'var(--color-border)'}`,
                    color: 'var(--color-text)',
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = 'var(--color-brand-primary)')
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = errors.email
                      ? 'var(--color-verb)'
                      : 'var(--color-border)')
                  }
                  data-testid="input-email"
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p
                    id="email-error"
                    className="mt-1 text-xs"
                    style={{ color: 'var(--color-verb)' }}
                    data-tts={errors.email}
                  >
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--color-text)' }}
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={authMode === 'login' ? '••••••••' : 'At least 8 characters'}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    border: `1.5px solid ${errors.password ? 'var(--color-verb)' : 'var(--color-border)'}`,
                    color: 'var(--color-text)',
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = 'var(--color-brand-primary)')
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = errors.password
                      ? 'var(--color-verb)'
                      : 'var(--color-border)')
                  }
                  data-testid="input-password"
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  aria-invalid={!!errors.password}
                />
                {errors.password && (
                  <p
                    id="password-error"
                    className="mt-1 text-xs"
                    style={{ color: 'var(--color-verb)' }}
                    data-tts={errors.password}
                  >
                    {errors.password}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60 mt-2"
                style={{ backgroundColor: 'var(--color-brand-primary)' }}
                data-testid="submit-teacher"
                data-tts={authMode === 'login' ? 'Sign in' : 'Create account'}
              >
                {isLoading
                  ? 'Please wait…'
                  : authMode === 'login'
                    ? 'Sign In'
                    : 'Create Account'}
              </button>
            </form>
          </>
        ) : (
          <>
            {/* Pupil PIN login */}
            <div className="text-center mb-6">
              <h2
                className="text-xl font-bold mb-1"
                style={{ color: 'var(--color-text)' }}
                data-tts="Enter your PIN"
              >
                Enter Your PIN
              </h2>
              <p
                className="text-sm"
                style={{ color: 'var(--color-text-muted)' }}
                data-tts="Your teacher will give you a 4 to 6 digit PIN"
              >
                Your teacher will give you a 4–6 digit PIN
              </p>
            </div>

            {errors.general && (
              <div
                className="mb-4 p-3 rounded-lg text-sm"
                style={{
                  backgroundColor: '#FEE2E2',
                  color: '#991B1B',
                  border: '1px solid #FECACA',
                }}
                data-testid="error-general-pupil"
                data-tts={errors.general}
              >
                {errors.general}
              </div>
            )}

            <form
              onSubmit={handlePupilPinLogin}
              className="space-y-6"
              data-testid="pupil-form"
              noValidate
            >
              <div>
                <label htmlFor="pin" className="sr-only">
                  PIN Code
                </label>
                <input
                  id="pin"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="0 0 0 0"
                  className="w-full text-center text-3xl font-bold tracking-[0.5em] px-4 py-4 rounded-xl outline-none transition-all"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    border: `2px solid ${errors.pin ? 'var(--color-verb)' : 'var(--color-brand-primary)'}`,
                    color: 'var(--color-text)',
                    letterSpacing: '0.4em',
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = 'var(--color-brand-secondary)')
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = errors.pin
                      ? 'var(--color-verb)'
                      : 'var(--color-brand-primary)')
                  }
                  data-testid="input-pin"
                  aria-describedby={errors.pin ? 'pin-error' : undefined}
                  aria-invalid={!!errors.pin}
                  data-tts="PIN entry field"
                />
                {errors.pin && (
                  <p
                    id="pin-error"
                    className="mt-2 text-sm text-center"
                    style={{ color: 'var(--color-verb)' }}
                    data-tts={errors.pin}
                  >
                    {errors.pin}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || pin.length < 4}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                style={{ backgroundColor: 'var(--color-brand-secondary)' }}
                data-testid="submit-pin"
                data-tts="Enter classroom"
              >
                {isLoading ? 'Checking…' : 'Enter Classroom'}
              </button>
            </form>
          </>
        )}
      </motion.div>
      </div>{/* end login card + mascot wrapper */}

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-xs"
        style={{ color: 'var(--color-text-muted)' }}
        data-tts="WriFe helps every pupil build confident writing skills"
      >
        WriFe v{APP_VERSION} · Built with ❤️ for UK schools
      </motion.p>
    </div>
  )
}
