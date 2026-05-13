// PWP Onboarding — first-login walkthrough
//
// Shown once to every new pupil (formula_progress.pwp_onboarding_complete = false).
// DashboardPage redirects here; this page sets the flag and redirects back.
//
// Slides:
//   0 — Welcome
//   1 — How the programme works
//   2 — Interactive demo (word-bank preview — L1 demo)
//   3 — Streaks & XP explainer
//   4 — You're ready!

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

// ─── COLOURS ─────────────────────────────────────────────────────────────────

const C = {
  bg:      '#FDF8EE',
  primary: '#6C5CE7',
  gold:    '#F5A623',
  green:   '#2ECC71',
  text:    '#2D2D2D',
  muted:   '#666',
  border:  '#E8E0D0',
  card:    '#FFFFFF',
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getPupilId(): string | null {
  try {
    const raw = localStorage.getItem('pupilSession')
    if (raw) { const p = JSON.parse(raw); return p.pupilId ?? p.id ?? null }
  } catch { /* ignore */ }
  return null
}

// ─── DEMO WORD BANK (Slide 2) ─────────────────────────────────────────────────
//
// Shows a simplified L1 Build-mode: colour-coded tiles that the pupil
// taps to assemble into the sentence slot. Read-only / demonstration only —
// no DB calls, just local React state.

const DEMO_TILES = [
  { id: 'a', word: 'The',    colour: '#A855F7', wc: 'Determiner' },
  { id: 'b', word: 'dog',    colour: '#3B82F6', wc: 'Noun'       },
  { id: 'c', word: 'ran',    colour: '#F59E0B', wc: 'Verb'       },
  { id: 'd', word: 'quickly',colour: '#10B981', wc: 'Adverb'     },
]

const DEMO_ANSWER = ['a', 'b', 'c'] // correct minimal answer (det + noun + verb)

function DemoWordBank() {
  const [slotIds, setSlotIds]     = useState<string[]>([])
  const [feedback, setFeedback]   = useState<'correct' | 'try' | null>(null)

  function tap(id: string) {
    if (slotIds.includes(id)) return
    setSlotIds(prev => [...prev, id])
    setFeedback(null)
  }

  function removeFromSlot(id: string) {
    setSlotIds(prev => prev.filter(x => x !== id))
    setFeedback(null)
  }

  function check() {
    const joined = slotIds.join(',')
    const correct = DEMO_ANSWER.every(id => slotIds.includes(id))
    setFeedback(correct ? 'correct' : 'try')
    if (!correct) {
      setTimeout(() => { setSlotIds([]); setFeedback(null) }, 1200)
    }
  }

  function reset() { setSlotIds([]); setFeedback(null) }

  const tileMap = Object.fromEntries(DEMO_TILES.map(t => [t.id, t]))

  return (
    <div className="w-full max-w-sm mx-auto">
      <p className="text-xs font-semibold text-center mb-3" style={{ color: C.muted }}>
        L1 formula: <span style={{ color: C.primary }}>Noun + Verb (past tense)</span>
      </p>

      {/* Sentence slot */}
      <div
        className="min-h-[52px] rounded-2xl flex flex-wrap gap-2 items-center px-3 py-2 mb-3"
        style={{
          border:     `2px dashed ${feedback === 'correct' ? C.green : feedback === 'try' ? '#EF4444' : C.border}`,
          background: feedback === 'correct' ? '#F0FDF4' : feedback === 'try' ? '#FEF2F2' : '#F8F5EE',
        }}
      >
        {slotIds.length === 0 ? (
          <span className="text-sm" style={{ color: C.muted }}>Tap tiles to build your sentence…</span>
        ) : (
          slotIds.map(id => (
            <button
              key={id}
              onClick={() => removeFromSlot(id)}
              className="rounded-xl px-3 py-1 text-sm font-bold text-white"
              style={{ background: tileMap[id].colour }}
              aria-label={`Remove ${tileMap[id].word} from sentence`}
              data-tts={tileMap[id].word}
            >
              {tileMap[id].word}
            </button>
          ))
        )}
      </div>

      {/* Word tiles */}
      <div
        className="flex flex-wrap gap-2 justify-center mb-4"
        role="group"
        aria-label="Word class tiles — tap to add to sentence"
      >
        {DEMO_TILES.map(t => (
          <button
            key={t.id}
            onClick={() => tap(t.id)}
            disabled={slotIds.includes(t.id)}
            className="rounded-xl px-3 py-2 text-sm font-bold text-white transition-opacity"
            style={{
              background: t.colour,
              opacity:    slotIds.includes(t.id) ? 0.35 : 1,
            }}
            aria-label={`${t.wc}: ${t.word}${slotIds.includes(t.id) ? ' (already added)' : ''}`}
            aria-pressed={slotIds.includes(t.id)}
            data-tts={t.word}
          >
            <span className="block text-[9px] opacity-70 uppercase tracking-wide leading-none mb-[2px]" aria-hidden="true">
              {t.wc}
            </span>
            {t.word}
          </button>
        ))}
      </div>

      {/* Feedback message */}
      <AnimatePresence>
        {feedback && (
          <motion.p
            key={feedback}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{   opacity: 0 }}
            className="text-center text-sm font-bold mb-3"
            style={{ color: feedback === 'correct' ? C.green : '#EF4444' }}
          >
            {feedback === 'correct' ? '✓ Great sentence! The dog ran.' : '✗ Not quite — try again!'}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex gap-2 justify-center">
        {feedback !== 'correct' && (
          <button
            onClick={check}
            disabled={slotIds.length === 0}
            className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-opacity"
            style={{ background: C.primary, opacity: slotIds.length === 0 ? 0.4 : 1 }}
            data-testid="demo-check-btn"
          >
            Check ✓
          </button>
        )}
        <button
          onClick={reset}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-70"
          style={{ border: `1px solid ${C.border}`, color: C.muted }}
          data-testid="demo-reset-btn"
        >
          Reset
        </button>
      </div>
    </div>
  )
}

// ─── SLIDES ───────────────────────────────────────────────────────────────────

interface SlideProps {
  name: string | null
}

function Slide0Welcome({ name }: SlideProps) {
  return (
    <div className="text-center space-y-4">
      <div className="text-6xl mb-2">✍️</div>
      <h1 className="font-extrabold text-2xl leading-tight" style={{ color: C.text }}>
        Welcome to WriFe PWP
        {name && (
          <span style={{ color: C.primary }}>, {name}</span>
        )}
        !
      </h1>
      <p className="text-base leading-relaxed max-w-xs mx-auto" style={{ color: C.muted }}>
        The <strong style={{ color: C.text }}>Personal Writing Programme</strong> helps you build brilliant sentences
        one formula at a time — like learning the moves before you play the game.
      </p>
      <div
        className="inline-block rounded-2xl px-4 py-2 text-sm font-semibold mt-2"
        style={{ background: '#EDE9FE', color: C.primary }}
      >
        35 levels · 13 quizzes · Badges & streaks
      </div>
    </div>
  )
}

function Slide1HowItWorks() {
  const steps = [
    { icon: '🎯', title: 'Learn a formula',    body: 'Every level teaches one new sentence pattern — from simple nouns to embedded clauses.' },
    { icon: '🧩', title: 'Build sentences',    body: 'Colour-coded tiles show you the word classes. Arrange them into the right order.' },
    { icon: '✅', title: 'Get instant feedback', body: "The app checks your sentence straight away. Correct it until it's perfect." },
    { icon: '🚀', title: 'Move up a level',    body: 'Hit 80% accuracy and you unlock the next formula. Work through all 35 to become a Formula Master.' },
  ]
  return (
    <div className="space-y-4">
      <h2 className="font-extrabold text-xl text-center mb-4" style={{ color: C.text }}>
        How it works
      </h2>
      {steps.map(s => (
        <div key={s.title} className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0 mt-0.5">{s.icon}</span>
          <div>
            <p className="font-bold text-sm" style={{ color: C.text }}>{s.title}</p>
            <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{s.body}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function Slide2Demo() {
  return (
    <div className="space-y-4">
      <h2 className="font-extrabold text-xl text-center" style={{ color: C.text }}>
        Try it yourself
      </h2>
      <p className="text-sm text-center" style={{ color: C.muted }}>
        Tap the coloured tiles to build a sentence. The formula is{' '}
        <span style={{ color: C.primary, fontWeight: 700 }}>Determiner + Noun + Verb</span>.
      </p>
      <DemoWordBank />
    </div>
  )
}

function Slide3Rewards() {
  const items = [
    {
      icon: '⚡',
      bg:   '#FFF7ED',
      border: '#FB923C',
      text:  '#C2410C',
      title: 'Earn XP',
      body:  'Every correct sentence earns experience points. The faster you get it right, the more XP you earn.',
    },
    {
      icon: '🔥',
      bg:   '#FEF2F2',
      border: '#FCA5A5',
      text:  '#DC2626',
      title: 'Keep your streak',
      body:  'Practise every day to build a streak. Miss a day and it resets — so keep the fire burning!',
    },
    {
      icon: '🏅',
      bg:   '#F0FDF4',
      border: '#86EFAC',
      text:  '#166534',
      title: 'Unlock badges',
      body:  'Hit milestones like a 7-day streak or Level 10 to earn rare badges. Collect them all!',
    },
  ]
  return (
    <div className="space-y-4">
      <h2 className="font-extrabold text-xl text-center mb-2" style={{ color: C.text }}>
        Streaks, XP & Badges
      </h2>
      {items.map(item => (
        <div
          key={item.title}
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{ background: item.bg, border: `1.5px solid ${item.border}` }}
        >
          <span className="text-2xl flex-shrink-0">{item.icon}</span>
          <div>
            <p className="font-bold text-sm" style={{ color: item.text }}>{item.title}</p>
            <p className="text-sm leading-relaxed" style={{ color: item.text, opacity: 0.85 }}>
              {item.body}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function Slide4Ready({ name }: SlideProps) {
  return (
    <div className="text-center space-y-5">
      <motion.div
        className="text-7xl"
        animate={{ rotate: [0, -8, 8, -8, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        🚀
      </motion.div>
      <h2 className="font-extrabold text-2xl leading-tight" style={{ color: C.text }}>
        You're all set{name ? `, ${name}` : ''}!
      </h2>
      <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: C.muted }}>
        Your learning path is waiting. Start with <strong style={{ color: C.text }}>Level 1</strong> and
        build one formula at a time. Good luck!
      </p>
      <div className="flex gap-3 justify-center">
        {['🌱', '🔥', '🏅', '🌟', '🏆'].map((e, i) => (
          <motion.span
            key={i}
            className="text-2xl"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.08 }}
          >
            {e}
          </motion.span>
        ))}
      </div>
    </div>
  )
}

// ─── SLIDE WRAPPER ────────────────────────────────────────────────────────────

const SLIDES = [
  { id: 'welcome',    label: 'Welcome'    },
  { id: 'how',        label: 'How it works' },
  { id: 'demo',       label: 'Try it'     },
  { id: 'rewards',    label: 'Rewards'    },
  { id: 'ready',      label: "Let's go!"  },
]

const SLIDE_VARIANTS = {
  enter:   (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center:  { x: 0, opacity: 1 },
  exit:    (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const navigate  = useNavigate()
  const { profile } = useAuthStore()
  const [step, setStep]       = useState(0)
  const [dir,  setDir]        = useState(1)   // +1 = forward, -1 = backward
  const [completing, setCompleting] = useState(false)

  const name = profile?.first_name ?? null
  const isLast = step === SLIDES.length - 1

  function go(newStep: number) {
    setDir(newStep > step ? 1 : -1)
    setStep(newStep)
  }

  function next() {
    if (isLast) { void finish(); return }
    go(step + 1)
  }

  function prev() {
    if (step === 0) return
    go(step - 1)
  }

  async function finish() {
    setCompleting(true)
    try {
      const pupilId = profile?.id ?? getPupilId()
      if (pupilId) {
        // Mark onboarding complete — upsert in case formula_progress row doesn't exist yet
        await supabase
          .from('formula_progress')
          .upsert(
            { pupil_id: pupilId, pwp_onboarding_complete: true },
            { onConflict: 'pupil_id' }
          )
      }
    } catch (err) {
      // Non-fatal — dashboard will redirect again next time if flag isn't set,
      // but don't block the pupil from proceeding.
      console.warn('[OnboardingPage] could not persist completion flag:', err)
    } finally {
      navigate('/dashboard', { replace: true })
    }
  }

  function renderSlide() {
    switch (step) {
      case 0: return <Slide0Welcome  name={name} />
      case 1: return <Slide1HowItWorks />
      case 2: return <Slide2Demo />
      case 3: return <Slide3Rewards />
      case 4: return <Slide4Ready name={name} />
      default: return null
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-8"
      style={{ background: C.bg }}
      data-testid="pwp-onboarding-page"
    >
      {/* Progress dots */}
      <div className="flex gap-2 mb-8">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            className="rounded-full transition-all"
            style={{
              width:      i === step ? 24 : 8,
              height:     8,
              background: i === step ? C.primary : C.border,
            }}
            aria-label={`Go to step ${i + 1}`}
            data-testid={`onboarding-dot-${i}`}
          />
        ))}
      </div>

      {/* Slide card */}
      <div
        className="w-full max-w-sm rounded-3xl p-6 overflow-hidden relative"
        style={{
          background: C.card,
          border:     `1px solid ${C.border}`,
          minHeight:  380,
          boxShadow:  '0 8px 32px rgba(108,92,231,0.10)',
        }}
      >
        <AnimatePresence custom={dir} mode="wait">
          <motion.div
            key={step}
            custom={dir}
            variants={SLIDE_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            data-testid={`onboarding-slide-${step}`}
          >
            {renderSlide()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4 mt-6 w-full max-w-sm">
        {step > 0 ? (
          <button
            onClick={prev}
            className="flex-1 py-3 rounded-2xl text-sm font-bold transition-opacity hover:opacity-70"
            style={{ border: `1.5px solid ${C.border}`, color: C.muted }}
            data-testid="onboarding-back-btn"
          >
            ← Back
          </button>
        ) : (
          <div className="flex-1" />
        )}

        <button
          onClick={next}
          disabled={completing}
          className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-95"
          style={{
            background: isLast ? C.green : C.primary,
            opacity:    completing ? 0.6 : 1,
          }}
          data-testid="onboarding-next-btn"
        >
          {completing
            ? 'Starting…'
            : isLast
              ? "Let's go! 🚀"
              : 'Next →'
          }
        </button>
      </div>

      {/* Skip link — shown on early slides only */}
      {step < SLIDES.length - 1 && (
        <button
          onClick={() => go(SLIDES.length - 1)}
          className="mt-4 text-xs transition-opacity hover:opacity-70"
          style={{ color: C.muted }}
          data-testid="onboarding-skip-btn"
        >
          Skip introduction
        </button>
      )}
    </div>
  )
}
