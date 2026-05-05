import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { Profile } from '../types/index'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const { setProfile, setSession } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /**
   * BUG-006 fix (admin): Admin login is self-sufficient — it does not rely on
   * onAuthStateChange to populate the profile. This avoids the Web Lock contention
   * that occurs when the SIGNED_IN event handler races with signInWithPassword's
   * own lock acquisition to store the auth token.
   *
   * After signInWithPassword resolves (and releases the lock), we wait 200ms then
   * fetch the profile directly. This gives the auth lock time to fully release
   * before the PostgREST query needs to read the session token.
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setLoading(false)
      setError('Invalid email or password.')
      return
    }

    // Wait for the auth token lock to fully release before querying the DB
    await new Promise(resolve => setTimeout(resolve, 250))

    // Fetch profile directly — do not depend on onAuthStateChange
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (profileError || !profileData) {
      console.error('[AdminLogin] profile fetch failed:', profileError)
      await supabase.auth.signOut()
      setError('Could not load account profile. Please try again.')
      setLoading(false)
      return
    }

    if ((profileData as Profile).role !== 'admin') {
      await supabase.auth.signOut()
      setError('Your account does not have admin privileges.')
      setLoading(false)
      return
    }

    // Hydrate Zustand store so ProtectedRoute passes immediately
    setSession(data.session)
    setProfile(profileData as Profile)
    navigate('/admin', { replace: true })
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
