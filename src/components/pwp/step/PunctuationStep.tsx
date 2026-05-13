/**
 * PunctuationStep — active capitalisation + punctuation mechanic
 *
 * After the pupil assembles their sentence (word bank or free type),
 * this component guides them through two explicit steps:
 *   1. Tap the first letter to capitalise it
 *   2. Choose the end punctuation mark [.] [?] [!]
 *
 * Only after both steps does onComplete() fire, enabling Submit.
 * This is a deliberate teaching mechanic — the app never auto-capitalises
 * or auto-punctuates.
 *
 * Per PWP_Interaction_Design_Prompt.md §3.
 */

import { useState } from 'react'
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
  /** Voice callback — plays Amelia prompts */
  onSpeak?: (key: string) => void
  disabled?: boolean
}

type Phase = 'capitalise' | 'punctuate' | 'done'

// ─── Component ────────────────────────────────────────────────────────────────

export function PunctuationStep({
  sentence,
  availableMarks = ['.', '?', '!'],
  onComplete,
  onSpeak,
  disabled = false,
}: PunctuationStepProps) {
  const [phase, setPhase] = useState<Phase>('capitalise')
  const [capitalised, setCapitalised] = useState(false)
  const [selectedMark, setSelectedMark] = useState<string | null>(null)

  const words = sentence.trim().split(/\s+/).filter(Boolean)

  if (words.length === 0) return null

  const firstWord  = words[0]
  const restWords  = words.slice(1)

  // capitalised version of first word
  const firstCap = firstWord.charAt(0).toUpperCase() + firstWord.slice(1)
  const displayWords = capitalised ? [firstCap, ...restWords] : words

  const handleCapitalise = () => {
    if (disabled || capitalised) return
    setCapitalised(true)
    setPhase('punctuate')
    onSpeak?.('punctuation.end_prompt')
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
          {phase === 'capitalise'
            ? 'Tap the first letter to make it a capital'
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
                <motion.button
                  key={i}
                  className="px-3 py-2 rounded-xl text-sm sm:text-base font-semibold min-h-[44px] border-2 cursor-pointer"
                  style={{ background: bg, color: fg, borderColor: '#F5A623' }}
                  onClick={handleCapitalise}
                  whileHover={{ scale: 1.05 }}
                  animate={{ boxShadow: ['0 0 0 0px #F5A62340', '0 0 0 6px #F5A62340', '0 0 0 0px #F5A62340'] }}
                  transition={{ boxShadow: { duration: 1.2, repeat: Infinity } }}
                  aria-label={`Tap to capitalise — ${word}`}
                  data-tts={`Tap to capitalise ${word}`}
                >
                  <span
                    className="inline-block border-b-2 border-[#F5A623] text-base sm:text-lg"
                    style={{ color: fg }}
                  >
                    {firstLetter.toUpperCase()}
                  </span>
                  <span style={{ color: fg }}>{rest}</span>
                </motion.button>
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
