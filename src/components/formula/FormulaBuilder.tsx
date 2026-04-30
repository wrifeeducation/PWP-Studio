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
import { getNewConceptCardsForLevel } from '../../lib/definitions'
import { sfx } from '../../lib/sfx'

interface FormulaBuilderProps {
  level: FormulaLevel
  todaysSubject: string | null
  onSubmit: (sentence: string, wordsUsed: string[], hintsUsed: WordClass[]) => void
  isSubmitting: boolean
  /** Scaffold stage 1–4, determines label/hint availability */
  scaffoldStage?: number
  /** Current level ID — used to show in-session reference card for new word classes */
  currentLevelId?: number
}

export const FormulaBuilder: React.FC<FormulaBuilderProps> = ({
  level,
  todaysSubject,
  onSubmit,
  isSubmitting,
  scaffoldStage = 1,
  currentLevelId,
}) => {
  const {
    slotSelections,
    usedWordIds,
    setSlotWord,
    clearSlot,
    resetSession,
    setLabelsVisible,
    labelsVisible,
  } = useFormulaStore()

  const labelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track which word classes had hints used this session
  const [hintsUsed, setHintsUsed] = useState<WordClass[]>([])
  // Reference card expansion state
  const [refCardOpen, setRefCardOpen] = useState(false)
  const [refCardIndex, setRefCardIndex] = useState(0)

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
    setRefCardOpen(false)
    setRefCardIndex(0)
  }, [level.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // dnd-kit sensors (mouse + touch)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  // Double-click / double-tap: place tile into the first empty matching slot
  const handleTileDoubleClick = useCallback(
    (word: string, wordClass: WordClass, tileId: string) => {
      if (usedWordIds.has(tileId)) return // already placed
      const matchingSlot = level.formula_elements.find(
        (el) => el.word_class === wordClass && !slotSelections[el.position]
      )
      if (matchingSlot) {
        setSlotWord(matchingSlot.position, word, tileId)
        sfx.drop()
      }
    },
    [level.formula_elements, slotSelections, usedWordIds, setSlotWord]
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
      sfx.drop()
    },
    [slotSelections, setSlotWord]
  )

  // Build the live sentence from slot selections
  const buildSentence = (): string => {
    return level.formula_elements
      .map((el) => slotSelections[el.position] ?? '_____')
      .join(' ')
  }

  // Build the sentence with correct capitalisation and a full stop
  const buildDisplaySentence = (): string => {
    const raw = buildSentence()
    if (!raw) return raw
    const capitalised = raw.charAt(0).toUpperCase() + raw.slice(1)
    return capitalised.endsWith('.') ? capitalised : `${capitalised}.`
  }

  // Compute allFilled directly from the subscribed slotSelections snapshot rather than
  // going through areAllSlotsFilled()'s internal get() call, which can return stale state
  // when the store is updated from outside React's event system (WF-BUG-003).
  const allFilled = level.formula_elements.every((el) => !!slotSelections[el.position])

  // Punctuation check: first word capitalised AND ends with a full stop (only meaningful when all filled)
  const rawSentence = buildSentence()
  const firstWord = rawSentence.split(' ')[0] ?? ''
  const hasCapital = allFilled && firstWord.length > 0 && firstWord[0] === firstWord[0].toUpperCase() && firstWord[0] !== '_'
  const hasPunctuation = allFilled && !rawSentence.endsWith('_____')

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

  // New word class reference cards for in-session lookup
  const allWordClasses = level.formula_elements.map((el) => el.word_class as WordClass)
  const newTermCards = currentLevelId
    ? getNewConceptCardsForLevel(allWordClasses, currentLevelId)
    : []
  const activeRefCard = newTermCards[refCardIndex] ?? null

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

        {/* ── New word class reference card (in-session reminder) ── */}
        {newTermCards.length > 0 && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: `2px solid var(--color-${activeRefCard?.wordClass ?? 'noun'})` }}
            data-testid="new-term-reference-card"
          >
            {/* Header — always visible, tap to expand */}
            <button
              className="w-full px-4 py-2.5 flex items-center justify-between text-left"
              style={{ backgroundColor: `var(--color-${activeRefCard?.wordClass ?? 'noun'})` }}
              onClick={() => setRefCardOpen((v) => !v)}
              data-tts={refCardOpen ? 'Hide word type reminder' : 'Show word type reminder'}
              aria-expanded={refCardOpen}
            >
              <div className="flex items-center gap-2">
                <span className="text-white text-xs font-bold uppercase tracking-wide">
                  ✨ New today:
                </span>
                <span className="text-white text-sm font-bold">
                  {activeRefCard?.plainEnglishName} ({activeRefCard?.label})
                </span>
              </div>
              <span className="text-white text-lg leading-none" aria-hidden="true">
                {refCardOpen ? '▲' : '▼'}
              </span>
            </button>

            {/* Expandable body */}
            {refCardOpen && activeRefCard && (
              <div
                className="px-4 py-3 space-y-2"
                style={{ backgroundColor: 'var(--color-surface)' }}
              >
                <p
                  className="text-sm font-medium leading-snug"
                  style={{ color: 'var(--color-text)' }}
                  data-tts={activeRefCard.childFriendlyDefinition}
                >
                  {activeRefCard.childFriendlyDefinition}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {activeRefCard.examples.slice(0, 5).map((ex) => (
                    <span
                      key={ex}
                      className="px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: `var(--color-${activeRefCard.wordClass})` }}
                    >
                      {ex}
                    </span>
                  ))}
                </div>
                {/* Navigate between multiple new cards */}
                {newTermCards.length > 1 && (
                  <div className="flex gap-2 pt-1">
                    {newTermCards.map((card, i) => (
                      <button
                        key={card.wordClass}
                        onClick={() => setRefCardIndex(i)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-white transition-opacity"
                        style={{
                          backgroundColor: `var(--color-${card.wordClass})`,
                          opacity: i === refCardIndex ? 1 : 0.5,
                        }}
                      >
                        {card.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Task instruction banner ── */}
        <div
          className="rounded-xl px-4 py-3 flex items-start gap-3"
          style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}
          data-tts="How to play: choose one word for each coloured box below. Drag a word from the word bank, or double-tap it to place it."
          data-testid="task-instruction"
        >
          <span className="text-xl leading-none mt-0.5" aria-hidden="true">🎯</span>
          <div>
            <p className="text-base font-bold text-blue-800 mb-1">What to do</p>
            <p className="text-sm text-blue-700 leading-snug">
              Choose one word for each coloured box. Drag a word from the bank below — or <strong>double-tap</strong> it to place it automatically.
            </p>
          </div>
        </div>

        {/* ── Formula slots row ── */}
        <div
          className="grid gap-3 sm:gap-4"
          style={{ gridTemplateColumns: `repeat(${level.formula_elements.length}, minmax(0, 1fr))` }}
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
                  sfx.clear()
                }
              }}
              onHintUsed={handleHintUsed}
              dataTestId={`formula-slot-${el.position}`}
            />
          ))}
        </div>

        {/* ── Live sentence preview with capitalisation indicator ── */}
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
            <div className="flex items-center gap-2">
              {/* Punctuation rule indicators — shown once all slots filled */}
              {allFilled && (
                <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                  <span
                    className="px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: hasCapital ? '#DCFCE7' : '#FEE2E2',
                      color: hasCapital ? '#166534' : '#991B1B',
                    }}
                    title="First letter must be a capital"
                    data-tts={hasCapital ? 'Capital letter: correct' : 'Capital letter missing'}
                  >
                    {hasCapital ? '✓ Aa' : '✗ Aa'}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: hasPunctuation ? '#DCFCE7' : '#FEE2E2',
                      color: hasPunctuation ? '#166534' : '#991B1B',
                    }}
                    title="Sentence must end with a full stop"
                    data-tts={hasPunctuation ? 'Full stop: correct' : 'Full stop needed'}
                  >
                    {hasPunctuation ? '✓ .' : '✗ .'}
                  </span>
                </div>
              )}
              <TTSButton text={buildDisplaySentence()} />
            </div>
          </div>
          <p
            className="text-lg font-mono font-semibold leading-snug"
            style={{ color: allFilled ? 'var(--color-text)' : 'var(--color-text-muted)' }}
            data-tts={buildDisplaySentence()}
          >
            {buildDisplaySentence()}
          </p>
        </div>

        {/* ── Word bank ── */}
        <div data-testid="word-bank">
          <p
            className="text-xs uppercase tracking-wider font-semibold mb-3"
            style={{ color: 'var(--color-text-muted)' }}
            data-tts="Your words — pick from these to fill the boxes above"
          >
            Your words — drag or double-tap to place
          </p>
          <div className="flex flex-wrap gap-2.5 sm:gap-3.5">
            {uniqueBankEntries.map((entry) => (
              <WordClassTile
                key={entry.id}
                id={entry.id}
                word={entry.word}
                wordClass={entry.wordClass}
                state={usedWordIds.has(entry.id) ? 'disabled' : 'idle'}
                size="md"
                dataTestId={`word-tile-${entry.id}`}
                onDoubleClick={() =>
                  handleTileDoubleClick(entry.word, entry.wordClass, entry.id)
                }
              />
            ))}
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div className="flex gap-3 sm:gap-4">
          <button
            onClick={() => { resetSession(); sfx.clear() }}
            className="px-5 py-3.5 rounded-xl text-sm font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2"
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
                onSubmit(buildDisplaySentence(), getUsedWords(), hintsUsed)
              }
            }}
            disabled={!allFilled || isSubmitting}
            aria-disabled={!allFilled || isSubmitting}
            className="flex-1 py-3.5 rounded-xl text-base font-bold text-white transition-all duration-150 focus:outline-none focus-visible:ring-2 disabled:opacity-40 disabled:cursor-not-allowed"
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
