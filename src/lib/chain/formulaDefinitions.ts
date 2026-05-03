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
  /**
   * Optional: positions where an alternative word class is also accepted.
   * Key = 0-based position index, value = array of acceptable WordClass values.
   * Used where the formula genuinely allows two word classes (e.g. pronoun OR determiner).
   */
  alternatives?: Record<number, WordClass[]>
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

  // ─── L11–L20 (Phase A extension / Phase B consolidation) ─────────────────────

  {
    level: 11,
    name: 'det + adj + noun + will + verb + adv',
    pattern: [
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
      WordClass.VERB,   // modal: will / shall
      WordClass.VERB,   // main verb
      WordClass.ADVERB,
    ],
    hint:
      'Use a future tense verb: write "will [verb]" — two words for the verb slot. ' +
      'Example structure: The [adj] [noun] will [verb] [adv].',
    example: 'The ancient storm will roar fiercely.',
  },
  {
    level: 12,
    name: 'pronoun + verb + prep + det + adj + noun',
    pattern: [
      WordClass.PRONOUN,
      WordClass.VERB,
      WordClass.PREPOSITION,
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
    ],
    hint:
      'Start with a pronoun (She / He / They / It), then a verb, then a position word, ' +
      'then describe the object with a pointer word + describing word + naming word.',
    example: 'She glided above the gleaming mountain.',
  },
  {
    level: 13,
    name: 'det + adj + noun + verb + adv',
    pattern: [
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
      WordClass.VERB,
      WordClass.ADVERB,
    ],
    hint:
      'You know this pattern well now! Challenge yourself: use a vivid, specific adverb ' +
      'that tells exactly how the action happens — not just "quickly" or "slowly".',
    example: 'The ancient explorer soared gracefully.',
  },
  {
    level: 14,
    name: 'prep + det + adj + noun + verb',
    pattern: [
      WordClass.PREPOSITION,
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
      WordClass.VERB,
    ],
    hint:
      'Start with a position word (Beneath / Through / Beyond / Over…). ' +
      'The naming word becomes the setting — use an inverted order so the verb ends the sentence.',
    example: 'Through the towering forest soared.',
  },
  {
    level: 15,
    name: 'det + adj + noun + verb + adv',
    pattern: [
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
      WordClass.VERB,
      WordClass.ADVERB,
    ],
    hint:
      'Same pattern as L4 — but now try a different theme. ' +
      'Use a scientist, inventor, or explorer as your subject and a precise adverb at the end.',
    example: 'The fearless scientist discovered swiftly.',
  },
  {
    level: 16,
    name: 'pronoun + verb + prep + det + adj + noun',
    pattern: [
      WordClass.PRONOUN,
      WordClass.VERB,
      WordClass.PREPOSITION,
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
    ],
    hint:
      'Pronoun → verb → position word → pointer word → describing word → naming word. ' +
      'Choose a pronoun different from your L12 sentence.',
    example: 'He glided through the towering canyon.',
  },
  {
    level: 17,
    name: 'det + adj + noun + verb + conj + pronoun + verb',
    pattern: [
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
      WordClass.VERB,
      WordClass.CONJUNCTION,
      WordClass.PRONOUN,
      WordClass.VERB,
    ],
    hint:
      'Join two ideas with a joining word (because / although / while / since). ' +
      'Your subject does something, then explain why or what else happens.',
    example: 'The mysterious inventor worked because she believed.',
  },
  {
    level: 18,
    name: 'prep + det + adj + noun + verb + det + adj + noun',
    pattern: [
      WordClass.PREPOSITION,
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
      WordClass.VERB,
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
    ],
    hint:
      'Eight words! Start with a position word, describe the setting, add the verb, ' +
      'then name an object with its own pointer word and describing word.',
    example: 'Beneath the gleaming glacier drifted an ancient explorer.',
  },
  {
    level: 19,
    name: 'det + adj + noun + verb + adv',
    pattern: [
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
      WordClass.VERB,
      WordClass.ADVERB,
    ],
    hint:
      'By now you\'ve mastered this pattern. Show it with ambitious vocabulary — ' +
      'choose a word that paints a picture rather than just describing speed.',
    example: 'The magnificent architect constructed swiftly.',
  },
  {
    level: 20,
    name: 'det/pronoun + adj + noun + verb + prep + det + adj + noun',
    pattern: [
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
      WordClass.VERB,
      WordClass.PREPOSITION,
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
    ],
    // Position 0 also accepts a PRONOUN (e.g. "That fearless explorer…")
    alternatives: { 0: [WordClass.PRONOUN] },
    hint:
      'Eight words, ending with a full noun phrase after a position word. ' +
      'Your sentence tells who/what did something and where they went.',
    example: 'The fearless explorer vanished beyond the ancient canyon.',
  },

  // ─── L21–L30 (Phase C patterns — complex sentences) ─────────────────────────

  {
    level: 21,
    name: 'det + adj + noun + verb + adv',
    pattern: [
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
      WordClass.VERB,
      WordClass.ADVERB,
    ],
    hint:
      'This is your most-practised pattern — now use it with a creature or natural force ' +
      'and a precise, vivid adverb.',
    example: 'The swift eagle swooped gracefully.',
  },
  {
    level: 22,
    name: 'det + adj + noun + verb + prep + noun',
    pattern: [
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
      WordClass.VERB,
      WordClass.PREPOSITION,
      WordClass.NOUN,
    ],
    hint:
      'After the verb, add a position word followed by a single naming word — no pointer ' +
      'word this time. The object is a place or thing (e.g. "through darkness", "past mountains").',
    example: 'The ancient warrior marched through darkness.',
  },
  {
    level: 23,
    name: 'adj + noun + verb + adv + conj + noun + verb',
    pattern: [
      WordClass.ADJECTIVE,
      WordClass.NOUN,
      WordClass.VERB,
      WordClass.ADVERB,
      WordClass.CONJUNCTION,
      WordClass.NOUN,
      WordClass.VERB,
    ],
    hint:
      'No pointer word at the start — begin straight with a describing word. ' +
      'Then join a second subject and verb with "and / but / while".',
    example: 'Brave explorers climbed carefully and rivers rushed.',
  },
  {
    level: 24,
    name: 'det + noun + pronoun + verb + det + adj + noun',
    pattern: [
      WordClass.DETERMINER,
      WordClass.NOUN,
      WordClass.PRONOUN,
      WordClass.VERB,
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
    ],
    hint:
      'Use "who" or "which" to add information about your subject (a relative clause). ' +
      'Pattern: The [noun] who [verb] the [adj] [noun].',
    example: 'The explorer who discovered the hidden cave.',
  },
  {
    level: 25,
    name: 'det + adj + noun + pronoun + verb + adv + verb',
    pattern: [
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
      WordClass.PRONOUN,
      WordClass.VERB,
      WordClass.ADVERB,
      WordClass.VERB,
    ],
    hint:
      'Add a relative clause with "which" or "who" that includes its own verb and an adverb. ' +
      'Pattern: The [adj] [noun] which [verb] [adv] [verb].',
    example: 'The wise owl which hunted silently ruled.',
  },
  {
    level: 26,
    name: 'adv + noun + verb + det + adj + noun',
    pattern: [
      WordClass.ADVERB,
      WordClass.NOUN,
      WordClass.VERB,
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
    ],
    hint:
      'Start with an adverb — a sudden time or manner word (Suddenly / Silently / Fiercely…). ' +
      'Then your subject verb and object follow.',
    example: 'Suddenly thunder shook the old castle.',
  },
  {
    level: 27,
    name: 'det + noun + verb + conj + det + noun + verb + adj',
    pattern: [
      WordClass.DETERMINER,
      WordClass.NOUN,
      WordClass.VERB,
      WordClass.CONJUNCTION,
      WordClass.DETERMINER,
      WordClass.NOUN,
      WordClass.VERB,
      WordClass.ADJECTIVE,
    ],
    hint:
      'Two subjects, two verbs, joined by a conjunction — and end with a describing word ' +
      'that tells us the state of the second subject.',
    example: 'The dragon roared because the knight was fearless.',
  },
  {
    level: 28,
    name: 'prep + prep + det + adj + noun + noun + verb + conj + noun + verb',
    pattern: [
      WordClass.PREPOSITION,
      WordClass.PREPOSITION,
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
      WordClass.NOUN,
      WordClass.VERB,
      WordClass.CONJUNCTION,
      WordClass.NOUN,
      WordClass.VERB,
    ],
    hint:
      'Ten words! Start with two position words setting the scene (e.g. "Deep in the…"), ' +
      'then two subjects acting together, joined by a conjunction at the end.',
    example: 'Deep in the dark forest wolves howled while snow fell.',
  },
  {
    level: 29,
    name: 'conj + det + adj + noun + verb + adj + det + noun + verb + pronoun',
    pattern: [
      WordClass.CONJUNCTION,
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
      WordClass.VERB,
      WordClass.ADJECTIVE,
      WordClass.DETERMINER,
      WordClass.NOUN,
      WordClass.VERB,
      WordClass.PRONOUN,
    ],
    hint:
      'Start with "Although" or "Even though" to set up a contrast. ' +
      'Despite the first thing being true, the second thing still happened.',
    example: 'Although the ancient map was torn the explorer followed it.',
  },
  {
    level: 30,
    name: 'prep + det + adj + noun + noun + pronoun + verb + adv + verb',
    pattern: [
      WordClass.PREPOSITION,
      WordClass.DETERMINER,
      WordClass.ADJECTIVE,
      WordClass.NOUN,
      WordClass.NOUN,
      WordClass.PRONOUN,
      WordClass.VERB,
      WordClass.ADVERB,
      WordClass.VERB,
    ],
    hint:
      'Nine words. Start with a position word to set the scene, then introduce creatures ' +
      'with a relative clause using "that" or "which" before the final verb.',
    example: 'Beneath the vast ocean creatures that glowed mysteriously drifted.',
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
