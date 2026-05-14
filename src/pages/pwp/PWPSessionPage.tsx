/**
 * PWP Session Page — /pwp/session
 *
 * Master state machine for the PWP session:
 *   entry → chain → paragraph (if highestLesson >= 26) → quiz → complete
 *
 * Resume logic:
 *   On mount, queries for an active session created today. If found, shows a
 *   Resume / Start New prompt. Resuming reconstructs full store state from
 *   pwp_session_steps + a fresh generateChain call (deterministic).
 */

import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { SubjectPicker } from '../../components/chain/SubjectPicker'
import { ChainStep } from '../../components/pwp/session/ChainStep'
import { ParagraphPhase } from '../../components/pwp/paragraph/ParagraphPhase'
import { QuizPhase } from '../../components/pwp/quiz/QuizPhase'
import { supabase } from '../../lib/supabase'
import { generateChain, assessStep, suggestSubjects } from '../../lib/pwp/pwpApi'
import { useAuthStore } from '../../stores/authStore'
import { usePWPSessionStore } from '../../stores/pwpSessionStore'
import type { ResumePayload, SessionStepState } from '../../stores/pwpSessionStore'
import type { AssessStepResponse } from '../../lib/pwp/pwpApi'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExistingSession {
  id: string
  subject_noun: string
  chain_length: number | null
  created_at: string | null
  stepsCompleted: number
}

// ─── Component ────────────────────────────────────────────────────────────────

const PWPSessionPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const store = usePWPSessionStore()
  const pupilId = user?.id ?? null

  const [initialising, setInitialising] = useState(false)
  const [resuming, setResuming] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [readyToAdvance, setReadyToAdvance] = useState(false)

  // ── Fetch pupil curriculum position ──────────────────────────────────────────
  const { data: positionData } = useQuery({
    queryKey: ['pwp_position', pupilId],
    queryFn: async () => {
      if (!pupilId) return null
      const { data } = await supabase
        .from('pwp_pupil_positions')
        .select('highest_lesson')
        .eq('pupil_id', pupilId)
        .maybeSingle()
      return data
    },
    enabled: !!pupilId,
  })

  // ── Fetch weekly theme ────────────────────────────────────────────────────────
  const classId = profile?.class_id ?? null
  const { data: themeData } = useQuery({
    queryKey: ['pwp_class_theme', classId],
    queryFn: async () => {
      if (!classId) return null
      const today = new Date()
      const monday = new Date(today)
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
      const weekStart = monday.toISOString().split('T')[0]
      const { data } = await supabase
        .from('pwp_class_themes')
        .select('theme_noun, genre_hint')
        .eq('class_id', classId)
        .eq('week_start', weekStart)
        .maybeSingle()
      return data
    },
    enabled: !!classId,
  })

  // ── AI subject noun suggestions (based on teacher theme + recent sessions) ────
  const { data: subjectSuggestions } = useQuery({
    queryKey: ['pwp_subject_suggestions', pupilId, themeData?.theme_noun, themeData?.genre_hint],
    queryFn: async () => {
      if (!pupilId || !themeData?.theme_noun) return []
      const result = await suggestSubjects({
        pupilId,
        themeNoun: themeData.theme_noun,
        genreHint: themeData.genre_hint ?? undefined,
      })
      return result.suggestions
    },
    enabled: !!pupilId && !!themeData?.theme_noun,
    staleTime: 5 * 60 * 1000,
  })

  // ── Check for today's active session (resume candidate) ───────────────────────
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data: existingSession, isLoading: checkingExisting } = useQuery({
    queryKey: ['pwp_active_session_today', pupilId],
    queryFn: async (): Promise<ExistingSession | null> => {
      if (!pupilId) return null
      const { data: sessions } = await supabase
        .from('pwp_sessions')
        .select('id, subject_noun, chain_length, created_at')
        .eq('pupil_id', pupilId)
        .eq('status', 'active')
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)

      const session = sessions?.[0]
      if (!session) return null

      // Count how many steps have been saved
      const { count } = await supabase
        .from('pwp_session_steps')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', session.id)

      return { ...session, stepsCompleted: count ?? 0 }
    },
    enabled: !!pupilId,
  })

  // ── Resume a saved session ────────────────────────────────────────────────────
  const handleResume = useCallback(async () => {
    if (!existingSession || !pupilId) return
    setResuming(true)
    setInitError(null)
    try {
      const highestLesson = positionData?.highest_lesson ?? 10

      // 1. Re-generate the chain (deterministic: same lesson → same ordered elements)
      const chainResult = await generateChain(pupilId, highestLesson)
      if (!chainResult.chain.length) throw new Error('No formula elements found.')

      // 2. Load saved step data
      const { data: savedSteps } = await supabase
        .from('pwp_session_steps')
        .select('step_number, sentence, ai_passed, ai_feedback, attempts')
        .eq('session_id', existingSession.id)
        .order('step_number', { ascending: true })

      const stepMap: Record<number, { sentence: string; ai_passed: boolean | null; ai_feedback: string | null; attempts: number }> =
        Object.fromEntries((savedSteps ?? []).map((s) => [s.step_number, s]))

      // 3. Reconstruct step states
      const steps: SessionStepState[] = chainResult.chain.map((step, idx) => {
        const saved = stepMap[idx + 1]
        if (!saved) {
          return { step, sentence: '', status: 'pending', assessment: null, attempts: 0 }
        }
        const status = saved.ai_passed
          ? 'passed'
          : saved.attempts >= 2
          ? 'soft_passed'
          : 'needs_revision'
        const assessment: AssessStepResponse = {
          passed: saved.ai_passed ?? false,
          feedback: saved.ai_feedback ?? '',
          suggestedRevision: null,
          confidence: 0.8,
        }
        return { step, sentence: saved.sentence, status, assessment, attempts: saved.attempts }
      })

      // 4. Find the first incomplete step
      const currentStepIndex = steps.findIndex(
        (s) => s.status === 'pending' || s.status === 'needs_revision'
      )
      const chainComplete = currentStepIndex === -1

      // 5. Check paragraph state
      const paragraphEnabled = highestLesson >= 26
      let phase: ResumePayload['phase'] = 'chain'
      let paragraph: ResumePayload['paragraph'] = null

      if (chainComplete) {
        if (paragraphEnabled) {
          const { data: savedParagraph } = await supabase
            .from('pwp_paragraphs')
            .select('lead_sentence, support_sentences, close_sentence, close_ai_passed, close_ai_feedback')
            .eq('session_id', existingSession.id)
            .maybeSingle()

          if (savedParagraph) {
            // Paragraph done — go straight to quiz
            phase = 'quiz'
            paragraph = {
              leadSentence: savedParagraph.lead_sentence ?? '',
              supportSentences: (savedParagraph.support_sentences as string[]) ?? [],
              closeSentence: savedParagraph.close_sentence ?? '',
              closeAssessment: savedParagraph.close_ai_passed !== null
                ? { passed: savedParagraph.close_ai_passed, feedback: savedParagraph.close_ai_feedback ?? '', suggestedRevision: null }
                : null,
              closeAttempts: savedParagraph.close_ai_passed !== null ? 1 : 0,
            }
          } else {
            // Chain done, paragraph not started
            phase = 'paragraph'
            const leadSentence = steps[steps.length - 1]?.sentence ?? ''
            paragraph = { leadSentence, supportSentences: [], closeSentence: '', closeAssessment: null, closeAttempts: 0 }
          }
        } else {
          phase = 'quiz'
        }
      }

      // 6. Atomically restore store
      store.resumeSession({
        sessionId: existingSession.id,
        subjectNoun: existingSession.subject_noun,
        chain: chainResult.chain,
        steps,
        currentStepIndex: chainComplete ? steps.length : currentStepIndex,
        highestLesson,
        phase,
        paragraph,
      })
    } catch (err) {
      console.error('PWP resume error:', err)
      setInitError('Could not resume session. Please start a new one.')
    } finally {
      setResuming(false)
    }
  }, [existingSession, pupilId, positionData, store])

  // ── Discard saved session and start fresh ─────────────────────────────────────
  const handleDiscardAndNew = useCallback(async () => {
    if (!existingSession) return
    // Mark old session as abandoned (fire-and-forget)
    void supabase
      .from('pwp_sessions')
      .update({ status: 'abandoned' })
      .eq('id', existingSession.id)
    // No store change needed — remains in 'entry' phase, SubjectPicker shows
  }, [existingSession])

  // ── Start a fresh session on subject noun confirm ─────────────────────────────
  const handleSubjectConfirm = useCallback(async () => {
    if (!store.subjectNoun.trim() || !pupilId) return
    setInitialising(true)
    setInitError(null)
    try {
      const highestLesson = positionData?.highest_lesson ?? 10
      const chainResult = await generateChain(pupilId, highestLesson)
      if (!chainResult.chain.length) throw new Error('No formula elements available for this lesson level.')
      store.initChain(chainResult.chain, highestLesson)

      const { data: sessionRow, error } = await supabase
        .from('pwp_sessions')
        .insert({
          pupil_id: pupilId,
          class_id: classId,
          subject_noun: store.subjectNoun.trim(),
          chain_length: chainResult.chain.length,
          status: 'active',
        })
        .select('id')
        .single()
      if (error) throw error
      store.setSessionId(sessionRow.id)
      store.setPhase('chain')
    } catch (err) {
      console.error('PWP session init error:', err)
      setInitError('Could not start the session. Please try again.')
    } finally {
      setInitialising(false)
    }
  }, [store.subjectNoun, pupilId, positionData, classId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Submit a formula step ─────────────────────────────────────────────────────
  const handleStepSubmit = useCallback(async (sentence: string) => {
    const idx = store.currentStepIndex
    const stepState = store.steps[idx]
    if (!stepState) return

    store.updateStep(idx, { status: 'assessing', sentence })

    const previousSentence = idx > 0 ? store.steps[idx - 1]?.sentence : undefined

    try {
      const result = await assessStep({
        sentence,
        formulaLabel: stepState.step.formulaLabel,
        elementCode: stepState.step.code,
        previousSentence,
        subjectNoun: store.subjectNoun,
        attemptNumber: stepState.attempts + 1,
        genreHint: themeData?.genre_hint ?? undefined,
      })

      const attempts = stepState.attempts + 1
      const status = result.passed
        ? 'passed'
        : attempts >= 2
        ? 'soft_passed'
        : 'needs_revision'

      store.updateStep(idx, { assessment: result, status, attempts, sentence })

      if (store.sessionId) {
        void supabase.from('pwp_session_steps').upsert({
          session_id: store.sessionId,
          step_number: idx + 1,
          element_id: stepState.step.elementId ? Number(stepState.step.elementId) : null,
          formula_label: stepState.step.formulaLabel,
          sentence,
          ai_passed: result.passed,
          ai_feedback: result.feedback,
          attempts,
          submitted_at: new Date().toISOString(),
        }, { onConflict: 'session_id,step_number' })
      }
    } catch {
      store.updateStep(idx, {
        status: 'soft_passed',
        sentence,
        attempts: stepState.attempts + 1,
        assessment: {
          passed: true,
          feedback: 'Good effort — your teacher will review this sentence.',
          suggestedRevision: null,
          confidence: 0.5,
        },
      })
    }
  }, [store, themeData])

  // ── Advance to next step ──────────────────────────────────────────────────────
  const handleAdvanceStep = useCallback(() => {
    store.advanceStep()
  }, [store])

  // ── Paragraph complete → quiz ─────────────────────────────────────────────────
  const handleParagraphComplete = useCallback(async () => {
    if (store.sessionId && store.paragraph) {
      void supabase.from('pwp_paragraphs').upsert({
        session_id: store.sessionId,
        lead_sentence: store.paragraph.leadSentence,
        support_sentences: store.paragraph.supportSentences,
        close_sentence: store.paragraph.closeSentence,
        close_ai_passed: store.paragraph.closeAssessment?.passed ?? null,
        close_ai_feedback: store.paragraph.closeAssessment?.feedback ?? null,
        scaffold_mode: store.highestLesson < 26,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'session_id' })
    }
    store.setPhase('quiz')
  }, [store])

  // ── Quiz complete → session complete ──────────────────────────────────────────
  const handleQuizComplete = useCallback(async () => {
    if (store.sessionId) {
      void supabase
        .from('pwp_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', store.sessionId)

      if (store.quiz) {
        void supabase.from('pwp_quiz_results').upsert({
          session_id: store.sessionId,
          pupil_id: pupilId!,
          prompts: store.quiz.results as unknown as import('../../types/supabase').Json,
          overall_passed: store.quiz.overallPassed ?? false,
          ai_summary: store.quiz.summary,
          completed_at: new Date().toISOString(),
        }, { onConflict: 'session_id' })
      }
    }

    // ── Readiness check: ≥80% of steps passed on first attempt ───────────────
    if (store.steps.length > 0 && pupilId) {
      const firstAttemptPasses = store.steps.filter(
        (s) => s.status === 'passed' && s.attempts === 1
      ).length
      const isReady = firstAttemptPasses / store.steps.length >= 0.8

      if (isReady) {
        setReadyToAdvance(true)
        void supabase
          .from('pwp_pupil_positions')
          .update({ ready_to_advance: true })
          .eq('pupil_id', pupilId)
      }
    }

    store.setPhase('complete')
  }, [store, pupilId])

  // ── Reset on unmount ──────────────────────────────────────────────────────────
  useEffect(() => {
    return () => { store.reset() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const currentStep = store.steps[store.currentStepIndex]
  const previousSentence = store.currentStepIndex > 0
    ? store.steps[store.currentStepIndex - 1]?.sentence
    : undefined

  // Determine whether to show the resume prompt in the entry phase
  const showResumePrompt =
    store.phase === 'entry' &&
    !checkingExisting &&
    !!existingSession

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Nav bar */}
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 30,
          background: 'linear-gradient(135deg, #7C6FF7 0%, var(--color-brand-primary) 100%)',
          boxShadow: '0 2px 12px rgba(108,92,231,0.35)',
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}
      >
        {store.phase !== 'complete' && (
          <button
            type="button"
            onClick={() => {
              if (store.phase === 'entry') navigate('/dashboard')
              else store.setPhase('entry')
            }}
            data-testid="back-btn"
            style={{
              background: 'rgba(255,255,255,0.18)',
              border: '1.5px solid rgba(255,255,255,0.35)',
              borderRadius: '8px', color: '#fff',
              fontSize: 'var(--pwp-text-sm)', fontWeight: 600,
              padding: '6px 12px', cursor: 'pointer',
              minHeight: 'var(--pwp-touch-min)',
            }}
          >
            ←{store.phase === 'entry' ? ' Dashboard' : ' Exit'}
          </button>
        )}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            PWP Studio
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
            {store.phase === 'entry' ? 'Choose your subject' :
             store.phase === 'chain' ? `Building — "${store.subjectNoun}"` :
             store.phase === 'paragraph' ? 'Paragraph Builder' :
             store.phase === 'quiz' ? 'Quick Check' : 'Session Complete!'}
          </div>
        </div>
        {store.phase === 'chain' && store.steps.length > 0 && (
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>
            {store.currentStepIndex}/{store.steps.length}
          </span>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {initError && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm text-center"
            style={{ backgroundColor: 'rgba(231,76,60,0.08)', color: '#c0392b', border: '1px solid rgba(231,76,60,0.25)' }}>
            {initError}
          </div>
        )}

        {/* Note: mode="wait" removed — React 19 + Framer Motion WAAPI bug causes exit
            animations to "finish" without firing the completion callback, leaving the
            exiting element in the DOM and blocking the entering element from mounting. */}
        <AnimatePresence>

          {/* Entry — with optional resume prompt */}
          {store.phase === 'entry' && (
            <motion.div key="entry" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* Resume prompt */}
              {showResumePrompt && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 rounded-2xl overflow-hidden"
                  style={{ border: '2px solid var(--color-brand-primary)' }}
                  data-testid="resume-prompt"
                >
                  <div style={{
                    background: 'linear-gradient(135deg, #7C6FF7 0%, var(--color-brand-primary) 100%)',
                    padding: '12px 16px',
                  }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Session in progress
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff', marginTop: 2 }}>
                      "{existingSession!.subject_noun}"
                    </div>
                  </div>
                  <div style={{ padding: '12px 16px', backgroundColor: 'rgba(108,92,231,0.05)' }}>
                    <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>
                      You started a session earlier today.{' '}
                      <strong style={{ color: 'var(--color-text)' }}>
                        {existingSession!.stepsCompleted} of {existingSession!.chain_length} steps
                      </strong>{' '}
                      saved.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleResume}
                        disabled={resuming}
                        data-testid="resume-btn"
                        className="flex-1 py-2.5 rounded-full font-bold text-sm disabled:opacity-50"
                        style={{ backgroundColor: 'var(--color-brand-primary)', color: '#fff' }}
                      >
                        {resuming ? 'Loading…' : 'Resume session →'}
                      </button>
                      <button
                        type="button"
                        onClick={handleDiscardAndNew}
                        disabled={resuming}
                        data-testid="discard-session-btn"
                        className="px-4 py-2.5 rounded-full font-semibold text-sm disabled:opacity-50"
                        style={{ border: '1.5px solid var(--color-border)', color: 'var(--color-text-muted)', backgroundColor: 'transparent' }}
                      >
                        Start new
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Subject picker — hidden behind resume prompt until user clicks "Start new" */}
              {!showResumePrompt && (
                <SubjectPicker
                  value={store.subjectNoun}
                  onChange={store.setSubjectNoun}
                  onConfirm={handleSubjectConfirm}
                  weeklyTheme={themeData?.theme_noun ?? null}
                  themeSuggestions={subjectSuggestions ?? []}
                  disabled={initialising || checkingExisting}
                />
              )}
            </motion.div>
          )}

          {/* Chain */}
          {store.phase === 'chain' && currentStep && (
            <motion.div key={`chain-${store.currentStepIndex}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              <ChainStep
                stepState={currentStep}
                stepIndex={store.currentStepIndex}
                totalSteps={store.steps.length}
                onSubmit={handleStepSubmit}
                onAdvance={handleAdvanceStep}
                previousSentence={previousSentence}
              />
            </motion.div>
          )}

          {/* Paragraph */}
          {store.phase === 'paragraph' && (
            <motion.div key="paragraph" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ParagraphPhase
                onComplete={handleParagraphComplete}
                genreHint={themeData?.genre_hint ?? undefined}
              />
            </motion.div>
          )}

          {/* Quiz */}
          {store.phase === 'quiz' && (
            <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <QuizPhase onComplete={handleQuizComplete} />
            </motion.div>
          )}

          {/* Complete */}
          {store.phase === 'complete' && (
            <motion.div key="complete" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🌟</div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}
                  data-tts="Session complete! Well done!">
                  Session complete!
                </h2>
                <p className="text-base mb-6" style={{ color: 'var(--color-text-muted)' }}>
                  You wrote <strong>{store.steps.length}</strong> formula sentence{store.steps.length !== 1 ? 's' : ''}
                  {store.paragraph ? ', built a paragraph,' : ''} and completed the quiz.
                </p>

                {/* Ready to level up banner */}
                {readyToAdvance && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                    className="mb-6 px-5 py-4 rounded-2xl text-center"
                    style={{
                      background: 'linear-gradient(135deg, #F5A623 0%, #f39c12 100%)',
                      boxShadow: '0 4px 20px rgba(245,166,35,0.4)',
                    }}
                    data-testid="ready-to-advance-banner"
                    data-tts="Ready to level up! You passed most steps first time."
                  >
                    <div className="text-3xl mb-1">⬆️</div>
                    <div className="text-lg font-extrabold text-white mb-0.5">Ready to level up!</div>
                    <div className="text-sm text-white" style={{ opacity: 0.9 }}>
                      You passed most steps on the first try. Your teacher can unlock the next formula level for you.
                    </div>
                  </motion.div>
                )}

                {/* Sentence review */}
                <div className="text-left space-y-2 mb-8">
                  {store.steps.map((s, i) => (
                    <div key={i} className="px-4 py-3 rounded-xl text-sm"
                      style={{ backgroundColor: 'rgba(108,92,231,0.06)', border: '1px solid rgba(108,92,231,0.12)' }}>
                      <div className="text-xs font-bold mb-0.5" style={{ color: 'var(--color-brand-primary)' }}>
                        Step {i + 1}
                      </div>
                      <div style={{ color: 'var(--color-text)' }}>"{s.sentence}"</div>
                    </div>
                  ))}
                  {store.paragraph && (
                    <div className="px-4 py-3 rounded-xl text-sm"
                      style={{ backgroundColor: 'rgba(39,174,96,0.06)', border: '1px solid rgba(39,174,96,0.2)' }}>
                      <div className="text-xs font-bold mb-1" style={{ color: '#27ae60' }}>Paragraph</div>
                      <div className="italic" style={{ color: 'var(--color-text)' }}>
                        {store.paragraph.leadSentence} {store.paragraph.supportSentences.join(' ')} {store.paragraph.closeSentence}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => { store.reset(); navigate('/dashboard') }}
                  data-testid="done-btn"
                  data-tts="Back to dashboard"
                  className="w-full py-3 rounded-full font-bold text-base"
                  style={{ backgroundColor: 'var(--color-brand-secondary)', color: '#fff' }}
                >
                  Back to dashboard →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default PWPSessionPage
