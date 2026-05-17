/**
 * FeedbackWidget — floating "Report a problem" button for PWP Studio.
 * Appears on every page. Submits to the submit-feedback Edge Function.
 */
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

const EDGE_URL = 'https://gzmgjkbtsvezfclmreru.supabase.co/functions/v1/submit-feedback'

export default function FeedbackWidget() {
  const [open, setOpen]       = useState(false)
  const [text, setText]       = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  const role = useAuthStore((s) => s.role)

  const handleOpen  = useCallback(() => { setOpen(true); setSent(false); setError(''); setText('') }, [])
  const handleClose = useCallback(() => setOpen(false), [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true); setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const meta = session?.user?.user_metadata ?? {}
      const userType = role === 'pupil' ? 'pupil' : role === 'teacher' ? 'teacher' : 'unknown'
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const res = await fetch(EDGE_URL, {
        method: 'POST', headers,
        body: JSON.stringify({
          app: 'pwp',
          user_type: userType,
          username: (meta.display_name as string) || undefined,
          page_url: window.location.href,
          description: text.trim(),
          device_info: navigator.userAgent.slice(0, 120),
        }),
      })
      if (!res.ok) throw new Error('submit failed')
      setSent(true); setText('')
    } catch {
      setError('Could not send — please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={handleOpen}
        aria-label="Report a problem"
        data-testid="feedback-trigger"
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 9000,
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--color-brand-primary)',
          border: 'none', boxShadow: '0 4px 12px rgba(108,92,231,0.4)',
          cursor: 'pointer', fontSize: 20, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          transition: 'transform 120ms ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        💬
      </button>

      {open && (
        <div
          role="dialog" aria-modal="true" aria-label="Report a problem"
          style={{
            position: 'fixed', inset: 0, zIndex: 9100,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: '0 16px 24px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div style={{
            width: '100%', maxWidth: 420,
            background: '#fff', borderRadius: 16, padding: 24,
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <p style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px' }}>Thanks! Message sent.</p>
                <p style={{ fontSize: 14, color: '#666', margin: '0 0 20px' }}>We'll look into it as soon as possible.</p>
                <button onClick={handleClose} style={cancelStyle}>Close</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>💬 Report a problem</h2>
                  <button type="button" onClick={handleClose} aria-label="Close"
                    style={{ background: 'none', border: 'none', fontSize: 18, color: '#999', cursor: 'pointer' }}>✕</button>
                </div>
                <p style={{ fontSize: 13, color: '#666', margin: '0 0 14px', lineHeight: 1.5 }}>
                  Tell us what's wrong — we'll fix it quickly!
                </p>
                <textarea
                  value={text} onChange={(e) => setText(e.target.value)}
                  placeholder="e.g. The formula builder wouldn't accept my sentence…"
                  rows={4} maxLength={1000} autoFocus
                  style={{
                    width: '100%', boxSizing: 'border-box' as const,
                    padding: 12, fontSize: 14, border: '2px solid #e0e0e0',
                    borderRadius: 10, resize: 'vertical' as const, outline: 'none',
                    lineHeight: 1.5, marginBottom: 4,
                  }}
                />
                <p style={{ fontSize: 11, color: '#aaa', textAlign: 'right' as const, margin: '0 0 14px' }}>{text.length}/1000</p>
                {error && <p style={{ fontSize: 13, color: '#e74c3c', margin: '0 0 12px' }}>⚠️ {error}</p>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={handleClose} style={{ ...cancelStyle, flex: 1 }}>Cancel</button>
                  <button type="submit" disabled={sending || !text.trim()}
                    style={{
                      flex: 2, padding: '11px', fontSize: 15, fontWeight: 700,
                      color: '#fff', background: '#F5A623',
                      border: 'none', borderBottom: '3px solid #C97D10',
                      borderRadius: 999, cursor: 'pointer',
                      opacity: (sending || !text.trim()) ? 0.6 : 1,
                    }}>
                    {sending ? 'Sending…' : 'Send report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}

const cancelStyle: React.CSSProperties = {
  padding: '10px 16px', fontSize: 14, fontWeight: 600,
  color: '#666', background: '#f5f5f5',
  border: '1px solid #e0e0e0', borderRadius: 999, cursor: 'pointer',
}
