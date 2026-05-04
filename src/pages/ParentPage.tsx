/**
 * WF-024: Parent Dashboard
 *
 * Two-tab view for parents:
 *   Progress — learning path overview, stats, streak, level progress per chapter
 *   Writing  — submitted writing pieces with AI feedback summary
 *
 * Freemium gate: free tier shows L1–L10 data only; pro unlocks everything.
 * Subscription management: "Manage Plan" → stripe-portal Edge Function.
 * Pending child setup: sessionStorage 'wrife_pending_child' → calls
 *   create-child-profile Edge Function on first mount.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { CHAPTERS } from '../lib/chapters'
import type { PupilProgress } from '../types/index'

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = 'progress' | 'writing'

interface LinkedPupil {
  id: string
  first_name: string
  year_group: number | null
  progress: PupilProgress | null
  recentBadges: BadgeSummary[]
  writingPieces: WritingPieceSummary[]
  levelStatuses: Record<number, 'mastered' | 'in_progress' | 'locked'>
}

interface BadgeSummary {
  badge_id: string
  name: string
  icon_key: string
  awarded_at: string
}

interface WritingPieceSummary {
  id: string
  genre: string
  title: string | null
  word_count: number | null
  submitted_at: string | null
  overall_band: number | null
  feedback_summary: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FREE_LEVEL_LIMIT = 10

const BAND_LABELS = ['Pre-emergent', 'Working Towards', 'Expected Standard', 'Greater Depth']
const BAND_COLOURS = ['#6B7280', '#B45309', '#166534', '#6D28D9']

const GENRE_LABELS: Record<string, string> = {
  narrative: 'Narrative',
  non_fiction: 'Non-Fiction',
  persuasive: 'Persuasive',
  poetry: 'Poetry',
}

// ── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, max, colour }: { value: number; max: number; colour: string }) {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100))
  return (
    <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, backgroundColor: colour }}
      />
    </div>
  )
}

// ── Chapter progress strip ────────────────────────────────────────────────────

function ChapterStrip({
  pupil,
  isPro,
}: {
  pupil: LinkedPupil
  isPro: boolean
}) {
  const currentLevel = pupil.progress?.current_formula_level ?? 0

  return (
    <div className="space-y-3">
      {CHAPTERS.map((ch) => {
        const [start, end] = ch.levelRange
        const isGated = !isPro && start > FREE_LEVEL_LIMIT
        const levelsInChapter = end - start + 1
        const completedInChapter = isGated
          ? 0
          : Math.min(Math.max(currentLevel - start + 1, 0), levelsInChapter)
        const chapterPct = Math.round((completedInChapter / levelsInChapter) * 100)
        const isCurrentChapter = currentLevel >= start && currentLevel <= end
        const isCompleted = currentLevel > end

        return (
          <div
            key={ch.num}
            className="rounded-xl p-3"
            style={{
              backgroundColor: isGated ? 'var(--color-background)' : ch.colour + '66',
              border: `1px solid ${isCurrentChapter && !isGated ? ch.textColour + '44' : 'var(--color-border)'}`,
              opacity: isGated ? 0.5 : 1,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span aria-hidden="true">{ch.emoji}</span>
                <div>
                  <p
                    className="text-xs font-semibold"
                    style={{ color: isGated ? 'var(--color-text-muted)' : ch.textColour }}
                  >
                    Ch. {ch.num}: {ch.title}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    L{start}–L{end}
                  </p>
                </div>
              </div>

              <div className="text-right">
                {isGated ? (
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>🔒 Pro</span>
                ) : isCompleted ? (
                  <span className="text-xs font-semibold" style={{ color: '#059669' }}>✓ Done</span>
                ) : (
                  <span className="text-xs font-semibold" style={{ color: ch.textColour }}>
                    {chapterPct}%
                  </span>
                )}
              </div>
            </div>

            {!isGated && (
              <ProgressBar
                value={completedInChapter}
                max={levelsInChapter}
                colour={isCompleted ? '#059669' : ch.textColour}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Writing piece card ────────────────────────────────────────────────────────

function WritingCard({ piece, isPro }: { piece: WritingPieceSummary; isPro: boolean }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <div
        className="flex items-start justify-between gap-3 cursor-pointer"
        onClick={() => isPro && setExpanded((x) => !x)}
        role={isPro ? 'button' : undefined}
        aria-expanded={isPro ? expanded : undefined}
        data-tts={piece.title ?? `${GENRE_LABELS[piece.genre] ?? piece.genre} piece`}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
            {piece.title ?? `${GENRE_LABELS[piece.genre] ?? piece.genre} piece`}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}
            >
              {GENRE_LABELS[piece.genre] ?? piece.genre}
            </span>
            {piece.overall_band != null && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: BAND_COLOURS[piece.overall_band] + '18',
                  color: BAND_COLOURS[piece.overall_band],
                }}
              >
                {BAND_LABELS[piece.overall_band]}
              </span>
            )}
            {piece.word_count && (
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {piece.word_count} words
              </span>
            )}
            {piece.submitted_at && (
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {new Date(piece.submitted_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>

        {isPro && (
          <span className="text-xs flex-shrink-0 mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {expanded ? '▲' : '▼'}
          </span>
        )}
      </div>

      {/* AI feedback — pro only */}
      <AnimatePresence>
        {isPro && expanded && piece.feedback_summary && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="mt-3 p-3 rounded-lg text-xs leading-relaxed"
              style={{ backgroundColor: 'rgba(5,150,105,0.06)', color: 'var(--color-text)' }}
              data-tts="AI feedback"
            >
              <p className="font-semibold mb-1" style={{ color: '#047857' }}>AI Feedback</p>
              {piece.feedback_summary}
            </div>
          </motion.div>
        )}

        {isPro && expanded && !piece.feedback_summary && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              No AI feedback yet for this piece.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {!isPro && (
        <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          🔒 Upgrade to Pro to read AI feedback
        </p>
      )}
    </div>
  )
}

// ── Pupil progress panel ──────────────────────────────────────────────────────

function PupilProgressPanel({ pupil, isPro }: { pupil: LinkedPupil; isPro: boolean }) {
  const { progress } = pupil
  const [activeTab, setActiveTab] = useState<TabId>('progress')

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      {/* Pupil header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <p className="font-bold text-base" style={{ color: 'var(--color-text)' }} data-tts={pupil.first_name}>
            {pupil.first_name}
          </p>
          {pupil.year_group != null && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Year {pupil.year_group} · {pupil.year_group <= 2 ? 'KS1' : pupil.year_group <= 6 ? 'KS2' : 'KS3'}
            </p>
          )}
        </div>
        {progress && (
          <span
            className="text-lg font-bold px-3 py-1 rounded-xl"
            style={{ backgroundColor: '#EDE7F6', color: '#6C5CE7' }}
            data-tts={`Level ${progress.current_formula_level}`}
          >
            L{progress.current_formula_level}
          </span>
        )}
      </div>

      {/* Stats row */}
      {progress && (
        <div
          className="mx-5 mb-4 rounded-xl grid grid-cols-3 divide-x"
          style={{
            backgroundColor: 'var(--color-background)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="text-center py-3">
            <p className="text-xl font-bold" style={{ color: '#F39C12' }}>
              {progress.current_streak}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Day Streak</p>
          </div>
          <div className="text-center py-3">
            <p className="text-xl font-bold" style={{ color: '#27AE60' }}>
              {progress.total_xp >= 1000
                ? `${(progress.total_xp / 1000).toFixed(1)}k`
                : progress.total_xp}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Total XP</p>
          </div>
          <div className="text-center py-3">
            <p className="text-xl font-bold" style={{ color: '#6C5CE7' }}>
              {pupil.recentBadges.length}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Badges</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div
        className="flex border-b mx-5"
        style={{ borderColor: 'var(--color-border)' }}
        role="tablist"
      >
        {([['progress', '📈 Progress'], ['writing', '✍️ Writing']] as [TabId, string][]).map(
          ([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
              className="pb-2 mr-5 text-sm font-semibold transition-colors"
              style={{
                color: activeTab === id ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
                borderBottom:
                  activeTab === id ? '2px solid var(--color-brand-primary)' : '2px solid transparent',
              }}
              data-tts={label}
            >
              {label}
            </button>
          ),
        )}
      </div>

      {/* Tab panels */}
      <div className="p-5">
        <AnimatePresence mode="wait">
          {activeTab === 'progress' && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {/* Recent badges */}
              {pupil.recentBadges.length > 0 && (
                <div className="mb-4">
                  <p
                    className="text-xs font-semibold uppercase tracking-wide mb-2"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Recent Badges
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {pupil.recentBadges.map((b) => (
                      <span
                        key={b.badge_id}
                        className="text-xs px-2 py-1 rounded-full font-medium"
                        style={{ backgroundColor: '#F5F3FF', color: '#6D28D9' }}
                        data-tts={b.name}
                        title={new Date(b.awarded_at).toLocaleDateString('en-GB')}
                      >
                        {b.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Chapter progress */}
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-3"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Learning Path
              </p>
              <ChapterStrip pupil={pupil} isPro={isPro} />

              {!isPro && (
                <div
                  className="mt-4 rounded-xl p-3 text-xs text-center"
                  style={{ backgroundColor: 'rgba(5,150,105,0.06)', color: '#047857' }}
                  data-tts="Upgrade to Pro to see progress beyond Level 10"
                >
                  🔒 Upgrade to Pro to see full progress beyond Level 10
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'writing' && (
            <motion.div
              key="writing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {pupil.writingPieces.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
                  No writing pieces submitted yet.
                </p>
              ) : (
                pupil.writingPieces.map((piece) => (
                  <WritingCard key={piece.id} piece={piece} isPro={isPro} />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ParentPage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [pupils, setPupils] = useState<LinkedPupil[]>([])
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [setupPending, setSetupPending] = useState(false)

  const isPro = profile?.membership_tier === 'pro'

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  const handleManagePlan = async () => {
    setPortalLoading(true)
    try {
      const res = await supabase.functions.invoke('stripe-portal', { body: {} })
      if (res.error) throw new Error(res.error.message)
      const { url } = res.data as { url: string }
      if (url) window.location.href = url
    } catch (err) {
      console.error('ParentPage: portal error', err)
    } finally {
      setPortalLoading(false)
    }
  }

  // Check for pending child profile from signup flow
  useEffect(() => {
    const pendingRaw = sessionStorage.getItem('wrife_pending_child')
    if (pendingRaw && profile) {
      setSetupPending(true)
      sessionStorage.removeItem('wrife_pending_child')

      // Call the create-child-profile Edge Function
      ;(async () => {
        try {
          const pending = JSON.parse(pendingRaw) as { nickname: string; year_group: number }
          const { data, error } = await supabase.functions.invoke('create-child-profile', {
            body: { nickname: pending.nickname, year_group: pending.year_group },
          })
          if (error) {
            console.error('ParentPage: create-child-profile error', error)
          } else {
            console.log('ParentPage: child profile created', data)
            // Reload so the new child appears in the dashboard
            window.location.reload()
          }
        } catch {
          // malformed sessionStorage data, ignore
        } finally {
          setSetupPending(false)
        }
      })()
    }
  }, [profile])

  useEffect(() => {
    if (!profile) return

    async function loadLinkedPupils() {
      const { data: links } = await supabase
        .from('parent_pupil')
        .select('pupil_id')
        .eq('parent_id', profile!.id)
        .eq('approved', true)

      if (!links || links.length === 0) {
        setLoading(false)
        return
      }

      const pupilIds = links.map((l) => l.pupil_id)

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, year_group')
        .in('id', pupilIds)

      if (!profiles) { setLoading(false); return }

      const enriched = await Promise.all(
        profiles.map(async (p) => {
          const [progressRes, badgesRes, writingRes] = await Promise.all([
            supabase.from('formula_progress').select('*').eq('pupil_id', p.id).single(),
            supabase
              .from('pupil_badges')
              .select('badge_id, awarded_at, badges(name, icon_key)')
              .eq('pupil_id', p.id)
              .order('awarded_at', { ascending: false })
              .limit(3),
            supabase
              .from('writing_pieces')
              .select('id, genre, task_prompt_text, word_count, submitted_at, ai_assessments(overall_band, feedback_text)')
              .eq('pupil_id', p.id)
              .not('submitted_at', 'is', null)
              .order('submitted_at', { ascending: false })
              .limit(isPro ? 10 : 3),
          ])

          const recentBadges: BadgeSummary[] = (badgesRes.data ?? []).map(
            (b: Record<string, unknown>) => ({
              badge_id: b.badge_id as string,
              name: (b.badges as { name: string; icon_key: string } | null)?.name ?? 'Badge',
              icon_key: (b.badges as { name: string; icon_key: string } | null)?.icon_key ?? '',
              awarded_at: b.awarded_at as string,
            }),
          )

          const writingPieces: WritingPieceSummary[] = (writingRes.data ?? []).map(
            (wp: Record<string, unknown>) => {
              const assess = (wp.ai_assessments as { overall_band: number | null; feedback_text: string | null }[] | null)?.[0]
              return {
                id: wp.id as string,
                genre: wp.genre as string,
                title: (wp.task_prompt_text as string)?.slice(0, 60) ?? null,
                word_count: wp.word_count as number | null,
                submitted_at: wp.submitted_at as string | null,
                overall_band: assess?.overall_band ?? null,
                feedback_summary: assess?.feedback_text
                  ? (assess.feedback_text as string).slice(0, 220) + '…'
                  : null,
              }
            },
          )

          // Build level status map from pupil_progress
          const currentLevel = (progressRes.data as PupilProgress | null)?.current_formula_level ?? 0
          const levelStatuses: Record<number, 'mastered' | 'in_progress' | 'locked'> = {}
          for (let l = 1; l <= 67; l++) {
            if (l < currentLevel) levelStatuses[l] = 'mastered'
            else if (l === currentLevel) levelStatuses[l] = 'in_progress'
            else levelStatuses[l] = 'locked'
          }

          return {
            id: p.id,
            first_name: p.first_name,
            year_group: p.year_group,
            progress: (progressRes.data as PupilProgress) ?? null,
            recentBadges,
            writingPieces,
            levelStatuses,
          } satisfies LinkedPupil
        }),
      )

      setPupils(enriched)
      setLoading(false)
    }

    loadLinkedPupils()
  }, [profile, isPro])

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--color-background)' }}
      data-testid="parent-page"
    >
      {/* ── Header ── */}
      <header
        className="px-4 py-3 flex items-center justify-between sticky top-0 z-10"
        style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold text-base" style={{ color: 'var(--color-text)' }} data-tts="WriFe">
            WriFe
          </span>
          {/* Tier pill */}
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: isPro ? 'rgba(5,150,105,0.12)' : 'rgba(107,114,128,0.1)',
              color: isPro ? '#059669' : '#6B7280',
            }}
            data-tts={isPro ? 'Pro plan' : 'Free plan'}
          >
            {isPro ? '✦ Pro' : 'Free'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Manage plan */}
          <button
            onClick={isPro ? handleManagePlan : () => navigate('/pricing')}
            disabled={portalLoading}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-opacity disabled:opacity-60"
            style={{
              backgroundColor: isPro ? 'rgba(5,150,105,0.1)' : '#059669',
              color: isPro ? '#059669' : '#fff',
            }}
            data-testid="manage-plan-btn"
            data-tts={isPro ? 'Manage plan' : 'Upgrade to Pro'}
          >
            {portalLoading ? '…' : isPro ? 'Manage Plan' : 'Upgrade ✦'}
          </button>

          <button
            onClick={handleSignOut}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
            data-testid="sign-out-button"
            data-tts="Sign out"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-5">
        {/* Pending child setup banner */}
        {setupPending && (
          <div
            className="rounded-xl p-3 text-sm text-center"
            style={{ backgroundColor: '#FFF3E0', color: '#B45309', border: '1px solid #FED7AA' }}
          >
            Setting up your child's profile…
          </div>
        )}

        <h1
          className="text-lg font-semibold"
          style={{ color: 'var(--color-text)' }}
          data-tts="Your children's progress"
        >
          Your Children's Progress
        </h1>

        {/* Free plan nudge */}
        {!isPro && (
          <div
            className="rounded-xl p-4 flex items-center justify-between gap-3"
            style={{ backgroundColor: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.2)' }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: '#047857' }}>
                You're on the Free plan
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#059669' }}>
                Upgrade to see full learning path, AI writing feedback, and weekly digests.
              </p>
            </div>
            <button
              onClick={() => navigate('/pricing')}
              className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
              style={{ backgroundColor: '#059669' }}
              data-tts="Upgrade to Pro"
            >
              Upgrade →
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
          </div>
        ) : pupils.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            data-testid="no-pupils-message"
          >
            <p className="text-base font-medium mb-2" style={{ color: 'var(--color-text)' }}>
              No linked children yet
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Ask your child's teacher to link your account to your child in WriFe,
              or add your child through the setup flow.
            </p>
          </div>
        ) : (
          pupils.map((p) => (
            <PupilProgressPanel key={p.id} pupil={p} isPro={isPro} />
          ))
        )}
      </main>
    </div>
  )
}
