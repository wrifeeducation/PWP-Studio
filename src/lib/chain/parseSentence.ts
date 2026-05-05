/**
 * PWP Daily Chain Practice — Rule-Based POS Tagger
 *
 * Tags each token in a pupil's sentence with a WordClass.
 * Designed for CL1–CL11 patterns. Uses:
 *   1. Closed-class word lists (determiners, prepositions, conjunctions, pronouns)
 *   2. A broad common-verb lookup including inflected forms
 *   3. Morphological rules (-ly adverbs, -ed/-ing/-s verb suffixes)
 *   4. Optional subject-noun hint: if we know the pupil's chosen subject, words
 *      matching it (or its plural/singular form) are classified as nouns first.
 *
 * Returns one WordClass per token. Unknown words default to NOUN (most common
 * open-class word pupils use in early sentences).
 *
 * Not a full NLP system — designed to handle the specific vocabulary range
 * at CL1–CL11 with high accuracy.
 *
 * CL8/CL10 verb phrase rule:
 * "is walking", "are walking", "was running", "will run" etc. are treated as
 * a SINGLE VERB slot. parseSentence merges auxiliary+main-verb bigrams before
 * returning, so the array length matches the word-class count in the formula.
 */

import { WordClass } from '../../types/index'

// ─── Closed-class word lists ──────────────────────────────────────────────────

const DETERMINERS = new Set([
  'the', 'a', 'an', 'this', 'that', 'these', 'those',
  'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'some', 'any', 'every', 'each', 'no', 'all', 'both',
  'few', 'many', 'much', 'more', 'most', 'other', 'another',
  'either', 'neither', 'several', 'enough', 'what', 'which', 'whose',
])

const PREPOSITIONS = new Set([
  'about', 'above', 'across', 'after', 'against', 'along', 'amid',
  'among', 'around', 'at', 'before', 'behind', 'below', 'beneath',
  'beside', 'between', 'beyond', 'by', 'despite', 'down', 'during',
  'except', 'for', 'from', 'in', 'inside', 'into', 'like',
  'near', 'of', 'off', 'on', 'onto', 'out', 'outside', 'over',
  'past', 'since', 'through', 'throughout', 'to', 'toward', 'towards',
  'under', 'underneath', 'until', 'unto', 'up', 'upon', 'via',
  'with', 'within', 'without',
])

const CONJUNCTIONS = new Set([
  'and', 'but', 'or', 'nor', 'for', 'yet', 'so',
  'although', 'because', 'since', 'unless', 'until', 'while',
  'when', 'whenever', 'where', 'wherever', 'whether', 'if',
  'though', 'even', 'after', 'before', 'as', 'than', 'that',
])

const PRONOUNS = new Set([
  'i', 'me', 'my', 'mine', 'myself',
  'you', 'your', 'yours', 'yourself',
  'he', 'him', 'his', 'himself',
  'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself',
  'we', 'us', 'our', 'ours', 'ourselves',
  'they', 'them', 'their', 'theirs', 'themselves',
  'who', 'whom', 'whose', 'which', 'that',
  'this', 'that', 'these', 'those',
  'one', 'anyone', 'everyone', 'someone', 'nobody', 'somebody', 'everybody',
  'nothing', 'something', 'everything', 'anything',
])

// ─── Common verbs (base + inflected forms used in L1–L10 word banks) ─────────

const COMMON_VERBS = new Set([
  // base forms
  'be', 'have', 'do', 'say', 'get', 'make', 'go', 'know', 'take', 'see',
  'come', 'think', 'look', 'want', 'give', 'use', 'find', 'tell', 'ask',
  'work', 'seem', 'feel', 'try', 'leave', 'call', 'keep', 'let', 'begin',
  'show', 'hear', 'play', 'run', 'move', 'live', 'believe', 'hold', 'bring',
  'happen', 'write', 'provide', 'sit', 'stand', 'lose', 'pay', 'meet',
  'include', 'continue', 'set', 'learn', 'change', 'lead', 'understand',
  'watch', 'follow', 'stop', 'create', 'speak', 'read', 'spend', 'grow',
  'open', 'walk', 'win', 'offer', 'remember', 'love', 'consider', 'appear',
  'buy', 'wait', 'serve', 'die', 'send', 'build', 'stay', 'fall', 'cut',
  'reach', 'kill', 'remain', 'suggest', 'raise', 'pass', 'sell', 'require',
  'report', 'decide', 'pull', 'break', 'represent', 'pick', 'carry', 'throw',
  // Modal / auxiliary verbs (needed for L11 future tense: "will soar", "shall rise")
  'will', 'shall', 'would', 'could', 'should', 'might', 'must', 'may', 'can',
  // L1–L10 DB word bank verbs
  'ran', 'sat', 'flew', 'swam', 'barked', 'slept', 'jumped', 'walked',
  'fell', 'grew', 'shone', 'stood',
  'soared', 'prowled', 'leaped', 'dived', 'hunted', 'roamed', 'circled',
  'charged', 'glided', 'pounced', 'lurked', 'sprinted',
  'roared', 'flowed', 'raged', 'twisted', 'rose', 'glowed', 'crashed',
  'swirled', 'erupted',
  // base + 3rd-person present of L1–L10 word bank verbs missing from above
  'run', 'sit', 'fly', 'swim', 'bark', 'sleep', 'jump', 'walk',
  'fall', 'grow', 'shine', 'stand',
  'soar', 'prowl', 'prowls', 'leap', 'leaps', 'dart', 'darts',
  'hunt', 'roam', 'roams', 'circle', 'circles',
  'charge', 'charges', 'pounce', 'pounces', 'lurk', 'sprint', 'sprints',
  'roar', 'roars', 'flow', 'rage', 'rages', 'twist', 'rise', 'rises',
  'glow', 'glows', 'crash', 'crashes', 'swirl', 'swirls', 'erupt', 'erupts',
  'search', 'searches', 'travel', 'travels', 'climb', 'discover', 'discovers',
  'invent', 'invents', 'explore', 'explores',
  'glisten', 'glistens', 'shimmer', 'shimmers', 'collapse', 'emerge',
  'plunge', 'plunges', 'drift', 'surge', 'tremble', 'vanish', 'vanishes',
  'chase', 'chases', 'shatter', 'shatters',
  'searched', 'travelled', 'climbed', 'discovered', 'invented', 'explored',
  'glistened', 'shimmered', 'collapsed', 'emerged', 'plunged', 'drifted',
  'surged', 'trembled', 'vanished',
  'chased', 'shattered',
  // L11–L30 DB word bank verbs (irregular / not caught by -ed/-ing rules)
  'shook', 'shakes', 'shake',
  'howl', 'howls', 'howled',
  'swoop', 'swoops', 'swooped',
  'march', 'marches', 'marched',
  'ruled', 'rules', 'rule',
  'glided', 'constructed', 'constructs', 'construct',
  'believed', 'believes', 'believe',
  'worked', 'works',
  'followed', 'follows',
  'invented', 'invented',
  'flew', 'fallen',
  // present-tense third-person -s forms from DB
  'soars', 'whispers', 'thunders', 'collapses', 'emerges', 'plunges',
  'drifts', 'glides', 'surges', 'trembles', 'vanishes',
  // common pupil choices
  'swim', 'swims', 'run', 'runs', 'fly', 'flies', 'jump', 'jumps',
  'eat', 'eats', 'sleep', 'sleeps', 'play', 'plays', 'sing', 'sings',
  'dance', 'dances', 'climb', 'climbs', 'dive', 'dives', 'howl', 'howls',
  'growl', 'growls', 'roar', 'breathe', 'breathes', 'hunt', 'hunts',
  'creep', 'creeps', 'lurk', 'lurks', 'shine', 'shines', 'flow', 'flows',
  'twist', 'twists', 'thunder', 'whisper', 'glide', 'soar',
])

// ─── Common adjectives (used in L1–L10 word banks) ────────────────────────────

const COMMON_ADJECTIVES = new Set([
  'big', 'small', 'red', 'blue', 'green', 'yellow', 'happy', 'sad',
  'fast', 'slow', 'hot', 'cold', 'wet', 'dry', 'tall', 'short',
  'long', 'wide', 'narrow', 'bright', 'dark', 'loud', 'quiet',
  'smooth', 'rough', 'soft', 'hard', 'sweet', 'bitter', 'strong', 'weak',
  'enormous', 'tiny', 'ancient', 'modern', 'gleaming', 'mysterious',
  'fearless', 'gentle', 'towering', 'delicate', 'fierce', 'elegant',
  'peculiar', 'magnificent', 'brave', 'curious', 'powerful', 'silent',
  'beautiful', 'wonderful', 'terrible', 'amazing', 'incredible', 'huge',
  'little', 'great', 'good', 'bad', 'old', 'young', 'new', 'high', 'low',
  'deep', 'shallow', 'thick', 'thin', 'heavy', 'light', 'clear', 'cloudy',
  'golden', 'silver', 'grey', 'white', 'black', 'purple', 'orange',
  'proud', 'angry', 'scared', 'tired', 'hungry', 'wild', 'calm', 'sharp',
  // L11–L30 additional adjectives
  'hidden', 'fearless', 'vast', 'torn', 'brave', 'swift', 'wise',
  'mysterious', 'towering', 'magnificent', 'ancient', 'gleaming', 'glowing',
])

// ─── Auxiliary verbs — used for verb-phrase detection ─────────────────────────
// These are the words that begin a continuous/future verb phrase.
// When followed by a main verb (-ing form or base form), they merge into 1 slot.

const AUXILIARIES = new Set([
  'is', 'are', 'was', 'were', 'am',         // continuous/passive
  'will', 'shall', 'would', 'could', 'should', 'might', 'must', 'may', 'can',
  'have', 'has', 'had', 'do', 'does', 'did', // perfect/emphatic
  'been', 'being',
])

// ─── Common adverbs (besides -ly words) ──────────────────────────────────────

const COMMON_ADVERBS = new Set([
  'very', 'too', 'quite', 'rather', 'extremely', 'really', 'so',
  'just', 'already', 'still', 'even', 'often', 'always', 'never',
  'sometimes', 'soon', 'now', 'here', 'there', 'away', 'back',
  'far', 'fast', 'hard', 'high', 'late', 'long', 'low', 'near',
  'right', 'straight', 'wrong', 'well',
  // common -ly adverbs also in the DB word banks
  'bravely', 'carefully', 'quickly', 'slowly', 'quietly', 'loudly',
  'eagerly', 'gently', 'boldly', 'silently', 'swiftly', 'fiercely',
  'gracefully', 'suddenly', 'brilliantly', 'cautiously',
  // L11–L30 additional adverbs
  'mysteriously', 'powerfully', 'endlessly', 'magnificently',
])

// ─── Tokeniser ────────────────────────────────────────────────────────────────

/** Strip punctuation and split into lowercase tokens, preserving original forms */
export interface Token {
  /** Raw form as the pupil typed it */
  raw: string
  /** Normalised for lookup */
  lower: string
}

export function tokenise(sentence: string): Token[] {
  return sentence
    .replace(/[.,!?;:'"()\-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((t) => ({ raw: t, lower: t.toLowerCase() }))
}

// ─── POS tagger ───────────────────────────────────────────────────────────────

/**
 * Tag a single token with the most likely word class.
 *
 * @param token    The token to classify
 * @param position 0-based position in the sentence (used for capitalisation cue)
 * @param subjectNoun  Optional: the pupil's chosen subject noun (lowercased)
 */
export function tagToken(
  token: Token,
  _position: number,
  subjectNoun?: string,
): WordClass {
  const w = token.lower

  // 1. Contractions — classify as the dominant class of the first part
  if (w.includes("'")) {
    if (['it\'s', 'he\'s', 'she\'s', 'that\'s', 'who\'s', 'what\'s'].includes(w)) {
      return WordClass.PRONOUN
    }
    return WordClass.VERB // can't, won't, don't, isn't, etc.
  }

  // 2. Subject noun hint — if we know the pupil's subject, words matching it are nouns
  if (subjectNoun) {
    const subjectLower = subjectNoun.toLowerCase()
    if (
      w === subjectLower ||
      w === subjectLower + 's' ||
      (subjectLower.endsWith('s') && w === subjectLower.slice(0, -1))
    ) {
      return WordClass.NOUN
    }
  }

  // 3. Closed-class lookups (highest confidence)
  if (DETERMINERS.has(w)) return WordClass.DETERMINER
  if (PREPOSITIONS.has(w)) return WordClass.PREPOSITION
  if (CONJUNCTIONS.has(w)) return WordClass.CONJUNCTION
  if (PRONOUNS.has(w)) return WordClass.PRONOUN

  // 4. Verb lookup (before adverbs in case of overlap)
  if (COMMON_VERBS.has(w)) return WordClass.VERB

  // 5. Morphological verb rules
  if (w.endsWith('ing') && w.length > 4) return WordClass.VERB // swimming, running
  if (w.endsWith('ed') && w.length > 3) return WordClass.VERB  // walked, jumped
  if (w.endsWith('ies') && w.length > 4) return WordClass.VERB // flies, cries

  // 6. Adverb lookup + -ly morphology
  if (COMMON_ADVERBS.has(w)) return WordClass.ADVERB
  if (w.endsWith('ly') && w.length > 3) return WordClass.ADVERB

  // 7. Adjective lookup
  if (COMMON_ADJECTIVES.has(w)) return WordClass.ADJECTIVE

  // 8. Default: noun (most common open-class word at these formula levels)
  return WordClass.NOUN
}

/**
 * POS-tag an entire sentence, returning a WordClass for each token.
 * Verb phrases (auxiliary + main verb) are merged into a single VERB token.
 *
 * @param sentence     The pupil's typed sentence
 * @param subjectNoun  Optional: the session subject noun (aids classification)
 * @returns            Array of { token, wordClass } pairs
 */
export function parseSentence(
  sentence: string,
  subjectNoun?: string,
): Array<{ token: Token; wordClass: WordClass }> {
  const rawTokens = tokenise(sentence)
  const tagged = rawTokens.map((token, i) => ({
    token,
    wordClass: tagToken(token, i, subjectNoun),
  }))

  // ── Verb-phrase merging ──────────────────────────────────────────────────────
  // Scan for [AUXILIARY, VERB] bigrams and merge into a single VERB slot.
  // The merged token's `raw` value is "aux main" (e.g. "is walking").
  // This ensures word-class count matches the formula's slot count for CL8/CL10.
  const merged: Array<{ token: Token; wordClass: WordClass }> = []
  let i = 0
  while (i < tagged.length) {
    const current = tagged[i]
    const next = tagged[i + 1]

    // Detect auxiliary + main-verb bigram
    if (
      current.wordClass === WordClass.VERB &&
      AUXILIARIES.has(current.token.lower) &&
      next &&
      next.wordClass === WordClass.VERB &&
      !AUXILIARIES.has(next.token.lower)
    ) {
      // Merge into a single VERB token
      const mergedToken: Token = {
        raw: `${current.token.raw} ${next.token.raw}`,
        lower: `${current.token.lower} ${next.token.lower}`,
      }
      merged.push({ token: mergedToken, wordClass: WordClass.VERB })
      i += 2 // skip both tokens
    } else {
      merged.push(current)
      i++
    }
  }

  return merged
}
