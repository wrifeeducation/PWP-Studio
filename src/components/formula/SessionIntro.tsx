/**
 * SessionIntro — Phase 2 (WF-051)
 *
 * Shown before every formula practice session.
 * 1. WriFe mascot bounces in and greets the pupil
 * 2. Today's subject + formula shown in plain English
 * 3. Animated worked example: tiles fly into slots one by one
 * 4. "I'm ready!" button (or auto-advance after animation)
 *
 * The mascot is a friendly animated pencil character (original SVG — not based
 * on any existing character). Animations use Framer Motion.
 */

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WORD_CLASS_DEFINITIONS } from '../../lib/definitions'
import type { FormulaLevel } from '../../types/index'
import { WordClass } from '../../types/index'
import { sfx } from '../../lib/sfx'

// ─── Colour map ───────────────────────────────────────────────────────────────

const WC_COLOUR: Record<WordClass, string> = {
  [WordClass.DETERMINER]:  '#9B59B6',
  [WordClass.ADJECTIVE]:   '#27AE60',
  [WordClass.NOUN]:        '#3498DB',
  [WordClass.VERB]:        '#E74C3C',
  [WordClass.ADVERB]:      '#F39C12',
  [WordClass.PREPOSITION]: '#8B4513',
  [WordClass.PRONOUN]:     '#E91E63',
  [WordClass.CONJUNCTION]: '#D4AC0D',
}

// ─── Mascot ───────────────────────────────────────────────────────────────────

function WriFeMascot({ pose }: { pose: 'wave' | 'point' | 'cheer' }) {
  return (
    <motion.div
      initial={{ y: 40, opacity: 0, scale: 0.6 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
      style={{ display: 'flex', justifyContent: 'center' }}
      aria-hidden="true"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
      >
        <svg width="120" height="146" viewBox="0 0 90 110" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Body — pencil shape */}
          <rect x="28" y="20" width="34" height="60" rx="10" fill="#FFD166" stroke="#E8B923" strokeWidth="2.5"/>
          {/* Pencil tip */}
          <polygon points="28,80 62,80 45,100" fill="#F4A261" stroke="#E8B923" strokeWidth="1.5"/>
          <polygon points="36,80 54,80 45,93" fill="#2D3436"/>
          {/* Eraser band */}
          <rect x="28" y="20" width="34" height="10" rx="5" fill="#FF6B6B" stroke="#E74C3C" strokeWidth="1.5"/>
          {/* Eyes */}
          <circle cx="38" cy="50" r="5" fill="white"/>
          <circle cx="52" cy="50" r="5" fill="white"/>
          <circle cx={pose === 'wave' ? 39 : 40} cy="51" r="2.5" fill="#2D3436"/>
          <circle cx={pose === 'wave' ? 53 : 54} cy="51" r="2.5" fill="#2D3436"/>
          {/* Eye shine */}
          <circle cx="40" cy="49" r="1" fill="white"/>
          <circle cx="54" cy="49" r="1" fill="white"/>
          {/* Smile */}
          <path
            d={pose === 'cheer' ? 'M 37 60 Q 45 68 53 60' : 'M 38 59 Q 45 65 52 59'}
            stroke="#2D3436" strokeWidth="2.2" strokeLinecap="round" fill="none"
          />
          {/* Left arm — rotate around shoulder point (28,55) for waving */}
          <motion.g
            animate={pose === 'wave' ? { rotate: [0, -25, 0] } : { rotate: 0 }}
            transition={pose === 'wave'
              ? { repeat: Infinity, duration: 0.8, ease: 'easeInOut' }
              : { duration: 0.2 }
            }
            style={{ originX: '28px', originY: '55px' }}
          >
            <line
              x1="28" y1="55"
              x2={pose === 'wave' ? 10 : 18}
              y2={pose === 'wave' ? 38 : 65}
              stroke="#FFD166" strokeWidth="7" strokeLinecap="round"
            />
          </motion.g>
          {/* Right arm */}
          <line
            x1="62" y1="55"
            x2={pose === 'point' ? 80 : 72}
            y2={pose === 'point' ? 48 : 65}
            stroke="#FFD166" strokeWidth="7" strokeLinecap="round"
          />
          {/* Stars around mascot when cheering */}
          {pose === 'cheer' && (
            <>
              <motion.text x="6" y="30" fontSize="16"
                animate={{ rotate: [0, 20, -20, 0], opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 1.5 }}>★</motion.text>
              <motion.text x="70" y="30" fontSize="14"
                animate={{ rotate: [0, -20, 20, 0], opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 1.8 }}>✦</motion.text>
            </>
          )}
        </svg>
      </motion.div>
    </motion.div>
  )
}

// ─── Animated worked example ──────────────────────────────────────────────────

interface AnimatedExampleProps {
  level: FormulaLevel
  onComplete: () => void
}

function AnimatedExample({ level, onComplete }: AnimatedExampleProps) {
  const elements = level.formula_elements
  const [filledSlots, setFilledSlots] = useState<number[]>([])
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (elements.length === 0) { onComplete(); return }

    let i = 0
    const fill = () => {
      if (i < elements.length) {
        setFilledSlots(prev => [...prev, i])
        i++
        setTimeout(fill, 520)
      } else {
        setTimeout(() => { setDone(true); onComplete() }, 600)
      }
    }
    const timer = setTimeout(fill, 400)
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
      {/* Slots row — fills full width equally */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${elements.length}, minmax(0, 1fr))`, gap: 12, width: '100%' }}>
        {elements.map((el, idx) => {
          const colour = WC_COLOUR[el.word_class] ?? '#999'
          const def = WORD_CLASS_DEFINITIONS[el.word_class]
          const isFilled = filledSlots.includes(idx)
          const exampleWord = el.example || (level.word_banks[el.word_class]?.[0] ?? '...')

          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              {/* Slot */}
              <motion.div
                style={{
                  width: '100%',
                  minHeight: 72,
                  borderRadius: 14,
                  border: `2px solid ${colour}`,
                  background: isFilled ? colour : `${colour}18`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px 8px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <AnimatePresence>
                  {isFilled ? (
                    <motion.span
                      key="word"
                      initial={{ y: -30, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 340, damping: 20 }}
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: '#fff',
                        fontFamily: "'Nunito', sans-serif",
                        whiteSpace: 'nowrap',
                        textAlign: 'center',
                      }}
                    >
                      {exampleWord}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="empty"
                      style={{ fontSize: 20, fontWeight: 700, color: colour, opacity: 0.7 }}
                    >
                      ?
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
              {/* Label */}
              <span style={{ fontSize: 11, fontWeight: 700, color: colour, textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'center' }}>
                {def?.plainEnglishName ?? el.word_class}
              </span>
            </div>
          )
        })}
      </div>

      {/* Completed sentence */}
      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            style={{
              background: '#ECFDF5',
              border: '2px solid #6EE7B7',
              borderRadius: 14,
              padding: '14px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 4,
              width: '100%',
            }}
          >
            <span style={{ fontSize: 22 }}>✅</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#065F46', fontFamily: "'Nunito', sans-serif" }}>
              {elements.map(el => el.example || (level.word_banks[el.word_class]?.[0] ?? '')).join(' ')}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SessionIntroProps {
  level: FormulaLevel
  todaysSubject: string | null
  isReturning: boolean   // true if pupil has done this level before
  onReady: () => void    // advance to concept cards (or practice if returning)
  onSkip: () => void     // skip intro entirely
}

type IntroPhase = 'greeting' | 'example' | 'ready'

export function SessionIntro({ level, todaysSubject, isReturning, onReady, onSkip }: SessionIntroProps) {
  const [phase, setPhase] = useState<IntroPhase>('greeting')
  const [mascotPose, setMascotPose] = useState<'wave' | 'point' | 'cheer'>('wave')

  // Build formula description for visual display
  const wordClassNames = level.formula_elements
    .map(el => WORD_CLASS_DEFINITIONS[el.word_class]?.label ?? el.word_class)
    .join(' + ')

  // ── Auto-advance greeting → example after a short pause ─────────────────────
  useEffect(() => {
    if (phase !== 'greeting') return
    setMascotPose('wave')
    const t = setTimeout(() => {
      setPhase('example')
      setMascotPose('point')
    }, 2000)
    return () => clearTimeout(t)
  }, [phase])

  const handleExampleComplete = () => {
    setPhase('ready')
    setMascotPose('cheer')
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-bg)',
        fontFamily: "'Nunito', sans-serif",
        overflowY: 'auto',
      }}
      data-testid="session-intro"
    >
      {/* Skip button — top right */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 16px 0' }}>
        <button
          onClick={onSkip}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            padding: '4px 8px',
          }}
          data-tts="Skip intro"
          data-testid="skip-intro-btn"
        >
          Skip →
        </button>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 24px 32px',
        gap: 24,
        maxWidth: 720,
        margin: '0 auto',
        width: '100%',
      }}>

        {/* Mascot */}
        <WriFeMascot pose={mascotPose} />

        {/* Greeting */}
        <AnimatePresence mode="wait">
          {phase === 'greeting' && (
            <motion.div
              key="greeting"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              style={{ textAlign: 'center' }}
            >
              <h1
                style={{ fontSize: 30, fontWeight: 800, color: 'var(--color-text)', margin: '0 0 8px' }}
                data-tts={isReturning ? "Welcome back! Let's practise." : "Let's get started!"}
              >
                {isReturning ? 'Welcome back! 👋' : "Let's get started! 👋"}
              </h1>
              {todaysSubject && (
                <p style={{ fontSize: 18, color: 'var(--color-text-muted)', margin: 0 }}
                   data-tts={`Today you are writing about ${todaysSubject}`}>
                  Today you're writing about{' '}
                  <strong style={{ color: 'var(--color-text)' }}>{todaysSubject}</strong>
                </p>
              )}
            </motion.div>
          )}

          {(phase === 'example' || phase === 'ready') && (
            <motion.div
              key="example-phase"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ textAlign: 'center', width: '100%' }}
            >
              {/* What you're practising */}
              <div style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: 14,
                padding: '12px 16px',
                marginBottom: 16,
              }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>
                  Today's sentence pattern
                </p>
                <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', margin: 0 }}
                   data-tts={`Today's pattern is ${wordClassNames}`}>
                  {wordClassNames}
                </p>
              </div>

              {/* Worked example */}
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 16 }}
                 data-tts="Watch how to build your sentence">
                {phase === 'ready' ? '⬆️ That\'s how it works! Now it\'s YOUR turn.' : '👀 Watch how to build your sentence…'}
              </p>

              <AnimatedExample level={level} onComplete={handleExampleComplete} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ready button — only shown after example completes */}
        <AnimatePresence>
          {phase === 'ready' && (
            <motion.button
              key="ready-btn"
              initial={{ opacity: 0, scale: 0.85, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              onClick={() => { sfx.click(); onReady() }}
              style={{
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 18,
                padding: '20px 48px',
                fontSize: 20,
                fontWeight: 800,
                fontFamily: 'inherit',
                cursor: 'pointer',
                width: '100%',
                boxShadow: '0 6px 20px rgba(108,92,231,0.4)',
              }}
              data-tts="I'm ready! Let's go"
              data-testid="ready-btn"
            >
              I'm ready — let's go! 🚀
            </motion.button>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}
