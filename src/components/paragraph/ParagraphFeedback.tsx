/**
 * WF-012: ParagraphFeedback — shows four dimension scores as coloured bars,
 * overall composite, one praise sentence, one improvement prompt.
 */

import { motion } from 'framer-motion'
import type { RawParagraphAssessment } from '../../lib/assessParagraph'

interface ParagraphFeedbackProps {
  result: RawParagraphAssessment
  compositeScore: number
  xpEarned: number
  onRetry: () => void
  onContinue: () => void
}

interface DimensionBarProps {
  label: string
  score: number | null
  maxScore: number
  color: string
  index: number
}

const DimensionBar: React.FC<DimensionBarProps> = ({ label, score, maxScore, color, index }) => {
  const pct = score !== null ? (score / maxScore) * 100 : 0
  const displayScore = score !== null ? `${score}/${maxScore}` : 'N/A'

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 + index * 0.07 }}
      className="space-y-1"
      data-testid={`dimension-bar-${label.toLowerCase().replace(/\s/g, '-')}`}
    >
      <div className="flex items-center justify-between text-sm">
        <span style={{ color: 'var(--color-text)' }} data-tts={label}>
          {label}
        </span>
        <span
          className="font-semibold text-xs px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${color}15`, color }}
          data-tts={`Score: ${displayScore}`}
        >
          {displayScore}
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--color-border)' }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: 0.2 + index * 0.07, duration: 0.5, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </motion.div>
  )
}

export const ParagraphFeedback: React.FC<ParagraphFeedbackProps> = ({
  result,
  compositeScore,
  xpEarned,
  onRetry,
  onContinue,
}) => {
  const isStrong = compositeScore >= 80
  const scoreColour = isStrong ? 'var(--color-adjective)' : 'var(--color-verb)'

  const dimensions = [
    { label: 'Cohesion', score: result.cohesion_score, color: 'var(--color-noun)' },
    { label: 'Genre Match', score: result.genre_match_score, color: 'var(--color-determiner)' },
    {
      label: 'Tense & Register',
      score: result.tense_register_score,
      color: 'var(--color-adverb)',
    },
    { label: 'Close Quality', score: result.close_quality_score, color: 'var(--color-adjective)' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl overflow-hidden"
      style={{
        border: '2px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
      }}
      data-testid="paragraph-feedback"
      role="status"
      aria-live="polite"
    >
      {/* Score header */}
      <div
        className="px-5 py-5 text-center"
        style={{ background: `linear-gradient(135deg, ${scoreColour}10, ${scoreColour}05)` }}
      >
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 250, damping: 20 }}
          className="text-5xl font-bold mb-1"
          style={{ color: scoreColour }}
          data-tts={`Paragraph score: ${compositeScore} percent`}
        >
          {compositeScore}%
        </motion.div>
        <p
          className="text-sm font-medium"
          style={{ color: 'var(--color-text-muted)' }}
          data-tts={isStrong ? 'Excellent paragraph!' : 'Good effort — keep building!'}
        >
          {isStrong ? 'Excellent paragraph!' : 'Good effort — keep building!'}
        </p>
        {xpEarned > 0 && (
          <div
            className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-sm font-semibold"
            style={{ backgroundColor: '#FEF9C3', color: '#854D0E' }}
            data-tts={`Plus ${xpEarned} XP earned`}
          >
            ⭐ +{xpEarned} XP
          </div>
        )}
      </div>

      <div className="px-5 py-4 space-y-5">
        {/* Dimension bars */}
        <div className="space-y-3">
          {dimensions.map((dim, i) => (
            <DimensionBar
              key={dim.label}
              label={dim.label}
              score={dim.score}
              maxScore={3}
              color={dim.color}
              index={i}
            />
          ))}
        </div>

        {/* Strongest sentence */}
        {result.strongest_sentence && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="rounded-xl p-4"
            style={{ backgroundColor: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)' }}
            data-testid="strongest-sentence"
          >
            <p
              className="text-xs font-semibold mb-1"
              style={{ color: 'var(--color-adjective)' }}
              data-tts="Your strongest sentence"
            >
              ⭐ Strongest Sentence
            </p>
            <p
              className="text-sm italic"
              style={{ color: 'var(--color-text)' }}
              data-tts={result.strongest_sentence}
            >
              "{result.strongest_sentence}"
            </p>
          </motion.div>
        )}

        {/* Praise */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="rounded-xl p-4"
          style={{ backgroundColor: 'var(--color-background)' }}
          data-testid="feedback-praise"
        >
          <p
            className="text-xs font-semibold mb-1"
            style={{ color: 'var(--color-text-muted)' }}
            data-tts="What went well"
          >
            What went well
          </p>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text)' }}
            data-tts={result.primary_feedback}
          >
            {result.primary_feedback}
          </p>
        </motion.div>

        {/* Improvement */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="rounded-xl p-4"
          style={{ backgroundColor: 'var(--color-background)' }}
          data-testid="feedback-improvement"
        >
          <p
            className="text-xs font-semibold mb-1"
            style={{ color: 'var(--color-text-muted)' }}
            data-tts="To develop further"
          >
            To develop further
          </p>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text)' }}
            data-tts={result.secondary_feedback}
          >
            {result.secondary_feedback}
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex gap-3 pt-2"
        >
          <button
            onClick={onRetry}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{
              border: '2px solid var(--color-border)',
              color: 'var(--color-text)',
              backgroundColor: 'var(--color-surface)',
            }}
            data-testid="paragraph-retry-button"
            data-tts="Try this paragraph again"
          >
            Try Again
          </button>
          <button
            onClick={onContinue}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ backgroundColor: 'var(--color-noun)' }}
            data-testid="paragraph-continue-button"
            data-tts="Continue to dashboard"
          >
            Continue →
          </button>
        </motion.div>
      </div>
    </motion.div>
  )
}
