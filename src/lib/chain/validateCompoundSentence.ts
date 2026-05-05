/**
 * PWP Daily Chain Practice — Compound / Complex Sentence Validator
 *
 * Validates a pupil's attempt to extend their anchor sentence with a conjunction
 * and a second clause, forming a compound or complex sentence.
 *
 * Rules (WriFe PWP Dev Spec §4):
 * - Conjunction must belong to the permitted set for this pupil's level.
 * - Right clause must contain at least one NOUN or PRONOUN AND one VERB.
 * - Punctuation:
 *     Coordinating: comma required before the conjunction.
 *     Subordinating (appended): comma NOT required (not enforced as hard gate).
 *     Subordinating (fronted): comma required after the subordinate clause.
 *   At W1–W3: punctuation is a soft warning only.
 *   At W4+:   strictPunctuation=true makes it a hard error.
 */

import { WordClass } from '../../types/index'
import type { ConjunctionType, CompoundValidationResult } from '../../types/index'
import { parseSentence } from './parseSentence'

// ─── Conjunction sets ─────────────────────────────────────────────────────────

export const COORDINATING_CONJUNCTIONS = ['and', 'but', 'or', 'so'] as const
export const SUBORDINATING_CONJUNCTIONS_BASIC = ['because', 'when', 'if'] as const
export const SUBORDINATING_CONJUNCTIONS_EXTENDED = [
  'although', 'since', 'after', 'before', 'while', 'unless',
] as const

export type CoordinatingConjunction = (typeof COORDINATING_CONJUNCTIONS)[number]
export type SubordinatingConjunctionBasic = (typeof SUBORDINATING_CONJUNCTIONS_BASIC)[number]
export type SubordinatingConjunctionExtended = (typeof SUBORDINATING_CONJUNCTIONS_EXTENDED)[number]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the ConjunctionType for a conjunction word, or null if not recognised. */
export function classifyConjunction(word: string): ConjunctionType | null {
  const lower = word.toLowerCase().trim()
  if ((COORDINATING_CONJUNCTIONS as readonly string[]).includes(lower)) return 'coordinating'
  if ((SUBORDINATING_CONJUNCTIONS_BASIC as readonly string[]).includes(lower)) return 'subordinating_basic'
  if ((SUBORDINATING_CONJUNCTIONS_EXTENDED as readonly string[]).includes(lower)) return 'subordinating_extended'
  return null
}

/** Returns all conjunctions valid for the given allowed types. */
export function permittedConjunctions(allowedTypes: ConjunctionType[]): string[] {
  const result: string[] = []
  if (allowedTypes.includes('coordinating')) result.push(...COORDINATING_CONJUNCTIONS)
  if (allowedTypes.includes('subordinating_basic')) result.push(...SUBORDINATING_CONJUNCTIONS_BASIC)
  if (allowedTypes.includes('subordinating_extended')) result.push(...SUBORDINATING_CONJUNCTIONS_EXTENDED)
  return result
}

// ─── Main validator ───────────────────────────────────────────────────────────

/**
 * Validate a compound or complex sentence extension.
 *
 * @param anchorSentence     The pupil's accepted formula sentence (left clause).
 * @param conjunction        The conjunction the pupil chose.
 * @param secondClause       The pupil's typed right clause (no conjunction prefix).
 * @param allowedTypes       Which conjunction types are permitted for this pupil.
 * @param strictPunctuation  W4+: treat missing comma as hard error, not soft warning.
 */
export function validateCompoundSentence(
  anchorSentence: string,
  conjunction: string,
  secondClause: string,
  allowedTypes: ConjunctionType[],
  strictPunctuation: boolean = false,
): CompoundValidationResult {
  const trimmedConj = conjunction.trim().toLowerCase()
  const trimmedClause = secondClause.trim()

  // ── Guard: empty second clause ──────────────────────────────────────────────
  if (!trimmedClause) {
    return {
      accepted: false,
      compoundSentence: null,
      conjunctionType: null,
      conjunction: null,
      errorMessage: 'Please type your second clause before checking.',
      warning: null,
    }
  }

  // ── Guard: conjunction must be recognised ───────────────────────────────────
  const conjType = classifyConjunction(trimmedConj)
  if (!conjType) {
    return {
      accepted: false,
      compoundSentence: null,
      conjunctionType: null,
      conjunction: null,
      errorMessage: `"${conjunction}" is not a recognised joining word. Try: ${permittedConjunctions(allowedTypes).join(', ')}.`,
      warning: null,
    }
  }

  // ── Guard: conjunction must be in the allowed set ───────────────────────────
  if (!allowedTypes.includes(conjType)) {
    const allowed = permittedConjunctions(allowedTypes)
    return {
      accepted: false,
      compoundSentence: null,
      conjunctionType: conjType,
      conjunction: trimmedConj,
      errorMessage: `"${conjunction}" is not available at your current level. Choose from: ${allowed.join(', ')}.`,
      warning: null,
    }
  }

  // ── Parse second clause: check NOUN/PRONOUN + VERB minimum ─────────────────
  const parsed = parseSentence(trimmedClause)
  const classes = parsed.map((p) => p.wordClass)
  const hasSubject = classes.includes(WordClass.NOUN) || classes.includes(WordClass.PRONOUN)
  const hasVerb = classes.includes(WordClass.VERB)

  if (!hasSubject) {
    return {
      accepted: false,
      compoundSentence: null,
      conjunctionType: conjType,
      conjunction: trimmedConj,
      errorMessage: 'Your second part needs a naming word (noun or pronoun) — who or what is doing something?',
      warning: null,
    }
  }

  if (!hasVerb) {
    return {
      accepted: false,
      compoundSentence: null,
      conjunctionType: conjType,
      conjunction: trimmedConj,
      errorMessage: 'Your second part needs a doing word (verb) — what is happening?',
      warning: null,
    }
  }

  // ── Build the full compound sentence ────────────────────────────────────────
  // Strip trailing punctuation from anchor so we can re-punctuate correctly.
  const anchorBase = anchorSentence.replace(/[.!?]+$/, '').trim()
  // Capitalise first letter of second clause
  const clauseCapitalised =
    trimmedClause.charAt(0).toUpperCase() + trimmedClause.slice(1)
  // Strip trailing punctuation from clause; we'll add a full stop at the end
  const clauseBase = clauseCapitalised.replace(/[.!?]+$/, '').trim()

  let fullSentence: string
  let warning: string | null = null

  if (conjType === 'coordinating') {
    // Compound: "Anchor, conjunction second clause."
    const hasCommaBeforeConj = anchorBase.endsWith(',') ||
      new RegExp(`,\\s*$`).test(anchorBase)

    if (!hasCommaBeforeConj) {
      const missingCommaMsg =
        `Remember to put a comma before "${trimmedConj}" in a compound sentence.`
      if (strictPunctuation) {
        return {
          accepted: false,
          compoundSentence: null,
          conjunctionType: conjType,
          conjunction: trimmedConj,
          errorMessage: missingCommaMsg,
          warning: null,
        }
      }
      warning = missingCommaMsg
    }
    fullSentence = `${anchorBase}, ${trimmedConj} ${clauseBase}.`
  } else {
    // Complex: subordinating conjunction — appended form "Anchor because clause."
    // We accept fronted form too but don't enforce it here.
    fullSentence = `${anchorBase} ${trimmedConj} ${clauseBase}.`
    // Soft tip: contractions
    if (/'\w+/.test(trimmedClause)) {
      warning = "Try to write words out in full instead of using contractions (e.g. \"do not\" instead of \"don't\")."
    }
  }

  return {
    accepted: true,
    compoundSentence: fullSentence,
    conjunctionType: conjType,
    conjunction: trimmedConj,
    errorMessage: null,
    warning,
  }
}
