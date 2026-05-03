/**
 * PWP Free Practice — Free Practice Page
 *
 * Route: /free-practice
 *
 * Differences from Daily Practice:
 *   - Unlimited sessions (no once-per-day restriction)
 *   - Help mode: word-class colour bands visible on every ChainRow
 *   - XP: 5 per accepted sentence (not 25 flat)
 *   - Challenge phase: after chain completes, offer one L(n+1) row (10 XP bonus)
 *   - Saves to pwp_free_practice_sentences (no mastery points affected)
 *
 * Flow: picking → chaining → challenge → complete
 *
 * Max 200 lines — heavy lifting in ChainBuilder / ChainRow / SessionComplete.
 */

import React, { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { SubjectPicker } from '../components/chain/SubjectPicker'
import { ChainBuilder } from '../components/chain/ChainBuilder'
import { ChainRow } from '../components/chain/ChainRow'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { getChainFormula } from '../lib/chain/formulaDefinitions'
import { validateChainSentence } from '../lib/chain/validateChainSentence'
import type { ChainRowState, FreePracticeSentenceSave } from '../types/index'

// ─── Free-practice XP constants ───────────────────────────────────────────────

const XP_PER_SENTENCE = 5
const CHALLENGE_XP    = 10

// ─── Page component ───────────────────────────────────────────────────────────

type PagePhase = 'picking' | 'chaining' | 'challenge' | 'complete'

const FreePracticePage: React.FC = () => {
  const navigate   = useNavigate()
  const { user, profile } = useAuthStore()

  const [phase, setPhase]           = useState<PagePhase>('picking')
  const [subjectNoun, setSubjectNoun] = useState('')
  const [completedRows, setCompletedRows] = useState<ChainRowState[]>([])
  const [challengeRow, setChallengeRow]   = useState<ChainRowState | null>(null)
  const [saving, setSaving]         = useState(false)
  const sessionStartRef = useRef<number>(Date.now())

  // ── Fetch pupil's class + level ─────────────────────────────────────────────
  const pupilId = user?.id ?? null

  const { data: classMemberData } = useQuery({
    queryKey: ['class_member', pupilId],
    queryFn: async () => {
      if (!pupilId) return null
      const { data, error } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('pupil_id', pupilId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!pupilId,
  })

  const classId = profile?.class_id ?? classMemberData?.class_id ?? null

  const { data: levelData } = useQuery({
    queryKey: ['pwp_pupil_level', pupilId, classId],
    queryFn: async () => {
      if (!pupilId || !classId) return null
      const { data, error } = await supabase
        .from('pwp_pupil_levels')
        .select('current_level')
        .eq('pupil_id', pupilId)
        .eq('class_id', classId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!pupilId && !!classId,
  })

  // ── Fetch weekly theme ────────────────────────────────────────────────────────
  const { data: themeData } = useQuery({
    queryKey: ['pwp_theme', classId],
    queryFn: async () => {
      if (!classId) return null
      const today = new Date()
      const monday = new Date(today)
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
      const weekStart = monday.toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('pwp_class_themes')
        .select('theme, suggestions')
        .eq('class_id', classId)
        .eq('week_start', weekStart)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!classId,
  })

  const currentLevel   = levelData?.current_level ?? 1
  const challengeLevel = currentLevel + 1

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleSubjectConfirm = useCallback(() => {
    if (subjectNoun.trim().length >= 2) {
      sessionStartRef.current = Date.now()
      setPhase('chaining')
    }
  }, [subjectNoun])

  const handleChainComplete = useCallback(
    (payload: { rows: ChainRowState[] }) => {
      setCompletedRows(payload.rows)
      // Offer challenge if there's a formula defined for the next level
      const nextFormula = getChainFormula(challengeLevel)
      if (nextFormula && challengeLevel <= 30) {
        setChallengeRow({
          level: challengeLevel,
          status: 'active',
          sentence: '',
          attempts: 0,
          lastError: null,
        })
        setPhase('challenge')
      } else {
        setPhase('complete')
      }
    },
    [challengeLevel],
  )

  const handleChallengeSubmit = useCallback(
    (sentence: string) => {
      const formula = getChainFormula(challengeLevel)
      if (!formula) return
      const result = validateChainSentence(sentence, formula, subjectNoun)
      setChallengeRow((prev) => {
        if (!prev) return prev
        if (result.accepted) {
          return { ...prev, status: 'accepted', sentence }
        }
        const updated: ChainRowState = {
          ...prev,
          status: 'error',
          attempts: prev.attempts + 1,
          lastError: result.errorMessage,
          sentence,
        }
        // Reset to active after error flash
        setTimeout(() => {
          setChallengeRow((r) => r ? { ...r, status: 'active' } : r)
        }, 600)
        return updated
      })
    },
    [challengeLevel, subjectNoun],
  )

  const handleSaveAndDone = useCallback(async () => {
    if (!pupilId || !classId) {
      navigate('/dashboard')
      return
    }
    setSaving(true)
    try {
      const rows = completedRows.filter((r) => r.status === 'accepted')
      const challengeAccepted = challengeRow?.status === 'accepted'

      const sentences: FreePracticeSentenceSave[] = [
        ...rows.map((r) => ({
          pupil_id:     pupilId,
          class_id:     classId,
          level:        r.level,
          subject_noun: subjectNoun,
          sentence:     r.sentence,
          accepted:     true,
          attempts:     r.attempts + 1,
          xp_earned:    XP_PER_SENTENCE,
        })),
        ...(challengeRow
          ? [{
              pupil_id:     pupilId,
              class_id:     classId,
              level:        challengeRow.level,
              subject_noun: subjectNoun,
              sentence:     challengeRow.sentence,
              accepted:     challengeAccepted,
              attempts:     challengeRow.attempts + 1,
              xp_earned:    challengeAccepted ? CHALLENGE_XP : 0,
            }]
          : []),
      ]

      if (sentences.length > 0) {
        await supabase.from('pwp_free_practice_sentences').insert(sentences)
      }
    } catch (err) {
      console.error('Failed to save free practice sentences:', err)
    } finally {
      setSaving(false)
      navigate('/dashboard')
    }
  }, [pupilId, classId, subjectNoun, completedRows, challengeRow, navigate])

  // ── Derived ───────────────────────────────────────────────────────────────────
  const acceptedCount  = completedRows.filter((r) => r.status === 'accepted').length
  const chainXp        = acceptedCount * XP_PER_SENTENCE
  const challengeXp    = challengeRow?.status === 'accepted' ? CHALLENGE_XP : 0
  const totalXp        = chainXp + challengeXp

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-2xl mx-auto">

        {/* Back link */}
        {phase !== 'complete' && (
          <button
            type="button"
            onClick={() => phase === 'picking' ? navigate('/dashboard') : setPhase('picking')}
            className="mb-6 text-sm font-semibold flex items-center gap-1 hover:opacity-70 transition"
            style={{ color: 'var(--color-brand-primary)' }}
            data-testid="back-btn"
          >
            ← {phase === 'picking' ? 'Back to dashboard' : 'Change subject'}
          </button>
        )}

        {/* Help mode badge */}
        {(phase === 'chaining' || phase === 'challenge') && (
          <div
            className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ backgroundColor: 'var(--color-brand-secondary-light)', color: 'var(--color-brand-secondary)' }}
            data-tts="Help mode is on. Colour bands show the word class for each position."
          >
            🎨 Help mode — colour bands on
          </div>
        )}

        {/* Phase: picking */}
        {phase === 'picking' && (
          <SubjectPicker
            value={subjectNoun}
            onChange={setSubjectNoun}
            onConfirm={handleSubjectConfirm}
            weeklyTheme={themeData?.theme ?? null}
            themeSuggestions={themeData?.suggestions ?? []}
          />
        )}

        {/* Phase: chaining */}
        {phase === 'chaining' && (
          <ChainBuilder
            subjectNoun={subjectNoun}
            currentLevel={currentLevel}
            onChainComplete={handleChainComplete}
            helpMode
          />
        )}

        {/* Phase: challenge (single L(n+1) row) */}
        {phase === 'challenge' && challengeRow && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div
                className="mb-4 px-4 py-3 rounded-2xl text-center"
                style={{
                  backgroundColor: 'var(--color-gold-light)',
                  border: '2px solid var(--color-gold)',
                }}
              >
                <p
                  className="text-base font-bold"
                  style={{ color: 'var(--color-gold-dark)' }}
                  data-tts={`Bonus challenge! Try a level ${challengeLevel} sentence for ${CHALLENGE_XP} extra XP.`}
                >
                  ⭐ Bonus challenge — try L{challengeLevel} for +{CHALLENGE_XP} XP!
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  This is the next level — give it a go or skip below.
                </p>
              </div>

              {getChainFormula(challengeLevel) && (
                <ChainRow
                  rowState={challengeRow}
                  formula={getChainFormula(challengeLevel)!}
                  subjectNoun={subjectNoun}
                  onSubmit={handleChallengeSubmit}
                  autoFocus
                  helpMode
                />
              )}

              {/* Skip challenge */}
              {challengeRow.status !== 'accepted' && (
                <button
                  type="button"
                  onClick={() => setPhase('complete')}
                  className="mt-2 w-full py-3 rounded-xl text-sm font-semibold transition hover:opacity-80"
                  style={{ color: 'var(--color-text-muted)', border: '2px solid var(--color-border)' }}
                  data-testid="skip-challenge-btn"
                  data-tts="Skip challenge and finish"
                >
                  Skip challenge → finish
                </button>
              )}

              {/* Proceed after accepted challenge */}
              {challengeRow.status === 'accepted' && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  type="button"
                  onClick={() => setPhase('complete')}
                  className="mt-4 w-full py-4 rounded-full text-white font-bold text-lg transition"
                  style={{ backgroundColor: 'var(--color-brand-secondary)' }}
                  data-testid="challenge-done-btn"
                  data-tts="Brilliant! Tap to finish."
                >
                  Brilliant! +{CHALLENGE_XP} XP — Finish ✓
                </motion.button>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Phase: complete */}
        {phase === 'complete' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-lg mx-auto text-center py-4"
            data-testid="free-practice-complete"
          >
            <div className="text-5xl mb-2" aria-hidden="true">🌟</div>
            <h2
              className="text-2xl font-bold mb-1"
              style={{ color: 'var(--color-brand-primary)' }}
              data-tts="Free practice done! Great work!"
            >
              Free practice done!
            </h2>
            <p className="text-base mb-6" style={{ color: 'var(--color-text-muted)' }}>
              You wrote {acceptedCount} sentence{acceptedCount !== 1 ? 's' : ''} about <strong>{subjectNoun}</strong>.
            </p>

            {/* XP breakdown */}
            <div className="flex justify-center gap-4 mb-6">
              <div
                className="flex flex-col items-center px-5 py-4 rounded-2xl"
                style={{ backgroundColor: 'var(--color-xp-light)', border: '2px solid var(--color-xp)' }}
                data-testid="xp-display"
                data-tts={`+${totalXp} XP earned`}
              >
                <span className="text-2xl font-bold" style={{ color: 'var(--color-xp)' }}>+{totalXp}</span>
                <span className="text-xs font-semibold" style={{ color: 'var(--color-xp)' }}>XP</span>
                <span className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {acceptedCount} × {XP_PER_SENTENCE}
                  {challengeXp > 0 ? ` + ${challengeXp} bonus` : ''}
                </span>
              </div>
            </div>

            {/* Sentence list */}
            <div
              className="mb-6 text-left rounded-2xl overflow-hidden"
              style={{ border: '2px solid var(--color-border)' }}
            >
              <div
                className="px-4 py-2 text-xs font-bold uppercase tracking-wide"
                style={{ backgroundColor: 'var(--color-brand-primary-light)', color: 'var(--color-brand-primary)' }}
              >
                Your sentences
              </div>
              {completedRows.filter((r) => r.status === 'accepted').map((row) => (
                <div
                  key={row.level}
                  className="flex items-start gap-3 px-4 py-3 border-b last:border-b-0"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <span
                    className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white mt-0.5"
                    style={{ backgroundColor: 'var(--color-success)' }}
                  >
                    L{row.level}
                  </span>
                  <p className="text-sm flex-1" style={{ color: 'var(--color-text)' }} data-tts={row.sentence}>
                    {row.sentence}
                  </p>
                </div>
              ))}
              {challengeRow?.status === 'accepted' && (
                <div
                  className="flex items-start gap-3 px-4 py-3"
                  style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-gold-light)' }}
                >
                  <span
                    className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white mt-0.5"
                    style={{ backgroundColor: 'var(--color-gold)' }}
                  >
                    ⭐
                  </span>
                  <p className="text-sm flex-1" style={{ color: 'var(--color-text)' }} data-tts={challengeRow.sentence}>
                    {challengeRow.sentence}
                    <span className="ml-2 text-xs font-bold" style={{ color: 'var(--color-gold-dark)' }}>
                      +{CHALLENGE_XP} XP bonus
                    </span>
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSaveAndDone}
              disabled={saving}
              data-testid="done-btn"
              data-tts="Done"
              className="w-full py-4 rounded-full text-white font-bold text-lg transition disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-brand-primary)' }}
            >
              {saving ? 'Saving…' : 'Done ✓'}
            </button>
          </motion.div>
        )}

      </div>
    </div>
  )
}

export default FreePracticePage
