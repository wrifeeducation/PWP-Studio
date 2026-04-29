/**
 * Unit tests for progressionEngine.ts
 * Tests the core pupil advancement logic — no DB, no React, pure functions only.
 */

import { describe, it, expect } from 'vitest'
import {
  shouldAdvance,
  nextLevel,
  MIN_SESSIONS_TO_ADVANCE,
  isParagraphUnlocked,
  checkParagraphMasteryUnlock,
  didUnlockParagraph,
  isWritingStudioUnlocked,
} from '../progressionEngine'

// ─── shouldAdvance ────────────────────────────────────────────────────────────

describe('shouldAdvance — session-count model (Phase A)', () => {
  it('does not advance with 0 sessions', () => {
    expect(shouldAdvance({ sessions_completed: 0 })).toBe(false)
  })

  it('does not advance with 1 session', () => {
    expect(shouldAdvance({ sessions_completed: 1 })).toBe(false)
  })

  it('does not advance with 2 sessions', () => {
    expect(shouldAdvance({ sessions_completed: 2 })).toBe(false)
  })

  it(`advances at exactly ${MIN_SESSIONS_TO_ADVANCE} sessions`, () => {
    expect(shouldAdvance({ sessions_completed: MIN_SESSIONS_TO_ADVANCE })).toBe(true)
  })

  it('advances when sessions exceed the threshold', () => {
    expect(shouldAdvance({ sessions_completed: 10 })).toBe(true)
  })

  it('advances regardless of score — a pupil who scored 30% still moves on', () => {
    // The score is not part of shouldAdvance — progression is purely session-count
    expect(shouldAdvance({ sessions_completed: 3 })).toBe(true)
  })

  it('handles null/undefined sessions_completed gracefully', () => {
    // @ts-expect-error — testing runtime guard
    expect(shouldAdvance({ sessions_completed: null })).toBe(false)
    // @ts-expect-error
    expect(shouldAdvance({ sessions_completed: undefined })).toBe(false)
  })
})

// ─── nextLevel ────────────────────────────────────────────────────────────────

describe('nextLevel', () => {
  it('increments by 1 for normal progression', () => {
    expect(nextLevel(1, { fast_track_eligible: false })).toBe(2)
    expect(nextLevel(10, { fast_track_eligible: false })).toBe(11)
  })

  it('increments by 2 for fast-track pupils', () => {
    expect(nextLevel(1, { fast_track_eligible: true })).toBe(3)
    expect(nextLevel(10, { fast_track_eligible: true })).toBe(12)
  })

  it('never exceeds MAX_LEVEL (67)', () => {
    expect(nextLevel(67, { fast_track_eligible: false })).toBe(67)
    expect(nextLevel(66, { fast_track_eligible: true })).toBe(67) // 66+2 capped at 67
    expect(nextLevel(67, { fast_track_eligible: true })).toBe(67)
  })
})

// ─── paragraph unlock ─────────────────────────────────────────────────────────

describe('isParagraphUnlocked', () => {
  it('is locked below L4', () => {
    expect(isParagraphUnlocked(1)).toBe(false)
    expect(isParagraphUnlocked(3)).toBe(false)
  })

  it('unlocks at exactly L4', () => {
    expect(isParagraphUnlocked(4)).toBe(true)
  })

  it('remains unlocked above L4', () => {
    expect(isParagraphUnlocked(10)).toBe(true)
    expect(isParagraphUnlocked(67)).toBe(true)
  })
})

describe('checkParagraphMasteryUnlock — auto-unlocks at L4, no score gate', () => {
  it('unlocks at L4 regardless of gate_passed or levels_mastered', () => {
    expect(checkParagraphMasteryUnlock(4, false, 0)).toBe(true)
    expect(checkParagraphMasteryUnlock(4, true, 5)).toBe(true)
  })

  it('does not unlock below L4', () => {
    expect(checkParagraphMasteryUnlock(3, true, 99)).toBe(false)
  })
})

describe('didUnlockParagraph', () => {
  it('triggers when crossing L3→L4', () => {
    expect(didUnlockParagraph(3, 4)).toBe(true)
  })

  it('does not trigger when already at or above L4', () => {
    expect(didUnlockParagraph(4, 5)).toBe(false)
    expect(didUnlockParagraph(10, 11)).toBe(false)
  })

  it('does not trigger when staying below L4', () => {
    expect(didUnlockParagraph(1, 2)).toBe(false)
  })
})

// ─── writing studio ───────────────────────────────────────────────────────────

describe('isWritingStudioUnlocked', () => {
  it('unlocks at L35', () => {
    expect(isWritingStudioUnlocked(35, false)).toBe(true)
  })

  it('unlocks below L35 if teacher confirmed', () => {
    expect(isWritingStudioUnlocked(10, true)).toBe(true)
  })

  it('stays locked below L35 without teacher confirmation', () => {
    expect(isWritingStudioUnlocked(34, false)).toBe(false)
  })
})
