/**
 * WF-019 / WF-020 / WF-021 / WF-022 — Teacher Dashboard
 * Three tabs: Pending Review, Class Progress, Assign Task.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { classifyTransferGap, transferGapLabel, transferGapColour } from '../lib/transferGap'
import { ConsolidationPackCard } from '../components/teacher/ConsolidationPackCard'
import { WordBankEditor } from '../components/teacher/WordBankEditor'
import { AnalyticsTab } from '../components/teacher/AnalyticsTab'
import { generateConsolidationPack } from '../lib/consolidationPack'
import type { ConsolidationPackData } from '../lib/consolidationPack'
import type { PendingWritingReview, PupilTransferRate, InterventionLog, InterventionTrigger } from '../types/index'
import { Genre, MasteryEventType, TeacherNotificationType } from '../types/index'
import { NCProgressReport } from '../components/dashboard/NCProgressReport'

// ─── Local types for views ─────────────────────────────────────────────────────

interface ClassProgressRow {
  pupil_id: string
  first_name: string
  current_formula_level: number
  avg_score_last5: number | null
  current_streak: number
  total_xp: number
  writing_studio_unlocked: boolean
  consolidation_required: boolean
}

interface WritingTask {
  id: string
  genre: Genre
  year_group_min: number
  year_group_max: number
  title: string
  prompt_text: string
}

type TabId = 'pending' | 'progress' | 'assign' | 'interventions' | 'wordbanks' | 'analytics' | 'classes' | 'programme' | 'nc-report' | 'notifications'

const TAB_LABELS: Record<TabId, string> = {
  classes: 'My Classes',
  programme: 'Programme',
  pending: 'Pending Review',
  progress: 'Class Progress',
  assign: 'Assign Task',
  interventions: 'Interventions',
  wordbanks: 'Word Banks',
  analytics: 'Analytics',
  'nc-report': 'NC Report',
  notifications: 'Notifications',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TeacherPage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabId>('pending')
  const [unresolvedCount, setUnresolvedCount] = useState(0)
  const [actionRequiredCount, setActionRequiredCount] = useState(0)

  // Load unresolved intervention count for badge
  useEffect(() => {
    if (!profile) return
    supabase
      .from('intervention_log')
      .select('id', { count: 'exact', head: true })
      .is('resolved_at', null)
      .then(({ count }) => setUnresolvedCount(count ?? 0))
  }, [profile])

  // Load action-required notification count for Notifications badge
  useEffect(() => {
    if (!profile?.id) return
    supabase
      .from('teacher_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', profile.id)
      .eq('action_required', true)
      .is('actioned_at', null)
      .then(({ count }) => setActionRequiredCount(count ?? 0))
  }, [profile?.id])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--color-background)' }}
      data-testid="teacher-page"
    >
      {/* Header */}
      <header
        className="px-4 py-3 flex items-center justify-between sticky top-0 z-10"
        style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
      >
        <button
          onClick={() => navigate('/')}
          className="font-bold text-base hover:opacity-70 transition-opacity"
          style={{ color: 'var(--color-text)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          data-tts="WriFe — go to home page"
          aria-label="WriFe — go to home page"
        >
          WriFe
        </button>
        <span
          className="text-base"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {' '}— Teacher Dashboard
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {profile?.first_name}
          </span>
          <a
            href="https://wrife.co.uk"
            className="text-sm px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-brand-primary)', border: '1px solid var(--color-brand-primary)', textDecoration: 'none', fontWeight: 600 }}
            data-tts="Back to WriFe main site"
            aria-label="Back to wrife.co.uk"
          >
            ← wrife.co.uk
          </a>
          <button
            onClick={handleSignOut}
            className="text-sm px-3 py-1.5 rounded-lg"
            style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
            data-testid="sign-out-button"
            data-tts="Sign out"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav
        className="flex border-b no-print overflow-x-auto"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        data-testid="teacher-tabs"
      >
        {(Object.keys(TAB_LABELS) as TabId[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            data-testid={`tab-${tab}`}
            className="px-5 py-3 text-sm font-medium transition-colors flex items-center gap-1.5"
            style={{
              color: activeTab === tab ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--color-brand-primary)' : '2px solid transparent',
            }}
          >
            {TAB_LABELS[tab]}
            {tab === 'interventions' && unresolvedCount > 0 && (
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
                style={{ backgroundColor: '#DC2626', minWidth: '18px', textAlign: 'center' }}
                data-testid="interventions-badge"
              >
                {unresolvedCount}
              </span>
            )}
            {tab === 'notifications' && actionRequiredCount > 0 && (
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
                style={{ backgroundColor: '#F5A623', minWidth: '18px', textAlign: 'center' }}
                data-testid="notifications-badge"
              >
                {actionRequiredCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <main className="flex-1 p-4 max-w-6xl mx-auto w-full">
        {activeTab === 'classes' && <MyClassesTab />}
        {activeTab === 'programme' && <ProgrammeTab onNavigate={setActiveTab} />}
        {activeTab === 'pending' && <PendingReviewTab />}
        {activeTab === 'progress' && <ClassProgressTab />}
        {activeTab === 'assign' && <AssignTaskTab />}
        {activeTab === 'interventions' && (
          <InterventionLogTab onResolve={() => setUnresolvedCount((c) => Math.max(0, c - 1))} />
        )}
        {activeTab === 'wordbanks' && <WordBankEditor />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'nc-report' && <NCProgressReport />}
        {activeTab === 'notifications' && (
          <NotificationsTab
            teacherId={profile?.id ?? ''}
            onActionTaken={() => setActionRequiredCount((c) => Math.max(0, c - 1))}
          />
        )}
      </main>
    </div>
  )
}

// ─── Pending Review Tab (WF-019) ──────────────────────────────────────────────

function PendingReviewTab() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [reviews, setReviews] = useState<PendingWritingReview[]>([])
  const [loading, setLoading] = useState(true)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Initial load
    supabase
      .from('v_pending_writing_reviews')
      .select('*')
      .order('submitted_at', { ascending: true })
      .then(({ data }) => {
        if (data) setReviews(data as PendingWritingReview[])
        setLoading(false)
      })
  }, [])

  // WF-054: Realtime subscription for writing_pieces
  useEffect(() => {
    if (!profile?.id) return

    const channel = supabase
      .channel('pending-reviews-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'writing_pieces',
          filter: `status=eq.submitted`,
        },
        (payload) => {
          const piece = payload.new as Record<string, unknown>
          if (!piece.id) return
          // Fetch the enriched view row and prepend
          supabase
            .from('v_pending_writing_reviews')
            .select('*')
            .eq('id', piece.id as string)
            .single()
            .then(({ data }) => {
              if (data) {
                setReviews((prev) => [data as PendingWritingReview, ...prev])
                setNewIds((prev) => new Set([...prev, piece.id as string]))
                setTimeout(() => {
                  setNewIds((prev) => {
                    const next = new Set(prev)
                    next.delete(piece.id as string)
                    return next
                  })
                }, 5000)
              }
            })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'writing_pieces',
        },
        (payload) => {
          const piece = payload.new as Record<string, unknown>
          if (piece.status !== 'submitted') {
            setReviews((prev) => prev.filter((r) => r.id !== piece.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id])

  if (loading) return <LoadingSpinner />

  if (reviews.length === 0) {
    return (
      <div className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>
        <p className="text-lg">No pieces awaiting review.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3" data-testid="pending-reviews-list">
      <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }} data-tts="Pending reviews">
        Pending Reviews ({reviews.length})
      </h2>
      {reviews.map((review) => (
        <button
          key={review.id}
          type="button"
          onClick={() => navigate(`/teacher/review/${review.id}`)}
          data-testid={`review-row-${review.id}`}
          className="w-full text-left rounded-xl p-4 flex items-center justify-between gap-4 transition-colors hover:opacity-80"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: `1px solid ${newIds.has(review.id) ? 'var(--color-brand-primary)' : 'var(--color-border)'}`,
          }}
        >
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }} data-tts={review.pupil_name}>
                {review.pupil_name}
              </p>
              {newIds.has(review.id) && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-bold text-white animate-pulse"
                  style={{ backgroundColor: 'var(--color-brand-primary)' }}
                >
                  New
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {review.genre} · {review.word_count} words
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: review.days_pending >= 3 ? '#FEF2F2' : '#F0FDF4',
                color: review.days_pending >= 3 ? '#DC2626' : '#166534',
              }}
              data-tts={`${review.days_pending} days pending`}
            >
              {review.days_pending}d pending
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}

// ─── Class Progress Tab (WF-020 / WF-022) ────────────────────────────────────

function ClassProgressTab() {
  const [rows, setRows] = useState<ClassProgressRow[]>([])
  const [transferRates, setTransferRates] = useState<PupilTransferRate[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedPupil, setExpandedPupil] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('v_class_formula_progress').select('*'),
      supabase.from('v_pupil_transfer_rate').select('*'),
    ]).then(([progressResult, transferResult]) => {
      if (progressResult.data) setRows(progressResult.data as ClassProgressRow[])
      if (transferResult.data) setTransferRates(transferResult.data as PupilTransferRate[])
      setLoading(false)
    })
  }, [])

  const getTransferRate = (pupilId: string): number | null => {
    return transferRates.find((r) => r.pupil_id === pupilId)?.success_rate_last_5 ?? null
  }

  if (loading) return <LoadingSpinner />

  if (rows.length === 0) {
    return (
      <div className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>
        <p className="text-lg">No pupil progress data available yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4" data-testid="class-progress-tab">
      <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }} data-tts="Class progress">
        Class Progress
      </h2>

      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--color-border)' }}>
        <table className="teacher-table w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--color-background)', borderBottom: '1px solid var(--color-border)' }}>
              {['Pupil', 'Level', 'Avg Score (L5)', 'Streak', 'XP', 'Studio', 'Transfer Rate'].map((h) => (
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
            {rows.map((row) => {
              const rate = getTransferRate(row.pupil_id)
              const classification = rate !== null ? classifyTransferGap(rate) : null
              const isConsolidation = row.consolidation_required

              return (
                <>
                  <tr
                    key={row.pupil_id}
                    onClick={() => setExpandedPupil(expandedPupil === row.pupil_id ? null : row.pupil_id)}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      backgroundColor: isConsolidation ? '#FEF2F2' : 'var(--color-surface)',
                    }}
                    data-testid={`progress-row-${row.pupil_id}`}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: isConsolidation ? '#DC2626' : 'var(--color-text)' }}>
                      {row.first_name}
                      {isConsolidation && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                          Consolidation
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>
                      L{row.current_formula_level}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>
                      {row.avg_score_last5 != null ? `${Math.round(row.avg_score_last5)}%` : '—'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>
                      🔥 {row.current_streak}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>
                      {row.total_xp.toLocaleString()} XP
                    </td>
                    <td className="px-4 py-3">
                      {row.writing_studio_unlocked ? (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F0FDF4', color: '#166534' }}>Unlocked</span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {classification !== null ? (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          title="How often pupils use practised structures in extended writing"
                          style={{
                            backgroundColor: transferGapColour(classification) + '18',
                            color: transferGapColour(classification),
                          }}
                          data-tts={`Transfer rate: ${transferGapLabel(classification)}`}
                        >
                          {rate !== null ? `${Math.round(rate * 100)}%` : '—'} — {transferGapLabel(classification)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                  {expandedPupil === row.pupil_id && (
                    <tr key={`${row.pupil_id}-expanded`}>
                      <td colSpan={7} className="px-4 py-3" style={{ backgroundColor: 'var(--color-background)' }}>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          Expanded pupil detail view — recent sessions and mastery progress will load here.
                        </p>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Transfer rate legend */}
      <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span className="font-medium">Transfer Rate:</span>
        {(['strong', 'developing', 'at_risk'] as const).map((c) => (
          <span
            key={c}
            className="px-2 py-0.5 rounded-full"
            style={{ backgroundColor: transferGapColour(c) + '18', color: transferGapColour(c) }}
          >
            {transferGapLabel(c)}
          </span>
        ))}
        <span className="italic" title="How often pupils use practised structures in extended writing">
          — how often pupils use practised structures in extended writing
        </span>
      </div>
    </div>
  )
}

// ─── Assign Task Tab (WF-021) ─────────────────────────────────────────────────

function AssignTaskTab() {
  const { profile } = useAuthStore()
  const [tasks, setTasks] = useState<WritingTask[]>([])
  const [pupils, setPupils] = useState<{ id: string; first_name: string }[]>([])
  const [selectedTask, setSelectedTask] = useState<string>('')
  const [selectedPupil, setSelectedPupil] = useState<string>('')
  const [genreFilter, setGenreFilter] = useState<Genre | ''>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('writing_tasks').select('id, genre, year_group_min, year_group_max, title, prompt_text').order('genre'),
      supabase.from('profiles').select('id, first_name').eq('role', 'pupil').order('first_name'),
    ]).then(([taskResult, pupilResult]) => {
      if (taskResult.data) setTasks(taskResult.data as WritingTask[])
      if (pupilResult.data) setPupils(pupilResult.data as { id: string; first_name: string }[])
      setLoading(false)
    })
  }, [])

  const filteredTasks = genreFilter
    ? tasks.filter((t) => t.genre === genreFilter)
    : tasks

  const handleAssign = async () => {
    if (!selectedTask || !selectedPupil || !profile) return
    setSaving(true)
    try {
      await supabase.from('teacher_task_assignments').insert({
        teacher_id: profile.id,
        pupil_id: selectedPupil,
        writing_task_id: selectedTask,
        assigned_at: new Date().toISOString(),
      })
      setSaved(true)
      setSelectedTask('')
      setSelectedPupil('')
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />

  const GENRE_LABELS: Record<Genre, string> = {
    [Genre.NARRATIVE]: 'Narrative',
    [Genre.NON_FICTION]: 'Non-fiction',
    [Genre.PERSUASIVE]: 'Persuasive',
    [Genre.POETRY]: 'Poetry',
  }

  return (
    <div className="space-y-5 max-w-xl" data-testid="assign-task-tab">
      <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }} data-tts="Assign a writing task">
        Assign a Writing Task
      </h2>

      {/* Genre filter */}
      <div className="flex flex-col gap-1">
        <label htmlFor="genre-filter" className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          Filter by genre
        </label>
        <select
          id="genre-filter"
          value={genreFilter}
          onChange={(e) => setGenreFilter(e.target.value as Genre | '')}
          data-testid="genre-filter"
          className="rounded-lg px-3 py-2 text-sm"
          style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        >
          <option value="">All genres</option>
          {Object.values(Genre).map((g) => (
            <option key={g} value={g}>{GENRE_LABELS[g]}</option>
          ))}
        </select>
      </div>

      {/* Task selector */}
      <div className="flex flex-col gap-1">
        <label htmlFor="task-select" className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          Select task
        </label>
        <select
          id="task-select"
          value={selectedTask}
          onChange={(e) => setSelectedTask(e.target.value)}
          data-testid="task-select"
          className="rounded-lg px-3 py-2 text-sm"
          style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        >
          <option value="">Choose a task…</option>
          {filteredTasks.map((t) => (
            <option key={t.id} value={t.id}>
              [{GENRE_LABELS[t.genre]}] {t.title} (Yr {t.year_group_min}–{t.year_group_max})
            </option>
          ))}
        </select>
      </div>

      {/* Task preview */}
      {selectedTask && (() => {
        const task = tasks.find((t) => t.id === selectedTask)
        return task ? (
          <div
            className="rounded-xl p-4 text-sm"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            data-testid="task-preview"
          >
            <p className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>{task.title}</p>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.55' }}>{task.prompt_text}</p>
          </div>
        ) : null
      })()}

      {/* Pupil selector */}
      <div className="flex flex-col gap-1">
        <label htmlFor="pupil-select" className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          Assign to pupil
        </label>
        <select
          id="pupil-select"
          value={selectedPupil}
          onChange={(e) => setSelectedPupil(e.target.value)}
          data-testid="pupil-select"
          className="rounded-lg px-3 py-2 text-sm"
          style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        >
          <option value="">Choose a pupil…</option>
          {pupils.map((p) => (
            <option key={p.id} value={p.id}>{p.first_name}</option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={handleAssign}
        disabled={!selectedTask || !selectedPupil || saving}
        data-testid="assign-task-button"
        data-tts="Assign task to pupil"
        className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity"
        style={{
          backgroundColor: 'var(--color-brand-primary)',
          opacity: !selectedTask || !selectedPupil || saving ? 0.5 : 1,
          cursor: !selectedTask || !selectedPupil || saving ? 'not-allowed' : 'pointer',
        }}
      >
        {saving ? 'Assigning…' : 'Assign Task'}
      </button>

      {saved && (
        <p className="text-sm" style={{ color: '#166534' }} role="status">
          Task assigned successfully.
        </p>
      )}
    </div>
  )
}

// ─── Intervention Log Tab (WF-025) ────────────────────────────────────────────

interface InterventionRow extends InterventionLog {
  pupil_name: string
}

function InterventionLogTab({ onResolve }: { onResolve: () => void }) {
  const [rows, setRows] = useState<InterventionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)
  const [consolidationPacks, setConsolidationPacks] = useState<Record<string, ConsolidationPackData>>({})

  const TRIGGER_LABELS: Record<InterventionTrigger, string> = {
    formula: 'Formula',
    paragraph: 'Paragraph',
    writing: 'Writing',
  }

  useEffect(() => {
    supabase
      .from('intervention_log')
      .select('*, profiles(first_name)')
      .order('trigger_date', { ascending: false })
      .then(async ({ data }) => {
        const mapped: InterventionRow[] = (data ?? []).map((r: Record<string, unknown>) => ({
          ...(r as unknown as InterventionLog),
          consolidation_required: Boolean((r as Record<string, unknown>).consolidation_required),
          consolidation_pack_generated: Boolean((r as Record<string, unknown>).consolidation_pack_generated),
          pupil_name: (r.profiles as { first_name: string } | null)?.first_name ?? 'Unknown',
        }))
        setRows(mapped)
        setLoading(false)

        // Generate consolidation packs for rows that need it
        const needsPack = mapped.filter(
          (r) => r.consolidation_required && !r.consolidation_pack_generated && !r.resolved_at
        )
        const packs: Record<string, ConsolidationPackData> = {}
        await Promise.all(
          needsPack.map(async (row) => {
            try {
              const pack = await generateConsolidationPack(
                row.pupil_id,
                // level_id not directly on row — use a heuristic from error_pattern
                1,
                row.error_pattern?.category ?? 'noun'
              )
              packs[row.id] = pack
            } catch {
              // ignore individual pack generation failures
            }
          })
        )
        setConsolidationPacks(packs)
      })
  }, [])

  async function handleResolve(id: string) {
    setResolving(id)
    await supabase
      .from('intervention_log')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', id)
    setRows((prev) =>
      prev.map((r) => r.id === id ? { ...r, resolved_at: new Date().toISOString() } : r)
    )
    setResolving(null)
    onResolve()
  }

  if (loading) return <LoadingSpinner />

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const unresolved = rows.filter((r) => !r.resolved_at)
  const resolved = rows.filter((r) => r.resolved_at)

  return (
    <div className="space-y-4" data-testid="intervention-log-tab">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          Intervention Log
        </h2>
        {unresolved.length > 0 && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: '#DC2626' }}
            data-testid="unresolved-count"
          >
            {unresolved.length} unresolved
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>
          <p className="text-lg">No interventions logged yet.</p>
        </div>
      ) : (
        <>
          {/* Unresolved interventions */}
          {unresolved.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                Unresolved ({unresolved.length})
              </h3>
              {unresolved.map((row) => {
                const isOld = new Date(row.trigger_date) < sevenDaysAgo
                return (
                  <div key={row.id} className="space-y-2">
                    <div
                      className="rounded-xl p-4 flex items-start gap-4"
                      style={{
                        backgroundColor: isOld ? '#FEF2F2' : 'var(--color-surface)',
                        border: `1px solid ${isOld ? '#FECACA' : 'var(--color-border)'}`,
                      }}
                      data-testid={`intervention-row-${row.id}`}
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm" style={{ color: isOld ? '#DC2626' : 'var(--color-text)' }}>
                            {row.pupil_name}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}
                          >
                            {TRIGGER_LABELS[row.trigger_layer]}
                          </span>
                          {isOld && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
                            >
                              Overdue
                            </span>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {new Date(row.trigger_date).toLocaleDateString('en-GB')} &middot;{' '}
                          {row.error_pattern?.category ?? '—'}
                          {row.error_pattern?.frequency != null
                            ? ` (${Math.round(row.error_pattern.frequency * 100)}% frequency)`
                            : ''}
                        </p>
                        {row.action_taken && (
                          <p className="text-xs" style={{ color: 'var(--color-text)' }}>
                            Action: {row.action_taken}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleResolve(row.id)}
                        disabled={resolving === row.id}
                        data-testid={`resolve-intervention-${row.id}`}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium whitespace-nowrap flex-shrink-0"
                        style={{ backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' }}
                      >
                        {resolving === row.id ? 'Resolving…' : 'Mark Resolved'}
                      </button>
                    </div>
                    {/* WF-032: Show consolidation pack if available */}
                    {row.consolidation_required && consolidationPacks[row.id] && (
                      <ConsolidationPackCard
                        interventionId={row.id}
                        pupilName={row.pupil_name}
                        pack={consolidationPacks[row.id]}
                        onMarkedSent={() => {
                          setRows((prev) =>
                            prev.map((r) =>
                              r.id === row.id ? { ...r, consolidation_pack_generated: true } : r
                            )
                          )
                        }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Resolved interventions */}
          {resolved.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                Resolved ({resolved.length})
              </h3>
              {resolved.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl p-4 opacity-60"
                  style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                  data-testid={`resolved-row-${row.id}`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                      {row.pupil_name}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}
                    >
                      {TRIGGER_LABELS[row.trigger_layer]}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: '#F0FDF4', color: '#166534' }}
                    >
                      Resolved {row.resolved_at ? new Date(row.resolved_at).toLocaleDateString('en-GB') : ''}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    {row.error_pattern?.category ?? '—'} &middot; {new Date(row.trigger_date).toLocaleDateString('en-GB')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── My Classes Tab ───────────────────────────────────────────────────────────

interface ClassRow {
  id: string
  name: string
  year_group: number
  academic_year: string
  teacher_id: string | null
  school_id: string
  created_at: string
  w_level: number
  active_genre: string
}

interface PupilRow {
  id: string
  first_name: string
  year_group: number | null
  class_id: string | null
}

function MyClassesTab() {
  const { profile } = useAuthStore()
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState<ClassRow | null>(null)
  const [pupils, setPupils] = useState<PupilRow[]>([])
  const [unassignedPupils, setUnassignedPupils] = useState<PupilRow[]>([])
  const [loadingPupils, setLoadingPupils] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newClass, setNewClass] = useState({ name: '', year_group: '3', academic_year: '2025-26' })
  const [saving, setSaving] = useState(false)
  const [addingPupil, setAddingPupil] = useState<string | null>(null)
  const [removingPupil, setRemovingPupil] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Programme settings
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsFlash, setSettingsFlash] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    if (!profile.school_id) {
      setLoading(false)
      return
    }
    supabase
      .from('classes')
      .select('*')
      .eq('school_id', profile.school_id)
      .order('year_group')
      .then(({ data }) => {
        setClasses((data as ClassRow[]) ?? [])
        setLoading(false)
      })
  }, [profile])

  const loadClassPupils = async (cls: ClassRow) => {
    setSelectedClass(cls)
    setLoadingPupils(true)
    const [enrolledRes, unassignedRes] = await Promise.all([
      supabase.from('profiles').select('id, first_name, year_group, class_id')
        .eq('class_id', cls.id).eq('role', 'pupil').order('first_name'),
      supabase.from('profiles').select('id, first_name, year_group, class_id')
        .eq('school_id', cls.school_id).eq('role', 'pupil').is('class_id', null).order('first_name'),
    ])
    setPupils((enrolledRes.data as PupilRow[]) ?? [])
    setUnassignedPupils((unassignedRes.data as PupilRow[]) ?? [])
    setLoadingPupils(false)
  }

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.school_id || !newClass.name.trim()) return
    setSaving(true)
    setError(null)
    const { data, error: err } = await supabase.from('classes').insert({
      name: newClass.name.trim(),
      year_group: parseInt(newClass.year_group),
      academic_year: newClass.academic_year.replace('/', '-'),
      school_id: profile.school_id,
      teacher_id: profile.id,
    }).select().single()
    setSaving(false)
    if (err) { setError(err.message); return }
    setClasses((prev) => [...prev, data as ClassRow].sort((a, b) => a.year_group - b.year_group))
    setNewClass({ name: '', year_group: '3', academic_year: '2025-26' })
    setShowCreateForm(false)
  }

  const handleAddPupil = async (pupil: PupilRow) => {
    if (!selectedClass) return
    setAddingPupil(pupil.id)
    await supabase.from('profiles').update({ class_id: selectedClass.id }).eq('id', pupil.id)
    setPupils((prev) => [...prev, { ...pupil, class_id: selectedClass.id }].sort((a, b) => a.first_name.localeCompare(b.first_name)))
    setUnassignedPupils((prev) => prev.filter((p) => p.id !== pupil.id))
    setAddingPupil(null)
  }

  const handleRemovePupil = async (pupil: PupilRow) => {
    setRemovingPupil(pupil.id)
    await supabase.from('profiles').update({ class_id: null }).eq('id', pupil.id)
    setPupils((prev) => prev.filter((p) => p.id !== pupil.id))
    setUnassignedPupils((prev) => [...prev, { ...pupil, class_id: null }].sort((a, b) => a.first_name.localeCompare(b.first_name)))
    setRemovingPupil(null)
  }

  const handleSaveSettings = async (wLevel: number, activeGenre: string) => {
    if (!selectedClass) return
    setSettingsSaving(true)
    const { error: err } = await supabase
      .from('classes')
      .update({ w_level: wLevel, active_genre: activeGenre })
      .eq('id', selectedClass.id)
    setSettingsSaving(false)
    if (err) {
      setSettingsFlash('Save failed — try again.')
    } else {
      setSelectedClass((c) => c ? { ...c, w_level: wLevel, active_genre: activeGenre } : c)
      setClasses((prev) => prev.map((c) => c.id === selectedClass.id ? { ...c, w_level: wLevel, active_genre: activeGenre } : c))
      setSettingsFlash('Settings saved!')
    }
    setTimeout(() => setSettingsFlash(null), 2500)
  }

  if (loading) return <LoadingSpinner />

  // ── Class detail view ──────────────────────────────────────────────────────
  if (selectedClass) {
    return (
      <div className="space-y-5" data-testid="class-detail-view">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSelectedClass(null)}
            className="text-sm px-3 py-1.5 rounded-lg"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            ← Back
          </button>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
            {selectedClass.name} — Year {selectedClass.year_group}
          </h2>
          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {selectedClass.academic_year}
          </span>
        </div>

        {/* Programme settings panel */}
        <ProgrammeSettingsPanel
          wLevel={selectedClass.w_level ?? 2}
          activeGenre={selectedClass.active_genre ?? 'narrative'}
          saving={settingsSaving}
          flash={settingsFlash}
          onSave={handleSaveSettings}
        />

        {loadingPupils ? <LoadingSpinner /> : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Enrolled pupils */}
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
                Enrolled pupils ({pupils.length})
              </h3>
              {pupils.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  No pupils in this class yet. Add some from the list on the right.
                </p>
              ) : (
                <div className="space-y-2">
                  {pupils.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg px-3 py-2"
                      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                      data-testid={`enrolled-pupil-${p.id}`}
                    >
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                        {p.first_name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePupil(p)}
                        disabled={removingPupil === p.id}
                        className="text-xs px-2 py-1 rounded"
                        style={{ color: '#DC2626', border: '1px solid #FECACA' }}
                      >
                        {removingPupil === p.id ? '…' : 'Remove'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Unassigned pupils */}
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
                Pupils not in a class ({unassignedPupils.length})
              </h3>
              {unassignedPupils.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  All school pupils are already assigned to a class.
                </p>
              ) : (
                <div className="space-y-2">
                  {unassignedPupils.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg px-3 py-2"
                      style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)' }}
                      data-testid={`unassigned-pupil-${p.id}`}
                    >
                      <span className="text-sm" style={{ color: 'var(--color-text)' }}>
                        {p.first_name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddPupil(p)}
                        disabled={addingPupil === p.id}
                        className="text-xs px-2 py-1 rounded font-medium text-white"
                        style={{ backgroundColor: 'var(--color-brand-primary)', opacity: addingPupil === p.id ? 0.6 : 1 }}
                      >
                        {addingPupil === p.id ? '…' : 'Add'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          To create new pupil accounts, use the School Admin panel → Manage Users.
        </p>
      </div>
    )
  }

  // ── Class list view ────────────────────────────────────────────────────────
  return (
    <div className="space-y-5" data-testid="my-classes-tab">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }} data-tts="My classes">
          My Classes
        </h2>
        <button
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
          data-testid="create-class-button"
          className="text-sm px-4 py-2 rounded-lg font-semibold text-white"
          style={{ backgroundColor: 'var(--color-brand-primary)' }}
        >
          {showCreateForm ? 'Cancel' : '+ Create class'}
        </button>
      </div>

      {/* Create class form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateClass}
          className="rounded-xl p-4 space-y-4"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          data-testid="create-class-form"
        >
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>New class</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Class name</label>
              <input
                type="text"
                required
                value={newClass.name}
                onChange={(e) => setNewClass((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. 3 Willow"
                data-testid="new-class-name"
                className="rounded-lg px-3 py-2 text-sm"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Year group</label>
              <select
                value={newClass.year_group}
                onChange={(e) => setNewClass((d) => ({ ...d, year_group: e.target.value }))}
                data-testid="new-class-year"
                className="rounded-lg px-3 py-2 text-sm"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              >
                {[1,2,3,4,5,6,7,8,9].map((y) => (
                  <option key={y} value={y}>Year {y}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Academic year</label>
              <input
                type="text"
                value={newClass.academic_year}
                onChange={(e) => setNewClass((d) => ({ ...d, academic_year: e.target.value }))}
                placeholder="2025/26"
                data-testid="new-class-acyear"
                className="rounded-lg px-3 py-2 text-sm"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
          </div>
          {error && <p className="text-xs" style={{ color: '#DC2626' }}>{error}</p>}
          <button
            type="submit"
            disabled={saving}
            data-testid="save-class-button"
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--color-brand-primary)', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Creating…' : 'Create class'}
          </button>
        </form>
      )}

      {/* Class list */}
      {classes.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>
          <p className="text-lg">No classes yet.</p>
          <p className="text-sm mt-1">Create your first class using the button above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {classes.map((cls) => (
            <button
              key={cls.id}
              type="button"
              onClick={() => loadClassPupils(cls)}
              data-testid={`class-row-${cls.id}`}
              className="w-full text-left rounded-xl p-4 flex items-center justify-between gap-4 transition-opacity hover:opacity-80"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{cls.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  Year {cls.year_group} · {cls.academic_year}
                </p>
              </div>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>View →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Programme Tab ────────────────────────────────────────────────────────────

interface FormulaLevel {
  id: number
  phase: string
  nc_year_group_min: number
  nc_year_group_max: number
  paragraph_active: boolean
  formula_elements: Array<{ word_class: string; example: string; position: number }>
}

interface PhaseInfo {
  phase: string
  label: string
  description: string
  color: string
  bg: string
}

const PHASE_INFO: PhaseInfo[] = [
  {
    phase: 'A',
    label: 'Phase A — Core Patterns',
    description: 'Foundational sentence structures from simple noun + verb through to prepositional phrases. Suitable for Years 1–7.',
    color: '#6C5CE7',
    bg: '#F0EEFF',
  },
  {
    phase: 'B',
    label: 'Phase B — Extended Patterns',
    description: 'More complex sentences with adverbs, conjunctions, and embedded clauses. Years 5–9.',
    color: '#0984E3',
    bg: '#EFF6FF',
  },
  {
    phase: 'C',
    label: 'Phase C — KS2 Complexity',
    description: 'Relative clauses, fronted adverbials, and passive voice. Years 4–6.',
    color: '#00B894',
    bg: '#E0FAF4',
  },
  {
    phase: 'D',
    label: 'Phase D — KS3 Sophistication',
    description: 'Syntactic embedding, rhetorical structures, and complex subordination. Years 5–9.',
    color: '#F5A623',
    bg: '#FFF4E0',
  },
]

const WORD_CLASS_COLORS: Record<string, string> = {
  noun: '#6C5CE7',
  verb: '#00B894',
  adjective: '#F5A623',
  adverb: '#0984E3',
  determiner: '#E17055',
  preposition: '#A29BFE',
  pronoun: '#74B9FF',
  conjunction: '#FD79A8',
  article: '#E17055',
}

function ProgrammeTab({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const [levels, setLevels] = useState<FormulaLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedPhase, setExpandedPhase] = useState<string | null>('A')
  const [expandedLevel, setExpandedLevel] = useState<number | null>(null)

  useEffect(() => {
    supabase
      .from('formula_levels')
      .select('id, phase, nc_year_group_min, nc_year_group_max, paragraph_active, formula_elements')
      .order('id')
      .then(({ data }) => {
        setLevels((data as FormulaLevel[]) ?? [])
        setLoading(false)
      })
  }, [])

  const byPhase = PHASE_INFO.map((pi) => ({
    ...pi,
    levels: levels.filter((l) => l.phase === pi.phase),
  }))

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-8" data-testid="programme-tab">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }} data-tts="Programme overview">
          Programme Overview
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          WriFe teaches structured writing through four progressive layers. Pupils move through all layers as they develop mastery.
        </p>
      </div>

      {/* ── Section 1: Word Learning ───────────────────────────────────────── */}
      <section>
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: '#F0EEFF', border: '1px solid #D4CAFE' }}
        >
          <div className="flex items-start gap-4">
            <span style={{ fontSize: 28 }}>📚</span>
            <div className="flex-1">
              <h3 className="font-bold text-base" style={{ color: '#4C3BAA' }}>
                Layer 0 — Word Learning
              </h3>
              <p className="text-sm mt-1" style={{ color: '#6C5CE7' }}>
                Before pupils build sentences, they learn the vocabulary they'll need. Each formula level comes with a curated word bank for every word class in that formula.
              </p>
              <ul className="text-sm mt-3 space-y-1" style={{ color: '#4C3BAA' }}>
                <li>• Word banks organised by word class (nouns, verbs, adjectives, etc.)</li>
                <li>• You can customise word banks per level — add topic-specific vocabulary, remove words, set year-group relevance</li>
                <li>• Pupils see only the words from their current formula level's bank during practice</li>
              </ul>
              <button
                type="button"
                onClick={() => onNavigate('wordbanks')}
                className="mt-3 text-xs px-3 py-1.5 rounded-lg font-semibold"
                style={{ backgroundColor: '#6C5CE7', color: '#fff' }}
              >
                Go to Word Banks →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Formula Practice ───────────────────────────────────── */}
      <section>
        <h3 className="text-base font-bold mb-1" style={{ color: 'var(--color-text)' }}>
          Layer 1 — Formula Practice (L1–L67)
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
          Pupils build grammatically correct sentences by placing colour-coded word tiles into formula slots. Each level introduces a new syntactic structure. Pupils earn XP and unlock the next level on mastery (80%+ accuracy). 67 levels across 4 phases cover Years 1–9.
        </p>

        <div className="space-y-3">
          {byPhase.map(({ phase, label, description, color, bg, levels: phaseLevels }) => (
            <div
              key={phase}
              className="rounded-xl overflow-hidden"
              style={{ border: `1px solid ${color}40` }}
            >
              {/* Phase header */}
              <button
                type="button"
                onClick={() => setExpandedPhase(expandedPhase === phase ? null : phase)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
                style={{ backgroundColor: bg }}
                data-testid={`phase-${phase}-toggle`}
              >
                <div>
                  <span className="font-bold text-sm" style={{ color }}>{label}</span>
                  <span className="ml-3 text-xs" style={{ color: color + 'AA' }}>
                    L{phaseLevels[0]?.id}–L{phaseLevels[phaseLevels.length - 1]?.id} · {phaseLevels.length} levels
                  </span>
                  <p className="text-xs mt-0.5" style={{ color: color + 'CC' }}>{description}</p>
                </div>
                <span style={{ color, fontSize: 18 }}>{expandedPhase === phase ? '▲' : '▼'}</span>
              </button>

              {/* Level list */}
              {expandedPhase === phase && (
                <div
                  className="divide-y"
                  style={{ backgroundColor: 'var(--color-surface)', borderTop: `1px solid ${color}40` }}
                >
                  {phaseLevels.map((level) => (
                    <div key={level.id}>
                      <button
                        type="button"
                        onClick={() => setExpandedLevel(expandedLevel === level.id ? null : level.id)}
                        className="w-full flex items-center justify-between px-5 py-3 text-left hover:opacity-80"
                        data-testid={`level-${level.id}-toggle`}
                      >
                        <div className="flex items-center gap-3 flex-wrap">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded"
                            style={{ backgroundColor: bg, color }}
                          >
                            L{level.id}
                          </span>
                          {/* Formula pattern summary */}
                          <span className="text-sm" style={{ color: 'var(--color-text)' }}>
                            {level.formula_elements.map((el) => el.word_class).join(' + ')}
                          </span>
                          {level.paragraph_active && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: '#F0FDF4', color: '#166534' }}
                            >
                              + Paragraph
                            </span>
                          )}
                        </div>
                        <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                          Yr {level.nc_year_group_min}–{level.nc_year_group_max}
                          <span className="ml-1">{expandedLevel === level.id ? '▲' : '▼'}</span>
                        </span>
                      </button>

                      {expandedLevel === level.id && (
                        <div
                          className="px-5 pb-4 flex flex-wrap gap-2"
                          style={{ backgroundColor: 'var(--color-background)' }}
                        >
                          {level.formula_elements.map((el) => (
                            <div
                              key={el.position}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                              style={{
                                backgroundColor: (WORD_CLASS_COLORS[el.word_class] ?? '#636E72') + '1A',
                                color: WORD_CLASS_COLORS[el.word_class] ?? '#636E72',
                                border: `1px solid ${(WORD_CLASS_COLORS[el.word_class] ?? '#636E72')}40`,
                              }}
                            >
                              <span className="opacity-60">#{el.position}</span>
                              <span className="capitalize">{el.word_class}</span>
                              <span className="opacity-50">— e.g. &ldquo;{el.example}&rdquo;</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 3: Paragraph Builder ──────────────────────────────────── */}
      <section>
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: '#E0FAF4', border: '1px solid #81ECE8' }}
        >
          <div className="flex items-start gap-4">
            <span style={{ fontSize: 28 }}>✏️</span>
            <div className="flex-1">
              <h3 className="font-bold text-base" style={{ color: '#006B5E' }}>
                Layer 2 — Paragraph Builder <span className="text-sm font-normal">(unlocks at L8)</span>
              </h3>
              <p className="text-sm mt-1" style={{ color: '#00897B' }}>
                Once pupils reach Level 8, they extend their formula sentence into a full paragraph using the <strong>LSC scaffold</strong>: Lead → Support → Close.
              </p>
              <div className="grid gap-3 mt-3 sm:grid-cols-3">
                {[
                  { label: 'Lead', desc: 'Introduces the topic or action — the formula sentence becomes the Lead.' },
                  { label: 'Support', desc: '1–2 sentences that add detail, evidence, or description.' },
                  { label: 'Close', desc: 'Concludes the paragraph with a consequence, reflection, or summary.' },
                ].map(({ label, desc }) => (
                  <div
                    key={label}
                    className="rounded-lg p-3"
                    style={{ backgroundColor: 'rgba(255,255,255,0.6)', border: '1px solid #81ECE8' }}
                  >
                    <p className="text-xs font-bold" style={{ color: '#006B5E' }}>{label}</p>
                    <p className="text-xs mt-1" style={{ color: '#00897B' }}>{desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs mt-3" style={{ color: '#006B5E' }}>
                Four genre types: Narrative, Non-fiction, Persuasive, Poetry. Each genre has its own LSC constraints and vocabulary suggestions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 4: Writing Studio ──────────────────────────────────────── */}
      <section>
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: '#FFF4E0', border: '1px solid #FFEAA7' }}
        >
          <div className="flex items-start gap-4">
            <span style={{ fontSize: 28 }}>🏆</span>
            <div className="flex-1">
              <h3 className="font-bold text-base" style={{ color: '#8B6914' }}>
                Layer 3 — Writing Studio <span className="text-sm font-normal">(teacher-assigned)</span>
              </h3>
              <p className="text-sm mt-1" style={{ color: '#A0740A' }}>
                Extended writing tasks (400–700 words). You assign a prompt from the task library; the pupil composes a full piece. AI assesses it against UK National Curriculum rubrics — and you can review, override, and leave written feedback.
              </p>
              <div className="grid gap-3 mt-3 sm:grid-cols-2">
                {[
                  { label: 'KS1 (Yr 1–2)', desc: 'Phonics, spacing, basic punctuation, simple sentences.' },
                  { label: 'KS2 (Yr 3–6)', desc: 'Sentence variety, paragraph organisation, spelling, grammar.' },
                  { label: 'KS3 (Yr 7–9)', desc: 'Rhetoric, cohesion, audience awareness, technical accuracy.' },
                  { label: 'AI + Teacher review', desc: 'AI produces a rubric score; you can add comments and override the grade.' },
                ].map(({ label, desc }) => (
                  <div
                    key={label}
                    className="rounded-lg p-3"
                    style={{ backgroundColor: 'rgba(255,255,255,0.6)', border: '1px solid #FFEAA7' }}
                  >
                    <p className="text-xs font-bold" style={{ color: '#8B6914' }}>{label}</p>
                    <p className="text-xs mt-1" style={{ color: '#A0740A' }}>{desc}</p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onNavigate('assign')}
                className="mt-3 text-xs px-3 py-1.5 rounded-lg font-semibold"
                style={{ backgroundColor: '#F5A623', color: '#fff' }}
              >
                Go to Assign Task →
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── Notifications Tab (Phase 5: Writing Studio confirmation) ────────────────

interface NotificationRow {
  id: string
  pupil_id: string | null
  notification_type: string
  title: string
  body: string | null
  action_required: boolean
  actioned_at: string | null
  created_at: string
  data: Record<string, unknown>
  pupil_name?: string
}

interface NotificationsTabProps {
  teacherId: string
  onActionTaken: () => void
}

function NotificationsTab({ teacherId, onActionTaken }: NotificationsTabProps) {
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!teacherId) return
    supabase
      .from('teacher_notifications')
      .select('id, pupil_id, notification_type, title, body, action_required, actioned_at, created_at, data')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(async ({ data: rows }) => {
        if (!rows) { setLoading(false); return }

        // Enrich with pupil first names
        const pupilIds = [...new Set(rows.map((r) => r.pupil_id).filter(Boolean) as string[])]
        let nameMap: Record<string, string> = {}
        if (pupilIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name')
            .in('id', pupilIds)
          if (profiles) {
            nameMap = Object.fromEntries(profiles.map((p) => [p.id, p.first_name]))
          }
        }

        setNotifications(
          rows.map((r) => ({
            ...r,
            pupil_name: r.pupil_id ? nameMap[r.pupil_id] : undefined,
          }))
        )
        setLoading(false)
      })
  }, [teacherId])

  /**
   * Confirm Writing Studio for a pupil.
   * Sets writing_studio_unlocked + writing_studio_confirmed_at, writes a
   * mastery_event, and marks the notification as actioned.
   */
  const handleConfirmWritingStudio = async (notification: NotificationRow) => {
    if (!notification.pupil_id) return
    setConfirmingId(notification.id)

    try {
      const now = new Date().toISOString()

      await supabase
        .from('formula_progress')
        .update({
          writing_studio_unlocked: true,
          writing_studio_confirmed_at: now,
        })
        .eq('pupil_id', notification.pupil_id)

      await supabase.from('mastery_events').insert({
        pupil_id: notification.pupil_id,
        event_type: MasteryEventType.WRITING_STUDIO_CONFIRMED,
        triggered_by: 'teacher' as const,
        evidence: { notification_id: notification.id, ...(notification.data ?? {}) },
      })

      await supabase
        .from('teacher_notifications')
        .update({ actioned_at: now })
        .eq('id', notification.id)

      setConfirmedIds((prev) => new Set([...prev, notification.id]))
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, actioned_at: now } : n))
      )
      onActionTaken()
    } catch {
      // Silently handle — UI remains showing the confirm button
    } finally {
      setConfirmingId(null)
    }
  }

  if (loading) return <LoadingSpinner />

  const pending = notifications.filter(
    (n) => n.action_required && !n.actioned_at && !confirmedIds.has(n.id)
  )
  const actioned = notifications.filter(
    (n) => !n.action_required || !!n.actioned_at || confirmedIds.has(n.id)
  )

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const notificationIcon = (type: string) => {
    if (type === TeacherNotificationType.WRITING_STUDIO_READY) return '✍️'
    if (type === TeacherNotificationType.GENRE_MASTERED) return '🏆'
    if (type === TeacherNotificationType.PARAGRAPH_BUILDER_UNLOCKED) return '📝'
    if (type === TeacherNotificationType.MASTERY_GATE_PASSED) return '⭐'
    return '🔔'
  }

  return (
    <div className="space-y-6 max-w-2xl" data-testid="notifications-tab">
      <div>
        <h2
          className="text-lg font-semibold"
          style={{ color: 'var(--color-text)' }}
          data-tts="Notifications"
        >
          Notifications
        </h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Actions you need to take and recent updates from your pupils.
        </p>
      </div>

      {/* Action required */}
      {pending.length > 0 && (
        <section data-testid="notifications-action-required">
          <h3
            className="text-sm font-semibold uppercase tracking-wider mb-3"
            style={{ color: '#DC2626' }}
          >
            Action Required ({pending.length})
          </h3>
          <div className="space-y-3">
            {pending.map((n) => (
              <div
                key={n.id}
                className="rounded-xl p-4"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '2px solid #F5A623',
                }}
                data-testid={`notification-${n.id}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0" aria-hidden="true">
                    {notificationIcon(n.notification_type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--color-text)' }}
                      data-tts={n.title}
                    >
                      {n.title}
                    </p>
                    {n.body && (
                      <p
                        className="text-xs mt-1 whitespace-pre-line"
                        style={{ color: 'var(--color-text-muted)' }}
                        data-tts={n.body}
                      >
                        {n.body}
                      </p>
                    )}
                    <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                      {formatDate(n.created_at)}
                    </p>
                  </div>
                </div>

                {n.notification_type === TeacherNotificationType.WRITING_STUDIO_READY && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                    <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                      Confirming will unlock Writing Studio for {n.pupil_name ?? 'this pupil'}. This cannot be undone.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleConfirmWritingStudio(n)}
                      disabled={confirmingId === n.id}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity"
                      style={{
                        backgroundColor: confirmingId === n.id ? 'var(--color-border)' : 'var(--color-brand-secondary)',
                        cursor: confirmingId === n.id ? 'not-allowed' : 'pointer',
                        opacity: confirmingId === n.id ? 0.7 : 1,
                      }}
                      data-testid={`confirm-writing-studio-${n.id}`}
                      data-tts={`Unlock Writing Studio for ${n.pupil_name ?? 'pupil'}`}
                    >
                      {confirmingId === n.id ? 'Confirming…' : `✓ Unlock Writing Studio for ${n.pupil_name ?? 'Pupil'}`}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* No pending actions */}
      {pending.length === 0 && (
        <div
          className="rounded-xl p-6 text-center"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-2xl mb-2" aria-hidden="true">✅</p>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            No actions required right now.
          </p>
        </div>
      )}

      {/* Recent informational notifications */}
      {actioned.length > 0 && (
        <section data-testid="notifications-history">
          <h3
            className="text-sm font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Recent Updates
          </h3>
          <div className="space-y-2">
            {actioned.map((n) => (
              <div
                key={n.id}
                className="rounded-xl p-3 flex items-start gap-3"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  opacity: n.actioned_at || confirmedIds.has(n.id) ? 0.75 : 1,
                }}
                data-testid={`notification-history-${n.id}`}
              >
                <span className="text-lg flex-shrink-0" aria-hidden="true">
                  {notificationIcon(n.notification_type)}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium"
                    style={{ color: 'var(--color-text)' }}
                    data-tts={n.title}
                  >
                    {n.title}
                    {(n.actioned_at || confirmedIds.has(n.id)) && n.action_required && (
                      <span
                        className="ml-2 text-xs px-1.5 py-0.5 rounded font-semibold"
                        style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}
                      >
                        Actioned
                      </span>
                    )}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {formatDate(n.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {notifications.length === 0 && !loading && (
        <div className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>
          <p className="text-lg">No notifications yet.</p>
        </div>
      )}
    </div>
  )
}

// ─── Programme Settings Panel ─────────────────────────────────────────────────

const GENRE_OPTIONS = [
  { value: 'narrative', label: 'Narrative' },
  { value: 'non_fiction', label: 'Non-fiction' },
  { value: 'persuasive', label: 'Persuasive' },
  { value: 'poetry', label: 'Poetry' },
]

const W_LEVELS = [1, 2, 3, 4, 5, 6]

interface ProgrammeSettingsPanelProps {
  wLevel: number
  activeGenre: string
  saving: boolean
  flash: string | null
  onSave: (wLevel: number, activeGenre: string) => void
}

function ProgrammeSettingsPanel({ wLevel, activeGenre, saving, flash, onSave }: ProgrammeSettingsPanelProps) {
  const [localLevel, setLocalLevel] = useState(wLevel)
  const [localGenre, setLocalGenre] = useState(activeGenre)

  // Sync if parent changes (e.g. after save)
  useEffect(() => { setLocalLevel(wLevel) }, [wLevel])
  useEffect(() => { setLocalGenre(activeGenre) }, [activeGenre])

  const isDirty = localLevel !== wLevel || localGenre !== activeGenre

  return (
    <div
      className="rounded-xl p-4 space-y-4"
      style={{ backgroundColor: 'var(--color-surface)', border: '1.5px solid var(--color-brand-primary)' }}
      data-testid="programme-settings-panel"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
          Programme Settings
        </h3>
        {flash && (
          <span
            className="text-xs px-2 py-1 rounded font-semibold"
            style={{
              backgroundColor: flash.includes('failed') ? '#FEE2E2' : '#D1FAE5',
              color: flash.includes('failed') ? '#991B1B' : '#065F46',
            }}
          >
            {flash}
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* W-level */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide mb-2 block" style={{ color: 'var(--color-text-muted)' }}>
            W-Level (scaffold complexity)
          </label>
          <div className="flex flex-wrap gap-2">
            {W_LEVELS.map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLocalLevel(lvl)}
                data-testid={`w-level-${lvl}`}
                className="w-10 h-10 rounded-lg text-sm font-bold transition-colors"
                style={{
                  backgroundColor: localLevel === lvl ? 'var(--color-brand-primary)' : 'var(--color-background)',
                  color: localLevel === lvl ? '#fff' : 'var(--color-text)',
                  border: localLevel === lvl ? 'none' : '1px solid var(--color-border)',
                }}
              >
                W{lvl}
              </button>
            ))}
          </div>
          <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
            {localLevel <= 2 ? 'W1–W2: Fully scaffolded Connect Grid columns' :
             localLevel <= 4 ? 'W3–W4: Partial scaffold, pupil adds details' :
             'W5–W6: Open plan — pupils write their own col 2 & 3'}
          </p>
        </div>

        {/* Active genre */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide mb-2 block" style={{ color: 'var(--color-text-muted)' }}>
            Active Genre
          </label>
          <div className="grid grid-cols-2 gap-2">
            {GENRE_OPTIONS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setLocalGenre(g.value)}
                data-testid={`genre-option-${g.value}`}
                className="py-2 px-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: localGenre === g.value ? 'var(--color-brand-secondary)' : 'var(--color-background)',
                  color: localGenre === g.value ? '#fff' : 'var(--color-text)',
                  border: localGenre === g.value ? 'none' : '1px solid var(--color-border)',
                }}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSave(localLevel, localGenre)}
        disabled={saving || !isDirty}
        data-testid="save-programme-settings"
        className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-opacity"
        style={{
          backgroundColor: 'var(--color-brand-primary)',
          opacity: saving || !isDirty ? 0.5 : 1,
          cursor: saving || !isDirty ? 'not-allowed' : 'pointer',
        }}
      >
        {saving ? 'Saving…' : 'Save Programme Settings'}
      </button>
    </div>
  )
}

// ─── Loading spinner ──────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
    </div>
  )
}
