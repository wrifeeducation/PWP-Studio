/**
 * WF-023: Admin Panel — Overview Tab
 * School-wide stats: pupil count, teacher count, class count, avg level, % studio unlocked.
 */

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { APP_VERSION, BUILD_DATE } from '../../lib/version'
import type { School } from '../../types/index'

interface OverviewStats {
  school: School | null
  totalPupils: number
  totalTeachers: number
  totalClasses: number
  avgFormulaLevel: number | null
  pctStudioUnlocked: number | null
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-1"
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      data-testid={`stat-card-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </span>
      <span className="text-2xl font-bold" style={{ color: 'var(--color-text)' }} data-tts={value}>
        {value}
      </span>
    </div>
  )
}

export function OverviewTab({ schoolId }: { schoolId: string }) {
  const [stats, setStats] = useState<OverviewStats>({
    school: null,
    totalPupils: 0,
    totalTeachers: 0,
    totalClasses: 0,
    avgFormulaLevel: null,
    pctStudioUnlocked: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [schoolRes, profilesRes, classesRes, progressRes] = await Promise.all([
        supabase.from('schools').select('*').eq('id', schoolId).single(),
        supabase.from('profiles').select('id, role').eq('school_id', schoolId),
        supabase.from('classes').select('id').eq('school_id', schoolId),
        supabase
          .from('formula_progress')
          .select('pupil_id, current_formula_level, writing_studio_unlocked')
          .in(
            'pupil_id',
            // sub-select pupils in this school
            (await supabase.from('profiles').select('id').eq('school_id', schoolId).eq('role', 'pupil')).data?.map(
              (p) => p.id
            ) ?? []
          ),
      ])

      const profiles = profilesRes.data ?? []
      const pupils = profiles.filter((p) => p.role === 'pupil')
      const teachers = profiles.filter((p) => p.role === 'teacher')
      const progress = progressRes.data ?? []

      const avgLevel =
        progress.length > 0
          ? progress.reduce((sum, r) => sum + (r.current_formula_level ?? 1), 0) / progress.length
          : null

      const pctStudio =
        progress.length > 0
          ? (progress.filter((r) => r.writing_studio_unlocked).length / progress.length) * 100
          : null

      setStats({
        school: (schoolRes.data as unknown as School) ?? null,
        totalPupils: pupils.length,
        totalTeachers: teachers.length,
        totalClasses: (classesRes.data ?? []).length,
        avgFormulaLevel: avgLevel,
        pctStudioUnlocked: pctStudio,
      })
      setLoading(false)
    }

    load()
  }, [schoolId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p style={{ color: 'var(--color-text-muted)' }}>Loading overview…</p>
      </div>
    )
  }

  const { school } = stats

  return (
    <div className="space-y-6" data-testid="overview-tab">
      {school && (
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-xs uppercase tracking-wide font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
            School
          </p>
          <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }} data-tts={school.name}>
            {school.name}
          </p>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            URN: {school.urn} &middot; Phase: {school.phase.replace('_', ' ')}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total Pupils" value={String(stats.totalPupils)} />
        <StatCard label="Total Teachers" value={String(stats.totalTeachers)} />
        <StatCard label="Total Classes" value={String(stats.totalClasses)} />
        <StatCard
          label="Avg Formula Level"
          value={stats.avgFormulaLevel != null ? `L${stats.avgFormulaLevel.toFixed(1)}` : '—'}
        />
        <StatCard
          label="Studio Unlocked"
          value={stats.pctStudioUnlocked != null ? `${stats.pctStudioUnlocked.toFixed(0)}%` : '—'}
        />
      </div>

      {/* WF-059: App version info */}
      <div
        className="rounded-xl p-4 text-xs"
        style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
        data-testid="app-version-info"
      >
        WriFe v{APP_VERSION} &middot; Build date: {BUILD_DATE}
      </div>
    </div>
  )
}
