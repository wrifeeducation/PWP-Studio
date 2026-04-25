/**
 * WF-028: LensLab — Phase D recognition mode.
 * Displays a pre-built sentence; pupils tap each word and select its word class.
 * Score = (correct first attempts / total words) × 100.
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WordClass, WORD_CLASS_COLOUR } from '../../types/index'
import type { FormulaLevel } from '../../types/index'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LensLabProps {
  level: FormulaLevel
  onSubmit: (score: number) => void
  isSubmitting: boolean
}

interface TokenState {
  word: string
  correctClass: WordClass
  selectedClass: WordClass | null
  isCorrect: boolean | null
  firstAttemptCorrect: boolean | null
  isFlashing: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WORD_CLASS_LABELS: Record<WordClass, string> = {
  [WordClass.DETERMINER]: 'Determiner',
  [WordClass.ADJECTIVE]: 'Adjective',
  [WordClass.NOUN]: 'Noun',
  [WordClass.VERB]: 'Verb',
  [WordClass.ADVERB]: 'Adverb',
  [WordClass.PREPOSITION]: 'Preposition',
  [WordClass.PRONOUN]: 'Pronoun',
  [WordClass.CONJUNCTION]: 'Conjunction',
}

const ALL_WORD_CLASSES = Object.values(WordClass)

// ─── Component ────────────────────────────────────────────────────────────────

export function LensLab({ level, onSubmit, isSubmitting }: LensLabProps) {
  // Build tokens from formula_elements
  const [tokens, setTokens] = useState<TokenState[]>(() =>
    level.formula_elements.map((el) => ({
      word: el.example,
      correctClass: el.word_class as WordClass,
      selectedClass: null,
      isCorrect: null,
      firstAttemptCorrect: null,
      isFlashing: false,
    }))
  )

  const [activeTokenIdx, setActiveTokenIdx] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const allCorrect = tokens.every((t) => t.isCorrect === true)

  // ─── Word class palette selection ─────────────────────────────────────────

  const handleWordClassSelect = useCallback(
    (tokenIdx: number, wordClass: WordClass) => {
      setTokens((prev) => {
        const updated = [...prev]
        const token = { ...updated[tokenIdx] }
        const isCorrect = wordClass === token.correctClass

        if (isCorrect) {
          token.selectedClass = wordClass
          token.isCorrect = true
          token.firstAttemptCorrect = token.firstAttemptCorrect ?? true
          token.isFlashing = false
          updated[tokenIdx] = token
          setActiveTokenIdx(null)
        } else {
          // Mark first attempt as wrong if not already set
          token.firstAttemptCorrect = token.firstAttemptCorrect ?? false
          token.isFlashing = true
          updated[tokenIdx] = token

          // Clear flash after 600ms
          setTimeout(() => {
            setTokens((prev2) => {
              const u2 = [...prev2]
              u2[tokenIdx] = { ...u2[tokenIdx], isFlashing: false }
              return u2
            })
          }, 600)
        }

        return updated
      })
    },
    []
  )

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(() => {
    if (!allCorrect || isSubmitting) return
    const firstAttemptCount = tokens.filter((t) => t.firstAttemptCorrect === true).length
    const score = Math.round((firstAttemptCount / tokens.length) * 100)
    setSubmitted(true)
    onSubmit(score)
  }, [allCorrect, isSubmitting, tokens, onSubmit])

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" data-testid="lens-lab">
      {/* Instruction */}
      <div
        className="rounded-xl p-4 text-sm"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <p
          className="font-semibold mb-1"
          style={{ color: 'var(--color-text)' }}
          data-tts="Tap each word and select its word class"
        >
          Lens Lab — Identify the Word Classes
        </p>
        <p style={{ color: 'var(--color-text-muted)' }} data-tts="Tap a word to reveal the colour palette, then choose the correct word class">
          Tap a word, then select its word class from the palette.
        </p>
      </div>

      {/* Sentence tokens */}
      <div
        className="flex flex-wrap gap-2 p-4 rounded-xl"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        data-testid="lens-lab-sentence"
      >
        {tokens.map((token, idx) => {
          const isActive = activeTokenIdx === idx
          const colour = token.isCorrect
            ? WORD_CLASS_COLOUR[token.correctClass]
            : isActive
            ? '#6366F1'
            : 'var(--color-border)'

          return (
            <motion.button
              key={idx}
              type="button"
              onClick={() => {
                if (token.isCorrect) return
                setActiveTokenIdx(isActive ? null : idx)
              }}
              animate={token.isFlashing ? { backgroundColor: '#FCA5A5' } : {}}
              transition={{ duration: 0.15 }}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2"
              style={{
                border: `2px solid ${colour}`,
                backgroundColor: token.isCorrect ? `${WORD_CLASS_COLOUR[token.correctClass]}22` : isActive ? '#EEF2FF' : 'var(--color-background)',
                color: 'var(--color-text)',
                cursor: token.isCorrect ? 'default' : 'pointer',
                minWidth: '44px',
                minHeight: '44px',
              }}
              disabled={token.isCorrect === true}
              data-testid={`lens-token-${idx}`}
              data-tts={token.word}
              aria-label={`Word: ${token.word}${token.isCorrect ? ` — correctly identified as ${WORD_CLASS_LABELS[token.correctClass]}` : ''}`}
            >
              {token.word}
              {token.isCorrect && (
                <span className="ml-1 text-xs" aria-hidden="true">✓</span>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Word class palette */}
      <AnimatePresence>
        {activeTokenIdx !== null && (
          <motion.div
            key="palette"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="rounded-xl p-4 space-y-2"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            data-testid="word-class-palette"
          >
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'var(--color-text-muted)' }}
            >
              What word class is "{tokens[activeTokenIdx]?.word}"?
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_WORD_CLASSES.map((wc) => (
                <button
                  key={wc}
                  type="button"
                  onClick={() => handleWordClassSelect(activeTokenIdx, wc)}
                  className="px-3 py-2 rounded-lg text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2"
                  style={{
                    backgroundColor: `${WORD_CLASS_COLOUR[wc]}22`,
                    border: `2px solid ${WORD_CLASS_COLOUR[wc]}`,
                    color: 'var(--color-text)',
                    minWidth: '44px',
                    minHeight: '44px',
                  }}
                  data-testid={`palette-${wc}`}
                  data-tts={WORD_CLASS_LABELS[wc]}
                  aria-label={`Select ${WORD_CLASS_LABELS[wc]}`}
                >
                  {WORD_CLASS_LABELS[wc]}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress indicator */}
      <div
        className="text-sm"
        style={{ color: 'var(--color-text-muted)' }}
        data-tts={`${tokens.filter((t) => t.isCorrect).length} of ${tokens.length} words identified`}
      >
        {tokens.filter((t) => t.isCorrect).length} / {tokens.length} words identified
      </div>

      {/* Submit button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!allCorrect || isSubmitting || submitted}
        className="w-full py-3 rounded-xl font-semibold text-white transition-opacity focus:outline-none focus-visible:ring-2"
        style={{
          backgroundColor: allCorrect ? 'var(--color-brand-primary)' : 'var(--color-border)',
          cursor: allCorrect && !isSubmitting ? 'pointer' : 'not-allowed',
          opacity: allCorrect && !isSubmitting ? 1 : 0.5,
        }}
        data-testid="lens-lab-submit"
        data-tts="Submit Lens Lab"
      >
        {isSubmitting ? 'Submitting…' : submitted ? 'Submitted!' : 'Submit'}
      </button>
    </div>
  )
}
