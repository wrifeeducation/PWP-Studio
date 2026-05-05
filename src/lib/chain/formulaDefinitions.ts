/**
 * PWP Daily Chain Practice — Formula Chain Level Definitions CL1–CL11
 *
 * Each Chain Level (CL) maps directly to the WriFe curriculum (L10–L26).
 * Derived from the WriFe PWP Development Specification §3.2.
 *
 * Key principles:
 * - Each CL adds exactly ONE new grammatical element
 * - Word banks use everyday concrete nouns (robot, school, park…) — NOT fantasy
 * - CL4 introduces the proper noun as subject (same slot count as CL3)
 * - CL8 / CL10 use verb phrases ("is walking") as a SINGLE VERB slot
 * - CL11 is free-arrangement: pupil selects any CL1–CL10 structure
 *
 * Validator rule: check WORD CLASS COUNT, not raw word count.
 * "is walking" = one VERB slot → counts as 1, not 2.
 */

import { WordClass } from '../../types/index'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChainFormulaDefinition {
  /** Chain level number (1–11) */
  level: number
  /** Human-readable level name shown on the level badge */
  name: string
  /** WriFe curriculum lesson(s) this chain level corresponds to */
  curriculumLesson: string
  /**
   * Ordered sequence of word classes the pupil's sentence must match.
   * VERB slots may represent a verb phrase ("is walking") — still counts as 1.
   */
  pattern: WordClass[]
  /**
   * Word class count pupils must hit. Matches pattern.length for most CLs.
   * Explicitly stated so the validator can show named feedback.
   */
  wordClassCount: number
  /**
   * Diff label — what new element was added compared to the previous CL.
   * Shown as a badge on the level card, e.g. "+PREP", "+ADJ", "+FRONTED ADV".
   */
  newElement: string
  /** Plain-English hint shown below the input (pupil-facing) */
  hint: string
  /**
   * Model sentence using an everyday concrete subject.
   * Uses "Robots" / "The robot" / "Ben" to demonstrate the structure clearly.
   */
  example: string
  /**
   * Word bank for this level: everyday concrete nouns only (CL1–CL6).
   * Replace the fantasy vocab (dragon, explorer) the old L1–L30 used.
   */
  wordBank?: {
    nouns?: string[]
    verbs?: string[]
    adjectives?: string[]
    adverbs?: string[]
    prepositions?: string[]
  }
  /**
   * Set to true if this level uses a verb phrase (auxiliary + main verb).
   * The validator treats the entire phrase as a single VERB slot.
   */
  verbPhrase?: boolean
  /**
   * Set to true for CL4 where the subject position expects a proper noun
   * (place or person name). Pattern is still NOUN; this flag drives the hint.
   */
  properNounSubject?: boolean
  /**
   * CL11 only — free arrangement mode.
   * No fixed pattern; pupil selects any structure from CL1–CL10.
   */
  freeArrangement?: boolean
  /**
   * Optional: positions where an alternative word class is also accepted.
   * Key = 0-based index in pattern, value = array of acceptable WordClass values.
   */
  alternatives?: Record<number, WordClass[]>
}

// ─── CL1–CL11 Definitions ─────────────────────────────────────────────────────

export const CHAIN_FORMULA_DEFINITIONS: ChainFormulaDefinition[] = [

  // ── CL1 — Lesson L10: Basic tenses ──────────────────────────────────────────
  {
    level: 1,
    name: 'Noun + Verb',
    curriculumLesson: 'L10 — Basic tenses',
    pattern: [WordClass.NOUN, WordClass.VERB],
    wordClassCount: 2,
    newElement: 'NOUN + VERB',
    hint: 'Write a naming word (noun), then a doing word (verb). The noun is your subject — choose a place or thing. Example: Robots walk.',
    example: 'Robots walk.',
    wordBank: {
      nouns: ['robots', 'birds', 'cars', 'children', 'dogs', 'fish', 'horses', 'buses'],
      verbs: ['walk', 'run', 'swim', 'fly', 'sit', 'stand', 'sleep', 'eat', 'jump', 'talk'],
    },
  },

  // ── CL2 — Lesson L11: Subject, verb, object ──────────────────────────────────
  {
    level: 2,
    name: 'Noun + Verb + Prep + Noun',
    curriculumLesson: 'L11 — Subject, verb, object',
    pattern: [WordClass.NOUN, WordClass.VERB, WordClass.PREPOSITION, WordClass.NOUN],
    wordClassCount: 4,
    newElement: '+PREP +NOUN',
    hint: 'Add a position word (to / in / at / near) and a destination noun at the end. Where does your subject go? Example: Robots walk to school.',
    example: 'Robots walk to school.',
    wordBank: {
      nouns: ['robots', 'birds', 'cars', 'children', 'dogs', 'horses', 'buses',
               'school', 'park', 'market', 'station', 'gate', 'garden', 'street'],
      verbs: ['walk', 'run', 'swim', 'fly', 'go', 'travel', 'move', 'rush'],
      prepositions: ['to', 'in', 'at', 'near', 'past', 'through', 'around'],
    },
  },

  // ── CL3 — Lesson L11: Determiners with object ────────────────────────────────
  {
    level: 3,
    name: 'Noun + Verb + Prep + Det + Noun',
    curriculumLesson: 'L11 — Determiners with object',
    pattern: [
      WordClass.NOUN, WordClass.VERB,
      WordClass.PREPOSITION, WordClass.DETERMINER, WordClass.NOUN,
    ],
    wordClassCount: 5,
    newElement: '+DET',
    hint: 'Add a pointer word (the / a / this) before your destination noun. "Robots walk to school" → "Robots walk to the school." Example: Robots walk to the school.',
    example: 'Robots walk to the school.',
    wordBank: {
      nouns: ['robots', 'birds', 'children', 'dogs', 'horses', 'buses',
               'school', 'park', 'market', 'station', 'gate', 'garden', 'street'],
      verbs: ['walk', 'run', 'go', 'travel', 'move', 'rush', 'skip', 'march'],
      prepositions: ['to', 'in', 'at', 'near', 'past', 'through', 'around'],
    },
  },

  // ── CL4 — Lesson L8: Proper noun subject ────────────────────────────────────
  {
    level: 4,
    name: 'Proper Noun + Verb + Prep + Det + Noun',
    curriculumLesson: 'L8 — Proper nouns',
    pattern: [
      WordClass.NOUN, WordClass.VERB,
      WordClass.PREPOSITION, WordClass.DETERMINER, WordClass.NOUN,
    ],
    wordClassCount: 5,
    newElement: 'PROPER NOUN subject',
    properNounSubject: true,
    hint: 'Same pattern as CL3 — but now your subject is a proper noun: a real place or person\'s name (no "the" before it). Example: Ben walked to the school.',
    example: 'Ben walked to the school.',
    wordBank: {
      nouns: ['Ben', 'Sam', 'Mia', 'London', 'Paris', 'India', 'Africa',
               'school', 'park', 'market', 'station', 'gate', 'garden'],
      verbs: ['walked', 'ran', 'skipped', 'marched', 'rushed', 'travelled'],
      prepositions: ['to', 'past', 'near', 'through', 'around'],
    },
  },

  // ── CL5 — Lesson L12: Adjectives ────────────────────────────────────────────
  {
    level: 5,
    name: 'Noun + Verb + Prep + Det + Adj + Noun',
    curriculumLesson: 'L12 — Adjectives',
    pattern: [
      WordClass.NOUN, WordClass.VERB,
      WordClass.PREPOSITION, WordClass.DETERMINER,
      WordClass.ADJECTIVE, WordClass.NOUN,
    ],
    wordClassCount: 6,
    newElement: '+ADJ',
    hint: 'Add a describing word (adjective) before your destination noun. "…to the school" → "…to the busy school." Example: Robots walk to the busy school.',
    example: 'Robots walk to the busy school.',
    wordBank: {
      nouns: ['robots', 'birds', 'children', 'dogs', 'horses', 'buses',
               'school', 'park', 'market', 'station', 'gate', 'garden'],
      verbs: ['walk', 'run', 'go', 'travel', 'move', 'rush'],
      adjectives: ['busy', 'quiet', 'old', 'new', 'bright', 'dark', 'small', 'large',
                   'open', 'tall', 'cold', 'warm', 'empty', 'crowded'],
      prepositions: ['to', 'past', 'near', 'through', 'around'],
    },
  },

  // ── CL6 — Lesson L13: Adverbs (manner) ──────────────────────────────────────
  {
    level: 6,
    name: 'Noun + Verb + Adv + Prep + Det + Adj + Noun',
    curriculumLesson: 'L13 — Adverbs of manner',
    pattern: [
      WordClass.NOUN, WordClass.VERB, WordClass.ADVERB,
      WordClass.PREPOSITION, WordClass.DETERMINER,
      WordClass.ADJECTIVE, WordClass.NOUN,
    ],
    wordClassCount: 7,
    newElement: '+ADV (manner)',
    hint: 'Add a how-word (adverb) immediately after the verb. It tells us HOW they move. Example: Robots walk slowly to the busy school.',
    example: 'Robots walk slowly to the busy school.',
    wordBank: {
      nouns: ['robots', 'birds', 'children', 'dogs', 'horses', 'buses'],
      verbs: ['walk', 'run', 'go', 'travel', 'move', 'rush', 'march'],
      adverbs: ['slowly', 'quickly', 'quietly', 'loudly', 'carefully', 'bravely',
                'happily', 'sadly', 'eagerly', 'swiftly', 'calmly', 'noisily'],
      adjectives: ['busy', 'quiet', 'old', 'new', 'bright', 'dark', 'tall', 'empty'],
      prepositions: ['to', 'past', 'near', 'through', 'around'],
    },
  },

  // ── CL7 — Lesson L13: Adverbs (fronted) ─────────────────────────────────────
  {
    level: 7,
    name: 'Adv + Noun + Verb + Prep + Det + Adj + Noun',
    curriculumLesson: 'L13 — Fronted adverbial',
    pattern: [
      WordClass.ADVERB, WordClass.NOUN, WordClass.VERB,
      WordClass.PREPOSITION, WordClass.DETERMINER,
      WordClass.ADJECTIVE, WordClass.NOUN,
    ],
    wordClassCount: 7,
    newElement: 'FRONTED adv',
    hint: 'Move the adverb to the start of the sentence. A comma often follows it. Same word count as CL6 — you\'re just repositioning the adverb. Example: Slowly, robots walk to the busy school.',
    example: 'Slowly, robots walk to the busy school.',
    wordBank: {
      nouns: ['robots', 'birds', 'children', 'dogs', 'horses', 'buses'],
      verbs: ['walk', 'run', 'go', 'travel', 'move', 'rush', 'march'],
      adverbs: ['slowly', 'quickly', 'quietly', 'loudly', 'carefully', 'bravely',
                'eagerly', 'swiftly', 'calmly', 'suddenly', 'silently'],
      adjectives: ['busy', 'quiet', 'old', 'new', 'bright', 'dark', 'tall', 'empty'],
      prepositions: ['to', 'past', 'near', 'through', 'around', 'into'],
    },
  },

  // ── CL8 — Lesson L9: Verb phrases (phrasal verb) ────────────────────────────
  {
    level: 8,
    name: 'Noun + Verb phrase + Prep + Det + Adj + Noun',
    curriculumLesson: 'L9 — Verb phrases (continuous tense)',
    pattern: [
      WordClass.NOUN, WordClass.VERB,
      WordClass.PREPOSITION, WordClass.DETERMINER,
      WordClass.ADJECTIVE, WordClass.NOUN,
    ],
    wordClassCount: 6,
    newElement: 'VERB PHRASE',
    verbPhrase: true,
    hint: 'Change your verb to a continuous phrase: "walk" → "are walking". The phrase "are walking" still counts as ONE verb slot. Example: Robots are walking to the busy school.',
    example: 'Robots are walking to the busy school.',
    wordBank: {
      nouns: ['robots', 'birds', 'children', 'dogs', 'horses', 'buses'],
      verbs: ['are walking', 'are running', 'are travelling', 'are moving',
               'were walking', 'were running', 'is walking', 'is running'],
      adjectives: ['busy', 'quiet', 'old', 'new', 'bright', 'dark', 'tall', 'empty'],
      prepositions: ['to', 'past', 'near', 'through', 'around', 'into'],
    },
  },

  // ── CL9 — Lesson L12: Adjective on subject noun ─────────────────────────────
  {
    level: 9,
    name: 'Det + Adj + Noun + Verb + Prep + Det + Adj + Noun',
    curriculumLesson: 'L12 — Adjective on subject noun',
    pattern: [
      WordClass.DETERMINER, WordClass.ADJECTIVE, WordClass.NOUN, WordClass.VERB,
      WordClass.PREPOSITION, WordClass.DETERMINER,
      WordClass.ADJECTIVE, WordClass.NOUN,
    ],
    wordClassCount: 8,
    newElement: '+DET +ADJ (subject)',
    hint: 'Add a pointer word and describing word before your subject noun. "Robots walk" → "The old robot walks". Now your subject has its own determiner + adjective. Example: The old robot walks to the busy school.',
    example: 'The old robot walks to the busy school.',
    wordBank: {
      nouns: ['robot', 'bird', 'child', 'dog', 'horse', 'bus',
               'school', 'park', 'market', 'station', 'gate', 'garden'],
      verbs: ['walks', 'runs', 'travels', 'moves', 'rushes', 'marches'],
      adjectives: ['old', 'new', 'small', 'large', 'busy', 'quiet', 'bright',
                   'dark', 'tall', 'red', 'blue', 'green', 'empty', 'crowded'],
      prepositions: ['to', 'past', 'near', 'through', 'around', 'into'],
    },
  },

  // ── CL10 — Lessons L20–L22: Noun phrases ────────────────────────────────────
  {
    level: 10,
    name: 'Det + Adj + Noun + Verb phrase + Adv + Prep + Det + Adj + Noun',
    curriculumLesson: 'L20–L22 — Noun phrases',
    pattern: [
      WordClass.DETERMINER, WordClass.ADJECTIVE, WordClass.NOUN,
      WordClass.VERB, WordClass.ADVERB,
      WordClass.PREPOSITION, WordClass.DETERMINER,
      WordClass.ADJECTIVE, WordClass.NOUN,
    ],
    wordClassCount: 9,
    newElement: '+VERB PHRASE +ADV',
    verbPhrase: true,
    hint: 'Combine what you know: noun phrase subject, a continuous verb phrase, an adverb showing how, then a prepositional phrase with a described noun. Nine word-class slots total. Example: The old robot is walking slowly to the busy school.',
    example: 'The old robot is walking slowly to the busy school.',
    wordBank: {
      nouns: ['robot', 'bird', 'child', 'dog', 'horse', 'bus',
               'school', 'park', 'market', 'station', 'garden', 'street'],
      verbs: ['is walking', 'is running', 'is travelling', 'is moving',
               'was walking', 'was running', 'is rushing', 'is marching'],
      adjectives: ['old', 'new', 'small', 'large', 'busy', 'quiet', 'bright',
                   'dark', 'tall', 'red', 'empty', 'crowded', 'noisy'],
      adverbs: ['slowly', 'quickly', 'quietly', 'carefully', 'bravely',
                'eagerly', 'swiftly', 'calmly', 'noisily', 'happily'],
      prepositions: ['to', 'past', 'near', 'through', 'around', 'into'],
    },
  },

  // ── CL11 — Lesson L25: Free arrangement ─────────────────────────────────────
  {
    level: 11,
    name: 'Free Choice (CL1–CL10)',
    curriculumLesson: 'L25 — Sentence variants',
    pattern: [], // no fixed pattern — pupil selects
    wordClassCount: 0,
    newElement: 'FREE CHOICE',
    freeArrangement: true,
    hint: 'You choose! Pick any sentence structure from CL1 to CL10. Challenge yourself: can you write a CL9 or CL10 sentence with ambitious vocabulary?',
    example: 'The busy market is bustling noisily near the old school.',
    wordBank: {
      nouns: ['robot', 'bird', 'child', 'dog', 'horse', 'bus', 'school',
               'park', 'market', 'station', 'gate', 'garden', 'street'],
      verbs: ['walks', 'runs', 'travels', 'moves', 'rushes', 'marches',
               'is walking', 'is running', 'is travelling', 'was walking'],
      adjectives: ['old', 'new', 'small', 'large', 'busy', 'quiet', 'bright',
                   'dark', 'tall', 'empty', 'crowded', 'noisy', 'clean'],
      adverbs: ['slowly', 'quickly', 'quietly', 'carefully', 'bravely',
                'eagerly', 'swiftly', 'calmly', 'noisily', 'happily'],
      prepositions: ['to', 'past', 'near', 'through', 'around', 'into', 'at'],
    },
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Quick lookup by chain level number (1–11) */
export const getChainFormula = (level: number): ChainFormulaDefinition | undefined =>
  CHAIN_FORMULA_DEFINITIONS.find((f) => f.level === level)

/** Returns all defined chain formulas up to and including `currentLevel` */
export const getChainForLevel = (currentLevel: number): ChainFormulaDefinition[] =>
  CHAIN_FORMULA_DEFINITIONS.filter((f) => f.level <= currentLevel).sort(
    (a, b) => a.level - b.level,
  )

/** Returns the previous CL definition, for diff-badge calculation */
export const getPreviousChainFormula = (level: number): ChainFormulaDefinition | undefined =>
  level > 1 ? getChainFormula(level - 1) : undefined

/**
 * Returns the human-readable list of word classes for a formula.
 * Used in error messages: "This formula needs 6: determiner · adjective · noun…"
 */
export const patternToNames = (pattern: WordClass[]): string => {
  const WC_SHORT: Record<WordClass, string> = {
    [WordClass.NOUN]:        'noun',
    [WordClass.VERB]:        'verb',
    [WordClass.ADJECTIVE]:   'adjective',
    [WordClass.DETERMINER]:  'determiner',
    [WordClass.ADVERB]:      'adverb',
    [WordClass.PREPOSITION]: 'preposition',
    [WordClass.PRONOUN]:     'pronoun',
    [WordClass.CONJUNCTION]: 'conjunction',
  }
  return pattern.map((wc) => WC_SHORT[wc]).join(' · ')
}
