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
  /**
   * Phase 3: session-specific word bank override from generate-session-content.
   * When provided, replaces level.word_banks for this session (subject-rotated,
   * curated subset, with optional distractor words already merged in).
   */
  sessionWordBanks?: Record<string, string[]>
  /** Phase 3: AI-generated context sentence to display as session inspiration */
  contextSentence?: string | null
}

export const FormulaBuilder: React.FC<FormulaBuilderProps> = ({
  level,
  todaysSubject,
  onSubmit,
  isSubmitting,
  scaffoldStage = 1,
  currentLevelId,
  sessionWordBanks,
  contextSentence,
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
  // Interactive sentence-finishing state
  const [isCapitalised, setIsCapitalised] = useState(false)
  const [selectedPunctuation, setSelectedPunctuation] = useState<string | null>(null)
  // Sequential hint index: which slot (by formula_elements index) should auto-show its hint.
  // Starts at 0 (first slot). Advances when that slot gets filled so only one tooltip
  // is ever visible at a time — avoids double-tooltip overload for younger pupils.
  const [activeHintIndex, setActiveHintIndex] = useState(0)

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
    setActiveHintIndex(0)
    setIsCapitalised(false)
    setSelectedPunctuation(null)
  }, [level.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Compute allFilled directly from the subscribed slotSelections snapshot rather than
  // going through areAllSlotsFilled()'s internal get() call, which can return stale state
  // when the store is updated from outside React's event system (WF-BUG-003).
  const allFilled = level.formula_elements.every((el) => !!slotSelections[el.position])

  // Reset finishing steps whenever a slot is cleared (allFilled → false)
  useEffect(() => {
    if (!allFilled) {
      setIsCapitalised(false)
      setSelectedPunctuation(null)
    }
  }, [allFilled])

  // Advance the active hint slot when the current slot is filled.
  // This drives the sequential tooltip reveal: once the pupil places a word
  // in slot N, the hint for slot N+1 becomes active.
  useEffect(() => {
    const activeEl = level.formula_elements[activeHintIndex]
    if (activeEl && slotSelections[activeEl.position]) {
      setActiveHintIndex((prev) => prev + 1)
    }
  }, [slotSelections, activeHintIndex, level.formula_elements])

  // dnd-kit sensors (mouse + touch)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  // Single-tap: place tile into the first empty matching slot
  const handleTileSingleClick = useCallback(
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

  // Build the final sentence using the pupil's own capitalisation + punctuation choices
  const buildFinalSentence = (): string => {
    const words = level.formula_elements.map((el) => slotSelections[el.position] ?? '_____')
    const first = words[0] ?? ''
    const capitalisedFirst = isCapitalised ? first.charAt(0).toUpperCase() + first.slice(1) : first
    const joined = [capitalisedFirst, ...words.slice(1)].join(' ')
    return selectedPunctuation ? `${joined}${selectedPunctuation}` : joined
  }

  // Punctuation options: Stage 1–2 = full stop only (establish habit);
  // Stage 3–4 = all three (choose appropriately — AI assessor notes the choice)
  const punctuationOptions = scaffoldStage <= 2 ? ['.'] : ['.', '?', '!']

  // Whether the pupil has completed both finishing steps
  const sentenceComplete = isCapitalised && selectedPunctuation !== null

  // Gather used words (for submission payload)
  const getUsedWords = (): string[] =>
    level.formula_elements
      .map((el) => slotSelections[el.position])
      .filter((w): w is string => !!w)

  // Phase 3: prefer session-specific word banks (subject-rotated, with distractors)
  // falling back to level.word_banks when not yet available.
  const activeWordBanks: Record<string, string[]> =
    sessionWordBanks && Object.keys(sessionWordBanks).length > 0
      ? sessionWordBanks
      : (level.word_banks as Record<string, string[]>)

  // Build word bank entries: { id, word, wordClass }
  const wordBankEntries = level.formula_elements.flatMap((el) => {
    const words: string[] = activeWordBanks[el.word_class as WordClass] ?? []
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
            style={{ backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-noun)' }}
            data-tts={`Today's subject: ${todaysSubject}`}
            data-testid="subject-badge"
          >
            📚 Today's subject: <strong>{todaysSubject}</strong>
          </div>
        )}

        {/* ── Context sentence (Phase 3 AI-generated inspiration) ── */}
        {contextSentence && (
          <div
            className="rounded-xl px-4 py-3 flex items-start gap-3"
            style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}
            data-tts={`Inspiration sentence: ${contextSentence}`}
            data-testid="context-sentence"
          >
            <span className="text-xl leading-none mt-0.5" aria-hidden="true">💡</span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#065F46' }}>
                Inspiration sentence
              </p>
              <p className="text-base font-semibold leading-snug" style={{ color: '#065F46' }}>
                {contextSentence}
              </p>
            </div>
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
          style={{ backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }}
          data-tts="How to play: choose one word for each coloured box below. Drag a word from the word bank, or tap it to place it."
          data-testid="task-instruction"
        >
          <span className="text-xl leading-none mt-0.5" aria-hidden="true">🎯</span>
          <div>
            <p className="text-base font-bold mb-1" style={{ color: 'var(--color-brand-secondary)' }}>What to do</p>
            <p className="text-sm leading-snug" style={{ color: 'var(--color-text)' }}>
              Choose one word for each coloured box. Drag a word from the bank below — or <strong>tap</strong> it to place it automatically.
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
          {level.formula_elements.map((el, index) => (
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
              wordBankExamples={(activeWordBanks[el.word_class as WordClass] ?? []).slice(0, 4)}
              autoHint={scaffoldStage === 1 && index === activeHintIndex}
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

        {/* ── Sentence preview / finishing mechanic ── */}
        {!allFilled ? (
          /* Static preview while slots still empty */
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            data-testid="sentence-preview"
            aria-live="polite"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                Your sentence so far
              </p>
              <TTSButton text={buildSentence()} />
            </div>
            <p
              className="text-lg font-mono font-semibold leading-snug"
              style={{ color: 'var(--color-text-muted)' }}
              data-tts={buildSentence()}
            >
              {buildSentence()}
            </p>
          </div>
        ) : (
          /* Interactive finishing mechanic — all slots filled */
          <div
            className="rounded-xl p-4 space-y-4"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: `2px solid ${sentenceComplete ? 'var(--color-brand-secondary)' : 'var(--color-brand-primary)'}`,
            }}
            data-testid="sentence-finish-panel"
            aria-live="polite"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span aria-hidden="true">{sentenceComplete ? '✅' : '✨'}</span>
                <p className="text-sm font-bold" style={{ color: sentenceComplete ? 'var(--color-brand-secondary)' : 'var(--color-brand-primary)' }}>
                  {sentenceComplete ? 'Great — your sentence is ready!' : 'Make it a proper sentence!'}
                </p>
              </div>
              <TTSButton text={buildFinalSentence()} />
            </div>

            {/* ── Step 1: Capitalise first word ── */}
            <div className="space-y-2" data-testid="capitalise-step">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: isCapitalised ? 'var(--color-brand-secondary)' : 'var(--color-brand-primary)' }}
                  aria-hidden="true"
                >
                  {isCapitalised ? '✓' : '1'}
                </span>
                <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  {isCapitalised ? 'Capital letter added' : 'Tap the first word to start with a capital letter'}
                </p>
              </div>

              {/* Sentence with tappable first word */}
              <div
                className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-lg font-mono font-semibold leading-snug px-1"
                data-tts={buildFinalSentence()}
              >
                {/* First word — clickable toggle */}
                {(() => {
                  const words = level.formula_elements.map((el) => slotSelections[el.position] ?? '_____')
                  const first = words[0] ?? ''
                  const rest = words.slice(1)
                  const displayFirst = isCapitalised
                    ? first.charAt(0).toUpperCase() + first.slice(1)
                    : first
                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsCapitalised((v) => !v)}
                        data-testid="capitalise-toggle"
                        data-tts={isCapitalised ? `${displayFirst} — tap to un-capitalise` : `${displayFirst} — tap to capitalise`}
                        aria-label={isCapitalised ? 'Tap to un-capitalise first word' : 'Tap to capitalise first word'}
                        className="rounded-md px-1.5 py-0.5 transition-all duration-150 focus:outline-none focus-visible:ring-2"
                        style={{
                          color: isCapitalised ? 'var(--color-brand-primary)' : 'var(--color-text)',
                          border: isCapitalised
                            ? '2px solid var(--color-brand-primary)'
                            : '2px dashed var(--color-text-muted)',
                          backgroundColor: isCapitalised ? 'rgba(108,92,231,0.08)' : 'transparent',
                          minWidth: '44px',
                          minHeight: '36px',
                        }}
                      >
                        {displayFirst}
                      </button>
                      {rest.map((w, i) => (
                        <span key={i} style={{ color: 'var(--color-text)' }}>{w}</span>
                      ))}
                      {selectedPunctuation && (
                        <span style={{ color: 'var(--color-brand-secondary)' }}>{selectedPunctuation}</span>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>

            {/* ── Step 2: Punctuation ── (revealed after step 1) */}
            {isCapitalised && (
              <div className="space-y-2" data-testid="punctuation-step">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: selectedPunctuation ? 'var(--color-brand-secondary)' : 'var(--color-brand-primary)' }}
                    aria-hidden="true"
                  >
                    {selectedPunctuation ? '✓' : '2'}
                  </span>
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                    {selectedPunctuation ? `Ending with "${selectedPunctuation}"` : 'How does the sentence end?'}
                  </p>
                </div>

                <div className="flex gap-3" role="group" aria-label="Choose punctuation">
                  {punctuationOptions.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedPunctuation(selectedPunctuation === p ? null : p)}
                      data-testid={`punctuation-${p === '.' ? 'full-stop' : p === '?' ? 'question' : 'exclamation'}`}
                      data-tts={p === '.' ? 'Full stop' : p === '?' ? 'Question mark' : 'Exclamation mark'}
                      aria-pressed={selectedPunctuation === p}
                      aria-label={p === '.' ? 'Full stop' : p === '?' ? 'Question mark' : 'Exclamation mark'}
                      className="flex items-center justify-center rounded-xl text-3xl font-bold transition-all duration-150 focus:outline-none focus-visible:ring-2"
                      style={{
                        minWidth: '64px',
                        minHeight: '64px',
                        backgroundColor: selectedPunctuation === p ? 'var(--color-brand-primary)' : 'var(--color-background)',
                        color: selectedPunctuation === p ? '#fff' : 'var(--color-text)',
                        border: selectedPunctuation === p
                          ? '2px solid var(--color-brand-primary)'
                          : '2px solid var(--color-border)',
                        transform: selectedPunctuation === p ? 'scale(1.08)' : 'scale(1)',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {/* Hint for Stage 3+: which to choose */}
                {scaffoldStage >= 3 && !selectedPunctuation && (
                  <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                    Use <strong>.</strong> for a statement · <strong>?</strong> for a question · <strong>!</strong> for excitement
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Word bank ── */}
        <div data-testid="word-bank">
          <p
            className="text-xs uppercase tracking-wider font-semibold mb-3"
            style={{ color: 'var(--color-text-muted)' }}
            data-tts="Your words — pick from these to fill the boxes above"
          >
            Your words — drag or tap to place
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
                onClick={() =>
                  handleTileSingleClick(entry.word, entry.wordClass, entry.id)
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
              if (sentenceComplete && !isSubmitting) {
                onSubmit(buildFinalSentence(), getUsedWords(), hintsUsed)
              }
            }}
            disabled={!sentenceComplete || isSubmitting}
            aria-disabled={!sentenceComplete || isSubmitting}
            className="flex-1 py-3.5 rounded-xl text-base font-bold text-white transition-all duration-150 focus:outline-none focus-visible:ring-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: sentenceComplete ? 'var(--color-brand-secondary)' : 'var(--color-disabled)' }}
            data-testid="submit-button"
            data-tts={
              !allFilled ? 'Fill all slots to continue'
              : !isCapitalised ? 'Tap the first word to capitalise it'
              : !selectedPunctuation ? 'Choose punctuation to submit'
              : 'Submit your sentence'
            }
            aria-label="Submit formula for assessment"
          >
            {isSubmitting ? 'Checking…'
              : !allFilled ? 'Fill all slots'
              : !isCapitalised ? 'Tap the first word first'
              : !selectedPunctuation ? 'Choose how it ends'
              : '✓ Submit Sentence'}
          </button>
        </div>
      </div>
    </DndContext>
  )
}
