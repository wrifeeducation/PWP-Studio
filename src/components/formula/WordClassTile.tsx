/**
 * WF-005: Word Class Tile Component
 * Draggable, colour-coded tile representing one word in the formula word bank.
 * Uses dnd-kit useDraggable for drag-and-drop.
 */

import React from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { WordClass } from '../../types/index'

// ─── types ───────────────────────────────────────────────────────────────────

export type TileState = 'idle' | 'dragging' | 'placed_correct' | 'placed_incorrect' | 'disabled'

export interface WordClassTileProps {
  /** Unique id for dnd-kit (e.g. "noun-cat-0") */
  id: string
  word: string
  wordClass: WordClass
  state?: TileState
  /** When true the tile renders as a static display (no drag) */
  isStatic?: boolean
  /** Size variant – affects font/padding */
  size?: 'sm' | 'md' | 'lg'
  /** Called on click (for click-to-select fallback) */
  onClick?: () => void
  /** Called on double-click / double-tap — places tile into next matching slot */
  onDoubleClick?: () => void
  dataTestId?: string
}

// ─── colour map (reads from CSS vars set in index.css) ───────────────────────

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

// ─── label map ────────────────────────────────────────────────────────────────

const LABEL_MAP: Record<WordClass, string> = {
  [WordClass.DETERMINER]: 'Det',
  [WordClass.ADJECTIVE]: 'Adj',
  [WordClass.NOUN]: 'Noun',
  [WordClass.VERB]: 'Verb',
  [WordClass.ADVERB]: 'Adv',
  [WordClass.PREPOSITION]: 'Prep',
  [WordClass.PRONOUN]: 'Pro',
  [WordClass.CONJUNCTION]: 'Conj',
}

// ─── size classes ─────────────────────────────────────────────────────────────

const SIZE_CLASSES = {
  sm: 'text-xs px-2 py-1 min-w-[56px]',
  md: 'text-sm px-3 py-2 min-w-[72px]',
  lg: 'text-base px-4 py-2.5 min-w-[88px]',
}

// ─── component ────────────────────────────────────────────────────────────────

export const WordClassTile: React.FC<WordClassTileProps> = ({
  id,
  word,
  wordClass,
  state = 'idle',
  isStatic = false,
  size = 'md',
  onClick,
  onDoubleClick,
  dataTestId,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled: isStatic || state === 'disabled',
    data: { word, wordClass },
  })

  const color = VAR_MAP[wordClass]
  const label = LABEL_MAP[wordClass]

  // Border style per state
  const borderStyle = (): React.CSSProperties => {
    if (state === 'disabled') return { border: '2px solid #9CA3AF' }
    if (state === 'placed_correct') return { border: '2px solid #16A34A' }
    if (state === 'placed_incorrect') return { border: '2px dashed #DC2626' }
    if (isDragging) return { border: '2px solid #fff' }
    return { border: `2px solid ${color}` }
  }

  const style: React.CSSProperties = {
    backgroundColor: state === 'disabled' ? '#9CA3AF' : color,
    opacity: state === 'disabled' ? 0.5 : isDragging ? 0.8 : 1,
    cursor: isStatic
      ? 'default'
      : state === 'disabled'
        ? 'not-allowed'
        : isDragging
          ? 'grabbing'
          : 'grab',
    transform: CSS.Translate.toString(transform),
    touchAction: 'none',
    ...borderStyle(),
  }

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...(isStatic ? {} : listeners)}
      {...(isStatic ? {} : attributes)}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      data-testid={dataTestId ?? `word-tile-${word}-${wordClass}`}
      data-tts={`${label} tile: ${word}`}
      aria-label={`${word} — ${wordClass}`}
      aria-pressed={state === 'placed_correct' || state === 'placed_incorrect'}
      aria-disabled={state === 'disabled'}
      className={`
        inline-flex flex-col items-center justify-center
        rounded-lg font-mono font-bold text-white
        select-none transition-all duration-150
        focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1
        active:scale-95
        ${SIZE_CLASSES[size]}
        ${state === 'placed_incorrect' ? 'opacity-80' : ''}
      `}
    >
      {/* Word class label (small caps) */}
      <span
        className="text-[9px] uppercase tracking-widest opacity-75 leading-none mb-0.5"
        aria-hidden="true"
      >
        {label}
      </span>
      {/* The word itself */}
      <span className="leading-none" data-tts={word}>
        {word}
      </span>
    </button>
  )
}
