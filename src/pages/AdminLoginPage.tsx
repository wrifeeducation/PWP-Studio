import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

const ADMIN_EMAILS = [
  'mankrah@kafed.org.uk',
  'wrife.education@gmail.com',
  'miyk99@gmail.com',
  'admin@wrife-test.com',
]

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const { session, profile, isLoading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [awaitingAuth, setAwaitingAuth] = useState(false)

  // After sign-in: wait for onAuthStateChange to populate session + profile, then navigate.
  useEffect(() => {
    if (!awaitingAuth) return

    // Step 1: wait for session to appear in the store (onAuthStateChange hasn't fired yet)
    if (!session) return

    // Step 2: wait for profile fetch to complete
    if (isLoading) return

    // Step 3: profile loaded — check role
    if (profile?.role === 'admin') {
      navigate('/admin', { replace: true })
      return
    }

    if (profile) {
      // Authenticated but not an admin
      supabase.auth.signOut()
      setError('Your account does not have admin privileges.')
    } else {
      // Profile fetch failed
      supabase.auth.signOut()
      setError('Could not load account profile. Please try again.')
    }

    setAwaitingAuth(false)
    setLoading(false)
  }, [awaitingAuth, session, profile, isLoading, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!ADMIN_EMAILS.includes(email.trim().toLowerCase())) {
      setError('This email is not authorised for admin access.')
      return
    }

    setLoading(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setLoading(false)
      setError('Invalid email or password.')
      return
    }

    // Auth succeeded — useEffect watches session + profile and navigates when ready
    setAwaitingAuth(true)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a1a2e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Nunito', sans-serif",
      padding: 20,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 380,
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.35)',
            marginBottom: 6,
          }}>
            WriFe Platform
          </div>
          <div style={{
            fontSize: 22,
            fontWeight: 800,
            color: '#fff',
          }}>
            Admin Access
          </div>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16,
            padding: '28px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="admin@example.com"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 14,
                color: '#fff',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 14,
                color: '#fff',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(231,76,60,0.15)',
              border: '1px solid rgba(231,76,60,0.4)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 12,
              color: '#ff6b6b',
              fontWeight: 600,
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? 'rgba(108,92,231,0.5)' : '#6C5CE7',
              border: 'none',
              borderRadius: 10,
              padding: '12px',
              fontSize: 14,
              fontWeight: 800,
              color: '#fff',
              fontFamily: 'inherit',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 4,
            }}
          >
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>

        {/* Back link */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 11,
              color: 'rgba(255,255,255,0.3)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ← Back to home
          </button>
        </div>

      </div>
    </div>
  )
}
