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

import React, { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SubjectPicker } from '../components/chain/SubjectPicker'
import { ChainBuilder } from '../components/chain/ChainBuilder'
import { SessionComplete } from '../components/chain/SessionComplete'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { ChainRowState, ChainSessionSave } from '../types/index'

// ─── Mastery points calculation (mirrors server-side spec) ────────────────────

function calculateMasteryPoints(newFormulaAttempts: number, allFirstAttempt: boolean): number {
  const base = newFormulaAttempts === 1 ? 3 : newFormulaAttempts === 2 ? 1 : 0
  const bonus = allFirstAttempt ? 1 : 0
  return base + bonus
}

// ─── Page component ───────────────────────────────────────────────────────────

type PagePhase = 'picking' | 'chaining' | 'complete'

const DailyPracticePage: React.FC = () => {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const sessionStartRef = useRef<number>(Date.now())

  const [phase, setPhase] = useState<PagePhase>('picking')
  const [subjectNoun, setSubjectNoun] = useState('')
  const [completedRows, setCompletedRows] = useState<ChainRowState[]>([])
  const [masterySignal, setMasterySignal] = useState(false)
  const [saving, setSaving] = useState(false)

  // ── Fetch pupil's current chain level ───────────────────────────────────────
  const pupilId = user?.id ?? null
  const classId = profile?.class_id ?? null

  const { data: levelData } = useQuery({
    queryKey: ['pwp_pupil_level', pupilId, classId],
    queryFn: async () => {
      if (!pupilId || !classId) return null
      const { data, error } = await supabase
        .from('pwp_pupil_levels')
        .select('current_level, mastery_points')
        .eq('pupil_id', pupilId)
        .eq('class_id', classId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!pupilId && !!classId,
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

      setPhase('complete')
    },
    [levelData],
  )

  const handleSaveAndDone = useCallback(async () => {
    if (!pupilId || !classId) {
      navigate('/dashboard')
      return
    }

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
        class_id: classId,
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

      // Upsert pupil level + mastery points
      const newMasteryTotal = Math.min((levelData?.mastery_points ?? 0) + masteryPoints, 99)
      await supabase.from('pwp_pupil_levels').upsert(
        {
          pupil_id: pupilId,
          class_id: classId,
          current_level: currentLevel,
          mastery_points: newMasteryTotal,
          mastery_signal: newMasteryTotal >= 12,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'pupil_id,class_id' },
      )

      navigate('/dashboard')
    } catch (err) {
      console.error('Failed to save chain session:', err)
      // Navigate anyway — don't strand the pupil
      navigate('/dashboard')
    } finally {
      setSaving(false)
    }
  }, [pupilId, classId, subjectNoun, currentLevel, completedRows, levelData, navigate])

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Back link */}
        {phase !== 'complete' && (
          <button
            type="button"
            onClick={() => (phase === 'picking' ? navigate('/dashboard') : setPhase('picking'))}
            className="mb-6 text-sm font-semibold flex items-center gap-1 hover:opacity-70 transition"
            style={{ color: 'var(--color-brand-primary)' }}
            data-testid="back-btn"
          >
            ← {phase === 'picking' ? 'Back to dashboard' : 'Change subject'}
          </button>
        )}

        {phase === 'picking' && (
          <SubjectPicker
            value={subjectNoun}
            onChange={setSubjectNoun}
            onConfirm={handleSubjectConfirm}
            weeklyTheme={themeData?.theme ?? null}
            themeSuggestions={themeData?.suggestions ?? []}
          />
        )}

        {phase === 'chaining' && (
          <ChainBuilder
            subjectNoun={subjectNoun}
            currentLevel={currentLevel}
            onChainComplete={handleChainComplete}
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
