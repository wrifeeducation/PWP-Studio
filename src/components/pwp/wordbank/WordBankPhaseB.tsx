// Phase B Word Bank — Gap Mode (Levels 7–19)
// Shows the sentence skeleton: known words appear as static coloured chips;
// unknown words appear as labelled text inputs the pupil fills in.
// Assembled sentence is emitted via onChange on every keystroke.

import { useEffect, useMemo, useState } from 'react'
import type { GapSlot } from '@/types/pwp'

// ─── WORD CLASS COLOUR DETECTION (shared heuristic) ──────────────────────────

const DETERMINERS  = new Set(['the','a','an','this','that','these','those','my','his','her','its','our','your','their','each','every','some','any','no'])
const PRONOUNS     = new Set(['he','she','it','we','they','i','me','him','her','us','them'])
const PREPOSITIONS = new Set(['in','on','at','to','of','for','with','by','from','into','onto','under','over','through','behind','before','after','beside','below','above','near','between','around'])
const CONJUNCTIONS = new Set(['and','but','or','so','yet','nor','for','because','although','when','while','before','after','until','unless','if','since','as','whereas'])
const ADVERBS      = new Set(['quickly','slowly','hard','yesterday','today','tomorrow','outside','inside','here','there','very','quite','really','rather','angrily','bravely','excitedly','finally','first','next','however','meanwhile','subsequently','at','last'])
const ADJECTIVES   = new Set(['tall','short','red','blue','old','new','big','small','fast','slow','strong','weak','clever','brave','happy','sad','dark','bright','long','beautiful','exhausted','battered','determined','fierce','gentle','cold','warm','busy','quiet','loud','clever'])
const HELPING_VERBS = new Set(['is','are','was','were','has','have','had','will','would','could','should','can','may','might','shall','did','does','do'])

function guessWordClass(word: string): string {
  const w = word.toLowerCase()
  if (DETERMINERS.has(w))    return 'D'
  if (PRONOUNS.has(w))       return 'Pro'
  if (PREPOSITIONS.has(w))   return 'Prep'
  if (CONJUNCTIONS.has(w))   return 'Conj'
  if (ADVERBS.has(w))        return 'Adv'
  if (ADJECTIVES.has(w))     return 'Adj'
  if (HELPING_VERBS.has(w))  return 'V'
  if (w.endsWith('ing') || w.endsWith('ed') || (w.endsWith('s') && w.length > 3)) return 'V'
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

// ─── GAP SLOT COLOUR ──────────────────────────────────────────────────────────
// Maps word_class (full string, e.g. "adjective") → input colours

interface GapColour { bg: string; fg: string; border: string }

const GAP_COLOURS: Record<string, GapColour> = {
  adjective:   { bg: '#DCFCE7', fg: '#14532D', border: '#86efac' },
  adverb:      { bg: '#D1FAE5', fg: '#064E3B', border: '#6ee7b7' },
  verb:        { bg: '#FFEDD5', fg: '#9A3412', border: '#fed7aa' },
  noun:        { bg: '#EDE9FE', fg: '#4C1D95', border: '#c4b5fd' },
  determiner:  { bg: '#DBEAFE', fg: '#1E40AF', border: '#93c5fd' },
  pronoun:     { bg: '#FCE7F3', fg: '#9D174D', border: '#f9a8d4' },
  preposition: { bg: '#F3F4F6', fg: '#374151', border: '#d1d5db' },
  conjunction: { bg: '#FEF9C3', fg: '#713F12', border: '#fde68a' },
}

function gapColour(wordClass: string): GapColour {
  return GAP_COLOURS[wordClass.toLowerCase()] ?? { bg: '#F3F4F6', fg: '#374151', border: '#d1d5db' }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Split sentence into tokens, stripping trailing punctuation */
function tokenise(sentence: string): string[] {
  return sentence
    .replace(/[.!?…]+$/, '')
    .split(/\s+/)
    .filter(Boolean)
}

/** Reconstruct the full sentence from skeleton tokens + filled gap values */
function assemble(tokens: string[], gapPositions: Map<number, GapSlot>, gapValues: Record<number, string>): string {
  const parts = tokens.map((token, idx) => {
    const pos = idx + 1 // 1-indexed
    return gapPositions.has(pos) ? (gapValues[pos] ?? '').trim() : token
  })
  const sentence = parts.join(' ').trim()
  if (!sentence) return ''
  return sentence.replace(/[.!?]*$/, '') + '.'
}

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface WordBankPhaseBProps {
  bankWords:      string[]
  gapSlots:       GapSlot[]
  targetSentence: string
  onChange:       (assembled: string) => void
  disabled:       boolean
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export function WordBankPhaseB({ bankWords: _bankWords, gapSlots, targetSentence, onChange, disabled }: WordBankPhaseBProps) {
  const tokens      = useMemo(() => tokenise(targetSentence), [targetSentence])
  const gapPositions = useMemo(
    () => new Map(gapSlots.map(g => [g.position, g])),
    [gapSlots],
  )

  const [gapValues, setGapValues] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {}
    gapSlots.forEach(g => { init[g.position] = '' })
    return init
  })

  // Emit assembled sentence on every gap change
  useEffect(() => {
    onChange(assemble(tokens, gapPositions, gapValues))
  }, [gapValues]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateGap = (pos: number, val: string) => {
    if (disabled) return
    setGapValues(prev => ({ ...prev, [pos]: val }))
  }

  const allFilled = gapSlots.every(g => (gapValues[g.position] ?? '').trim() !== '')

  return (
    <div className="select-none mb-3">
      {/* Hint label */}
      <div className="text-[10px] font-bold text-[#9b87f0] uppercase tracking-wide mb-2">
        Complete the sentence — fill in the gaps
      </div>

      {/* Skeleton row */}
      <div
        className="bg-[#f8f5ff] border-2 rounded-xl px-4 py-3"
        style={{ borderColor: allFilled ? '#6C5CE7' : '#e8e0ff' }}
        data-tts="Sentence skeleton — fill in the coloured gaps"
      >
        <div className="flex flex-wrap items-center gap-2">
          {tokens.map((token, idx) => {
            const pos  = idx + 1
            const gap  = gapPositions.get(pos)

            if (gap) {
              const { bg, fg, border } = gapColour(gap.word_class)
              const inputWidth = Math.max(56, (gap.label.length + 5) * 9)
              return (
                <input
                  key={`gap-${pos}`}
                  type="text"
                  className="border-2 rounded-lg px-2 py-[5px] text-[14px] font-semibold text-center outline-none transition-all"
                  style={{
                    width: inputWidth,
                    borderColor: (gapValues[pos] ?? '').trim() ? border : `${border}`,
                    background:  (gapValues[pos] ?? '').trim() ? bg : '#fff',
                    color:       fg,
                    boxShadow:   (gapValues[pos] ?? '').trim()
                      ? `0 0 0 3px ${border}40`
                      : 'none',
                  }}
                  placeholder={gap.label}
                  value={gapValues[pos] ?? ''}
                  onChange={e => updateGap(pos, e.target.value)}
                  disabled={disabled}
                  data-tts={`Type a ${gap.word_class} here`}
                  aria-label={`${gap.word_class} gap`}
                />
              )
            }

            // Static chip for known word
            const { bg, fg } = chipStyle(token)
            return (
              <div
                key={`word-${pos}`}
                className="px-3 py-[6px] rounded-lg text-[14px] font-semibold cursor-default"
                style={{ background: bg, color: fg, border: `1.5px solid ${fg}25` }}
                data-tts={token}
              >
                {token}
              </div>
            )
          })}

          {/* Trailing full stop */}
          <span className="text-[18px] font-bold text-[#2D3436] ml-1">.</span>
        </div>

        {/* Gaps legend */}
        {gapSlots.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[#e8e0ff]">
            {gapSlots.map(g => {
              const { bg, fg, border } = gapColour(g.word_class)
              const filled = (gapValues[g.position] ?? '').trim() !== ''
              return (
                <div
                  key={`legend-${g.position}`}
                  className="text-[11px] font-semibold px-2 py-[3px] rounded-[8px]"
                  style={{
                    background: filled ? bg : '#f3f0ff',
                    color:      filled ? fg : '#9b87f0',
                    border:     `1.5px solid ${filled ? border : '#d8d0ff'}`,
                  }}
                >
                  {filled ? `✓ ${gapValues[g.position]}` : g.label}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
