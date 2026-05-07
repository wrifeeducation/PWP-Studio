/**
 * DefinitionUnlock — 4-stage progressive cloze ceremony
 *
 * Fires when a pupil first encounters a new word class (e.g. on the level that
 * introduces "noun" for the first time). Shows the grammatical definition as a
 * modal with 4 fill-in-the-blank stages presented in sequence.
 *
 * Each stage reveals one more piece of the definition; the pupil selects the
 * correct answer from 3–4 choices. Stage 4 always asks for the word class
 * name itself, reinforcing the term.
 *
 * On completion: writes to the `definition_mastery` table (stage_reached = 4,
 * mastered_at = now, next_review_at = 3 days from now for spaced review).
 *
 * Props:
 *   wordClass  — which word class to unlock
 *   onComplete — called when all 4 stages pass (receives the word class)
 *   onDismiss  — called if the pupil closes without completing
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { WordClass, WORD_CLASS_COLOUR } from '../../types/index'

// ── Definition data ───────────────────────────────────────────────────────────

/**
 * A blank in the definition template.
 * index   — which blank this is (0-based)
 * answer  — the correct text to fill in
 * distractors — 2 wrong options (total choices = 3)
 */
interface Blank {
  index: number
  answer: string
  distractors: [string, string]
}

/**
 * The definition is represented as an array of parts:
 *   { type: 'text', content }  — rendered as plain text
 *   { type: 'blank', index }   — rendered as a blank to fill
 */
type DefPart = { type: 'text'; content: string } | { type: 'blank'; index: number }

interface WordClassDef {
  label: string        // display name: "Noun", "Verb", etc.
  wordClass: WordClass
  parts: DefPart[]     // full definition broken into text + blank parts
  blanks: Blank[]      // blanks in reveal order (index 0 = stage 1, index 3 = stage 4)
}

// ── Definitions for the 5 core early-level word classes ──────────────────────
// Blank indices and reveal order: 0 → 1 → 2 → 3 (stage 1 through 4)
// The final blank (index 3) is always the word class name itself.

const DEFINITIONS: Partial<Record<WordClass, WordClassDef>> = {
  [WordClass.NOUN]: {
    label: 'Noun',
    wordClass: WordClass.NOUN,
    // "A [noun] is the [name of a person], a [place] or [thing]."
    parts: [
      { type: 'text', content: 'A ' },
      { type: 'blank', index: 3 },
      { type: 'text', content: ' is the ' },
      { type: 'blank', index: 0 },
      { type: 'text', content: ', a ' },
      { type: 'blank', index: 1 },
      { type: 'text', content: ' or ' },
      { type: 'blank', index: 2 },
      { type: 'text', content: '.' },
    ],
    blanks: [
      { index: 0, answer: 'name of a person', distractors: ['type of action', 'kind of feeling'] },
      { index: 1, answer: 'place', distractors: ['verb', 'colour'] },
      { index: 2, answer: 'thing', distractors: ['sound', 'pattern'] },
      { index: 3, answer: 'noun', distractors: ['verb', 'adjective'] },
    ],
  },

  [WordClass.DETERMINER]: {
    label: 'Determiner',
    wordClass: WordClass.DETERMINER,
    // "A [determiner] is a word that [introduces] a [noun] and tells us [which one] or how many."
    parts: [
      { type: 'text', content: 'A ' },
      { type: 'blank', index: 3 },
      { type: 'text', content: ' is a word that ' },
      { type: 'blank', index: 0 },
      { type: 'text', content: ' a ' },
      { type: 'blank', index: 1 },
      { type: 'text', content: ' and tells us ' },
      { type: 'blank', index: 2 },
      { type: 'text', content: ' or how many.' },
    ],
    blanks: [
      { index: 0, answer: 'introduces', distractors: ['replaces', 'describes'] },
      { index: 1, answer: 'noun', distractors: ['verb', 'sentence'] },
      { index: 2, answer: 'which one', distractors: ['how fast', 'how big'] },
      { index: 3, answer: 'determiner', distractors: ['adjective', 'pronoun'] },
    ],
  },

  [WordClass.ADJECTIVE]: {
    label: 'Adjective',
    wordClass: WordClass.ADJECTIVE,
    // "An [adjective] is a [describing] word that tells us more about a [noun]."
    parts: [
      { type: 'text', content: 'An ' },
      { type: 'blank', index: 3 },
      { type: 'text', content: ' is a ' },
      { type: 'blank', index: 0 },
      { type: 'text', content: ' word that tells us more about a ' },
      { type: 'blank', index: 1 },
      { type: 'text', content: ', making it ' },
      { type: 'blank', index: 2 },
      { type: 'text', content: '.' },
    ],
    blanks: [
      { index: 0, answer: 'describing', distractors: ['naming', 'joining'] },
      { index: 1, answer: 'noun', distractors: ['verb', 'adverb'] },
      { index: 2, answer: 'more specific', distractors: ['more powerful', 'shorter'] },
      { index: 3, answer: 'adjective', distractors: ['adverb', 'noun'] },
    ],
  },

  [WordClass.VERB]: {
    label: 'Verb',
    wordClass: WordClass.VERB,
    // "A [verb] is a word that describes an [action], a [state] or a [happening]."
    parts: [
      { type: 'text', content: 'A ' },
      { type: 'blank', index: 3 },
      { type: 'text', content: ' is a word that describes an ' },
      { type: 'blank', index: 0 },
      { type: 'text', content: ', a ' },
      { type: 'blank', index: 1 },
      { type: 'text', content: ' or a ' },
      { type: 'blank', index: 2 },
      { type: 'text', content: '.' },
    ],
    blanks: [
      { index: 0, answer: 'action', distractors: ['colour', 'size'] },
      { index: 1, answer: 'state', distractors: ['sound', 'weight'] },
      { index: 2, answer: 'happening', distractors: ['picture', 'pattern'] },
      { index: 3, answer: 'verb', distractors: ['noun', 'adverb'] },
    ],
  },

  [WordClass.ADVERB]: {
    label: 'Adverb',
    wordClass: WordClass.ADVERB,
    // "An [adverb] is a word that [modifies] a verb, an adjective or [another adverb]."
    parts: [
      { type: 'text', content: 'An ' },
      { type: 'blank', index: 3 },
      { type: 'text', content: ' is a word that ' },
      { type: 'blank', index: 0 },
      { type: 'text', content: ' a verb, an ' },
      { type: 'blank', index: 1 },
      { type: 'text', content: ' or ' },
      { type: 'blank', index: 2 },
      { type: 'text', content: '.' },
    ],
    blanks: [
      { index: 0, answer: 'modifies', distractors: ['names', 'replaces'] },
      { index: 1, answer: 'adjective', distractors: ['noun', 'sentence'] },
      { index: 2, answer: 'another adverb', distractors: ['another noun', 'another pronoun'] },
      { index: 3, answer: 'adverb', distractors: ['verb', 'adjective'] },
    ],
  },

  [WordClass.PRONOUN]: {
    label: 'Pronoun',
    wordClass: WordClass.PRONOUN,
    // "A [pronoun] is a word that [replaces] a [noun] to avoid [repetition]."
    parts: [
      { type: 'text', content: 'A ' },
      { type: 'blank', index: 3 },
      { type: 'text', content: ' is a word that ' },
      { type: 'blank', index: 0 },
      { type: 'text', content: ' a ' },
      { type: 'blank', index: 1 },
      { type: 'text', content: ' to avoid ' },
      { type: 'blank', index: 2 },
      { type: 'text', content: '.' },
    ],
    blanks: [
      { index: 0, answer: 'replaces', distractors: ['describes', 'joins'] },
      { index: 1, answer: 'noun', distractors: ['verb', 'adverb'] },
      { index: 2, answer: 'repetition', distractors: ['confusion', 'long words'] },
      { index: 3, answer: 'pronoun', distractors: ['noun', 'verb'] },
    ],
  },

  [WordClass.PREPOSITION]: {
    label: 'Preposition',
    wordClass: WordClass.PREPOSITION,
    // "A [preposition] is a word that shows the [relationship] between a noun and [another word] in a sentence."
    parts: [
      { type: 'text', content: 'A ' },
      { type: 'blank', index: 3 },
      { type: 'text', content: ' is a word that shows the ' },
      { type: 'blank', index: 0 },
      { type: 'text', content: ' between a ' },
      { type: 'blank', index: 1 },
      { type: 'text', content: ' and ' },
      { type: 'blank', index: 2 },
      { type: 'text', content: ' in a sentence.' },
    ],
    blanks: [
      { index: 0, answer: 'relationship', distractors: ['difference', 'similarity'] },
      { index: 1, answer: 'noun', distractors: ['verb', 'adjective'] },
      { index: 2, answer: 'another word', distractors: ['a full stop', 'a paragraph'] },
      { index: 3, answer: 'preposition', distractors: ['conjunction', 'adverb'] },
    ],
  },

  [WordClass.CONJUNCTION]: {
    label: 'Conjunction',
    wordClass: WordClass.CONJUNCTION,
    // "A [conjunction] is a [joining] word that [links] two [clauses or phrases]."
    parts: [
      { type: 'text', content: 'A ' },
      { type: 'blank', index: 3 },
      { type: 'text', content: ' is a ' },
      { type: 'blank', index: 0 },
      { type: 'text', content: ' word that ' },
      { type: 'blank', index: 1 },
      { type: 'text', content: ' two ' },
      { type: 'blank', index: 2 },
      { type: 'text', content: '.' },
    ],
    blanks: [
      { index: 0, answer: 'joining', distractors: ['describing', 'naming'] },
      { index: 1, answer: 'links', distractors: ['describes', 'replaces'] },
      { index: 2, answer: 'clauses or phrases', distractors: ['nouns or verbs', 'letters or words'] },
      { index: 3, answer: 'conjunction', distractors: ['preposition', 'adverb'] },
    ],
  },
}

// ── Word class personality maps ───────────────────────────────────────────────

const EMOJI_MAP: Record<WordClass, string> = {
  [WordClass.NOUN]: '🏷️',
  [WordClass.VERB]: '⚡',
  [WordClass.ADJECTIVE]: '🎨',
  [WordClass.DETERMINER]: '👆',
  [WordClass.ADVERB]: '🚀',
  [WordClass.PREPOSITION]: '📍',
  [WordClass.PRONOUN]: '🔄',
  [WordClass.CONJUNCTION]: '🔗',
}

const PLAIN_ENGLISH_MAP_DU: Record<WordClass, string> = {
  [WordClass.NOUN]: 'naming word',
  [WordClass.VERB]: 'doing word',
  [WordClass.ADJECTIVE]: 'describing word',
  [WordClass.DETERMINER]: 'pointer word',
  [WordClass.ADVERB]: 'how / when word',
  [WordClass.PREPOSITION]: 'position word',
  [WordClass.PRONOUN]: 'replacement word',
  [WordClass.CONJUNCTION]: 'joining word',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffleOptions(correct: string, distractors: [string, string]): string[] {
  const opts = [correct, ...distractors]
  // Fisher–Yates shuffle
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[opts[i], opts[j]] = [opts[j], opts[i]]
  }
  return opts
}

// ── Main component ────────────────────────────────────────────────────────────

export interface DefinitionUnlockProps {
  wordClass: WordClass
  onComplete: (wc: WordClass) => void
  onDismiss: () => void
}

export function DefinitionUnlock({ wordClass, onComplete, onDismiss }: DefinitionUnlockProps) {
  const { profile } = useAuthStore()

  // Which stage we're on (0-indexed; 0 = first blank to fill, 3 = word class name)
  const [stageIndex, setStageIndex] = useState(0)
  // Map of blank index → filled answer (for blanks already completed)
  const [filled, setFilled] = useState<Record<number, string>>({})
  // Current multiple-choice options (shuffled fresh per stage)
  const [options, setOptions] = useState<string[]>([])
  // Feedback state per choice
  const [selected, setSelected] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(false)

  const def = DEFINITIONS[wordClass]
  const colour = WORD_CLASS_COLOUR[wordClass] ?? '#6C5CE7'

  // Generate shuffled options whenever stage changes
  useEffect(() => {
    if (!def) return
    const blank = def.blanks[stageIndex]
    if (!blank) return
    setOptions(shuffleOptions(blank.answer, blank.distractors))
    setSelected(null)
    setIsCorrect(null)
  }, [stageIndex, def])

  if (!def) return null

  const currentBlank = def.blanks[stageIndex]
  const totalStages = def.blanks.length // 4

  const handleSelect = async (choice: string) => {
    if (selected !== null || completing) return
    setSelected(choice)

    const correct = choice === currentBlank.answer
    setIsCorrect(correct)

    if (!correct) {
      // Allow retry after a brief shake
      setTimeout(() => {
        setSelected(null)
        setIsCorrect(null)
      }, 800)
      return
    }

    // Correct — fill this blank and advance
    const newFilled = { ...filled, [currentBlank.index]: choice }
    setFilled(newFilled)

    const nextStage = stageIndex + 1

    if (nextStage < totalStages) {
      // Small delay for animation before advancing
      setTimeout(() => setStageIndex(nextStage), 600)
    } else {
      // All stages complete
      setTimeout(async () => {
        setCompleting(true)
        await persistMastery()
        setCompleting(false)
        setCompleted(true)
      }, 600)
    }
  }

  const persistMastery = async () => {
    if (!profile) return
    const now = new Date()
    const reviewAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) // +3 days

    await supabase.from('definition_mastery').upsert({
      pupil_id: profile.id,
      word_class: wordClass,
      stage_reached: 4,
      unlocked_at: now.toISOString(),
      mastered_at: now.toISOString(),
      next_review_at: reviewAt.toISOString(),
      review_count: 0,
    })
  }

  const handleContinue = () => onComplete(wordClass)

  // Render each part of the definition
  const renderDefinition = () => {
    return def.parts.map((part, i) => {
      if (part.type === 'text') {
        return (
          <span key={i} style={{ color: 'var(--color-text)' }}>
            {part.content}
          </span>
        )
      }

      // Blank part
      const blankIdx = part.index
      const isFilled = blankIdx in filled
      const isActiveStage = def.blanks[stageIndex]?.index === blankIdx

      if (isFilled) {
        // Filled blank — show the answer in word class colour
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="font-bold rounded px-1"
            style={{ color: colour, backgroundColor: colour + '18' }}
            data-tts={filled[blankIdx]}
          >
            {filled[blankIdx]}
          </motion.span>
        )
      }

      if (isActiveStage && !completed) {
        // Active blank — pulsing dashed box
        return (
          <motion.span
            key={i}
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="inline-block rounded px-2 py-0.5 text-xs font-semibold"
            style={{
              border: `2px dashed ${colour}`,
              color: colour,
              backgroundColor: colour + '10',
              minWidth: 80,
              textAlign: 'center',
            }}
            data-tts="blank to fill"
          >
            {'?'.repeat(Math.min(currentBlank.answer.length, 5))}
          </motion.span>
        )
      }

      // Future blank — gray underscores
      return (
        <span
          key={i}
          className="inline-block rounded px-2 py-0.5 text-xs"
          style={{
            border: '1.5px solid var(--color-border)',
            color: 'var(--color-text-muted)',
            backgroundColor: 'var(--color-background)',
            minWidth: 60,
            textAlign: 'center',
          }}
          aria-hidden="true"
        >
          ___
        </span>
      )
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="def-unlock-title"
      data-testid="definition-unlock-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        {/* ── Coloured header panel (quiz phase only) ── */}
        {!completed && (
          <div
            className="px-5 py-4 flex items-start justify-between"
            style={{ backgroundColor: colour }}
          >
            <div className="flex items-center gap-3">
              <span className="text-4xl leading-none" aria-hidden="true">
                {EMOJI_MAP[wordClass]}
              </span>
              <div>
                <p className="text-white text-xs font-semibold uppercase tracking-wide opacity-75 leading-none mb-0.5">
                  ✦ New Word Class
                </p>
                <h2
                  id="def-unlock-title"
                  className="text-white text-xl font-bold leading-tight"
                  data-tts={`Learn the definition of ${def.label}`}
                >
                  Learn: {def.label}
                </h2>
                <p className="text-white text-sm opacity-90 font-medium mt-0.5">
                  {PLAIN_ENGLISH_MAP_DU[wordClass]}
                </p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-lg text-white opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Dismiss"
              data-testid="def-unlock-dismiss"
            >
              ✕
            </button>
          </div>
        )}

        <div className="p-6">
          {/* ── Completion screen ── */}
          {completed ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                className="text-6xl mb-4"
                aria-hidden="true"
              >
                🎉
              </motion.div>
              <h2
                id="def-unlock-title"
                className="text-xl font-bold mb-2"
                style={{ color: 'var(--color-text)' }}
                data-tts="Definition unlocked!"
              >
                Definition Unlocked!
              </h2>
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold mb-4"
                style={{ backgroundColor: colour + '18', color: colour }}
                data-tts={def.label}
              >
                {def.label}
              </div>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
                You've mastered the definition of a {def.label.toLowerCase()}.
                We'll review it again in 3 days to keep it sharp!
              </p>
              <button
                onClick={handleContinue}
                className="w-full py-3 rounded-xl text-base font-bold text-white"
                style={{ backgroundColor: colour }}
                data-testid="def-unlock-continue"
                data-tts="Continue"
              >
                Continue +50 XP ✦
              </button>
            </motion.div>
          ) : (
            <>
              {/* ── Stage progress bar — thicker active segment ── */}
              <div
                className="flex items-end gap-1.5 mb-4"
                aria-label={`Stage ${stageIndex + 1} of ${totalStages}`}
              >
                {Array.from({ length: totalStages }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="rounded-full flex-1"
                    animate={{
                      backgroundColor:
                        i < stageIndex
                          ? colour
                          : i === stageIndex
                          ? colour + 'BB'
                          : 'var(--color-border)',
                      height: i === stageIndex ? 10 : 6,
                    }}
                    transition={{ duration: 0.3 }}
                    aria-hidden="true"
                  />
                ))}
              </div>

              {/* ── Stage badge ── */}
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: colour + '18', color: colour }}
                >
                  Stage {stageIndex + 1} of {totalStages}
                </span>
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  — Fill in the blank
                </span>
              </div>

              {/* ── Definition with blanks — lightly tinted ── */}
              <div
                className="rounded-xl p-4 mb-5 text-base leading-loose"
                style={{
                  backgroundColor: colour + '0C',
                  border: `1.5px solid ${colour}33`,
                }}
                data-tts="Definition with blanks"
              >
                {renderDefinition()}
              </div>

              {/* ── Multiple choice options — bigger tap targets ── */}
              <div className="space-y-2.5" role="group" aria-label="Choose the correct word or phrase">
                <AnimatePresence mode="wait">
                  {options.map((opt) => {
                    const isThisSelected = selected === opt
                    const isThisCorrect = isThisSelected && isCorrect === true
                    const isThisWrong = isThisSelected && isCorrect === false

                    return (
                      <motion.button
                        key={opt}
                        onClick={() => handleSelect(opt)}
                        disabled={selected !== null && selected !== opt}
                        whileTap={{ scale: 0.97 }}
                        animate={
                          isThisWrong
                            ? { x: [-6, 6, -6, 6, 0], transition: { duration: 0.4 } }
                            : isThisCorrect
                            ? { scale: [1, 1.04, 1], transition: { duration: 0.25 } }
                            : {}
                        }
                        className="w-full text-left px-4 py-3.5 rounded-xl text-sm font-semibold transition-all"
                        style={{
                          backgroundColor: isThisCorrect
                            ? colour + '20'
                            : isThisWrong
                            ? '#FEE2E2'
                            : 'var(--color-background)',
                          border: `2px solid ${
                            isThisCorrect ? colour : isThisWrong ? '#F87171' : 'var(--color-border)'
                          }`,
                          color: isThisCorrect
                            ? colour
                            : isThisWrong
                            ? '#DC2626'
                            : 'var(--color-text)',
                          opacity: selected !== null && !isThisSelected ? 0.35 : 1,
                          cursor: selected !== null ? 'default' : 'pointer',
                        }}
                        data-testid={`def-choice-${opt.replace(/\s+/g, '-')}`}
                        data-tts={opt}
                      >
                        {isThisCorrect && '✓ '}
                        {isThisWrong && '✗ '}
                        {opt}
                      </motion.button>
                    )
                  })}
                </AnimatePresence>
              </div>

              <p
                className="mt-3 text-xs text-center"
                style={{ color: 'var(--color-text-muted)' }}
                data-tts="Tap the correct word to fill the blank"
              >
                Tap the correct word or phrase
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
