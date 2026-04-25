/**
 * WF-023: Admin Panel — Invite Teacher Tab
 * Calls the invite-teacher Edge Function (service role required).
 */

import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export function InviteTeacherTab({ schoolId }: { schoolId: string }) {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  async function handleInvite() {
    if (!email.trim() || !firstName.trim()) return
    setSending(true)
    setResult(null)

    try {
      const { error } = await supabase.functions.invoke('invite-teacher', {
        body: { email: email.trim(), first_name: firstName.trim(), school_id: schoolId },
      })

      if (error) {
        setResult({ ok: false, message: error.message ?? 'Invitation failed. Please try again.' })
      } else {
        setResult({ ok: true, message: `Invitation sent to ${email.trim()}.` })
        setEmail('')
        setFirstName('')
      }
    } catch (err) {
      setResult({ ok: false, message: 'Unable to send invitation — please check your connection.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-5 max-w-md" data-testid="invite-teacher-tab">
      <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
        Invite a Teacher
      </h2>
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        The teacher will receive an email with a link to set their password and join your school on WriFe.
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor="invite-first-name" className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          First name
        </label>
        <input
          id="invite-first-name"
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="e.g. Sarah"
          data-testid="input-invite-first-name"
          className="rounded-lg px-3 py-2 text-sm"
          style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="invite-email" className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          Email address
        </label>
        <input
          id="invite-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teacher@school.sch.uk"
          data-testid="input-invite-email"
          className="rounded-lg px-3 py-2 text-sm"
          style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        />
      </div>

      <button
        type="button"
        onClick={handleInvite}
        disabled={!email.trim() || !firstName.trim() || sending}
        data-testid="send-invite-button"
        className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity"
        style={{
          backgroundColor: 'var(--color-brand-primary)',
          opacity: !email.trim() || !firstName.trim() || sending ? 0.5 : 1,
          cursor: !email.trim() || !firstName.trim() || sending ? 'not-allowed' : 'pointer',
        }}
      >
        {sending ? 'Sending…' : 'Send Invitation'}
      </button>

      {result && (
        <p
          className="text-sm"
          role="status"
          style={{ color: result.ok ? '#166534' : '#DC2626' }}
          data-testid="invite-result"
        >
          {result.message}
        </p>
      )}
    </div>
  )
}
