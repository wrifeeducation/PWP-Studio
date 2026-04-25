/**
 * WF-005/006: Formula Slot — drop target for WordClassTile.
 * Uses dnd-kit useDroppable. Shows label in Phase A, hides in B/C/D.
 */

import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { WordClass, Phase } from '../../types/index'

// ─── types ───────────────────────────────────────────────────────────────────

export interface FormulaSlotProps {
  /** Unique slot id — must match what DndContext expects (e.g. "slot-0") */
  id: string
  position: number
  wordClass: WordClass
  phase: Phase
  /** Currently placed word (null = empty) */
  selectedWord: string | null
  instruction: string
  example: string
  /** Called when user clicks to remove a placed word */
  onClear?: () => void
  dataTestId?: string
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

// ─── component ────────────────────────────────────────────────────────────────

export const FormulaSlot: React.FC<FormulaSlotProps> = ({
  id,
  wordClass,
  phase,
  selectedWord,
  instruction,
  onClear,
  dataTestId,
}) => {
  const { isOver, setNodeRef } = useDroppable({ id })

  const color = VAR_MAP[wordClass]
  const label = LABEL_MAP[wordClass]
  const showLabel = phase === Phase.A

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
    <div
      ref={setNodeRef}
      data-testid={dataTestId ?? `formula-slot-${id}`}
      data-tts={`${label} slot${selectedWord ? ': ' + selectedWord : ' — empty'}`}
      className="flex flex-col items-center justify-center rounded-xl transition-all duration-150 min-w-[80px] min-h-[64px] px-3 py-2 relative"
      style={containerStyle}
      aria-label={`${label} slot${selectedWord ? ' — ' + selectedWord : ' — empty'}`}
      role="region"
    >
      {/* Phase A label */}
      {showLabel && (
        <span
          className="text-[9px] uppercase tracking-widest font-semibold leading-none mb-1"
          style={{ color: isEmpty ? '#6B7280' : 'rgba(255,255,255,0.8)' }}
          aria-hidden="true"
        >
          {label}
        </span>
      )}

      {isEmpty ? (
        /* Empty state */
        <div className="flex flex-col items-center gap-0.5">
          {!showLabel && (
            /* Colour dot hint for Phase B/C/D */
            <span
              className="w-3 h-3 rounded-full inline-block mb-1"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
          )}
          <span className="text-xl text-gray-400 leading-none" aria-hidden="true">
            +
          </span>
          {showLabel && (
            <span className="text-[10px] text-gray-400 mt-0.5" aria-hidden="true">
              {instruction}
            </span>
          )}
        </div>
      ) : (
        /* Filled state */
        <button
          onClick={onClear}
          className="text-white font-mono font-bold text-sm leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          data-testid={`slot-word-${id}`}
          data-tts={selectedWord}
          aria-label={`${selectedWord} — tap to remove`}
          title="Tap to remove"
        >
          {selectedWord}
        </button>
      )}
    </div>
  )
}
