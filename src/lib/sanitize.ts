/**
 * WF-055 — Text Sanitization
 * Strips HTML tags and limits to 10,000 chars.
 * Applied to all user-generated text before saving.
 */

const MAX_LENGTH = 10_000

/**
 * Strips HTML tags and limits text to 10,000 characters.
 */
export function sanitizeText(input: string): string {
  // Remove HTML/XML tags
  const stripped = input.replace(/<[^>]*>/g, '')
  // Trim whitespace
  const trimmed = stripped.trim()
  // Enforce max length
  return trimmed.slice(0, MAX_LENGTH)
}
