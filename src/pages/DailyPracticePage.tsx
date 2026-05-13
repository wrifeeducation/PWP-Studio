/**
 * PWP Daily Chain Practice — Daily Practice Page
 *
 * Route: /daily-practice
 *
 * Flow:
 *   1. SubjectPicker — pupil chooses today's subject noun
 *   2. ChainBuilder  — pupil works through L1→Ln, one sentence per level
 *   3. SessionComplete — celebration screen, saves session to Supabase
 *
 * Session save targets:
 *   - pwp_chain_sessions (one row per pupil per day)
 *   - pwp_chain_sentences (one row per accepted sentence)
 *   - Mastery points: calculated server-side via mastery logic below
 *
 * Max 200 lines — heavy lifting is in ChainBuilder + SessionComplete.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SubjectPicker } from '../components/chain/SubjectPicker'
import { ChainBuilder } from '../components/chain/ChainBuilder'
import { getChainForLevel } from '../lib/chain/formulaDefinitions'
import { CompoundBuilder } from '../components/chain/CompoundBuilder'
import { SessionComplete } from '../components/chain/SessionComplete'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { insertLearningEvent } from '../lib/learningEvents'
import type { ChainRowState, ChainSessionSave, CompoundValidationResult } from '../types/index'

// ─── Mastery points calculation (mirrors server-side spec) ────────────────────

function calculateMasteryPoints(newFormulaAttempts: number, allFirstAttempt: boolean): number {
  const base = newFormulaAttempts === 1 ? 3 : newFormulaAttempts === 2 ? 1 : 0
  const bonus = allFirstAttempt ? 1 : 0
  return base + bonus
}

// ─── Page component ───────────────────────────────────────────────────────────

// CL9+ pupils get the compound builder between chaining and the complete screen
const COMPOUND_BUILDER_MIN_LEVEL = 9

type PagePhase = 'picking' | 'chaining' | 'compounding' | 'complete'

const DailyPracticePage: React.FC = () => {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const sessionStartRef = useRef<number>(Date.now())

  const [phase, setPhase] = useState<PagePhase>('picking')
  const [subjectNoun, setSubjectNoun] = useState('')
  const [completedRows, setCompletedRows] = useState<ChainRowState[]>([])
  const [compoundResult, setCompoundResult] = useState<CompoundValidationResult | null>(null)
  const [masterySignal, setMasterySignal] = useState(false)
  const [saving, setSaving] = useState(false)

  // ── Fetch pupil's current chain level ───────────────────────────────────────
  const pupilId = user?.id ?? null

  // profiles.class_id is null for pupils (set on teacher profiles only).
  // Fall back to class_members to find the pupil's class.
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
      if (!pupilId) return null
      // Home learners have no classId — filter by IS NULL; school pupils filter by the specific class.
      const q = supabase
        .from('pwp_pupil_levels')
        .select('current_level, mastery_points')
        .eq('pupil_id', pupilId)
      const { data, error } = await (classId ? q.eq('class_id', classId) : q.is('class_id', null)).maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!pupilId, // home learners have no classId — enable as soon as we have pupilId
  })

  // ── Fetch streak ─────────────────────────────────────────────────────────────
  const { data: streakData } = useQuery({
    queryKey: ['streak', pupilId],
    queryFn: async () => {
      if (!pupilId) return null
      const { data, error } = await supabase
        .from('streaks')
        .select('current_streak')
        .eq('pupil_id', pupilId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!pupilId,
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

  const currentLevel = levelData?.current_level ?? 1
  const currentStreak = (streakData?.current_streak ?? 0) + 1 // +1 for today

  // How many sentences this pupil writes per session
  const sentenceCount = useMemo(() => getChainForLevel(currentLevel).length, [currentLevel])

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleSubjectConfirm = useCallback(() => {
    if (subjectNoun.trim().length >= 2) {
      sessionStartRef.current = Date.now()
      setPhase('chaining')
    }
  }, [subjectNoun])

  const handleChainComplete = useCallback(
    async (payload: { rows: ChainRowState[]; totalAttempts: number; newFormulaAttempts: number }) => {
      setCompletedRows(payload.rows)

      // Check if mastery signal fires
      const allFirstAttempt = payload.rows.every((r) => r.attempts === 0)
      const points = calculateMasteryPoints(payload.newFormulaAttempts, allFirstAttempt)
      const existingPoints = levelData?.mastery_points ?? 0
      const newTotal = existingPoints + points
      setMasterySignal(newTotal >= 12)

      // CL9+ pupils extend their anchor sentence; others skip straight to complete
      setPhase(currentLevel >= COMPOUND_BUILDER_MIN_LEVEL ? 'compounding' : 'complete')
    },
    [levelData, currentLevel],
  )

  const handleCompoundAccepted = useCallback((result: CompoundValidationResult) => {
    setCompoundResult(result)
    setPhase('complete')
  }, [])

  const handleCompoundSkip = useCallback(() => {
    setCompoundResult(null)
    setPhase('complete')
  }, [])

  const handleSaveAndDone = useCallback(async () => {
    if (!pupilId) {
      navigate('/dashboard')
      return
    }
    // classId is null for home learners — this is allowed throughout

    setSaving(true)
    try {
      const durationSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000)
      const today = new Date().toISOString().split('T')[0]
      const allFirstAttempt = completedRows.every((r) => r.attempts === 0)
      const lastRow = completedRows[completedRows.length - 1]
      const newFormulaAttempts = (lastRow?.attempts ?? 0) + 1
      const totalAttempts = completedRows.reduce((sum, r) => sum + r.attempts + 1, 0)
      const masteryPoints = calculateMasteryPoints(newFormulaAttempts, allFirstAttempt)

      const sessionPayload: ChainSessionSave = {
        pupil_id: pupilId,
        class_id: classId ?? '',
        session_date: today,
        subject_noun: subjectNoun,
        level_reached: currentLevel,
        chain_complete: true,
        total_attempts: totalAttempts,
        new_formula_attempts: newFormulaAttempts,
        duration_seconds: durationSeconds,
        xp_earned: 25,
      }

      // Insert chain session
      const { data: sessionRow, error: sessionErr } = await supabase
        .from('pwp_chain_sessions')
        .insert(sessionPayload)
        .select('id')
        .single()
      if (sessionErr) throw sessionErr

      // Insert individual sentences
      const sentences = completedRows
        .filter((r) => r.status === 'accepted')
        .map((r) => ({
          session_id: sessionRow.id,
          formula_level: r.level,
          sentence: r.sentence,
          attempt_number: r.attempts + 1,
          accepted: true,
          validation_result: { word_classes: [], errors: [] },
        }))

      if (sentences.length > 0) {
        const { error: sentErr } = await supabase
          .from('pwp_chain_sentences')
          .insert(sentences)
        if (sentErr) throw sentErr
      }

      // Upsert pupil level + mastery points.
      // School pupils: use onConflict so the partial index (pupil_id, class_id WHERE class_id IS NOT NULL) handles it.
      // Home learners (classId=null): Postgres onConflict can't match NULL columns, so we SELECT then UPDATE/INSERT.
      const newMasteryTotal = Math.min((levelData?.mastery_points ?? 0) + masteryPoints, 99)
      const levelPayload = {
        current_level: currentLevel,
        mastery_points: newMasteryTotal,
        mastery_signal: newMasteryTotal >= 12,
        updated_at: new Date().toISOString(),
      }

      if (classId) {
        // School pupil
        await supabase.from('pwp_pupil_levels').upsert(
          { pupil_id: pupilId, class_id: classId, ...levelPayload },
          { onConflict: 'pupil_id,class_id' },
        )
      } else {
        // Home learner — manual upsert because NULL conflicts don't work with onConflict
        const { data: existing } = await supabase
          .from('pwp_pupil_levels')
          .select('id')
          .eq('pupil_id', pupilId)
          .is('class_id', null)
          .maybeSingle()

        if (existing) {
          await supabase.from('pwp_pupil_levels').update(levelPayload).eq('id', existing.id)
        } else {
          await supabase.from('pwp_pupil_levels').insert({ pupil_id: pupilId, class_id: null, ...levelPayload })
        }
      }

      // Save compound session (if pupil attempted / accepted)
      const lastSentence = completedRows[completedRows.length - 1]?.sentence ?? ''
      if (currentLevel >= COMPOUND_BUILDER_MIN_LEVEL && lastSentence) {
        const { error: compoundErr } = await supabase.from('pwp_compound_sessions').insert({
          pupil_id: pupilId,
          class_id: classId,
          session_date: today,
          anchor_sentence: lastSentence,
          conjunction: compoundResult?.conjunction ?? '',
          second_clause: '',
          conjunction_type: compoundResult?.conjunctionType ?? null,
          full_compound_sentence: compoundResult?.compoundSentence ?? '',
          accepted: compoundResult?.accepted ?? false,
          attempts: 0,
          xp_earned: compoundResult?.accepted ? 5 : 0,
        })
        if (compoundErr) console.warn('Compound session save failed (non-fatal):', compoundErr)
      }

      // Report chain session to wrife.co.uk teacher dashboard via learning_events
      void insertLearningEvent(pupilId, classId, 'chain_session_completed', {
        level: currentLevel,
        sentences_built: completedRows.filter((r) => r.status === 'accepted').length,
        streak_day: currentStreak,
      })

      // Navigate to Connect Grid with the anchor sentence
      navigate('/connect-grid', { state: { anchorSentence: lastSentence, classId } })
    } catch (err) {
      console.error('Failed to save chain session:', err)
      // Navigate to Connect Grid anyway — don't strand the pupil
      const lastSentenceFallback = completedRows[completedRows.length - 1]?.sentence ?? ''
      navigate('/connect-grid', { state: { anchorSentence: lastSentenceFallback, classId } })
    } finally {
      setSaving(false)
    }
  }, [pupilId, classId, subjectNoun, currentLevel, completedRows, compoundResult, levelData, navigate])

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      {/* Branded nav bar */}
      <div
        data-testid="practice-nav-bar"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: 'linear-gradient(135deg, #7C6FF7 0%, var(--color-brand-primary) 100%)',
          boxShadow: '0 2px 12px rgba(108,92,231,0.35)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        {phase !== 'complete' && (
          <button
            type="button"
            onClick={() => {
              if (phase === 'picking') navigate('/dashboard')
              else if (phase === 'compounding') setPhase('chaining')
              else setPhase('picking')
            }}
            data-testid="back-btn"
            style={{
              background: 'rgba(255,255,255,0.18)',
              border: '1.5px solid rgba(255,255,255,0.35)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              padding: '6px 12px',
              cursor: 'pointer',
              minHeight: '36px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            ← {phase === 'picking' ? 'Map' : phase === 'compounding' ? 'Back to chain' : 'Change subject'}
          </button>
        )}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}
            data-tts="Daily Writing Practice">
            Daily Practice ✏️
          </div>
          <div
            style={{ fontSize: '12px', color: 'rgba(255,255,255,0.80)', fontWeight: 600, marginTop: 2 }}
            data-tts={`Level ${currentLevel} — ${sentenceCount} sentence${sentenceCount !== 1 ? 's' : ''} today`}
            data-testid="level-indicator"
          >
            Level {currentLevel} · {sentenceCount} sentence{sentenceCount !== 1 ? 's' : ''}
          </div>
        </div>
        {currentStreak > 0 && (
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', flexShrink: 0 }}>
            🔥 {currentStreak}
          </span>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {phase === 'picking' && (
          <SubjectPicker
            value={subjectNoun}
            onChange={setSubjectNoun}
            onConfirm={handleSubjectConfirm}
            weeklyTheme={themeData?.theme ?? null}
            themeSuggestions={(themeData?.suggestions as unknown as string[]) ?? []}
          />
        )}

        {phase === 'chaining' && (
          <ChainBuilder
            subjectNoun={subjectNoun}
            currentLevel={currentLevel}
            onChainComplete={handleChainComplete}
          />
        )}

        {phase === 'compounding' && (
          <CompoundBuilder
            anchorSentence={completedRows[completedRows.length - 1]?.sentence ?? ''}
            allowedTypes={['coordinating']}
            strictPunctuation={false}
            onAccepted={handleCompoundAccepted}
            onSkip={handleCompoundSkip}
          />
        )}

        {phase === 'complete' && (
          <SessionComplete
            subjectNoun={subjectNoun}
            rows={completedRows}
            currentStreak={currentStreak}
            masterySignal={masterySignal}
            onDone={handleSaveAndDone}
            saving={saving}
          />
        )}
      </div>
    </div>
  )
}

export default DailyPracticePage
