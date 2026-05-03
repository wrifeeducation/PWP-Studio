/**
 * PWP Daily Chain Practice — Formula Definitions L1–L10
 *
 * Each definition is derived from the formula_levels table (WriFe Platform DB).
 * `pattern` is the authoritative word-class sequence for client-side validation.
 * `hint` and `example` are new fields added for the chain practice UI.
 *
 * Extend to L11–L30 in Phase B, L31–L67 in Phase C.
 */

import { WordClass } from '../../types/index'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChainFormulaDefinition {
  /** Formula level number (1–67) */
  level: number
  /** Human-readable formula name shown as the level badge label */
  name: string
  /** Ordered sequence of word classes the pupil's sentence must match */
  pattern: WordClass[]
  /** Plain-English hint shown below the sentence input (pupil-facing) */
  hint: string
  /** Model sentence using a generic subject so pupils see the structure clearly */
  example: string
}

// ─── L1–L10 Definitions ───────────────────────────────────────────────────────
// Patterns sourced directly from formula_levels DB rows (May 2026).
// L4/L5/L9 share the same 5-element pattern (det+adj+noun+verb+adv) — this is
// correct; the DB uses different word banks / themes for each level.
// L8/L10 share the same preposition-fronted pattern with different contexts.

export const CHAIN_FORMULA_DEFINITIONS: ChainFormulaDefinition[] = [
  {
    level: 1,
    name: 'noun + verb',
    pattern: [WordClass.NOUN, WordClass.VERB],
    hint: 'Write a naming word (noun), then a doing word (verb). Example: Dogs swim.',
    example: 'Dogs swim.',
  },
  {
    level: 2,
    name: 'det + noun + verb',
    pattern: [WordClass.DETERMINER, WordClass.NOUN, WordClass.VERB],
    hint:
      'Start with a pointer word (the, a, this…), then a naming word, then a doing word.',
    example: 'The dragon soared.',
  },
  {
    level: 3,
    name: 'det + adj + noun + verb',
    pattern: [WordClass.DETERMINER, WordClass.ADJECTIVE, WordClass.NOUN, WordClass.VERB],
    hint:
      'Add a describing word between your pointer word and naming word. ' +
      'Example: The enormous storm roared.',
    example: 'The enormous storm roared.',
  },
  {
    level: 4,
    name: 'det + adj + noun + verb + adv',
    pattern: [
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
      WordClass.VERB,
      WordClass.ADVERB,
    ],
    hint:
      'End your L3 sentence with a how/when word (an adverb, often ending in -ly).',
    example: 'The ancient explorer searched bravely.',
  },
  {
    level: 5,
    name: 'det + adj + noun + verb + adv',
    pattern: [
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
      WordClass.VERB,
      WordClass.ADVERB,
    ],
    hint:
      'Pointer word → describing word → naming word → doing word → how word. ' +
      'Use a different subject and setting from L4.',
    example: 'The gleaming city glistened brilliantly.',
  },
  {
    level: 6,
    name: 'det + adj + noun + verb + adj + noun',
    pattern: [
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
      WordClass.VERB,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
    ],
    hint:
      'Your sentence needs two naming words — the subject and an object — each with a describing word.',
    example: 'The fierce dragon chased the gleaming knight.',
  },
  {
    level: 7,
    name: 'det + adj + noun + verb + det + adj + noun',
    pattern: [
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
      WordClass.VERB,
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
    ],
    hint:
      'Like L6 but add a pointer word (the/a) before the second describing word and naming word.',
    example: 'The ancient storm shattered the gleaming tower.',
  },
  {
    level: 8,
    name: 'prep + det + adj + noun + verb',
    pattern: [
      WordClass.PREPOSITION,
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
      WordClass.VERB,
    ],
    hint:
      'Start with a position word (over, beneath, beside, through…), then the rest of your sentence.',
    example: 'Beneath the ancient cliffs, eagles soared.',
  },
  {
    level: 9,
    name: 'det + adj + noun + verb + adv',
    pattern: [
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
      WordClass.VERB,
      WordClass.ADVERB,
    ],
    hint:
      'Use a vivid adverb at the end. Try to choose a more precise adverb than in your earlier sentences.',
    example: 'The enormous dragon soared gracefully.',
  },
  {
    level: 10,
    name: 'prep + det + adj + noun + verb',
    pattern: [
      WordClass.PREPOSITION,
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
      WordClass.VERB,
    ],
    hint:
      'Begin with a position word. Choose a different preposition from L8 to vary your writing.',
    example: 'Over the gleaming city, the eagle soared.',
  },
]

/** Quick lookup by level number */
export const getChainFormula = (level: number): ChainFormulaDefinition | undefined =>
  CHAIN_FORMULA_DEFINITIONS.find((f) => f.level === level)

/** Returns all defined chain formulas up to and including `currentLevel` */
export const getChainForLevel = (currentLevel: number): ChainFormulaDefinition[] =>
  CHAIN_FORMULA_DEFINITIONS.filter((f) => f.level <= currentLevel).sort(
    (a, b) => a.level - b.level,
  )
