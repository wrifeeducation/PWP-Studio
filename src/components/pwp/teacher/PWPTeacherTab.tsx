/**
 * PWPTeacherTab — PWP section of the Teacher Dashboard.
 *
 * Four panels (sub-tabs):
 *   overview   — Class PWP overview: pupils, highest lesson, sessions this week
 *   theme      — Weekly theme setter (theme_noun + genre_hint)
 *   sessions   — Recent session review with step-level detail
 *   positions  — Curriculum position editor (update highest_lesson per pupil)
 */

import React, { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PupilPWPRow {
  pupil_id: string
  first_name: string | null
  highest_lesson: number
  sessions_this_week: number
  last_session_at: string | null
  last_subject_noun: string | null
}

interface RecentSession {
  id: string
  pupil_id: string
  first_name: string | null
  subject_noun: string
  chain_length: number
  status: string
  created_at: string
  completed_at: string | null
}

interface SessionDetail {
  id: string
  step_number: number
  element_id: string
  formula_label: string
  sentence: string
  ai_passed: boolean
  attempts: number
  ai_feedback: string | null
}

interface WeeklyTheme {
  id?: string
  theme_noun: string
  genre_hint: string
}

type SubTab = 'overview' | 'theme' | 'sessions' | 'positions'

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'overview', label: 'Class Overview' },
  { id: 'theme', label: 'Weekly Theme' },
  { id: 'sessions', label: 'Session Review' },
  { id: 'positions', label: 'Curriculum Positions' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMonday(d: Date): string {
  const day = d.getDay()
  const diff = (day + 6) % 7
  const monday = new Date(d)
  monday.setDate(d.getDate() - diff)
  return monday.toISOString().split('T')[0]
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function lessonBadgeColour(lesson: number): string {
  if (lesson >= 40) return '#27ae60'
  if (lesson >= 20) return '#F5A623'
  return '#6C5CE7'
}

// ─── Main component ───────────────────────────────────────────────────────────

export const PWPTeacherTab: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>('overview')

  return (
    <div className="w-full" data-testid="pwp-teacher-tab">
      {/* Sub-tab nav */}
      <div className="flex gap-1 mb-6 flex-wrap">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            data-testid={`pwp-subtab-${t.id}`}
            className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
            style={{
              backgroundColor: subTab === t.id ? 'var(--color-brand-primary)' : 'transparent',
              color: subTab === t.id ? '#fff' : 'var(--color-text-muted)',
              border: `1.5px solid ${subTab === t.id ? 'var(--color-brand-primary)' : 'var(--color-border)'}`,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={subTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {subTab === 'overview' && <ClassOverviewPanel />}
          {subTab === 'theme' && <WeeklyThemePanel />}
          {subTab === 'sessions' && <SessionReviewPanel />}
          {subTab === 'positions' && <CurriculumPositionsPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Class Overview Panel ─────────────────────────────────────────────────────

function ClassOverviewPanel() {
  const { profile } = useAuthStore()
  const classId = profile?.class_id ?? null
  const weekStart = getMonday(new Date())

  const { data: pupils, isLoading } = useQuery({
    queryKey: ['pwp_class_overview', classId, weekStart],
    queryFn: async (): Promise<PupilPWPRow[]> => {
      if (!classId) return []

      // Fetch pupils in this class
      const { data: pupilProfiles } = await supabase
        .from('profiles')
        .select('id, first_name')
        .eq('class_id', classId)
        .eq('role', 'pupil')

      if (!pupilProfiles?.length) return []

      const pupilIds = pupilProfiles.map((p) => p.id)

      // Fetch curriculum positions
      const { data: positions } = await supabase
        .from('pwp_pupil_positions')
        .select('pupil_id, highest_lesson')
        .in('pupil_id', pupilIds)

      // Fetch sessions this week
      const { data: sessions } = await supabase
        .from('pwp_sessions')
        .select('pupil_id, created_at, completed_at, subject_noun')
        .in('pupil_id', pupilIds)
        .gte('created_at', weekStart)
        .order('created_at', { ascending: false })

      const posMap = Object.fromEntries((positions ?? []).map((p) => [p.pupil_id, p.highest_lesson]))
      const sessionsByPupil: Record<string, typeof sessions> = {}
      for (const s of sessions ?? []) {
        if (!sessionsByPupil[s.pupil_id]) sessionsByPupil[s.pupil_id] = []
        sessionsByPupil[s.pupil_id]!.push(s)
      }

      return pupilProfiles.map((p) => {
        const pupilSessions = sessionsByPupil[p.id] ?? []
        const lastSession = pupilSessions[0]
        return {
          pupil_id: p.id,
          first_name: p.first_name,
          highest_lesson: posMap[p.id] ?? 10,
          sessions_this_week: pupilSessions.length,
          last_session_at: lastSession?.created_at ?? null,
          last_subject_noun: lastSession?.subject_noun ?? null,
        }
      }).sort((a, b) => (a.first_name ?? '').localeCompare(b.first_name ?? ''))
    },
    enabled: !!classId,
  })

  if (isLoading) return <LoadingPanel label="Loading class overview…" />
  if (!classId) return <EmptyPanel message="No class linked to your account." />
  if (!pupils?.length) return <EmptyPanel message="No pupils found in your class." />

  const withSessions = pupils.filter((p) => p.sessions_this_week > 0).length
  const avgLesson = Math.round(pupils.reduce((sum, p) => sum + p.highest_lesson, 0) / pupils.length)

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Pupils', value: pupils.length },
          { label: 'Sessions this week', value: withSessions },
          { label: 'Avg lesson', value: `L${avgLesson}` },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl px-4 py-3 text-center"
            style={{ backgroundColor: 'rgba(108,92,231,0.07)', border: '1px solid rgba(108,92,231,0.15)' }}
          >
            <div className="text-2xl font-bold" style={{ color: 'var(--color-brand-primary)' }}>{card.value}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Pupil table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--color-surface)' }}>
              <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--color-text-muted)' }}>Pupil</th>
              <th className="px-4 py-3 text-center font-semibold" style={{ color: 'var(--color-text-muted)' }}>Lesson</th>
              <th className="px-4 py-3 text-center font-semibold" style={{ color: 'var(--color-text-muted)' }}>Sessions this wk</th>
              <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--color-text-muted)' }}>Last session</th>
              <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--color-text-muted)' }}>Subject</th>
            </tr>
          </thead>
          <tbody>
            {pupils.map((p, i) => (
              <tr
                key={p.pupil_id}
                style={{
                  borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
                  backgroundColor: 'var(--color-background)',
                }}
              >
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>
                  {p.first_name ?? '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-full text-white"
                    style={{ backgroundColor: lessonBadgeColour(p.highest_lesson) }}
                  >
                    L{p.highest_lesson}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: p.sessions_this_week > 0 ? '#27ae60' : 'var(--color-text-muted)' }}
                  >
                    {p.sessions_this_week}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {formatDate(p.last_session_at)}
                </td>
                <td className="px-4 py-3 text-sm italic" style={{ color: 'var(--color-text-muted)' }}>
                  {p.last_subject_noun ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Weekly Theme Panel ───────────────────────────────────────────────────────

const GENRE_HINTS = [
  'narrative',
  'non-fiction',
  'persuasive',
  'descriptive',
  'recount',
  'explanation',
  'poetry',
]

function WeeklyThemePanel() {
  const { profile } = useAuthStore()
  const classId = profile?.class_id ?? null
  const weekStart = getMonday(new Date())
  const queryClient = useQueryClient()

  const [themeNoun, setThemeNoun] = useState('')
  const [genreHint, setGenreHint] = useState('narrative')
  const [saved, setSaved] = useState(false)

  const { data: existing, isLoading } = useQuery({
    queryKey: ['pwp_class_theme_teacher', classId, weekStart],
    queryFn: async (): Promise<WeeklyTheme | null> => {
      if (!classId) return null
      const { data } = await supabase
        .from('pwp_class_themes')
        .select('id, theme_noun, genre_hint')
        .eq('class_id', classId)
        .eq('week_start', weekStart)
        .maybeSingle()
      return data
    },
    enabled: !!classId,
  })

  useEffect(() => {
    if (existing) {
      setThemeNoun(existing.theme_noun)
      setGenreHint(existing.genre_hint)
    }
  }, [existing])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!classId) return
      await supabase
        .from('pwp_class_themes')
        .upsert(
          { class_id: classId, week_start: weekStart, theme_noun: themeNoun.trim(), genre_hint: genreHint },
          { onConflict: 'class_id,week_start' },
        )
    },
    onSuccess: () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      void queryClient.invalidateQueries({ queryKey: ['pwp_class_theme_teacher'] })
      void queryClient.invalidateQueries({ queryKey: ['pwp_class_theme'] })
    },
  })

  if (isLoading) return <LoadingPanel label="Loading theme…" />
  if (!classId) return <EmptyPanel message="No class linked to your account." />

  return (
    <div className="max-w-md">
      <div className="mb-5">
        <h3 className="text-base font-bold mb-1" style={{ color: 'var(--color-text)' }}>
          Weekly Theme — w/c {weekStart}
        </h3>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Set a suggested subject noun for your class this week. Pupils can use it or choose their own.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>
            Theme noun (e.g. "the lion", "a rainstorm")
          </label>
          <input
            type="text"
            value={themeNoun}
            onChange={(e) => setThemeNoun(e.target.value)}
            placeholder="e.g. the ancient warrior"
            maxLength={60}
            data-testid="theme-noun-input"
            className="w-full px-4 py-3 rounded-xl text-base outline-none"
            style={{
              border: '2px solid var(--color-brand-primary)',
              color: 'var(--color-text)',
              backgroundColor: 'var(--color-background)',
            }}
            onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(108,92,231,0.2)' }}
            onBlur={(e) => { e.currentTarget.style.boxShadow = 'none' }}
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>
            Genre direction
          </label>
          <div className="flex flex-wrap gap-2">
            {GENRE_HINTS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGenreHint(g)}
                data-testid={`genre-${g}`}
                className="px-3 py-1.5 rounded-full text-sm font-medium capitalize"
                style={{
                  backgroundColor: genreHint === g ? 'var(--color-brand-primary)' : 'transparent',
                  color: genreHint === g ? '#fff' : 'var(--color-text-muted)',
                  border: `1.5px solid ${genreHint === g ? 'var(--color-brand-primary)' : 'var(--color-border)'}`,
                }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={!themeNoun.trim() || saveMutation.isPending}
          data-testid="save-theme-btn"
          className="w-full py-3 rounded-full font-bold text-base disabled:opacity-40"
          style={{ backgroundColor: saved ? '#27ae60' : 'var(--color-brand-secondary)', color: '#fff' }}
        >
          {saveMutation.isPending ? 'Saving…' : saved ? '✓ Theme saved!' : existing ? 'Update theme →' : 'Set theme →'}
        </button>

        {saveMutation.isError && (
          <p className="text-sm text-center" style={{ color: '#c0392b' }}>
            Failed to save — please try again.
          </p>
        )}
      </div>

      {existing && (
        <div className="mt-5 px-4 py-3 rounded-xl text-sm"
          style={{ backgroundColor: 'rgba(108,92,231,0.06)', border: '1px solid rgba(108,92,231,0.15)' }}>
          <div className="font-semibold mb-0.5" style={{ color: 'var(--color-brand-primary)' }}>Current theme</div>
          <div style={{ color: 'var(--color-text)' }}>"{existing.theme_noun}" — <span className="capitalize">{existing.genre_hint}</span></div>
        </div>
      )}
    </div>
  )
}

// ─── Session Review Panel ─────────────────────────────────────────────────────

function SessionReviewPanel() {
  const { profile } = useAuthStore()
  const classId = profile?.class_id ?? null
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [stepDetails, setStepDetails] = useState<Record<string, SessionDetail[]>>({})
  const [loadingSteps, setLoadingSteps] = useState<Record<string, boolean>>({})

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['pwp_recent_sessions', classId],
    queryFn: async (): Promise<RecentSession[]> => {
      if (!classId) return []

      const { data: pupilProfiles } = await supabase
        .from('profiles')
        .select('id, first_name')
        .eq('class_id', classId)
        .eq('role', 'pupil')

      if (!pupilProfiles?.length) return []
      const pupilIds = pupilProfiles.map((p) => p.id)
      const nameMap = Object.fromEntries(pupilProfiles.map((p) => [p.id, p.first_name]))

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: sessionRows } = await supabase
        .from('pwp_sessions')
        .select('id, pupil_id, subject_noun, chain_length, status, created_at, completed_at')
        .in('pupil_id', pupilIds)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(50)

      return (sessionRows ?? []).map((s) => ({
        ...s,
        first_name: nameMap[s.pupil_id] ?? null,
      }))
    },
    enabled: !!classId,
  })

  const toggleSession = useCallback(async (sessionId: string) => {
    if (expandedId === sessionId) {
      setExpandedId(null)
      return
    }
    setExpandedId(sessionId)
    if (stepDetails[sessionId]) return

    setLoadingSteps((prev) => ({ ...prev, [sessionId]: true }))
    const { data } = await supabase
      .from('pwp_session_steps')
      .select('id, step_number, element_id, formula_label, sentence, ai_passed, attempts, ai_feedback')
      .eq('session_id', sessionId)
      .order('step_number', { ascending: true })

    setStepDetails((prev) => ({ ...prev, [sessionId]: (data ?? []) as SessionDetail[] }))
    setLoadingSteps((prev) => ({ ...prev, [sessionId]: false }))
  }, [expandedId, stepDetails])

  if (isLoading) return <LoadingPanel label="Loading sessions…" />
  if (!classId) return <EmptyPanel message="No class linked to your account." />
  if (!sessions?.length) return <EmptyPanel message="No sessions in the last 7 days." />

  return (
    <div className="space-y-2">
      <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
        Sessions from the last 7 days — click any row to see step-level detail.
      </p>
      {sessions.map((s) => (
        <div
          key={s.id}
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--color-border)' }}
        >
          {/* Session row */}
          <button
            type="button"
            onClick={() => toggleSession(s.id)}
            data-testid={`session-row-${s.id}`}
            className="w-full px-4 py-3 flex items-center gap-3 text-left"
            style={{ backgroundColor: 'var(--color-background)' }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                  {s.first_name ?? 'Pupil'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: s.status === 'completed' ? 'rgba(39,174,96,0.1)' : 'rgba(245,166,35,0.1)',
                    color: s.status === 'completed' ? '#27ae60' : '#F5A623',
                  }}>
                  {s.status}
                </span>
              </div>
              <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                "{s.subject_noun}" · {s.chain_length} steps · {formatDate(s.created_at)}
              </div>
            </div>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '10px' }}>
              {expandedId === s.id ? '▲' : '▼'}
            </span>
          </button>

          {/* Step detail */}
          {expandedId === s.id && (
            <div style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
              {loadingSteps[s.id] ? (
                <div className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading steps…</div>
              ) : stepDetails[s.id]?.length ? (
                <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {stepDetails[s.id].map((step) => (
                    <div key={step.id} className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: step.ai_passed ? 'rgba(39,174,96,0.12)' : 'rgba(231,76,60,0.1)',
                            color: step.ai_passed ? '#27ae60' : '#c0392b',
                          }}
                        >
                          {step.ai_passed ? '✓' : '✗'} Step {step.step_number}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--color-brand-primary)' }}>
                            {step.formula_label}
                          </div>
                          <div className="text-sm italic" style={{ color: 'var(--color-text)' }}>
                            "{step.sentence}"
                          </div>
                          {step.ai_feedback && (
                            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                              {step.ai_feedback}
                            </div>
                          )}
                          <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                            {step.attempts} attempt{step.attempts !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  No step data saved yet.
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Curriculum Positions Panel ────────────────────────────────────────────────

function CurriculumPositionsPanel() {
  const { profile } = useAuthStore()
  const classId = profile?.class_id ?? null
  const queryClient = useQueryClient()
  const [editValues, setEditValues] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  const { data: pupils, isLoading } = useQuery({
    queryKey: ['pwp_positions_editor', classId],
    queryFn: async () => {
      if (!classId) return []

      const { data: pupilProfiles } = await supabase
        .from('profiles')
        .select('id, first_name')
        .eq('class_id', classId)
        .eq('role', 'pupil')

      if (!pupilProfiles?.length) return []
      const pupilIds = pupilProfiles.map((p) => p.id)

      const { data: positions } = await supabase
        .from('pwp_pupil_positions')
        .select('pupil_id, highest_lesson, updated_at')
        .in('pupil_id', pupilIds)

      const posMap = Object.fromEntries((positions ?? []).map((p) => [p.pupil_id, p]))

      return pupilProfiles.map((p) => ({
        pupil_id: p.id,
        first_name: p.first_name,
        highest_lesson: posMap[p.id]?.highest_lesson ?? 10,
        updated_at: posMap[p.id]?.updated_at ?? null,
      })).sort((a, b) => (a.first_name ?? '').localeCompare(b.first_name ?? ''))
    },
    enabled: !!classId,
  })

  // Initialise edit values from fetched data
  useEffect(() => {
    if (pupils) {
      const vals: Record<string, number> = {}
      pupils.forEach((p) => { vals[p.pupil_id] = p.highest_lesson })
      setEditValues(vals)
    }
  }, [pupils])

  const handleSave = async (pupilId: string) => {
    const lesson = editValues[pupilId]
    if (!lesson || lesson < 1 || lesson > 67) return
    setSaving((prev) => ({ ...prev, [pupilId]: true }))
    await supabase
      .from('pwp_pupil_positions')
      .upsert({ pupil_id: pupilId, highest_lesson: lesson, updated_at: new Date().toISOString() }, { onConflict: 'pupil_id' })
    setSaving((prev) => ({ ...prev, [pupilId]: false }))
    setSaved((prev) => ({ ...prev, [pupilId]: true }))
    setTimeout(() => setSaved((prev) => ({ ...prev, [pupilId]: false })), 2000)
    void queryClient.invalidateQueries({ queryKey: ['pwp_positions_editor'] })
    void queryClient.invalidateQueries({ queryKey: ['pwp_class_overview'] })
  }

  if (isLoading) return <LoadingPanel label="Loading positions…" />
  if (!classId) return <EmptyPanel message="No class linked to your account." />
  if (!pupils?.length) return <EmptyPanel message="No pupils found in your class." />

  return (
    <div>
      <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
        Update a pupil's highest lesson to change which formula elements appear in their sessions.
        Lessons 1–25 = chain only. Lessons 26+ = chain + paragraph phase.
      </p>

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--color-surface)' }}>
              <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--color-text-muted)' }}>Pupil</th>
              <th className="px-4 py-3 text-center font-semibold" style={{ color: 'var(--color-text-muted)' }}>Highest Lesson (1–67)</th>
              <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--color-text-muted)' }}>Last updated</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {pupils.map((p, i) => (
              <tr
                key={p.pupil_id}
                style={{
                  borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
                  backgroundColor: 'var(--color-background)',
                }}
              >
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>
                  {p.first_name ?? '—'}
                </td>
                <td className="px-4 py-2 text-center">
                  <input
                    type="number"
                    min={1}
                    max={67}
                    value={editValues[p.pupil_id] ?? p.highest_lesson}
                    onChange={(e) =>
                      setEditValues((prev) => ({ ...prev, [p.pupil_id]: parseInt(e.target.value, 10) || 10 }))
                    }
                    data-testid={`lesson-input-${p.pupil_id}`}
                    className="w-20 px-3 py-1.5 rounded-lg text-center text-sm outline-none"
                    style={{
                      border: '2px solid var(--color-brand-primary)',
                      color: 'var(--color-text)',
                      backgroundColor: 'var(--color-background)',
                    }}
                  />
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {formatDate(p.updated_at)}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleSave(p.pupil_id)}
                    disabled={saving[p.pupil_id] || (editValues[p.pupil_id] === p.highest_lesson && !saved[p.pupil_id])}
                    data-testid={`save-position-${p.pupil_id}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
                    style={{
                      backgroundColor: saved[p.pupil_id] ? '#27ae60' : 'var(--color-brand-primary)',
                      color: '#fff',
                    }}
                  >
                    {saving[p.pupil_id] ? '…' : saved[p.pupil_id] ? '✓' : 'Save'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
        Tip: L26+ unlocks the paragraph builder phase in each session.
        L40+ is suitable for most Year 5–6 pupils.
      </p>
    </div>
  )
}

// ─── Shared utilities ─────────────────────────────────────────────────────────

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="text-center py-10" style={{ color: 'var(--color-text-muted)' }}>
      <div className="text-2xl mb-2">⏳</div>
      <p className="text-sm">{label}</p>
    </div>
  )
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="text-center py-10" style={{ color: 'var(--color-text-muted)' }}>
      <div className="text-2xl mb-2">📋</div>
      <p className="text-sm">{message}</p>
    </div>
  )
}
