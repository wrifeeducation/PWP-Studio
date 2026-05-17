/**
 * FormulaBar — renders the PWP formula as colour-coded word-class chips.
 *
 * The formula string uses ' + ' as a separator between elements:
 *   "Det + Adj + N + V + Det + N"
 * Each element is mapped to its canonical word class for chip colour.
 * The element that is new this level (matched against level.new_element or
 * step.step_type === 'new_element') receives a small purple "NEW" dot.
 *
 * Used inside the formula card on LevelPage step screen.
 */

import { useMemo } from 'react'
import { getWordClassColour } from '@/constants/wordClassColours'

// ─── Formula token → word-class mapping ───────────────────────────────────────
// The formula strings in the DB use abbreviated labels. This maps them to
// the canonical word-class keys used by wordClassColours.ts.

const LABEL_TO_CLASS: Record<string, string> = {
  // ── Determiners ───────────────────────────────────────────────────────────
  determiner: 'determiner',
  det: 'determiner', d: 'determiner',
  'det (definite)': 'determiner', 'det (indefinite)': 'determiner',

  // ── Nouns ─────────────────────────────────────────────────────────────────
  n: 'noun', noun: 'noun',
  'n(subject)': 'noun', 'n(object)': 'noun',
  'noun(subject)': 'noun', 'noun(object)': 'noun',
  'noun (subject)': 'noun', 'noun (object)': 'noun',

  // ── Verbs — short forms ───────────────────────────────────────────────────
  v: 'verb', verb: 'verb',
  'v(past)': 'verb', 'v(present)': 'verb', 'v(continuous)': 'verb',
  'v(-ing)': 'verb', 'verb(-ing)': 'verb',
  'helping v': 'verb', 'helping verb': 'verb',

  // ── Verbs — DB natural-language forms (as stored in pwp_steps.formula) ───
  // These must be present or the token falls back to 'noun' and renders coral red.
  'verb (past tense)': 'verb',
  'verb (present tense)': 'verb',
  'verb (continuous)': 'verb',
  'verb (past)': 'verb',
  'verb (present)': 'verb',
  'helping verb + verb(-ing)': 'verb',
  'helping verb + verb (-ing)': 'verb',
  'helping verb (is)': 'verb',
  'helping verb (are)': 'verb',
  'helping verb (was)': 'verb',
  'helping verb (were)': 'verb',

  // ── Adjectives ────────────────────────────────────────────────────────────
  adj: 'adjective', adjective: 'adjective',
  'adj(subject)': 'adjective', 'adj(object)': 'adjective',
  'adj (subject)': 'adjective', 'adj (object)': 'adjective',

  // ── Adverbs ───────────────────────────────────────────────────────────────
  adv: 'adverb', adverb: 'adverb',
  'adv(manner)': 'adverb', 'adv(time)': 'adverb', 'adv(place)': 'adverb',
  'adv-manner': 'adverb', 'adv-time': 'adverb', 'adv-place': 'adverb',
  'adverb (manner)': 'adverb', 'adverb (time)': 'adverb', 'adverb (place)': 'adverb',
  'adverb of manner': 'adverb', 'adverb of time': 'adverb', 'adverb of place': 'adverb',

  // ── Pronouns ──────────────────────────────────────────────────────────────
  pro: 'pronoun', pronoun: 'pronoun',
  'pronoun(subject)': 'pronoun', 'pronoun (subject)': 'pronoun',

  // ── Prepositions ──────────────────────────────────────────────────────────
  prep: 'preposition', preposition: 'preposition',
  'prep phrase': 'preposition', 'preposition phrase': 'preposition',
  'prep + det + noun': 'preposition',

  // ── Conjunctions ──────────────────────────────────────────────────────────
  conj: 'conjunction', conjunction: 'conjunction',

  // ── Proper nouns / names / places ─────────────────────────────────────────
  'proper noun': 'proper', 'proper n': 'proper',
  name: 'proper', names: 'proper',
  'place noun': 'place', place: 'place',
}

function tokenToWordClass(token: string): string {
  const key = token.trim().toLowerCase()
  return LABEL_TO_CLASS[key] ?? 'noun' // sensible fallback
}

// ─── Plain-English word class labels (Fix 4) ──────────────────────────────────
// Shown as a small subtitle under each formula chip so primary pupils
// know what each word class means without needing a dictionary.

// Each entry: [proper term, plain-English explanation]
const WC_FRIENDLY: Record<string, [string, string]> = {
  determiner:   ['Determiner',   'the / a'],
  noun:         ['Noun',         'a name or thing'],
  verb:         ['Verb',         'an action word'],
  adjective:    ['Adjective',    'a describing word'],
  adverb:       ['Adverb',       'how / when / where'],
  pronoun:      ['Pronoun',      'I / he / she / they'],
  preposition:  ['Preposition',  'a position word'],
  conjunction:  ['Conjunction',  'a joining word'],
  proper:       ['Proper Noun',  'a person\'s name'],
  place:        ['Place Name',   'a place name'],
}

// ─── New-element detection ────────────────────────────────────────────────────
// A token is considered "new" if:
//  (a) The step type is 'new_element' AND it contains any of the new_element keywords
//  OR (b) We fall back to checking trigger_note from the level

function tokenMatchesNewElement(token: string, newElement: string): boolean {
  if (!newElement) return false
  const t = token.trim().toLowerCase()
  // Check each word in newElement — if any substring matches the token, flag it
  const keywords = newElement.toLowerCase().split(/[\s(),+/–-]+/).filter(k => k.length > 1)
  return keywords.some(k => t.includes(k) || k.includes(t))
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface FormulaBarProps {
  formula: string        // e.g. "Det + Adj + N + V + Det + N"
  stepType: string       // 'new_element' | 'consolidation' | etc.
  newElement: string     // from level.new_element — used to identify the new chip
  /** Called when the speaker button is clicked */
  onSpeak: (text: string) => void
  accent: string         // theme colour (purple for formula, teal for paragraph)
  stepTypeBadge: { label: string; bg: string; fg: string }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FormulaBar({ formula, stepType, newElement, onSpeak, accent, stepTypeBadge }: FormulaBarProps) {
  const tokens = useMemo(() => formula.split(/\s*\+\s*/), [formula])

  const isNewStep = stepType === 'new_element'

  return (
    <div
      className="bg-white rounded-2xl px-5 py-4 mb-4 border-l-[6px]"
      style={{ borderColor: accent, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Label row */}
          <div
            className="text-[10px] font-bold uppercase tracking-[1px] mb-2"
            style={{ color: accent }}
          >
            Formula
          </div>

          {/* Chip row */}
          <div className="flex flex-wrap items-center gap-[6px]" data-tts={formula}>
            {tokens.map((token, i) => {
              const wc       = tokenToWordClass(token)
              const colour   = getWordClassColour(wc)
              const isNew    = isNewStep && tokenMatchesNewElement(token, newElement)

              const friendly = WC_FRIENDLY[wc]

              return (
                <span key={i} className="inline-flex items-end gap-[6px]">
                  {/* Chip + friendly label stacked */}
                  <span className="relative flex flex-col items-center gap-[3px]">
                    {/* New element dot — sits above the chip */}
                    {isNew && (
                      <span
                        className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-[7px] h-[7px] rounded-full"
                        style={{ background: '#6C5CE7' }}
                        aria-label="New element"
                      />
                    )}
                    <span
                      className="inline-flex items-center gap-[4px] px-[9px] py-[5px] rounded-[10px] text-[12px] font-bold min-h-[32px]"
                      style={{
                        background:  isNew ? colour.bg : `${colour.bg}cc`,
                        color:       colour.fg,
                        outline:     isNew ? `2px solid ${accent}` : 'none',
                        outlineOffset: '1px',
                      }}
                    >
                      {/* Word class label badge */}
                      <span className="text-[9px] font-black uppercase opacity-70">
                        {colour.label}
                      </span>
                      <span>{token.trim()}</span>
                    </span>

                    {/* Word class label: proper term + plain-English explanation */}
                    {friendly && (
                      <span
                        className="text-center leading-tight font-medium"
                        style={{ color: colour.fg + 'b0', maxWidth: '80px', lineHeight: '1.2' }}
                      >
                        <span className="block text-[9px] font-black uppercase tracking-wide">
                          {friendly[0]}
                        </span>
                        <span className="block text-[8px] font-medium">
                          {friendly[1]}
                        </span>
                      </span>
                    )}
                  </span>

                  {/* Plus separator — offset upward to align with chip */}
                  {i < tokens.length - 1 && (
                    <span
                      className="text-[13px] font-bold text-[#c0b8d4]"
                      style={{ marginBottom: friendly ? '16px' : '0' }}
                    >+</span>
                  )}
                </span>
              )
            })}
          </div>

          {/* Colour legend — unique word classes in this formula */}
          {(() => {
            const seen = new Set<string>()
            const entries: { wc: string; colour: ReturnType<typeof getWordClassColour>; friendly: [string, string] }[] = []
            tokens.forEach(token => {
              const wc = tokenToWordClass(token)
              if (!seen.has(wc) && WC_FRIENDLY[wc]) {
                seen.add(wc)
                entries.push({ wc, colour: getWordClassColour(wc), friendly: WC_FRIENDLY[wc] })
              }
            })
            return entries.length > 0 ? (
              <div className="mt-[10px] flex flex-wrap gap-x-[10px] gap-y-[4px]">
                {entries.map(({ wc, colour, friendly }) => (
                  <span key={wc} className="inline-flex items-center gap-[4px]">
                    <span
                      className="inline-block w-[10px] h-[10px] rounded-[3px]"
                      style={{ background: colour.bg, border: `1px solid ${colour.fg}40` }}
                    />
                    <span className="text-[10px] font-semibold" style={{ color: '#555' }}>
                      {friendly[0]}
                    </span>
                    <span className="text-[10px]" style={{ color: '#999' }}>
                      — {friendly[1]}
                    </span>
                  </span>
                ))}
              </div>
            ) : null
          })()}

          {/* Step type badge */}
          <span
            className="inline-block mt-[8px] px-[10px] py-[2px] rounded-[10px] text-[10px] font-bold"
            style={{ background: stepTypeBadge.bg, color: stepTypeBadge.fg }}
          >
            {stepTypeBadge.label}
          </span>
        </div>

        {/* Re-read button */}
        <button
          className="flex-shrink-0 w-[32px] h-[32px] rounded-[8px] flex items-center justify-center text-[16px] transition-colors mt-[2px]"
          style={{ background: `${accent}18`, color: accent }}
          onClick={() => onSpeak(formula)}
          aria-label="Hear the formula read aloud"
          data-tts="Read formula aloud"
        >
          <span aria-hidden="true">🔊</span>
        </button>
      </div>
    </div>
  )
}
