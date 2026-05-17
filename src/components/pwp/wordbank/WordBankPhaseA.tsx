/**
 * Phase A Word Bank — Build Mode (Levels 1–6)
 *
 * Pupil assembles a sentence by tapping word chips from the bank.
 * Sentence tray starts COMPLETELY EMPTY — no pre-placed subject chip.
 * Sam appears only in the example sentence; the pupil picks their own
 * subject noun from the NOUN section of the bank.
 *
 * Capitalisation and end punctuation are handled downstream by
 * PunctuationStep — this component emits a raw, unpunctuated sentence.
 *
 * Word bank chips are grouped by word class with section headers
 * using the canonical WriFe word-class colour system.
 */

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getWordClassColour, guessWordClass } from '@/constants/wordClassColours'

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface WordBankPhaseAProps {
  bankWords:     string[]
  distractors:   string[] | null
  /** Still passed for assessment context — never pre-placed in the tray */
  subjectPrompt: string
  onChange:      (assembled: string) => void
  disabled:      boolean
  /**
   * Formula string for this step (e.g. "Det + Adj + N + Helping Verb + V(-ing)").
   * When supplied, word bank sections are ordered left-to-right to match the formula
   * so pupils see Determiners first, then Nouns, then Verbs, exactly as written.
   */
  formula?:      string
}

interface BankSection {
  wordClass: string  // e.g. 'noun', 'verb', 'determiner'
  label: string      // e.g. 'Nouns', 'Verbs', 'Determiners'
  words: { word: string; origIdx: number }[]
}

// ─── SECTION GROUPING ────────────────────────────────────────────────────────

/**
 * Helping verbs that get their own labelled section in the word bank
 * so pupils can clearly distinguish them from action/main verbs.
 * Covers the forms used in PWP continuous-tense formulas (L16+).
 */
const HELPING_VERBS_BANK = new Set([
  'is', 'are', 'was', 'were',
  'has', 'have', 'had',
  'will', 'would', 'could', 'should', 'can', 'may', 'might', 'shall',
  'do', 'does', 'did',
])

// ─── Formula-driven section ordering ─────────────────────────────────────────
// Maps the abbreviated formula token labels to word-class keys.
// Mirrors the mapping in FormulaBar.tsx LABEL_TO_CLASS; kept local here to
// avoid a circular dependency between wordbank/ and step/ components.

const FORMULA_TOKEN_TO_WC: Record<string, string> = {
  det: 'determiner', d: 'determiner', determiner: 'determiner',
  'det (definite)': 'determiner', 'det (indefinite)': 'determiner',
  n: 'noun', noun: 'noun',
  'n(subject)': 'noun', 'n(object)': 'noun',
  'noun(subject)': 'noun', 'noun(object)': 'noun',
  'noun (subject)': 'noun', 'noun (object)': 'noun',
  adj: 'adjective', adjective: 'adjective',
  adv: 'adverb', adverb: 'adverb',
  'adverb (manner)': 'adverb', 'adverb (time)': 'adverb', 'adverb (place)': 'adverb',
  'adverb of manner': 'adverb', 'adverb of time': 'adverb', 'adverb of place': 'adverb',
  pro: 'pronoun', pronoun: 'pronoun',
  prep: 'preposition', preposition: 'preposition',
  conj: 'conjunction', conjunction: 'conjunction',
  // Helping verbs — must come BEFORE the plain 'verb' entries
  'helping v': 'helping_verb', 'helping verb': 'helping_verb',
  'helping verb (is)': 'helping_verb', 'helping verb (are)': 'helping_verb',
  'helping verb (was)': 'helping_verb', 'helping verb (were)': 'helping_verb',
  'helping verb + verb(-ing)': 'helping_verb',
  'helping verb + verb (-ing)': 'helping_verb',
  // Action / main verbs
  v: 'verb', verb: 'verb',
  'v(-ing)': 'verb', 'verb(-ing)': 'verb',
  'v(past)': 'verb', 'v(present)': 'verb', 'v(continuous)': 'verb',
  'verb (past tense)': 'verb', 'verb (present tense)': 'verb',
  'verb (past)': 'verb', 'verb (present)': 'verb', 'verb (continuous)': 'verb',
}

const DEFAULT_SECTION_ORDER = ['determiner', 'noun', 'helping_verb', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction']

/**
 * Derives the word-class section order from a formula string such as
 * "Det + Adj + N + Helping Verb + V(-ing)".
 * Sections will appear left-to-right in the same order as the formula tokens,
 * with any classes not in the formula appended at the end (for distractors).
 */
function orderFromFormula(formula: string | undefined): string[] {
  if (!formula) return DEFAULT_SECTION_ORDER
  const seen = new Set<string>()
  const order: string[] = []
  formula.split(/\s*\+\s*/).forEach(token => {
    const wc = FORMULA_TOKEN_TO_WC[token.trim().toLowerCase()]
    if (wc && !seen.has(wc)) { seen.add(wc); order.push(wc) }
  })
  // Append defaults not already in formula order (handles distractor word classes)
  DEFAULT_SECTION_ORDER.forEach(wc => { if (!seen.has(wc)) order.push(wc) })
  return order
}

/**
 * Groups bank words into labelled sections by inferred word class.
 * Section order matches the formula left-to-right when a formula is supplied,
 * otherwise falls back to the default: Determiners → Nouns → Helping Verbs → Verbs → …
 * Helping verbs (is/are/was/were etc.) are always separated from action/main verbs.
 */
function groupIntoSections(words: string[], formula?: string): BankSection[] {
  const ORDER = orderFromFormula(formula)
  const map = new Map<string, { word: string; origIdx: number }[]>()
  words.forEach((word, origIdx) => {
    // Check for helping verbs BEFORE guessWordClass — both return 'verb' otherwise
    const wc = HELPING_VERBS_BANK.has(word.toLowerCase()) ? 'helping_verb' : guessWordClass(word)
    if (!map.has(wc)) map.set(wc, [])
    map.get(wc)!.push({ word, origIdx })
  })
  const sections: BankSection[] = []
  // Add in preferred order first
  ORDER.forEach(wc => {
    if (map.has(wc)) {
      const colour = getWordClassColour(wc)
      sections.push({
        wordClass: wc,
        label: colour.name + 's',
        words: map.get(wc)!,
      })
      map.delete(wc)
    }
  })
  // Any remaining classes
  map.forEach((words, wc) => {
    const colour = getWordClassColour(wc)
    sections.push({ wordClass: wc, label: colour.name + 's', words })
  })
  return sections
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export function WordBankPhaseA({ bankWords, distractors, onChange, disabled, formula }: WordBankPhaseAProps) {
  // Pool: bank words + distractors, shuffled once on mount.
  // Each entry tracks its original position to avoid key collisions.
  const [pool, setPool] = useState<{ word: string; id: number }[]>(() => {
    const all = [...bankWords, ...(distractors ?? [])].map((word, i) => ({ word, id: i }))
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]]
    }
    return all
  })
  const [tray, setTray] = useState<{ word: string; id: number }[]>([])

  // Emit raw assembled string (no punctuation) whenever tray changes
  useEffect(() => {
    onChange(tray.map(t => t.word).join(' '))
  }, [tray]) // eslint-disable-line react-hooks/exhaustive-deps

  const addToTray = (id: number) => {
    if (disabled) return
    const item = pool.find(p => p.id === id)
    if (!item) return
    setPool(p => p.filter(x => x.id !== id))
    setTray(t => [...t, item])
  }

  const clearTray = () => {
    if (disabled) return
    setPool(p => [...p, ...tray])
    setTray([])
  }

  // Group pool words into sections for display — ordered to match the formula
  const sections = useMemo(
    () => groupIntoSections(pool.map(p => p.word), formula),
    [pool, formula]
  )

  return (
    <div className="select-none">
      {/* ── WORD BANK ─────────────────────────────────────────────────── */}
      <div
        className="bg-[#f8f5ff] border-2 border-[#e8e0ff] rounded-xl px-3 py-3 sm:px-4 sm:py-4 space-y-3"
        aria-label="Word bank — tap a word to add it to your sentence"
      >
        {/* Start over link — shown when pupil has placed at least one word */}
        {!disabled && tray.length > 0 && (
          <div className="flex justify-end mb-1">
            <button
              className="text-xs text-[#bbb] hover:text-[#888] transition-colors"
              onClick={clearTray}
              aria-label="Start over — return all words to the bank"
              data-tts="Start over"
            >
              Start over ✕
            </button>
          </div>
        )}

        {pool.length === 0 ? (
          <p className="text-xs text-[#aaa] text-center py-1">All words placed!</p>
        ) : sections.length === 0 ? null : sections.map(section => {
          const colour = getWordClassColour(section.wordClass)
          // Find the ids in pool that match this section's words
          // Must use the same helping-verb pre-check as groupIntoSections
          const poolIds = pool
            .filter(p => (HELPING_VERBS_BANK.has(p.word.toLowerCase()) ? 'helping_verb' : guessWordClass(p.word)) === section.wordClass)
            .map(p => p.id)

          return (
            <div key={section.wordClass}>
              {/* Section header */}
              <div
                className="text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
                style={{ color: colour.bg }}
              >
                <span
                  className="inline-flex items-center justify-center w-4 h-4 rounded text-white text-[9px] font-bold"
                  style={{ background: colour.bg }}
                >
                  {colour.label}
                </span>
                {section.label}
              </div>

              {/* Chips */}
              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {poolIds.map(id => {
                    const item = pool.find(p => p.id === id)!
                    return (
                      <motion.button
                        key={id}
                        className="px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-sm sm:text-base font-semibold min-h-[44px] min-w-[60px] sm:min-w-[70px] border shadow-sm hover:shadow-md active:scale-95 transition-all"
                        style={{ background: colour.bg, color: colour.fg, borderColor: `${colour.bg}88` }}
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                        onClick={() => addToTray(id)}
                        disabled={disabled}
                        aria-label={`Add ${item.word} to sentence`}
                        data-tts={`Add ${item.word}`}
                      >
                        {item.word}
                      </motion.button>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
