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
import { Genre } from '../types/index'

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

type TabId = 'pending' | 'progress' | 'assign' | 'interventions' | 'wordbanks' | 'analytics'

const TAB_LABELS: Record<TabId, string> = {
  pending: 'Pending Review',
  progress: 'Class Progress',
  assign: 'Assign Task',
  interventions: 'Interventions',
  wordbanks: 'Word Banks',
  analytics: 'Analytics',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TeacherPage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabId>('pending')
  const [unresolvedCount, setUnresolvedCount] = useState(0)

  // Load unresolved intervention count for badge
  useEffect(() => {
    if (!profile) return
    supabase
      .from('intervention_log')
      .select('id', { count: 'exact', head: true })
      .is('resolved_at', null)
      .then(({ count }) => setUnresolvedCount(count ?? 0))
  }, [profile])

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
        <span
          className="font-bold text-base"
          style={{ color: 'var(--color-text)' }}
          data-tts="WriFe Teacher Dashboard"
        >
          WriFe — Teacher Dashboard
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {profile?.first_name}
          </span>
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
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <main className="flex-1 p-4 max-w-6xl mx-auto w-full">
        {activeTab === 'pending' && <PendingReviewTab />}
        {activeTab === 'progress' && <ClassProgressTab />}
        {activeTab === 'assign' && <AssignTaskTab />}
        {activeTab === 'interventions' && (
          <InterventionLogTab onResolve={() => setUnresolvedCount((c) => Math.max(0, c - 1))} />
        )}
        {activeTab === 'wordbanks' && <WordBankEditor />}
        {activeTab === 'analytics' && <AnalyticsTab />}
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

// ─── Loading spinner ──────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
    </div>
  )
}
