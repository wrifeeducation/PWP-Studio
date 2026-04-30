/**
 * Phase 2: ConceptCardSequence
 * Orchestrates the pre-session concept card flow.
 *
 * Revised logic (WF-057):
 *   - Full acquisition cards are shown ONLY for word classes that are
 *     genuinely new at this level (first introduced here).
 *   - Previously-seen word classes appear as quick-reference chips below.
 *   - Stage 1 (first session at level): no skip allowed for new cards.
 *   - Stage 2+: skip available; chips shown by default with option to review.
 *   - If no new word classes exist at this level, chips mode is used directly.
 *
 * Word classes are deduplicated and ordered by formula position.
 * Examples from today's word bank are injected per word class.
 */

import { sfx } from '../../lib/sfx'
import React, { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ConceptCard } from './ConceptCard'
import {
  getConceptCardsForFormula,
  getNewConceptCardsForLevel,
} from '../../lib/definitions'
import type { FormulaElement } from '../../types/index'
import { WordClass } from '../../types/index'

interface ConceptCardSequenceProps {
  formulaElements: FormulaElement[]
  wordBanks: Record<string, string[]>
  /** Current scaffold stage for this pupil on this level (1–4) */
  scaffoldStage: number
  /** The formula level ID — used to identify genuinely new word classes */
  currentLevelId?: number
  onComplete: () => void
}

export const ConceptCardSequence: React.FC<ConceptCardSequenceProps> = ({
  formulaElements,
  wordBanks,
  scaffoldStage,
  currentLevelId,
  onComplete,
}) => {
  const allWordClasses = formulaElements.map((el) => el.word_class as WordClass)

  // All cards for the formula (deduplicated, ordered by position)
  const allCards = getConceptCardsForFormula(allWordClasses)

  // Cards for word classes that are brand-new at this level
  const newCards = currentLevelId
    ? getNewConceptCardsForLevel(allWordClasses, currentLevelId)
    : []

  // Cards for word classes already seen in prior levels
  const newWordClassSet = new Set(newCards.map((c) => c.wordClass))
  const reminderCards = allCards.filter((c) => !newWordClassSet.has(c.wordClass))

  // Determine which set of cards to show as full acquisition cards:
  // - If there are new word classes → show only those as full cards
  // - If nothing new (e.g. level reuses same word classes) → show all as chips
  const acquisitionCards = newCards.length > 0 ? newCards : []

  const [cardIndex, setCardIndex] = useState(0) // 0-based
  const [forceFullReview, setForceFullReview] = useState(false)

  // Ref tracks committed index to guard against rapid-click double-increment
  const committedIndexRef = useRef(0)
  const prevCardsKeyRef = useRef(acquisitionCards.map((c) => c.wordClass).join(','))
  const cardsKey = acquisitionCards.map((c) => c.wordClass).join(',')
  if (cardsKey !== prevCardsKeyRef.current) {
    prevCardsKeyRef.current = cardsKey
    committedIndexRef.current = 0
  }

  // Stage 1: no skip. Stage 2+: skip available
  const canSkip = scaffoldStage >= 2

  const handleNext = () => {
    const activeCards = forceFullReview ? allCards : acquisitionCards
    if (committedIndexRef.current >= activeCards.length - 1) {
      onComplete()
      return
    }
    committedIndexRef.current += 1
    setCardIndex(committedIndexRef.current)
  }

  const handleForceReview = () => {
    committedIndexRef.current = 0
    setCardIndex(0)
    setForceFullReview(true)
  }

  // ── Pure chip mode: no new terms at this level ───────────────────────────────
  const isPureChipsMode = !forceFullReview && acquisitionCards.length === 0

  if (isPureChipsMode) {
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
          data-tts="Quick reminder — word types in today's sentence"
        >
          Word types for today
        </p>
        <div className="flex flex-wrap gap-2">
          {allCards.map((card) => {
            const colorVar = `var(--color-${card.wordClass})`
            return (
              <div
                key={card.wordClass}
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-white flex flex-col items-center leading-tight cursor-default"
                style={{ backgroundColor: colorVar }}
                data-tts={`${card.plainEnglishName}: ${card.childFriendlyDefinition}`}
                title={card.childFriendlyDefinition}
              >
                <span>{card.plainEnglishName}</span>
                <span className="opacity-75 text-[9px] font-normal uppercase tracking-wide">{card.label}</span>
              </div>
            )
          })}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { sfx.click(); onComplete() }}
            className="flex-1 py-3 rounded-xl text-base font-bold text-white"
            style={{ backgroundColor: 'var(--color-noun)' }}
            data-testid="reminder-start-button"
            data-tts="Start practice"
          >
            Start practice →
          </button>
          <button
            onClick={() => { sfx.click(); handleForceReview() }}
            className="px-4 py-3 rounded-xl text-sm font-semibold"
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

  // ── Full card mode (new terms or force review) ────────────────────────────────
  const activeCards = forceFullReview ? allCards : acquisitionCards

  if (activeCards.length === 0) {
    onComplete()
    return null
  }

  const currentCard = activeCards[cardIndex]
  if (!currentCard) {
    onComplete()
    return null
  }

  const wordBankExamples = (wordBanks[currentCard.wordClass] ?? []).slice(0, 4)
  const isNew = !forceFullReview && newWordClassSet.has(currentCard.wordClass)

  return (
    <div className="space-y-4" data-testid="concept-card-sequence">
      <div className="flex items-center justify-between">
        <div>
          {isNew ? (
            <>
              <p
                className="text-base font-bold"
                style={{ color: 'var(--color-text)' }}
                data-tts="You've unlocked a new word type today!"
              >
                ✨ New word type unlocked!
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Learn it before you start building
              </p>
            </>
          ) : (
            <>
              <p
                className="text-base font-bold"
                style={{ color: 'var(--color-text)' }}
                data-tts="Let's review your word types"
              >
                Word type review 📖
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                You've seen these before — quick reminder
              </p>
            </>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <ConceptCard
          key={`${forceFullReview ? 'review' : 'new'}-${cardIndex}`}
          definition={currentCard}
          wordBankExamples={wordBankExamples}
          cardIndex={cardIndex + 1}
          totalCards={activeCards.length}
          onNext={handleNext}
          canSkip={canSkip}
          onSkipAll={onComplete}
        />
      </AnimatePresence>

      {/* Chips strip for already-known word classes shown below new-term cards */}
      {!forceFullReview && reminderCards.length > 0 && (
        <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <p
            className="text-[10px] font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Already know these:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {reminderCards.map((card) => {
              const colorVar = `var(--color-${card.wordClass})`
              return (
                <div
                  key={card.wordClass}
                  className="px-2.5 py-1 rounded-full text-[10px] font-semibold text-white opacity-80"
                  style={{ backgroundColor: colorVar }}
                  title={card.childFriendlyDefinition}
                  data-tts={card.plainEnglishName}
                >
                  {card.plainEnglishName}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
