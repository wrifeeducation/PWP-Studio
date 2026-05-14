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
import { WordBankTenseVariety } from '@/components/pwp/wordbank/WordBankTenseVariety'
import { GuidancePanel } from '@/components/pwp/guidance/GuidancePanel'
import { PunctuationStep } from '@/components/pwp/step/PunctuationStep'
import { TypeModeTileInput } from '@/components/pwp/step/TypeModeTileInput'
import { SubjectPrompt } from '@/components/pwp/step/SubjectPrompt'
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
  /** Specific correction hint from AI assessment (shown for needs_revision) */
  correctionHint?: string | null
  /** Grammar insight shown on correct (from pwp_steps.grammar_insight) */
  grammarInsight?: string | null
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
      style={{ minHeight: '100dvh', backgroundColor: 'var(--color-background)', display: 'flex', flexDirection: 'column' }}
      aria-label={`Level ${level.level_number}: ${level.title}`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Header bar — full width */}
        <div
          style={{ background: isParagraph ? '#00b894' : '#6C5CE7', padding: 'clamp(16px, 3vw, 28px) clamp(16px, 4vw, 32px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
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
        <div style={{ flex: 1, backgroundColor: 'var(--color-background)', padding: 'clamp(16px, 3vw, 28px) clamp(16px, 4vw, 32px)', display: 'flex', gap: 'clamp(16px, 3vw, 24px)' }}>
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
                background: isParagraph ? '#00b894' : '#F5A623',
                boxShadow: isParagraph ? '0 4px 0 0 #007d67' : '0 4px 0 0 #c47a0a',
              }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ y: 4, boxShadow: '0 0 0 0 transparent' }}
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

  // ── Punctuation / capitalisation state ────────────────────────────
  // rawAssembly: the unpunctuated text from word bank or textarea
  // value (parent): only set after PunctuationStep completes (= submitted value)
  const [rawAssembly, setRawAssembly] = useState('')
  // typeMode: in Phase A, allow switching to free text instead of word bank
  const [typeMode, setTypeMode] = useState(false)

  // Subject confirmed by pupil at L7+ (Phase B subject prompt)
  const [subjectConfirmed, setSubjectConfirmed] = useState(false)

  // Reset raw + final + subject prompt when step changes
  useEffect(() => {
    setRawAssembly('')
    setTypeMode(false)
    setSubjectConfirmed(false)
    onChange('')
  }, [stepIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRawChange = (raw: string) => {
    setRawAssembly(raw)
    onChange('')  // clear final value until punctuation step done
  }

  const handlePunctComplete = (final: string) => {
    onChange(final)
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const ACCENT = isParagraph ? '#00b894' : '#6C5CE7'

  useEffect(() => {
    if (!feedback && !isWordBankPhase && !isParagraphStep) textareaRef.current?.focus()
  }, [stepIndex, feedback, isWordBankPhase, isParagraphStep])

  const progressPct = Math.round((stepIndex / total) * 100)
  const badge = stepTypeBadge(step.step_type)

  return (
    <main
      id="pwp-level-content"
      style={{ minHeight: '100dvh', backgroundColor: 'var(--color-background)', display: 'flex', flexDirection: 'column' }}
      aria-label={`Level ${level.level_number} — Step ${stepIndex + 1} of ${total}`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Header bar — full width */}
        <div
          style={{ background: ACCENT, padding: 'clamp(12px, 2vw, 18px) clamp(16px, 4vw, 32px)', display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}
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

        {/* Body — centred content column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'clamp(16px, 3vw, 28px) clamp(16px, 4vw, 32px)', paddingBottom: 'clamp(24px, 4vw, 40px)' }}>
        <div style={{ width: '100%', maxWidth: 'var(--pwp-content-width)', display: 'flex', flexDirection: 'column', flex: 1 }}>
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
                <div style={{ fontSize: 'var(--pwp-text-md)', fontWeight: 800, color: '#2D3436', lineHeight: 1.35 }} data-tts={step.formula}>
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
              <span style={{ fontSize: 'var(--pwp-text-base)', color: '#2D3436', fontStyle: 'italic' }} data-tts={step.example}>
                {step.example}
              </span>
            </div>
          )}

          {/* Subject prompt — only shown for free-write phases (C/D).
              Phase A/B: pupil picks their own noun from the bank below. */}
          {!isWordBankPhase && !isParagraphStep && (
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
          )}

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

          {/* ── Punctuation + capitalisation step — always shown for Phase A (placeholder when empty), above the word bank ── */}
          {!feedback && !isParagraphStep && (stepPhase === 'A' ? !typeMode : rawAssembly.trim().length > 0) && (
            <PunctuationStep
              key={`punct-${stepIndex}`}
              sentence={rawAssembly}
              availableMarks={['.', '?', '!']}
              onComplete={handlePunctComplete}
              onSpeak={onSpeak}
              disabled={isAssessing}
            />
          )}

          {/* ── Word Bank Phase A — Build Mode (L1–6), unless type mode or tense_variety ── */}
          {stepPhase === 'A' && wbConfig && !feedback && !typeMode && step.step_type !== 'tense_variety' && (
            <WordBankPhaseA
              key={`wba-${stepIndex}`}
              bankWords={wbConfig.bank_words ?? []}
              distractors={wbConfig.distractors ?? null}
              subjectPrompt={step.subject_prompt}
              onChange={handleRawChange}
              disabled={isAssessing}
            />
          )}

          {/* ── Subject prompt — Phase B (L7+): pupil types their subject before composing ── */}
          {stepPhase === 'B' && !feedback && (
            <SubjectPrompt
              key={`subject-${stepIndex}`}
              onConfirm={(val) => setSubjectConfirmed(val.trim().length > 0)}
              disabled={isAssessing}
            />
          )}

          {/* ── Word Bank Phase B — Gap Mode (L7–19) ── */}
          {stepPhase === 'B' && wbConfig && !feedback && subjectConfirmed && (
            <WordBankPhaseB
              key={`wbb-${stepIndex}`}
              bankWords={wbConfig.bank_words ?? []}
              gapSlots={wbConfig.gap_slots ?? []}
              targetSentence={step.target_sentence}
              onChange={handleRawChange}
              disabled={isAssessing}
            />
          )}

          {/* ── Tense variety — three-tray mode for step_type === 'tense_variety' ── */}
          {step.step_type === 'tense_variety' && wbConfig && !feedback && (
            <WordBankTenseVariety
              key={`tv-${stepIndex}`}
              bankWords={wbConfig.bank_words ?? []}
              onChange={handleRawChange}
              disabled={isAssessing}
            />
          )}

          {/* ── "I'll type instead" toggle — Phase A only ── */}
          {stepPhase === 'A' && !feedback && (
            <div className="flex justify-end mt-2 mb-1">
              <button
                className="text-xs text-[#9b87f0] hover:text-[#6C5CE7] transition-colors underline underline-offset-2"
                onClick={() => {
                  setTypeMode(t => !t)
                  setRawAssembly('')
                  onChange('')
                }}
                data-tts={typeMode ? 'Use word bank' : "I'll type instead"}
              >
                {typeMode ? '← Use word bank' : "I'll type instead →"}
              </button>
            </div>
          )}

          {/* ── Type-mode tile builder — shown when pupil toggles "I'll type instead" ── */}
          {typeMode && !feedback && (
            <TypeModeTileInput
              key={`type-${stepIndex}`}
              onChange={handleRawChange}
              disabled={isAssessing}
            />
          )}

          {/* ── Text input — free-write (C/D phases) or feedback display ── */}
          {((!isWordBankPhase && !isParagraphStep && !typeMode) || !!feedback) && (
            <textarea
              ref={textareaRef}
              className="w-full border-2 rounded-xl px-4 py-3 text-base sm:text-lg text-[#2D3436] outline-none font-[inherit] resize-none transition-colors bg-white min-h-[80px] sm:min-h-[88px]"
              style={{
                borderColor: feedback
                  ? (feedback.state.startsWith('correct') ? '#00b894' : '#F5A623')
                  : '#e0d8ff',
              }}
              placeholder="Write your sentence here…"
              value={isWordBankPhase && feedback ? value : (feedback ? value : rawAssembly)}
              onChange={e => handleRawChange(e.target.value)}
              onFocus={e => { if (!feedback) e.target.style.borderColor = ACCENT }}
              onBlur={e => { if (!feedback) e.target.style.borderColor = '#e0d8ff' }}
              rows={3}
              disabled={!!feedback || isAssessing}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              data-tts={isWordBankPhase && feedback ? 'Your assembled sentence' : 'Write your sentence here'}
            />
          )}

          {/* Action buttons — hidden when feedback panel slides up */}
          {!feedback && (
            <div className="sticky bottom-0 pt-3 pb-2 sm:static sm:pt-0 sm:pb-0 border-t sm:border-0 border-stone-100 mt-4" style={{ backgroundColor: 'var(--color-background)' }}>
              <div className="flex gap-3 relative">
                {/* XP floater — positioned above the button row */}
                <XPFloater key={xpFloaterKey} amount={xpFloaterAmount} />
                <button
                  className="flex-1 bg-white border-2 border-[#e0d8ff] rounded-xl py-3 text-[13px] font-semibold text-[#6C5CE7] flex items-center justify-center gap-2 hover:bg-[#f0ecff] transition-colors min-h-[44px]"
                  onClick={onBack}
                  data-tts="Back to path"
                >
                  ← Path
                </button>
                <motion.button
                  className="flex-[2] rounded-xl py-3 text-white font-extrabold disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
                  style={{
                    fontSize: 'var(--pwp-text-base)',
                    background: '#F5A623',
                    boxShadow: '0 4px 0 0 #c47a0a',
                  }}
                  whileHover={!isAssessing && value.trim() ? { scale: 1.01 } : {}}
                  whileTap={!isAssessing && value.trim() ? { y: 4, boxShadow: '0 0 0 0 transparent' } : {}}
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
                  ) : !value.trim() && (rawAssembly.trim() || typeMode)
                    ? 'Choose punctuation first'
                    : 'Submit ✓'}
                </motion.button>
              </div>
            </div>
          )}
        </div>
        </div>
        </div>

      {/* ── Full-width feedback panel — slides up from bottom (Duolingo-style) ── */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              background: feedback.state.startsWith('correct') ? '#00b894' : '#F5A623',
              padding: 'clamp(14px, 2.5vw, 20px) clamp(16px, 4vw, 32px)',
              paddingBottom: 'calc(clamp(14px, 2.5vw, 20px) + env(safe-area-inset-bottom, 0px))',
              zIndex: 100,
              boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Row 1: icon + heading + XP chip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }} aria-hidden="true">
                {feedback.state.startsWith('correct') ? '✅' : '💡'}
              </span>
              <span style={{ color: 'white', fontWeight: 800, fontSize: 'var(--pwp-text-base)', flex: 1 }}>
                {feedback.state === 'correct_first' && 'Excellent! First time! 🌟'}
                {feedback.state === 'correct_retry' && 'Well done — you got there! 🎉'}
                {feedback.state === 'needs_revision' && 'Almost there — try again!'}
              </span>
              {feedback.xpEarned > 0 && (
                <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 20, padding: '4px 10px', color: 'white', fontWeight: 700, fontSize: 'var(--pwp-text-xs)', flexShrink: 0 }}>
                  +{feedback.xpEarned} XP
                </span>
              )}
            </div>

            {/* Row 2: feedback message */}
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 'var(--pwp-text-sm)', lineHeight: 1.5, marginBottom: 10 }}>
              {feedback.message}
            </div>

            {/* Correction hint */}
            {feedback.correctionHint && (
              <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 8, padding: '7px 12px', fontSize: 'var(--pwp-text-xs)', color: 'rgba(255,255,255,0.92)', marginBottom: 10 }}>
                💡 {feedback.correctionHint}
              </div>
            )}

            {/* Grammar insight */}
            {feedback.grammarInsight && feedback.state.startsWith('correct') && (
              <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 8, padding: '7px 12px', fontSize: 'var(--pwp-text-xs)', color: 'rgba(255,255,255,0.92)', marginBottom: 10, borderLeft: '3px solid rgba(255,255,255,0.6)' }}>
                📖 {feedback.grammarInsight}
              </div>
            )}

            {/* Continue / Try Again CTA — white button with coloured text */}
            <motion.button
              style={{
                width: '100%',
                background: 'white',
                color: feedback.state.startsWith('correct') ? '#007d67' : '#c47a0a',
                borderRadius: 14,
                border: 'none',
                padding: '14px 24px',
                fontSize: 'var(--pwp-text-base)',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 3px 0 0 rgba(0,0,0,0.12)',
                minHeight: 56,
              }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ y: 3, boxShadow: '0 0 0 0 transparent' }}
              onClick={onContinue}
              data-tts={feedback.state.startsWith('correct') ? 'Continue to next step' : 'Try again'}
            >
              {feedback.state.startsWith('correct')
                ? (stepIndex < steps.length - 1 ? 'Continue →' : 'Finish Level! 🎉')
                : 'Try Again →'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
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
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(16px, 4vw, 32px)' }}>
      <motion.div
        className="w-full max-w-[480px] text-center"
        style={{ backgroundColor: 'var(--color-surface)', borderRadius: '24px', padding: 'clamp(24px, 5vw, 40px)', boxShadow: '0 8px 32px rgba(108,92,231,0.12)' }}
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
            background: ACCENT,
            boxShadow: level.is_paragraph_phase ? '0 4px 0 0 #007d67' : '0 4px 0 0 #3d35a0',
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ y: 4, boxShadow: '0 0 0 0 transparent' }}
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
  const [consecutiveErrors, setConsecutiveErrors] = useState(0)
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
        let correctionHint: string | null = null
        let grammarInsight: string | null = null
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
          // Extract formula-aware details if present
          if (result.assessment) {
            correctionHint = result.assessment.correction_hint ?? null
            grammarInsight = result.assessment.grammar_insight ?? null
          }
        } catch {
          passed  = clientCheck(trimmed, step.target_sentence)
          message = passed
            ? 'Your sentence matches the formula perfectly!'
            : `Check the formula: ${step.formula}`
        }
        // Also try to get grammar_insight from the step row directly
        if (passed && !grammarInsight) {
          grammarInsight = (step as any).grammar_insight ?? null // eslint-disable-line @typescript-eslint/no-explicit-any
        }

        const isFirst = attemptCount === 0
        if (passed) {
          const baseXp    = isFirst ? XP_FIRST : XP_RETRY
          const hintCost  = Math.min(hintsUsedThisStep * 2, baseXp)
          const xp        = baseXp - hintCost
          const extra     = step.is_paragraph_step ? XP_PARA : 0
          const earned    = xp + extra
          setSessionXp(prev => prev + earned)
          setConsecutiveErrors(0)
          setFeedback({
            state:         isFirst ? 'correct_first' : 'correct_retry',
            message,
            xpEarned:      earned,
            grammarInsight,
          })
          if (sfxEnabled) playSfx('feedback--correct')
          setXpFloaterAmt(earned)
          setXpFloaterKey(k => k + 1)
        } else {
          const newErrors = consecutiveErrors + 1
          setConsecutiveErrors(newErrors)
          setLives(l => l - 1)
          setFeedback({
            state:          'needs_revision',
            message,
            xpEarned:       0,
            correctionHint,
          })
          if (sfxEnabled) playSfx('feedback--try-again')
          // Adaptive pacing: auto-open guidance after 3 consecutive errors
          if (newErrors >= 3) {
            speak('guidance.adaptive_open')
            setHintsUsedThisStep(1)  // trigger Level 1 guidance to auto-open
          }
        }
        return  // early return — we handled everything in the else block
      }

      // Paragraph path falls through here
      const isFirst = attemptCount === 0
      if (passed) {
        const baseXp    = isFirst ? XP_FIRST : XP_RETRY
        const hintCost  = Math.min(hintsUsedThisStep * 2, baseXp)
        const xp        = baseXp - hintCost
        const extra     = step.is_paragraph_step ? XP_PARA : 0
        const earned    = xp + extra
        setSessionXp(prev => prev + earned)
        setConsecutiveErrors(0)
        setFeedback({
          state:    isFirst ? 'correct_first' : 'correct_retry',
          message,
          xpEarned: earned,
        })
        if (sfxEnabled) playSfx('feedback--correct')
        setXpFloaterAmt(earned)
        setXpFloaterKey(k => k + 1)
      } else {
        const newErrors = consecutiveErrors + 1
        setConsecutiveErrors(newErrors)
        setLives(l => l - 1)
        setFeedback({ state: 'needs_revision', message, xpEarned: 0 })
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
      setConsecutiveErrors(0)
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
