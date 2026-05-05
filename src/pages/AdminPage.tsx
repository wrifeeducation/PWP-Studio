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
  email?: string           // from auth.users via find_user_email action
  first_name: string
  role: string
  membership_tier: string
  is_active: boolean
  created_at: string
  school_id?: string | null
  year_group?: number | null
  stripe_customer_id?: string | null
}

interface School {
  id: string
  name: string
  urn: string
  phase: string
  contact_email: string | null
  subscription_tier: string
  max_teachers: number
  max_pupils: number
  status: string
  admin_user_id: string | null
  notes: string | null
  created_at: string
  // computed locally after load
  teacher_count?: number
  pupil_count?: number
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

// ─── Usage bar helper ─────────────────────────────────────────────────────────
function UsageBar({ used, max, label }: { used: number; max: number; label: string }) {
  const pct = Math.min(100, Math.round((used / Math.max(max, 1)) * 100))
  const colour = pct >= 90 ? '#dc2626' : pct >= 70 ? '#f59e0b' : '#10b981'
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>{label}</span>
        <span>{used}/{max}</span>
      </div>
      <div className="h-1.5 rounded-full w-full" style={{ backgroundColor: 'var(--color-border)' }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: colour }} />
      </div>
    </div>
  )
}

// ─── Schools Tab ─────────────────────────────────────────────────────────────
function SchoolsTab() {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<School | null>(null)
  const [showQuota, setShowQuota] = useState(false)
  const [showInviteAdmin, setShowInviteAdmin] = useState(false)
  const [form, setForm] = useState({
    name: '', contactEmail: '', urn: '', phase: 'primary',
    subscriptionTier: 'trial', maxTeachers: '5', maxPupils: '150',
  })
  const [quotaForm, setQuotaForm] = useState({ maxTeachers: '', maxPupils: '', subscriptionTier: '' })
  const [inviteForm, setInviteForm] = useState({ email: '', firstName: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    // Load schools + count teachers and pupils per school
    const { data: schoolData } = await supabase.from('schools').select('*').order('name')
    const { data: teacherCounts } = await supabase
      .from('profiles').select('school_id').eq('role', 'teacher')
    const { data: pupilCounts } = await supabase
      .from('profiles').select('school_id').eq('role', 'pupil')

    const schoolList = (schoolData as School[] ?? []).map(s => ({
      ...s,
      teacher_count: (teacherCounts ?? []).filter(p => p.school_id === s.id).length,
      pupil_count:   (pupilCounts   ?? []).filter(p => p.school_id === s.id).length,
    }))
    setSchools(schoolList)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const createSchool = async () => {
    if (!form.name.trim()) { setError('School name is required'); return }
    setSaving(true); setError('')
    try {
      await adminAction('create_school', {
        name: form.name.trim(),
        contactEmail: form.contactEmail.trim() || null,
        urn: form.urn.trim() || null,
        phase: form.phase,
        subscriptionTier: form.subscriptionTier,
        maxTeachers: Number(form.maxTeachers) || 5,
        maxPupils: Number(form.maxPupils) || 150,
      })
      setShowCreate(false)
      setForm({ name: '', contactEmail: '', urn: '', phase: 'primary', subscriptionTier: 'trial', maxTeachers: '5', maxPupils: '150' })
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create school')
    } finally { setSaving(false) }
  }

  const setQuota = async () => {
    if (!selected) return
    setSaving(true); setError('')
    try {
      await adminAction('set_school_quota', {
        schoolId: selected.id,
        maxTeachers: quotaForm.maxTeachers ? Number(quotaForm.maxTeachers) : undefined,
        maxPupils: quotaForm.maxPupils ? Number(quotaForm.maxPupils) : undefined,
        subscriptionTier: quotaForm.subscriptionTier || undefined,
      })
      setShowQuota(false)
      setSelected(null)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update quota')
    } finally { setSaving(false) }
  }

  const toggleStatus = async (school: School) => {
    const next = school.status === 'active' ? 'suspended' : 'active'
    setSaving(true)
    try {
      await adminAction('toggle_school_status', { schoolId: school.id, status: next })
      await load()
    } catch { /* swallow */ } finally { setSaving(false) }
  }

  const inviteAdmin = async () => {
    if (!selected || !inviteForm.email.trim()) { setError('Email is required'); return }
    setSaving(true); setError('')
    try {
      await adminAction('invite_school_admin', {
        schoolId: selected.id,
        email: inviteForm.email.trim(),
        firstName: inviteForm.firstName.trim() || null,
      })
      setShowInviteAdmin(false)
      setSelected(null)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to invite admin')
    } finally { setSaving(false) }
  }

  const TIER_LABELS: Record<string, string> = {
    trial: 'Trial', starter: 'Starter', professional: 'Professional', enterprise: 'Enterprise',
  }
  const STATUS_COLOURS: Record<string, string> = {
    active: '#d1fae5', trial: '#dbeafe', suspended: '#fee2e2', expired: '#e5e7eb',
  }
  const STATUS_TEXT: Record<string, string> = {
    active: '#065f46', trial: '#1e40af', suspended: '#991b1b', expired: '#374151',
  }

  if (loading) return <p className="text-sm py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {schools.length} school{schools.length !== 1 ? 's' : ''} ·{' '}
          {schools.filter(s => s.status === 'active').length} active
        </p>
        <PrimaryBtn onClick={() => { setShowCreate(true); setError('') }} size="sm">+ New School</PrimaryBtn>
      </div>

      <div className="flex flex-col gap-4">
        {schools.map(s => (
          <div
            key={s.id}
            className="rounded-xl p-4"
            style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
              {/* Left: name + meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{s.name}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                    style={{ background: STATUS_COLOURS[s.status] ?? '#e5e7eb', color: STATUS_TEXT[s.status] ?? '#374151' }}
                  >
                    {s.status}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#dbeafe', color: '#1e40af' }}>
                    {TIER_LABELS[s.subscription_tier] ?? s.subscription_tier}
                  </span>
                </div>
                <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
                  {s.contact_email ?? 'No contact email'} · {s.phase ?? 'unknown phase'} · URN: {s.urn}
                </p>
                {/* Usage bars */}
                <div className="grid grid-cols-2 gap-3 mb-3 max-w-sm">
                  <UsageBar used={s.teacher_count ?? 0} max={s.max_teachers} label="Teachers" />
                  <UsageBar used={s.pupil_count ?? 0} max={s.max_pupils} label="Pupils" />
                </div>
              </div>

              {/* Right: actions */}
              <div className="flex flex-wrap gap-1.5 items-start shrink-0">
                <PrimaryBtn size="sm" variant="ghost" onClick={() => {
                  setSelected(s)
                  setQuotaForm({ maxTeachers: String(s.max_teachers), maxPupils: String(s.max_pupils), subscriptionTier: s.subscription_tier })
                  setShowQuota(true)
                  setError('')
                }}>Set Quota</PrimaryBtn>
                <PrimaryBtn size="sm" variant="ghost" onClick={() => {
                  setSelected(s)
                  setInviteForm({ email: s.contact_email ?? '', firstName: '' })
                  setShowInviteAdmin(true)
                  setError('')
                }}>Invite Admin</PrimaryBtn>
                <PrimaryBtn
                  size="sm"
                  variant={s.status === 'active' ? 'danger' : 'primary'}
                  disabled={saving}
                  onClick={() => toggleStatus(s)}
                >
                  {s.status === 'active' ? 'Suspend' : 'Activate'}
                </PrimaryBtn>
              </div>
            </div>
          </div>
        ))}
        {schools.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>No schools yet. Create one to get started.</p>
        )}
      </div>

      {/* Create School Modal */}
      {showCreate && (
        <Modal title="Create School" onClose={() => setShowCreate(false)}>
          <div className="flex flex-col gap-3">
            <Field label="School Name *">
              <Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Oakfield Primary School" />
            </Field>
            <Field label="Contact Email">
              <Input value={form.contactEmail} onChange={v => setForm(f => ({ ...f, contactEmail: v }))} placeholder="admin@school.co.uk" type="email" />
            </Field>
            <Field label="URN (optional — UK school reference number)">
              <Input value={form.urn} onChange={v => setForm(f => ({ ...f, urn: v }))} placeholder="e.g. 123456" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Phase">
                <Select
                  value={form.phase}
                  onChange={v => setForm(f => ({ ...f, phase: v }))}
                  options={[
                    { label: 'Primary', value: 'primary' },
                    { label: 'Secondary', value: 'secondary' },
                    { label: 'All-through', value: 'all-through' },
                    { label: 'Special', value: 'special' },
                  ]}
                />
              </Field>
              <Field label="Plan">
                <Select
                  value={form.subscriptionTier}
                  onChange={v => setForm(f => ({ ...f, subscriptionTier: v }))}
                  options={[
                    { label: 'Trial (free)', value: 'trial' },
                    { label: 'Starter', value: 'starter' },
                    { label: 'Professional', value: 'professional' },
                    { label: 'Enterprise', value: 'enterprise' },
                  ]}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Max Teachers">
                <Input value={form.maxTeachers} onChange={v => setForm(f => ({ ...f, maxTeachers: v }))} placeholder="5" type="number" />
              </Field>
              <Field label="Max Pupils">
                <Input value={form.maxPupils} onChange={v => setForm(f => ({ ...f, maxPupils: v }))} placeholder="150" type="number" />
              </Field>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end mt-2">
              <PrimaryBtn variant="ghost" onClick={() => setShowCreate(false)}>Cancel</PrimaryBtn>
              <PrimaryBtn onClick={createSchool} disabled={saving}>{saving ? 'Creating…' : 'Create School'}</PrimaryBtn>
            </div>
          </div>
        </Modal>
      )}

      {/* Set Quota Modal */}
      {showQuota && selected && (
        <Modal title={`Set Quota — ${selected.name}`} onClose={() => { setShowQuota(false); setSelected(null) }}>
          <div className="flex flex-col gap-3">
            <Field label="Plan Tier">
              <Select
                value={quotaForm.subscriptionTier}
                onChange={v => setQuotaForm(f => ({ ...f, subscriptionTier: v }))}
                options={[
                  { label: 'Trial', value: 'trial' },
                  { label: 'Starter', value: 'starter' },
                  { label: 'Professional', value: 'professional' },
                  { label: 'Enterprise', value: 'enterprise' },
                ]}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Max Teachers">
                <Input value={quotaForm.maxTeachers} onChange={v => setQuotaForm(f => ({ ...f, maxTeachers: v }))} type="number" placeholder="5" />
              </Field>
              <Field label="Max Pupils">
                <Input value={quotaForm.maxPupils} onChange={v => setQuotaForm(f => ({ ...f, maxPupils: v }))} type="number" placeholder="150" />
              </Field>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end mt-2">
              <PrimaryBtn variant="ghost" onClick={() => { setShowQuota(false); setSelected(null) }}>Cancel</PrimaryBtn>
              <PrimaryBtn onClick={setQuota} disabled={saving}>{saving ? 'Saving…' : 'Save Quota'}</PrimaryBtn>
            </div>
          </div>
        </Modal>
      )}

      {/* Invite School Admin Modal */}
      {showInviteAdmin && selected && (
        <Modal title={`Invite School Admin — ${selected.name}`} onClose={() => { setShowInviteAdmin(false); setSelected(null) }}>
          <div className="flex flex-col gap-3">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              The invited person will receive an email to set up their account as the school admin for {selected.name}.
              If they already have an account, their role will be updated.
            </p>
            <Field label="Email *">
              <Input value={inviteForm.email} onChange={v => setInviteForm(f => ({ ...f, email: v }))} placeholder="headteacher@school.co.uk" type="email" />
            </Field>
            <Field label="First Name (optional)">
              <Input value={inviteForm.firstName} onChange={v => setInviteForm(f => ({ ...f, firstName: v }))} placeholder="Sarah" />
            </Field>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end mt-2">
              <PrimaryBtn variant="ghost" onClick={() => { setShowInviteAdmin(false); setSelected(null) }}>Cancel</PrimaryBtn>
              <PrimaryBtn onClick={inviteAdmin} disabled={saving}>{saving ? 'Sending…' : 'Send Invite'}</PrimaryBtn>
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
    !search || (p.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.first_name ?? '').toLowerCase().includes(search.toLowerCase())
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
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{p.first_name ?? '—'}</td>
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
        <Modal title={`Manage: ${selected.first_name ?? selected.email}`} onClose={() => setSelected(null)}>
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
  const [newForm, setNewForm] = useState({ firstName: '', yearGroup: '', schoolId: '' })
  const [createdPin, setCreatedPin] = useState<string | null>(null)
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
    !search || (p.first_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    String(p.year_group ?? '').includes(search)
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

  const changeTier = async (userId: string, tier: string) => {
    setSaving(true); setError('')
    try {
      await adminAction('change_tier', { userId, tier })
      await load(); setSelected(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update tier')
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
    if (!newForm.firstName.trim()) { setError('First name is required'); return }
    setSaving(true); setError('')
    try {
      const result = await adminAction('create_pupil', {
        firstName: newForm.firstName.trim(),
        yearGroup: newForm.yearGroup || null,
        schoolId: newForm.schoolId || null,
      })
      setCreatedPin(result.pin)
      setNewForm({ firstName: '', yearGroup: '', schoolId: '' })
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
              {['Name', 'PIN', 'Year', 'Status', 'Joined', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{p.first_name ?? '—'}</td>
                <td className="px-4 py-3 font-mono font-bold" style={{ color: 'var(--color-brand-primary)', letterSpacing: '0.12em' }}>
                  {(p as Profile & { pin_code?: string }).pin_code ?? '—'}
                </td>
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
        <Modal title={`Manage: ${selected.first_name ?? 'Pupil'}`} onClose={() => setSelected(null)}>
          <div className="flex flex-col gap-3">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              PIN: <strong>{(selected as Profile & { pin_code?: string }).pin_code ?? '—'}</strong> · Year: {selected.year_group ?? '—'}
            </p>

            <Field label="Membership Tier">
              <Select
                value={selected.membership_tier}
                onChange={v => setSelected(s => s ? { ...s, membership_tier: v } : s)}
                options={[
                  { label: 'Free (3 sessions/day)', value: 'free' },
                  { label: 'Pro (unlimited)', value: 'pro' },
                  { label: 'School (via school plan)', value: 'school' },
                ]}
              />
            </Field>

            <Field label="Reset PIN">
              <Input value={newPin} onChange={setNewPin} placeholder="Enter new 4–6 digit PIN" type="text" />
            </Field>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex flex-wrap gap-2 mt-2">
              <PrimaryBtn onClick={() => changeTier(selected.id, selected.membership_tier)} disabled={saving}>
                {saving ? 'Saving…' : 'Save Tier'}
              </PrimaryBtn>
              <PrimaryBtn onClick={() => resetPin(selected.id, newPin)} disabled={saving || !newPin} variant="ghost">
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

      {showCreate && !createdPin && (
        <Modal title="Create Pupil Account" onClose={() => setShowCreate(false)}>
          <div className="flex flex-col gap-3">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              No email needed. A unique PIN will be generated automatically — share it with the pupil to log in.
            </p>
            <Field label="First Name *">
              <Input value={newForm.firstName} onChange={v => setNewForm(f => ({ ...f, firstName: v }))} placeholder="Alex" />
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
              <PrimaryBtn onClick={createPupil} disabled={saving}>{saving ? 'Creating…' : 'Create Pupil'}</PrimaryBtn>
            </div>
          </div>
        </Modal>
      )}

      {createdPin && (
        <Modal title="✅ Pupil Created" onClose={() => { setCreatedPin(null); setShowCreate(false) }}>
          <div className="flex flex-col gap-4 items-center text-center py-2">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Share this PIN with the pupil. They use it to log in — no email required.
            </p>
            <div style={{
              fontSize: 48,
              fontWeight: 800,
              fontFamily: 'monospace',
              letterSpacing: '0.2em',
              color: 'var(--color-brand-primary)',
              background: 'var(--color-surface)',
              border: '2px solid var(--color-border)',
              borderRadius: 16,
              padding: '16px 32px',
            }}>
              {createdPin}
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Login: pupil-{createdPin}@wrife.school · Password: {createdPin}</p>
            <PrimaryBtn onClick={() => { setCreatedPin(null); setShowCreate(false) }}>Done</PrimaryBtn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Teachers Tab ─────────────────────────────────────────────────────────────
function TeachersTab() {
  const [teachers, setTeachers] = useState<Profile[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'independent' | 'school'>('all')
  const [selected, setSelected] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', fullName: '', schoolId: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: teacherData }, { data: schoolData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'teacher').order('created_at', { ascending: false }),
      supabase.from('schools').select('id, name').order('name'),
    ])
    setTeachers((teacherData as Profile[]) ?? [])
    setSchools((schoolData as School[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const schoolMap = Object.fromEntries(schools.map(s => [s.id, s.name]))

  const filtered = teachers.filter(t => {
    if (filter === 'independent' && t.school_id) return false
    if (filter === 'school' && !t.school_id) return false
    if (search) {
      const q = search.toLowerCase()
      return (t.first_name ?? '').toLowerCase().includes(q) || (t.email ?? '').toLowerCase().includes(q)
    }
    return true
  })

  const changeTier = async (userId: string, tier: string) => {
    setSaving(true); setError('')
    try {
      await adminAction('change_tier', { userId, tier })
      await load(); setSelected(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update tier')
    } finally { setSaving(false) }
  }

  const toggleActive = async (userId: string, activate: boolean) => {
    setSaving(true); setError('')
    try {
      await adminAction('toggle_active', { userId, activate })
      await load(); setSelected(null)
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
      setError(e instanceof Error ? e.message : 'Failed')
    } finally { setSaving(false) }
  }

  const assignToSchool = async (userId: string, schoolId: string) => {
    if (!schoolId) { setError('Please select a school'); return }
    setSaving(true); setError('')
    try {
      await adminAction('assign_teacher_to_school', { userId, schoolId })
      await load(); setSelected(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to assign to school')
    } finally { setSaving(false) }
  }

  const inviteTeacher = async () => {
    if (!inviteForm.email.trim()) { setError('Email is required'); return }
    setSaving(true); setError('')
    try {
      await adminAction('create_user', {
        email: inviteForm.email.trim(),
        fullName: inviteForm.fullName.trim() || null,
        role: 'teacher',
        schoolId: inviteForm.schoolId || null,
        membershipTier: inviteForm.schoolId ? 'school' : 'free',
      })
      setShowInvite(false)
      setInviteForm({ email: '', fullName: '', schoolId: '' })
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to invite teacher')
    } finally { setSaving(false) }
  }

  if (loading) return <p className="text-sm py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>

  const independentCount = teachers.filter(t => !t.school_id).length

  return (
    <div>
      {/* Summary bar */}
      {independentCount > 0 && (
        <div
          className="mb-4 p-3 rounded-lg text-sm flex items-center gap-2"
          style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a', color: '#92400e' }}
        >
          <span>⚠️</span>
          <span>
            <strong>{independentCount}</strong> teacher{independentCount !== 1 ? 's' : ''} signed up independently without a school.
            Use <strong>Assign to School</strong> to link them, or they operate on free tier.
          </span>
          <button
            onClick={() => setFilter('independent')}
            className="ml-auto text-xs underline font-medium"
            style={{ color: '#92400e' }}
          >
            Show only
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex-1 min-w-40">
          <Input value={search} onChange={setSearch} placeholder="Search by name or email…" />
        </div>
        {/* Filter pills */}
        {(['all', 'independent', 'school'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={filter === f
              ? { backgroundColor: 'var(--color-brand-primary)', color: '#fff' }
              : { backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }
            }
          >
            {f === 'all' ? `All (${teachers.length})` : f === 'independent' ? `Independent (${independentCount})` : `School-attached (${teachers.length - independentCount})`}
          </button>
        ))}
        <PrimaryBtn onClick={() => { setShowInvite(true); setError('') }} size="sm">+ Invite Teacher</PrimaryBtn>
      </div>

      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
              {['Name', 'School', 'Tier', 'Status', 'Joined', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={t.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{t.first_name ?? '—'}</td>
                <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>
                  {t.school_id ? (schoolMap[t.school_id] ?? 'Unknown school') : (
                    <span className="text-xs font-medium" style={{ color: '#f59e0b' }}>Independent</span>
                  )}
                </td>
                <td className="px-4 py-3"><Badge value={t.membership_tier} type="tier" /></td>
                <td className="px-4 py-3"><Badge value={t.is_active ? 'active' : 'inactive'} type="status" /></td>
                <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{new Date(t.created_at).toLocaleDateString('en-GB')}</td>
                <td className="px-4 py-3">
                  <PrimaryBtn size="sm" variant="ghost" onClick={() => { setSelected(t); setError('') }}>Manage</PrimaryBtn>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>No teachers found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Manage modal */}
      {selected && (
        <Modal title={`Manage: ${selected.first_name ?? selected.email}`} onClose={() => setSelected(null)}>
          <div className="flex flex-col gap-3">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {selected.email} · {selected.school_id ? schoolMap[selected.school_id] ?? 'School' : '⚠️ No school assigned'}
            </p>

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

            {!selected.school_id && (
              <Field label="Assign to School">
                <Select
                  value={selected.school_id ?? ''}
                  onChange={v => setSelected(s => s ? { ...s, school_id: v } : s)}
                  options={[
                    { label: 'Select a school…', value: '' },
                    ...schools.map(s => ({ label: s.name, value: s.id })),
                  ]}
                />
              </Field>
            )}

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex flex-wrap gap-2 mt-2">
              <PrimaryBtn onClick={() => changeTier(selected.id, selected.membership_tier)} disabled={saving}>
                {saving ? 'Saving…' : 'Save Tier'}
              </PrimaryBtn>
              {schools.length > 0 && (
                <PrimaryBtn
                  variant="ghost"
                  onClick={() => {
                    if (selected.school_id) assignToSchool(selected.id, selected.school_id)
                    else setError('Select a school from the dropdown above first')
                  }}
                  disabled={saving || !selected.school_id}
                >
                  Assign to School
                </PrimaryBtn>
              )}
              <PrimaryBtn variant="ghost" onClick={() => resetPassword(selected.id)} disabled={saving}>
                Send Reset Email
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

      {/* Invite Teacher modal */}
      {showInvite && (
        <Modal title="Invite Teacher" onClose={() => setShowInvite(false)}>
          <div className="flex flex-col gap-3">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              The teacher will receive an email with a link to set up their account.
            </p>
            <Field label="Email *">
              <Input value={inviteForm.email} onChange={v => setInviteForm(f => ({ ...f, email: v }))} placeholder="teacher@school.co.uk" type="email" />
            </Field>
            <Field label="Full Name">
              <Input value={inviteForm.fullName} onChange={v => setInviteForm(f => ({ ...f, fullName: v }))} placeholder="James Okonkwo" />
            </Field>
            <Field label="School (optional — leave blank for independent)">
              <Select
                value={inviteForm.schoolId}
                onChange={v => setInviteForm(f => ({ ...f, schoolId: v }))}
                options={[
                  { label: 'No school (independent)', value: '' },
                  ...schools.map(s => ({ label: s.name, value: s.id })),
                ]}
              />
            </Field>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end mt-2">
              <PrimaryBtn variant="ghost" onClick={() => setShowInvite(false)}>Cancel</PrimaryBtn>
              <PrimaryBtn onClick={inviteTeacher} disabled={saving}>{saving ? 'Sending…' : 'Send Invite'}</PrimaryBtn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Access Tab (universal tier upgrade) ─────────────────────────────────────

interface AnyUser {
  id: string
  first_name: string
  role: string
  membership_tier: string
  is_active: boolean
  year_group?: number | null
  pin_code?: string | null
  created_at: string
}

function AccessTab() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AnyUser[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState<string | null>(null) // userId being saved
  const [pendingTiers, setPendingTiers] = useState<Record<string, string>>({})
  const [messages, setMessages] = useState<Record<string, string>>({})
  const [searchDone, setSearchDone] = useState(false)

  const search = async () => {
    if (!query.trim()) return
    setSearching(true); setSearchDone(false)
    try {
      // Search across all profile roles by first_name or pin_code
      const q = query.trim().toLowerCase()
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, role, membership_tier, is_active, year_group, pin_code, created_at')
        .or(`first_name.ilike.%${q}%,pin_code.eq.${q}`)
        .order('created_at', { ascending: false })
        .limit(30)
      setResults((data as AnyUser[]) ?? [])
    } finally {
      setSearching(false)
      setSearchDone(true)
    }
  }

  const upgradeTier = async (userId: string) => {
    const tier = pendingTiers[userId]
    if (!tier) return
    setSaving(userId)
    try {
      await adminAction('change_tier', { userId, tier })
      setMessages(m => ({ ...m, [userId]: `✅ Updated to ${tier}` }))
      // Refresh local result
      setResults(r => r.map(u => u.id === userId ? { ...u, membership_tier: tier } : u))
      setTimeout(() => setMessages(m => { const n = { ...m }; delete n[userId]; return n }), 3000)
    } catch (e: unknown) {
      setMessages(m => ({ ...m, [userId]: `❌ ${e instanceof Error ? e.message : 'Failed'}` }))
    } finally {
      setSaving(null)
    }
  }

  const TIER_COLOUR: Record<string, string> = {
    free:   '#6B7280',
    pro:    '#065f46',
    school: '#1e40af',
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Search for any user by name or PIN, then upgrade their access tier in one click.
          Use this to grant Pro or School access to early testers, pilot schools, or anyone
          who needs access before Stripe checkout is live.
        </p>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={setQuery}
            placeholder="Name, first name, or PIN…"
          />
          <PrimaryBtn onClick={search} disabled={searching || !query.trim()}>
            {searching ? 'Searching…' : 'Search'}
          </PrimaryBtn>
        </div>
      </div>

      {searchDone && results.length === 0 && (
        <p className="text-sm py-4" style={{ color: 'var(--color-text-muted)' }}>No users found for "{query}".</p>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-3">
          {results.map(u => {
            const pendingTier = pendingTiers[u.id] ?? u.membership_tier
            const isDirty = pendingTier !== u.membership_tier
            const isSaving = saving === u.id
            const msg = messages[u.id]

            return (
              <div
                key={u.id}
                className="rounded-xl p-4"
                style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Identity */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                        {u.first_name ?? '—'}
                      </span>
                      <Badge value={u.role} type="role" />
                      {u.pin_code && (
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded"
                          style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                          PIN {u.pin_code}
                        </span>
                      )}
                      {u.year_group && (
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          Yr {u.year_group}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-bold" style={{ color: TIER_COLOUR[u.membership_tier] ?? '#6B7280' }}>
                        Current: {u.membership_tier}
                      </span>
                      {!u.is_active && (
                        <span className="text-xs font-medium text-red-500 ml-1">· inactive</span>
                      )}
                    </div>
                  </div>

                  {/* Tier picker + save */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div style={{ minWidth: 160 }}>
                      <Select
                        value={pendingTier}
                        onChange={v => setPendingTiers(t => ({ ...t, [u.id]: v }))}
                        options={[
                          { label: '🔒 Free', value: 'free' },
                          { label: '⭐ Pro', value: 'pro' },
                          { label: '🏫 School', value: 'school' },
                        ]}
                      />
                    </div>
                    <PrimaryBtn
                      size="sm"
                      disabled={!isDirty || isSaving}
                      onClick={() => upgradeTier(u.id)}
                    >
                      {isSaving ? '…' : 'Save'}
                    </PrimaryBtn>
                  </div>
                </div>

                {msg && (
                  <p className="text-xs mt-2 font-medium" style={{ color: msg.startsWith('✅') ? '#065f46' : '#991b1b' }}>
                    {msg}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Quick bulk actions */}
      {results.length > 1 && (
        <div className="mt-4 p-3 rounded-lg flex flex-wrap items-center gap-2"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
            Bulk set all {results.length} results to:
          </span>
          {(['free', 'pro', 'school'] as const).map(tier => (
            <button
              key={tier}
              onClick={() => setPendingTiers(Object.fromEntries(results.map(u => [u.id, tier])))}
              className="text-xs font-semibold px-2 py-1 rounded-full capitalize"
              style={{
                background: tier === 'pro' ? '#d1fae5' : tier === 'school' ? '#dbeafe' : '#e5e7eb',
                color: tier === 'pro' ? '#065f46' : tier === 'school' ? '#1e40af' : '#374151',
              }}
            >
              {tier}
            </button>
          ))}
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            — then click Save on each row
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Admins Tab ───────────────────────────────────────────────────────────────

interface AdminRow {
  id: string
  email: string
  first_name: string
  is_active: boolean
  created_at: string
  isSuperAdmin: boolean
}

function AdminsTab() {
  const [admins, setAdmins] = useState<AdminRow[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [form, setForm] = useState({ email: '', firstName: '', password: '' })
  const [submitting, setSubmitting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await adminAction('list_admins', {})
      if (result?.admins) setAdmins(result.admins)
    } catch (e) {
      // Edge Function may not be redeployed yet — show empty state gracefully
      console.error('list_admins failed:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null)
    })
  }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email.trim()) return
    setSubmitting(true)
    setMsg(null)
    try {
      const result = await adminAction('create_admin', {
        email: form.email.trim(),
        firstName: form.firstName.trim() || undefined,
        password: form.password.trim() || undefined,
      })
      if (result?.upgraded) {
        setMsg({ type: 'ok', text: 'Existing user upgraded to admin.' })
        setForm({ email: '', firstName: '', password: '' })
        load()
      } else if (result?.created) {
        const pwd = result.tempPassword
          ? ` Temporary password: ${result.tempPassword}`
          : ''
        setMsg({
          type: 'ok',
          text: `Admin created.${pwd} Ask them to change their password after first login.`,
        })
        setForm({ email: '', firstName: '', password: '' })
        load()
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong — please try again.'
      setMsg({ type: 'err', text: msg })
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevoke = async (adminId: string, adminEmail: string) => {
    if (!window.confirm(`Remove admin access for ${adminEmail}? They will be downgraded to Teacher.`)) return
    try {
      await adminAction('revoke_admin', { userId: adminId, callerUserId: currentUserId })
      setMsg({ type: 'ok', text: `Admin access revoked for ${adminEmail}.` })
      load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.'
      setMsg({ type: 'err', text: msg })
    }
  }

  return (
    <div className="space-y-8">
      {/* Warning */}
      <div className="rounded-xl px-5 py-4 flex gap-3" style={{ background: '#FEF3C7', border: '1px solid #F59E0B' }}>
        <span className="text-xl">⚠️</span>
        <div>
          <p className="font-bold text-sm" style={{ color: '#92400E' }}>Platform admin access</p>
          <p className="text-sm mt-0.5" style={{ color: '#92400E' }}>
            Admins have full access to all schools, users, and settings. Only grant this to trusted team members.
          </p>
        </div>
      </div>

      {/* Create form */}
      <div className="rounded-xl p-6 space-y-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <h2 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>Add new admin</h2>
        {msg && (
          <div
            className="rounded-lg px-4 py-2.5 text-sm font-medium"
            style={{
              background: msg.type === 'ok' ? '#D1FAE5' : '#FEE2E2',
              color: msg.type === 'ok' ? '#065F46' : '#991B1B',
            }}
          >
            {msg.text}
          </div>
        )}
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Email address *
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="new-admin@example.com"
              className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
              First name (optional)
            </label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              placeholder="e.g. Sarah"
              className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Password (leave blank to auto-generate)
            </label>
            <input
              type="text"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Min 8 chars"
              className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-brand-primary)' }}
            >
              {submitting ? 'Creating…' : 'Create admin account'}
            </button>
          </div>
        </form>
      </div>

      {/* Existing admins table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
            Current admins ({admins.length})
          </h2>
          <PrimaryBtn size="sm" variant="ghost" onClick={load}>Refresh</PrimaryBtn>
        </div>
        {loading ? (
          <p className="text-sm p-5" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
        ) : admins.length === 0 ? (
          <p className="text-sm p-5" style={{ color: 'var(--color-text-muted)' }}>No admins found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ background: '#F9FAFB' }}>
              <tr>
                {['Name', 'Email', 'Type', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{a.first_name || '—'}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{a.email}</td>
                  <td className="px-4 py-3">
                    {a.isSuperAdmin
                      ? <Badge value="super-admin" />
                      : <Badge value="admin" />}
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={a.is_active ? 'active' : 'inactive'} />
                  </td>
                  <td className="px-4 py-3">
                    {a.isSuperAdmin || a.id === currentUserId ? (
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {a.id === currentUserId ? 'You' : 'Protected'}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRevoke(a.id, a.email)}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                        style={{ background: '#FEE2E2', color: '#991B1B' }}
                      >
                        Revoke access
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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
    try {
      // Use admin-action Edge Function since profiles table has no email column
      const result = await adminAction('find_user_email', { email: email.trim().toLowerCase() })
      if (result?.user) {
        setFound(result.user as Profile)
        setUserId(result.user.id)
      } else {
        setError('No user found with that email address.')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setSearching(false)
    }
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
            <p className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{found.first_name ?? '(no name)'}</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{found.email ?? email} · <Badge value={found.role} type="role" /></p>
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
  { id: 'access',    label: '⭐ Access' },
  { id: 'analytics', label: '📊 Analytics' },
  { id: 'schools',   label: '🏫 Schools' },
  { id: 'teachers',  label: '👩‍🏫 Teachers' },
  { id: 'parents',   label: '👨‍👩‍👧 Parents' },
  { id: 'pupils',    label: '🎒 Pupils' },
  { id: 'passwords', label: '🔑 Passwords' },
  { id: 'admins',    label: '👑 Admins' },
] as const

type TabId = typeof TABS[number]['id']

export default function AdminPage() {
  const navigate = useNavigate()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('access')
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const email = session?.user?.email ?? null
      setUserEmail(email)

      if (!email || !session?.user?.id) {
        navigate('/', { replace: true })
        setAuthChecked(true)
        return
      }

      // Allow access: hardcoded super-admin emails OR profile role = 'admin'
      if (!ADMIN_EMAILS.includes(email)) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        if (profile?.role !== 'admin') {
          navigate('/', { replace: true })
          setAuthChecked(true)
          return
        }
      }

      setAuthChecked(true)
    })
  }, [navigate])

  if (!authChecked) return null
  if (!userEmail) return null

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
          <a
            href="https://wrife.co.uk"
            className="text-sm px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-brand-primary)', border: '1px solid var(--color-brand-primary)', textDecoration: 'none', fontWeight: 600 }}
            data-tts="Back to WriFe main site"
            aria-label="Back to wrife.co.uk"
          >
            ← wrife.co.uk
          </a>
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
          {activeTab === 'access'    && <AccessTab />}
          {activeTab === 'analytics' && <AnalyticsTab />}
          {activeTab === 'schools'   && <SchoolsTab />}
          {activeTab === 'teachers'  && <TeachersTab />}
          {activeTab === 'parents'   && <ParentsTab />}
          {activeTab === 'pupils'    && <PupilsTab />}
          {activeTab === 'passwords' && <PasswordsTab />}
          {activeTab === 'admins'    && <AdminsTab />}
        </motion.div>
      </main>
    </div>
  )
}
