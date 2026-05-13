/**
 * WriFe PWP — Canonical word-class colour system.
 * Used across word bank chips, formula bar chips, gap slot placeholders,
 * guidance panel, and feedback card sentence display.
 * This file is the single source of truth — do not define colours elsewhere.
 *
 * Design rationale (from PWP_Interaction_Design_Prompt.md §9):
 *   N = coral red (dominant, central)  V = royal blue (action, purposeful)
 *   D = teal green (supportive, calm)  Adj = amber orange (warm, descriptive)
 *   Adv = violet purple (layered)      Pro = rose pink (personal)
 *   Prep = slate grey (positional)     Conj = olive gold (connector)
 */

export interface WordClassColour {
  bg: string   // chip / tile background
  fg: string   // white text for chip labels; use for icons too
  label: string // single-letter / short label shown on chip corner
  name: string  // full word class name
}

export const WORD_CLASS_COLOURS: Record<string, WordClassColour> = {
  noun:        { bg: '#E05252', fg: '#ffffff', label: 'N',    name: 'Noun' },
  verb:        { bg: '#3B6FD4', fg: '#ffffff', label: 'V',    name: 'Verb' },
  determiner:  { bg: '#2BAC7E', fg: '#ffffff', label: 'D',    name: 'Determiner' },
  adjective:   { bg: '#E8861A', fg: '#ffffff', label: 'Adj',  name: 'Adjective' },
  adverb:      { bg: '#8B5CF6', fg: '#ffffff', label: 'Adv',  name: 'Adverb' },
  pronoun:     { bg: '#D4468A', fg: '#ffffff', label: 'Pro',  name: 'Pronoun' },
  preposition: { bg: '#6B7280', fg: '#ffffff', label: 'Prep', name: 'Preposition' },
  conjunction: { bg: '#9B8A2E', fg: '#ffffff', label: 'Conj', name: 'Conjunction' },
} as const

/** Look up by label (N, V, D, Adj, …) or full name (noun, verb, …) */
export function getWordClassColour(key: string): WordClassColour {
  const k = key.toLowerCase()
  // Direct name match
  if (WORD_CLASS_COLOURS[k]) return WORD_CLASS_COLOURS[k]
  // Label match
  const byLabel = Object.values(WORD_CLASS_COLOURS).find(
    c => c.label.toLowerCase() === k
  )
  return byLabel ?? WORD_CLASS_COLOURS.noun  // fallback: noun coral
}

// ─── Word-class detection ─────────────────────────────────────────────────────
// Used to infer a chip's class from its text when explicit metadata isn't given.

const DETERMINERS  = new Set(['the','a','an','this','that','these','those','my','his','her','its','our','your','their','each','every','some','any','no'])
const PRONOUNS     = new Set(['he','she','it','we','they','i','me','him','her','us','them'])
const PREPOSITIONS = new Set(['in','on','at','to','of','for','with','by','from','into','onto','under','over','through','behind','before','after','beside','below','above','near','between','around'])
const CONJUNCTIONS = new Set(['and','but','or','so','yet','nor','because','although','when','while','until','unless','if','since','as','whereas'])
const ADVERBS      = new Set(['quickly','slowly','hard','yesterday','today','tomorrow','outside','inside','here','there','very','quite','really','rather','angrily','bravely','excitedly','finally','first','next','however','meanwhile','subsequently'])
const ADJECTIVES   = new Set(['tall','short','red','blue','old','new','big','small','fast','slow','strong','weak','clever','brave','happy','sad','dark','bright','long','beautiful','exhausted','battered','determined','fierce','gentle','cold','warm','busy','quiet','loud','thin','young'])
const HELPING_VERBS = new Set(['is','are','was','were','has','have','had','will','would','could','should','can','may','might','shall','did','does','do'])

export function guessWordClass(word: string): string {
  const w = word.toLowerCase().replace(/[.!?,;]$/, '')
  if (DETERMINERS.has(w))   return 'determiner'
  if (PRONOUNS.has(w))      return 'pronoun'
  if (PREPOSITIONS.has(w))  return 'preposition'
  if (CONJUNCTIONS.has(w))  return 'conjunction'
  if (ADVERBS.has(w))       return 'adverb'
  if (ADJECTIVES.has(w))    return 'adjective'
  if (HELPING_VERBS.has(w)) return 'verb'
  if (w.endsWith('ing') || w.endsWith('ed') || (w.endsWith('s') && w.length > 4)) return 'verb'
  return 'noun'
}

/** Convenience: get chip colours directly from a word string */
export function chipColourForWord(word: string): WordClassColour {
  return getWordClassColour(guessWordClass(word))
}
