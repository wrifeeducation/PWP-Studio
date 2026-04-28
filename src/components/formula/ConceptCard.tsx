/**
 * Phase 2: ConceptCard
 * Displays a single word class definition card before a formula session.
 * Colour-coded to match formula tile colours. Examples drawn from today's
 * word bank where available, otherwise falls back to canonical examples.
 */

import React from 'react'
import { motion } from 'framer-motion'
import { TTSButton } from '../ui/TTSButton'
import type { WordClassDefinition } from '../../lib/definitions'

interface ConceptCardProps {
  definition: WordClassDefinition
  /** Examples from today's actual word bank (preferred over canonical examples) */
  wordBankExamples?: string[]
  /** Which card in the sequence (1-based) */
  cardIndex: number
  /** Total cards in sequence */
  totalCards: number
  onNext: () => void
  /** Whether to show the Skip all button */
  canSkip: boolean
  onSkipAll: () => void
}

// CSS variable names for each word class colour (matches globals.css)
const COLOR_VAR_MAP: Record<string, string> = {
  noun: 'var(--color-noun)',
  verb: 'var(--color-verb)',
  adjective: 'var(--color-adjective)',
  determiner: 'var(--color-determiner)',
  adverb: 'var(--color-adverb)',
  preposition: 'var(--color-preposition)',
  pronoun: 'var(--color-pronoun)',
  conjunction: 'var(--color-conjunction)',
}

export const ConceptCard: React.FC<ConceptCardProps> = ({
  definition,
  wordBankExamples,
  cardIndex,
  totalCards,
  onNext,
  canSkip,
  onSkipAll,
}) => {
  const color = COLOR_VAR_MAP[definition.wordClass] ?? 'var(--color-noun)'
  const examples = (wordBankExamples && wordBankExamples.length > 0
    ? wordBankExamples.slice(0, 4)
    : definition.examples
  ).join(', ')

  const ttsText = `${definition.label}. ${definition.definition} Examples: ${examples}.`

  return (
    <motion.div
      key={cardIndex}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="rounded-2xl overflow-hidden shadow-sm"
      style={{ border: `2px solid ${color}` }}
      data-testid={`concept-card-${definition.wordClass}`}
    >
      {/* Coloured header strip */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ backgroundColor: color }}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-white font-bold text-lg tracking-wide uppercase"
            data-tts={definition.label}
          >
            {definition.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <TTSButton text={ttsText} />
          <span
            className="text-xs font-semibold text-white opacity-80"
            aria-label={`Card ${cardIndex} of ${totalCards}`}
          >
            {cardIndex}/{totalCards}
          </span>
        </div>
      </div>

      {/* Definition body */}
      <div
        className="px-5 py-5 space-y-4"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <p
          className="text-base font-medium leading-snug"
          style={{ color: 'var(--color-text)' }}
          data-tts={definition.definition}
        >
          {definition.definition}
        </p>

        {/* Examples */}
        <div>
          <p
            className="text-xs uppercase tracking-wider font-semibold mb-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {wordBankExamples && wordBankExamples.length > 0
              ? "Words you'll use today"
              : 'Examples'}
          </p>
          <div className="flex flex-wrap gap-2">
            {(wordBankExamples && wordBankExamples.length > 0
              ? wordBankExamples.slice(0, 4)
              : definition.examples
            ).map((ex) => (
              <span
                key={ex}
                className="px-3 py-1 rounded-full text-sm font-mono font-semibold text-white"
                style={{ backgroundColor: color }}
                data-tts={ex}
              >
                {ex}
              </span>
            ))}
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-1" aria-hidden="true">
          {Array.from({ length: totalCards }, (_, i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                backgroundColor: i < cardIndex ? color : 'var(--color-border)',
                transform: i === cardIndex - 1 ? 'scale(1.3)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-1">
          {canSkip && (
            <button
              onClick={onSkipAll}
              className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)',
                backgroundColor: 'var(--color-surface)',
              }}
              data-testid="concept-skip-all"
              data-tts="Skip all concept cards"
            >
              Skip all
            </button>
          )}
          <button
            onClick={onNext}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ backgroundColor: color }}
            data-testid="concept-card-next"
            data-tts={cardIndex < totalCards ? 'Next word class' : "Got it — let's practice"}
          >
            {cardIndex < totalCards ? 'Next →' : "Got it — let's go! 🚀"}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
