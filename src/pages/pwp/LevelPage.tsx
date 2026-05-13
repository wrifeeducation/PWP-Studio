// PWP Level / Step screen
// Phases 7–11: start screen, step practice, feedback, word bank (A/B added in later phases)

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { assessStep, assessParagraphClose } from '@/lib/pwp/pwpApi'
import { ParagraphBuilder } from '@/components/pwp/paragraph/ParagraphBuilder'
import type { ParagraphParts } from '@/components/pwp/paragraph/ParagraphBuilder'
import type { PwpLevel, PwpStep, PwpWordBankConfig } from '@/types/pwp'
import { WordBankPhaseA } from '@/components/pwp/wordbank/WordBankPhaseA'
import { WordBankPhaseB } from '@/components/pwp/wordbank/WordBankPhaseB'
import { GuidancePanel } from '@/components/pwp/guidance/GuidancePanel'
import { useTTS } from '@/hooks/useTTS'
import { usePWPAudioPlayer } from '@/hooks/usePWPAudio'
import { useSettingsStore } from '@/stores/settingsStore'
import { XPFloater } from '@/components/pwp/gamification/XPFloater'
import { PWPBadgeToast } from '@/components/pwp/gamification/PWPBadgeToast'
import { usePWPBadgeCheck } from '@/hooks/usePWPBadgeCheck'
import type { BadgeInfo } from '@/hooks/usePWPBadgeCheck'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const MAX_LIVES   = 3
const XP_FIRST    = 10
const XP_RETRY    = 5
const XP_PARA     = 15

// ─── LEVEL TITLE ─────────────────────────────────────────────────────────────

function getLevelTitle(levelNumber: number): string {
  if (levelNumber <= 3)  return 'Apprentice Writer'
  if (levelNumber <= 8)  return 'Sentence Builder'
  if (levelNumber <= 14) return 'Phrase Crafter'
  if (levelNumber <= 19) return 'Paragraph Writer'
  if (levelNumber <= 25) return 'Style Composer'
  if (levelNumber <= 30) return 'Master Crafter'
  return 'Formula Master'
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Screen = 'loading' | 'start' | 'step' | 'done'
type FeedbackState = 'idle' | 'correct_first' | 'correct_retry' | 'needs_revision' | 'assessing'

interface FeedbackData {
  state: Exclude<FeedbackState, 'idle' | 'assessing'>
  message: string
  xpEarned: number
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getPupilId(): string | null {
  const { user } = useAuthStore.getState()
  if (user?.id) return user.id
  try {
    const raw = localStorage.getItem('pupilSession')
    if (raw) { const p = JSON.parse(raw); return p.pupilId ?? p.id ?? null }
  } catch { /* ignore */ }
  return null
}

/** Very lightweight client-side check (fallback when Edge Function is down) */
function clientCheck(submitted: string, target: string): boolean {
  const norm = (s: string) =>
    s.trim()
     .replace(/[.!?…]+$/, '')
     .replace(/\s+/g, ' ')
     .toLowerCase()
  return norm(submitted) === norm(target)
}

function stepTypeBadge(st: string): { label: string; bg: string; fg: string } {
  if (st === 'new_element') return { label: '★ NEW', bg: '#fef0e0', fg: '#d4700a' }
  if (st === 'consolidation') return { label: 'Review', bg: '#f0ecff', fg: '#6C5CE7' }
  return { label: st, bg: '#f0f0f0', fg: '#666' }
}

// ─── LEVEL START SCREEN ───────────────────────────────────────────────────────

interface StartScreenProps {
  level: PwpLevel
  steps: PwpStep[]
  totalXp: number
  streakDays: number
  onStart: () => void
  onBack: () => void
}

function LevelStartScreen({ level, steps, totalXp, streakDays, onStart, onBack }: StartScreenProps) {
  const isParagraph = level.is_paragraph_phase

  return (
    <main
      id="pwp-level-content"
      className="min-h-screen bg-[#FDF8EE] flex items-center justify-center p-4"
      aria-label={`Level ${level.level_number}: ${level.title}`}
    >
      <div
        className="w-full max-w-[700px] rounded-[20px] overflow-hidden"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
      >
        {/* Header bar */}
        <div
          className="px-7 py-5 flex items-center justify-between"
          style={{ background: isParagraph ? '#00b894' : '#6C5CE7' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-white/70 text-[13px] hover:text-white transition-colors"
              aria-label="Back to your learning path"
              data-tts="Back to your path"
            >
              <span aria-hidden="true">←</span> Path
            </button>
            <div>
              <div className="text-white font-extrabold text-[18px]">
                Level {level.level_number} — {level.title}
              </div>
              <div className="text-white/70 text-[12px] mt-[1px]">
                {steps.length} step{steps.length !== 1 ? 's' : ''} to complete
              </div>
            </div>
          </div>
          <div className="flex gap-[10px]">
            {[
              { icon: '🔥', val: `${streakDays}` },
              { icon: '⭐', val: totalXp.toLocaleString() },
            ].map(({ icon, val }) => (
              <div
                key={icon}
                className="bg-white/15 rounded-[10px] px-3 py-[6px] flex items-center gap-[5px] text-white text-[13px] font-semibold"
              >
                {icon} {val}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="bg-[#FDF8EE] p-7 flex gap-6">
          {/* Mascot column */}
          <div className="flex flex-col items-center gap-0 w-[160px] flex-shrink-0">
            <div
              className="bg-white rounded-2xl p-4 border-2 border-[#e8e0ff] mb-3"
              style={{
                boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
                position: 'relative',
              }}
              data-tts={`Welcome! Today you'll practise: ${level.new_element}`}
            >
              <p className="text-[13px] text-[#2D3436] leading-[1.5]">
                {isParagraph
                  ? <>Time to build a <strong className="text-[#00b894]">full paragraph</strong> using Lead → Support → Close! 📝</>
                  : <>Today you'll practise <strong className="text-[#6C5CE7]">{level.new_element}</strong>. 🎯</>
                }
              </p>
              {/* Tail */}
              <div
                style={{
                  position: 'absolute', bottom: -10, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0, height: 0,
                  borderLeft: '10px solid transparent',
                  borderRight: '10px solid transparent',
                  borderTop: '10px solid #e8e0ff',
                }}
              />
            </div>
            <div className="text-[64px] mt-1">✏️</div>
          </div>

          {/* Main column */}
          <div className="flex-1 min-w-0">
            {/* New element focus card */}
            <div
              className="bg-white rounded-2xl px-5 py-4 mb-5 border-l-[5px]"
              style={{
                borderColor: isParagraph ? '#00b894' : '#6C5CE7',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              }}
            >
              <div
                className="text-[10px] font-bold uppercase tracking-[1px] mb-[3px]"
                style={{ color: isParagraph ? '#00b894' : '#6C5CE7' }}
              >
                New element today
              </div>
              <div className="text-[16px] font-bold text-[#2D3436]">{level.new_element}</div>
            </div>

            {/* Step chain list */}
            <div
              className="text-[11px] font-bold text-[#aaa] uppercase tracking-[1px] mb-3"
            >
              Today's formula chain — {steps.length} steps
            </div>
            <div className="flex flex-col gap-[6px] max-h-[240px] overflow-y-auto pr-1">
              {steps.map(step => {
                const badge = stepTypeBadge(step.step_type)
                const isNew = step.step_type === 'new_element'
                return (
                  <div
                    key={step.id}
                    className="bg-white rounded-[10px] px-4 py-[10px] flex items-center gap-3"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                      style={{
                        background: isNew ? '#6C5CE7' : '#f0ecff',
                        color: isNew ? '#fff' : '#6C5CE7',
                      }}
                    >
                      {step.step_number}
                    </div>
                    <div className="text-[12px] text-[#2D3436] flex-1 truncate">
                      {step.formula}
                    </div>
                    <span
                      className="text-[10px] font-semibold px-2 py-[2px] rounded-[8px] whitespace-nowrap flex-shrink-0"
                      style={{ background: badge.bg, color: badge.fg }}
                    >
                      {badge.label}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Start button */}
            <motion.button
              className="w-full mt-5 py-4 rounded-2xl text-white font-extrabold text-[17px]"
              style={{
                background: isParagraph
                  ? 'linear-gradient(135deg, #00b894, #00cec9)'
                  : 'linear-gradient(135deg, #F5A623, #F5C500)',
                boxShadow: isParagraph
                  ? '0 4px 16px rgba(0,184,148,0.45)'
                  : '0 4px 16px rgba(245,166,35,0.45)',
              }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStart}
              data-tts={`Start Level ${level.level_number}`}
            >
              Start Level {level.level_number} →
            </motion.button>
          </div>
        </div>
      </div>
    </main>
  )
}

// ─── IN-LEVEL STEP SCREEN ─────────────────────────────────────────────────────

interface StepScreenProps {
  level: PwpLevel
  steps: PwpStep[]
  stepIndex: number
  lives: number
  sessionXp: number
  feedback: FeedbackData | null
  isAssessing: boolean
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onContinue: () => void
  onBack: () => void
  onHintUsed: (hintLevel: number) => void
  onPartsChange: (parts: ParagraphParts) => void
  onSpeak: (text: string) => void
  xpFloaterKey: number     // increment to trigger a new floater
  xpFloaterAmount: number  // amount shown in the last floater
}

function InLevelScreen({
  level, steps, stepIndex, lives, sessionXp,
  feedback, isAssessing, value, onChange, onSubmit, onContinue, onBack, onHintUsed, onPartsChange,
  onSpeak, xpFloaterKey, xpFloaterAmount,
}: StepScreenProps) {
  const step    = steps[stepIndex]
  const total   = steps.length
  const isParagraph = level.is_paragraph_phase
  const { ttsEnabled, setTtsEnabled } = useSettingsStore()

  // Resolve word_bank_config — Supabase may return it as array or object
  const wbConfig: PwpWordBankConfig | null = (() => {
    const raw = (step as any).word_bank_config  // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!raw) return null
    return Array.isArray(raw) ? (raw[0] ?? null) : raw
  })()

  // Step-level phase override takes priority over level-level setting
  const stepPhase: string | null = wbConfig?.phase_override ?? level.word_bank_phase ?? null
  const isWordBankPhase   = stepPhase === 'A' || stepPhase === 'B'
  const isParagraphStep   = step.is_paragraph_step === true

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const ACCENT = isParagraph ? '#00b894' : '#6C5CE7'

  useEffect(() => {
    if (!feedback) textareaRef.current?.focus()
  }, [stepIndex, feedback])

  const progressPct = Math.round((stepIndex / total) * 100)
  const badge = stepTypeBadge(step.step_type)

  return (
    <main
      id="pwp-level-content"
      className="min-h-screen bg-[#FDF8EE] flex flex-col items-start justify-start pt-6 px-4 pb-8 md:items-center md:pt-10"
      aria-label={`Level ${level.level_number} — Step ${stepIndex + 1} of ${total}`}
    >
      <div
        className="w-full max-w-[720px] md:max-w-[860px] xl:max-w-[1040px] rounded-[20px] overflow-hidden"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
      >
        {/* Header bar */}
        <div
          className="px-6 py-[14px] flex items-center gap-4"
          style={{ background: ACCENT }}
        >
          {/* Lives */}
          <div className="flex gap-1 flex-shrink-0">
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <span key={i} className="text-[18px]" style={{ opacity: i < lives ? 1 : 0.25 }}>
                ❤️
              </span>
            ))}
          </div>

          {/* Progress bar */}
          <div className="flex-1">
            <div className="flex justify-between text-white/60 text-[10px] mb-1">
              <span>Step {stepIndex + 1} of {total}</span>
              <span>Level {level.level_number}</span>
            </div>
            <div className="bg-white/20 rounded h-2">
              <motion.div
                className="h-2 rounded"
                style={{ background: '#F5C500' }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          {/* XP counter */}
          <div
            className="bg-white/15 text-[#F5C500] rounded-[8px] px-[10px] py-[5px] text-[12px] font-bold flex-shrink-0"
            data-tts={`${sessionXp} XP earned this level`}
          >
            +{sessionXp} XP
          </div>

          {/* TTS toggle */}
          <button
            className="bg-white/15 rounded-[8px] w-[30px] h-[30px] flex items-center justify-center text-[15px] flex-shrink-0 transition-opacity"
            style={{ opacity: ttsEnabled ? 1 : 0.45 }}
            onClick={() => {
              const next = !ttsEnabled
              setTtsEnabled(next)
              if (next) onSpeak(step.formula)
            }}
            aria-label={ttsEnabled ? 'Mute read-aloud' : 'Enable read-aloud'}
            aria-pressed={ttsEnabled}
            data-tts={ttsEnabled ? 'Turn off read aloud' : 'Turn on read aloud'}
          >
            <span aria-hidden="true">{ttsEnabled ? '🔊' : '🔇'}</span>
          </button>
        </div>

        {/* Body */}
        <div className="bg-[#FDF8EE] px-7 py-6">
          {/* Step indicator dots */}
          <div className="flex gap-1 mb-5 justify-center">
            {steps.map((_, i) => (
              <div
                key={i}
                className="h-[6px] rounded-sm transition-all duration-300"
                style={{
                  width: i === stepIndex ? 28 : 24,
                  background:
                    i < stepIndex  ? ACCENT :
                    i === stepIndex ? '#F5A623' :
                    '#e0d8ff',
                }}
              />
            ))}
          </div>

          {/* Formula card */}
          <div
            className="bg-white rounded-2xl px-5 py-4 mb-4 border-l-[6px]"
            style={{ borderColor: ACCENT, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div
                  className="text-[10px] font-bold uppercase tracking-[1px] mb-1"
                  style={{ color: ACCENT }}
                >
                  Formula
                </div>
                <div className="text-[15px] font-bold text-[#2D3436] leading-[1.4]" data-tts={step.formula}>
                  {step.formula}
                </div>
                <span
                  className="inline-block mt-2 px-[10px] py-[2px] rounded-[10px] text-[10px] font-bold"
                  style={{ background: badge.bg, color: badge.fg }}
                >
                  {badge.label}
                </span>
              </div>
              {/* Re-read formula button */}
              <button
                className="flex-shrink-0 w-[32px] h-[32px] rounded-[8px] flex items-center justify-center text-[16px] transition-colors mt-[2px]"
                style={{ background: `${ACCENT}18`, color: ACCENT }}
                onClick={() => onSpeak(step.formula)}
                aria-label="Hear the formula read aloud"
                data-tts="Read formula aloud"
              >
                <span aria-hidden="true">🔊</span>
              </button>
            </div>
          </div>

          {/* Example sentence — hidden when empty (L7-9 have no example) */}
          {step.example && (
            <div className="bg-[#f8f5ff] rounded-[10px] px-4 py-3 mb-4 flex items-center gap-2">
              <span
                className="text-[11px] font-bold flex-shrink-0"
                style={{ color: ACCENT }}
              >
                Example:
              </span>
              <span className="text-[14px] text-[#2D3436] italic" data-tts={step.example}>
                {step.example}
              </span>
            </div>
          )}

          {/* Subject prompt */}
          <div className="mb-3">
            <div className="text-[14px] text-[#2D3436] font-semibold mb-2">
              Write your sentence using this subject:
            </div>
            <div
              className="inline-block bg-[#fff3cd] rounded-[8px] px-3 py-2 text-[13px] font-semibold text-[#856404]"
              data-tts={`Subject: ${step.subject_prompt}`}
            >
              {step.subject_prompt}
            </div>
          </div>

          {/* Guidance panel — hidden while feedback is showing */}
          {!feedback && (
            <GuidancePanel
              key={`guidance-${stepIndex}`}
              step={step}
              onHintUsed={onHintUsed}
              disabled={isAssessing}
            />
          )}

          {/* ── Paragraph Builder (L29–35 paragraph steps) ── */}
          {isParagraphStep && !feedback && (
            <ParagraphBuilder
              key={`para-${stepIndex}`}
              step={step}
              onChange={onChange}
              onPartsChange={onPartsChange}
              disabled={isAssessing}
            />
          )}

          {/* ── Word Bank Phase A — Build Mode (L1–6) ── */}
          {stepPhase === 'A' && wbConfig && !feedback && (
            <WordBankPhaseA
              key={`wba-${stepIndex}`}
              bankWords={wbConfig.bank_words ?? []}
              distractors={wbConfig.distractors ?? null}
              subjectPrompt={step.subject_prompt}
              onChange={onChange}
              disabled={isAssessing}
            />
          )}

          {/* ── Word Bank Phase B — Gap Mode (L7–19) ── */}
          {stepPhase === 'B' && wbConfig && !feedback && (
            <WordBankPhaseB
              key={`wbb-${stepIndex}`}
              bankWords={wbConfig.bank_words ?? []}
              gapSlots={wbConfig.gap_slots ?? []}
              targetSentence={step.target_sentence}
              onChange={onChange}
              disabled={isAssessing}
            />
          )}

          {/* ── Text input — shown for free-write phases (C/D) and during feedback for all modes ── */}
          {((!isWordBankPhase && !isParagraphStep) || !!feedback) && (
            <textarea
              ref={textareaRef}
              className="w-full border-2 rounded-xl px-4 py-3 text-[16px] text-[#2D3436] outline-none font-[inherit] resize-none transition-colors bg-white"
              style={{
                borderColor: feedback
                  ? (feedback.state.startsWith('correct') ? '#00b894' : '#F5A623')
                  : '#e0d8ff',
              }}
              placeholder="Type your sentence here…"
              value={value}
              onChange={e => onChange(e.target.value)}
              onFocus={e => { if (!feedback) e.target.style.borderColor = ACCENT }}
              onBlur={e => { if (!feedback) e.target.style.borderColor = '#e0d8ff' }}
              rows={3}
              disabled={!!feedback || isAssessing}
              readOnly={isWordBankPhase && !!feedback}
              data-tts={isWordBankPhase && feedback ? 'Your assembled sentence' : 'Type your sentence'}
            />
          )}

          {/* Feedback overlay — role="status" announces result to screen readers */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                className="mt-3 rounded-2xl px-5 py-4 flex items-start gap-3"
                style={{
                  background: feedback.state.startsWith('correct') ? '#e0faf4' : '#fff8e6',
                  border: `2px solid ${feedback.state.startsWith('correct') ? '#00b894' : '#F5A623'}`,
                }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <span className="text-[26px] flex-shrink-0" aria-hidden="true">
                  {feedback.state.startsWith('correct') ? '✅' : '💡'}
                </span>
                <div className="flex-1">
                  <div
                    className="text-[15px] font-extrabold mb-1"
                    style={{ color: feedback.state.startsWith('correct') ? '#00b894' : '#d4700a' }}
                  >
                    {feedback.state === 'correct_first' && 'Excellent! First time! 🌟'}
                    {feedback.state === 'correct_retry' && 'Well done — you got there! 🎉'}
                    {feedback.state === 'needs_revision' && 'Almost there — try again!'}
                  </div>
                  <div className="text-[13px] text-[#2D3436] leading-[1.5]">
                    {feedback.message}
                  </div>
                  {feedback.xpEarned > 0 && (
                    <span className="inline-block mt-2 bg-[#F5C500] text-[#854d0e] text-[12px] font-bold px-3 py-[3px] rounded-xl">
                      +{feedback.xpEarned} XP
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action buttons */}
          <div className="flex gap-3 mt-4 relative">
            {/* XP floater — positioned above the button row */}
            <XPFloater key={xpFloaterKey} amount={xpFloaterAmount} />
            <button
              className="flex-1 bg-white border-2 border-[#e0d8ff] rounded-xl py-3 text-[13px] font-semibold text-[#6C5CE7] flex items-center justify-center gap-2 hover:bg-[#f0ecff] transition-colors"
              onClick={onBack}
              data-tts="Back to path"
            >
              ← Path
            </button>

            {feedback ? (
              <motion.button
                className="flex-[2] rounded-xl py-3 text-white font-bold text-[15px]"
                style={{
                  background: feedback.state.startsWith('correct')
                    ? 'linear-gradient(135deg, #00b894, #00cec9)'
                    : 'linear-gradient(135deg, #F5A623, #F5C500)',
                  boxShadow: feedback.state.startsWith('correct')
                    ? '0 3px 12px rgba(0,184,148,0.4)'
                    : '0 3px 12px rgba(245,166,35,0.4)',
                }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={onContinue}
                data-tts={feedback.state.startsWith('correct') ? 'Continue to next step' : 'Try again'}
              >
                {feedback.state.startsWith('correct')
                  ? (stepIndex < steps.length - 1 ? 'Continue →' : 'Finish Level! 🎉')
                  : 'Try Again →'}
              </motion.button>
            ) : (
              <motion.button
                className="flex-[2] rounded-xl py-3 text-white font-bold text-[15px] disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #F5A623, #F5C500)',
                  boxShadow: '0 3px 12px rgba(245,166,35,0.4)',
                }}
                whileHover={!isAssessing && value.trim() ? { scale: 1.01 } : {}}
                whileTap={!isAssessing && value.trim() ? { scale: 0.98 } : {}}
                onClick={onSubmit}
                disabled={isAssessing || !value.trim()}
                data-tts="Submit your sentence"
              >
                {isAssessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                    Checking…
                  </span>
                ) : 'Submit ✓'}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

// ─── LEVEL COMPLETE SCREEN ────────────────────────────────────────────────────

interface DoneScreenProps {
  level: PwpLevel
  sessionXp: number
  newTitle: string | null  // non-null when the pupil just crossed a title boundary
  onContinue: () => void
}

function LevelCompleteScreen({ level, sessionXp, newTitle, onContinue }: DoneScreenProps) {
  const ACCENT = level.is_paragraph_phase ? '#00b894' : '#6C5CE7'
  const title  = getLevelTitle(level.level_number)

  return (
    <div className="min-h-screen bg-[#FDF8EE] flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-[480px] bg-white rounded-[24px] p-10 text-center"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      >
        <motion.div
          className="text-[72px] mb-4"
          animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          🏆
        </motion.div>

        <h2 className="text-[26px] font-extrabold text-[#2D3436] mb-2">
          Level {level.level_number} Complete!
        </h2>
        <p className="text-[#888] text-[15px] mb-3">
          {level.title} — great work!
        </p>

        {/* Level title chip */}
        <div className="flex justify-center mb-5">
          <span
            className="inline-flex items-center gap-[6px] px-3 py-[5px] rounded-[10px] text-[12px] font-bold"
            style={{ background: `${ACCENT}18`, color: ACCENT }}
            data-tts={`Your title: ${title}`}
          >
            ✨ {title}
          </span>
        </div>

        {/* New title unlock banner */}
        {newTitle && (
          <motion.div
            className="rounded-xl px-4 py-3 mb-4 text-[13px] font-semibold text-center"
            style={{ background: '#FFF3CD', border: '1.5px solid #F5C50050', color: '#856404' }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            data-tts={`New title unlocked: ${newTitle}`}
          >
            🎖️ New title unlocked: <strong>{newTitle}</strong>
          </motion.div>
        )}

        {/* XP earned */}
        <div
          className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl mb-8"
          style={{ background: `${ACCENT}18`, border: `2px solid ${ACCENT}40` }}
        >
          <span className="text-[32px]">⭐</span>
          <div className="text-left">
            <div className="text-[11px] font-bold text-[#888] uppercase tracking-wide">XP Earned</div>
            <div className="text-[28px] font-extrabold" style={{ color: ACCENT }}>
              +{sessionXp}
            </div>
          </div>
        </div>

        <motion.button
          className="w-full py-4 rounded-2xl text-white font-extrabold text-[17px]"
          style={{
            background: `linear-gradient(135deg, ${ACCENT}, ${level.is_paragraph_phase ? '#00cec9' : '#a29bf5'})`,
            boxShadow: `0 4px 20px ${ACCENT}55`,
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onContinue}
          data-tts="Back to your learning path"
        >
          Back to Your Path →
        </motion.button>
      </motion.div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function LevelPage() {
  const { levelId }    = useParams<{ levelId: string }>()
  const navigate       = useNavigate()
  useAuthStore()

  // ── Audio ─────────────────────────────────────────────────────────────────
  const { speak, stop: stopTts } = useTTS()
  const { play: playSfx }        = usePWPAudioPlayer()
  const { sfxEnabled }           = useSettingsStore()

  // ── Gamification ──────────────────────────────────────────────────────────
  const { checkAndAward }            = usePWPBadgeCheck()
  const [pendingBadge, setPendingBadge] = useState<BadgeInfo | null>(null)
  const [newTitle,     setNewTitle]     = useState<string | null>(null)
  const [xpFloaterKey, setXpFloaterKey] = useState(0)
  const [xpFloaterAmt, setXpFloaterAmt] = useState(0)

  const [screen,      setScreen]      = useState<Screen>('loading')
  const [level,       setLevel]       = useState<PwpLevel | null>(null)
  const [steps,       setSteps]       = useState<PwpStep[]>([])
  const [stepIndex,   setStepIndex]   = useState(0)
  const [lives,       setLives]       = useState(MAX_LIVES)
  const [sessionXp,   setSessionXp]   = useState(0)
  const [totalXp,     setTotalXp]     = useState(0)
  const [streakDays,  setStreakDays]   = useState(0)
  const [value,             setValue]             = useState('')
  const [attemptCount,      setAttemptCount]      = useState(0)
  const [hintsUsedThisStep, setHintsUsedThisStep] = useState(0)
  // Paragraph parts — kept in a ref so handleSubmit can read them synchronously
  const paragraphPartsRef = useRef<ParagraphParts | null>(null)
  const [feedback,          setFeedback]          = useState<FeedbackData | null>(null)
  const [isAssessing,       setIsAssessing]       = useState(false)
  const [loadError,         setLoadError]         = useState<string | null>(null)

  // ── Load level + steps ────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const id = Number(levelId)
      if (!id) { navigate('/dashboard'); return }

      try {
        // Load level
        const { data: lvl, error: lvlErr } = await supabase
          .from('pwp_levels')
          .select('*')
          .eq('id', id)
          .single()
        if (lvlErr || !lvl) throw new Error('Level not found')

        // Load steps with word bank config
        const { data: stepsData, error: stepsErr } = await supabase
          .from('pwp_steps')
          .select('*, word_bank_config:pwp_word_bank_config(id, step_id, bank_words, gap_slots, distractors, phase_override)')
          .eq('level_id', id)
          .order('sort_order')
        if (stepsErr) throw new Error('Could not load steps')

        // Load pupil progress for XP/streak display
        const pupilId = getPupilId()
        if (pupilId) {
          const { data: prog } = await supabase
            .from('formula_progress')
            .select('total_xp, streak_days, current_streak')
            .eq('pupil_id', pupilId)
            .maybeSingle()
          if (prog) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = prog as any
            setTotalXp(p.total_xp ?? 0)
            setStreakDays(p.streak_days ?? p.current_streak ?? 0)
          }
        }

        setLevel(lvl as unknown as PwpLevel)
        setSteps((stepsData ?? []) as unknown as PwpStep[])
        setScreen('start')
      } catch (err) {
        console.error('[LevelPage] load error:', err)
        setLoadError('Could not load this level. Please go back and try again.')
        setScreen('loading')
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId])

  // ── Submit handler ────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!level || !steps[stepIndex] || isAssessing) return
    const step = steps[stepIndex]
    const trimmed = value.trim()
    if (!trimmed) return

    setIsAssessing(true)
    setAttemptCount(a => a + 1)

    try {
      let passed: boolean
      let message: string

      if (step.is_paragraph_step && paragraphPartsRef.current) {
        // ── Paragraph assessment via assessParagraphClose ──────────────────
        const parts = paragraphPartsRef.current
        try {
          const result = await assessParagraphClose({
            leadSentence:     parts.lead,
            supportSentences: parts.supports.filter((s: string) => s.trim() !== ''),
            closeSentence:    parts.close,
            scaffoldMode:     true,
          })
          passed  = result.passed
          message = result.feedback
        } catch {
          // Fallback: structural check (all three parts non-empty)
          passed  = parts.lead.trim() !== ''
            && parts.supports.some((s: string) => s.trim() !== '')
            && parts.close.trim() !== ''
          message = passed
            ? 'Good paragraph structure — Lead, Support, and Close all present!'
            : 'Make sure you have a Lead sentence, at least one Support sentence, and a Close sentence.'
        }
      } else {
        // ── Regular sentence assessment ────────────────────────────────────
        try {
          const result = await assessStep({
            sentence:      trimmed,
            formulaLabel:  step.formula,
            elementCode:   String(step.id),
            subjectNoun:   step.subject_prompt,
            attemptNumber: attemptCount + 1,
          })
          passed  = result.passed
          message = result.feedback
        } catch {
          passed  = clientCheck(trimmed, step.target_sentence)
          message = passed
            ? 'Your sentence matches the formula perfectly!'
            : `Try to follow the formula: ${step.formula}. Example: ${step.example}`
        }
      }

      const isFirst = attemptCount === 0
      if (passed) {
        const baseXp    = isFirst ? XP_FIRST : XP_RETRY
        const hintCost  = Math.min(hintsUsedThisStep * 2, baseXp) // −2 XP per hint, min 0
        const xp        = baseXp - hintCost
        const extra     = step.is_paragraph_step ? XP_PARA : 0
        const earned    = xp + extra
        setSessionXp(prev => prev + earned)
        setFeedback({
          state:    isFirst ? 'correct_first' : 'correct_retry',
          message,
          xpEarned: earned,
        })
        if (sfxEnabled) playSfx('feedback--correct')
        // Trigger XP floater
        setXpFloaterAmt(earned)
        setXpFloaterKey(k => k + 1)
      } else {
        setLives(l => l - 1)
        setFeedback({
          state:    'needs_revision',
          message,
          xpEarned: 0,
        })
        if (sfxEnabled) playSfx('feedback--try-again')
      }
    } finally {
      setIsAssessing(false)
    }
  }, [level, steps, stepIndex, value, attemptCount, hintsUsedThisStep, isAssessing, sfxEnabled, playSfx, setXpFloaterAmt, setXpFloaterKey])

  // ── Continue / retry handler ───────────────────────────────────────────────
  const handleContinue = useCallback(() => {
    if (!feedback) return

    if (feedback.state === 'needs_revision') {
      // Retry: keep same step, clear feedback (keep value so pupil can edit)
      if (lives <= 0) {
        // Out of lives → back to dashboard
        navigate('/dashboard')
        return
      }
      setFeedback(null)
      setIsAssessing(false)
      return
    }

    // Correct: advance to next step or finish
    const nextIndex = stepIndex + 1
    if (nextIndex < steps.length) {
      setStepIndex(nextIndex)
      setValue('')
      setFeedback(null)
      setAttemptCount(0)
      setHintsUsedThisStep(0)
      paragraphPartsRef.current = null
    } else {
      // All steps done — persist XP update + mark level progress
      persistLevelCompletion()
      if (sfxEnabled) playSfx('xp--level-up')
      setScreen('done')
    }
  }, [feedback, lives, stepIndex, steps.length, navigate, setHintsUsedThisStep, sfxEnabled, playSfx])

  const persistLevelCompletion = async () => {
    const pupilId = getPupilId()
    if (!pupilId || !level) return
    try {
      // ── 1. Load current progress ────────────────────────────────────────
      const { data: current } = await supabase
        .from('formula_progress')
        .select('highest_level_reached, total_xp, current_pwp_level_id, streak_days, last_session_date, longest_streak')
        .eq('pupil_id', pupilId)
        .maybeSingle()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = current as any
      const prevHighest     = c?.highest_level_reached ?? 0
      const newHighest      = Math.max(prevHighest, level.level_number)
      const prevStreak      = c?.streak_days ?? 0
      const lastSessionDate = c?.last_session_date ?? null
      const longestStreak   = c?.longest_streak ?? 0

      // ── 2. Compute new streak ────────────────────────────────────────────
      const todayISO = new Date().toISOString().slice(0, 10)
      let newStreak  = prevStreak
      if (lastSessionDate !== todayISO) {
        // Simple rule: advance by 1 if practiced today; full engine runs on next load
        newStreak = prevStreak + 1
      }
      const newLongest = Math.max(longestStreak, newStreak)

      // ── 3. Persist to formula_progress ──────────────────────────────────
      await supabase
        .from('formula_progress')
        .upsert({
          pupil_id:              pupilId,
          highest_level_reached: newHighest,
          current_pwp_level_id:  level.id + 1,
          total_xp:              (c?.total_xp ?? 0) + sessionXp,
          streak_days:           newStreak,
          last_session_date:     todayISO,
          longest_streak:        newLongest,
        }, { onConflict: 'pupil_id' })

      // ── 4. Check for new title ───────────────────────────────────────────
      const prevTitle = getLevelTitle(prevHighest)
      const curTitle  = getLevelTitle(newHighest)
      if (curTitle !== prevTitle) setNewTitle(curTitle)

      // ── 5. Award badges ─────────────────────────────────────────────────
      const isFirstEver = prevHighest === 0
      const newBadges = await checkAndAward({
        highestLevelReached: newHighest,
        streakDays:          newStreak,
        isFirstLevel:        isFirstEver,
      })
      if (newBadges.length > 0) {
        setPendingBadge(newBadges[0]) // show the first (most significant) badge
      }
    } catch (err) {
      console.error('[LevelPage] persist error:', err)
    }
  }

  // ── Keyboard submit ───────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.ctrlKey && screen === 'step' && !feedback && !isAssessing && value.trim()) {
        handleSubmit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screen, feedback, isAssessing, value, handleSubmit])

  // ── Auto-speak formula on each new step ──────────────────────────────────
  useEffect(() => {
    if (screen !== 'step' || !steps[stepIndex]) return
    // Short delay so the UI transition settles before TTS begins
    const tid = window.setTimeout(() => speak(steps[stepIndex].formula), 450)
    return () => window.clearTimeout(tid)
  }, [stepIndex, screen]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stop TTS when navigating away from the step screen ───────────────────
  useEffect(() => {
    if (screen !== 'step') stopTts()
  }, [screen]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Screens ───────────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#FDF8EE] flex flex-col items-center justify-center gap-4 p-6">
        <div className="text-[48px]">😔</div>
        <p className="text-[#6C5CE7] font-bold text-[18px] text-center">{loadError}</p>
        <button
          className="px-6 py-3 bg-[#6C5CE7] text-white rounded-xl font-bold"
          onClick={() => navigate('/dashboard')}
        >
          ← Back to Dashboard
        </button>
      </div>
    )
  }

  if (screen === 'loading' || !level) {
    return (
      <div className="min-h-screen bg-[#FDF8EE] flex items-center justify-center">
        <motion.div
          className="w-12 h-12 rounded-full border-4 border-[#6C5CE7] border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    )
  }

  if (screen === 'start') {
    return (
      <LevelStartScreen
        level={level}
        steps={steps}
        totalXp={totalXp}
        streakDays={streakDays}
        onStart={() => setScreen('step')}
        onBack={() => navigate('/dashboard')}
      />
    )
  }

  if (screen === 'done') {
    return (
      <>
        <LevelCompleteScreen
          level={level}
          sessionXp={sessionXp}
          newTitle={newTitle}
          onContinue={() => navigate('/dashboard')}
        />
        <PWPBadgeToast
          badge={pendingBadge}
          onDismiss={() => setPendingBadge(null)}
        />
      </>
    )
  }

  // screen === 'step'
  return (
    <InLevelScreen
      level={level}
      steps={steps}
      stepIndex={stepIndex}
      lives={lives}
      sessionXp={sessionXp}
      feedback={feedback}
      isAssessing={isAssessing}
      value={value}
      onChange={setValue}
      onSubmit={handleSubmit}
      onContinue={handleContinue}
      onBack={() => navigate('/dashboard')}
      onHintUsed={n => setHintsUsedThisStep(prev => Math.max(prev, n))}
      onPartsChange={parts => { paragraphPartsRef.current = parts }}
      onSpeak={speak}
      xpFloaterKey={xpFloaterKey}
      xpFloaterAmount={xpFloaterAmt}
    />
  )
}
