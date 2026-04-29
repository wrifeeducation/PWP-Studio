/**
 * /update-password — set a new password after clicking a recovery/invite email link.
 * Only reachable after verifyOtp has run on /auth/confirm.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function UpdatePasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    // Confirm there's an active session (set by verifyOtp on /auth/confirm)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/login', { replace: true })
      else setHasSession(true)
    })
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setSaving(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setDone(true)
    setTimeout(() => navigate('/login', { replace: true }), 2500)
  }

  if (!hasSession) return null

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="text-3xl font-extrabold cursor-pointer hover:opacity-75 transition-opacity"
            style={{ color: 'var(--color-brand-dark)', background: 'none', border: 'none', padding: 0 }}
          >
            WriFe
          </button>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Writing for Everyone</p>
          <h1 className="text-xl font-bold mt-4" style={{ color: 'var(--color-brand-dark)' }}>
            {done ? 'Password updated!' : 'Choose a new password'}
          </h1>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          {done ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">✓</div>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Your password has been updated. Taking you to login…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div
                  className="p-3 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'rgba(220,38,38,0.08)',
                    border: '1px solid rgba(220,38,38,0.3)',
                    color: '#dc2626',
                  }}
                >
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  New password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  required
                  className="rounded-lg px-4 py-2.5 text-sm outline-none transition-colors"
                  style={{
                    border: '1.5px solid var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  required
                  className="rounded-lg px-4 py-2.5 text-sm outline-none transition-colors"
                  style={{
                    border: '1.5px solid var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-50 mt-2"
                style={{ backgroundColor: 'var(--color-brand-secondary)' }}
              >
                {saving ? 'Saving…' : 'Set new password'}
              </button>
            </form>
          )}
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-sm hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← Back to login
          </button>
        </div>
      </div>
    </div>
  )
}
