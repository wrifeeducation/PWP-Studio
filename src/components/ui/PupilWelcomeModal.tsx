/**
 * WF-057 — Pupil Welcome Modal
 * Shown once on first dashboard visit; creates pupil_progress row and sets localStorage flag.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'

interface PupilWelcomeModalProps {
  pupilId: string
  firstName: string
  onComplete: () => void
}

const FRAMES = [
  {
    emoji: '✏️',
    title: 'Formula Practice',
    desc: 'Build sentences word by word using colour-coded formula slots.',
  },
  {
    emoji: '📝',
    title: 'Paragraph Builder',
    desc: 'Extend your sentences into full paragraphs with the LSC scaffold.',
  },
  {
    emoji: '🖊️',
    title: 'Writing Studio',
    desc: 'Compose extended writing pieces and earn your first Writing Star!',
  },
]

const WELCOME_FLAG = 'wf_pupil_welcomed'

export function useShouldShowWelcome(): boolean {
  return !localStorage.getItem(WELCOME_FLAG)
}

export function PupilWelcomeModal({ pupilId, firstName, onComplete }: PupilWelcomeModalProps) {
  const [frame, setFrame] = useState(0)
  const [starting, setStarting] = useState(false)

  const handleStart = async () => {
    setStarting(true)
    try {
      // Create pupil_progress row with defaults (ignore if already exists)
      await supabase.from('formula_progress').upsert(
        {
          pupil_id: pupilId,
          current_formula_level: 1,
          current_paragraph_phase: 'A',
          writing_studio_unlocked: false,
          current_streak: 0,
          longest_streak: 0,
          streak_shield_active: false,
          last_session_date: null,
          total_xp: 0,
          double_xp_until: null,
          stars_remaining: 3,
          stars_last_replenished: null,
          star_shield_active: false,
        },
        { onConflict: 'pupil_id', ignoreDuplicates: true }
      )
    } catch {
      // Non-blocking
    }
    localStorage.setItem(WELCOME_FLAG, '1')
    onComplete()
  }

  const isLast = frame === FRAMES.length - 1

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-heading"
      data-testid="pupil-welcome-modal"
    >
      <div
        className="rounded-2xl p-8 max-w-sm w-full mx-4 text-center"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '2px solid var(--color-brand-primary)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        <h2
          id="welcome-heading"
          className="text-xl font-bold mb-4"
          style={{ color: 'var(--color-brand-primary)' }}
          data-tts={`Welcome to WriFe, ${firstName}!`}
        >
          Welcome to WriFe, {firstName}!
        </h2>

        {/* Animated frames */}
        <AnimatePresence mode="wait">
          <motion.div
            key={frame}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="mb-6"
          >
            <div className="text-5xl mb-3" aria-hidden="true">{FRAMES[frame].emoji}</div>
            <p className="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
              {FRAMES[frame].title}
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {FRAMES[frame].desc}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Frame dots */}
        <div className="flex justify-center gap-2 mb-6" aria-label="Step indicator" role="img">
          {FRAMES.map((_, i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full inline-block transition-colors"
              style={{ backgroundColor: i === frame ? 'var(--color-brand-primary)' : 'var(--color-border)' }}
            />
          ))}
        </div>

        <div className="flex gap-3">
          {!isLast && (
            <button
              type="button"
              onClick={() => setFrame((f) => f + 1)}
              data-testid="welcome-next-button"
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            >
              Next
            </button>
          )}
          <button
            type="button"
            onClick={isLast ? handleStart : () => setFrame(FRAMES.length - 1)}
            disabled={starting}
            data-testid="welcome-start-button"
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--color-brand-primary)' }}
          >
            {starting ? 'Setting up…' : isLast ? 'Start Level 1' : 'Skip intro'}
          </button>
        </div>
      </div>
    </div>
  )
}
