/**
 * /auth/confirm — handles all Supabase email link types.
 * Reads token_hash + type from URL, calls verifyOtp, then redirects.
 *
 * Supported types:
 *   signup / magiclink → /dashboard (or role-based home)
 *   recovery / invite  → /update-password
 *   email_change       → role-based home
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type ConfirmStatus = 'verifying' | 'success' | 'error'

export default function AuthConfirmPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<ConfirmStatus>('verifying')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tokenHash = params.get('token_hash')
    const type = params.get('type') as 'signup' | 'recovery' | 'magiclink' | 'invite' | 'email_change' | null

    if (!tokenHash || !type) {
      setErrorMessage('Invalid confirmation link. Please request a new one.')
      setStatus('error')
      return
    }

    supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      .then(async ({ data, error }) => {
        if (error) {
          setErrorMessage(error.message.includes('expired')
            ? 'This link has expired. Please request a new one.'
            : 'This link is invalid or has already been used.')
          setStatus('error')
          return
        }

        setStatus('success')

        if (type === 'recovery' || type === 'invite') {
          navigate('/update-password', { replace: true })
          return
        }

        // For signup / magiclink / email_change — redirect to correct dashboard
        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single()

          const role = (profile as { role: string } | null)?.role
          if (role === 'school_admin') navigate('/admin', { replace: true })
          else if (role === 'teacher')  navigate('/teacher', { replace: true })
          else if (role === 'parent')   navigate('/parent', { replace: true })
          else                          navigate('/dashboard', { replace: true })
        } else {
          navigate('/login', { replace: true })
        }
      })
  }, [navigate])

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <div className="w-full max-w-md text-center">
        {/* WriFe logo */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="text-3xl font-extrabold cursor-pointer hover:opacity-75 transition-opacity"
            style={{ color: 'var(--color-brand-dark)', background: 'none', border: 'none', padding: 0 }}
          >
            WriFe
          </button>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Writing for Everyone</p>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          {status === 'verifying' && (
            <>
              <div
                className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
                style={{ borderColor: 'var(--color-brand-secondary)', borderTopColor: 'transparent' }}
              />
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Verifying your link…
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="text-4xl mb-4">✓</div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-brand-success)' }}>
                Verified! Redirecting you now…
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--color-brand-dark)' }}>
                Link invalid or expired
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
                {errorMessage}
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
                style={{ backgroundColor: 'var(--color-brand-secondary)' }}
              >
                Back to login
              </button>
            </>
          )}
        </div>

        <p className="mt-6 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Need help?{' '}
          <a href="mailto:support@wrife.co.uk" style={{ color: 'var(--color-brand-secondary)' }}>
            support@wrife.co.uk
          </a>
        </p>
      </div>
    </div>
  )
}
