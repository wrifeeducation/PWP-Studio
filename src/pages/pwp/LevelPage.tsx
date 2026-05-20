// PWP Level / Step screen
// Phases 7–11: start screen, step practice, feedback, word bank (A/B added in later phases)

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { FormulaBar } from '@/components/pwp/step/FormulaBar'
import { TransitionCallout } from '@/components/pwp/step/TransitionCallout'
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
const XP_LEVEL_BONUS = 25  // awarded on completing all steps in a level

// ─── LEVEL TITLE ─────────────────────────────────────────────────────────────

function getLevelTitle(levelNumber: number): string {
  if (levelNumber <= 3)  return 'Apprentice Writer'
  if (levelNumber <= 8)  return 'Sentence Builder'
  if (levelNumber <= 14) return 'Phrase Crafter'
  if (levelNumber <= 19) return 'Paragraph Writer'
  return 'Master Composer'  // levels 20-35
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
  if (st === 'new_element')   return { label: '★ NEW',     bg: '#fef0e0', fg: '#d4700a' }
  if (st === 'consolidation') return { label: 'Review',    bg: '#f0ecff', fg: '#6C5CE7' }
  if (st === 'tense_variety') return { label: 'Tense Mix', bg: '#e8f5e9', fg: '#2e7d32' }
  if (st === 'transition')    return { label: 'Transition',bg: '#e3f2fd', fg: '#1565c0' }
  if (st === 'three_stage')   return { label: '3-Stage',   bg: '#fce4ec', fg: '#880e4f' }
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
              data-tts={`Can you build a sentence using: ${level.new_element}?`}
            >
              <p className="text-[13px] text-[#2D3436] leading-[1.5]">
                {isParagraph
                  ? <>Ready to build a <strong className="text-[#00b894]">full paragraph</strong> using Lead → Support → Close? 📝</>
                  : <>Can you build a sentence using <strong className="text-[#6C5CE7]">{level.new_element}</strong>? 🎯</>
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
                What's new today?
              </div>
              <div className="text-[16px] font-bold text-[#2D3436]">{level.new_element}</div>
            </div>

            {/* Step chain list */}
            <div
              className="text-[11px] font-bold text-[#aaa] uppercase tracking-[1px] mb-3"
            >
              Your challenge — {steps.length} steps to complete
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

  // ── Help panel state ───────────────────────────────────────────────
  const [showHelp, setShowHelp] = useState(false)

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

          {/* Help button */}
          <button
            className="bg-white/15 rounded-[8px] w-[30px] h-[30px] flex items-center justify-center text-[15px] font-bold flex-shrink-0 transition-opacity"
            style={{ opacity: showHelp ? 1 : 0.75, color: 'white' }}
            onClick={() => setShowHelp(v => !v)}
            aria-label="What does this mean?"
            aria-expanded={showHelp}
            data-tts="What does this mean?"
          >
            ?
          </button>
        </div>

        {/* Help panel — slides in below header */}
        <AnimatePresence>
          {showHelp && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden', background: '#fffbea', borderBottom: '2px solid #F5C500', flexShrink: 0 }}
            >
              <div style={{ padding: 'clamp(10px, 2vw, 16px) clamp(16px, 4vw, 32px)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>💡</span>
                <div>
                  <div style={{ fontSize: 'var(--pwp-text-sm)', fontWeight: 800, color: '#2D3436', marginBottom: 2 }}>
                    {level.title}
                  </div>
                  <div style={{ fontSize: 'var(--pwp-text-sm)', color: '#555', fontWeight: 500 }}>
                    {level.new_element}
                  </div>
                  {step.example && (
                    <div style={{ marginTop: 6, fontSize: 'var(--pwp-text-sm)', color: '#6C5CE7', fontStyle: 'italic' }}>
                      e.g. <em>{step.example}</em>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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

          {/* Formula card — colour-coded word-class chips */}
          <FormulaBar
            formula={step.formula}
            stepType={step.step_type}
            newElement={level.new_element}
            onSpeak={onSpeak}
            accent={ACCENT}
            stepTypeBadge={badge}
          />

          {/* Transition / three-stage callout — structural shift shown with Sam as model */}
          {(step.step_type === 'transition' || step.step_type === 'three_stage') && step.example && (
            <TransitionCallout
              stepType={step.step_type}
              example={step.example}
              accent={ACCENT}
            />
          )}

          {/* Example sentence — shown for new_element and consolidation steps */}
          {step.example && step.step_type !== 'transition' && step.step_type !== 'three_stage' && (
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

          {/* Subject prompt — Phase C/D free-write: pupil always chooses their own subject.
              Phase A: subject comes from noun chips in the word bank.
              Phase B: has its own SubjectPrompt block below. */}
          {!isWordBankPhase && !isParagraphStep && !feedback && (
            <SubjectPrompt
              key={`subject-cd-${stepIndex}`}
              onConfirm={(val) => setSubjectConfirmed(val.trim().length > 0)}
              disabled={isAssessing}
            />
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

          {/* ── Punctuation + capitalisation step ────────────────────────────────
               FIX-08: Only shown once the pupil has tapped at least one word
               (rawAssembly non-empty). Hiding the placeholder on an empty sentence
               removes a confusing empty box that appeared before any words were tapped.
               FIX-03: typeMode no longer hides PunctuationStep — typed sentences
               must also pass through capitalisation + punctuation before submit.
               FIX-05: minWordCount derived from formula element count gates the
               punctuation selector so it only appears once the formula is complete.
          ── */}
          {!feedback && !isParagraphStep && rawAssembly.trim().length > 0 && (
            <PunctuationStep
              key={`punct-${stepIndex}`}
              sentence={rawAssembly}
              availableMarks={['.', '?', '!']}
              onComplete={handlePunctComplete}
              onSpeak={onSpeak}
              disabled={isAssessing}
              minWordCount={step.formula ? step.formula.split(/\s*\+\s*/).length : undefined}
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
              formula={step.formula ?? undefined}
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

          {/* ── Text input — free-write (C/D phases) or feedback display ──
              For C/D: gated on subjectConfirmed so textarea only appears after
              the pupil has entered their subject via SubjectPrompt. */}
          {((!isWordBankPhase && !isParagraphStep && !typeMode && (subjectConfirmed || !!feedback)) || !!feedback) && (
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
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
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

// ─── Confetti helpers ─────────────────────────────────────────────────────────

const CONFETTI_COLOURS = ['#6C5CE7', '#F5A623', '#00b894', '#e17055', '#fdcb6e', '#fd79a8', '#74b9ff']

interface ConfettiParticle {
  id: number
  colour: string
  x: number      // % from center
  y: number      // % from center
  rotate: number // final rotation deg
  size: number
  delay: number
}

function buildConfetti(count = 28): ConfettiParticle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    colour: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
    x: (Math.random() - 0.5) * 280,
    y: (Math.random() - 0.5) * 340,
    rotate: Math.random() * 720 - 360,
    size: 7 + Math.random() * 7,
    delay: Math.random() * 0.4,
  }))
}

// ─── LEVEL COMPLETE SCREEN ────────────────────────────────────────────────────

interface DoneScreenProps {
  level: PwpLevel
  sessionXp: number   // total XP including the level bonus
  xpBonus: number     // the level-completion bonus portion (shown separately)
  newTitle: string | null  // non-null when the pupil just crossed a title boundary
  onContinue: () => void
}

function LevelCompleteScreen({ level, sessionXp, xpBonus, newTitle, onContinue }: DoneScreenProps) {
  const ACCENT   = level.is_paragraph_phase ? '#00b894' : '#6C5CE7'
  const title    = getLevelTitle(level.level_number)
  const stepXp   = sessionXp - xpBonus           // XP earned from step answers
  const confetti = useMemo(() => buildConfetti(28), [])

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(16px, 4vw, 32px)', position: 'relative', overflow: 'hidden' }}>

      {/* ── Confetti burst ── */}
      <div
        style={{ position: 'absolute', top: '50%', left: '50%', pointerEvents: 'none', zIndex: 0 }}
        aria-hidden="true"
      >
        {confetti.map(p => (
          <motion.div
            key={p.id}
            style={{
              position: 'absolute',
              width: p.size,
              height: p.size,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              background: p.colour,
              top: 0,
              left: 0,
            }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0 }}
            animate={{
              x: p.x,
              y: p.y,
              opacity: [1, 1, 0],
              rotate: p.rotate,
              scale: [0, 1.2, 1],
            }}
            transition={{ duration: 1.1, delay: p.delay, ease: 'easeOut' }}
          />
        ))}
      </div>

      <motion.div
        className="w-full max-w-[480px] text-center"
        style={{ backgroundColor: 'var(--color-surface)', borderRadius: '24px', padding: 'clamp(24px, 5vw, 40px)', boxShadow: '0 8px 32px rgba(108,92,231,0.12)', position: 'relative', zIndex: 1 }}
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

        {/* XP earned — steps subtotal + level bonus breakdown */}
        <div
          className="rounded-2xl mb-5 overflow-hidden"
          style={{ border: `2px solid ${ACCENT}40` }}
        >
          {/* Step XP row */}
          <div
            className="flex items-center gap-3 px-5 py-3"
            style={{ background: `${ACCENT}10` }}
          >
            <span className="text-[22px]">⭐</span>
            <div className="flex-1 text-left">
              <div className="text-[11px] font-bold text-[#888] uppercase tracking-wide">Steps XP</div>
              <div className="text-[20px] font-extrabold" style={{ color: ACCENT }} data-tts={`${stepXp} XP from steps`}>
                +{stepXp}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: `${ACCENT}20` }} />

          {/* Level bonus row */}
          <motion.div
            className="flex items-center gap-3 px-5 py-3"
            style={{ background: '#FFF7E6' }}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.55 }}
          >
            <span className="text-[22px]">🎁</span>
            <div className="flex-1 text-left">
              <div className="text-[11px] font-bold text-[#c47a0a] uppercase tracking-wide">Level Bonus</div>
              <div className="text-[20px] font-extrabold text-[#c47a0a]" data-tts={`${xpBonus} bonus XP for completing the level`}>
                +{xpBonus}
              </div>
            </div>
            <span
              className="px-2 py-[2px] rounded-lg text-[10px] font-black uppercase"
              style={{ background: '#F5A62330', color: '#c47a0a' }}
            >
              BONUS
            </span>
          </motion.div>

          {/* Total row */}
          <div style={{ height: 1, background: `${ACCENT}20` }} />
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ background: `${ACCENT}18` }}
          >
            <span className="text-[12px] font-bold text-[#888] uppercase tracking-wide">Total XP</span>
            <span className="text-[24px] font-extrabold" style={{ color: ACCENT }} data-tts={`Total ${sessionXp} XP earned`}>
              +{sessionXp}
            </span>
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
  const { isInitialised: authReady } = useAuthStore()

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

  // ── Session-level step persistence ─────────────���──────────────────────────
  // Saves step position + XP + lives to sessionStorage so a page reload during
  // a level session restores the pupil's exact position rather than sending
  // them back to the start screen.  Uses levelId (from URL) as the key so
  // different levels don't collide.  sessionStorage is scoped to the tab and
  // clears when the tab closes — no cross-session state bleed.
  const stepPersistKey = levelId ? `pwp_step_${levelId}` : null

  // Write position whenever the pupil is mid-level
  useEffect(() => {
    if (!stepPersistKey || screen !== 'step') return
    try {
      sessionStorage.setItem(stepPersistKey, JSON.stringify({ stepIndex, sessionXp, lives }))
    } catch { /* sessionStorage quota exceeded or private-browsing restriction */ }
  }, [stepPersistKey, screen, stepIndex, sessionXp, lives])

  // Clear on level completion so a revisit always starts fresh
  useEffect(() => {
    if (!stepPersistKey || screen !== 'done') return
    sessionStorage.removeItem(stepPersistKey)
  }, [stepPersistKey, screen])
  const [value,             setValue]             = useState('')
  const [attemptCount,      setAttemptCount]      = useState(0)
  const [consecutiveErrors, setConsecutiveErrors] = useState(0)
  // Gamification milestone refs — fire once per session
  const firstCorrectFiredRef  = useRef(false)
  const halfwayFiredRef       = useRef(false)
  // Paragraph parts — kept in a ref so handleSubmit can read them synchronously
  const paragraphPartsRef = useRef<ParagraphParts | null>(null)
  const [feedback,          setFeedback]          = useState<FeedbackData | null>(null)
  const [isAssessing,       setIsAssessing]       = useState(false)
  const [loadError,         setLoadError]         = useState<string | null>(null)

  // ── Load level + steps ────────────────────────────────────────────────────
  // BUG-01 fix: wait for auth to be initialised before querying Supabase.
  // On first navigation (without F5), the Supabase session isn't propagated yet,
  // causing RLS-protected queries to fail or return no rows.
  useEffect(() => {
    if (!authReady) return  // wait for auth session to initialise
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
        const loadedSteps = (stepsData ?? []) as unknown as PwpStep[]
        setSteps(loadedSteps)

        // Restore mid-level position from sessionStorage (survives page reload)
        const savedJson = sessionStorage.getItem(`pwp_step_${id}`)
        if (savedJson) {
          try {
            const saved = JSON.parse(savedJson) as { stepIndex?: number; sessionXp?: number; lives?: number }
            const savedIdx = saved.stepIndex ?? 0
            if (savedIdx >= 0 && savedIdx < loadedSteps.length) {
              setStepIndex(savedIdx)
              setSessionXp(saved.sessionXp ?? 0)
              setLives(saved.lives ?? MAX_LIVES)
              setScreen('step')   // skip start screen — pupil was mid-level
            } else {
              // Saved index is out of range (level may have changed) — start fresh
              sessionStorage.removeItem(`pwp_step_${id}`)
              setScreen('start')
            }
          } catch {
            setScreen('start')
          }
        } else {
          setScreen('start')
        }
      } catch (err) {
        console.error('[LevelPage] load error:', err)
        setLoadError('Could not load this level. Please go back and try again.')
        setScreen('loading')
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId, authReady])

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
          // Derive structural params from step + formula for accurate assessment.
          // The Edge Function defaults to 'proper_noun' / 'past' / 'new_element'
          // which is wrong for present-tense, continuous, pronoun, and
          // consolidation steps. Always pass explicit values.
          const formulaLower = step.formula?.toLowerCase() ?? ''

          const subjectType: 'proper_noun' | 'det_noun' | 'pronoun' =
            (step as any).subject_type ??
            (formulaLower.includes('pronoun') ? 'pronoun' :
             formulaLower.includes('det')     ? 'det_noun' :
             'proper_noun')

          const tenseParam: 'past' | 'present' | 'continuous' | 'any' =
            (step as any).tense ??
            (step.step_type === 'tense_variety'            ? 'any' :
             formulaLower.includes('present tense')        ? 'present' :
             formulaLower.includes('continuous') ||
             formulaLower.includes('-ing')                 ? 'continuous' :
             'past')

          const stepTypeParam =
            (step.step_type as 'new_element' | 'consolidation' | 'tense_variety' | 'transition')
            ?? 'new_element'

          const result = await assessStep({
            sentence:      trimmed,
            formulaLabel:  step.formula,
            elementCode:   String(step.id),
            subject_type:  subjectType,
            tense:         tenseParam,
            step_type:     stepTypeParam,
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
          const xp        = baseXp  // hints are free — no XP deduction
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
          // Gamification audio: XP earned
          speak(isFirst ? 'gamification.xp_10' : 'gamification.xp_5')
          // First correct of this session
          if (!firstCorrectFiredRef.current) {
            firstCorrectFiredRef.current = true
            speak('gamification.first_correct')
          }
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
          // Adaptive pacing: nudge towards hints after 3 consecutive errors
          if (newErrors >= 3) {
            speak('guidance.adaptive_open')
          }
        }
        return  // early return — we handled everything in the else block
      }

      // Paragraph path falls through here
      const isFirst = attemptCount === 0
      if (passed) {
        const baseXp    = isFirst ? XP_FIRST : XP_RETRY
        const xp        = baseXp  // hints are free — no XP deduction
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
        // Gamification audio: XP earned
        speak(isFirst ? 'gamification.xp_10' : 'gamification.xp_5')
        if (!firstCorrectFiredRef.current) {
          firstCorrectFiredRef.current = true
          speak('gamification.first_correct')
        }
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
  }, [level, steps, stepIndex, value, attemptCount, isAssessing, sfxEnabled, playSfx, setXpFloaterAmt, setXpFloaterKey])

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
      paragraphPartsRef.current = null
      // Halfway milestone audio (fires once per level)
      if (!halfwayFiredRef.current && nextIndex >= Math.ceil(steps.length / 2)) {
        halfwayFiredRef.current = true
        speak('gamification.halfway')
      }
    } else {
      // All steps done — award level bonus, play celebration audio, show done screen
      setSessionXp(prev => prev + XP_LEVEL_BONUS)
      speak('gamification.xp_25_bonus')
      persistLevelCompletion()
      if (sfxEnabled) playSfx('xp--level-up')
      speak('celebration.level_complete')
      setScreen('done')
    }
  }, [feedback, lives, stepIndex, steps, navigate, sfxEnabled, playSfx, speak])

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
      // current_formula_level = next level to work on (highest completed + 1).
      // Uses Math.max so replaying an earlier level never decrements the pointer.
      const prevCurrentLevel = c?.current_formula_level ?? 1
      const newCurrentLevel  = Math.max(prevCurrentLevel, newHighest + 1)

      await supabase
        .from('formula_progress')
        .upsert({
          pupil_id:               pupilId,
          highest_level_reached:  newHighest,
          current_formula_level:  newCurrentLevel,
          current_pwp_level_id:   level.id + 1,
          total_xp:               (c?.total_xp ?? 0) + sessionXp,
          streak_days:            newStreak,
          last_session_date:      todayISO,
          longest_streak:         newLongest,
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

  // ── Step-type audio: play correct Alistair key when each step loads ─────────
  // Keys match TTS_MANIFEST entries (Alistair instructional voice).
  useEffect(() => {
    if (screen !== 'step' || !steps[stepIndex]) return
    const STEP_AUDIO_KEY: Record<string, string> = {
      new_element:    'step.new_element_intro',
      consolidation:  'step.consolidation_intro',
      transition:     'step.transition_arrow',
      three_stage:    'step.three_stage',
      tense_variety:  'step.tense_variety',
    }
    const key = STEP_AUDIO_KEY[steps[stepIndex].step_type] ?? 'step.new_element_intro'
    const tid = window.setTimeout(() => speak(key), 450)
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
          xpBonus={XP_LEVEL_BONUS}
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
      onHintUsed={() => { /* hints are free — no action needed */ }}
      onPartsChange={parts => { paragraphPartsRef.current = parts }}
      onSpeak={speak}
      xpFloaterKey={xpFloaterKey}
      xpFloaterAmount={xpFloaterAmt}
    />
  )
}
