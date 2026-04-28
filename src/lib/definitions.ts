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
  label: string          // Display name shown to pupils
  colour: string         // Tailwind bg colour class (matches WORD_CLASS_COLOUR tokens)
  definition: string     // The one-sentence canonical definition
  examples: string[]     // 3–5 general examples (session-specific examples come from word bank)
  teacherNote?: string   // Shown in teacher dashboard only — extra pedagogical context
}

export const WORD_CLASS_DEFINITIONS: Record<WordClass, WordClassDefinition> = {
  [WordClass.NOUN]: {
    wordClass: WordClass.NOUN,
    label: 'Noun',
    colour: 'bg-blue-500',
    definition: 'A noun is the name of a person, place, thing or idea.',
    examples: ['teacher', 'London', 'table', 'happiness'],
    teacherNote:
      'Covers common nouns (table), proper nouns (London), and abstract nouns (happiness). ' +
      'Pupils often miss abstract nouns — worth explicit practice.',
  },
  [WordClass.VERB]: {
    wordClass: WordClass.VERB,
    label: 'Verb',
    colour: 'bg-red-500',
    definition: 'A verb is a doing, being or feeling word.',
    examples: ['run', 'is', 'love', 'think'],
    teacherNote:
      'The most difficult word class for primary pupils. Covers action verbs (run, jump), ' +
      'linking/being verbs (is, was, were), and stative/feeling verbs (love, fear, enjoy). ' +
      'Reinforce all three types — many pupils recognise only action verbs.',
  },
  [WordClass.ADJECTIVE]: {
    wordClass: WordClass.ADJECTIVE,
    label: 'Adjective',
    colour: 'bg-green-500',
    definition: 'An adjective is a describing word. It tells you more about a noun.',
    examples: ['tall', 'red', 'busy', 'ancient'],
  },
  [WordClass.DETERMINER]: {
    wordClass: WordClass.DETERMINER,
    label: 'Determiner',
    colour: 'bg-purple-500',
    definition: 'A determiner introduces a noun. It tells you which one or how many.',
    examples: ['the', 'a', 'my', 'some', 'this'],
    teacherNote:
      'Includes articles (the, a/an), possessives (my, his, their), demonstratives (this, that), ' +
      'and quantifiers (some, every, many). Pupils often confuse determiners with adjectives — ' +
      'stress that determiners introduce the noun phrase, adjectives describe within it.',
  },
  [WordClass.ADVERB]: {
    wordClass: WordClass.ADVERB,
    label: 'Adverb',
    colour: 'bg-orange-500',
    definition:
      'An adverb describes a verb, an adjective or another adverb. It often tells you how, when or where.',
    examples: ['quickly', 'always', 'very', 'nearly'],
    teacherNote:
      'Pupils often think adverbs only end in -ly. Include manner (quickly), ' +
      'time (always, soon), place (here, away), and degree (very, nearly) adverbs across formula levels.',
  },
  [WordClass.PREPOSITION]: {
    wordClass: WordClass.PREPOSITION,
    label: 'Preposition',
    colour: 'bg-amber-800',
    definition:
      'A preposition shows the relationship between one thing and another. It tells you position, direction or time.',
    examples: ['on', 'under', 'before', 'through', 'beside'],
  },
  [WordClass.PRONOUN]: {
    wordClass: WordClass.PRONOUN,
    label: 'Pronoun',
    colour: 'bg-pink-500',
    definition: 'A pronoun takes the place of a noun. It saves you repeating the same name.',
    examples: ['he', 'she', 'it', 'they', 'we'],
    teacherNote:
      'Focus on personal pronouns at KS1/2. Relative pronouns (who, which, that) and ' +
      'reflexive pronouns (himself, themselves) appear in higher formula levels.',
  },
  [WordClass.CONJUNCTION]: {
    wordClass: WordClass.CONJUNCTION,
    label: 'Conjunction',
    colour: 'bg-yellow-400',
    definition: 'A conjunction is a joining word. It connects words, phrases or clauses.',
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
