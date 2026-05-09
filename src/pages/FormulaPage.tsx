/**
 * WF-006 + WF-009 + WF-010 + WF-013:
 * Formula Practice Session page — /practice
 * Orchestrates level loading, session submission (WF-007), mastery update (WF-008),
 * XP + streak update (WF-009), badge evaluation (WF-010),
 * and level progression gate (WF-013).
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
import { WhatsNext } from '../components/formula/WhatsNext'
import { SessionExpiryBanner } from '../components/ui/SessionExpiryBanner'
import { CertificateModal } from '../components/ui/CertificateModal'
import { awardCertificate } from '../lib/certificateEngine'
import { sanitizeText } from '../lib/sanitize'
import { insertLearningEvent } from '../lib/learningEvents'
import type { MasteryTracking, Badge, PupilProgress, WordClass } from '../types/index'
import { DefinitionUnlock } from '../components/gamification/DefinitionUnlock'
import { useStars } from '../hooks/useStars'
import { StarsDisplay } from '../components/gamification/StarsDisplay'
import { OutOfStars } from '../components/formula/OutOfStars'
import { SessionIntro } from '../components/formula/SessionIntro'
import { sfx } from '../lib/sfx'
import { FullscreenButton } from '../components/ui/FullscreenButton'
import { useSessionContent } from '../hooks/useSessionContent'
import { ChallengeCard } from '../components/formula/ChallengeCard'
import type { ActiveChallenge } from '../components/formula/ChallengeCard'

// ─── Screen states ────────────────────────────────────────────────────────────

type Screen = 'loading' | 'error' | 'intro' | 'concepts' | 'practice' | 'feedback' | 'whats-next'

export default function FormulaPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, profile } = useAuthStore()

  // ── Review mode — load a specific previous level without affecting progression ─
  const [searchParams] = useSearchParams()
  const reviewLevelParam = searchParams.get('level')
  const reviewLevelId = reviewLevelParam ? parseInt(reviewLevelParam, 10) : undefined
  const isReviewMode = searchParams.get('review') === 'true' && !!reviewLevelId

  // ── Stars gate (WF-050) ───────────────────────────────────────────────────
  const stars = useStars()
  // Track mistakes in this session to award a bonus star on a perfect run
  const [sessionMistakes, setSessionMistakes] = useState(0)
  const { isLoading, isError, data, refetch } = useFormulaLevel(reviewLevelId)
  const { setAssessing, isAssessing, resetSession } = useFormulaStore()

  const [screen, setScreen] = useState<Screen>('intro')
  const [assessmentResult, setAssessmentResult] = useState<RawAssessmentResult | null>(null)
  const [xpEarned, setXpEarned] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // Track sessions completed on this level (for WhatsNext mastery bar)
  const [sessionsCompletedThisLevel, setSessionsCompletedThisLevel] = useState(0)

  // Extension challenge assigned to this pupil (loaded when transitioning to whats-next)
  const [activeChallenge, setActiveChallenge] = useState<ActiveChallenge | null>(null)

  // Phase 2: mastery state for current level
  const masteryState = useMasteryState(user?.id, data?.level.id)

  // Phase 3: session content (subject rotation + AI context sentence + curated word bank)
  const { content: sessionContent } = useSessionContent({
    pupilId: user?.id ?? null,
    levelId: data?.level.id,
    scaffoldStage: masteryState.scaffoldStage,
    fallbackWordBanks: data?.level.word_banks as Record<string, string[]> | undefined,
    fallbackSubject: data?.todaysSubject,
  })

  // Track whether we've already notified the teacher about being stuck this level
  const stuckNotifiedRef = useRef(false)

  // Reset to intro screen when level changes (WF-051)
  useEffect(() => {
    setScreen('intro')
    setSessionMistakes(0)
    stuckNotifiedRef.current = false
  }, [data?.level.id])

  // WF-010: badge state
  const [newBadge, setNewBadge] = useState<Badge | null>(null)

  // ── Definition Unlock ceremony ────────────────────────────────────────────
  // Queue of word classes that need the cloze ceremony before the session starts
  const [definitionQueue, setDefinitionQueue] = useState<WordClass[]>([])
  const [showingDefinition, setShowingDefinition] = useState<WordClass | null>(null)

  useEffect(() => {
    if (!user?.id || !data?.level) return

    // Collect the distinct word classes used in this level's formula elements
    const levelWordClasses = [
      ...new Set(data.level.formula_elements.map((el) => el.word_class)),
    ]

    // Check which ones the pupil hasn't unlocked yet (no mastery record)
    ;(async () => {
      const { data: masteryRows } = await supabase
        .from('definition_mastery')
        .select('word_class')
        .eq('pupil_id', user.id)
        .in('word_class', levelWordClasses)

      const alreadyMastered = new Set((masteryRows ?? []).map((r: { word_class: string }) => r.word_class))
      const newWordClasses = levelWordClasses.filter((wc) => !alreadyMastered.has(wc))

      if (newWordClasses.length > 0) {
        setDefinitionQueue(newWordClasses)
        setShowingDefinition(newWordClasses[0])
      }
    })()
  }, [user?.id, data?.level.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDefinitionComplete = (_wc: WordClass) => {
    const remaining = definitionQueue.slice(1)
    setDefinitionQueue(remaining)
    setShowingDefinition(remaining.length > 0 ? remaining[0] : null)
  }

  const handleDefinitionDismiss = () => {
    // Pupil dismissed without completing — skip the rest of the queue
    setDefinitionQueue([])
    setShowingDefinition(null)
  }

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
      queryClient.invalidateQueries({ queryKey: ['formula_progress', user?.id] })
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
    // S-02: Prime AudioContext synchronously within the user gesture BEFORE any awaits.
    // iOS Safari silently blocks AudioContext creation/resume after the first await,
    // causing all sfx.success() / sfx.error() calls later in this function to be silent.
    sfx.prime()

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
        // Find the teacher for this class and send a notification (fire-and-forget)
        ;(async () => {
          try {
            const { data: classRow } = await supabase
              .from('classes')
              .select('teacher_id')
              .eq('id', profile.class_id)
              .maybeSingle()
            if (classRow?.teacher_id) {
              await supabase.from('teacher_notifications').insert({
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
          } catch {
            // silent — don't block session
          }
        })()
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
        // Phase 3: session content for formula_sessions record + fair assessment
        contextSentence: sessionContent?.contextSentence ?? null,
        subjectUsed: sessionContent?.subject ?? null,
        distractorWordsUsed: sessionContent?.distractorWords && Object.keys(sessionContent.distractorWords).length > 0
          ? sessionContent.distractorWords
          : null,
        // Pass full word bank so assessor doesn't penalise base-form verbs
        availableWordBanks: sessionContent?.wordBankSubset ?? null,
      })

      setAssessmentResult(raw)
      setSessionsCompletedThisLevel((masteryState.sessionsOnLevel ?? 0) + 1)

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
        .from('formula_progress')
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

      // Play feedback sound based on score
      if (raw.overall_score >= 80) {
        sfx.success()
      } else {
        sfx.error()
      }

      // WF-050: Stars model — deduct on any score < 80, award on perfect session
      // Whole stars only (integer DB column). Free tier, active mode only.
      if (stars.isFree && !isReviewMode) {
        if (raw.overall_score < 80) {
          setSessionMistakes(prev => prev + 1)
          await stars.deductStar(1)
        } else if (sessionMistakes === 0) {
          // Score ≥ 80 AND no mistakes this session → earn a star back
          await stars.awardStar()
        }
      }

      // WF-013: check level progression gate
      // In review mode, we award XP but never advance the level
      let progressionUpdates: Record<string, unknown> = {
        total_xp: (progress?.total_xp ?? 0) + totalXpEarned,
        last_session_date: today,
        ...streakUpdate,
      }

      let didLevelUp = false
      let newLevelNum = data.level.id

      if (!isReviewMode && shouldAdvance(masteryPayload)) {
        newLevelNum = nextLevel(data.level.id, masteryPayload)
        const newLevelsMastered = (progress?.levels_mastered_count ?? 0) + 1

        // Phase 4: pass actual gate_passed (criterion B) instead of hardcoded true.
        // checkParagraphMasteryUnlock now enforces all three §4.2 criteria:
        //   A — newLevelNum >= 4
        //   B — masteryPayload.gate_passed (pupil demonstrated mastery on this level)
        //   C — newLevelsMastered >= 2 (has pattern variety across 2 structures)
        const alreadyHadParagraph = progress?.current_formula_level != null &&
          (progress.current_formula_level >= 4)
        const paragraphNowUnlocked =
          !alreadyHadParagraph && (
            didUnlockParagraph(data.level.id, newLevelNum) ||
            checkParagraphMasteryUnlock(
              newLevelNum,
              masteryPayload.gate_passed,
              newLevelsMastered
            )
          )
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

        // Phase 4: write paragraph_unlocked mastery_event + teacher notification
        if (paragraphNowUnlocked) {
          await supabase.from('mastery_events').insert({
            pupil_id: user.id,
            event_type: 'paragraph_unlocked',
            level_id: newLevelNum,
            triggered_by: 'system',
            evidence: {
              levels_mastered: newLevelsMastered,
              gate_passed: masteryPayload.gate_passed,
            },
          })

          // Notify teacher (non-critical — failures are swallowed)
          try {
            const { data: pupilProfile } = await supabase
              .from('profiles')
              .select('class_id, first_name')
              .eq('id', user.id)
              .single()

            if (pupilProfile?.class_id) {
              const { data: classRow } = await supabase
                .from('classes')
                .select('teacher_id')
                .eq('id', pupilProfile.class_id)
                .single()

              if (classRow?.teacher_id) {
                await supabase.from('teacher_notifications').insert({
                  teacher_id: classRow.teacher_id,
                  pupil_id: user.id,
                  notification_type: 'paragraph_builder_unlocked',
                  title: `${pupilProfile.first_name} unlocked Paragraph Builder!`,
                  body: `${pupilProfile.first_name} has mastered ${newLevelsMastered} formula levels and can now practise writing full paragraphs.`,
                  data: { level_id: newLevelNum, levels_mastered: newLevelsMastered },
                  action_required: false,
                })
              }
            }
          } catch {
            // Non-critical — don't surface to pupil
          }
        }

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
      await supabase.from('formula_progress').update(progressionUpdates).eq('pupil_id', user.id)

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
            earned_at: new Date().toISOString(),
            source: null,
          },
          { onConflict: 'pupil_id,badge_id' }
        )
        setNewBadge(badge)
        sfx.star()
      }

      // Invalidate React Query cache so dashboard refreshes
      queryClient.invalidateQueries({ queryKey: ['formula_progress', user.id] })

      // Report formula session to wrife.co.uk teacher dashboard via learning_events
      void insertLearningEvent(
        user.id,
        profile?.class_id ?? null,
        'formula_completed',
        {
          level: data.level.id,
          score: raw.overall_score,
          attempts: (masteryState.sessionsOnLevel ?? 0) + 1,
        },
      )

      if (didLevelUp) {
        setShowLevelUp(true)
        // S-04: delay levelUp fanfare by 500ms so it doesn't clash with sfx.star()
        // which may have just played — the star sound is ~200ms, 500ms gap is safe.
        setTimeout(() => sfx.levelUp(), 500)
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
        .from('formula_progress')
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

      await supabase.from('formula_progress').update(progressionUpdates).eq('pupil_id', user.id)

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
            earned_at: new Date().toISOString(),
            source: null,
          },
          { onConflict: 'pupil_id,badge_id' }
        )
        setNewBadge(badge)
      }

      queryClient.invalidateQueries({ queryKey: ['formula_progress', user.id] })

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
    setSessionMistakes(0)
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
            .map((el) => useFormulaStore.getState().slotSelections[el.position] ?? '')
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

  // ─── continue from feedback → WhatsNext screen ──────────────────────────────

  const handleFeedbackContinue = async () => {
    if (showLevelUp) return // Let LevelUpModal handle navigation

    if (user?.id && data?.level.id) {
      // Step 1: AI readiness check — auto-creates 'ai_auto' challenge if criteria met.
      // Isolated try/catch so a failure here never blocks the challenge fetch below.
      try {
        await supabase.functions.invoke('check-challenge-readiness', {
          body: { levelId: data.level.id },
        })
      } catch {
        // Non-fatal — readiness check is best-effort
      }

      // Step 2: Always fetch active challenges regardless of readiness check outcome.
      // RLS filters to challenges assigned to this pupil or their class.
      try {
        const { data: challengeRows } = await supabase
          .from('pwp_challenge_assignments')
          .select('id, challenge_type, source, class_id, pupil_id')
          .eq('active', true)
          .limit(1)

        if (challengeRows && challengeRows.length > 0) {
          setActiveChallenge(challengeRows[0] as ActiveChallenge)
        }
      } catch {
        // Non-fatal — challenges are optional bonus content
      }
    }
    setScreen('whats-next')
  }

  // ─── WhatsNext CTA handlers ──────────────────────────────────────────────────

  const handleWhatsNextParagraph = () => {
    if (!data) return
    navigate('/paragraph', {
      state: {
        leadSentence: data.level.formula_elements
          .map((el) => useFormulaStore.getState().slotSelections[el.position] ?? '')
          .filter(Boolean)
          .join(' '),
        levelId: data.level.id,
        formulaScore: assessmentResult?.overall_score ?? 0,
        phase: data.level.phase,
        genreRotation: data.level.paragraph_genre_rotation ?? [],
      },
    })
  }

  const handleWhatsNextRetry = () => {
    resetSession()
    setAssessmentResult(null)
    setSubmitError(null)
    setSessionMistakes(0)
    setScreen('practice')
  }

  // ─── Challenge accept / skip handlers ───────────────────────────────────────

  const handleChallengeAccept = (challenge: ActiveChallenge) => {
    // Log the challenge_completed learning event so teachers/parents can see it
    if (user?.id) {
      void insertLearningEvent(
        user.id,
        profile?.class_id ?? null,
        'challenge_completed',
        {
          challenge_type: challenge.challenge_type,
          source: challenge.source,
          skipped: false,
        },
      )
    }
    // The card will show the instructions in-place (handled by ChallengeCard state)
  }

  const handleChallengeSkip = (_challenge: ActiveChallenge) => {
    setActiveChallenge(null)
    // No learning event logged for skips — keeps data cleaner
  }

  const handleWhatsNextNextLevel = () => {
    if (!data) return
    const nextLevelId = data.level.id + 1
    navigate(`/practice?level=${nextLevelId}`)
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

  // ─── Stars gate (WF-050) ────────────────────────────────────────────────────
  // Review mode is always free — never block it with the stars gate.
  if (!stars.loading && stars.isOutOfStars && !isReviewMode) {
    return (
      <OutOfStars
        onReview={() => navigate('/dashboard')}
        onUpgrade={() => navigate('/pricing')}
      />
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

      {/* Definition Unlock ceremony — fires when a new word class is first encountered.
          Only shown once the pupil has moved past the SessionIntro (screen !== 'intro'),
          so the modal never overlaps with the intro screen and triggers conflicting audio. */}
      <AnimatePresence>
        {showingDefinition && screen !== 'intro' && (
          <DefinitionUnlock
            key={showingDefinition}
            wordClass={showingDefinition}
            onComplete={handleDefinitionComplete}
            onDismiss={handleDefinitionDismiss}
          />
        )}
      </AnimatePresence>

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
          data-tts={isReviewMode ? 'Back to my levels' : 'Back to dashboard'}
          aria-label={isReviewMode ? 'Back to my levels' : 'Back to dashboard'}
        >
          ← {isReviewMode ? 'My levels' : 'Back'}
        </button>

        <div className="flex items-center gap-2">
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: 'var(--color-noun)' }}
            aria-hidden="true"
          >
            W
          </span>
          <span
            className="font-bold text-lg"
            style={{ color: 'var(--color-text)' }}
            data-tts={isReviewMode ? `Reviewing Level ${data.level.id}` : 'Formula Practice'}
          >
            {isReviewMode ? `Reviewing L${data.level.id}` : 'Formula Practice'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Review mode badge */}
          {isReviewMode ? (
            <div
              className="text-xs font-semibold px-2 py-1 rounded"
              style={{ backgroundColor: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}
              data-tts={`Reviewing Level ${data.level.id}`}
              data-testid="review-mode-badge"
            >
              📖 Review
            </div>
          ) : (
            <>
              {/* Free tier: daily stars display */}
              {!stars.loading && (
                <StarsDisplay
                  starsRemaining={stars.starsRemaining}
                  shieldActive={stars.shieldActive}
                  isFree={stars.isFree}
                />
              )}

              <div
                className="text-sm font-bold px-2.5 py-1 rounded-lg"
                style={{ backgroundColor: '#EFF6FF', color: 'var(--color-noun)' }}
                data-tts={`Level ${data.level.id}`}
              >
                L{data.level.id}
              </div>
            </>
          )}

          {/* Fullscreen play mode toggle — always visible */}
          <FullscreenButton />
        </div>
      </header>

      {/* Review mode info strip */}
      {isReviewMode && (
        <div
          className="px-4 py-2.5 flex items-center gap-2 text-sm"
          style={{ backgroundColor: '#FFF7ED', borderBottom: '1px solid #FED7AA' }}
          data-tts={`You are reviewing Level ${data.level.id}. Your place on the main path is safe — this practice does not change your current level.`}
          data-testid="review-mode-banner"
        >
          <span aria-hidden="true">📖</span>
          <span style={{ color: '#92400E' }}>
            <strong>Reviewing L{data.level.id}</strong> — your place on the main path is safe. This practice won't change your level.
          </span>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-8">
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

        {/* WF-051: Session intro with mascot + animated worked example */}
        {screen === 'intro' && data && (
          <SessionIntro
            level={data.level}
            todaysSubject={sessionContent?.subject ?? data.todaysSubject}
            isReturning={(masteryState.sessionsOnLevel ?? 0) > 0}
            onReady={() => setScreen('concepts')}
            onSkip={() => setScreen('practice')}
          />
        )}

        {/* Concept cards shown after intro, before first practice */}
        {screen === 'concepts' && data && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <ConceptCardSequence
              formulaElements={data.level.formula_elements}
              wordBanks={sessionContent?.wordBankSubset ?? (data.level.word_banks as Record<string, string[]>)}
              scaffoldStage={masteryState.scaffoldStage}
              currentLevelId={data.level.id}
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
                todaysSubject={sessionContent?.subject ?? data.todaysSubject}
                onSubmit={handleSubmit}
                isSubmitting={isAssessing}
                scaffoldStage={masteryState.scaffoldStage}
                currentLevelId={data.level.id}
                sessionWordBanks={sessionContent?.wordBankSubset}
                contextSentence={sessionContent?.contextSentence}
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
                .map((el) => useFormulaStore.getState().slotSelections[el.position] ?? '_')
                .join(' ')
            }
            onRetry={handleRetry}
            onContinue={handleFeedbackContinue}
          />
        )}

        {screen === 'whats-next' && assessmentResult && (
          <div className="space-y-4">
            {/* Extension challenge card — shown when a teacher/parent/AI has assigned one */}
            {activeChallenge && (
              <ChallengeCard
                challenge={activeChallenge}
                onAccept={handleChallengeAccept}
                onSkip={handleChallengeSkip}
              />
            )}
            <WhatsNext
              level={data.level}
              score={assessmentResult.overall_score}
              xpEarned={xpEarned}
              sessionsCompleted={sessionsCompletedThisLevel}
              paragraphActive={data.level.paragraph_active ?? false}
              writingUnlocked={false}
              leadSentence={
                data.level.formula_elements
                  .map((el) => useFormulaStore.getState().slotSelections[el.position] ?? '')
                  .filter(Boolean)
                  .join(' ')
              }
              formulaScore={assessmentResult.overall_score}
              onParagraph={handleWhatsNextParagraph}
              onRetry={handleWhatsNextRetry}
              onDashboard={() => navigate('/dashboard')}
              onNextLevel={
                !isReviewMode && data.level.id < 67
                  ? handleWhatsNextNextLevel
                  : undefined
              }
            />
          </div>
        )}
      </main>
    </div>
  )
}
