/**
 * PWP Daily Chain Practice — Client-Side Sentence Validator
 *
 * Validates a pupil's typed sentence against the expected formula pattern.
 * Returns a result indicating acceptance, which token(s) are wrong, and
 * a plain-English hint to show in the ValidationFeedback component.
 *
 * Design principles (from spec section 7):
 * - Strict matching: every position in the pattern must match
 * - Contractions are flagged as a hint (not a hard error) at early levels
 * - Plural subjects are valid: "Dolphins swim" = noun(plural) + verb = ✓
 * - Proper nouns are valid: "London stands" = noun + verb = ✓
 */

import { WordClass } from '../../types/index'
import type { ChainFormulaDefinition } from './formulaDefinitions'
import { parseSentence } from './parseSentence'

// ─── Result types ─────────────────────────────────────────────────────────────

export interface TokenResult {
  /** The pupil's word as typed */
  word: string
  /** What the tagger assigned */
  assigned: WordClass
  /** What the formula expected */
  expected: WordClass
  /** Whether this position matched */
  correct: boolean
}

export interface ChainValidationResult {
  /** True = sentence accepted and matches the formula */
  accepted: boolean
  /** One result per token position (may be shorter/longer than pattern) */
  tokens: TokenResult[]
  /** Human-readable error for the pupil, or null if accepted */
  errorMessage: string | null
  /** Soft warning (contractions etc.) — shown even when accepted */
  warning: string | null
}

// ─── Word class display names (for error messages) ────────────────────────────

const WC_NAMES: Record<WordClass, string> = {
  [WordClass.NOUN]:        'naming word (noun)',
  [WordClass.VERB]:        'doing word (verb)',
  [WordClass.ADJECTIVE]:   'describing word (adjective)',
  [WordClass.DETERMINER]:  'pointer word (the / a / my…)',
  [WordClass.ADVERB]:      'how/when word (adverb)',
  [WordClass.PREPOSITION]: 'position word (over / beneath…)',
  [WordClass.PRONOUN]:     'pronoun (I / she / they…)',
  [WordClass.CONJUNCTION]: 'joining word (and / but / because…)',
}

// ─── Main validator ───────────────────────────────────────────────────────────

/**
 * Validate a pupil's sentence against a formula pattern.
 *
 * @param sentence     The pupil's typed sentence (may include punctuation)
 * @param formula      The chain formula definition for this level
 * @param subjectNoun  The session subject noun (optional but improves accuracy)
 */
export function validateChainSentence(
  sentence: string,
  formula: ChainFormulaDefinition,
  subjectNoun?: string,
): ChainValidationResult {
  const trimmed = sentence.trim()

  // ── Guard: empty sentence ────────────────────────────────────────────────────
  if (!trimmed) {
    return {
      accepted: false,
      tokens: [],
      errorMessage: 'Please type your sentence before checking.',
      warning: null,
    }
  }

  // ── Soft warning: contractions ───────────────────────────────────────────────
  const hasContraction = /'\w+/.test(trimmed)
  const warning = hasContraction
    ? "Try to avoid contractions (like \"don't\" or \"it's\") in your formula sentences — write the words out in full."
    : null

  // ── Parse the sentence ───────────────────────────────────────────────────────
  const parsed = parseSentence(trimmed, subjectNoun)
  const pattern = formula.pattern

  // ── Guard: wrong number of words ─────────────────────────────────────────────
  if (parsed.length !== pattern.length) {
    const diff = parsed.length - pattern.length
    const msg =
      diff > 0
        ? `Your sentence has ${parsed.length} words but the L${formula.level} formula needs exactly ${pattern.length}. Try removing ${diff} word${diff > 1 ? 's' : ''}.`
        : `Your sentence has ${parsed.length} words but the L${formula.level} formula needs ${pattern.length}. Try adding ${Math.abs(diff)} more word${Math.abs(diff) > 1 ? 's' : ''}.`

    return {
      accepted: false,
      tokens: parsed.map((p, i) => ({
        word: p.token.raw,
        assigned: p.wordClass,
        expected: pattern[i] ?? p.wordClass,
        correct: false,
      })),
      errorMessage: msg,
      warning,
    }
  }

  // ── Compare each position ────────────────────────────────────────────────────
  const tokens: TokenResult[] = parsed.map((p, i) => {
    const expected = pattern[i]
    const assigned = p.wordClass
    const correct = assigned === expected
    return { word: p.token.raw, assigned, expected, correct }
  })

  const firstWrong = tokens.find((t) => !t.correct)

  if (!firstWrong) {
    return { accepted: true, tokens, errorMessage: null, warning }
  }

  // ── Build a helpful error message ────────────────────────────────────────────
  const wrongPos = tokens.indexOf(firstWrong) + 1 // 1-based for pupil
  const errorMessage =
    `"${firstWrong.word}" looks like a ${WC_NAMES[firstWrong.assigned]}, ` +
    `but position ${wrongPos} in the L${formula.level} formula needs a ${WC_NAMES[firstWrong.expected]}. ` +
    `Formula: ${formula.name}.`

  return { accepted: false, tokens, errorMessage, warning }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if the sentence is trivially a contraction-free version of
 * another sentence (used to prevent pupils resubmitting without changes).
 */
export function sentencesAreSame(a: string, b: string): boolean {
  const normalise = (s: string) =>
    s.toLowerCase().replace(/[.,!?;:'"]/g, '').replace(/\s+/g, ' ').trim()
  return normalise(a) === normalise(b)
}
