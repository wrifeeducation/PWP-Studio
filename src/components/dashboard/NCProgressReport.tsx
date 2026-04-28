/**
 * NCProgressReport — National Curriculum Progress Report tab for teachers.
 *
 * Shows:
 *  1. Class selector dropdown
 *  2. Band distribution summary (4 coloured cards)
 *  3. NC Objectives coverage table (how many pupils have met each objective)
 *  4. Per-pupil progress table with NC band chip
 */

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import {
  NC_OBJECTIVES,
  getNcBand,
  BAND_LABELS,
  BAND_SHORT_LABELS,
  BAND_COLOURS,
  BAND_TEXT_COLOURS,
  KS_COLOURS,
  type NCBand,
} from '../../lib/ncObjectives'

// ─── Local types ──────────────────────────────────────────────────────────────

interface ClassRow {
  id: string
  name: string
  year_group: number
  academic_year: string
  school_id: string
}

interface PupilProgressRow {
  pupil_id: string
  first_name: string
  year_group: number | null
  current_formula_level: number
  total_xp: number
  current_streak: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NCProgressReport() {
  const { profile } = useAuthStore()
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [pupils, setPupils] = useState<PupilProgressRow[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingPupils, setLoadingPupils] = useState(false)

  // ── Load classes ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile?.school_id) return
    supabase
      .from('classes')
      .select('id, name, year_group, academic_year, school_id')
      .eq('school_id', profile.school_id)
      .order('year_group')
      .then(({ data }) => {
        const rows = (data as ClassRow[]) ?? []
        setClasses(rows)
        if (rows.length > 0) setSelectedClassId(rows[0].id)
        setLoadingClasses(false)
      })
  }, [profile])

  // ── Load pupils when class changes ──────────────────────────────────────────
  useEffect(() => {
    if (!selectedClassId) return
    setLoadingPupils(true)
    setPupils([])

    // Join profiles + pupil_progress
    supabase
      .from('profiles')
      .select('id, first_name, year_group')
      .eq('class_id', selectedClassId)
      .eq('role', 'pupil')
      .order('first_name')
      .then(async ({ data: profileData }) => {
        if (!profileData || profileData.length === 0) {
          setLoadingPupils(false)
          return
        }

        const pupilIds = profileData.map((p) => p.id)

        const { data: progressData } = await supabase
          .from('pupil_progress')
          .select('pupil_id, current_formula_level, total_xp, current_streak')
          .in('pupil_id', pupilIds)

        const progressMap = new Map(
          (progressData ?? []).map((p) => [
            p.pupil_id,
            {
              current_formula_level: p.current_formula_level ?? 1,
              total_xp: p.total_xp ?? 0,
              current_streak: p.current_streak ?? 0,
            },
          ])
        )

        const rows: PupilProgressRow[] = profileData.map((p) => {
          const prog = progressMap.get(p.id)
          return {
            pupil_id: p.id,
            first_name: p.first_name,
            year_group: p.year_group ?? null,
            current_formula_level: prog?.current_formula_level ?? 1,
            total_xp: prog?.total_xp ?? 0,
            current_streak: prog?.current_streak ?? 0,
          }
        })

        setPupils(rows)
        setLoadingPupils(false)
      })
  }, [selectedClassId])

  // ── Derived data ────────────────────────────────────────────────────────────
  const selectedClass = classes.find((c) => c.id === selectedClassId) ?? null

  const classYearGroup = selectedClass?.year_group ?? null

  const pupilBands: NCBand[] = pupils.map((p) =>
    getNcBand(p.current_formula_level, p.year_group ?? classYearGroup)
  )

  const bandCounts: Record<NCBand, number> = {
    below: 0,
    working: 0,
    meeting: 0,
    exceeding: 0,
  }
  pupilBands.forEach((b) => bandCounts[b]++)

  const totalPupils = pupils.length

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loadingClasses) {
    return (
      <div className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>
        Loading classes…
      </div>
    )
  }

  if (classes.length === 0) {
    return (
      <div className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>
        <p className="text-lg font-medium mb-2">No classes found.</p>
        <p className="text-sm">Create a class in the My Classes tab first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="nc-progress-report">

      {/* ── Title + class selector ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2
            className="text-xl font-bold"
            style={{ color: 'var(--color-text)' }}
            data-tts="National Curriculum Progress Report"
          >
            NC Progress Report
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            How your class is tracking against English National Curriculum expectations
          </p>
        </div>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm font-medium"
          style={{
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text)',
          }}
          data-testid="nc-class-selector"
          aria-label="Select class"
        >
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name} — Y{cls.year_group} ({cls.academic_year})
            </option>
          ))}
        </select>
      </div>

      {loadingPupils ? (
        <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
          Loading pupil data…
        </div>
      ) : pupils.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
          <p className="text-base font-medium mb-1">No pupils in this class yet.</p>
          <p className="text-sm">Add pupils via the My Classes tab.</p>
        </div>
      ) : (
        <>
          {/* ── Band summary cards ───────────────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
              Band Distribution · {totalPupils} pupil{totalPupils !== 1 ? 's' : ''}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['below', 'working', 'meeting', 'exceeding'] as NCBand[]).map((band) => {
                const count = bandCounts[band]
                const pct = totalPupils > 0 ? Math.round((count / totalPupils) * 100) : 0
                return (
                  <div
                    key={band}
                    className="rounded-xl p-4 flex flex-col gap-1"
                    style={{
                      backgroundColor: BAND_COLOURS[band],
                      border: `1px solid ${BAND_TEXT_COLOURS[band]}30`,
                    }}
                    data-testid={`band-card-${band}`}
                  >
                    <span
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: BAND_TEXT_COLOURS[band] }}
                    >
                      {BAND_SHORT_LABELS[band]}
                    </span>
                    <span
                      className="text-3xl font-bold"
                      style={{ color: BAND_TEXT_COLOURS[band] }}
                      data-tts={`${count} pupils ${BAND_LABELS[band]}`}
                    >
                      {count}
                    </span>
                    <span className="text-xs" style={{ color: BAND_TEXT_COLOURS[band], opacity: 0.7 }}>
                      {pct}% of class
                    </span>
                  </div>
                )
              })}
            </div>
          </section>

          {/* ── NC Objectives coverage table ─────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
              NC Objectives Coverage
            </h3>
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--color-border)' }}
            >
              <table className="w-full text-sm" data-testid="nc-objectives-table">
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text)' }}>
                      Objective
                    </th>
                    <th className="text-center px-3 py-3 font-semibold w-24" style={{ color: 'var(--color-text)' }}>
                      Stage
                    </th>
                    <th className="text-center px-3 py-3 font-semibold w-28" style={{ color: 'var(--color-text)' }}>
                      Unlocks at
                    </th>
                    <th className="text-center px-3 py-3 font-semibold w-32" style={{ color: 'var(--color-text)' }}>
                      Pupils met
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {NC_OBJECTIVES.map((obj, i) => {
                    const metCount = pupils.filter(
                      (p) => p.current_formula_level >= obj.unlockAt
                    ).length
                    const metPct = totalPupils > 0 ? Math.round((metCount / totalPupils) * 100) : 0
                    const ksStyle = KS_COLOURS[obj.ks]
                    return (
                      <tr
                        key={obj.id}
                        style={{
                          backgroundColor: i % 2 === 0 ? 'var(--color-background)' : 'var(--color-surface)',
                          borderBottom: '1px solid var(--color-border)',
                        }}
                        data-testid={`nc-obj-row-${obj.id}`}
                      >
                        <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>
                          {obj.label}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                            style={{ backgroundColor: ksStyle.bg, color: ksStyle.text }}
                          >
                            {obj.ks}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded"
                            style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                          >
                            Level {obj.unlockAt}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className="text-sm font-bold"
                              style={{
                                color: metPct >= 80 ? '#16A34A' : metPct >= 50 ? '#A16207' : '#DC2626',
                              }}
                            >
                              {metCount}/{totalPupils}
                            </span>
                            {/* Mini bar */}
                            <div
                              className="w-16 h-1.5 rounded-full overflow-hidden"
                              style={{ backgroundColor: 'var(--color-border)' }}
                            >
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${metPct}%`,
                                  backgroundColor: metPct >= 80 ? '#16A34A' : metPct >= 50 ? '#F59E0B' : '#DC2626',
                                }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Per-pupil detail table ───────────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
              Individual Pupil Progress
            </h3>
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--color-border)' }}
            >
              <table className="w-full text-sm" data-testid="nc-pupil-table">
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text)' }}>
                      Pupil
                    </th>
                    <th className="text-center px-3 py-3 font-semibold w-24" style={{ color: 'var(--color-text)' }}>
                      Level
                    </th>
                    <th className="text-center px-3 py-3 font-semibold w-24" style={{ color: 'var(--color-text)' }}>
                      XP
                    </th>
                    <th className="text-center px-3 py-3 font-semibold w-24" style={{ color: 'var(--color-text)' }}>
                      Streak
                    </th>
                    <th className="text-center px-3 py-3 font-semibold w-36" style={{ color: 'var(--color-text)' }}>
                      NC Band
                    </th>
                    <th className="text-center px-3 py-3 font-semibold w-32" style={{ color: 'var(--color-text)' }}>
                      Objectives met
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pupils
                    .slice()
                    .sort((a, b) => b.current_formula_level - a.current_formula_level)
                    .map((pupil, i) => {
                      const band = getNcBand(
                        pupil.current_formula_level,
                        pupil.year_group ?? classYearGroup
                      )
                      const objMet = NC_OBJECTIVES.filter(
                        (o) => pupil.current_formula_level >= o.unlockAt
                      ).length
                      return (
                        <tr
                          key={pupil.pupil_id}
                          style={{
                            backgroundColor: i % 2 === 0 ? 'var(--color-background)' : 'var(--color-surface)',
                            borderBottom: '1px solid var(--color-border)',
                          }}
                          data-testid={`nc-pupil-row-${pupil.pupil_id}`}
                        >
                          <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }} data-tts={pupil.first_name}>
                            {pupil.first_name}
                          </td>
                          <td className="px-3 py-3 text-center font-semibold" style={{ color: 'var(--color-brand-primary)' }}>
                            L{pupil.current_formula_level}
                          </td>
                          <td className="px-3 py-3 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {pupil.total_xp.toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span
                              style={{ color: pupil.current_streak > 0 ? '#E74C3C' : 'var(--color-text-muted)' }}
                            >
                              {pupil.current_streak > 0 ? `🔥 ${pupil.current_streak}` : '–'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span
                              className="text-xs font-semibold px-2 py-1 rounded-full"
                              style={{
                                backgroundColor: BAND_COLOURS[band],
                                color: BAND_TEXT_COLOURS[band],
                              }}
                              data-tts={BAND_LABELS[band]}
                            >
                              {BAND_SHORT_LABELS[band]}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span
                              className="text-xs font-medium"
                              style={{ color: 'var(--color-text)' }}
                            >
                              {objMet} / {NC_OBJECTIVES.length}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
