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
  place:       { bg: '#0EA5C9', fg: '#ffffff', label: 'Pl',   name: 'Place' },
  // proper nouns (Names) share noun coral red at KS1-2: Names fill the Noun slot,
  // so both the formula chip and the word bank tile should be the same colour.
  proper:      { bg: '#E05252', fg: '#ffffff', label: 'N',    name: 'Name' },
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

/**
 * Well-known place names that should get the 'place' word class (cyan chip).
 * Stored lowercase; comparison is always lowercased before lookup.
 */
const PLACE_NAMES = new Set([
  // UK cities & regions
  'london','manchester','birmingham','edinburgh','cardiff','belfast','liverpool',
  'leeds','bristol','sheffield','glasgow','newcastle','nottingham','oxford',
  'cambridge','brighton','leicester','coventry','bath','york','exeter',
  'norwich','portsmouth','southampton','reading','wolverhampton','sunderland',
  // Countries & capitals commonly used in KS1-3 writing
  'paris','berlin','rome','madrid','amsterdam','brussels','vienna','warsaw',
  'lisbon','athens','stockholm','oslo','copenhagen','dublin','reykjavik',
  'tokyo','beijing','shanghai','delhi','mumbai','sydney','melbourne',
  'new york','washington','toronto','ottawa','cairo','nairobi','lagos',
  // Natural/geographic features
  'thames','severn','mersey','avon','clyde','tyne','trent',
  'snowdon','ben nevis','everest','sahara','amazon','nile',
  'pacific','atlantic','mediterranean','arctic','antarctic',
  // Fictional/story places common in primary texts
  'narnia','hogwarts','neverland','wonderland',
])

/**
 * Common proper names (people) that should get the 'proper' word class (fuchsia chip).
 * These are the subject nouns most likely to appear in PWP word banks.
 * Note: "Sam" is explicitly excluded from word banks per spec, so it is not listed here.
 */
const PROPER_NAMES = new Set([
  'liam','emma','noah','olivia','amara','felix','zara','kai','priya','jess',
  'mia','leo','maya','theo','isla','jasper','freya','max','ruby','oscar',
  'lily','jake','sofia','eli','grace','ben','ava','lucas','chloe','harry',
  'ella','james','poppy','ethan','niamh','ravi','aisha','tom','sophie',
  'jack','layla','alex','evie','tyler','ivy','charlie','daisy','finn',
  'amber','george','rosie','henry','imogen','archie','ellie','joseph','lydia',
])

/**
 * Irregular past-tense verbs that don't end in -ed and would otherwise be
 * misclassified as nouns (e.g. "fell", "ran", "swam", "went").
 */
const PAST_IRREGULAR_VERBS = new Set([
  // common irregular pasts used in PWP word banks
  'fell','ran','swam','flew','grew','drew','threw','blew','knew',
  'saw','ate','drank','sang','rang','sat','bit','hit','cut','put',
  'set','got','let','lit','met','led','fed','bled','fled','sped',
  'held','felt','dealt','kept','slept','wept','crept','swept',
  'left','meant','sent','spent','bent','lent','built','went',
  'came','gave','made','took','told','sold','lost','beat',
  'burst','cast','shut','hurt','rode','rose','wore','bore',
  'tore','swore','chose','froze','drove','strove','wove',
  'shone','spun','won','ran','hid','laid','paid','said',
  'read','stood','understood','found','bound','ground','wound',
  'brought','bought','caught','taught','thought','fought','sought',
  'break','broke','climb','climbed','skipped','jumped','walked',
  'played','shouted','carried','dropped','kicked','threw',
])

export function guessWordClass(word: string): string {
  const w = word.toLowerCase().replace(/[.!?,;]$/, '')
  if (DETERMINERS.has(w))          return 'determiner'
  if (PRONOUNS.has(w))             return 'pronoun'
  if (PREPOSITIONS.has(w))         return 'preposition'
  if (CONJUNCTIONS.has(w))         return 'conjunction'
  if (ADVERBS.has(w))              return 'adverb'
  if (ADJECTIVES.has(w))           return 'adjective'
  // Named entities checked BEFORE morphological heuristics so that place/person
  // names ending in -s (Paris, Athens, Brussels, James, etc.) are not misclassified
  // as verbs by the w.endsWith('s') pattern.
  if (PLACE_NAMES.has(w))          return 'place'
  if (PROPER_NAMES.has(w))         return 'proper'
  if (HELPING_VERBS.has(w))        return 'verb'
  if (PAST_IRREGULAR_VERBS.has(w)) return 'verb'
  // Morphological patterns: -ing, -ed, -s verb forms
  if (w.endsWith('ing') || w.endsWith('ed') || (w.endsWith('s') && w.length > 4)) return 'verb'
  // Capitalised words not otherwise classified are likely proper nouns
  if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) return 'proper'
  return 'noun'
}

/** Convenience: get chip colours directly from a word string */
export function chipColourForWord(word: string): WordClassColour {
  return getWordClassColour(guessWordClass(word))
}
