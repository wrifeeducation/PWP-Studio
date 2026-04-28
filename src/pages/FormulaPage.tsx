/**
 * WF-006 + WF-009 + WF-010 + WF-013:
 * Formula Practice Session page — /practice
 * Orchestrates level loading, session submission (WF-007), mastery update (WF-008),
 * XP + streak update (WF-009), badge evaluation (WF-010),
 * and level progression gate (WF-013).
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { useFormulaLevel } from '../hooks/useFormulaLevel'
import { useFormulaStore } from '../stores/formulaStore'
import { useAuthStore } from '../stores/authStore'
import { assessFormula } from '../lib/assessFormula'
import type { RawAssessmentResult } from '../lib/assessFormula'
import { buildMasteryUpsert } from '../lib/masteryEngine'
import { calcFormulaXP, calcStreakBonus } from '../lib/xpEngine'
import { updateStreak } from '../lib/streakEngine'
import { evaluateBadges } from '../lib/badgeEngine'
import {
  shouldAdvance,
  nextLevel,
  didUnlockParagraph,
  checkParagraphMasteryUnlock,
} from '../lib/progressionEngine'
import { useMasteryState } from '../hooks/useMasteryState'
import { ConceptCardSequence } from '../components/formula/ConceptCardSequence'
import { supabase } from '../lib/supabase'
import { enqueue, flush } from '../lib/offlineQueue'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { FormulaBuilder } from '../components/formula/FormulaBuilder'
import { FormulaFeedback } from '../components/formula/FormulaFeedback'
import { BadgeToast } from '../components/ui/BadgeToast'
import { LevelUpModal } from '../components/ui/LevelUpModal'
import { OfflineBanner } from '../components/ui/OfflineBanner'
import { LensLab } from '../components/formula/LensLab'
import { SessionExpiryBanner } from '../components/ui/SessionExpiryBanner'
import { CertificateModal } from '../components/ui/CertificateModal'
import { awardCertificate } from '../lib/certificateEngine'
import { sanitizeText } from '../lib/sanitize'
import type { MasteryTracking, Badge, PupilProgress, WordClass } from '../types/index'

// ─── Screen states ────────────────────────────────────────────────────────────

type Screen = 'loading' | 'error' | 'concepts' | 'practice' | 'feedback'

export default function FormulaPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, profile } = useAuthStore()
  const { isLoading, isError, data, refetch } = useFormulaLevel()
  const { setAssessing, isAssessing, resetSession } = useFormulaStore()

  const [screen, setScreen] = useState<Screen>('concepts')
  const [assessmentResult, setAssessmentResult] = useState<RawAssessmentResult | null>(null)
  const [xpEarned, setXpEarned] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Phase 2: mastery state for current level
  const masteryState = useMasteryState(user?.id, data?.level.id)

  // Track whether we've already notified the teacher about being stuck this level
  const stuckNotifiedRef = useRef(false)

  // Reset concept screen when level changes
  useEffect(() => {
    setScreen('concepts')
    stuckNotifiedRef.current = false
  }, [data?.level.id])

  // WF-010: badge state
  const [newBadge, setNewBadge] = useState<Badge | null>(null)

  // WF-042: certificate state
  const [showCertificate, setShowCertificate] = useState(false)
  const [certificateData, setCertificateData] = useState<{
    levelId: number
    awardedAt: string
  } | null>(null)

  // WF-027: network status + offline queue flush
  const { isOnline } = useNetworkStatus()
  const [offlineToast, setOfflineToast] = useState(false)

  const flushQueue = useCallback(async () => {
    const { synced } = await flush(supabase)
    if (synced > 0) {
      queryClient.invalidateQueries({ queryKey: ['pupil_progress', user?.id] })
    }
  }, [user?.id, queryClient])

  useEffect(() => {
    if (isOnline) {
      flushQueue()
    }
  }, [isOnline, flushQueue])

  // WF-013: level-up state
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [levelUpData, setLevelUpData] = useState<{
    previousLevel: number
    newLevel: number
    xpSummary: { formulaXP: number; streakBonus: number; total: number }
    didUnlockParagraph: boolean
  } | null>(null)

  // ─── submit handler ─────────────────────────────────────────────────────────

  const handleSubmit = async (sentence: string, wordsUsed: string[], hintsUsed: WordClass[] = []) => {
    if (!user?.id || !data) return
    setSubmitError(null)
    setAssessing(true)

    // WF-027: if offline, enqueue session and show toast
    if (!isOnline) {
      const queueId = crypto.randomUUID() as import('../types/index').UUID
      enqueue({
        id: queueId,
        type: 'formula_session',
        timestamp: new Date(),
        data: {
          pupil_id: user.id,
          level_id: data.level.id,
          session_date: new Date().toISOString().split('T')[0],
          sentence_built: sanitizeText(sentence),
          scaffold_used: false,
          scaffold_type: null,
          is_lens_lab: data.level.phase === 'D',
          formula_score: 0,
          xp_earned: 0,
          semantic_purpose_score: null,
          semantic_audience_score: null,
          semantic_effect_score: null,
        },
        retryCount: 0,
        maxRetries: 5,
        lastError: null,
      })
      setOfflineToast(true)
      setTimeout(() => setOfflineToast(false), 4000)
      setAssessing(false)
      return
    }

    try {
      // Phase 2: stuck detection — notify teacher if >12 sessions without gate pass
      if (
        masteryState.isStuck &&
        !stuckNotifiedRef.current &&
        profile?.class_id
      ) {
        stuckNotifiedRef.current = true
        // Find the teacher for this class and send a notification
        supabase
          .from('classes')
          .select('teacher_id')
          .eq('id', profile.class_id)
          .maybeSingle()
          .then(({ data: classRow }) => {
            if (classRow?.teacher_id) {
              supabase.from('teacher_notifications').insert({
                teacher_id: classRow.teacher_id,
                pupil_id: user.id,
                notification_type: 'stuck_pupil_alert',
                title: `${profile.first_name} may need support on Level ${data.level.id}`,
                body: `${profile.first_name} has completed ${masteryState.sessionsOnLevel} sessions on Level ${data.level.id} without reaching mastery. Consider a consolidation activity.`,
                data: {
                  level_id: data.level.id,
                  sessions_completed: masteryState.sessionsOnLevel,
                  scaffold_stage: masteryState.scaffoldStage,
                },
                action_required: false,
              })
            }
          })
          .catch(() => {/* silent — don't block session */})
      }

      // WF-007: call assess-formula edge function + save session
      const { raw } = await assessFormula({
        pupilId: user.id,
        level: data.level,
        sentence,
        wordsUsed,
        yearGroup: profile?.year_group ?? 5,
        attemptNumber: 1,
        scaffoldStage: masteryState.scaffoldStage,
        hintsUsed: hintsUsed.map(String),
        sessionNumberOnLevel: (masteryState.sessionsOnLevel ?? 0) + 1,
      })

      setAssessmentResult(raw)

      // WF-008: fetch existing mastery row then upsert
      const { data: existingMastery } = await supabase
        .from('mastery_tracking')
        .select('*')
        .eq('pupil_id', user.id)
        .eq('level_id', data.level.id)
        .maybeSingle()

      const masteryPayload = buildMasteryUpsert(
        user.id,
        data.level.id,
        existingMastery as MasteryTracking | null,
        raw.overall_score
      )

      await supabase
        .from('mastery_tracking')
        .upsert(masteryPayload, { onConflict: 'pupil_id,level_id' })

      // Phase 2: write mastery_event when gate first passes
      const gateJustPassed = masteryPayload.gate_passed && !(existingMastery as MasteryTracking | null)?.gate_passed
      if (gateJustPassed) {
        await supabase.from('mastery_events').insert({
          pupil_id: user.id,
          event_type: 'level_mastered',
          level_id: data.level.id,
          scaffold_stage: masteryPayload.scaffold_stage,
          triggered_by: 'system',
          evidence: {
            sessions_completed: masteryPayload.sessions_completed,
            window_average: masteryPayload.current_window_average,
          },
        })
      }

      // Phase 2: also write mastery_event when scaffold stage advances
      const prevStage = (existingMastery as MasteryTracking | null)?.scaffold_stage ?? 1
      if (masteryPayload.scaffold_stage > prevStage) {
        await supabase.from('mastery_events').insert({
          pupil_id: user.id,
          event_type: 'scaffold_stage_advanced',
          level_id: data.level.id,
          from_value: String(prevStage),
          to_value: String(masteryPayload.scaffold_stage),
          scaffold_stage: masteryPayload.scaffold_stage,
          triggered_by: 'system',
          evidence: { sessions_completed: masteryPayload.sessions_completed },
        })
      }

      // WF-009: XP + streak update
      const { data: progressRow } = await supabase
        .from('pupil_progress')
        .select('*')
        .eq('pupil_id', user.id)
        .single()

      const progress = progressRow as PupilProgress | null
      const today = new Date().toISOString().split('T')[0]

      let streakUpdate = {}
      let streakBonus = 0
      if (progress) {
        const newStreak = updateStreak(progress, today)
        streakBonus = calcStreakBonus(newStreak.current_streak)
        streakUpdate = newStreak
      }

      const levelXp = calcFormulaXP(data.level.id, raw.overall_score)
      const totalXpEarned = levelXp + streakBonus
      setXpEarned(totalXpEarned)

      // WF-013: check level progression gate
      let progressionUpdates: Record<string, unknown> = {
        total_xp: (progress?.total_xp ?? 0) + totalXpEarned,
        last_session_date: today,
        ...streakUpdate,
      }

      let didLevelUp = false
      let newLevelNum = data.level.id

      if (shouldAdvance(masteryPayload)) {
        newLevelNum = nextLevel(data.level.id, masteryPayload)
        const newLevelsMastered = (progress?.levels_mastered_count ?? 0) + 1
        const paragraphNowUnlocked =
          didUnlockParagraph(data.level.id, newLevelNum) ||
          checkParagraphMasteryUnlock(newLevelNum, true, newLevelsMastered)
        const writingUnlocked = newLevelNum >= 35 || (progress?.writing_studio_unlocked ?? false)

        progressionUpdates = {
          ...progressionUpdates,
          current_formula_level: newLevelNum,
          writing_studio_unlocked: writingUnlocked,
          levels_mastered_count: newLevelsMastered,
        }

        didLevelUp = true
        setLevelUpData({
          previousLevel: data.level.id,
          newLevel: newLevelNum,
          xpSummary: { formulaXP: levelXp, streakBonus, total: totalXpEarned },
          didUnlockParagraph: paragraphNowUnlocked,
        })

        // WF-013: insert intervention log if consolidation required
        if (masteryPayload.consolidation_required) {
          await supabase.from('intervention_log').insert({
            pupil_id: user.id,
            trigger_layer: 'formula',
            trigger_date: today,
            error_pattern: { category: 'low_composite', frequency: 0.6 },
            action_taken: 'consolidation_required',
            consolidation_pack_generated: false,
            resolved_at: null,
          })
        }
      }

      // Persist progress update
      await supabase.from('pupil_progress').update(progressionUpdates).eq('pupil_id', user.id)

      // WF-010: evaluate badges
      const { data: allBadges } = await supabase.from('badges').select('*')
      const { data: earnedBadgesRows } = await supabase
        .from('pupil_badges')
        .select('badge_id')
        .eq('pupil_id', user.id)

      const earnedIds = (earnedBadgesRows ?? []).map((r: { badge_id: string }) => r.badge_id)

      const { data: formulaSessions } = await supabase
        .from('formula_sessions')
        .select('id')
        .eq('pupil_id', user.id)
      const isFirstFormula = (formulaSessions?.length ?? 0) <= 1

      const updatedProgress: PupilProgress = {
        ...(progress as PupilProgress),
        ...progressionUpdates,
        current_formula_level: newLevelNum,
      }

      const newBadges = evaluateBadges({
        progress: updatedProgress,
        mastery: existingMastery as MasteryTracking | null,
        updatedMastery: masteryPayload,
        paragraphSessionCount: 0,
        recentParagraphScores: [],
        isFirstFormulaSession: isFirstFormula,
        isFirstParagraphSession: false,
        earnedBadgeIds: earnedIds,
        allBadges: (allBadges ?? []) as Badge[],
      })

      if (newBadges.length > 0) {
        // Insert first new badge into pupil_badges
        const badge = newBadges[0]
        await supabase.from('pupil_badges').upsert(
          {
            pupil_id: user.id,
            badge_id: badge.id,
            awarded_at: new Date().toISOString(),
            source: null,
          },
          { onConflict: 'pupil_id,badge_id' }
        )
        setNewBadge(badge)
      }

      // Invalidate React Query cache so dashboard refreshes
      queryClient.invalidateQueries({ queryKey: ['pupil_progress', user.id] })

      if (didLevelUp) {
        setShowLevelUp(true)
        // WF-042: award formula mastery certificate on gate pass
        if (user?.id) {
          const cert = await awardCertificate(user.id, data.level.id, 'formula_mastery')
          if (cert) {
            setCertificateData({ levelId: cert.level_id, awardedAt: cert.awarded_at })
            setShowCertificate(true)
          }
        }
      }

      setScreen('feedback')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setSubmitError(message)
    } finally {
      setAssessing(false)
    }
  }

  // ─── LensLab submit handler (Phase D) ──────────────────────────────────────

  const handleLensLabSubmit = async (score: number) => {
    if (!user?.id || !data) return
    setSubmitError(null)
    setAssessing(true)

    const syntheticResult = {
      overall_score: score,
      slot_results: [],
      formula_score: score,
      semantic_score: null,
      feedback: score >= 80 ? 'Excellent recognition!' : 'Good effort — keep practising.',
    } as unknown as RawAssessmentResult

    try {
      // Save formula_sessions with is_lens_lab: true
      await supabase.from('formula_sessions').insert({
        pupil_id: user.id,
        level_id: data.level.id,
        session_date: new Date().toISOString().split('T')[0],
        sentence_built: '',
        scaffold_used: false,
        scaffold_type: null,
        is_lens_lab: true,
        formula_score: score,
        xp_earned: Math.round(score / 2),
        semantic_purpose_score: null,
        semantic_audience_score: null,
        semantic_effect_score: null,
      })

      // WF-008: fetch existing mastery row then upsert
      const { data: existingMastery } = await supabase
        .from('mastery_tracking')
        .select('*')
        .eq('pupil_id', user.id)
        .eq('level_id', data.level.id)
        .maybeSingle()

      const masteryPayload = buildMasteryUpsert(
        user.id,
        data.level.id,
        existingMastery as MasteryTracking | null,
        score
      )

      await supabase
        .from('mastery_tracking')
        .upsert(masteryPayload, { onConflict: 'pupil_id,level_id' })

      // WF-009: XP + streak update
      const { data: progressRow } = await supabase
        .from('pupil_progress')
        .select('*')
        .eq('pupil_id', user.id)
        .single()

      const progress = progressRow as PupilProgress | null
      const today = new Date().toISOString().split('T')[0]

      let streakUpdate = {}
      let streakBonus = 0
      if (progress) {
        const newStreak = updateStreak(progress, today)
        streakBonus = calcStreakBonus(newStreak.current_streak)
        streakUpdate = newStreak
      }

      const levelXp = calcFormulaXP(data.level.id, score)
      const totalXpEarned = levelXp + streakBonus
      setXpEarned(totalXpEarned)

      const progressionUpdates: Record<string, unknown> = {
        total_xp: (progress?.total_xp ?? 0) + totalXpEarned,
        last_session_date: today,
        ...streakUpdate,
      }

      await supabase.from('pupil_progress').update(progressionUpdates).eq('pupil_id', user.id)

      // WF-010: evaluate badges
      const { data: allBadges } = await supabase.from('badges').select('*')
      const { data: earnedBadgesRows } = await supabase
        .from('pupil_badges')
        .select('badge_id')
        .eq('pupil_id', user.id)

      const earnedIds = (earnedBadgesRows ?? []).map((r: { badge_id: string }) => r.badge_id)

      const { data: formulaSessions } = await supabase
        .from('formula_sessions')
        .select('id')
        .eq('pupil_id', user.id)
      const isFirstFormula = (formulaSessions?.length ?? 0) <= 1

      const updatedProgress: PupilProgress = {
        ...(progress as PupilProgress),
        ...progressionUpdates,
        current_formula_level: data.level.id,
      }

      const newBadges = evaluateBadges({
        progress: updatedProgress,
        mastery: existingMastery as MasteryTracking | null,
        updatedMastery: masteryPayload,
        paragraphSessionCount: 0,
        recentParagraphScores: [],
        isFirstFormulaSession: isFirstFormula,
        isFirstParagraphSession: false,
        earnedBadgeIds: earnedIds,
        allBadges: (allBadges ?? []) as Badge[],
      })

      if (newBadges.length > 0) {
        const badge = newBadges[0]
        await supabase.from('pupil_badges').upsert(
          {
            pupil_id: user.id,
            badge_id: badge.id,
            awarded_at: new Date().toISOString(),
            source: null,
          },
          { onConflict: 'pupil_id,badge_id' }
        )
        setNewBadge(badge)
      }

      queryClient.invalidateQueries({ queryKey: ['pupil_progress', user.id] })

      setAssessmentResult(syntheticResult)
      setScreen('feedback')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setSubmitError(message)
    } finally {
      setAssessing(false)
    }
  }

  // ─── retry handler ──────────────────────────────────────────────────────────

  const handleRetry = () => {
    resetSession()
    setAssessmentResult(null)
    setSubmitError(null)
    // Skip concept cards on retry — go straight to practice
    setScreen('practice')
  }

  // ─── continue after level-up ────────────────────────────────────────────────

  const handleLevelUpContinue = () => {
    setShowLevelUp(false)
    // Navigate to paragraph builder if paragraph is now active
    if (data?.level.paragraph_active && levelUpData) {
      navigate('/paragraph', {
        state: {
          leadSentence: data.level.formula_elements
            .map((_el, i) => useFormulaStore.getState().slotSelections[i] ?? '')
            .filter(Boolean)
            .join(' '),
          levelId: levelUpData.newLevel,
          formulaScore: assessmentResult?.overall_score ?? 0,
          phase: data.level.phase,
          genreRotation: data.level.paragraph_genre_rotation ?? [],
        },
      })
    } else {
      navigate('/dashboard')
    }
  }

  // ─── continue from feedback (no level-up) ───────────────────────────────────

  const handleFeedbackContinue = () => {
    if (showLevelUp) return // Let LevelUpModal handle navigation
    // Navigate to paragraph if paragraph_active on current level
    if (data?.level.paragraph_active) {
      navigate('/paragraph', {
        state: {
          leadSentence: data.level.formula_elements
            .map((_el, i) => useFormulaStore.getState().slotSelections[i] ?? '')
            .filter(Boolean)
            .join(' '),
          levelId: data.level.id,
          formulaScore: assessmentResult?.overall_score ?? 0,
          phase: data.level.phase,
          genreRotation: data.level.paragraph_genre_rotation ?? [],
        },
      })
    } else {
      navigate('/dashboard')
    }
  }

  // ─── loading state ──────────────────────────────────────────────────────────

  if (isLoading || screen === 'loading') {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-background)' }}
        data-testid="formula-loading"
      >
        <div className="text-center space-y-3">
          <div
            className="w-10 h-10 border-4 rounded-full animate-spin mx-auto"
            style={{
              borderColor: 'var(--color-noun)',
              borderTopColor: 'transparent',
            }}
          />
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-muted)' }}
            data-tts="Loading your formula…"
          >
            Loading your formula…
          </p>
        </div>
      </div>
    )
  }

  // ─── error state ────────────────────────────────────────────────────────────

  if (isError || !data) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--color-background)' }}
        data-testid="formula-error"
      >
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
            Could not load your formula
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Check your connection and try again.
          </p>
          <button
            onClick={() => refetch()}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--color-noun)' }}
            data-testid="retry-load-button"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // ─── main render ────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen pb-16"
      style={{ backgroundColor: 'var(--color-background)' }}
      data-testid="formula-page"
    >
      {/* WF-047: Session expiry warning */}
      <SessionExpiryBanner />

      {/* WF-042: Certificate modal */}
      {showCertificate && certificateData && profile && (
        <CertificateModal
          pupilName={profile.first_name}
          levelId={certificateData.levelId}
          certificateType="formula_mastery"
          awardedAt={certificateData.awardedAt}
          onClose={() => setShowCertificate(false)}
          onDownload={() => {
            // PDF download — uses existing @react-pdf/renderer integration
            setShowCertificate(false)
          }}
        />
      )}

      {/* WF-027: Offline banner + toast */}
      <OfflineBanner />
      {offlineToast && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-lg"
          style={{ backgroundColor: '#0F766E' }}
          role="status"
          data-testid="offline-save-toast"
          data-tts="Saved offline — will sync when connected"
        >
          Saved offline — will sync when connected
        </motion.div>
      )}

      {/* Badge toast (WF-010) */}
      <BadgeToast badge={newBadge} onDismiss={() => setNewBadge(null)} />

      {/* Level-up modal (WF-013) */}
      {levelUpData && (
        <LevelUpModal
          isOpen={showLevelUp}
          previousLevel={levelUpData.previousLevel}
          newLevel={levelUpData.newLevel}
          xpSummary={levelUpData.xpSummary}
          didUnlockParagraph={levelUpData.didUnlockParagraph}
          onContinue={handleLevelUpContinue}
        />
      )}

      {/* Header */}
      <header
        className="px-4 py-4 flex items-center justify-between sticky top-0 z-10"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
        }}
        data-testid="formula-header"
      >
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm px-3 py-1.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2"
          style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
          data-testid="back-button"
          data-tts="Back to dashboard"
          aria-label="Back to dashboard"
        >
          ← Back
        </button>

        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: 'var(--color-noun)' }}
            aria-hidden="true"
          >
            W
          </span>
          <span
            className="font-bold text-base"
            style={{ color: 'var(--color-text)' }}
            data-tts="Formula Practice"
          >
            Formula Practice
          </span>
        </div>

        <div
          className="text-xs font-semibold px-2 py-1 rounded"
          style={{ backgroundColor: '#EFF6FF', color: 'var(--color-noun)' }}
          data-tts={`Level ${data.level.id}`}
        >
          L{data.level.id}
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-6">
        {/* Submit error banner */}
        {submitError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 p-3 rounded-xl text-sm"
            style={{ backgroundColor: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' }}
            data-testid="submit-error"
            data-tts={submitError}
            role="alert"
          >
            {submitError}
          </motion.div>
        )}

        {/* Phase 2: Concept cards shown before the first practice screen */}
        {screen === 'concepts' && data && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <ConceptCardSequence
              formulaElements={data.level.formula_elements}
              wordBanks={data.level.word_banks as Record<string, string[]>}
              scaffoldStage={masteryState.scaffoldStage}
              onComplete={() => setScreen('practice')}
            />
          </motion.div>
        )}

        {screen === 'practice' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {/* WF-028: Phase D uses Lens Lab recognition mode */}
            {data.level.phase === 'D' ? (
              <LensLab
                level={data.level}
                onSubmit={handleLensLabSubmit}
                isSubmitting={isAssessing}
              />
            ) : (
              <FormulaBuilder
                level={data.level}
                todaysSubject={data.todaysSubject}
                onSubmit={handleSubmit}
                isSubmitting={isAssessing}
                scaffoldStage={masteryState.scaffoldStage}
              />
            )}
          </motion.div>
        )}

        {screen === 'feedback' && assessmentResult && (
          <FormulaFeedback
            result={assessmentResult}
            xpEarned={xpEarned}
            sentence={
              data.level.formula_elements
                .map((_el, i) => useFormulaStore.getState().slotSelections[i] ?? '_')
                .join(' ')
            }
            onRetry={handleRetry}
            onContinue={handleFeedbackContinue}
          />
        )}
      </main>
    </div>
  )
}
