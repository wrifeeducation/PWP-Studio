/**
 * PWP Daily Chain Practice — SessionComplete
 *
 * Celebration screen shown after the full chain is accepted.
 * Shows:
 *   - XP earned (25 flat)
 *   - Streak count
 *   - Mastery signal badge (if triggered)
 *   - A summary of the pupil's chain sentences
 *
 * Max 200 lines.
 */

import React from 'react'
import { motion } from 'framer-motion'
import type { ChainRowState } from '../../types/index'

const CHAIN_XP = 25

interface SessionCompleteProps {
  subjectNoun: string
  rows: ChainRowState[]
  currentStreak: number
  masterySignal: boolean
  onDone: () => void
  saving?: boolean
}

export const SessionComplete: React.FC<SessionCompleteProps> = ({
  subjectNoun,
  rows,
  currentStreak,
  masterySignal,
  onDone,
  saving = false,
}) => {
  const accepted = rows.filter((r) => r.status === 'accepted')
  const totalAttempts = rows.reduce((sum, r) => sum + r.attempts + 1, 0)
  const perfectSession = totalAttempts === accepted.length

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-lg mx-auto text-center py-4"
      data-testid="session-complete"
    >
      {/* Celebration heading */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        className="text-5xl mb-2"
        aria-hidden="true"
      >
        🎉
      </motion.div>
      <h2
        className="text-2xl font-bold mb-1"
        style={{ color: 'var(--color-brand-primary)', fontFamily: 'var(--font-display)' }}
        data-tts="Chain complete! Well done!"
      >
        Chain complete!
      </h2>
      <p
        className="text-base mb-6"
        style={{ color: 'var(--color-text-muted)' }}
        data-tts={`You wrote ${accepted.length} sentence${accepted.length !== 1 ? 's' : ''} about ${subjectNoun}`}
      >
        You wrote {accepted.length} sentence{accepted.length !== 1 ? 's' : ''} about{' '}
        <strong>{subjectNoun}</strong>.
        {perfectSession && ' Every sentence first-attempt — brilliant!'}
      </p>

      {/* Stats row */}
      <div className="flex justify-center gap-4 mb-6">
        {/* XP */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex flex-col items-center px-5 py-4 rounded-2xl"
          style={{ backgroundColor: 'var(--color-xp-light)', border: '2px solid var(--color-xp)' }}
          data-testid="xp-display"
          data-tts={`+${CHAIN_XP} XP earned`}
        >
          <span className="text-2xl font-bold" style={{ color: 'var(--color-xp)' }}>
            +{CHAIN_XP}
          </span>
          <span className="text-xs font-semibold" style={{ color: 'var(--color-xp)' }}>
            XP
          </span>
        </motion.div>

        {/* Streak */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex flex-col items-center px-5 py-4 rounded-2xl"
          style={{
            backgroundColor: 'var(--color-brand-secondary-light)',
            border: '2px solid var(--color-brand-secondary)',
          }}
          data-testid="streak-display"
          data-tts={`${currentStreak} day streak`}
        >
          <span className="text-2xl" aria-hidden="true">🔥</span>
          <span className="text-xl font-bold" style={{ color: 'var(--color-brand-secondary)' }}>
            {currentStreak}
          </span>
          <span
            className="text-xs font-semibold"
            style={{ color: 'var(--color-brand-secondary)' }}
          >
            {currentStreak === 1 ? 'day' : 'days'}
          </span>
        </motion.div>
      </div>

      {/* Mastery signal */}
      {masterySignal && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mb-6 px-4 py-3 rounded-2xl text-sm font-semibold text-center"
          style={{
            backgroundColor: 'var(--color-gold-light)',
            border: '2px solid var(--color-gold)',
            color: 'var(--color-gold-dark)',
          }}
          data-testid="mastery-signal"
          data-tts="You've been working really hard! Your teacher will decide if you're ready to move to the next level."
        >
          🏆 You've been working really hard! Your teacher will decide if you're ready for the next level.
        </motion.div>
      )}

      {/* Sentence summary */}
      <div
        className="mb-6 text-left rounded-2xl overflow-hidden"
        style={{ border: '2px solid var(--color-border)' }}
        data-testid="sentence-summary"
      >
        <div
          className="px-4 py-2 text-xs font-bold uppercase tracking-wide"
          style={{
            backgroundColor: 'var(--color-brand-primary-light)',
            color: 'var(--color-brand-primary)',
          }}
        >
          Your chain today
        </div>
        {accepted.map((row) => (
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
            <p
              className="text-sm flex-1"
              style={{ color: 'var(--color-text)' }}
              data-tts={row.sentence}
            >
              {row.sentence}
            </p>
          </div>
        ))}
      </div>

      {/* Done button */}
      <button
        type="button"
        onClick={onDone}
        disabled={saving}
        data-testid="done-btn"
        data-tts="Done"
        className="w-full py-4 rounded-full text-white font-bold text-lg transition disabled:opacity-50"
        style={{ backgroundColor: 'var(--color-brand-primary)' }}
      >
        {saving ? 'Saving…' : 'Done ✓'}
      </button>
    </motion.div>
  )
}
