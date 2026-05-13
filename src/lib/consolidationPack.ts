/**
 * WF-032: Consolidation Pack Generator.
 * Generates targeted practice packs for pupils who need consolidation.
 */

import { supabase } from './supabase'
import type { WordClass } from '../types/index'

export interface ConsolidationPackData {
  pupilId: string
  levelId: number
  focusWordClass: WordClass
  practiceSentences: string[]
  tips: string[]
  generatedAt: Date
}

/** Tips indexed by word class */
const WORD_CLASS_TIPS: Record<string, string[]> = {
  determiner: [
    'Determiners come before nouns — words like "a", "the", "this", "every", "some".',
    'Check that your determiner matches the noun (e.g., "an apple" not "a apple").',
  ],
  adjective: [
    'Adjectives describe nouns — place them before the noun or after "is/was".',
    'Try using a more specific adjective: instead of "big", try "enormous" or "towering".',
  ],
  noun: [
    'Nouns name people, places, things, or ideas. Can you add an adjective before it?',
    'Check whether the noun is singular or plural — does your verb agree?',
  ],
  verb: [
    'Verbs show action or state. Make sure your verb tense matches the rest of your sentence.',
    'Try a more precise verb: instead of "went", consider "dashed", "crept", or "soared".',
  ],
  adverb: [
    'Adverbs often end in -ly and tell us how, when, or where an action happens.',
    'Place the adverb near the verb it modifies for the clearest effect.',
  ],
  preposition: [
    'Prepositions show relationships — position (under, above), time (before, after), direction (towards).',
    'Try varying your prepositions: instead of "in", could you use "beneath" or "within"?',
  ],
  pronoun: [
    'Pronouns replace nouns to avoid repetition. Make sure the pronoun is clear — who does "it" or "they" refer to?',
    'Check subject/object forms: "I/me", "he/him", "she/her", "they/them".',
  ],
  conjunction: [
    'Conjunctions join ideas — coordinating (and, but, or) or subordinating (because, although, when).',
    'Using a subordinating conjunction (because, although) can make your sentences more complex.',
  ],
}

const DEFAULT_TIPS = [
  'Read your sentence aloud to check it sounds right.',
  'Ask yourself: does this sentence make sense to a reader who knows nothing about the topic?',
]

/**
 * Generates a consolidation pack for a pupil at a specific formula level.
 * Fetches the last 5 sessions, identifies the most common error word class,
 * and returns practice sentences and tips.
 */
export async function generateConsolidationPack(
  pupilId: string,
  levelId: number,
  errorPattern: string
): Promise<ConsolidationPackData> {
  // Fetch the last 5 formula sessions for this pupil at this level
  const { data: sessions } = await supabase
    .from('formula_sessions')
    .select('*')
    .eq('pupil_id', pupilId)
    .eq('level_id', levelId)
    .order('created_at', { ascending: false })
    .limit(5)

  // Fetch the formula level's elements + word banks for practice sentences
  const { data: levelData } = await supabase
    .from('formula_levels')
    .select('formula_elements, word_banks, subject_rotation_bank')
    .eq('id', levelId)
    .single()

  // Determine focus word class from error pattern or sessions
  let focusWordClass = (errorPattern as WordClass) || WordClass_FALLBACK

  // Build practice sentences from the level's formula_elements examples
  const practiceSentences: string[] = []
  if (levelData?.formula_elements) {
    const elements = levelData.formula_elements as Array<{
      position: number
      word_class: string
      instruction: string
      example: string
    }>

    // Generate up to 5 example sentences using the example words
    const subjectBank: string[] = (levelData.subject_rotation_bank as string[]) ?? ['The dog', 'A bird', 'The cat']
    for (let i = 0; i < Math.min(5, subjectBank.length + 2); i++) {
      const sentence = elements
        .sort((a, b) => a.position - b.position)
        .map((el) => el.example)
        .join(' ')
      if (sentence.trim() && !practiceSentences.includes(sentence)) {
        practiceSentences.push(sentence)
      }

      // Vary sentences using word bank words
      if (levelData.word_banks && i > 0) {
        const variedParts = elements
          .sort((a, b) => a.position - b.position)
          .map((el) => {
            const bankWords: string[] = (levelData.word_banks as Record<string, string[]>)[el.word_class] ?? []
            return bankWords[i % bankWords.length] ?? el.example
          })
        const varied = variedParts.join(' ')
        if (varied.trim() && !practiceSentences.includes(varied)) {
          practiceSentences.push(varied)
        }
      }
    }
  }

  // Fallback if no sentences were built
  if (practiceSentences.length === 0) {
    practiceSentences.push(
      'The quick fox jumps over the lazy dog.',
      'A small bird sat quietly on the old fence.',
      'Every morning, the children walked slowly through the park.'
    )
  }

  const tips: string[] = WORD_CLASS_TIPS[focusWordClass] ?? DEFAULT_TIPS

  // Suppress unused sessions variable if empty
  void sessions

  return {
    pupilId,
    levelId,
    focusWordClass: focusWordClass as WordClass,
    practiceSentences: practiceSentences.slice(0, 5),
    tips: tips.slice(0, 2),
    generatedAt: new Date(),
  }
}

// Fallback word class string (avoids circular import from types)
const WordClass_FALLBACK = 'noun'
