/**
 * Phase 2: ConceptCardSequence
 * Orchestrates the pre-session concept card flow.
 *
 * Trigger logic (§10.3):
 *   - Stage 1 (Acquisition): all cards shown, no skip
 *   - Stage 2+: skip available; brief reminder chips shown instead if already seen
 *
 * Word classes are deduplicated and ordered by formula position.
 * Examples from today's word bank are injected per word class.
 */

import React, { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ConceptCard } from './ConceptCard'
import { getConceptCardsForFormula } from '../../lib/definitions'
import type { FormulaElement } from '../../types/index'
import { WordClass } from '../../types/index'

interface ConceptCardSequenceProps {
  formulaElements: FormulaElement[]
  wordBanks: Record<string, string[]>
  /** Current scaffold stage for this pupil on this level (1–4) */
  scaffoldStage: number
  /** Word classes the pupil has already seen in previous levels */
  seenWordClasses?: WordClass[]
  onComplete: () => void
}

export const ConceptCardSequence: React.FC<ConceptCardSequenceProps> = ({
  formulaElements,
  wordBanks,
  scaffoldStage,
  seenWordClasses = [],
  onComplete,
}) => {
  const cards = getConceptCardsForFormula(formulaElements.map((el) => el.word_class as WordClass))

  const [cardIndex, setCardIndex] = useState(0) // 0-based
  // Ref tracks the committed "next" index so rapid double-clicks can't
  // queue two increments before React re-renders (WF-056 race condition fix).
  // Reset to 0 whenever the card set changes (new formula level).
  const committedIndexRef = useRef(0)
  const prevCardsKeyRef = useRef(cards.map((c) => c.wordClass).join(','))
  const cardsKey = cards.map((c) => c.wordClass).join(',')
  if (cardsKey !== prevCardsKeyRef.current) {
    prevCardsKeyRef.current = cardsKey
    committedIndexRef.current = 0
  }

  // Stage 1: no skip. Stage 2+: skip available
  const canSkip = scaffoldStage >= 2

  // At stage 2+ show brief reminder chips instead of full cards
  // for word classes the pupil has already seen
  const isReminderMode = scaffoldStage >= 2 && seenWordClasses.length > 0

  const handleNext = () => {
    // Guard: if we're already at (or past) the last card, complete immediately
    if (committedIndexRef.current >= cards.length - 1) {
      onComplete()
      return
    }
    committedIndexRef.current += 1
    setCardIndex(committedIndexRef.current)
  }

  // ── Reminder chip mode (Stage 2+, previously seen word classes) ──────────────
  if (isReminderMode) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
        data-testid="concept-reminder-chips"
      >
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-muted)' }}
          data-tts="Quick reminder — word classes in today's formula"
        >
          Quick reminder
        </p>
        <div className="flex flex-wrap gap-2">
          {cards.map((card) => {
            const colorVar = `var(--color-${card.wordClass})`
            return (
              <div
                key={card.wordClass}
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: colorVar }}
                data-tts={`${card.label}: ${card.definition}`}
                title={card.definition}
              >
                {card.label}
              </div>
            )
          })}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onComplete}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--color-noun)' }}
            data-testid="reminder-start-button"
            data-tts="Start practice"
          >
            Start practice →
          </button>
          <button
            onClick={() => {
              // Switch to full card mode so pupil can review any card
              committedIndexRef.current = 0
              setCardIndex(0)
            }}
            className="px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
            data-testid="reminder-review-button"
            data-tts="Review definitions"
          >
            Review
          </button>
        </div>
      </motion.div>
    )
  }

  // ── Full card mode ────────────────────────────────────────────────────────────
  if (cards.length === 0) {
    onComplete()
    return null
  }

  const currentCard = cards[cardIndex]
  // Safety net: if cardIndex somehow exceeds bounds (e.g. stale render), complete
  if (!currentCard) {
    onComplete()
    return null
  }
  const wordBankExamples = (wordBanks[currentCard.wordClass] ?? []).slice(0, 4)

  return (
    <div className="space-y-4" data-testid="concept-card-sequence">
      <div className="flex items-center justify-between">
        <p
          className="text-sm font-medium"
          style={{ color: 'var(--color-text-muted)' }}
          data-tts="Before you practice — learn the word classes in today's formula"
        >
          Before you practice
        </p>
      </div>

      <AnimatePresence mode="wait">
        <ConceptCard
          key={cardIndex}
          definition={currentCard}
          wordBankExamples={wordBankExamples}
          cardIndex={cardIndex + 1}
          totalCards={cards.length}
          onNext={handleNext}
          canSkip={canSkip}
          onSkipAll={onComplete}
        />
      </AnimatePresence>
    </div>
  )
}
