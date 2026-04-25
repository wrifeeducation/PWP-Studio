/**
 * WF-023: Admin Panel — Manage Classes Tab
 * List of classes with teacher, year group, pupil count. Add Class form. Delete with confirm.
 */

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface ClassRow {
  id: string
  name: string
  year_group: number
  teacher_id: string | null
  teacher_name: string | null
  pupil_count: number
  academic_year: string
}

interface TeacherOption {
  id: string
  first_name: string
}

export function ManageClassesTab({ schoolId }: { schoolId: string }) {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [teachers, setTeachers] = useState<TeacherOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Add class form state
  const [newName, setNewName] = useState('')
  const [newYear, setNewYear] = useState('1')
  const [newTeacher, setNewTeacher] = useState('')

  async function loadData() {
    const [classRes, teacherRes] = await Promise.all([
      supabase
        .from('classes')
        .select('id, name, year_group, teacher_id, academic_year')
        .eq('school_id', schoolId)
        .order('year_group'),
      supabase.from('profiles').select('id, first_name').eq('school_id', schoolId).eq('role', 'teacher'),
    ])

    const teacherList = (teacherRes.data ?? []) as TeacherOption[]
    setTeachers(teacherList)

    // For each class, count pupils
    const rawClasses = (classRes.data ?? []) as {
      id: string; name: string; year_group: number; teacher_id: string | null; academic_year: string
    }[]

    const withCounts = await Promise.all(
      rawClasses.map(async (cls) => {
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('class_id', cls.id)
          .eq('role', 'pupil')

        const teacher = teacherList.find((t) => t.id === cls.teacher_id)
        return {
          ...cls,
          teacher_name: teacher?.first_name ?? null,
          pupil_count: count ?? 0,
        }
      })
    )

    setClasses(withCounts)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [schoolId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAddClass() {
    if (!newName.trim()) return
    setSaving(true)
    const currentYear = new Date().getFullYear()
    const academic_year = `${currentYear}-${String(currentYear + 1).slice(2)}`
    await supabase.from('classes').insert({
      school_id: schoolId,
      name: newName.trim(),
      year_group: Number(newYear),
      teacher_id: newTeacher || null,
      academic_year,
    })
    setNewName('')
    setNewYear('1')
    setNewTeacher('')
    setShowAdd(false)
    setSaving(false)
    await loadData()
  }

  async function handleDelete(classId: string) {
    await supabase.from('classes').delete().eq('id', classId)
    setConfirmDelete(null)
    await loadData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p style={{ color: 'var(--color-text-muted)' }}>Loading classes…</p>
      </div>
    )
  }

  return (
    <div className="space-y-5" data-testid="manage-classes-tab">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          Classes ({classes.length})
        </h2>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          data-testid="add-class-button"
          className="text-sm px-4 py-2 rounded-lg font-medium text-white"
          style={{ backgroundColor: 'var(--color-brand-primary)' }}
        >
          {showAdd ? 'Cancel' : '+ Add Class'}
        </button>
      </div>

      {showAdd && (
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          data-testid="add-class-form"
        >
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>New Class</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="class-name" className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Class Name
              </label>
              <input
                id="class-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Year 4 Oak"
                data-testid="input-class-name"
                className="rounded-lg px-3 py-2 text-sm"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="class-year" className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Year Group
              </label>
              <select
                id="class-year"
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                data-testid="select-class-year"
                className="rounded-lg px-3 py-2 text-sm"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              >
                {Array.from({ length: 9 }, (_, i) => i + 1).map((y) => (
                  <option key={y} value={y}>Year {y}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="class-teacher" className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Teacher
              </label>
              <select
                id="class-teacher"
                value={newTeacher}
                onChange={(e) => setNewTeacher(e.target.value)}
                data-testid="select-class-teacher"
                className="rounded-lg px-3 py-2 text-sm"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              >
                <option value="">Unassigned</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.first_name}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddClass}
            disabled={!newName.trim() || saving}
            data-testid="save-class-button"
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white"
            style={{
              backgroundColor: 'var(--color-brand-primary)',
              opacity: !newName.trim() || saving ? 0.5 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save Class'}
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--color-border)' }}>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--color-background)', borderBottom: '1px solid var(--color-border)' }}>
              {['Class', 'Year Group', 'Teacher', 'Pupils', ''].map((h) => (
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
            {classes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>
                  No classes yet. Add one above.
                </td>
              </tr>
            ) : (
              classes.map((cls) => (
                <tr
                  key={cls.id}
                  style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
                  data-testid={`class-row-${cls.id}`}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{cls.name}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>Year {cls.year_group}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>
                    {cls.teacher_name ?? <span style={{ color: 'var(--color-text-muted)' }}>Unassigned</span>}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>{cls.pupil_count}</td>
                  <td className="px-4 py-3">
                    {confirmDelete === cls.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: '#DC2626' }}>Delete?</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(cls.id)}
                          data-testid={`confirm-delete-${cls.id}`}
                          className="text-xs px-2 py-1 rounded font-medium text-white"
                          style={{ backgroundColor: '#DC2626' }}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(null)}
                          data-testid={`cancel-delete-${cls.id}`}
                          className="text-xs px-2 py-1 rounded"
                          style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(cls.id)}
                        data-testid={`delete-class-${cls.id}`}
                        className="text-xs px-2 py-1 rounded"
                        style={{ color: '#DC2626', border: '1px solid #FECACA' }}
                      >
                        Delete
                      </button>
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
