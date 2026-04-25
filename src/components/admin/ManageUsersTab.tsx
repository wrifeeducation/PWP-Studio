/**
 * WF-023: Admin Panel — Manage Users Tab
 * Searchable, filterable table of all profiles. Deactivate button sets is_active=false.
 */

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Role } from '../../types/index'

interface UserRow {
  id: string
  first_name: string
  role: Role
  class_name: string | null
  year_group: number | null
  last_active: string | null
  is_active: boolean
}

const ROLE_LABELS: Record<string, string> = {
  pupil: 'Pupil',
  teacher: 'Teacher',
  school_admin: 'Admin',
  parent: 'Parent',
}

export function ManageUsersTab({ schoolId }: { schoolId: string }) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [deactivating, setDeactivating] = useState<string | null>(null)

  async function loadUsers() {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, role, class_id, year_group, updated_at, is_active')
      .eq('school_id', schoolId)
      .order('role')
      .order('first_name')

    if (!profiles) { setLoading(false); return }

    // Fetch class names for those that have a class
    const classIds = [...new Set(profiles.filter((p) => p.class_id).map((p) => p.class_id as string))]
    let classMap: Record<string, string> = {}
    if (classIds.length > 0) {
      const { data: classes } = await supabase.from('classes').select('id, name').in('id', classIds)
      classMap = Object.fromEntries((classes ?? []).map((c) => [c.id, c.name]))
    }

    setUsers(
      profiles.map((p) => ({
        id: p.id,
        first_name: p.first_name,
        role: p.role as Role,
        class_name: p.class_id ? (classMap[p.class_id] ?? null) : null,
        year_group: p.year_group,
        last_active: p.updated_at ?? null,
        is_active: (p as unknown as { is_active: boolean }).is_active ?? true,
      }))
    )
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [schoolId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDeactivate(userId: string) {
    setDeactivating(userId)
    await supabase.from('profiles').update({ is_active: false } as never).eq('id', userId)
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_active: false } : u))
    setDeactivating(null)
  }

  const filtered = users.filter((u) => {
    const matchSearch = u.first_name.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter ? u.role === roleFilter : true
    return matchSearch && matchRole
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p style={{ color: 'var(--color-text-muted)' }}>Loading users…</p>
      </div>
    )
  }

  return (
    <div className="space-y-4" data-testid="manage-users-tab">
      <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
        All Users ({filtered.length})
      </h2>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          data-testid="user-search"
          className="rounded-lg px-3 py-2 text-sm flex-1 min-w-[180px]"
          style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          data-testid="role-filter"
          className="rounded-lg px-3 py-2 text-sm"
          style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        >
          <option value="">All roles</option>
          <option value="pupil">Pupil</option>
          <option value="teacher">Teacher</option>
          <option value="school_admin">Admin</option>
          <option value="parent">Parent</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--color-border)' }}>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--color-background)', borderBottom: '1px solid var(--color-border)' }}>
              {['Name', 'Role', 'Class', 'Year', 'Last Active', ''].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>
                  No users match your search.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr
                  key={u.id}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    backgroundColor: u.is_active ? 'var(--color-surface)' : 'var(--color-background)',
                    opacity: u.is_active ? 1 : 0.6,
                  }}
                  data-testid={`user-row-${u.id}`}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{u.first_name}</td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: u.role === 'teacher' ? '#EFF6FF' : u.role === 'pupil' ? '#F0FDF4' : '#F5F3FF',
                        color: u.role === 'teacher' ? '#1D4ED8' : u.role === 'pupil' ? '#166534' : '#6D28D9',
                      }}
                    >
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>
                    {u.class_name ?? <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>
                    {u.year_group != null ? `Yr ${u.year_group}` : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>
                    {u.last_active ? new Date(u.last_active).toLocaleDateString('en-GB') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_active && u.role !== 'school_admin' ? (
                      <button
                        type="button"
                        onClick={() => handleDeactivate(u.id)}
                        disabled={deactivating === u.id}
                        data-testid={`deactivate-user-${u.id}`}
                        className="text-xs px-2 py-1 rounded"
                        style={{ color: '#B45309', border: '1px solid #FDE68A' }}
                      >
                        {deactivating === u.id ? 'Working…' : 'Deactivate'}
                      </button>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {u.is_active ? '' : 'Inactive'}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
