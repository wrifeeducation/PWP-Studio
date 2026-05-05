/**
 * PWP Daily Chain Practice — Client-Side Sentence Validator
 *
 * Validates a pupil's typed sentence against the expected CL formula.
 * Returns a result indicating acceptance, which token(s) are wrong, and
 * a plain-English hint naming the missing or extra word class.
 *
 * Design principles (WriFe PWP Dev Spec §3.3):
 * - Check WORD CLASS COUNT, not raw word count
 *   "is walking" = one VERB slot (parseSentence merges it before we see it)
 * - Error messages name the missing/extra class:
 *   "Your sentence has 4 word classes. This formula needs 6:
 *    determiner · adjective · noun · verb · adverb · preposition."
 * - Strict positional matching: every slot must match
 * - Contractions flagged as soft warning (not hard error) at early levels
 * - Plural/proper nouns valid in NOUN slots
 * - CL11 (freeArrangement) passes any valid sentence — no pattern check
 */

import { WordClass } from '../../types/index'
import type { ChainFormulaDefinition } from './formulaDefinitions'
import { patternToNames } from './formulaDefinitions'
import { parseSentence } from './parseSentence'

// ─── Result types ─────────────────────────────────────────────────────────────

export interface TokenResult {
  /** The pupil's word(s) as typed (may be a merged phrase e.g. "is walking") */
  word: string
  /** What the tagger assigned */
  assigned: WordClass
  /** What the formula expected at this position */
  expected: WordClass
  /** Whether this position matched */
  correct: boolean
}

export interface ChainValidationResult {
  /** True = sentence accepted and matches the formula */
  accepted: boolean
  /** One result per word-class slot (after verb-phrase merging) */
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
 * Validate a pupil's sentence against a CL formula.
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

  // ── CL11 free-arrangement: accept any non-empty sentence ────────────────────
  if (formula.freeArrangement) {
    const hasContraction = /'\w+/.test(trimmed)
    return {
      accepted: true,
      tokens: [],
      errorMessage: null,
      warning: hasContraction
        ? "Try to avoid contractions (like \"don't\" or \"it's\") — write the words out in full."
        : null,
    }
  }

  // ── Soft warning: contractions ───────────────────────────────────────────────
  const hasContraction = /'\w+/.test(trimmed)
  const warning = hasContraction
    ? "Try to avoid contractions (like \"don't\" or \"it's\") — write the words out in full."
    : null

  // ── Parse the sentence (verb phrases already merged into single VERB slots) ──
  const parsed = parseSentence(trimmed, subjectNoun)
  const pattern = formula.pattern
  const requiredCount = formula.wordClassCount

  // ── Guard: wrong word-class count ───────────────────────────────────────────
  // Compare slot count (post-merge) against the formula's required count.
  // "is walking" counts as 1, not 2.
  if (parsed.length !== requiredCount) {
    const diff = parsed.length - requiredCount
    const direction = diff > 0 ? 'too many' : 'too few'
    const abs = Math.abs(diff)
    const msg =
      `Your sentence has ${parsed.length} word class${parsed.length !== 1 ? 'es' : ''}. ` +
      `CL${formula.level} needs exactly ${requiredCount}: ${patternToNames(pattern)}. ` +
      `You have ${direction} — try ${diff > 0 ? 'removing' : 'adding'} ${abs} word class${abs !== 1 ? 'es' : ''}.`

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
    // Correct if it matches the primary expected class OR any listed alternative
    const alts = formula.alternatives?.[i] ?? []
    const correct = assigned === expected || alts.includes(assigned)
    return { word: p.token.raw, assigned, expected, correct }
  })

  const firstWrong = tokens.find((t) => !t.correct)

  if (!firstWrong) {
    return { accepted: true, tokens, errorMessage: null, warning }
  }

  // ── Build a named error message ──────────────────────────────────────────────
  const wrongPos = tokens.indexOf(firstWrong) + 1 // 1-based for pupil
  const errorMessage =
    `Slot ${wrongPos}: "${firstWrong.word}" looks like a ${WC_NAMES[firstWrong.assigned]}, ` +
    `but CL${formula.level} needs a ${WC_NAMES[firstWrong.expected]} here. ` +
    `Full pattern: ${patternToNames(pattern)}.`

  return { accepted: false, tokens, errorMessage, warning }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if the two sentences are effectively the same
 * (used to prevent pupils resubmitting without changes).
 */
export function sentencesAreSame(a: string, b: string): boolean {
  const normalise = (s: string) =>
    s.toLowerCase().replace(/[.,!?;:'"]/g, '').replace(/\s+/g, ' ').trim()
  return normalise(a) === normalise(b)
}
