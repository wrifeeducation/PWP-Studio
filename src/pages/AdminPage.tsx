/**
 * WF-059: Admin Dashboard
 * Full user-management dashboard for app administrators.
 * Guarded by ADMIN_EMAILS allowlist (belt-and-braces on top of school_admin RLS).
 * All write operations call the `admin-action` Edge Function.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

// ─── Admin allowlist ────────────────────────────────────────────────────────
const ADMIN_EMAILS = [
  'mankrah@kafed.org.uk',
  'wrife.education@gmail.com',
  'miyk99@gmail.com',
  'admin@wrife-test.com',
]

// ─── Types ───────────────────────────────────────────────────────────────────
interface Profile {
  id: string
  email: string
  full_name: string | null
  role: string
  membership_tier: string
  is_active: boolean
  created_at: string
  school_name?: string | null
  year_group?: string | null
  stripe_customer_id?: string | null
}

interface School {
  id: string
  name: string
  contact_email: string | null
  created_at: string
  pupil_count?: number
  teacher_count?: number
}

// ─── Shared UI primitives ────────────────────────────────────────────────────

function Badge({ value, type: _type }: { value: string; type?: 'tier' | 'role' | 'status' }) {
  const colours: Record<string, string> = {
    // tiers
    free:   'background:#e5e7eb;color:#374151',
    pro:    'background:#d1fae5;color:#065f46',
    school: 'background:#dbeafe;color:#1e40af',
    // roles
    pupil:        'background:#fef3c7;color:#92400e',
    parent:       'background:#ede9fe;color:#5b21b6',
    teacher:      'background:#dbeafe;color:#1e40af',
    school_admin: 'background:#fee2e2;color:#991b1b',
    // status
    active:   'background:#d1fae5;color:#065f46',
    inactive: 'background:#fee2e2;color:#991b1b',
  }
  const style = colours[value.toLowerCase()] ?? 'background:#e5e7eb;color:#374151'
  const [bg, col] = style.split(';').map(s => s.split(':')[1])
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
      style={{ background: bg, color: col }}
    >
      {value}
    </span>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: 'var(--color-brand-dark)' }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>}
    </div>
  )
}

function PrimaryBtn({
  onClick, disabled, children, variant = 'primary', size = 'md',
}: {
  onClick?: () => void
  disabled?: boolean
  children: React.ReactNode
  variant?: 'primary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
}) {
  const base = 'rounded-lg font-semibold transition-opacity disabled:opacity-50 cursor-pointer'
  const sz = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
  const v =
    variant === 'danger'
      ? 'bg-red-600 text-white hover:opacity-80'
      : variant === 'ghost'
      ? 'bg-transparent border border-gray-300 hover:opacity-70'
      : 'text-white hover:opacity-80'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sz} ${v}`}
      style={variant === 'primary' ? { backgroundColor: 'var(--color-brand-primary)' } : undefined}
    >
      {children}
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2"
      style={{
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-background)',
        color: 'var(--color-text)',
      }}
    />
  )
}

function Select({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: { label: string; value: string }[]
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2"
      style={{
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-background)',
        color: 'var(--color-text)',
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl p-6 shadow-xl"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold" style={{ color: 'var(--color-brand-dark)' }}>{title}</h3>
          <button onClick={onClose} className="text-lg leading-none hover:opacity-60" style={{ color: 'var(--color-text-muted)' }}>✕</button>
        </div>
        {children}
      </motion.div>
    </div>
  )
}

// ─── Admin action helper ──────────────────────────────────────────────────────
async function adminAction(action: string, payload: Record<string, unknown>) {
  const res = await supabase.functions.invoke('admin-action', {
    body: { action, ...payload },
  })
  if (res.error) throw new Error(res.error.message)
  if (res.data?.error) throw new Error(res.data.error)
  return res.data
}

// ─── Schools Tab ─────────────────────────────────────────────────────────────
function SchoolsTab() {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', contactEmail: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('schools').select('*').order('name')
    setSchools((data as School[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const createSchool = async () => {
    if (!form.name.trim()) { setError('School name is required'); return }
    setSaving(true); setError('')
    try {
      await adminAction('create_school', { schoolName: form.name.trim(), contactEmail: form.contactEmail.trim() || null })
      setShowCreate(false)
      setForm({ name: '', contactEmail: '' })
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create school')
    } finally { setSaving(false) }
  }

  if (loading) return <p className="text-sm py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{schools.length} school{schools.length !== 1 ? 's' : ''}</p>
        <PrimaryBtn onClick={() => setShowCreate(true)} size="sm">+ New School</PrimaryBtn>
      </div>

      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
              {['School Name', 'Contact Email', 'Created'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schools.map((s, i) => (
              <tr key={s.id} style={{ borderBottom: i < schools.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{s.name}</td>
                <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{s.contact_email ?? '—'}</td>
                <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{new Date(s.created_at).toLocaleDateString('en-GB')}</td>
              </tr>
            ))}
            {schools.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>No schools yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <Modal title="Create School" onClose={() => setShowCreate(false)}>
          <div className="flex flex-col gap-3">
            <Field label="School Name *">
              <Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Oakfield Primary School" />
            </Field>
            <Field label="Contact Email">
              <Input value={form.contactEmail} onChange={v => setForm(f => ({ ...f, contactEmail: v }))} placeholder="admin@school.co.uk" type="email" />
            </Field>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end mt-2">
              <PrimaryBtn variant="ghost" onClick={() => setShowCreate(false)}>Cancel</PrimaryBtn>
              <PrimaryBtn onClick={createSchool} disabled={saving}>{saving ? 'Creating…' : 'Create School'}</PrimaryBtn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Parents Tab ──────────────────────────────────────────────────────────────
function ParentsTab() {
  const [parents, setParents] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newForm, setNewForm] = useState({ email: '', fullName: '', tier: 'free' })

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'parent')
      .order('created_at', { ascending: false })
    setParents((data as Profile[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = parents.filter(p =>
    !search || p.email.toLowerCase().includes(search.toLowerCase()) ||
    (p.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const changeTier = async (userId: string, tier: string) => {
    setSaving(true); setError('')
    try {
      await adminAction('change_tier', { userId, tier })
      await load()
      setSelected(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update tier')
    } finally { setSaving(false) }
  }

  const toggleActive = async (userId: string, activate: boolean) => {
    setSaving(true); setError('')
    try {
      await adminAction('toggle_active', { userId, activate })
      await load()
      setSelected(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update status')
    } finally { setSaving(false) }
  }

  const resetPassword = async (userId: string) => {
    setSaving(true); setError('')
    try {
      await adminAction('reset_password', { userId })
      alert('Password reset email sent.')
      setSelected(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send reset email')
    } finally { setSaving(false) }
  }

  const createParent = async () => {
    if (!newForm.email.trim()) { setError('Email is required'); return }
    setSaving(true); setError('')
    try {
      await adminAction('create_user', {
        email: newForm.email.trim(),
        fullName: newForm.fullName.trim() || null,
        role: 'parent',
        membershipTier: newForm.tier,
      })
      setShowCreate(false)
      setNewForm({ email: '', fullName: '', tier: 'free' })
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create parent')
    } finally { setSaving(false) }
  }

  if (loading) return <p className="text-sm py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <Input value={search} onChange={setSearch} placeholder="Search by name or email…" />
        <PrimaryBtn onClick={() => { setShowCreate(true); setError('') }} size="sm">+ New Parent</PrimaryBtn>
      </div>

      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
              {['Name', 'Email', 'Tier', 'Status', 'Joined', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{p.full_name ?? '—'}</td>
                <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{p.email}</td>
                <td className="px-4 py-3"><Badge value={p.membership_tier} type="tier" /></td>
                <td className="px-4 py-3"><Badge value={p.is_active ? 'active' : 'inactive'} type="status" /></td>
                <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{new Date(p.created_at).toLocaleDateString('en-GB')}</td>
                <td className="px-4 py-3">
                  <PrimaryBtn size="sm" variant="ghost" onClick={() => { setSelected(p); setError('') }}>Manage</PrimaryBtn>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>No parents found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <Modal title={`Manage: ${selected.full_name ?? selected.email}`} onClose={() => setSelected(null)}>
          <div className="flex flex-col gap-3">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{selected.email}</p>

            <Field label="Membership Tier">
              <Select
                value={selected.membership_tier}
                onChange={v => setSelected(s => s ? { ...s, membership_tier: v } : s)}
                options={[
                  { label: 'Free', value: 'free' },
                  { label: 'Pro', value: 'pro' },
                  { label: 'School', value: 'school' },
                ]}
              />
            </Field>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex flex-wrap gap-2 mt-2">
              <PrimaryBtn onClick={() => changeTier(selected.id, selected.membership_tier)} disabled={saving}>
                {saving ? 'Saving…' : 'Save Tier'}
              </PrimaryBtn>
              <PrimaryBtn variant="ghost" onClick={() => resetPassword(selected.id)} disabled={saving}>
                Send Password Reset
              </PrimaryBtn>
              <PrimaryBtn
                variant={selected.is_active ? 'danger' : 'primary'}
                onClick={() => toggleActive(selected.id, !selected.is_active)}
                disabled={saving}
              >
                {selected.is_active ? 'Deactivate' : 'Reactivate'}
              </PrimaryBtn>
            </div>
          </div>
        </Modal>
      )}

      {showCreate && (
        <Modal title="Create Parent Account" onClose={() => setShowCreate(false)}>
          <div className="flex flex-col gap-3">
            <Field label="Email *">
              <Input value={newForm.email} onChange={v => setNewForm(f => ({ ...f, email: v }))} placeholder="parent@example.com" type="email" />
            </Field>
            <Field label="Full Name">
              <Input value={newForm.fullName} onChange={v => setNewForm(f => ({ ...f, fullName: v }))} placeholder="Jane Smith" />
            </Field>
            <Field label="Membership Tier">
              <Select
                value={newForm.tier}
                onChange={v => setNewForm(f => ({ ...f, tier: v }))}
                options={[
                  { label: 'Free', value: 'free' },
                  { label: 'Pro', value: 'pro' },
                  { label: 'School', value: 'school' },
                ]}
              />
            </Field>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end mt-2">
              <PrimaryBtn variant="ghost" onClick={() => setShowCreate(false)}>Cancel</PrimaryBtn>
              <PrimaryBtn onClick={createParent} disabled={saving}>{saving ? 'Creating…' : 'Create & Send Invite'}</PrimaryBtn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Pupils Tab ───────────────────────────────────────────────────────────────
function PupilsTab() {
  const [pupils, setPupils] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newForm, setNewForm] = useState({ email: '', fullName: '', yearGroup: '' })
  const [newPin, setNewPin] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'pupil')
      .order('created_at', { ascending: false })
    setPupils((data as Profile[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = pupils.filter(p =>
    !search || p.email.toLowerCase().includes(search.toLowerCase()) ||
    (p.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const toggleActive = async (userId: string, activate: boolean) => {
    setSaving(true); setError('')
    try {
      await adminAction('toggle_active', { userId, activate })
      await load(); setSelected(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally { setSaving(false) }
  }

  const resetPin = async (userId: string, pin: string) => {
    if (!pin || pin.length < 4) { setError('PIN must be at least 4 digits'); return }
    setSaving(true); setError('')
    try {
      await adminAction('reset_pupil_pin', { userId, newPin: pin })
      alert('PIN updated successfully.')
      setSelected(null); setNewPin('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to reset PIN')
    } finally { setSaving(false) }
  }

  const createPupil = async () => {
    if (!newForm.email.trim()) { setError('Email is required'); return }
    setSaving(true); setError('')
    try {
      await adminAction('create_user', {
        email: newForm.email.trim(),
        fullName: newForm.fullName.trim() || null,
        role: 'pupil',
        yearGroup: newForm.yearGroup || null,
        membershipTier: 'free',
      })
      setShowCreate(false)
      setNewForm({ email: '', fullName: '', yearGroup: '' })
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create pupil')
    } finally { setSaving(false) }
  }

  if (loading) return <p className="text-sm py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <Input value={search} onChange={setSearch} placeholder="Search pupils…" />
        <PrimaryBtn onClick={() => { setShowCreate(true); setError('') }} size="sm">+ New Pupil</PrimaryBtn>
      </div>

      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
              {['Name', 'Email', 'Year', 'Status', 'Joined', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{p.full_name ?? '—'}</td>
                <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{p.email}</td>
                <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{p.year_group ?? '—'}</td>
                <td className="px-4 py-3"><Badge value={p.is_active ? 'active' : 'inactive'} type="status" /></td>
                <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{new Date(p.created_at).toLocaleDateString('en-GB')}</td>
                <td className="px-4 py-3">
                  <PrimaryBtn size="sm" variant="ghost" onClick={() => { setSelected(p); setNewPin(''); setError('') }}>Manage</PrimaryBtn>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>No pupils found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <Modal title={`Manage: ${selected.full_name ?? selected.email}`} onClose={() => setSelected(null)}>
          <div className="flex flex-col gap-3">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{selected.email} · Year: {selected.year_group ?? '—'}</p>

            <Field label="Reset PIN">
              <Input value={newPin} onChange={setNewPin} placeholder="Enter new 4–6 digit PIN" type="text" />
            </Field>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex flex-wrap gap-2 mt-2">
              <PrimaryBtn onClick={() => resetPin(selected.id, newPin)} disabled={saving || !newPin}>
                {saving ? 'Saving…' : 'Set PIN'}
              </PrimaryBtn>
              <PrimaryBtn
                variant={selected.is_active ? 'danger' : 'primary'}
                onClick={() => toggleActive(selected.id, !selected.is_active)}
                disabled={saving}
              >
                {selected.is_active ? 'Deactivate' : 'Reactivate'}
              </PrimaryBtn>
            </div>
          </div>
        </Modal>
      )}

      {showCreate && (
        <Modal title="Create Pupil Account" onClose={() => setShowCreate(false)}>
          <div className="flex flex-col gap-3">
            <Field label="Email *">
              <Input value={newForm.email} onChange={v => setNewForm(f => ({ ...f, email: v }))} placeholder="pupil@school.co.uk" type="email" />
            </Field>
            <Field label="Full Name">
              <Input value={newForm.fullName} onChange={v => setNewForm(f => ({ ...f, fullName: v }))} placeholder="Alex Johnson" />
            </Field>
            <Field label="Year Group">
              <Select
                value={newForm.yearGroup}
                onChange={v => setNewForm(f => ({ ...f, yearGroup: v }))}
                options={[
                  { label: 'Not set', value: '' },
                  ...['Y1','Y2','Y3','Y4','Y5','Y6','Y7','Y8','Y9'].map(y => ({ label: y, value: y })),
                ]}
              />
            </Field>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end mt-2">
              <PrimaryBtn variant="ghost" onClick={() => setShowCreate(false)}>Cancel</PrimaryBtn>
              <PrimaryBtn onClick={createPupil} disabled={saving}>{saving ? 'Creating…' : 'Create & Send Invite'}</PrimaryBtn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    parents: 0,
    pupils: 0,
    teachers: 0,
    proUsers: 0,
    schoolUsers: 0,
    activeToday: 0,
    schools: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ count: total }, { count: parents }, { count: pupils }, { count: teachers }, { count: pro }, { count: school }, { count: schools }] =
        await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'parent'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'pupil'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('membership_tier', 'pro'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('membership_tier', 'school'),
          supabase.from('schools').select('*', { count: 'exact', head: true }),
        ])
      setStats({
        totalUsers: total ?? 0,
        parents: parents ?? 0,
        pupils: pupils ?? 0,
        teachers: teachers ?? 0,
        proUsers: pro ?? 0,
        schoolUsers: school ?? 0,
        activeToday: 0,
        schools: schools ?? 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p className="text-sm py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Total Users" value={stats.totalUsers} />
      <StatCard label="Schools" value={stats.schools} />
      <StatCard label="Parents" value={stats.parents} />
      <StatCard label="Pupils" value={stats.pupils} />
      <StatCard label="Teachers" value={stats.teachers} />
      <StatCard label="Pro Subscribers" value={stats.proUsers} sub="Paid monthly" />
      <StatCard label="School Plan" value={stats.schoolUsers} sub="Institutional" />
      <StatCard label="Free Tier" value={Math.max(0, stats.totalUsers - stats.proUsers - stats.schoolUsers)} sub="Not yet upgraded" />
    </div>
  )
}

// ─── Password Management Tab ──────────────────────────────────────────────────
function PasswordsTab() {
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [found, setFound] = useState<Profile | null>(null)
  const [searching, setSearching] = useState(false)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const findUser = async () => {
    if (!email.trim()) return
    setSearching(true); setError(''); setFound(null); setMessage('')
    const { data } = await supabase.from('profiles').select('*').eq('email', email.trim().toLowerCase()).single()
    if (data) { setFound(data as Profile); setUserId(data.id) }
    else setError('No user found with that email address.')
    setSearching(false)
  }

  const sendReset = async () => {
    if (!userId) return
    setSending(true); setError(''); setMessage('')
    try {
      await adminAction('reset_password', { userId })
      setMessage('Password reset email sent successfully.')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send reset')
    } finally { setSending(false) }
  }

  return (
    <div className="max-w-lg">
      <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
        Look up a user by email and send them a password reset link.
      </p>

      <div className="flex gap-2 mb-4">
        <Input value={email} onChange={setEmail} placeholder="user@example.com" type="email" />
        <PrimaryBtn onClick={findUser} disabled={searching || !email.trim()}>
          {searching ? 'Searching…' : 'Find'}
        </PrimaryBtn>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {message && <p className="text-sm text-green-600 mb-3">{message}</p>}

      {found && (
        <div
          className="rounded-xl p-4 flex items-center justify-between"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div>
            <p className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{found.full_name ?? '(no name)'}</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{found.email} · <Badge value={found.role} type="role" /></p>
          </div>
          <PrimaryBtn onClick={sendReset} disabled={sending}>
            {sending ? 'Sending…' : 'Send Reset Email'}
          </PrimaryBtn>
        </div>
      )}
    </div>
  )
}

// ─── Main AdminPage ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'analytics', label: '📊 Analytics' },
  { id: 'schools',   label: '🏫 Schools' },
  { id: 'parents',   label: '👨‍👩‍👧 Parents' },
  { id: 'pupils',    label: '🎒 Pupils' },
  { id: 'passwords', label: '🔑 Passwords' },
] as const

type TabId = typeof TABS[number]['id']

export default function AdminPage() {
  const navigate = useNavigate()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('analytics')
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const email = session?.user?.email ?? null
      setUserEmail(email)
      setAuthChecked(true)
      if (!email || !ADMIN_EMAILS.includes(email)) {
        navigate('/', { replace: true })
      }
    })
  }, [navigate])

  if (!authChecked) return null
  if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) return null

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Top bar */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-6 py-3"
        style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="font-bold text-lg cursor-pointer hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-brand-primary)', background: 'none', border: 'none', padding: 0 }}
            data-tts="WriFe — go to home page"
          >
            WriFe
          </button>
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs hidden sm:block" style={{ color: 'var(--color-text-muted)' }}>{userEmail}</span>
          <PrimaryBtn size="sm" variant="ghost" onClick={handleSignOut}>Sign out</PrimaryBtn>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-brand-dark)' }}>
            Admin Dashboard
          </h1>
        </motion.div>

        {/* Tab nav */}
        <div
          className="flex gap-1 mb-6 p-1 rounded-xl w-full overflow-x-auto"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={
                activeTab === tab.id
                  ? { backgroundColor: 'var(--color-brand-primary)', color: '#fff' }
                  : { backgroundColor: 'transparent', color: 'var(--color-text-muted)' }
              }
              data-tts={tab.label}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'analytics' && <AnalyticsTab />}
          {activeTab === 'schools'   && <SchoolsTab />}
          {activeTab === 'parents'   && <ParentsTab />}
          {activeTab === 'pupils'    && <PupilsTab />}
          {activeTab === 'passwords' && <PasswordsTab />}
        </motion.div>
      </main>
    </div>
  )
}
