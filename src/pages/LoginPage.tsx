import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { Role } from '../types/index'
import type { Profile } from '../types/index'
import { APP_VERSION } from '../lib/version'
import { WritzAvatar } from '../components/WritzAvatar'
import type { AvatarVariantId } from '../components/WritzAvatar'

// null = role-selection screen; 'teacher'/'pupil'/'parent' = form screen
type LoginMode = 'teacher' | 'pupil' | 'parent' | null
type AuthMode = 'login' | 'signup'
// Multi-step parent onboarding: auth first, then child details
type ParentStep = 'auth' | 'child-profile'

interface FormErrors {
  email?: string
  password?: string
  classCode?: string
  username?: string
  pin?: string
  childName?: string
  general?: string
}

// ── Small inline SVG icons ──────────────────────────────────────────────────

const PupilIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
    <circle cx="11" cy="6.5" r="3.5" fill="white" />
    <path d="M3 19c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const TeacherIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
    <rect x="5" y="3" width="12" height="16" rx="2" stroke="white" strokeWidth="1.8" />
    <line x1="8" y1="8" x2="14" y2="8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="8" y1="11" x2="14" y2="11" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="8" y1="14" x2="12" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

const ParentIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
    <circle cx="7.5" cy="6" r="3" fill="white" />
    <circle cx="15" cy="7.5" r="2.3" fill="white" fillOpacity="0.75" />
    <path d="M1 19c0-3.6 2.9-6.5 6.5-6.5S14 15.4 14 19" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M14 13.5c2.5 0 4.5 1.8 4.5 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.75" />
  </svg>
)

const BackArrow = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// ── Constants ────────────────────────────────────────────────────────────────

// Avatar variant previews shown on the pupil card
const AVATAR_PREVIEWS: AvatarVariantId[] = ['wizard', 'royal', 'explorer']

// Year groups KS1–KS3
const YEAR_GROUPS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

// ── Component ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as { authMode?: AuthMode; loginMode?: LoginMode } | null

  // Start at null (card selection) unless directed here with a specific role
  const [loginMode, setLoginMode] = useState<LoginMode>(locationState?.loginMode ?? null)
  const [authMode, setAuthMode] = useState<AuthMode>(locationState?.authMode ?? 'login')

  // Parent multi-step flow
  const [parentStep, setParentStep] = useState<ParentStep>('auth')
  const [childNickname, setChildNickname] = useState('')
  const [childYearGroup, setChildYearGroup] = useState<number>(1)

  // Teacher / parent fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')

  // Pupil fields — school mode
  const [classCode, setClassCode] = useState('')
  const [pupilUsername, setPupilUsername] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [loginAvatar] = useState<AvatarVariantId>('wizard')
  // Pupil fields — home learner mode
  const [pupilMode, setPupilMode] = useState<'school' | 'home'>('school')
  const [homeCode, setHomeCode] = useState('')

  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const clearErrors = () => setErrors({})

  const handleForgotPassword = async () => {
    if (!email.trim()) { setErrors({ email: 'Enter your email address first.' }); return }
    setResetLoading(true)
    const redirectTo = `${window.location.origin}/auth/confirm`
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
    setResetLoading(false)
    setResetSent(true)
  }

  const selectRole = (mode: 'teacher' | 'pupil' | 'parent') => {
    setLoginMode(mode)
    setParentStep('auth')
    clearErrors()
    setSuccessMessage('')
  }

  const goBack = () => {
    // Within parent flow: child-profile step → go back to auth step
    if (loginMode === 'parent' && parentStep === 'child-profile') {
      setParentStep('auth')
      clearErrors()
      return
    }
    setLoginMode(null)
    setParentStep('auth')
    clearErrors()
    setSuccessMessage('')
  }

  const handleRoleRedirect = (role: Role) => {
    if (role === Role.PUPIL) navigate('/welcome', { replace: true })
    else if (role === Role.TEACHER) navigate('/teacher', { replace: true })
    else if (role === Role.SCHOOL_ADMIN) navigate('/staffhub', { replace: true })
    else if (role === Role.PARENT) navigate('/parent', { replace: true })
    else navigate('/dashboard', { replace: true })
  }

  // ── Teacher handlers ──────────────────────────────────────────────────────

  const handleTeacherLogin = async (e: FormEvent) => {
    e.preventDefault()
    clearErrors()
    if (!email) return setErrors({ email: 'Email is required' })
    if (!password) return setErrors({ password: 'Password is required' })
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        const msg = error.message.toLowerCase()
        if (msg.includes('invalid login') || msg.includes('invalid credentials') || msg.includes('wrong password')) {
          setErrors({ general: 'Incorrect email or password. Please try again.' })
        } else if (msg.includes('email not confirmed')) {
          setErrors({ general: 'Please verify your email before signing in. Check your inbox for the confirmation link.' })
        } else {
          setErrors({ general: 'Incorrect email or password. Please try again.' })
        }
        return
      }
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles').select('role').eq('id', data.user.id).single()
        if (profile) handleRoleRedirect((profile as Profile).role)
        else navigate('/teacher', { replace: true })
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
        email, password,
        options: {
          data: { first_name: firstName, role: Role.TEACHER },
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      })
      if (error) {
        const msg = error.message.toLowerCase()
        if (msg.includes('already registered') || msg.includes('user already exists')) {
          setErrors({ general: 'An account with this email already exists. Try signing in instead.' })
        } else if (msg.includes('rate limit')) {
          setErrors({ general: 'Too many attempts. Please wait a moment and try again.' })
        } else {
          setErrors({ general: error.message })
        }
        return
      }
      if (data.user) {
        setSuccessMessage('Account created! Please check your email to verify your account before logging in.')
        setAuthMode('login')
        setPassword('')
      }
    } catch {
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  // ── Pupil handler ─────────────────────────────────────────────────────────

  const handlePupilPinLogin = async (e: FormEvent) => {
    e.preventDefault()
    clearErrors()

    // Validate all three fields
    const newErrors: FormErrors = {}
    if (!classCode.trim()) newErrors.classCode = 'Enter your class code'
    if (!pupilUsername.trim()) newErrors.username = 'Enter your username'
    if (!pin || pin.length !== 4) newErrors.pin = 'PIN must be 4 digits'
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    setIsLoading(true)
    try {
      // Call the Platform pupil-login Edge Function
      const { data, error } = await supabase.functions.invoke('pupil-login', {
        body: {
          class_code: classCode.trim().toUpperCase(),
          username: pupilUsername.trim().toLowerCase(),
          pin: pin.trim(),
        },
      })

      if (error) {
        setErrors({ general: 'Could not connect. Please try again.' })
        return
      }

      if (data?.error) {
        const msg: string = data.error as string

        // Map specific errors to the relevant field
        if (msg.toLowerCase().includes('class')) {
          setErrors({ classCode: msg })
        } else if (msg.toLowerCase().includes('name') || msg.toLowerCase().includes('username')) {
          setErrors({ username: msg })
        } else if (msg.toLowerCase().includes('pin') || msg.toLowerCase().includes('incorrect')) {
          setErrors({ pin: msg })
        } else {
          setErrors({ general: msg })
        }
        return
      }

      // Establish Supabase auth session from the returned tokens
      // Edge Function returns { session: { access_token, refresh_token }, pupil: {...} }
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token as string,
        refresh_token: data.session.refresh_token as string,
      })

      if (sessionError) {
        setErrors({ general: 'Login succeeded but session could not be established. Please try again.' })
        return
      }

      navigate('/welcome', { replace: true })
    } catch {
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  // ── Home learner handler ──────────────────────────────────────────────────

  const handleHomeLearnerLogin = async (e: FormEvent) => {
    e.preventDefault()
    clearErrors()
    if (!homeCode || homeCode.length !== 6) {
      setErrors({ pin: 'Home code must be 6 digits' })
      return
    }
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: `home-${homeCode}@wrife.school`,
        password: homeCode,
      })
      if (error) {
        setErrors({ general: 'Incorrect home code. Ask your parent to check the code in their WriFe account.' })
        return
      }
      if (data.user) navigate('/welcome', { replace: true })
    } catch {
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  // ── Parent handlers ───────────────────────────────────────────────────────

  const handleParentLogin = async (e: FormEvent) => {
    e.preventDefault()
    clearErrors()
    if (!email) return setErrors({ email: 'Email is required' })
    if (!password) return setErrors({ password: 'Password is required' })
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        const msg = error.message.toLowerCase()
        if (msg.includes('invalid login') || msg.includes('invalid credentials') || msg.includes('wrong password')) {
          setErrors({ general: 'Incorrect email or password. Please try again.' })
        } else if (msg.includes('email not confirmed')) {
          setErrors({ general: 'Please verify your email before signing in. Check your inbox for the confirmation link.' })
        } else {
          setErrors({ general: 'Incorrect email or password. Please try again.' })
        }
        return
      }
      if (data.user) navigate('/parent', { replace: true })
    } catch {
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleParentSignup = async (e: FormEvent) => {
    e.preventDefault()
    clearErrors()
    if (!firstName.trim()) return setErrors({ email: 'First name is required' })
    if (!email) return setErrors({ email: 'Email is required' })
    if (password.length < 8) return setErrors({ password: 'Password must be at least 8 characters' })
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { first_name: firstName, role: Role.PARENT },
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      })
      if (error) {
        const msg = error.message.toLowerCase()
        if (msg.includes('already registered') || msg.includes('user already exists')) {
          setErrors({ general: 'An account with this email already exists. Try signing in instead.' })
        } else if (msg.includes('rate limit')) {
          setErrors({ general: 'Too many attempts. Please wait a moment and try again.' })
        } else {
          setErrors({ general: error.message })
        }
        return
      }
      if (data.user) {
        // Account created — move to child profile step
        setParentStep('child-profile')
      }
    } catch {
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChildProfileNext = (e: FormEvent) => {
    e.preventDefault()
    clearErrors()
    if (!childNickname.trim()) return setErrors({ childName: "Please enter your child's name or nickname" })
    // Store pending child details — the parent dashboard picks these up on first load
    // and creates the child profile via the create-child-profile Edge Function
    sessionStorage.setItem(
      'wrife_pending_child',
      JSON.stringify({ nickname: childNickname.trim(), year_group: childYearGroup }),
    )
    navigate('/pricing', { replace: true })
  }

  // ── Colour helpers ────────────────────────────────────────────────────────

  const wordClasses = [
    { label: 'Det', color: 'var(--color-determiner)' },
    { label: 'Adj', color: 'var(--color-adjective)' },
    { label: 'Noun', color: 'var(--color-noun)' },
    { label: 'Verb', color: 'var(--color-verb)' },
    { label: 'Adv', color: 'var(--color-adverb)' },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: 'var(--color-background)' }}
      data-testid="login-page"
    >
      {/* ── Brand header (always visible) ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-8"
      >
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
          className="text-5xl font-bold tracking-tight mb-2 cursor-pointer hover:opacity-75 transition-opacity"
          style={{ color: 'var(--color-brand-dark)' }}
          data-tts="WriFe — go to home page"
          onClick={() => navigate('/')}
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/')}
          role="link"
          aria-label="WriFe — go to home page"
        >
          WriFe
        </h1>
        <AnimatePresence>
          {loginMode === null && (
            <motion.p
              key="subtitle"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="text-base"
              style={{ color: 'var(--color-text-muted)' }}
              data-tts="Progressive Writing Practice for Schools"
            >
              Progressive Writing Practice for Schools
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Role selection cards ── */}
      <AnimatePresence mode="wait">
        {loginMode === null && (
          <motion.div
            key="role-cards"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md"
          >
            <p
              className="text-xs font-semibold tracking-widest text-center mb-4 uppercase"
              style={{ color: 'var(--color-text-muted)' }}
              data-tts="Who's logging in today?"
            >
              Who's logging in today?
            </p>

            {/* Top row: Pupil + Teacher */}
            <div className="flex gap-3 mb-3">
              {/* ── Pupil card ── */}
              <motion.button
                onClick={() => selectRole('pupil')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 text-left rounded-2xl p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                style={{ backgroundColor: '#F5A623' }}
                data-testid="role-card-pupil"
                aria-label="I'm a pupil — enter PIN"
                data-tts="I am a pupil, start my adventure"
              >
                <div
                  className="flex items-center justify-center mb-3 rounded-xl"
                  style={{ width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.25)' }}
                  aria-hidden="true"
                >
                  <PupilIcon />
                </div>

                <p
                  className="text-xs font-semibold tracking-widest uppercase mb-1"
                  style={{ color: 'rgba(255,255,255,0.75)' }}
                >
                  FOR PUPILS
                </p>
                <p className="text-lg font-bold leading-snug mb-3" style={{ color: '#fff' }}>
                  I'm a pupil
                </p>

                {/* Avatar row */}
                <div className="flex gap-1 mb-3" aria-hidden="true">
                  {AVATAR_PREVIEWS.map((variant) => (
                    <div
                      key={variant}
                      className="rounded-full flex items-center justify-center overflow-hidden"
                      style={{
                        width: 28, height: 28,
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        border: '1.5px solid rgba(255,255,255,0.5)',
                      }}
                    >
                      <WritzAvatar variant={variant} size={22} />
                    </div>
                  ))}
                  <div
                    className="rounded-full flex items-center justify-center"
                    style={{ width: 28, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' }}
                  >
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>+</span>
                  </div>
                </div>

                <span
                  className="inline-block text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#B8791A' }}
                >
                  Enter PIN →
                </span>
              </motion.button>

              {/* ── Teacher card ── */}
              <motion.button
                onClick={() => selectRole('teacher')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 text-left rounded-2xl p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                style={{ backgroundColor: '#4B3AB0' }}
                data-testid="role-card-teacher"
                aria-label="I'm a teacher — sign in"
                data-tts="I am a teacher, sign in or create account"
              >
                <div
                  className="flex items-center justify-center mb-3 rounded-xl"
                  style={{ width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.18)' }}
                  aria-hidden="true"
                >
                  <TeacherIcon />
                </div>

                <p
                  className="text-xs font-semibold tracking-widest uppercase mb-1"
                  style={{ color: 'rgba(255,255,255,0.65)' }}
                >
                  FOR TEACHERS
                </p>
                <p className="text-lg font-bold leading-snug mb-3" style={{ color: '#fff' }}>
                  I'm a teacher
                </p>

                <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  Email + password
                </p>

                <span
                  className="inline-block text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#3A2B8E' }}
                >
                  Sign in →
                </span>
              </motion.button>
            </div>

            {/* Bottom row: Parent card (full width, slightly subdued) */}
            <motion.button
              onClick={() => selectRole('parent')}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full text-left rounded-2xl px-5 py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-white flex items-center gap-4"
              style={{ backgroundColor: '#059669' }}
              data-testid="role-card-parent"
              aria-label="I'm a parent — track my child's progress"
              data-tts="I am a parent, track my child's progress"
            >
              <div
                className="flex-shrink-0 flex items-center justify-center rounded-xl"
                style={{ width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' }}
                aria-hidden="true"
              >
                <ParentIcon />
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-semibold tracking-widest uppercase mb-0.5"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  FOR PARENTS
                </p>
                <p className="text-base font-bold leading-snug" style={{ color: '#fff' }}>
                  I'm a parent
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Track your child's writing progress at home
                </p>
              </div>

              <span
                className="flex-shrink-0 inline-block text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#047857' }}
              >
                Get started →
              </span>
            </motion.button>

            {/* Mascot */}
            <div className="flex justify-center mt-5" aria-hidden="true">
              <img
                src="/mascot/mascot_std_1.png"
                alt=""
                style={{ height: 80, width: 'auto', opacity: 0.9 }}
              />
            </div>
          </motion.div>
        )}

        {/* ── Login / signup form ── */}
        {loginMode !== null && (
          <motion.div
            key={`form-${loginMode}-${parentStep}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.28 }}
            className="w-full max-w-md"
          >
            {/* Back button */}
            <button
              onClick={goBack}
              className="flex items-center gap-1.5 mb-4 text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-text-muted)' }}
              data-testid="back-to-roles"
              data-tts="Back"
            >
              <BackArrow />
              {loginMode === 'parent' && parentStep === 'child-profile' ? 'Back' : 'Back'}
            </button>

            {/* Card + optional mascot side-by-side */}
            <div className="flex items-end gap-4">
              {loginMode === 'teacher' && (
                <div className="hidden sm:flex flex-col items-center justify-end pb-4 flex-shrink-0" aria-hidden="true">
                  <img
                    src="/mascot/mascot_std_1.png"
                    alt=""
                    style={{ height: 120, width: 'auto' }}
                  />
                </div>
              )}

              {/* Form card */}
              <div
                className="flex-1 rounded-2xl p-8 shadow-lg"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 16,
                  boxShadow: '0 4px 16px rgba(26, 58, 92, 0.12)',
                }}
                data-testid="login-card"
              >
                {/* Role indicator pill */}
                <div className="flex items-center gap-2 mb-5">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
                    style={{
                      backgroundColor:
                        loginMode === 'pupil'
                          ? 'rgba(245,166,35,0.15)'
                          : loginMode === 'teacher'
                          ? 'rgba(75,58,176,0.12)'
                          : 'rgba(5,150,105,0.12)',
                      color:
                        loginMode === 'pupil'
                          ? '#B8791A'
                          : loginMode === 'teacher'
                          ? '#4B3AB0'
                          : '#047857',
                    }}
                  >
                    {loginMode === 'pupil'
                      ? '🎒 Pupil'
                      : loginMode === 'teacher'
                      ? '📋 Teacher / Admin'
                      : '🏠 Parent'}
                  </span>

                  {/* Step indicator for parent multi-step */}
                  {loginMode === 'parent' && (
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      Step {parentStep === 'auth' ? '1' : '2'} of 2
                    </span>
                  )}
                </div>

                {/* ══════════════════════════════════════════════════════════ */}
                {/* TEACHER FORM                                               */}
                {/* ══════════════════════════════════════════════════════════ */}
                {loginMode === 'teacher' && (
                  <>
                    <div className="flex gap-4 mb-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
                      {(['login', 'signup'] as AuthMode[]).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => { setAuthMode(mode); clearErrors(); setSuccessMessage('') }}
                          className="pb-3 text-sm font-semibold capitalize transition-colors"
                          style={{
                            color: authMode === mode ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
                            borderBottom: authMode === mode ? '2px solid var(--color-brand-primary)' : '2px solid transparent',
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
                        style={{ backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0' }}
                        data-testid="success-message"
                        data-tts={successMessage}
                      >
                        {successMessage}
                      </div>
                    )}

                    {errors.general && (
                      <div
                        className="mb-4 p-3 rounded-lg text-sm"
                        style={{ backgroundColor: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' }}
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
                          <label htmlFor="firstName" className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
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
                            style={{ backgroundColor: 'var(--color-background)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-brand-primary)')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                            data-testid="input-firstname"
                          />
                        </div>
                      )}

                      <div>
                        <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
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
                          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-brand-primary)')}
                          onBlur={(e) => (e.currentTarget.style.borderColor = errors.email ? 'var(--color-verb)' : 'var(--color-border)')}
                          data-testid="input-email"
                          aria-describedby={errors.email ? 'email-error' : undefined}
                          aria-invalid={!!errors.email}
                        />
                        {errors.email && (
                          <p id="email-error" className="mt-1 text-xs" style={{ color: 'var(--color-verb)' }} data-tts={errors.email}>
                            {errors.email}
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
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
                          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-brand-primary)')}
                          onBlur={(e) => (e.currentTarget.style.borderColor = errors.password ? 'var(--color-verb)' : 'var(--color-border)')}
                          data-testid="input-password"
                          aria-describedby={errors.password ? 'password-error' : undefined}
                          aria-invalid={!!errors.password}
                        />
                        {errors.password && (
                          <p id="password-error" className="mt-1 text-xs" style={{ color: 'var(--color-verb)' }} data-tts={errors.password}>
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
                        {isLoading ? 'Please wait…' : authMode === 'login' ? 'Sign In' : 'Create Account'}
                      </button>

                      {authMode === 'login' && (
                        <div className="text-center mt-3">
                          {resetSent ? (
                            <p className="text-xs" style={{ color: 'var(--color-brand-success)' }}>
                              ✓ Reset link sent — check your email (including spam)
                            </p>
                          ) : (
                            <button
                              type="button"
                              onClick={handleForgotPassword}
                              disabled={resetLoading}
                              className="text-xs hover:underline transition-opacity disabled:opacity-50"
                              style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                              data-tts="Forgot password"
                            >
                              {resetLoading ? 'Sending…' : 'Forgot password?'}
                            </button>
                          )}
                        </div>
                      )}
                    </form>
                  </>
                )}

                {/* ══════════════════════════════════════════════════════════ */}
                {/* PUPIL PIN FORM                                             */}
                {/* ══════════════════════════════════════════════════════════ */}
                {loginMode === 'pupil' && (
                  <>
                    <div className="text-center mb-5">
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                        className="flex justify-center mb-3"
                      >
                        <div
                          style={{
                            background: '#EDE7F6',
                            border: '3px solid #6C5CE7',
                            borderRadius: '50%',
                            width: 80, height: 80,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                          aria-hidden="true"
                        >
                          <WritzAvatar variant={loginAvatar} size={60} animated />
                        </div>
                      </motion.div>

                      <h2
                        className="text-xl font-bold mb-1"
                        style={{ color: 'var(--color-text)' }}
                        data-tts="Log in"
                      >
                        Hey there! Log In
                      </h2>
                    </div>

                    {/* School / Home toggle */}
                    <div
                      className="flex gap-1 p-1 rounded-xl mb-5"
                      style={{ backgroundColor: 'var(--color-background)' }}
                      role="group"
                      aria-label="Choose how you practise"
                    >
                      {(['school', 'home'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => { setPupilMode(mode); clearErrors() }}
                          className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                          style={{
                            backgroundColor: pupilMode === mode ? '#F5A623' : 'transparent',
                            color: pupilMode === mode ? '#fff' : 'var(--color-text-muted)',
                          }}
                          data-testid={`pupil-mode-${mode}`}
                          data-tts={mode === 'school' ? 'School pupil' : 'Home learner'}
                        >
                          {mode === 'school' ? '🏫 School' : '🏠 Home learner'}
                        </button>
                      ))}
                    </div>

                    {errors.general && (
                      <div
                        className="mb-4 p-3 rounded-lg text-sm"
                        style={{ backgroundColor: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' }}
                        data-testid="error-general-pupil"
                        data-tts={errors.general}
                      >
                        {errors.general}
                      </div>
                    )}

                    {/* ── Home learner form ── */}
                    {pupilMode === 'home' && (
                      <form onSubmit={handleHomeLearnerLogin} className="space-y-4" data-testid="home-learner-form" noValidate>
                        <div>
                          <label
                            htmlFor="homeCode"
                            className="block text-sm font-medium mb-1"
                            style={{ color: 'var(--color-text)' }}
                            data-tts="Home code — six digits"
                          >
                            Home Code
                          </label>
                          <input
                            id="homeCode"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            value={homeCode}
                            onChange={(e) => setHomeCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="0 0 0 0 0 0"
                            className="w-full text-center text-3xl font-bold px-4 py-4 rounded-xl outline-none transition-all"
                            style={{
                              backgroundColor: 'var(--color-background)',
                              border: `2px solid ${errors.pin ? 'var(--color-verb)' : 'var(--color-brand-primary)'}`,
                              color: 'var(--color-text)',
                              letterSpacing: '0.4em',
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-brand-secondary)')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = errors.pin ? 'var(--color-verb)' : 'var(--color-brand-primary)')}
                            data-testid="input-home-code"
                            aria-describedby={errors.pin ? 'home-code-error' : 'home-code-hint'}
                            aria-invalid={!!errors.pin}
                            data-tts="Home code field"
                          />
                          {errors.pin ? (
                            <p id="home-code-error" className="mt-1 text-xs text-center" style={{ color: 'var(--color-verb)' }} data-tts={errors.pin}>
                              {errors.pin}
                            </p>
                          ) : (
                            <p id="home-code-hint" className="mt-1 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
                              Your parent can find this code in their WriFe account
                            </p>
                          )}
                        </div>

                        <motion.button
                          type="submit"
                          disabled={isLoading || homeCode.length < 6}
                          className="w-full rounded-xl font-extrabold text-white"
                          style={{
                            fontSize: 'var(--pwp-text-base)',
                            minHeight: 52,
                            padding: '14px 24px',
                            background: (isLoading || homeCode.length < 6) ? '#d1d5db' : '#F5A623',
                            boxShadow: (isLoading || homeCode.length < 6) ? '0 4px 0 0 #9ca3af' : '0 4px 0 0 #c47a0a',
                            color: (isLoading || homeCode.length < 6) ? '#6b7280' : '#fff',
                            cursor: (isLoading || homeCode.length < 6) ? 'not-allowed' : 'pointer',
                            transition: 'background 0.15s, box-shadow 0.15s, color 0.15s',
                          }}
                          whileTap={!(isLoading || homeCode.length < 6) ? { y: 4, boxShadow: '0 0 0 0 transparent' } : {}}
                          data-testid="submit-home-code"
                          data-tts="Log in with home code"
                        >
                          {isLoading ? 'Checking…' : "Let's go! →"}
                        </motion.button>
                      </form>
                    )}

                    {/* ── School pupil form ── */}
                    {pupilMode === 'school' && (
                    <form onSubmit={handlePupilPinLogin} className="space-y-4" data-testid="pupil-form" noValidate>
                      {/* Class Code */}
                      <div>
                        <label htmlFor="classCode" className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}
                          data-tts="Class code">
                          Class Code
                        </label>
                        <input
                          id="classCode"
                          type="text"
                          autoComplete="off"
                          value={classCode}
                          onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                          placeholder="e.g. SIL42"
                          className="w-full text-center text-lg font-bold tracking-widest px-4 py-3 rounded-xl outline-none transition-all uppercase"
                          style={{
                            backgroundColor: 'var(--color-background)',
                            border: `2px solid ${errors.classCode ? 'var(--color-verb)' : 'var(--color-border)'}`,
                            color: 'var(--color-text)',
                          }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-brand-primary)')}
                          onBlur={(e) => (e.currentTarget.style.borderColor = errors.classCode ? 'var(--color-verb)' : 'var(--color-border)')}
                          data-testid="input-class-code"
                          aria-describedby={errors.classCode ? 'class-code-error' : undefined}
                          aria-invalid={!!errors.classCode}
                          data-tts="Class code field"
                        />
                        {errors.classCode && (
                          <p id="class-code-error" className="mt-1 text-xs text-center" style={{ color: 'var(--color-verb)' }} data-tts={errors.classCode}>
                            {errors.classCode}
                          </p>
                        )}
                      </div>

                      {/* Username */}
                      <div>
                        <label htmlFor="pupilUsername" className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}
                          data-tts="Username">
                          Username
                        </label>
                        <input
                          id="pupilUsername"
                          type="text"
                          autoComplete="username"
                          value={pupilUsername}
                          onChange={(e) => setPupilUsername(e.target.value)}
                          placeholder="Your username"
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                          style={{
                            backgroundColor: 'var(--color-background)',
                            border: `2px solid ${errors.username ? 'var(--color-verb)' : 'var(--color-border)'}`,
                            color: 'var(--color-text)',
                          }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-brand-primary)')}
                          onBlur={(e) => (e.currentTarget.style.borderColor = errors.username ? 'var(--color-verb)' : 'var(--color-border)')}
                          data-testid="input-username"
                          aria-describedby={errors.username ? 'username-error' : undefined}
                          aria-invalid={!!errors.username}
                          data-tts="Username field"
                        />
                        {errors.username && (
                          <p id="username-error" className="mt-1 text-xs" style={{ color: 'var(--color-verb)' }} data-tts={errors.username}>
                            {errors.username}
                          </p>
                        )}
                      </div>

                      {/* PIN */}
                      <div>
                        <label htmlFor="pin" className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}
                          data-tts="Four digit PIN">
                          PIN
                        </label>
                        <div className="relative">
                          <input
                            id="pin"
                            type={showPin ? 'text' : 'password'}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={4}
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                            placeholder="0 0 0 0"
                            className="w-full text-center text-3xl font-bold tracking-[0.5em] px-4 py-4 pr-12 rounded-xl outline-none transition-all"
                            style={{
                              backgroundColor: 'var(--color-background)',
                              border: `2px solid ${errors.pin ? 'var(--color-verb)' : 'var(--color-brand-primary)'}`,
                              color: 'var(--color-text)',
                              letterSpacing: '0.4em',
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-brand-secondary)')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = errors.pin ? 'var(--color-verb)' : 'var(--color-brand-primary)')}
                            data-testid="input-pin"
                            aria-describedby={errors.pin ? 'pin-error' : undefined}
                            aria-invalid={!!errors.pin}
                            data-tts="PIN entry field"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPin((v) => !v)}
                            aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-lg bg-transparent border-0 cursor-pointer p-1"
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            {showPin ? '🙈' : '👁️'}
                          </button>
                        </div>
                        <p className="mt-1.5 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}
                          data-tts="Forgotten your PIN? Ask your teacher.">
                          Forgotten your PIN? Ask your teacher.
                        </p>
                        {errors.pin && (
                          <p id="pin-error" className="mt-1 text-xs text-center" style={{ color: 'var(--color-verb)' }} data-tts={errors.pin}>
                            {errors.pin}
                          </p>
                        )}
                      </div>

                      <motion.button
                        type="submit"
                        disabled={isLoading || pin.length < 4 || !classCode.trim() || !pupilUsername.trim()}
                        className="w-full rounded-xl font-extrabold text-white mt-2"
                        style={{
                          fontSize: 'var(--pwp-text-base)',
                          minHeight: 52,
                          padding: '14px 24px',
                          background: (isLoading || pin.length < 4 || !classCode.trim() || !pupilUsername.trim())
                            ? '#d1d5db'
                            : '#F5A623',
                          boxShadow: (isLoading || pin.length < 4 || !classCode.trim() || !pupilUsername.trim())
                            ? '0 4px 0 0 #9ca3af'
                            : '0 4px 0 0 #c47a0a',
                          color: (isLoading || pin.length < 4 || !classCode.trim() || !pupilUsername.trim())
                            ? '#6b7280'
                            : '#fff',
                          cursor: (isLoading || pin.length < 4 || !classCode.trim() || !pupilUsername.trim())
                            ? 'not-allowed'
                            : 'pointer',
                          transition: 'background 0.15s, box-shadow 0.15s, color 0.15s',
                        }}
                        whileTap={
                          !(isLoading || pin.length < 4 || !classCode.trim() || !pupilUsername.trim())
                            ? { y: 4, boxShadow: '0 0 0 0 transparent' }
                            : {}
                        }
                        data-testid="submit-pin"
                        data-tts="Enter classroom"
                      >
                        {isLoading ? 'Checking…' : "Let's go! →"}
                      </motion.button>
                    </form>
                    )}
                  </>
                )}

                {/* ══════════════════════════════════════════════════════════ */}
                {/* PARENT FORM — Step 1: Email + password                    */}
                {/* ══════════════════════════════════════════════════════════ */}
                {loginMode === 'parent' && parentStep === 'auth' && (
                  <>
                    <div className="flex gap-4 mb-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
                      {(['login', 'signup'] as AuthMode[]).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => { setAuthMode(mode); clearErrors(); setSuccessMessage('') }}
                          className="pb-3 text-sm font-semibold capitalize transition-colors"
                          style={{
                            color: authMode === mode ? '#059669' : 'var(--color-text-muted)',
                            borderBottom: authMode === mode ? '2px solid #059669' : '2px solid transparent',
                          }}
                          data-testid={`parent-auth-mode-${mode}`}
                          data-tts={mode === 'login' ? 'Sign in' : 'Create account'}
                        >
                          {mode === 'login' ? 'Sign In' : 'Create Account'}
                        </button>
                      ))}
                    </div>

                    {errors.general && (
                      <div
                        className="mb-4 p-3 rounded-lg text-sm"
                        style={{ backgroundColor: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' }}
                        data-testid="error-general-parent"
                        data-tts={errors.general}
                      >
                        {errors.general}
                      </div>
                    )}

                    <form
                      onSubmit={authMode === 'login' ? handleParentLogin : handleParentSignup}
                      className="space-y-4"
                      data-testid="parent-form"
                      noValidate
                    >
                      {authMode === 'signup' && (
                        <div>
                          <label htmlFor="parentFirstName" className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                            Your First Name
                          </label>
                          <input
                            id="parentFirstName"
                            type="text"
                            autoComplete="given-name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Your first name"
                            className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                            style={{ backgroundColor: 'var(--color-background)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = '#059669')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                            data-testid="input-parent-firstname"
                          />
                          {errors.email && (
                            <p className="mt-1 text-xs" style={{ color: 'var(--color-verb)' }}>{errors.email}</p>
                          )}
                        </div>
                      )}

                      <div>
                        <label htmlFor="parentEmail" className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                          Email Address
                        </label>
                        <input
                          id="parentEmail"
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@email.com"
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                          style={{
                            backgroundColor: 'var(--color-background)',
                            border: `1.5px solid ${errors.email && authMode === 'login' ? 'var(--color-verb)' : 'var(--color-border)'}`,
                            color: 'var(--color-text)',
                          }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = '#059669')}
                          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                          data-testid="input-parent-email"
                        />
                      </div>

                      <div>
                        <label htmlFor="parentPassword" className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                          Password
                        </label>
                        <input
                          id="parentPassword"
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
                          onFocus={(e) => (e.currentTarget.style.borderColor = '#059669')}
                          onBlur={(e) => (e.currentTarget.style.borderColor = errors.password ? 'var(--color-verb)' : 'var(--color-border)')}
                          data-testid="input-parent-password"
                        />
                        {errors.password && (
                          <p className="mt-1 text-xs" style={{ color: 'var(--color-verb)' }}>{errors.password}</p>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60 mt-2"
                        style={{ backgroundColor: '#059669' }}
                        data-testid="submit-parent-auth"
                        data-tts={authMode === 'login' ? 'Sign in' : 'Create account'}
                      >
                        {isLoading
                          ? 'Please wait…'
                          : authMode === 'login'
                          ? 'Sign In'
                          : 'Create Account →'}
                      </button>

                      {authMode === 'login' && (
                        <div className="text-center mt-3">
                          {resetSent ? (
                            <p className="text-xs" style={{ color: 'var(--color-brand-success)' }}>
                              ✓ Reset link sent — check your email (including spam)
                            </p>
                          ) : (
                            <button
                              type="button"
                              onClick={handleForgotPassword}
                              disabled={resetLoading}
                              className="text-xs hover:underline transition-opacity disabled:opacity-50"
                              style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                              data-tts="Forgot password"
                            >
                              {resetLoading ? 'Sending…' : 'Forgot password?'}
                            </button>
                          )}
                        </div>
                      )}
                    </form>
                  </>
                )}

                {/* ══════════════════════════════════════════════════════════ */}
                {/* PARENT FORM — Step 2: Child profile                        */}
                {/* ══════════════════════════════════════════════════════════ */}
                {loginMode === 'parent' && parentStep === 'child-profile' && (
                  <>
                    <div className="text-center mb-6">
                      <div
                        className="inline-flex items-center justify-center rounded-2xl mb-3"
                        style={{ width: 56, height: 56, backgroundColor: 'rgba(5,150,105,0.1)' }}
                        aria-hidden="true"
                      >
                        <span style={{ fontSize: 28 }}>👧</span>
                      </div>
                      <h2
                        className="text-lg font-bold mb-1"
                        style={{ color: 'var(--color-text)' }}
                        data-tts="Tell us about your child"
                      >
                        Tell us about your child
                      </h2>
                      <p
                        className="text-sm"
                        style={{ color: 'var(--color-text-muted)' }}
                        data-tts="This helps us tailor the learning path to their year group"
                      >
                        This helps us tailor their learning path
                      </p>
                    </div>

                    {errors.general && (
                      <div
                        className="mb-4 p-3 rounded-lg text-sm"
                        style={{ backgroundColor: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' }}
                        data-tts={errors.general}
                      >
                        {errors.general}
                      </div>
                    )}

                    <form
                      onSubmit={handleChildProfileNext}
                      className="space-y-4"
                      data-testid="child-profile-form"
                      noValidate
                    >
                      <div>
                        <label htmlFor="childNickname" className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                          Child's name or nickname
                        </label>
                        <input
                          id="childNickname"
                          type="text"
                          autoComplete="off"
                          value={childNickname}
                          onChange={(e) => setChildNickname(e.target.value)}
                          placeholder="e.g. Lily or Lils"
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                          style={{
                            backgroundColor: 'var(--color-background)',
                            border: `1.5px solid ${errors.childName ? 'var(--color-verb)' : 'var(--color-border)'}`,
                            color: 'var(--color-text)',
                          }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = '#059669')}
                          onBlur={(e) => (e.currentTarget.style.borderColor = errors.childName ? 'var(--color-verb)' : 'var(--color-border)')}
                          data-testid="input-child-nickname"
                          aria-describedby={errors.childName ? 'child-name-error' : undefined}
                          aria-invalid={!!errors.childName}
                          data-tts="Child name or nickname"
                        />
                        {errors.childName && (
                          <p id="child-name-error" className="mt-1 text-xs" style={{ color: 'var(--color-verb)' }} data-tts={errors.childName}>
                            {errors.childName}
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="childYearGroup" className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                          School year
                        </label>
                        <select
                          id="childYearGroup"
                          value={childYearGroup}
                          onChange={(e) => setChildYearGroup(Number(e.target.value))}
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                          style={{
                            backgroundColor: 'var(--color-background)',
                            border: '1.5px solid var(--color-border)',
                            color: 'var(--color-text)',
                            appearance: 'none',
                          }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = '#059669')}
                          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                          data-testid="select-child-year"
                          data-tts="Select year group"
                        >
                          {YEAR_GROUPS.map((yr) => (
                            <option key={yr} value={yr}>
                              Year {yr}
                              {yr <= 2 ? ' (KS1)' : yr <= 6 ? ' (KS2)' : ' (KS3)'}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Free plan note */}
                      <div
                        className="rounded-xl p-3 text-xs"
                        style={{ backgroundColor: 'rgba(5,150,105,0.08)', color: '#047857' }}
                      >
                        <strong>Free plan includes</strong> access to the first 10 levels — no credit card needed.
                        You can upgrade at any time to unlock all 67 levels and AI feedback.
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity mt-2"
                        style={{ backgroundColor: '#059669' }}
                        data-testid="submit-child-profile"
                        data-tts="Continue to plans"
                      >
                        Continue to Plans →
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
