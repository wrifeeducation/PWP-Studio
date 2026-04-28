/**
 * WF-006: Core formula builder UI.
 * Shows slots + word bank; handles drag-and-drop via dnd-kit.
 * Kept under 200 lines — feedback is in FormulaFeedback.tsx.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import type { FormulaLevel } from '../../types/index'
import { Phase, WordClass } from '../../types/index'
import { useFormulaStore } from '../../stores/formulaStore'
import { WordClassTile } from './WordClassTile'
import { FormulaSlot } from './FormulaSlot'
import { TTSButton } from '../ui/TTSButton'

interface FormulaBuilderProps {
  level: FormulaLevel
  todaysSubject: string | null
  onSubmit: (sentence: string, wordsUsed: string[], hintsUsed: WordClass[]) => void
  isSubmitting: boolean
  /** Scaffold stage 1–4, determines label/hint availability */
  scaffoldStage?: number
}

export const FormulaBuilder: React.FC<FormulaBuilderProps> = ({
  level,
  todaysSubject,
  onSubmit,
  isSubmitting,
  scaffoldStage = 1,
}) => {
  const {
    slotSelections,
    usedWordIds,
    setSlotWord,
    clearSlot,
    resetSession,
    setLabelsVisible,
    labelsVisible,
    areAllSlotsFilled,
  } = useFormulaStore()

  const labelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const totalSlots = level.formula_elements.length
  // Track which word classes had hints used this session
  const [hintsUsed, setHintsUsed] = useState<WordClass[]>([])

  // Phase B: hide labels after 3 seconds
  useEffect(() => {
    if (level.phase === Phase.B) {
      setLabelsVisible(true)
      labelTimerRef.current = setTimeout(() => setLabelsVisible(false), 3000)
    } else if (level.phase === Phase.A) {
      setLabelsVisible(true)
    } else {
      setLabelsVisible(false)
    }
    return () => {
      if (labelTimerRef.current) clearTimeout(labelTimerRef.current)
    }
  }, [level.phase, level.id, setLabelsVisible])

  // Reset when level changes
  useEffect(() => {
    resetSession()
    setHintsUsed([])
  }, [level.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // dnd-kit sensors (mouse + touch)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over) return

      // over.id should be "slot-{position}"
      const overId = String(over.id)
      if (!overId.startsWith('slot-')) return

      const slotPosition = parseInt(overId.replace('slot-', ''), 10)
      const word = active.data.current?.word as string | undefined
      const wordId = String(active.id)

      if (!word) return

      // If slot already occupied, just ignore (clear first to swap)
      if (slotSelections[slotPosition]) return

      setSlotWord(slotPosition, word, wordId)
    },
    [slotSelections, setSlotWord]
  )

  // Build the live sentence from slot selections
  const buildSentence = (): string => {
    return level.formula_elements
      .map((el) => slotSelections[el.position] ?? '_____')
      .join(' ')
  }

  // Compute allFilled directly from the subscribed slotSelections snapshot rather than
  // going through areAllSlotsFilled()'s internal get() call, which can return stale state
  // when the store is updated from outside React's event system (WF-BUG-003).
  const allFilled = level.formula_elements.every((el) => !!slotSelections[el.position])

  // Gather used words (for submission payload)
  const getUsedWords = (): string[] =>
    level.formula_elements
      .map((el) => slotSelections[el.position])
      .filter((w): w is string => !!w)

  // Build word bank entries: { id, word, wordClass }
  // We shuffle words per word class entry in level.word_banks
  const wordBankEntries = level.formula_elements.flatMap((el) => {
    const words: string[] = level.word_banks[el.word_class as WordClass] ?? []
    return words.slice(0, 8).map((w, i) => ({
      id: `${el.word_class}-${w}-${i}`,
      word: w,
      wordClass: el.word_class as WordClass,
    }))
  })

  // Deduplicate by id
  const seen = new Set<string>()
  const uniqueBankEntries = wordBankEntries.filter((e) => {
    if (seen.has(e.id)) return false
    seen.add(e.id)
    return true
  })

  const displayPhase = labelsVisible ? Phase.A : level.phase

  const handleHintUsed = useCallback((wordClass: WordClass) => {
    setHintsUsed((prev) =>
      prev.includes(wordClass) ? prev : [...prev, wordClass]
    )
  }, [])

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="space-y-6" data-testid="formula-builder">
        {/* ── Subject badge ── */}
        {todaysSubject && (
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
            style={{ backgroundColor: '#EFF6FF', color: 'var(--color-noun)' }}
            data-tts={`Today's subject: ${todaysSubject}`}
            data-testid="subject-badge"
          >
            📚 Today's subject: <strong>{todaysSubject}</strong>
          </div>
        )}

        {/* ── Phase label ── */}
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
            style={{ backgroundColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            data-tts={`Level ${level.id}, Phase ${level.phase}`}
          >
            L{level.id} · Phase {level.phase}
          </span>
        </div>

        {/* ── Formula slots row ── */}
        <div
          className="flex flex-wrap gap-3 justify-center"
          role="group"
          aria-label="Formula slots"
          data-testid="formula-slots"
        >
          {level.formula_elements.map((el) => (
            <FormulaSlot
              key={el.position}
              id={`slot-${el.position}`}
              position={el.position}
              wordClass={el.word_class as WordClass}
              phase={displayPhase}
              selectedWord={slotSelections[el.position] ?? null}
              instruction={el.instruction}
              example={el.example}
              scaffoldStage={scaffoldStage}
              wordBankExamples={(level.word_banks[el.word_class as WordClass] ?? []).slice(0, 4)}
              onClear={() => {
                const wordId = Object.keys(slotSelections)
                  .map((k) => ({
                    pos: parseInt(k),
                    word: slotSelections[parseInt(k)],
                  }))
                  .find((e) => e.pos === el.position)
                if (wordId) {
                  const matchId = Array.from(usedWordIds).find((id) =>
                    id.startsWith(`${el.word_class}-${slotSelections[el.position]}-`)
                  )
                  clearSlot(el.position, matchId ?? '')
                }
              }}
              onHintUsed={handleHintUsed}
              dataTestId={`formula-slot-${el.position}`}
            />
          ))}
        </div>

        {/* ── Live sentence preview ── */}
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
          data-testid="sentence-preview"
          aria-live="polite"
          aria-label="Sentence preview"
        >
          <div className="flex items-center justify-between mb-2">
            <p
              className="text-xs uppercase tracking-wider font-semibold"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Your sentence
            </p>
            <TTSButton text={buildSentence()} />
          </div>
          <p
            className="text-base font-mono font-medium"
            style={{ color: allFilled ? 'var(--color-text)' : 'var(--color-text-muted)' }}
            data-tts={buildSentence()}
          >
            {buildSentence()}
          </p>
        </div>

        {/* ── Word bank ── */}
        <div data-testid="word-bank">
          <p
            className="text-xs uppercase tracking-wider font-semibold mb-3"
            style={{ color: 'var(--color-text-muted)' }}
            data-tts="Word bank — drag a word to a slot"
          >
            Word Bank — drag a word to a slot
          </p>
          <div className="flex flex-wrap gap-2">
            {uniqueBankEntries.map((entry) => (
              <WordClassTile
                key={entry.id}
                id={entry.id}
                word={entry.word}
                wordClass={entry.wordClass}
                state={usedWordIds.has(entry.id) ? 'disabled' : 'idle'}
                size="md"
                dataTestId={`word-tile-${entry.id}`}
              />
            ))}
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div className="flex gap-3">
          <button
            onClick={() => resetSession()}
            className="px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2"
            style={{
              border: '2px solid var(--color-border)',
              color: 'var(--color-text-muted)',
              backgroundColor: 'var(--color-surface)',
            }}
            data-testid="reset-button"
            data-tts="Reset all slots"
            aria-label="Reset all slots"
          >
            Reset
          </button>

          <button
            onClick={() => {
              if (allFilled && !isSubmitting) {
                onSubmit(buildSentence(), getUsedWords(), hintsUsed)
              }
            }}
            disabled={!allFilled || isSubmitting}
            aria-disabled={!allFilled || isSubmitting}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-150 focus:outline-none focus-visible:ring-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: allFilled ? 'var(--color-noun)' : '#9CA3AF' }}
            data-testid="submit-button"
            data-tts={allFilled ? 'Submit your sentence' : 'Fill all slots to submit'}
            aria-label="Submit formula for assessment"
          >
            {isSubmitting ? 'Checking…' : allFilled ? '✓ Submit Sentence' : 'Fill all slots'}
          </button>
        </div>
      </div>
    </DndContext>
  )
}
