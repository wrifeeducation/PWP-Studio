/**
 * WriFe canonical word class and punctuation definitions
 *
 * These are the authoritative definitions used across the entire platform:
 * concept cards, in-session hints, AI feedback messages, teacher explainers.
 *
 * Edit here and the change propagates everywhere.
 */

import { WordClass } from '../types/index'

export interface WordClassDefinition {
  wordClass: WordClass
  label: string                   // Technical name (Noun, Verb, etc.)
  plainEnglishName: string        // Child-friendly name shown on concept cards and slots (e.g. "naming word")
  colour: string                  // Tailwind bg colour class (matches WORD_CLASS_COLOUR tokens)
  definition: string              // Technical one-sentence canonical definition (teacher-facing)
  childFriendlyDefinition: string // Plain-English explanation for pupil-facing concept cards
  examples: string[]              // 3–5 general examples (session-specific examples come from word bank)
  teacherNote?: string            // Shown in teacher dashboard only — extra pedagogical context
}

export const WORD_CLASS_DEFINITIONS: Record<WordClass, WordClassDefinition> = {
  [WordClass.NOUN]: {
    wordClass: WordClass.NOUN,
    label: 'Noun',
    plainEnglishName: 'naming word',
    colour: 'bg-blue-500',
    definition: 'A noun is the name of a person, place, thing or idea.',
    childFriendlyDefinition:
      'A naming word is a word that names a person, a place or a thing — like a label for the world around you!',
    examples: ['teacher', 'London', 'table', 'happiness'],
    teacherNote:
      'Covers common nouns (table), proper nouns (London), and abstract nouns (happiness). ' +
      'Pupils often miss abstract nouns — worth explicit practice.',
  },
  [WordClass.VERB]: {
    wordClass: WordClass.VERB,
    label: 'Verb',
    plainEnglishName: 'doing word',
    colour: 'bg-red-500',
    definition: 'A verb is a doing, being or feeling word.',
    childFriendlyDefinition:
      'A doing word shows what someone or something does, is, or feels. Without a doing word, nothing happens in your sentence!',
    examples: ['run', 'is', 'love', 'think'],
    teacherNote:
      'The most difficult word class for primary pupils. Covers action verbs (run, jump), ' +
      'linking/being verbs (is, was, were), and stative/feeling verbs (love, fear, enjoy). ' +
      'Reinforce all three types — many pupils recognise only action verbs.',
  },
  [WordClass.ADJECTIVE]: {
    wordClass: WordClass.ADJECTIVE,
    label: 'Adjective',
    plainEnglishName: 'describing word',
    colour: 'bg-green-500',
    definition: 'An adjective is a describing word. It tells you more about a noun.',
    childFriendlyDefinition:
      'A describing word paints a picture of a naming word — it tells you what something looks, feels, sounds or smells like.',
    examples: ['tall', 'red', 'busy', 'ancient'],
  },
  [WordClass.DETERMINER]: {
    wordClass: WordClass.DETERMINER,
    label: 'Determiner',
    plainEnglishName: 'pointer word',
    colour: 'bg-purple-500',
    definition: 'A determiner introduces a noun. It tells you which one or how many.',
    childFriendlyDefinition:
      'A pointer word always goes in front of a naming word and points to which one you mean — like "the cat" or "my dog".',
    examples: ['the', 'a', 'my', 'some', 'this'],
    teacherNote:
      'Includes articles (the, a/an), possessives (my, his, their), demonstratives (this, that), ' +
      'and quantifiers (some, every, many). Pupils often confuse determiners with adjectives — ' +
      'stress that determiners introduce the noun phrase, adjectives describe within it.',
  },
  [WordClass.ADVERB]: {
    wordClass: WordClass.ADVERB,
    label: 'Adverb',
    plainEnglishName: 'how/when word',
    colour: 'bg-orange-500',
    definition:
      'An adverb describes a verb, an adjective or another adverb. It often tells you how, when or where.',
    childFriendlyDefinition:
      'A how/when word tells you more about a doing word — how something happens ("quickly"), when ("always") or where ("here").',
    examples: ['quickly', 'always', 'very', 'nearly'],
    teacherNote:
      'Pupils often think adverbs only end in -ly. Include manner (quickly), ' +
      'time (always, soon), place (here, away), and degree (very, nearly) adverbs across formula levels.',
  },
  [WordClass.PREPOSITION]: {
    wordClass: WordClass.PREPOSITION,
    label: 'Preposition',
    plainEnglishName: 'position word',
    colour: 'bg-amber-800',
    definition:
      'A preposition shows the relationship between one thing and another. It tells you position, direction or time.',
    childFriendlyDefinition:
      'A position word shows where something is or when something happens — words like "on the table", "under the bed" or "before lunch".',
    examples: ['on', 'under', 'before', 'through', 'beside'],
  },
  [WordClass.PRONOUN]: {
    wordClass: WordClass.PRONOUN,
    label: 'Pronoun',
    plainEnglishName: 'replacement word',
    colour: 'bg-pink-500',
    definition: 'A pronoun takes the place of a noun. It saves you repeating the same name.',
    childFriendlyDefinition:
      'A replacement word takes the place of a naming word so you don\'t repeat it — instead of "Sam ran, Sam fell", you say "Sam ran, he fell".',
    examples: ['he', 'she', 'it', 'they', 'we'],
    teacherNote:
      'Focus on personal pronouns at KS1/2. Relative pronouns (who, which, that) and ' +
      'reflexive pronouns (himself, themselves) appear in higher formula levels.',
  },
  [WordClass.CONJUNCTION]: {
    wordClass: WordClass.CONJUNCTION,
    label: 'Conjunction',
    plainEnglishName: 'joining word',
    colour: 'bg-yellow-400',
    definition: 'A conjunction is a joining word. It connects words, phrases or clauses.',
    childFriendlyDefinition:
      'A joining word connects two ideas together, like glue between sentences — words like "and", "but" and "because".',
    examples: ['and', 'but', 'because', 'although', 'so'],
    teacherNote:
      'Distinguish co-ordinating conjunctions (and, but, or, so) from subordinating ' +
      'conjunctions (because, although, when, if). The latter are key to complex sentence ' +
      'building from Phase B onwards.',
  },
}

// ============================================================================
// PUNCTUATION DEFINITIONS
// ============================================================================

export interface PunctuationDefinition {
  mark: string            // The actual character(s)
  name: string            // Display name
  definition: string      // The canonical definition
  example: string         // A short example showing the mark in use
}

export const PUNCTUATION_DEFINITIONS: PunctuationDefinition[] = [
  {
    mark: '.',
    name: 'Full stop',
    definition: 'A full stop ends a statement. It tells the reader the sentence is complete.',
    example: 'The dog ran into the garden.',
  },
  {
    mark: '?',
    name: 'Question mark',
    definition: 'A question mark ends a sentence that asks a question.',
    example: 'Where is the dog going?',
  },
  {
    mark: '!',
    name: 'Exclamation mark',
    definition:
      'An exclamation mark ends a sentence that expresses strong feeling or gives a command.',
    example: 'The dog jumped so high!',
  },
  {
    mark: ',',
    name: 'Comma',
    definition:
      'A comma separates items in a list, or divides a longer sentence into clearer parts.',
    example: 'The dog was fast, noisy, and muddy.',
  },
  {
    mark: "'",
    name: 'Apostrophe',
    definition:
      "An apostrophe shows that letters are missing (it's) or that something belongs to someone (the dog's lead).",
    example: "It's the dog's favourite toy.",
  },
  {
    mark: 'A',
    name: 'Capital letter',
    definition: 'A capital letter starts a sentence, a proper noun, or the pronoun I.',
    example: 'I walked to London on Monday.',
  },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Get the definition for a word class, merging in examples from today's word bank */
export const getHintForSlot = (
  wordClass: WordClass,
  wordBankExamples?: string[]
): WordClassDefinition => {
  const base = WORD_CLASS_DEFINITIONS[wordClass]
  if (!wordBankExamples || wordBankExamples.length === 0) return base
  // Prefer word bank examples so the hint directly relates to today's session
  return { ...base, examples: wordBankExamples.slice(0, 4) }
}

/** Returns word classes in the order they appear in a formula, deduplicated */
export const getConceptCardsForFormula = (
  formulaWordClasses: WordClass[]
): WordClassDefinition[] => {
  const seen = new Set<WordClass>()
  const result: WordClassDefinition[] = []
  for (const wc of formulaWordClasses) {
    if (!seen.has(wc)) {
      seen.add(wc)
      result.push(WORD_CLASS_DEFINITIONS[wc])
    }
  }
  return result
}

/**
 * The formula level at which each word class is first introduced.
 * Derived from the live DB formula_elements data (levels 1–67).
 *
 * Use this to show full concept cards only for terms that are
 * genuinely new at the pupil's current level, and reminder chips
 * for word classes they have already encountered.
 */
export const WORD_CLASS_FIRST_LEVEL: Record<WordClass, number> = {
  [WordClass.NOUN]:        1,
  [WordClass.VERB]:        1,
  [WordClass.DETERMINER]:  2,
  [WordClass.ADJECTIVE]:   3,
  [WordClass.ADVERB]:      4,
  [WordClass.PREPOSITION]: 8,
  [WordClass.PRONOUN]:     12,
  [WordClass.CONJUNCTION]: 17,
}

/**
 * Returns word class definitions that are *new* at the given level.
 * Used by ConceptCardSequence to show full acquisition cards only for
 * genuinely new terms, not ones already seen in prior levels.
 */
export const getNewConceptCardsForLevel = (
  formulaWordClasses: WordClass[],
  currentLevelId: number
): WordClassDefinition[] => {
  const seen = new Set<WordClass>()
  const result: WordClassDefinition[] = []
  for (const wc of formulaWordClasses) {
    if (!seen.has(wc)) {
      seen.add(wc)
      if (WORD_CLASS_FIRST_LEVEL[wc] === currentLevelId) {
        result.push(WORD_CLASS_DEFINITIONS[wc])
      }
    }
  }
  return result
}
