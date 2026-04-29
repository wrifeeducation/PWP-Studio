/**
 * Unit tests for masteryEngine.ts
 * Verifies score tracking, rolling averages, gate detection, and scaffold stage logic.
 */

import { describe, it, expect } from 'vitest'
import {
  extractScores,
  rollingAverage,
  allAboveThreshold,
  computeMasteryUpdate,
  computeNextScaffoldStage,
} from '../masteryEngine'
import type { MasteryTracking } from '../../types/index'

// ─── helpers ──────────────────────────────────────────────────────────────────

const makeMastery = (scores: (number | null)[]): Partial<MasteryTracking> => ({
  session_1_score: scores[0] ?? null,
  session_2_score: scores[1] ?? null,
  session_3_score: scores[2] ?? null,
  session_4_score: scores[3] ?? null,
  session_5_score: scores[4] ?? null,
  session_6_score: scores[5] ?? null,
  session_7_score: scores[6] ?? null,
  sessions_completed: scores.filter((s) => s !== null).length,
  gate_passed: false,
  fast_track_eligible: false,
  consolidation_required: false,
})

// ─── extractScores ────────────────────────────────────────────────────────────

describe('extractScores', () => {
  it('extracts all non-null scores in order', () => {
    expect(extractScores(makeMastery([75, 80, 78, null, null, null, null]))).toEqual([75, 80, 78])
  })

  it('returns empty array for a fresh pupil', () => {
    expect(extractScores(makeMastery([null, null, null, null, null, null, null]))).toEqual([])
  })

  it('handles a full session window', () => {
    expect(extractScores(makeMastery([60, 65, 70, 75, 80, 85, 90]))).toEqual([60, 65, 70, 75, 80, 85, 90])
  })
})

// ─── rollingAverage ───────────────────────────────────────────────────────────

describe('rollingAverage', () => {
  it('returns null for empty scores', () => {
    expect(rollingAverage([], 3)).toBeNull()
  })

  it('averages the last N scores', () => {
    expect(rollingAverage([60, 70, 80, 90], 3)).toBe(80) // avg of [70,80,90]
  })

  it('uses all scores if fewer than window size', () => {
    expect(rollingAverage([60, 80], 3)).toBe(70)
  })

  it('rounds to nearest integer', () => {
    expect(rollingAverage([71, 72], 2)).toBe(72) // 71.5 rounds to 72
  })
})

// ─── allAboveThreshold ────────────────────────────────────────────────────────

describe('allAboveThreshold', () => {
  it('returns false if not enough scores', () => {
    expect(allAboveThreshold([80, 85], 3, 70)).toBe(false)
  })

  it('returns true when all last-N scores meet threshold', () => {
    expect(allAboveThreshold([60, 80, 85, 90], 3, 80)).toBe(true)
  })

  it('returns false if any score in the window is below threshold', () => {
    expect(allAboveThreshold([90, 90, 79], 3, 80)).toBe(false)
  })
})

// ─── computeMasteryUpdate — core session tracking ─────────────────────────────

describe('computeMasteryUpdate', () => {
  it('records the first session score in slot 1', () => {
    const result = computeMasteryUpdate(null, 75)
    expect(result.session_1_score).toBe(75)
    expect(result.sessions_completed).toBe(1)
  })

  it('appends subsequent sessions to the next slot', () => {
    const existing = makeMastery([75, 80, null, null, null, null, null])
    const result = computeMasteryUpdate(existing, 65)
    expect(result.session_1_score).toBe(75)
    expect(result.session_2_score).toBe(80)
    expect(result.session_3_score).toBe(65)
    expect(result.sessions_completed).toBe(3)
  })

  it('rolls over oldest score once window is full (max 7 slots)', () => {
    const existing = makeMastery([50, 55, 60, 65, 70, 75, 80])
    const result = computeMasteryUpdate(existing, 90)
    // Oldest (50) drops off; 90 appended
    expect(result.session_1_score).toBe(55)
    expect(result.session_7_score).toBe(90)
    expect(result.sessions_completed).toBe(7)
  })

  it('gate passes when 3-session rolling average reaches 70', () => {
    // Sessions: 75, 80, 78 → avg = 77.7 → gate should pass
    const after2 = computeMasteryUpdate(makeMastery([75, null, null, null, null, null, null]), 80)
    expect(after2.gate_passed).toBe(false) // only 2 sessions
    const after3 = computeMasteryUpdate(makeMastery([75, 80, null, null, null, null, null]), 78)
    expect(after3.gate_passed).toBe(true)  // avg 77.7 ≥ 70
  })

  it('gate does not pass when average is below 70', () => {
    // Sessions: 50, 60, 65 → avg = 58.3 → gate should not pass
    const result = computeMasteryUpdate(makeMastery([50, 60, null, null, null, null, null]), 65)
    expect(result.gate_passed).toBe(false)
  })

  it('gate_passed is sticky — never reverts once set', () => {
    const existingWithGate = { ...makeMastery([80, 80, 80, null, null, null, null]), gate_passed: true }
    const result = computeMasteryUpdate(existingWithGate, 20) // terrible new score
    expect(result.gate_passed).toBe(true) // still true — gate never reverts
  })

  it('consolidation_required flags when rolling average falls below 50', () => {
    // Sessions: 40, 45, 48 → avg = 44.3 → below 50
    const result = computeMasteryUpdate(makeMastery([40, 45, null, null, null, null, null]), 48)
    expect(result.consolidation_required).toBe(true)
  })

  it('fast_track_eligible sets when 3 consecutive sessions hit 95+', () => {
    const result = computeMasteryUpdate(makeMastery([95, 96, null, null, null, null, null]), 98)
    expect(result.fast_track_eligible).toBe(true)
  })

  it('realistic pupil journey: Alex scores 75→80→78 and gates at session 3', () => {
    let mastery = computeMasteryUpdate(null, 75)
    expect(mastery.gate_passed).toBe(false)

    mastery = computeMasteryUpdate(mastery as Partial<MasteryTracking>, 80)
    expect(mastery.gate_passed).toBe(false)

    mastery = computeMasteryUpdate(mastery as Partial<MasteryTracking>, 78)
    expect(mastery.gate_passed).toBe(true)   // avg 77.7 — gate passed for teacher record
    expect(mastery.sessions_completed).toBe(3)
  })
})

// ─── scaffold stages ──────────────────────────────────────────────────────────

describe('computeNextScaffoldStage', () => {
  it('auto-advances from stage 1 to 2 after 3 sessions', () => {
    expect(computeNextScaffoldStage(1, [70, 80, 75])).toBe(2)
    expect(computeNextScaffoldStage(1, [70, 80])).toBe(1) // only 2 sessions
  })

  it('advances from stage 2 to 3 when 2 of last 3 sessions score ≥75', () => {
    expect(computeNextScaffoldStage(2, [60, 75, 80])).toBe(3)
    expect(computeNextScaffoldStage(2, [60, 65, 70])).toBe(2) // none ≥75
  })

  it('advances from stage 3 to 4 when last 2 sessions both ≥85', () => {
    expect(computeNextScaffoldStage(3, [70, 85, 90])).toBe(4)
    expect(computeNextScaffoldStage(3, [90, 84])).toBe(3) // 84 < 85
  })

  it('never goes above stage 4', () => {
    expect(computeNextScaffoldStage(4, [100, 100, 100])).toBe(4)
  })
})
