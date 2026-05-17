/**
 * PunctuationStep — active capitalisation + punctuation mechanic
 *
 * After the pupil assembles their sentence (word bank or free type),
 * this component guides them through two explicit steps:
 *   1. Tap the first letter to capitalise it        → Alice: "cap-step.capitalise"
 *   2. Choose the end punctuation mark [.] [?] [!]  → Alice: "cap-step.punctuate"
 *
 * Only after both steps does onComplete() fire, enabling Submit.
 * This is a deliberate teaching mechanic — the app never auto-capitalises
 * or auto-punctuates.
 *
 * Voice fix (session 34): cap-step.punctuate is fired via useEffect watching
 * phase → 'punctuate', not synchronously in handleCapitalise(), so the
 * punctuation buttons are guaranteed to be visible before the prompt plays.
 *
 * Fix (session 35 — 2026-05-14):
 *   • Capitalisation now only resets when the FIRST WORD changes, not on every
 *     word addition. Fixes capitalise-reset-on-word-add bug.
 *   • Punctuation selector is gated on minWordCount so it only appears once all
 *     formula elements are present. Fixes premature-punctuation and
 *     premature-"ready to submit" bugs.
 *
 * Per PWP_Interaction_Design_Prompt.md §3.
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { chipColourForWord } from '@/constants/wordClassColours'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PunctuationStepProps {
  /** Raw sentence from word bank or textarea — no capitalisation, no punctuation */
  sentence: string
  /** Punctuation options available at this level */
  availableMarks?: string[]
  /** Called with the final, capitalised+punctuated sentence */
  onComplete: (finalSentence: string) => void
  /** Voice callback — plays audio keys */
  onSpeak?: (key: string) => void
  disabled?: boolean
  /**
   * Minimum word count required before punctuation may be selected.
   * Derived from the number of elements in the step's formula (e.g. "N + V" = 2).
   * When undefined, no gate is applied (legacy / free-write phases).
   */
  minWordCount?: number
}

type Phase = 'capitalise' | 'punctuate' | 'done'

// ─── Component ────────────────────────────────────────────────────────────────

export function PunctuationStep({
  sentence,
  availableMarks = ['.', '?', '!'],
  onComplete,
  onSpeak,
  disabled = false,
  minWordCount,
}: PunctuationStepProps) {
  const [phase, setPhase] = useState<Phase>('capitalise')
  const [capitalised, setCapitalised] = useState(false)
  const [selectedMark, setSelectedMark] = useState<string | null>(null)

  // ── Derived values (needed in hooks — must come before any early returns) ──
  const words            = sentence.trim().split(/\s+/).filter(Boolean)
  const currentWordCount = words.length
  // Formula gate: punctuation only available once all formula elements are present.
  // minWordCount = number of '+'-separated elements in the step's formula string.
  const formulaComplete  = minWordCount === undefined || currentWordCount >= minWordCount

  // ── FIX: only reset when the FIRST WORD changes, not on every word addition ──
  // Previously `[sentence]` dependency caused full reset every time a tile was
  // added, clearing capitalisation mid-build. Now we track the first word and
  // only reset when it genuinely changes (new sentence start, tray cleared).
  const prevFirstWordRef = useRef<string>('')

  useEffect(() => {
    const firstWord = words[0] ?? ''
    if (firstWord !== prevFirstWordRef.current) {
      setPhase('capitalise')
      setCapitalised(false)
      setSelectedMark(null)
      prevFirstWordRef.current = firstWord
    }
    // If firstWord is unchanged, the pupil just added more words — preserve state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentence])

  // ── Auto-advance to punctuate once formula is complete after capitalisation ──
  // If the pupil capitalised early and then adds more words to meet minWordCount.
  useEffect(() => {
    if (capitalised && phase === 'capitalise' && formulaComplete) {
      setPhase('punctuate')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWordCount, capitalised])

  // Alice prompt: "Tap the first letter to make it a capital."
  // Fires once when the sentence first becomes non-empty.
  const hasSentenceRef = useRef(false)
  useEffect(() => {
    const hasWords = sentence.trim().length > 0
    if (hasWords && !hasSentenceRef.current) {
      hasSentenceRef.current = true
      onSpeak?.('cap-step.capitalise')
    }
    if (!hasWords) {
      hasSentenceRef.current = false
    }
  }, [sentence]) // eslint-disable-line react-hooks/exhaustive-deps

  // Alice prompt: "Now choose how your sentence ends."
  // Fires AFTER React has rendered the punctuation buttons — fixes the sync bug
  // where the old code fired onSpeak synchronously inside handleCapitalise()
  // before the buttons were visible.
  const punctuatePromptFiredRef = useRef(false)
  useEffect(() => {
    if (phase === 'punctuate' && !punctuatePromptFiredRef.current) {
      punctuatePromptFiredRef.current = true
      onSpeak?.('cap-step.punctuate')
    }
    if (phase === 'capitalise') {
      punctuatePromptFiredRef.current = false
    }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Empty state — show a placeholder above the word bank chips ──
  if (words.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[#e0d8ff] bg-white px-4 py-4 sm:px-5">
        <div className="text-xs font-semibold text-[#9b87f0] uppercase tracking-wider mb-1">
          Your sentence
        </div>
        <p className="text-sm text-[#bbb] italic">
          Tap words below to build your sentence…
        </p>
      </div>
    )
  }

  const firstWord    = words[0]
  const restWords    = words.slice(1)
  const firstCap     = firstWord.charAt(0).toUpperCase() + firstWord.slice(1)
  const displayWords = capitalised ? [firstCap, ...restWords] : words

  const handleCapitalise = () => {
    if (disabled || capitalised) return
    setCapitalised(true)
    if (formulaComplete) {
      setPhase('punctuate')
      // NOTE: voice prompt is fired by the useEffect above, not here —
      // that ensures the punctuation buttons are rendered before Alice speaks.
    }
    // If formula isn't complete yet, stay in 'capitalise' phase.
    // The auto-advance useEffect above will fire when the count reaches minWordCount.
  }

  const handleMarkSelect = (mark: string) => {
    if (disabled) return
    setSelectedMark(mark)
    setPhase('done')
    const finalSentence = displayWords.join(' ') + mark
    onComplete(finalSentence)
  }

  return (
    <div className="mt-3 rounded-2xl border-2 border-[#e8e0ff] bg-white px-4 py-4 sm:px-5 space-y-3">
      {/* Assembled sentence — click first letter to capitalise */}
      <div>
        <div className="text-xs font-semibold text-[#9b87f0] uppercase tracking-wider mb-2">
          {phase === 'capitalise' && !capitalised
            ? 'Tap the first letter to make it a capital'
            : phase === 'capitalise' && capitalised
            ? 'Keep adding words to complete your sentence'
            : phase === 'punctuate'
            ? 'Now choose how your sentence ends'
            : 'Your sentence'}
        </div>

        {/* Word chips */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
          {displayWords.map((word, i) => {
            const { bg, fg } = chipColourForWord(word)
            const isFirst = i === 0
            const needsCapTap = isFirst && !capitalised && phase === 'capitalise'

            if (needsCapTap) {
              // Split first letter and rest — first letter is tappable
              const firstLetter = word.charAt(0)
              const rest = word.slice(1)
              return (
                <span key={i} className="flex flex-col items-center gap-[3px]">
                  {/* Bouncing tap indicator */}
                  <motion.span
                    className="text-[14px] leading-none select-none"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                    aria-hidden="true"
                  >
                    👆
                  </motion.span>

                  <motion.button
                    className="px-3 py-2 rounded-xl text-sm sm:text-base font-semibold min-h-[44px] border-2 cursor-pointer"
                    style={{ background: bg, color: fg, borderColor: '#F5A623' }}
                    onClick={handleCapitalise}
                    whileHover={{ scale: 1.05 }}
                    animate={{ boxShadow: ['0 0 0 0px #F5A62340', '0 0 0 8px #F5A62370', '0 0 0 0px #F5A62340'] }}
                    transition={{ boxShadow: { duration: 1.1, repeat: Infinity } }}
                    aria-label={`Tap to capitalise — ${word}`}
                    data-tts={`Tap to capitalise ${word}`}
                  >
                    {/* First letter highlighted in yellow pill */}
                    <span
                      className="inline-block px-[3px] rounded-[4px] font-black text-base sm:text-lg"
                      style={{ background: '#FEF3C7', color: '#92400E', border: '1.5px solid #F5A623' }}
                    >
                      {firstLetter}
                    </span>
                    <span style={{ color: fg }}>{rest}</span>
                  </motion.button>
                </span>
              )
            }

            return (
              <div
                key={i}
                className="px-3 py-2 rounded-xl text-sm sm:text-base font-semibold min-h-[44px] border flex items-center"
                style={{
                  background: isFirst && capitalised ? bg : `${bg}bb`,
                  color: fg,
                  borderColor: `${fg}30`,
                }}
                aria-label={word}
              >
                {isFirst && capitalised ? firstCap : word}
              </div>
            )
          })}

          {/* End punctuation slot */}
          {selectedMark && (
            <motion.div
              className="px-2 py-2 rounded-xl text-xl font-bold min-h-[44px] min-w-[36px] flex items-center justify-center bg-[#FEF3C7] border-2 border-[#F5C500] text-[#854d0e]"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              {selectedMark}
            </motion.div>
          )}
        </div>
      </div>

      {/* Punctuation selector — shown after capitalise step */}
      <AnimatePresence>
        {phase === 'punctuate' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            <div className="flex gap-2 sm:gap-3">
              {availableMarks.map(mark => (
                <button
                  key={mark}
                  className={`
                    flex-1 sm:flex-none sm:w-20
                    h-14 sm:h-12
                    text-2xl sm:text-xl font-bold
                    rounded-xl border-2 transition-all
                    ${selectedMark === mark
                      ? 'bg-[#F5C500] border-[#F5C500] text-white shadow-md'
                      : 'bg-white border-[#e0d8ff] text-[#2D3436] hover:border-[#F5A623] hover:bg-[#FEF9C3]'
                    }
                  `}
                  onClick={() => handleMarkSelect(mark)}
                  disabled={disabled}
                  aria-label={`End sentence with ${mark}`}
                  aria-pressed={selectedMark === mark}
                  data-tts={`Choose ${mark}`}
                >
                  {mark}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Done state — small confirmation */}
      {phase === 'done' && (
        <motion.p
          className="text-xs text-[#00b894] font-semibold flex items-center gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          ✅ Ready to submit!
        </motion.p>
      )}
    </div>
  )
}
