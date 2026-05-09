/**
 * WF-007: Formula feedback screen after AI assessment.
 * Shows score, coloured sentence breakdown, praise, and improvement tip.
 */

import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import type { RawAssessmentResult } from '../../lib/assessFormula'
import { useTTS } from '../../hooks/useTTS'

interface FormulaFeedbackProps {
  result: RawAssessmentResult
  xpEarned: number
  sentence: string
  onRetry: () => void
  onContinue: () => void
}

const SCORE_COLOR = (score: number) => {
  if (score >= 80) return '#16A34A'
  if (score >= 60) return '#EA580C'
  return '#DC2626'
}

const BAND_LABEL = (score: number): string => {
  if (score === 3) return 'Greater Depth'
  if (score === 2) return 'Expected'
  if (score === 1) return 'Working Towards'
  return 'Pre-emergent'
}

const BAND_COLOR = (score: number): string => {
  if (score === 3) return '#16A34A'
  if (score === 2) return '#2563EB'
  if (score === 1) return '#EA580C'
  return '#DC2626'
}

export const FormulaFeedback: React.FC<FormulaFeedbackProps> = ({
  result,
  xpEarned,
  onRetry,
  onContinue,
}) => {
  const isPass = result.overall_score >= 80
  const { speak } = useTTS()

  // Speak feedback phrase once on mount
  useEffect(() => {
    const key = isPass ? 'feedback--correct' : 'feedback--try-again'
    speak(key)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-5"
      data-testid="formula-feedback"
    >
      {/* ── Score header ── */}
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: `3px solid ${SCORE_COLOR(result.overall_score)}`,
        }}
        role="status"
        aria-live="polite"
      >
        <div
          className="text-6xl font-bold mb-1"
          style={{ color: SCORE_COLOR(result.overall_score) }}
          data-tts={`Your score: ${result.overall_score} percent`}
        >
          {result.overall_score}%
        </div>
        <p
          className="text-sm font-medium mb-3"
          style={{ color: 'var(--color-text-muted)' }}
          data-tts={isPass ? 'Passed!' : 'Keep practising!'}
        >
          {isPass ? '🎉 Passed!' : '📚 Keep practising!'}
        </p>
        {xpEarned > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 260, damping: 20 }}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-bold text-sm"
            style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
            data-tts={`You earned ${xpEarned} XP`}
          >
            ⭐ +{xpEarned} XP earned
          </motion.div>
        )}
      </div>

      {/* ── Top strength ── */}
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}
        data-testid="feedback-strength"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-green-700 mb-1">
          Strength
        </p>
        <p className="text-sm text-green-900 leading-snug" data-tts={result.top_strength}>
          {result.top_strength}
        </p>
      </div>

      {/* ── Primary improvement ── */}
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA' }}
        data-testid="feedback-improvement"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-orange-700 mb-1">
          Next Step
        </p>
        <p
          className="text-sm text-orange-900 leading-snug"
          data-tts={result.primary_improvement}
        >
          {result.primary_improvement}
        </p>
      </div>

      {/* ── Element breakdown ── */}
      <div className="space-y-3" data-testid="feedback-elements">
        <h3
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-muted)' }}
          data-tts="Element breakdown"
        >
          Element Breakdown
        </h3>
        {result.element_scores.map((el, idx) => (
          <div
            key={idx}
            className="rounded-xl p-4"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: `1px solid var(--color-border)`,
            }}
            data-testid={`element-score-${idx}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-sm font-mono font-bold"
                style={{ color: 'var(--color-text)' }}
                data-tts={el.slot}
              >
                {el.slot}
              </span>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: BAND_COLOR(el.score) }}
                data-tts={`Score: ${BAND_LABEL(el.score)}`}
              >
                {BAND_LABEL(el.score)}
              </span>
            </div>
            <p
              className="text-sm leading-snug"
              style={{ color: 'var(--color-text-muted)' }}
              data-tts={el.feedback_short}
            >
              {el.feedback_short}
            </p>
          </div>
        ))}
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-3 pt-2" data-testid="feedback-actions">
        <button
          onClick={onRetry}
          className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{
            border: '2px solid var(--color-border)',
            color: 'var(--color-text)',
            backgroundColor: 'var(--color-surface)',
          }}
          data-testid="retry-button"
          data-tts="Try again"
        >
          Try Again
        </button>
        <button
          onClick={onContinue}
          className="flex-1 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ backgroundColor: 'var(--color-noun)' }}
          data-testid="continue-button"
          data-tts="Continue to dashboard"
        >
          Continue
        </button>
      </div>
    </motion.div>
  )
}
