/**
 * WF-003 + WF-014: Pupil Dashboard with live-refreshed data.
 * Fetches pupil_progress (React Query), shows animated XP counter,
 * level progress bar, streak with shield indicator, and last 3 badges.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useSpring, useTransform, useMotionValue } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { FormulaLevelBadge } from '../components/dashboard/FormulaLevelBadge'
import { StreakCounter } from '../components/dashboard/StreakCounter'
import { NavCard } from '../components/dashboard/NavCard'
import { XPShop } from '../components/dashboard/XPShop'
import { TTSButton } from '../components/ui/TTSButton'
import { SessionExpiryBanner } from '../components/ui/SessionExpiryBanner'
import { PupilWelcomeModal, useShouldShowWelcome } from '../components/ui/PupilWelcomeModal'
import { useSettingsStore } from '../stores/settingsStore'
import type { PupilProgress, PupilBadge, Badge } from '../types/index'

const PARAGRAPH_UNLOCK_LEVEL = 8
const MASTERY_GATE_SESSIONS = 5

// ─── Animated XP counter ─────────────────────────────────────────────────────

interface AnimatedXPProps {
  value: number
}

const AnimatedXP: React.FC<AnimatedXPProps> = ({ value }) => {
  const motionVal = useMotionValue(0)
  const spring = useSpring(motionVal, { stiffness: 80, damping: 20 })
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString())
  const [displayStr, setDisplayStr] = useState('0')

  useEffect(() => {
    motionVal.set(value)
  }, [value, motionVal])

  useEffect(() => {
    return display.on('change', (v) => setDisplayStr(v))
  }, [display])

  return (
    <span data-tts={`${value} XP`} data-testid="animated-xp-value">
      {displayStr}
    </span>
  )
}

// ─── Recent badges strip ──────────────────────────────────────────────────────

interface RecentBadgesProps {
  pupilId: string
}

const RecentBadges: React.FC<RecentBadgesProps> = ({ pupilId }) => {
  const { data: pupilBadges } = useQuery<Array<PupilBadge & { badges: Badge }>>({
    queryKey: ['pupil_badges_recent', pupilId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pupil_badges')
        .select('*, badges(*)')
        .eq('pupil_id', pupilId)
        .order('awarded_at', { ascending: false })
        .limit(3)
      if (error) throw error
      return data as Array<PupilBadge & { badges: Badge }>
    },
    enabled: !!pupilId,
    staleTime: 1000 * 60 * 2,
  })

  if (!pupilBadges?.length) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-xl p-4"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
      data-testid="recent-badges"
    >
      <h3
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: 'var(--color-text-muted)' }}
        data-tts="Recent badges"
      >
        Recent Badges
      </h3>
      <div className="flex gap-3">
        {pupilBadges.map((pb, i) => (
          <motion.div
            key={pb.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.35 + i * 0.07, stiffness: 250, damping: 20 }}
            className="flex flex-col items-center gap-1"
            data-testid={`badge-icon-${i}`}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
              style={{
                background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
                border: '2px solid #FCD34D',
              }}
              aria-hidden="true"
            >
              {pb.badges?.icon_key || '🏅'}
            </div>
            <span
              className="text-xs text-center leading-tight"
              style={{ color: 'var(--color-text-muted)', maxWidth: '52px' }}
              data-tts={pb.badges?.name}
            >
              {pb.badges?.name?.slice(0, 12) ?? 'Badge'}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

// ─── Level progress bar ───────────────────────────────────────────────────────

interface LevelProgressBarProps {
  levelId: number
  sessionsCompleted: number
  gateSessions: number
}

const LevelProgressBar: React.FC<LevelProgressBarProps> = ({
  levelId,
  sessionsCompleted,
  gateSessions,
}) => {
  const pct = Math.min((sessionsCompleted / gateSessions) * 100, 100)

  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
      data-testid="level-progress-bar"
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs font-semibold"
          style={{ color: 'var(--color-text-muted)' }}
          data-tts={`Level ${levelId} progress`}
        >
          Level {levelId} Progress
        </span>
        <span
          className="text-xs font-bold"
          style={{ color: 'var(--color-noun)' }}
          data-tts={`${sessionsCompleted} of ${gateSessions} sessions`}
        >
          {sessionsCompleted}/{gateSessions}
        </span>
      </div>
      <div
        className="h-2.5 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--color-border)' }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: 'var(--color-noun)' }}
        />
      </div>
      <p
        className="text-xs mt-1"
        style={{ color: 'var(--color-text-muted)' }}
        data-tts="Sessions toward mastery gate"
      >
        Sessions toward mastery gate
      </p>
    </div>
  )
}

// ─── Settings Modal (WF-031) ──────────────────────────────────────────────────

interface SettingsModalProps {
  onClose: () => void
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const navigate = useNavigate()
  const { ttsEnabled, ttsRate, setTtsEnabled, setTtsRate } = useSettingsStore()

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
      data-testid="settings-modal-overlay"
    >
      <div
        className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-6 space-y-5"
        style={{ backgroundColor: 'var(--color-surface)' }}
        onClick={(e) => e.stopPropagation()}
        data-testid="settings-modal"
      >
        <div className="flex items-center justify-between">
          <h2
            className="font-bold text-base"
            style={{ color: 'var(--color-text)' }}
            data-tts="Settings"
          >
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="text-lg px-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ✕
          </button>
        </div>

        {/* TTS toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              Read Aloud (TTS)
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>UK English voice</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={ttsEnabled}
            onClick={() => setTtsEnabled(!ttsEnabled)}
            data-testid="modal-tts-toggle"
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ backgroundColor: ttsEnabled ? 'var(--color-brand-primary)' : 'var(--color-border)' }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
              style={{ transform: ttsEnabled ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>

        {/* Rate slider */}
        {ttsEnabled && (
          <div>
            <label className="text-xs font-medium flex justify-between" style={{ color: 'var(--color-text-muted)' }}>
              <span>Reading speed</span>
              <span>{ttsRate.toFixed(2)}×</span>
            </label>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.05}
              value={ttsRate}
              onChange={(e) => setTtsRate(Number(e.target.value))}
              data-testid="modal-tts-rate"
              className="w-full mt-2 accent-blue-600"
            />
          </div>
        )}

        {/* Full settings link */}
        <button
          type="button"
          onClick={() => { onClose(); navigate('/settings') }}
          className="w-full text-sm px-4 py-2.5 rounded-lg font-medium"
          style={{ border: '1px solid var(--color-border)', color: 'var(--color-brand-primary)' }}
          data-testid="open-full-settings"
        >
          All Settings →
        </button>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)

  // React Query for pupil_progress (auto-refreshes on invalidation)
  const {
    data: progress,
    isLoading,
    error,
  } = useQuery<PupilProgress | null>({
    queryKey: ['pupil_progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data, error: fetchError } = await supabase
        .from('pupil_progress')
        .select('*')
        .eq('pupil_id', user.id)
        .single()
      if (fetchError && fetchError.code === 'PGRST116') return null
      if (fetchError) throw fetchError
      return data as PupilProgress
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30,
  })

  // React Query for mastery sessions count
  const { data: masteryData } = useQuery({
    queryKey: ['mastery_tracking', user?.id, progress?.current_formula_level],
    queryFn: async () => {
      if (!user?.id || !progress) return null
      const { data } = await supabase
        .from('mastery_tracking')
        .select('sessions_completed')
        .eq('pupil_id', user.id)
        .eq('level_id', progress.current_formula_level)
        .maybeSingle()
      return data
    },
    enabled: !!user?.id && !!progress,
    staleTime: 1000 * 60,
  })

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    useAuthStore.getState().clearAuth()
    window.location.href = '/login'
  }

  const level = progress?.current_formula_level ?? 1
  const totalXP = progress?.total_xp ?? 0
  const currentStreak = progress?.current_streak ?? 0
  const longestStreak = progress?.longest_streak ?? 0
  const shieldActive = progress?.streak_shield_active ?? false

  const isParagraphLocked = level < PARAGRAPH_UNLOCK_LEVEL
  const isWritingStudioLocked = !progress?.writing_studio_unlocked

  const firstName = profile?.first_name ?? 'Pupil'
  const sessionsCompleted = masteryData?.sessions_completed ?? 0
  // WF-057: Show welcome modal on first visit
  const shouldShowWelcome = useShouldShowWelcome()
  const [welcomeDismissed, setWelcomeDismissed] = useState(false)

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-background)' }}
        data-testid="dashboard-loading"
      >
        <div className="text-center space-y-3">
          <div
            className="w-10 h-10 border-4 rounded-full animate-spin mx-auto"
            style={{
              borderColor: 'var(--color-brand-primary)',
              borderTopColor: 'transparent',
            }}
          />
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-muted)' }}
            data-tts="Loading your dashboard"
          >
            Loading your dashboard…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen pb-12"
      style={{ backgroundColor: 'var(--color-background)' }}
      data-testid="dashboard-page"
    >
      {/* WF-057: First-visit welcome modal */}
      {shouldShowWelcome && !welcomeDismissed && user?.id && (
        <PupilWelcomeModal
          pupilId={user.id}
          firstName={firstName}
          onComplete={() => setWelcomeDismissed(true)}
        />
      )}

      {/* WF-047: Session expiry warning */}
      <SessionExpiryBanner />

      {/* Top header */}
      <header
        className="px-4 py-4 flex items-center justify-between"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
        }}
        data-testid="dashboard-header"
      >
        <div className="flex items-center gap-3">
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: 'var(--color-brand-primary)' }}
            aria-hidden="true"
          >
            W
          </span>
          <span
            className="font-bold text-lg"
            style={{ color: 'var(--color-text)' }}
            data-tts="WriFe"
          >
            WriFe
          </span>
        </div>

        <img
          src="/mascot/mascot_std_1.png"
          alt=""
          aria-hidden="true"
          style={{ height: '88px', width: 'auto', display: 'block' }}
        />

          <button
            onClick={() => setSettingsOpen(true)}
            className="text-sm px-2 py-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
            data-testid="settings-gear-button"
            aria-label="Open settings"
            data-tts="Settings"
          >
            ⚙
          </button>
        <button
          type="button"
          onClick={handleSignOut}
          className="text-sm px-3 py-1.5 rounded-lg transition-colors"
          style={{
            color: 'var(--color-text-muted)',
            border: '1px solid var(--color-border)',
          }}
          data-testid="sign-out-button"
          data-tts="Sign out"
        >
          Sign out
        </button>
      </header>

      {/* Settings modal */}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}

      <main className="max-w-xl mx-auto px-4 pt-6 space-y-5">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="flex items-center gap-2">
            <h1
              className="text-2xl font-bold"
              style={{ color: 'var(--color-text)' }}
              data-tts={`Hello, ${firstName}`}
            >
              Hello, {firstName}! 👋
            </h1>
            <TTSButton text={`Hello, ${firstName}! Ready to write today?`} />
          </div>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--color-text-muted)' }}
            data-tts="Ready to write today?"
          >
            Ready to write today?
          </p>
        </motion.div>

        {/* Error banner */}
        {error && (
          <div
            className="p-3 rounded-xl text-sm"
            style={{
              backgroundColor: '#FEE2E2',
              color: '#991B1B',
              border: '1px solid #FECACA',
            }}
            data-testid="dashboard-error"
            data-tts="Could not load your progress. Please refresh the page."
          >
            Could not load your progress. Please refresh the page.
          </div>
        )}

        {/* Animated XP display */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl px-4 py-3 flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, #FEF9C3, #FEF3C7)',
            border: '1px solid #FCD34D',
          }}
          data-testid="xp-display"
        >
          <span
            className="text-sm font-semibold"
            style={{ color: '#92400E' }}
            data-tts="Total XP"
          >
            ⭐ Total XP
          </span>
          <span className="text-xl font-bold" style={{ color: '#78350F' }}>
            <AnimatedXP value={totalXP} />
          </span>
        </motion.div>

        {/* Stats row: Level + Streak */}
        <div className="flex gap-3 justify-between" data-testid="stats-row">
          <FormulaLevelBadge level={level} />
          <StreakCounter currentStreak={currentStreak} longestStreak={longestStreak} />
          {shieldActive && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="flex flex-col items-center justify-center rounded-xl px-3 py-2"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
              data-testid="streak-shield"
              data-tts="Streak shield active"
              title="Streak Shield Active"
            >
              <span className="text-2xl" aria-hidden="true">🛡️</span>
              <span className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Shield
              </span>
            </motion.div>
          )}
        </div>

        {/* Level progress bar */}
        <LevelProgressBar
          levelId={level}
          sessionsCompleted={sessionsCompleted}
          gateSessions={MASTERY_GATE_SESSIONS}
        />

        {/* Recent badges */}
        {user?.id && <RecentBadges pupilId={user.id} />}

        {/* WF-035: XP Shop */}
        {progress && (
          <div>
            <button
              type="button"
              onClick={() => setShopOpen((o) => !o)}
              className="text-xs font-medium mb-2 flex items-center gap-1"
              style={{ color: 'var(--color-brand-primary)' }}
              data-testid="toggle-xp-shop"
              data-tts={shopOpen ? 'Hide XP Shop' : 'Open XP Shop'}
            >
              🏪 XP Shop {shopOpen ? '▲' : '▼'}
            </button>
            {shopOpen && (
              <XPShop
                progress={progress}
                onPurchase={() => {
                  queryClient.invalidateQueries({ queryKey: ['pupil_progress', user?.id] })
                }}
              />
            )}
          </div>
        )}

        {/* Three-layer navigation cards */}
        <section aria-label="Learning layers" data-testid="nav-cards">
          <h2
            className="text-sm font-semibold mb-3 uppercase tracking-wider"
            style={{ color: 'var(--color-text-muted)' }}
            data-tts="Your learning layers"
          >
            Your Learning Layers
          </h2>

          <div className="space-y-3 dashboard-grid">
            {/* Layer 1: Formula Practice — always unlocked */}
            <NavCard
              title="Formula Practice"
              description={`Level ${level} — Build sentences with colour-coded word tiles`}
              isLocked={false}
              accentColor="var(--color-noun)"
              icon="🧩"
              route="/practice"
              delay={0.1}
            />

            {/* Layer 2: Paragraph Builder — locked until L8 */}
            <NavCard
              title="Paragraph Builder"
              description="Extend your formula into a full Lead–Support–Close paragraph"
              isLocked={isParagraphLocked}
              lockReason={
                isParagraphLocked
                  ? `Unlocks at Level ${PARAGRAPH_UNLOCK_LEVEL} — you're on Level ${level}`
                  : undefined
              }
              accentColor="var(--color-adjective)"
              icon="📝"
              route="/paragraph"
              delay={0.15}
            />

            {/* Layer 3: Writing Studio — locked */}
            <NavCard
              title="Writing Studio"
              description="Write extended stories, essays, and arguments"
              isLocked={isWritingStudioLocked}
              lockReason={
                isWritingStudioLocked
                  ? 'Unlocked when your teacher assigns a Writing Studio task'
                  : undefined
              }
              accentColor="var(--color-verb)"
              icon="✍️"
              route="/writing"
              delay={0.2}
            />

            {/* WF-029: Portfolio — always accessible */}
            <NavCard
              title="My Portfolio"
              description="View your published writing, badges, and progress"
              isLocked={false}
              accentColor="var(--color-adverb)"
              icon="📚"
              route="/portfolio"
              delay={0.25}
            />
          </div>
        </section>

        {/* Progress summary footer */}
        {progress && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl p-4 text-sm"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
            data-testid="progress-summary"
          >
            <h3
              className="font-semibold mb-2"
              style={{ color: 'var(--color-text)' }}
              data-tts="Your progress"
            >
              Your Progress
            </h3>
            <div className="space-y-1" style={{ color: 'var(--color-text-muted)' }}>
              {progress.last_session_date && (
                <p data-tts={`Last session: ${progress.last_session_date}`}>
                  Last session:{' '}
                  <span style={{ color: 'var(--color-text)' }}>
                    {new Date(progress.last_session_date).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </p>
              )}
              <p data-tts={`Current paragraph phase: ${progress.current_paragraph_phase}`}>
                Paragraph phase:{' '}
                <span style={{ color: 'var(--color-text)' }}>
                  Phase {progress.current_paragraph_phase}
                </span>
              </p>
              {progress.streak_shield_active && (
                <p
                  style={{ color: 'var(--color-brand-accent)' }}
                  data-tts="Streak shield active"
                >
                  🛡️ Streak shield active
                </p>
              )}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}
