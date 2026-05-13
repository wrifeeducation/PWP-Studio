// PWP Teacher Dashboard — /teacher route
//
// Tabs:
//   Overview  — pupil list with level / XP / streak / last-active
//   Quizzes   — per-pupil quiz attempt summary
//   Badges    — per-pupil badge counts and recents
//   Theme     — set / view the weekly formula focus for the class
//
// Data sources (PWP-specific tables):
//   formula_progress   — level, XP, streak, last_session_date
//   pwp_quiz_attempts  — quiz pass/fail/score history
//   pwp_pupil_badges   — awarded badge keys
//   pwp_class_themes   — teacher-set weekly theme
//   profiles           — pupil first_name, class_id
//   classes            — teacher_id, class name, year_group

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface ClassRow {
  id:         string
  name:       string
  year_group: number
}

interface PupilProgressRow {
  pupil_id:              string
  first_name:            string
  current_formula_level: number
  total_xp:              number | null
  current_streak:        number | null
  longest_streak:        number | null
  last_session_date:     string | null
  ready_to_advance:      boolean
}

interface QuizSummaryRow {
  pupil_id:       string
  first_name:     string
  total_attempts: number
  best_score:     number
  pass_count:     number
  last_attempt:   string | null
}

interface BadgeSummaryRow {
  pupil_id:    string
  first_name:  string
  badge_count: number
  latest_key:  string | null
  latest_at:   string | null
}

interface ThemeRow {
  id:            string
  formula_level: number
  theme_label:   string | null
  week_start:    string
  active:        boolean
  created_at:    string
}

// ─── COLOURS ─────────────────────────────────────────────────────────────────

const C = {
  bg:      '#FDF8EE',
  primary: '#6C5CE7',
  gold:    '#F5A623',
  green:   '#2ECC71',
  red:     '#FF6B6B',
  text:    '#2D2D2D',
  muted:   '#666',
  border:  '#E8E0D0',
  card:    '#FFFFFF',
  tabBg:   '#F0EBE0',
}

// ─── BADGE CATALOGUE (human-readable names) ───────────────────────────────────

const BADGE_NAMES: Record<string, string> = {
  'pwp:first_level': '🌱 First Steps',
  'pwp:streak_3':    '🔥 On a Roll',
  'pwp:streak_7':    '🔥 Week Warrior',
  'pwp:streak_14':   '🏅 Fortnight Fire',
  'pwp:streak_30':   '🏆 Month Master',
  'pwp:level_10':    '✏️ Phrase Crafter',
  'pwp:level_20':    '📝 Sentence Shaper',
  'pwp:level_30':    '🌟 Formula Master',
  'pwp:quiz_pass':   '🎯 Quiz Champion',
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7)  return `${diff}d ago`
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`
  return `${Math.floor(diff / 30)}mo ago`
}

function pct(num: number, denom: number): string {
  if (!denom) return '—'
  return `${Math.round((num / denom) * 100)}%`
}

// ─── QUERY HOOKS ─────────────────────────────────────────────────────────────

function useTeacherClasses() {
  const { profile } = useAuthStore()
  return useQuery<ClassRow[]>({
    queryKey: ['pwp-teacher-classes', profile?.id],
    enabled:  !!profile?.id,
    staleTime: 5 * 60_000,
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, year_group')
        .eq('teacher_id', profile!.id)
        .order('name')
      if (error) throw error
      return (data ?? []) as ClassRow[]
    },
  })
}

function usePupilProgress(classId: string | null) {
  return useQuery<PupilProgressRow[]>({
    queryKey: ['pwp-pupil-progress', classId],
    enabled:  !!classId,
    staleTime: 60_000,
    queryFn:  async () => {
      const { data: pupils, error: pupilErr } = await supabase
        .from('profiles')
        .select('id, first_name')
        .eq('class_id', classId!)
        .eq('role', 'pupil')
        .order('first_name')
      if (pupilErr) throw pupilErr
      if (!pupils?.length) return []

      const pupilIds = pupils.map(p => p.id)

      const { data: progress, error: progressErr } = await supabase
        .from('formula_progress')
        .select('pupil_id, current_formula_level, total_xp, current_streak, longest_streak, last_session_date, ready_to_advance')
        .in('pupil_id', pupilIds)
      if (progressErr) throw progressErr

      const progressMap = new Map((progress ?? []).map(r => [r.pupil_id, r]))

      return pupils.map(p => {
        const fp = progressMap.get(p.id)
        return {
          pupil_id:              p.id,
          first_name:            p.first_name,
          current_formula_level: fp?.current_formula_level ?? 1,
          total_xp:              fp?.total_xp ?? 0,
          current_streak:        fp?.current_streak ?? 0,
          longest_streak:        fp?.longest_streak ?? 0,
          last_session_date:     fp?.last_session_date ?? null,
          ready_to_advance:      fp?.ready_to_advance ?? false,
        }
      })
    },
  })
}

function useQuizSummary(classId: string | null) {
  return useQuery<QuizSummaryRow[]>({
    queryKey: ['pwp-quiz-summary', classId],
    enabled:  !!classId,
    staleTime: 60_000,
    queryFn:  async () => {
      const { data: pupils } = await supabase
        .from('profiles')
        .select('id, first_name')
        .eq('class_id', classId!)
        .eq('role', 'pupil')
        .order('first_name')
      if (!pupils?.length) return []

      const pupilIds = pupils.map(p => p.id)

      const { data: attempts } = await supabase
        .from('pwp_quiz_attempts')
        .select('pupil_id, score, total_prompts, passed, created_at')
        .in('pupil_id', pupilIds)

      type AttemptGroup = { scores: number[]; totals: number[]; passes: number; last: string | null }
      const grouped = new Map<string, AttemptGroup>()

      for (const a of (attempts ?? [])) {
        if (!grouped.has(a.pupil_id)) {
          grouped.set(a.pupil_id, { scores: [], totals: [], passes: 0, last: null })
        }
        const g = grouped.get(a.pupil_id)!
        g.scores.push(a.score)
        g.totals.push(a.total_prompts)
        if (a.passed) g.passes++
        if (!g.last || a.created_at > g.last) g.last = a.created_at
      }

      return pupils.map(p => {
        const g = grouped.get(p.id)
        const best = g ? Math.max(...g.scores) : 0
        return {
          pupil_id:       p.id,
          first_name:     p.first_name,
          total_attempts: g ? g.scores.length : 0,
          best_score:     g ? best : 0,
          pass_count:     g ? g.passes : 0,
          last_attempt:   g?.last ?? null,
        }
      })
    },
  })
}

function useBadgeSummary(classId: string | null) {
  return useQuery<BadgeSummaryRow[]>({
    queryKey: ['pwp-badge-summary', classId],
    enabled:  !!classId,
    staleTime: 60_000,
    queryFn:  async () => {
      const { data: pupils } = await supabase
        .from('profiles')
        .select('id, first_name')
        .eq('class_id', classId!)
        .eq('role', 'pupil')
        .order('first_name')
      if (!pupils?.length) return []

      const pupilIds = pupils.map(p => p.id)

      const { data: badges } = await supabase
        .from('pwp_pupil_badges')
        .select('pupil_id, badge_key, awarded_at')
        .in('pupil_id', pupilIds)

      type BadgeGroup = { count: number; latest_key: string | null; latest_at: string | null }
      const grouped = new Map<string, BadgeGroup>()

      for (const b of (badges ?? [])) {
        if (!grouped.has(b.pupil_id)) {
          grouped.set(b.pupil_id, { count: 0, latest_key: null, latest_at: null })
        }
        const g = grouped.get(b.pupil_id)!
        g.count++
        if (!g.latest_at || b.awarded_at > g.latest_at) {
          g.latest_at  = b.awarded_at
          g.latest_key = b.badge_key
        }
      }

      return pupils.map(p => ({
        pupil_id:    p.id,
        first_name:  p.first_name,
        badge_count: grouped.get(p.id)?.count ?? 0,
        latest_key:  grouped.get(p.id)?.latest_key ?? null,
        latest_at:   grouped.get(p.id)?.latest_at ?? null,
      }))
    },
  })
}

function useClassTheme(classId: string | null) {
  return useQuery<ThemeRow[]>({
    queryKey: ['pwp-class-theme', classId],
    enabled:  !!classId,
    staleTime: 30_000,
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('pwp_class_themes')
        .select('id, formula_level, theme_label, week_start, active, created_at')
        .eq('class_id', classId!)
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return (data ?? []) as ThemeRow[]
    },
  })
}

// ─── SHARED ATOMS ─────────────────────────────────────────────────────────────

function StatCard({ label, value, colour }: { label: string; value: string; colour: string }) {
  return (
    <div
      className="rounded-2xl p-4 text-center"
      style={{ background: C.card, border: `1px solid ${C.border}` }}
    >
      <div className="font-extrabold text-2xl" style={{ color: colour }}>
        {value}
      </div>
      <div className="text-xs font-semibold mt-1" style={{ color: C.muted }}>
        {label}
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3">{children}</td>
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: C.border }} />
      ))}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      className="rounded-2xl p-8 text-center"
      style={{ background: C.tabBg, border: `1px dashed ${C.border}` }}
    >
      <p style={{ color: C.muted }}>{message}</p>
    </div>
  )
}

function StatusBadge({ ready, lastDate }: { ready: boolean; lastDate: string | null }) {
  const daysAgoNum = lastDate
    ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86_400_000)
    : 999
  if (!lastDate || daysAgoNum > 14) {
    return (
      <span
        className="inline-block rounded-full px-2 py-[2px] text-[11px] font-bold"
        style={{ background: '#FEE2E2', color: '#DC2626' }}
      >
        Inactive
      </span>
    )
  }
  if (ready) {
    return (
      <span
        className="inline-block rounded-full px-2 py-[2px] text-[11px] font-bold"
        style={{ background: '#D1FAE5', color: '#065F46' }}
      >
        Ready ✓
      </span>
    )
  }
  return (
    <span
      className="inline-block rounded-full px-2 py-[2px] text-[11px] font-bold"
      style={{ background: '#EDE9FE', color: C.primary }}
    >
      Practising
    </span>
  )
}

// ─── OVERVIEW TAB ────────────────────────────────────────────────────────────

function OverviewTab({ classId }: { classId: string }) {
  const { data, isLoading } = usePupilProgress(classId)

  if (isLoading) return <LoadingRows />
  if (!data?.length) return <EmptyState message="No pupils in this class yet." />

  const avgLevel = Math.round(data.reduce((s, p) => s + p.current_formula_level, 0) / data.length)
  const avgXp    = Math.round(data.reduce((s, p) => s + (p.total_xp ?? 0), 0) / data.length)
  const active7d = data.filter(p => {
    if (!p.last_session_date) return false
    return Math.floor((Date.now() - new Date(p.last_session_date).getTime()) / 86_400_000) <= 7
  }).length

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Avg Level"  value={`L${avgLevel}`}            colour={C.primary} />
        <StatCard label="Avg XP"     value={avgXp.toLocaleString()}    colour={C.gold}    />
        <StatCard label="Active 7d"  value={`${active7d}/${data.length}`} colour={C.green} />
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: `1px solid ${C.border}`, background: C.card }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: C.tabBg, color: C.muted }}>
              <Th>Pupil</Th>
              <Th>Level</Th>
              <Th>XP</Th>
              <Th>Streak</Th>
              <Th>Last Active</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((p, i) => (
              <tr
                key={p.pupil_id}
                style={{ borderTop: i > 0 ? `1px solid ${C.border}` : undefined }}
              >
                <Td>
                  <span className="font-semibold" style={{ color: C.text }}>
                    {p.first_name}
                  </span>
                </Td>
                <Td>
                  <span className="font-bold" style={{ color: C.primary }}>
                    L{p.current_formula_level}
                  </span>
                </Td>
                <Td>
                  <span className="font-bold" style={{ color: C.gold }}>
                    {(p.total_xp ?? 0).toLocaleString()}
                  </span>
                </Td>
                <Td>
                  <span className="flex items-center gap-1">
                    🔥 {p.current_streak ?? 0}
                    {(p.longest_streak ?? 0) > 0 && (
                      <span style={{ color: C.muted, fontSize: 11 }}>
                        (best {p.longest_streak})
                      </span>
                    )}
                  </span>
                </Td>
                <Td>
                  <span style={{ color: C.muted }}>
                    {daysAgo(p.last_session_date)}
                  </span>
                </Td>
                <Td>
                  <StatusBadge ready={p.ready_to_advance} lastDate={p.last_session_date} />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── QUIZZES TAB ─────────────────────────────────────────────────────────────

function QuizzesTab({ classId }: { classId: string }) {
  const { data, isLoading } = useQuizSummary(classId)

  if (isLoading) return <LoadingRows />
  if (!data?.length) return <EmptyState message="No pupils in this class yet." />

  const attempted = data.filter(p => p.total_attempts > 0).length
  const passed    = data.filter(p => p.pass_count > 0).length

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Pupils Attempted" value={`${attempted}/${data.length}`} colour={C.primary} />
        <StatCard label="Pupils Passed"    value={`${passed}/${data.length}`}    colour={C.green}   />
        <StatCard label="Coverage"         value={pct(attempted, data.length)}   colour={C.gold}    />
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: `1px solid ${C.border}`, background: C.card }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: C.tabBg, color: C.muted }}>
              <Th>Pupil</Th>
              <Th>Attempts</Th>
              <Th>Best Score</Th>
              <Th>Passes</Th>
              <Th>Last Attempt</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((p, i) => (
              <tr
                key={p.pupil_id}
                style={{ borderTop: i > 0 ? `1px solid ${C.border}` : undefined }}
              >
                <Td>
                  <span className="font-semibold" style={{ color: C.text }}>
                    {p.first_name}
                  </span>
                </Td>
                <Td>
                  {p.total_attempts === 0
                    ? <span style={{ color: C.muted }}>—</span>
                    : <span className="font-bold" style={{ color: C.text }}>{p.total_attempts}</span>
                  }
                </Td>
                <Td>
                  {p.total_attempts === 0
                    ? <span style={{ color: C.muted }}>—</span>
                    : (
                      <span
                        className="font-bold"
                        style={{ color: p.pass_count > 0 ? C.green : C.red }}
                      >
                        {p.best_score} correct
                      </span>
                    )
                  }
                </Td>
                <Td>
                  {p.pass_count > 0
                    ? <span style={{ color: C.green, fontWeight: 700 }}>✓ {p.pass_count}</span>
                    : <span style={{ color: C.muted }}>—</span>
                  }
                </Td>
                <Td>
                  <span style={{ color: C.muted }}>
                    {daysAgo(p.last_attempt)}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── BADGES TAB ──────────────────────────────────────────────────────────────

function BadgesTab({ classId }: { classId: string }) {
  const { data, isLoading } = useBadgeSummary(classId)

  if (isLoading) return <LoadingRows />
  if (!data?.length) return <EmptyState message="No pupils in this class yet." />

  const hasBadge    = data.filter(p => p.badge_count > 0).length
  const totalBadges = data.reduce((s, p) => s + p.badge_count, 0)

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="With Badges"      value={`${hasBadge}/${data.length}`} colour={C.primary} />
        <StatCard label="Total Awarded"    value={String(totalBadges)}           colour={C.gold}    />
        <StatCard label="Avg per Pupil"    value={data.length ? (totalBadges / data.length).toFixed(1) : '0'} colour={C.green} />
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: `1px solid ${C.border}`, background: C.card }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: C.tabBg, color: C.muted }}>
              <Th>Pupil</Th>
              <Th>Badges</Th>
              <Th>Most Recent</Th>
              <Th>Earned</Th>
            </tr>
          </thead>
          <tbody>
            {data
              .slice()
              .sort((a, b) => b.badge_count - a.badge_count)
              .map((p, i) => (
                <tr
                  key={p.pupil_id}
                  style={{ borderTop: i > 0 ? `1px solid ${C.border}` : undefined }}
                >
                  <Td>
                    <span className="font-semibold" style={{ color: C.text }}>
                      {p.first_name}
                    </span>
                  </Td>
                  <Td>
                    {p.badge_count > 0
                      ? <span className="font-bold" style={{ color: C.gold }}>🏅 {p.badge_count}</span>
                      : <span style={{ color: C.muted }}>—</span>
                    }
                  </Td>
                  <Td>
                    {p.latest_key
                      ? <span style={{ color: C.text }}>{BADGE_NAMES[p.latest_key] ?? p.latest_key}</span>
                      : <span style={{ color: C.muted }}>—</span>
                    }
                  </Td>
                  <Td>
                    <span style={{ color: C.muted }}>
                      {p.latest_at ? daysAgo(p.latest_at) : '—'}
                    </span>
                  </Td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── THEME TAB ───────────────────────────────────────────────────────────────

function ThemeTab({ classId }: { classId: string }) {
  const { profile } = useAuthStore()
  const qc = useQueryClient()
  const { data: themes, isLoading } = useClassTheme(classId)

  const [formulaLevel, setFormulaLevel] = useState(1)
  const [themeLabel,   setThemeLabel]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const clearMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pwp_class_themes')
        .update({ active: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pwp-class-theme', classId] }),
  })

  async function handleSetTheme(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg(null)
    try {
      // Deactivate existing active themes for this class
      await supabase
        .from('pwp_class_themes')
        .update({ active: false })
        .eq('class_id', classId)
        .eq('active', true)

      const { error } = await supabase.from('pwp_class_themes').insert({
        class_id:      classId,
        formula_level: formulaLevel,
        theme_label:   themeLabel.trim() || null,
        week_start:    new Date().toISOString().slice(0, 10),
        active:        true,
        set_by:        profile?.id ?? null,
      })
      if (error) throw error

      setSaveMsg('Theme saved!')
      setThemeLabel('')
      qc.invalidateQueries({ queryKey: ['pwp-class-theme', classId] })
    } catch (err) {
      setSaveMsg('Could not save — please try again.')
      console.error('[ThemeTab] save error:', err)
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 3000)
    }
  }

  const active = themes?.find(t => t.active)
  const past   = themes?.filter(t => !t.active) ?? []

  return (
    <div className="max-w-lg">
      {/* Active theme */}
      {isLoading ? (
        <div className="h-20 rounded-2xl animate-pulse mb-6" style={{ background: C.border }} />
      ) : active ? (
        <div
          className="rounded-2xl p-4 mb-6 flex items-start gap-4"
          style={{ background: '#EDE9FE', border: `2px solid ${C.primary}` }}
        >
          <span className="text-3xl">📌</span>
          <div className="flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: C.primary }}>
              Active Theme
            </div>
            <div className="font-extrabold text-lg" style={{ color: C.text }}>
              Level {active.formula_level}
              {active.theme_label && (
                <span className="ml-2 text-base font-semibold" style={{ color: C.primary }}>
                  — {active.theme_label}
                </span>
              )}
            </div>
            <div className="text-xs mt-1" style={{ color: C.muted }}>
              Set {daysAgo(active.created_at)} · Week of {active.week_start}
            </div>
          </div>
          <button
            onClick={() => clearMutation.mutate(active.id)}
            disabled={clearMutation.isPending}
            className="text-xs font-semibold px-3 py-1 rounded-full transition-opacity hover:opacity-70"
            style={{ background: C.primary, color: '#fff' }}
            data-testid="theme-clear-btn"
          >
            Clear
          </button>
        </div>
      ) : (
        <div
          className="rounded-2xl p-4 mb-6 text-center"
          style={{ background: C.tabBg, border: `1px dashed ${C.border}` }}
        >
          <p style={{ color: C.muted }} className="text-sm">No active theme set for this class.</p>
        </div>
      )}

      {/* Set new theme */}
      <div
        className="rounded-2xl p-5"
        style={{ background: C.card, border: `1px solid ${C.border}` }}
      >
        <h3 className="font-bold text-base mb-4" style={{ color: C.text }}>
          Set Weekly Focus
        </h3>
        <form onSubmit={handleSetTheme} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: C.muted }}>
              Formula Level (1–35)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={35}
                value={formulaLevel}
                onChange={e => setFormulaLevel(Number(e.target.value))}
                className="flex-1 accent-violet-500"
                data-testid="theme-level-slider"
              />
              <span
                className="w-12 text-center font-extrabold rounded-lg py-1 text-sm"
                style={{ background: '#EDE9FE', color: C.primary }}
              >
                L{formulaLevel}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: C.muted }}>
              Theme Note (optional)
            </label>
            <input
              type="text"
              value={themeLabel}
              onChange={e => setThemeLabel(e.target.value)}
              placeholder="e.g. Noun phrases, Adjectives week…"
              maxLength={80}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ border: `1px solid ${C.border}`, background: C.bg, color: C.text }}
              data-testid="theme-label-input"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 rounded-xl font-bold text-sm transition-opacity"
            style={{ background: C.primary, color: '#fff', opacity: saving ? 0.6 : 1 }}
            data-testid="theme-save-btn"
          >
            {saving ? 'Saving…' : "Set as This Week's Focus"}
          </button>

          {saveMsg && (
            <p
              className="text-center text-sm font-semibold"
              style={{ color: saveMsg.includes('saved') ? C.green : C.red }}
            >
              {saveMsg}
            </p>
          )}
        </form>
      </div>

      {/* Past themes */}
      {past.length > 0 && (
        <div className="mt-6">
          <h4 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: C.muted }}>
            Past Themes
          </h4>
          <div className="space-y-2">
            {past.map(t => (
              <div
                key={t.id}
                className="rounded-xl px-4 py-2 flex items-center justify-between"
                style={{ background: C.tabBg }}
              >
                <span className="font-semibold text-sm" style={{ color: C.text }}>
                  L{t.formula_level}{t.theme_label ? ` — ${t.theme_label}` : ''}
                </span>
                <span className="text-xs" style={{ color: C.muted }}>
                  {t.week_start}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'quizzes' | 'badges' | 'theme'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'quizzes',  label: 'Quizzes',  icon: '🎯' },
  { id: 'badges',   label: 'Badges',   icon: '🏅' },
  { id: 'theme',    label: 'Theme',    icon: '📌' },
]

export default function TeacherPage() {
  const { data: classes, isLoading: classesLoading } = useTeacherClasses()
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const resolvedClassId = selectedClassId ?? classes?.[0]?.id ?? null

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-5 py-4"
        style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="font-extrabold text-xl" style={{ color: C.text }}>
              PWP Teacher Dashboard
            </h1>
            <p className="text-xs mt-[1px]" style={{ color: C.muted }}>
              Personal Writing Programme — pupil progress overview
            </p>
          </div>

          {/* Class selector — shown when teacher owns 2+ classes */}
          {!classesLoading && (classes?.length ?? 0) > 1 && (
            <select
              value={resolvedClassId ?? ''}
              onChange={e => setSelectedClassId(e.target.value)}
              className="rounded-xl px-3 py-2 text-sm font-semibold outline-none"
              style={{ border: `1px solid ${C.border}`, background: C.card, color: C.text }}
              data-testid="class-selector"
            >
              {classes!.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} (Y{c.year_group})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-5 py-6">
        {classesLoading ? (
          <LoadingRows />
        ) : !classes?.length ? (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ background: C.card, border: `1px solid ${C.border}` }}
          >
            <p className="text-2xl mb-3">👋</p>
            <p className="font-bold" style={{ color: C.text }}>No classes found</p>
            <p className="text-sm mt-1" style={{ color: C.muted }}>
              Classes are created via the WriFe admin portal at wrife.co.uk.
            </p>
          </div>
        ) : (
          <>
            {/* Tab bar */}
            <div
              className="flex gap-1 rounded-2xl p-1 mb-6"
              style={{ background: C.tabBg }}
            >
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: activeTab === tab.id ? C.card    : 'transparent',
                    color:      activeTab === tab.id ? C.primary : C.muted,
                    boxShadow:  activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  }}
                  data-testid={`tab-${tab.id}`}
                >
                  <span>{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            {resolvedClassId && (
              <>
                {activeTab === 'overview' && <OverviewTab classId={resolvedClassId} />}
                {activeTab === 'quizzes'  && <QuizzesTab  classId={resolvedClassId} />}
                {activeTab === 'badges'   && <BadgesTab   classId={resolvedClassId} />}
                {activeTab === 'theme'    && <ThemeTab    classId={resolvedClassId} />}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
