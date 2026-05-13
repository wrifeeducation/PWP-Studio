// Phase A Word Bank — Build Mode (Levels 1–6)
// Pupil arranges tiles to build the formula sentence.
// Subject is pre-placed as an amber chip if it doesn't appear in bank_words.

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── WORD CLASS COLOUR DETECTION ─────────────────────────────────────────────

const DETERMINERS = new Set(['the','a','an','this','that','these','those','my','his','her','its','our','your','their','each','every','some','any','no'])
const PRONOUNS    = new Set(['he','she','it','we','they','i','me','him','her','us','them'])
const PREPOSITIONS = new Set(['in','on','at','to','of','for','with','by','from','into','onto','under','over','through','behind','before','after','beside','below','above','near','between','around'])
const CONJUNCTIONS = new Set(['and','but','or','so','yet','nor','for','because','although','when','while','before','after','until','unless','if','since','as','whereas'])
const ADVERBS     = new Set(['quickly','slowly','hard','yesterday','today','tomorrow','outside','inside','here','there','very','quite','really','rather','angrily','bravely','excitedly','finally','first','next','however','meanwhile','subsequently','at','last'])
const ADJECTIVES  = new Set(['tall','short','red','blue','old','new','big','small','fast','slow','strong','weak','clever','brave','happy','sad','dark','bright','long','beautiful','exhausted','battered','determined','fierce','gentle','cold','warm','busy','quiet','loud','clever'])
const HELPING_VERBS = new Set(['is','are','was','were','has','have','had','will','would','could','should','can','may','might','shall','did','does','do'])

function guessWordClass(word: string): string {
  const w = word.toLowerCase()
  if (DETERMINERS.has(w))   return 'D'
  if (PRONOUNS.has(w))      return 'Pro'
  if (PREPOSITIONS.has(w))  return 'Prep'
  if (CONJUNCTIONS.has(w))  return 'Conj'
  if (ADVERBS.has(w))       return 'Adv'
  if (ADJECTIVES.has(w))    return 'Adj'
  if (HELPING_VERBS.has(w)) return 'V'
  if (w.endsWith('ing') || w.endsWith('ed') || (w.endsWith('s') && w.length > 3))  return 'V'
  return 'N'
}

const CHIP_COLOURS: Record<string, { bg: string; fg: string }> = {
  D:    { bg: '#DBEAFE', fg: '#1E40AF' },
  N:    { bg: '#EDE9FE', fg: '#4C1D95' },
  V:    { bg: '#FFEDD5', fg: '#9A3412' },
  Adj:  { bg: '#DCFCE7', fg: '#14532D' },
  Adv:  { bg: '#D1FAE5', fg: '#064E3B' },
  Pro:  { bg: '#FCE7F3', fg: '#9D174D' },
  Prep: { bg: '#F3F4F6', fg: '#374151' },
  Conj: { bg: '#FEF9C3', fg: '#713F12' },
}

function chipStyle(word: string): { bg: string; fg: string } {
  return CHIP_COLOURS[guessWordClass(word)] ?? { bg: '#EDE9FE', fg: '#4C1D95' }
}

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface WordBankPhaseAProps {
  bankWords:     string[]
  distractors:   string[] | null
  subjectPrompt: string
  onChange:      (assembled: string) => void
  disabled:      boolean
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Check whether the subject words are already provided in bankWords */
function isSubjectInBank(subject: string, bank: string[]): boolean {
  // Handle "Sam or London" style prompts
  const opts = subject.includes(' or ')
    ? subject.split(' or ').map(s => s.trim())
    : [subject]
  const bankLower = bank.map(w => w.toLowerCase())
  return opts.some(opt =>
    opt.split(' ').every(w => bankLower.includes(w.toLowerCase()))
  )
}

/** Assemble the final sentence from subject + tray */
function assemble(subject: string | null, tray: string[]): string {
  const parts = subject ? [subject, ...tray] : tray
  if (parts.length === 0) return ''
  const sentence = parts.join(' ')
  // Ensure ends with a full stop
  return sentence.replace(/[.!?]*$/, '') + '.'
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export function WordBankPhaseA({ bankWords, distractors, subjectPrompt, onChange, disabled }: WordBankPhaseAProps) {
  const subjectInBank = isSubjectInBank(subjectPrompt, bankWords)
  const preplacedSubject = subjectInBank ? null : subjectPrompt

  // Pool = bank_words + distractors (mixed, shuffled once on mount)
  const [pool, setPool] = useState<string[]>(() => {
    const all = [...bankWords, ...(distractors ?? [])]
    // Shuffle
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]]
    }
    return all
  })
  const [tray, setTray] = useState<string[]>([])

  // Emit assembled sentence whenever tray changes
  useEffect(() => {
    onChange(assemble(preplacedSubject, tray))
  }, [tray, preplacedSubject]) // eslint-disable-line react-hooks/exhaustive-deps

  const addToTray = (word: string, poolIdx: number) => {
    if (disabled) return
    setPool(p => p.filter((_, i) => i !== poolIdx))
    setTray(t => [...t, word])
  }

  const removeFromTray = (trayIdx: number) => {
    if (disabled) return
    const word = tray[trayIdx]
    setPool(p => [...p, word])
    setTray(t => t.filter((_, i) => i !== trayIdx))
  }

  const clearTray = () => {
    if (disabled) return
    setPool(p => [...p, ...tray])
    setTray([])
  }

  const trayIsEmpty = !preplacedSubject && tray.length === 0
  const { bg: subjectBg, fg: subjectFg } = preplacedSubject
    ? { bg: '#FEF9C3', fg: '#854d0e' }
    : { bg: '', fg: '' }

  return (
    <div className="select-none">
      {/* ── TRAY ── */}
      <div
        className="bg-white border-2 rounded-xl px-4 py-3 mb-3 min-h-[52px] flex flex-wrap items-center gap-2"
        style={{ borderColor: trayIsEmpty ? '#e0d8ff' : '#6C5CE7' }}
      >
        {/* Pre-placed subject chip (amber, locked) */}
        {preplacedSubject && (
          <div
            className="px-3 py-[6px] rounded-lg text-[14px] font-semibold select-none cursor-default flex-shrink-0"
            style={{ background: subjectBg, color: subjectFg, border: `1.5px solid #F5C50080` }}
            data-tts={`Subject: ${preplacedSubject}`}
          >
            🔶 {preplacedSubject}
          </div>
        )}

        {/* Placed tiles */}
        <AnimatePresence>
          {tray.map((word, i) => {
            const { bg, fg } = chipStyle(word)
            return (
              <motion.button
                key={`tray-${i}-${word}`}
                className="px-3 py-[6px] rounded-lg text-[14px] font-semibold border"
                style={{ background: bg, color: fg, borderColor: `${fg}30` }}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1,   opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                onClick={() => removeFromTray(i)}
                disabled={disabled}
                data-tts={`Remove ${word} from sentence`}
              >
                {word}
              </motion.button>
            )
          })}
        </AnimatePresence>

        {/* Empty state hint */}
        {trayIsEmpty && (
          <span className="text-[12px] text-[#aaa]">
            Tap a word below to build your sentence…
          </span>
        )}

        {/* Full stop indicator */}
        {(preplacedSubject || tray.length > 0) && (
          <span className="text-[18px] font-bold text-[#2D3436] ml-1">.</span>
        )}

        {/* Clear button */}
        {tray.length > 0 && !disabled && (
          <button
            className="ml-auto text-[11px] text-[#aaa] hover:text-[#888] transition-colors flex-shrink-0"
            onClick={clearTray}
          >
            Clear ✕
          </button>
        )}
      </div>

      {/* ── BANK ── */}
      <div
        className="bg-[#f8f5ff] border-2 border-[#e8e0ff] rounded-xl px-4 py-3"
        data-tts="Word bank — tap a word to add it to your sentence"
      >
        <div className="text-[10px] font-bold text-[#9b87f0] uppercase tracking-wide mb-2">
          Word Bank
        </div>
        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {pool.map((word, i) => {
              const { bg, fg } = chipStyle(word)
              return (
                <motion.button
                  key={`pool-${i}-${word}`}
                  className="px-3 py-[7px] rounded-lg text-[14px] font-semibold border shadow-sm hover:shadow-md transition-shadow"
                  style={{ background: bg, color: fg, borderColor: `${fg}30` }}
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1,   opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                  onClick={() => addToTray(word, i)}
                  disabled={disabled}
                  data-tts={`Add ${word} to sentence`}
                >
                  {word}
                </motion.button>
              )
            })}
          </AnimatePresence>
          {pool.length === 0 && (
            <span className="text-[12px] text-[#aaa]">All words placed!</span>
          )}
        </div>
      </div>
    </div>
  )
}
