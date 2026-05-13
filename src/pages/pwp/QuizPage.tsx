// PWP Mastery Quiz screen — Phase 12
//
// Flow: intro → prompt loop (free-write + AI/client assessment) → results
// Tables written: pwp_quiz_results (per-prompt JSONB) + pwp_quiz_attempts (aggregate)
// XP: 5 per correct + 30 bonus for passing (≥70%)
// No hints — this is assessment mode.

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { assessStep } from '@/lib/pwp/pwpApi'
import { useTTS } from '@/hooks/useTTS'
import { usePWPAudioPlayer } from '@/hooks/usePWPAudio'
import { useSettingsStore } from '@/stores/settingsStore'
import { PWPBadgeToast } from '@/components/pwp/gamification/PWPBadgeToast'
import { usePWPBadgeCheck } from '@/hooks/usePWPBadgeCheck'
import type { BadgeInfo } from '@/hooks/usePWPBadgeCheck'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const XP_PER_CORRECT = 5
const XP_PASS_BONUS  = 30
const PASS_THRESHOLD = 0.7   // 70% correct to pass

// ─── TYPES ───────────────────────────────────────────────────────────────────

type Screen = 'loading' | 'intro' | 'prompt' | 'results'

type PromptFeedback = 'idle' | 'correct' | 'incorrect' | 'checking'

interface Quiz {
  id: number
  quiz_number: number
  title: string
  inserted_after_level: number
}

interface QuizPrompt {
  id: number
  quiz_id: number
  prompt_number: number
  subject: string
  verb: string
  instruction: string
  target_sentence: string
  sort_order: number
}

interface PromptResult {
  prompt_id:     number
  prompt_number: number
  submitted:     string
  target:        string
  passed:        boolean
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

function clientCheck(submitted: string, target: string): boolean {
  const norm = (s: string) =>
    s.trim().replace(/[.!?…]+$/, '').replace(/\s+/g, ' ').toLowerCase()
  return norm(submitted) === norm(target)
}

function scoreLabel(score: number, total: number): string {
  const pct = score / total
  if (pct === 1)   return 'Perfect! 🌟'
  if (pct >= 0.9)  return 'Excellent! 🎉'
  if (pct >= 0.7)  return 'Well done! ✅'
  if (pct >= 0.5)  return 'Nearly there…'
  return 'Keep practising!'
}

// ─── QUIZ INTRO SCREEN ────────────────────────────────────────────────────────

interface IntroProps {
  quiz:    Quiz
  prompts: QuizPrompt[]
  onStart: () => void
  onBack:  () => void
}

function QuizIntroScreen({ quiz, prompts, onStart, onBack }: IntroProps) {
  return (
    <div className="min-h-screen bg-[#FDF8EE] flex items-center justify-center p-4">
      <div
        className="w-full max-w-[640px] rounded-[20px] overflow-hidden"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
      >
        {/* Gold header */}
        <div
          className="px-7 py-5 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #F5A623, #F5C500)' }}
        >
          <div className="flex items-center gap-3">
            <button
              className="text-white/70 text-[13px] hover:text-white transition-colors"
              onClick={onBack}
              aria-label="Back to your learning path"
              data-tts="Back to your path"
            >
              <span aria-hidden="true">←</span> Path
            </button>
            <div>
              <div className="text-white font-extrabold text-[18px]">
                Quiz {quiz.quiz_number} — {quiz.title}
              </div>
              <div className="text-white/75 text-[12px] mt-[1px]">
                Mastery checkpoint
              </div>
            </div>
          </div>
          <div className="bg-white/20 rounded-xl px-4 py-2 text-white text-[13px] font-bold">
            ⭐ Checkpoint
          </div>
        </div>

        {/* Body */}
        <div className="bg-[#FDF8EE] p-7">
          {/* Info row */}
          <div className="flex gap-4 mb-6">
            {[
              { icon: '📝', label: 'Prompts',   val: String(prompts.length) },
              { icon: '✅', label: 'To pass',    val: `${Math.ceil(prompts.length * PASS_THRESHOLD)}/${prompts.length}` },
              { icon: '⭐', label: 'XP on pass', val: `+${prompts.length * XP_PER_CORRECT + XP_PASS_BONUS}` },
            ].map(({ icon, label, val }) => (
              <div
                key={label}
                className="flex-1 bg-white rounded-xl px-4 py-3 text-center"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              >
                <div className="text-[22px] mb-1">{icon}</div>
                <div className="text-[18px] font-extrabold text-[#2D3436]">{val}</div>
                <div className="text-[10px] text-[#aaa] font-semibold uppercase tracking-wide">{label}</div>
              </div>
            ))}
          </div>

          {/* Prompt list preview */}
          <div className="text-[11px] font-bold text-[#aaa] uppercase tracking-wide mb-3">
            What you'll be asked to do
          </div>
          <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1 mb-6">
            {prompts.map((p, i) => (
              <div
                key={p.id}
                className="bg-white rounded-[10px] px-4 py-[10px] flex items-center gap-3"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 text-white"
                  style={{ background: '#F5A623' }}
                >
                  {i + 1}
                </div>
                <div className="text-[12px] text-[#2D3436] flex-1">{p.instruction}</div>
              </div>
            ))}
          </div>

          {/* Rules note */}
          <div
            className="bg-[#fff8e6] border border-[#F5C50050] rounded-xl px-4 py-3 text-[12px] text-[#854d0e] mb-6"
            data-tts="Quiz rules: no hints allowed"
          >
            💡 This is a <strong>test</strong> — no hints are available. Take your time and do your best!
          </div>

          <motion.button
            className="w-full py-4 rounded-2xl text-white font-extrabold text-[17px]"
            style={{
              background: 'linear-gradient(135deg, #F5A623, #F5C500)',
              boxShadow: '0 4px 16px rgba(245,166,35,0.45)',
            }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStart}
            data-tts={`Start Quiz ${quiz.quiz_number}`}
          >
            Start Quiz {quiz.quiz_number} →
          </motion.button>
        </div>
      </div>
    </div>
  )
}

// ─── PROMPT SCREEN ────────────────────────────────────────────────────────────

interface PromptScreenProps {
  quiz:          Quiz
  prompt:        QuizPrompt
  promptIndex:   number
  totalPrompts:  number
  feedback:      PromptFeedback
  feedbackMsg:   string
  value:         string
  onChange:      (v: string) => void
  onSubmit:      () => void
  onContinue:    () => void
  onBack:        () => void
  correctSoFar:  number
  onSpeak:       (text: string) => void
}

function PromptScreen({
  quiz, prompt, promptIndex, totalPrompts,
  feedback, feedbackMsg, value, onChange,
  onSubmit, onContinue, onBack, correctSoFar, onSpeak,
}: PromptScreenProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isChecking  = feedback === 'checking'
  const hasResult   = feedback === 'correct' || feedback === 'incorrect'
  const progressPct = Math.round((promptIndex / totalPrompts) * 100)
  const { ttsEnabled, setTtsEnabled } = useSettingsStore()

  useEffect(() => {
    if (feedback === 'idle') textareaRef.current?.focus()
  }, [promptIndex, feedback])

  return (
    <div className="min-h-screen bg-[#FDF8EE] flex flex-col items-center justify-center p-4">
      <div
        className="w-full max-w-[680px] rounded-[20px] overflow-hidden"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
      >
        {/* Gold header */}
        <div
          className="px-6 py-[14px] flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, #F5A623, #F5C500)' }}
        >
          <div
            className="bg-white/20 text-white rounded-[8px] px-[10px] py-[5px] text-[12px] font-bold flex-shrink-0"
            data-tts={`${correctSoFar} correct so far`}
          >
            ✓ {correctSoFar}
          </div>

          <div className="flex-1">
            <div className="flex justify-between text-white/60 text-[10px] mb-1">
              <span>Q{promptIndex + 1} of {totalPrompts}</span>
              <span>{quiz.title}</span>
            </div>
            <div className="bg-white/25 rounded h-2">
              <motion.div
                className="h-2 rounded bg-white"
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          <div className="bg-white/20 text-white rounded-[8px] px-[10px] py-[5px] text-[12px] font-bold flex-shrink-0">
            Quiz {quiz.quiz_number}
          </div>

          {/* TTS toggle */}
          <button
            className="bg-white/20 rounded-[8px] w-[30px] h-[30px] flex items-center justify-center text-[15px] flex-shrink-0 transition-opacity"
            style={{ opacity: ttsEnabled ? 1 : 0.45 }}
            onClick={() => {
              const next = !ttsEnabled
              setTtsEnabled(next)
              if (next) onSpeak(prompt.instruction)
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
          {/* Step dots */}
          <div className="flex gap-1 mb-5 justify-center">
            {Array.from({ length: totalPrompts }).map((_, i) => (
              <div
                key={i}
                className="h-[6px] rounded-sm transition-all duration-300"
                style={{
                  width: i === promptIndex ? 28 : 24,
                  background:
                    i < promptIndex  ? '#F5A623' :
                    i === promptIndex ? '#F5C500' :
                    '#e0d8ff',
                }}
              />
            ))}
          </div>

          {/* Instruction card */}
          <div
            className="bg-white rounded-2xl px-5 py-4 mb-4 border-l-[6px]"
            style={{ borderColor: '#F5A623', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[1px] mb-1 text-[#d4700a]">
                  Your task
                </div>
                <div
                  className="text-[17px] font-bold text-[#2D3436] leading-[1.4]"
                  data-tts={prompt.instruction}
                >
                  {prompt.instruction}
                </div>
              </div>
              {/* Re-read instruction button */}
              <button
                className="flex-shrink-0 w-[32px] h-[32px] rounded-[8px] flex items-center justify-center text-[16px] transition-colors mt-[2px]"
                style={{ background: '#F5A62318', color: '#d4700a' }}
                onClick={() => onSpeak(prompt.instruction)}
                aria-label="Hear the instruction read aloud"
                data-tts="Read instruction aloud"
              >
                <span aria-hidden="true">🔊</span>
              </button>
            </div>
          </div>

          {/* Subject / verb context */}
          {(prompt.subject !== '—' || prompt.verb !== '—') && (
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {prompt.subject !== '—' && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[#aaa] uppercase tracking-wide">Subject:</span>
                  <div
                    className="bg-[#FEF9C3] rounded-[8px] px-3 py-[6px] text-[13px] font-semibold text-[#854d0e]"
                    data-tts={`Subject: ${prompt.subject}`}
                  >
                    {prompt.subject}
                  </div>
                </div>
              )}
              {prompt.verb !== '—' && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[#aaa] uppercase tracking-wide">Verb:</span>
                  <div
                    className="bg-[#FFEDD5] rounded-[8px] px-3 py-[6px] text-[13px] font-semibold text-[#9A3412]"
                    data-tts={`Verb: ${prompt.verb}`}
                  >
                    {prompt.verb}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Free-write textarea */}
          <textarea
            ref={textareaRef}
            className="w-full border-2 rounded-xl px-4 py-3 text-[16px] text-[#2D3436] outline-none font-[inherit] resize-none transition-colors bg-white"
            style={{
              borderColor: hasResult
                ? (feedback === 'correct' ? '#00b894' : '#F5A623')
                : '#e0d8ff',
            }}
            placeholder="Write your sentence here…"
            value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={e => { if (!hasResult) e.target.style.borderColor = '#F5A623' }}
            onBlur={e => { if (!hasResult) e.target.style.borderColor = '#e0d8ff' }}
            rows={3}
            disabled={hasResult || isChecking}
            data-tts="Write your sentence"
          />

          {/* Feedback overlay — role="status" announces result to screen readers */}
          <AnimatePresence>
            {hasResult && (
              <motion.div
                className="mt-3 rounded-2xl px-5 py-4 flex items-start gap-3"
                style={{
                  background: feedback === 'correct' ? '#e0faf4' : '#fff8e6',
                  border: `2px solid ${feedback === 'correct' ? '#00b894' : '#F5A623'}`,
                }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <span className="text-[26px] flex-shrink-0" aria-hidden="true">
                  {feedback === 'correct' ? '✅' : '💡'}
                </span>
                <div className="flex-1">
                  <div
                    className="text-[15px] font-extrabold mb-1"
                    style={{ color: feedback === 'correct' ? '#00b894' : '#d4700a' }}
                  >
                    {feedback === 'correct' ? `Correct! +${XP_PER_CORRECT} XP` : 'Not quite — moving on'}
                  </div>
                  <div className="text-[13px] text-[#2D3436] leading-[1.5]">{feedbackMsg}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action buttons */}
          <div className="flex gap-3 mt-4">
            <button
              className="flex-1 bg-white border-2 border-[#e0d8ff] rounded-xl py-3 text-[13px] font-semibold text-[#6C5CE7] flex items-center justify-center gap-2 hover:bg-[#f0ecff] transition-colors"
              onClick={onBack}
              data-tts="Exit quiz"
            >
              ← Exit
            </button>

            {hasResult ? (
              <motion.button
                className="flex-[2] rounded-xl py-3 text-white font-bold text-[15px]"
                style={{
                  background: feedback === 'correct'
                    ? 'linear-gradient(135deg, #00b894, #00cec9)'
                    : 'linear-gradient(135deg, #F5A623, #F5C500)',
                  boxShadow: feedback === 'correct'
                    ? '0 3px 12px rgba(0,184,148,0.4)'
                    : '0 3px 12px rgba(245,166,35,0.4)',
                }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={onContinue}
                data-tts={promptIndex < totalPrompts - 1 ? 'Next question' : 'See results'}
              >
                {promptIndex < totalPrompts - 1 ? 'Next →' : 'See Results →'}
              </motion.button>
            ) : (
              <motion.button
                className="flex-[2] rounded-xl py-3 text-white font-bold text-[15px] disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #F5A623, #F5C500)',
                  boxShadow: '0 3px 12px rgba(245,166,35,0.4)',
                }}
                whileHover={!isChecking && value.trim() ? { scale: 1.01 } : {}}
                whileTap={!isChecking && value.trim() ? { scale: 0.98 } : {}}
                onClick={onSubmit}
                disabled={isChecking || !value.trim()}
                data-tts="Submit your answer"
              >
                {isChecking ? (
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
    </div>
  )
}

// ─── RESULTS SCREEN ───────────────────────────────────────────────────────────

interface ResultsProps {
  quiz:     Quiz
  results:  PromptResult[]
  xpEarned: number
  onBack:   () => void
  onRetry:  () => void
}

function QuizResultsScreen({ quiz, results, xpEarned, onBack, onRetry }: ResultsProps) {
  const correct = results.filter(r => r.passed).length
  const total   = results.length
  const passed  = correct / total >= PASS_THRESHOLD
  const ACCENT  = passed ? '#F5A623' : '#6C5CE7'

  return (
    <div className="min-h-screen bg-[#FDF8EE] flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-[560px] bg-white rounded-[24px] overflow-hidden"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      >
        {/* Coloured header */}
        <div
          className="px-7 py-6 text-center"
          style={{ background: `linear-gradient(135deg, ${ACCENT}, ${passed ? '#F5C500' : '#a29bf5'})` }}
        >
          <motion.div
            className="text-[52px] mb-1"
            animate={passed ? { rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {passed ? '🏆' : '📚'}
          </motion.div>
          <div className="text-white font-extrabold text-[20px]">
            {passed ? `Quiz ${quiz.quiz_number} Passed!` : `Quiz ${quiz.quiz_number} — Try Again`}
          </div>
          <div className="text-white/75 text-[13px] mt-1">{quiz.title}</div>
        </div>

        <div className="p-7">
          {/* Score card */}
          <div
            className="rounded-2xl px-6 py-4 mb-5 text-center"
            style={{ background: `${ACCENT}12`, border: `2px solid ${ACCENT}35` }}
          >
            <div className="text-[44px] font-extrabold" style={{ color: ACCENT }}>
              {correct}/{total}
            </div>
            <div className="text-[14px] font-semibold text-[#555] mt-1">
              {scoreLabel(correct, total)}
            </div>
            {xpEarned > 0 && (
              <div className="inline-flex items-center gap-2 mt-3 bg-[#F5C50020] rounded-xl px-4 py-2">
                <span className="text-[20px]">⭐</span>
                <span className="text-[16px] font-extrabold text-[#d4700a]">+{xpEarned} XP</span>
              </div>
            )}
          </div>

          {/* Per-prompt breakdown */}
          <div className="text-[11px] font-bold text-[#aaa] uppercase tracking-wide mb-3">
            Your answers
          </div>
          <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 mb-6">
            {results.map((r, i) => (
              <div
                key={r.prompt_id}
                className="bg-[#fafafa] rounded-[10px] px-4 py-3 flex items-start gap-3"
                style={{ border: `1.5px solid ${r.passed ? '#86efac' : '#fed7aa'}` }}
              >
                <span className="text-[18px] flex-shrink-0 mt-[1px]">
                  {r.passed ? '✅' : '❌'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-[#aaa] font-semibold mb-[2px]">Q{i + 1}</div>
                  <div className="text-[13px] text-[#2D3436] truncate">{r.submitted || '—'}</div>
                  {!r.passed && (
                    <div className="text-[11px] text-[#888] italic mt-[2px] truncate">
                      Model: {r.target}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              className="flex-1 bg-white border-2 border-[#e0d8ff] rounded-xl py-3 text-[13px] font-semibold text-[#6C5CE7] hover:bg-[#f0ecff] transition-colors"
              onClick={onBack}
              data-tts="Back to your learning path"
            >
              ← My Path
            </button>
            {!passed ? (
              <motion.button
                className="flex-[2] rounded-xl py-3 text-white font-bold text-[15px]"
                style={{
                  background: 'linear-gradient(135deg, #F5A623, #F5C500)',
                  boxShadow: '0 3px 12px rgba(245,166,35,0.4)',
                }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={onRetry}
                data-tts="Try the quiz again"
              >
                Try Again →
              </motion.button>
            ) : (
              <motion.button
                className="flex-[2] rounded-xl py-3 text-white font-bold text-[15px]"
                style={{
                  background: 'linear-gradient(135deg, #F5A623, #F5C500)',
                  boxShadow: '0 3px 12px rgba(245,166,35,0.4)',
                }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={onBack}
                data-tts="Continue your learning path"
              >
                Keep Going! →
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>()
  const navigate   = useNavigate()

  // ── Audio ─────────────────────────────────────────────────────────────────
  const { speak, stop: stopTts } = useTTS()
  const { play: playSfx }        = usePWPAudioPlayer()
  const { sfxEnabled }           = useSettingsStore()

  // ── Gamification ──────────────────────────────────────────────────────────
  const { checkAndAward }                    = usePWPBadgeCheck()
  const [pendingBadge, setPendingBadge]      = useState<BadgeInfo | null>(null)

  const [screen,       setScreen]       = useState<Screen>('loading')
  const [quiz,         setQuiz]         = useState<Quiz | null>(null)
  const [prompts,      setPrompts]      = useState<QuizPrompt[]>([])
  const [promptIndex,  setPromptIndex]  = useState(0)
  const [value,        setValue]        = useState('')
  const [feedback,     setFeedback]     = useState<PromptFeedback>('idle')
  const [feedbackMsg,  setFeedbackMsg]  = useState('')
  const [correctSoFar, setCorrectSoFar] = useState(0)
  const [results,      setResults]      = useState<PromptResult[]>([])
  const [xpEarned,     setXpEarned]     = useState(0)
  const [loadError,    setLoadError]    = useState<string | null>(null)

  // capture latest results in a ref so finishQuiz can read them synchronously
  const resultsRef = useRef<PromptResult[]>([])

  // ── Load quiz + prompts ───────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const id = Number(quizId)
      if (!id) { navigate('/dashboard'); return }
      try {
        const { data: quizData, error: qErr } = await supabase
          .from('pwp_quizzes')
          .select('*')
          .eq('id', id)
          .single()
        if (qErr || !quizData) throw new Error('Quiz not found')

        const { data: promptsData, error: pErr } = await supabase
          .from('pwp_quiz_prompts')
          .select('*')
          .eq('quiz_id', id)
          .order('sort_order')
        if (pErr) throw new Error('Could not load prompts')

        setQuiz(quizData as Quiz)
        setPrompts((promptsData ?? []) as QuizPrompt[])
        setScreen('intro')
      } catch (err) {
        console.error('[QuizPage] load error:', err)
        setLoadError('Could not load this quiz. Please go back and try again.')
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId])

  // ── Submit prompt answer ──────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!quiz || !prompts[promptIndex] || feedback !== 'idle') return
    const prompt  = prompts[promptIndex]
    const trimmed = value.trim()
    if (!trimmed) return

    setFeedback('checking')

    try {
      let passed: boolean
      let message: string

      try {
        const result = await assessStep({
          sentence:     trimmed,
          formulaLabel: prompt.instruction,
          elementCode:  String(prompt.id),
          subjectNoun:  prompt.subject !== '—' ? prompt.subject : undefined,
          attemptNumber: 1,
        })
        passed  = result.passed
        message = result.feedback
      } catch {
        passed  = clientCheck(trimmed, prompt.target_sentence)
        message = passed
          ? 'Great — your sentence fits the pattern!'
          : `Model answer: "${prompt.target_sentence}"`
      }

      if (passed) setCorrectSoFar(c => c + 1)

      const newResult: PromptResult = {
        prompt_id:     prompt.id,
        prompt_number: prompt.prompt_number,
        submitted:     trimmed,
        target:        prompt.target_sentence,
        passed,
      }
      setResults(prev => {
        const updated = [...prev, newResult]
        resultsRef.current = updated
        return updated
      })

      setFeedbackMsg(message)
      setFeedback(passed ? 'correct' : 'incorrect')
      if (sfxEnabled) playSfx(passed ? 'feedback--correct' : 'feedback--try-again')
    } catch (err) {
      console.error('[QuizPage] assess error:', err)
      setFeedback('idle')
    }
  }, [quiz, prompts, promptIndex, value, feedback, sfxEnabled, playSfx])

  // ── Advance or finish ─────────────────────────────────────────────────────
  const handleContinue = useCallback(async () => {
    const nextIndex = promptIndex + 1
    if (nextIndex < prompts.length) {
      setPromptIndex(nextIndex)
      setValue('')
      setFeedback('idle')
      setFeedbackMsg('')
    } else {
      // All prompts done — use ref for synchronous access to full results
      const allResults = resultsRef.current
      const correct    = allResults.filter(r => r.passed).length
      const total      = prompts.length
      const passed     = correct / total >= PASS_THRESHOLD
      const xp         = passed
        ? correct * XP_PER_CORRECT + XP_PASS_BONUS
        : correct * XP_PER_CORRECT

      setXpEarned(xp)
      if (passed && sfxEnabled) playSfx('xp--level-up')
      setScreen('results')

      // Persist
      const pupilId = getPupilId()
      if (!pupilId || !quiz) return
      try {
        await supabase.from('pwp_quiz_results').insert({
          quiz_id:        quiz.id,
          pupil_id:       pupilId,
          prompts:        allResults,
          overall_passed: passed,
          completed_at:   new Date().toISOString(),
        })

        const { data: prev } = await supabase
          .from('pwp_quiz_attempts')
          .select('attempt_number')
          .eq('pupil_id', pupilId)
          .eq('quiz_id', quiz.id)
          .order('attempt_number', { ascending: false })
          .limit(1)
          .maybeSingle()

        const attemptNumber = ((prev as any)?.attempt_number ?? 0) + 1 // eslint-disable-line @typescript-eslint/no-explicit-any

        await supabase.from('pwp_quiz_attempts').insert({
          pupil_id:       pupilId,
          quiz_id:        quiz.id,
          attempt_number: attemptNumber,
          score:          correct,
          total_prompts:  total,
          passed,
          xp_earned:      xp,
        })

        if (xp > 0) {
          const { data: fp } = await supabase
            .from('formula_progress')
            .select('total_xp, streak_days, highest_level_reached')
            .eq('pupil_id', pupilId)
            .maybeSingle()
          const currentXp = ((fp as any)?.total_xp ?? 0) // eslint-disable-line @typescript-eslint/no-explicit-any
          await supabase
            .from('formula_progress')
            .upsert({ pupil_id: pupilId, total_xp: currentXp + xp }, { onConflict: 'pupil_id' })

          // Award quiz-pass badge on first pass
          if (passed) {
            const streakDays          = (fp as any)?.streak_days ?? 0 // eslint-disable-line @typescript-eslint/no-explicit-any
            const highestLevelReached = (fp as any)?.highest_level_reached ?? 0 // eslint-disable-line @typescript-eslint/no-explicit-any
            const newBadges = await checkAndAward({
              highestLevelReached,
              streakDays,
              isFirstLevel: false,
              isQuizPass:   true,
            })
            if (newBadges.length > 0) setPendingBadge(newBadges[0])
          }
        }
      } catch (err) {
        console.error('[QuizPage] persist error:', err)
      }
    }
  }, [promptIndex, prompts, quiz, checkAndAward])

  // ── Retry — reset all state ───────────────────────────────────────────────
  const handleRetry = () => {
    setPromptIndex(0)
    setValue('')
    setFeedback('idle')
    setFeedbackMsg('')
    setCorrectSoFar(0)
    setResults([])
    resultsRef.current = []
    setXpEarned(0)
    setPendingBadge(null)
    setScreen('intro')
  }

  // ── Ctrl+Enter keyboard shortcut ──────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.ctrlKey && screen === 'prompt' && feedback === 'idle' && value.trim()) {
        handleSubmit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screen, feedback, value, handleSubmit])

  // ── Auto-speak instruction on each new prompt ────────────────────────────
  useEffect(() => {
    if (screen !== 'prompt' || !prompts[promptIndex]) return
    const tid = window.setTimeout(() => speak(prompts[promptIndex].instruction), 450)
    return () => window.clearTimeout(tid)
  }, [promptIndex, screen]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stop TTS when navigating away from the prompt screen ─────────────────
  useEffect(() => {
    if (screen !== 'prompt') stopTts()
  }, [screen]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ────────────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#FDF8EE] flex flex-col items-center justify-center gap-4 p-6">
        <div className="text-[48px]">😔</div>
        <p className="text-[#F5A623] font-bold text-[18px] text-center">{loadError}</p>
        <button
          className="px-6 py-3 bg-[#F5A623] text-white rounded-xl font-bold"
          onClick={() => navigate('/dashboard')}
        >
          ← Back to Dashboard
        </button>
      </div>
    )
  }

  if (screen === 'loading' || !quiz) {
    return (
      <div className="min-h-screen bg-[#FDF8EE] flex items-center justify-center">
        <motion.div
          className="w-12 h-12 rounded-full border-4 border-[#F5A623] border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    )
  }

  if (screen === 'intro') {
    return (
      <QuizIntroScreen
        quiz={quiz}
        prompts={prompts}
        onStart={() => setScreen('prompt')}
        onBack={() => navigate('/dashboard')}
      />
    )
  }

  if (screen === 'results') {
    return (
      <>
        <QuizResultsScreen
          quiz={quiz}
          results={results}
          xpEarned={xpEarned}
          onBack={() => navigate('/dashboard')}
          onRetry={handleRetry}
        />
        <PWPBadgeToast
          badge={pendingBadge}
          onDismiss={() => setPendingBadge(null)}
        />
      </>
    )
  }

  // screen === 'prompt'
  return (
    <PromptScreen
      quiz={quiz}
      prompt={prompts[promptIndex]}
      promptIndex={promptIndex}
      totalPrompts={prompts.length}
      feedback={feedback}
      feedbackMsg={feedbackMsg}
      value={value}
      onChange={setValue}
      onSubmit={handleSubmit}
      onContinue={handleContinue}
      onBack={() => navigate('/dashboard')}
      correctSoFar={correctSoFar}
      onSpeak={speak}
    />
  )
}
