/**
 * WF-005/006 + Phase 2: Formula Slot — drop target for WordClassTile.
 * Uses dnd-kit useDroppable. Label visibility and hint availability
 * are now driven by scaffoldStage (1–4) as well as Phase.
 *
 * Scaffold stage behaviour (§10.4):
 *   Stage 1: labels visible, hints auto-shown, no cost
 *   Stage 2: labels hidden, hints on demand, no cost
 *   Stage 3: blank slot, hints on demand, −5pts per hint used
 *   Stage 4: blank slot, no hints
 */

import React, { useState, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { AnimatePresence, motion } from 'framer-motion'
import { WordClass, Phase } from '../../types/index'
import { getHintForSlot } from '../../lib/definitions'

// ─── types ───────────────────────────────────────────────────────────────────

export interface FormulaSlotProps {
  id: string
  position: number
  wordClass: WordClass
  phase: Phase
  /** Currently placed word (null = empty) */
  selectedWord: string | null
  instruction: string
  example: string
  /** Scaffold stage 1–4 (default 1 if omitted) */
  scaffoldStage?: number
  /** Words from today's word bank for this word class — used in hint */
  wordBankExamples?: string[]
  /** Called when user clicks to remove a placed word */
  onClear?: () => void
  /** Called when hint is shown (for tracking) */
  onHintUsed?: (wordClass: WordClass) => void
  dataTestId?: string
  /**
   * Sequential hint control: when true this slot should auto-show its hint
   * tooltip. Managed by the parent (FormulaBuilder) so only one slot is
   * active at a time, avoiding the double-tooltip overload for younger pupils.
   */
  autoHint?: boolean
}

// ─── colour map ──────────────────────────────────────────────────────────────

const VAR_MAP: Record<WordClass, string> = {
  [WordClass.DETERMINER]: 'var(--color-determiner)',
  [WordClass.ADJECTIVE]: 'var(--color-adjective)',
  [WordClass.NOUN]: 'var(--color-noun)',
  [WordClass.VERB]: 'var(--color-verb)',
  [WordClass.ADVERB]: 'var(--color-adverb)',
  [WordClass.PREPOSITION]: 'var(--color-preposition)',
  [WordClass.PRONOUN]: 'var(--color-pronoun)',
  [WordClass.CONJUNCTION]: 'var(--color-conjunction)',
}

const LABEL_MAP: Record<WordClass, string> = {
  [WordClass.DETERMINER]: 'Determiner',
  [WordClass.ADJECTIVE]: 'Adjective',
  [WordClass.NOUN]: 'Noun',
  [WordClass.VERB]: 'Verb',
  [WordClass.ADVERB]: 'Adverb',
  [WordClass.PREPOSITION]: 'Preposition',
  [WordClass.PRONOUN]: 'Pronoun',
  [WordClass.CONJUNCTION]: 'Conjunction',
}

/** Child-friendly plain-English names for each word class (shown prominently in Stage 1) */
const PLAIN_ENGLISH_MAP: Record<WordClass, string> = {
  [WordClass.DETERMINER]: 'pointer word',
  [WordClass.ADJECTIVE]: 'describing word',
  [WordClass.NOUN]: 'naming word',
  [WordClass.VERB]: 'doing word',
  [WordClass.ADVERB]: 'how/when word',
  [WordClass.PREPOSITION]: 'position word',
  [WordClass.PRONOUN]: 'replacement word',
  [WordClass.CONJUNCTION]: 'joining word',
}

// ─── hint tooltip ─────────────────────────────────────────────────────────────

interface HintTooltipProps {
  wordClass: WordClass
  wordBankExamples?: string[]
  color: string
  onClose: () => void
}

const HintTooltip: React.FC<HintTooltipProps> = ({ wordClass, wordBankExamples, color, onClose }) => {
  const hint = getHintForSlot(wordClass, wordBankExamples)

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 rounded-xl shadow-lg p-3 text-left"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: `2px solid ${color}`,
      }}
      role="tooltip"
      data-testid={`hint-tooltip-${wordClass}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider block" style={{ color }}>
            {hint.label}
          </span>
          <span className="text-[10px] font-medium" style={{ color: '#6B7280' }}>
            {hint.plainEnglishName}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-xs px-1 rounded"
          style={{ color: 'var(--color-text-muted)' }}
          aria-label="Close hint"
        >
          ✕
        </button>
      </div>
      <p className="text-xs leading-snug mb-2" style={{ color: 'var(--color-text)' }}>
        {hint.childFriendlyDefinition}
      </p>
      <div className="flex flex-wrap gap-1">
        {hint.examples.slice(0, 3).map((ex) => (
          <span
            key={ex}
            className="text-xs px-2 py-0.5 rounded-full font-mono text-white"
            style={{ backgroundColor: color }}
          >
            {ex}
          </span>
        ))}
      </div>
      {/* Small triangle pointer */}
      <div
        className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
        style={{
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: `6px solid ${color}`,
        }}
        aria-hidden="true"
      />
    </motion.div>
  )
}

// ─── component ────────────────────────────────────────────────────────────────

export const FormulaSlot: React.FC<FormulaSlotProps> = ({
  id,
  wordClass,
  phase,
  selectedWord,
  instruction,
  scaffoldStage = 1,
  wordBankExamples,
  onClear,
  onHintUsed,
  dataTestId,
  autoHint = false,
}) => {
  const { isOver, setNodeRef } = useDroppable({ id })
  const [hintVisible, setHintVisible] = useState(false)
  const [autoHintShown, setAutoHintShown] = useState(false)

  const color = VAR_MAP[wordClass]
  const label = LABEL_MAP[wordClass]
  const plainEnglishLabel = PLAIN_ENGLISH_MAP[wordClass]

  // Show label in slot: Stage 1 always shows labels; Stage 2+ respects Phase
  const showLabel = scaffoldStage === 1 || phase === Phase.A

  // Hint availability: Stage 1–3 yes, Stage 4 no
  const hintsAvailable = scaffoldStage <= 3

  // Hint costs −5 points at Stage 3 (communicated via onHintUsed callback)
  const hintHasCost = scaffoldStage === 3

  // Sequential auto-hint: only show when the parent marks this slot as active.
  // When autoHint becomes false (parent moved on), clear state so it's ready
  // if ever reactivated. This replaces the old per-slot independent auto-show
  // which caused all tooltips to appear simultaneously.
  useEffect(() => {
    if (!autoHint) {
      setHintVisible(false)
      setAutoHintShown(false)
      return
    }
    // autoHint is true — show after a short delay if slot is still empty
    if (!autoHintShown && !selectedWord) {
      const timer = setTimeout(() => {
        setHintVisible(true)
        setAutoHintShown(true)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [autoHint, autoHintShown, selectedWord])

  // Close the auto-hint tooltip as soon as the pupil places a word
  useEffect(() => {
    if (selectedWord) {
      setHintVisible(false)
    }
  }, [selectedWord])

  const handleHintClick = () => {
    if (!hintsAvailable) return
    const opening = !hintVisible
    setHintVisible(opening)
    if (opening && onHintUsed) {
      onHintUsed(wordClass)
    }
  }

  const isEmpty = selectedWord === null

  const containerStyle: React.CSSProperties = isEmpty
    ? {
        backgroundColor: isOver ? '#E5E7EB' : '#F3F4F6',
        border: isOver ? `2px dashed ${color}` : '2px dashed #D1D5DB',
        boxShadow: isOver ? `0 0 0 3px ${color}44` : 'none',
      }
    : {
        backgroundColor: color,
        border: `2px solid ${color}`,
      }

  return (
    <div className="relative flex flex-col items-center">
      <div
        ref={setNodeRef}
        data-testid={dataTestId ?? `formula-slot-${id}`}
        data-tts={`${label} slot${selectedWord ? ': ' + selectedWord : ' — empty'}`}
        className="flex flex-col items-center justify-center rounded-xl transition-all duration-150 w-full min-h-[96px] sm:min-h-[112px] px-3 sm:px-4 py-4 sm:py-5 relative"
        style={containerStyle}
        aria-label={`${label} slot${selectedWord ? ' — ' + selectedWord : ' — empty'}`}
        role="region"
      >
        {isEmpty ? (
          <div className="flex flex-col items-center gap-0.5 w-full text-center">
            {showLabel ? (
              <>
                {/* Technical label — bold, coloured, prominent */}
                <span
                  className="text-sm font-bold uppercase tracking-wide leading-tight"
                  style={{ color }}
                  aria-hidden="true"
                >
                  {label}
                </span>
                {/* Plain-English name — smaller, softer, explanatory */}
                <span
                  className="text-xs font-semibold leading-none mt-1"
                  style={{ color: '#6B7280' }}
                  aria-hidden="true"
                >
                  {plainEnglishLabel}
                </span>
                <span className="text-2xl text-gray-300 leading-none mt-1.5" aria-hidden="true">
                  +
                </span>
                <span className="text-xs text-gray-400 mt-1 leading-tight px-1 text-center" aria-hidden="true">
                  {instruction}
                </span>
              </>
            ) : (
              <>
                <span
                  className="w-4 h-4 rounded-full inline-block mb-2"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span className="text-3xl text-gray-400 leading-none" aria-hidden="true">
                  +
                </span>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={onClear}
            className="text-white font-mono font-bold text-lg leading-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-white px-1 text-center w-full"
            data-testid={`slot-word-${id}`}
            data-tts={selectedWord}
            aria-label={`${selectedWord} — tap to remove`}
            title="Tap to remove"
          >
            {selectedWord}
          </button>
        )}
      </div>

      {/* Hint button — 44×44px tap target (WCAG 2.1 SC 2.5.5) */}
      {hintsAvailable && (
        <button
          onClick={handleHintClick}
          className="mt-1.5 rounded-full flex items-center justify-center text-xs font-bold transition-all focus:outline-none focus-visible:ring-2"
          style={{
            backgroundColor: hintVisible ? color : 'var(--color-border)',
            color: hintVisible ? 'white' : 'var(--color-text-muted)',
            /* R-09: was minHeight: 32px which violated the 44px minimum tap target rule */
            minWidth: '44px',
            minHeight: '44px',
            width: '44px',
            height: '44px',
          }}
          data-testid={`hint-button-${id}`}
          aria-label={`${hintHasCost ? 'Hint (−5 pts): ' : 'Hint: '}${label} definition`}
          title={hintHasCost ? 'Show hint (−5 pts)' : 'Show hint'}
        >
          {hintHasCost ? '?−5' : '?'}
        </button>
      )}

      {/* Hint tooltip */}
      <AnimatePresence>
        {hintVisible && (
          <HintTooltip
            wordClass={wordClass}
            wordBankExamples={wordBankExamples}
            color={color}
            onClose={() => setHintVisible(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
