/**
 * WF-023: Admin Panel — School Settings Tab
 * Display/edit school name, URN, phase. Save to schools table.
 */

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { SchoolPhase } from '../../types/index'
import type { School } from '../../types/index'

const PHASE_LABELS: Record<SchoolPhase, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  all_through: 'All Through',
}

export function SchoolSettingsTab({ schoolId }: { schoolId: string }) {
  const [school, setSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editPhase, setEditPhase] = useState<SchoolPhase>(SchoolPhase.PRIMARY)

  useEffect(() => {
    supabase
      .from('schools')
      .select('*')
      .eq('id', schoolId)
      .single()
      .then(({ data }) => {
        if (data) {
          setSchool(data as School)
          setEditName(data.name)
          setEditPhase(data.phase as SchoolPhase)
        }
        setLoading(false)
      })
  }, [schoolId])

  function startEdit() {
    if (!school) return
    setEditName(school.name)
    setEditPhase(school.phase)
    setEditing(true)
  }

  async function handleSave() {
    if (!school) return
    setSaving(true)
    const { data } = await supabase
      .from('schools')
      .update({ name: editName.trim(), phase: editPhase })
      .eq('id', schoolId)
      .select('*')
      .single()
    if (data) setSchool(data as School)
    setEditing(false)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p style={{ color: 'var(--color-text-muted)' }}>Loading settings…</p>
      </div>
    )
  }

  if (!school) {
    return (
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        School record not found.
      </p>
    )
  }

  return (
    <div className="space-y-5 max-w-lg" data-testid="school-settings-tab">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          School Settings
        </h2>
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            data-testid="edit-school-button"
            className="text-sm px-4 py-2 rounded-lg font-medium"
            style={{ color: 'var(--color-brand-primary)', border: '1px solid var(--color-brand-primary)' }}
          >
            Edit
          </button>
        )}
      </div>

      <div
        className="rounded-xl p-5 space-y-4"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        {/* School Name */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            School Name
          </span>
          {editing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              data-testid="input-school-name"
              className="rounded-lg px-3 py-2 text-sm"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            />
          ) : (
            <p className="text-base font-semibold" style={{ color: 'var(--color-text)' }} data-tts={school.name}>
              {school.name}
            </p>
          )}
        </div>

        {/* URN — read-only always */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            URN
          </span>
          <p className="text-sm" style={{ color: 'var(--color-text)' }} data-tts={`URN ${school.urn}`}>
            {school.urn}
          </p>
        </div>

        {/* Phase */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            Phase
          </span>
          {editing ? (
            <select
              value={editPhase}
              onChange={(e) => setEditPhase(e.target.value as SchoolPhase)}
              data-testid="select-school-phase"
              className="rounded-lg px-3 py-2 text-sm"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            >
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
              <option value="all_through">All Through</option>
            </select>
          ) : (
            <p className="text-sm" style={{ color: 'var(--color-text)' }}>
              {PHASE_LABELS[school.phase as SchoolPhase]}
            </p>
          )}
        </div>

        {editing && (
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!editName.trim() || saving}
              data-testid="save-settings-button"
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white"
              style={{
                backgroundColor: 'var(--color-brand-primary)',
                opacity: !editName.trim() || saving ? 0.5 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              data-testid="cancel-settings-button"
              className="px-4 py-2 rounded-lg text-sm"
              style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {saved && (
        <p className="text-sm" role="status" style={{ color: '#166534' }} data-testid="settings-saved-msg">
          School settings saved.
        </p>
      )}
    </div>
  )
}
