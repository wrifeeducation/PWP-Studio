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
}

interface BankSection {
  wordClass: string  // e.g. 'noun', 'verb', 'determiner'
  label: string      // e.g. 'Nouns', 'Verbs', 'Determiners'
  words: { word: string; origIdx: number }[]
}

// ─── SECTION GROUPING ────────────────────────────────────────────────────────

/**
 * Groups bank words into labelled sections by inferred word class.
 * Keeps the visual order: Determiners → Nouns → Verbs → Adjectives → Other
 */
function groupIntoSections(words: string[]): BankSection[] {
  const ORDER = ['determiner', 'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction']
  const map = new Map<string, { word: string; origIdx: number }[]>()
  words.forEach((word, origIdx) => {
    const wc = guessWordClass(word)
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

export function WordBankPhaseA({ bankWords, distractors, onChange, disabled }: WordBankPhaseAProps) {
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

  // Group pool words into sections for display
  const sections = useMemo(
    () => groupIntoSections(pool.map(p => p.word)),
    [pool]
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
          const poolIds = pool
            .filter(p => guessWordClass(p.word) === section.wordClass)
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
