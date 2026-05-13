import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WordBankPhase, LevelTitle, AssessmentResult } from '@/types/pwp'

// ── Audio store — round-robin variant picker ──────────────────────────────────
interface AudioState {
  lastPlayed: Record<string, number>
  nextVariant: (category: string, count: number) => number
}

export const useAudioStore = create<AudioState>((set, get) => ({
  lastPlayed: {},
  nextVariant: (category, count) => {
    const last = get().lastPlayed[category] ?? -1
    const next = (last + 1) % count
    set(s => ({ lastPlayed: { ...s.lastPlayed, [category]: next } }))
    return next
  },
}))

// ── Session store — current step progress (not persisted; resets on tab close) ─
interface SessionState {
  // Current level/step being worked on
  activeLevelId: number | null
  activeStepId:  number | null
  activeStepIndex: number        // 0-based within current level
  totalStepsInLevel: number

  // Current attempt state
  lastSubmittedText: string
  attemptCount: number           // resets on each new step
  xpThisLevel: number

  // Feedback
  feedbackState: 'idle' | 'correct_first' | 'correct_retry' | 'needs_revision' | 'level_complete'
  lastAssessment: AssessmentResult | null

  // Word bank (Phase A/B tray state — not persisted)
  trayWords: string[]
  gapSlotValues: Record<string, string>   // label → typed value

  // Guidance panel
  guidancePanelOpen: boolean
  guidanceTabIndex: number       // 0=Remind, 1=Model, 2=Explain

  // One-time audio intro flags (persisted)
  wordBankIntroPlayed: boolean
  gapSlotIntroPlayed: boolean

  // Actions
  setActiveLevel:    (levelId: number, stepId: number, totalSteps: number) => void
  setActiveStep:     (stepId: number, stepIndex: number) => void
  recordSubmission:  (text: string) => void
  setAssessment:     (result: AssessmentResult) => void
  incrementAttempt:  () => void
  addXp:             (xp: number) => void
  resetStep:         () => void
  resetLevel:        () => void
  setTrayWords:      (words: string[]) => void
  setGapValue:       (label: string, value: string) => void
  clearGapValues:    () => void
  openGuidance:      (tab?: number) => void
  closeGuidance:     () => void
  markWordBankIntroPlayed: () => void
  markGapSlotIntroPlayed:  () => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      activeLevelId: null,
      activeStepId:  null,
      activeStepIndex: 0,
      totalStepsInLevel: 0,
      lastSubmittedText: '',
      attemptCount: 0,
      xpThisLevel: 0,
      feedbackState: 'idle',
      lastAssessment: null,
      trayWords: [],
      gapSlotValues: {},
      guidancePanelOpen: false,
      guidanceTabIndex: 0,
      wordBankIntroPlayed: false,
      gapSlotIntroPlayed: false,

      setActiveLevel: (levelId, stepId, totalSteps) =>
        set({ activeLevelId: levelId, activeStepId: stepId, totalStepsInLevel: totalSteps,
              activeStepIndex: 0, xpThisLevel: 0, feedbackState: 'idle', attemptCount: 0 }),

      setActiveStep: (stepId, stepIndex) =>
        set({ activeStepId: stepId, activeStepIndex: stepIndex,
              feedbackState: 'idle', attemptCount: 0, lastSubmittedText: '',
              trayWords: [], gapSlotValues: {}, lastAssessment: null }),

      recordSubmission: (text) => set({ lastSubmittedText: text }),

      setAssessment: (result) => set({ lastAssessment: result,
        feedbackState: result.is_correct
          ? (0 === 0 ? 'correct_first' : 'correct_retry')  // caller sets attemptCount first
          : 'needs_revision' }),

      incrementAttempt: () => set(s => ({ attemptCount: s.attemptCount + 1 })),

      addXp: (xp) => set(s => ({ xpThisLevel: s.xpThisLevel + xp })),

      resetStep: () =>
        set({ feedbackState: 'idle', attemptCount: 0, lastSubmittedText: '',
              trayWords: [], gapSlotValues: {}, lastAssessment: null }),

      resetLevel: () =>
        set({ activeLevelId: null, activeStepId: null, activeStepIndex: 0,
              xpThisLevel: 0, feedbackState: 'idle', attemptCount: 0,
              trayWords: [], gapSlotValues: {} }),

      setTrayWords:   (words) => set({ trayWords: words }),
      setGapValue:    (label, value) =>
        set(s => ({ gapSlotValues: { ...s.gapSlotValues, [label]: value } })),
      clearGapValues: () => set({ gapSlotValues: {} }),

      openGuidance:   (tab = 0) => set({ guidancePanelOpen: true, guidanceTabIndex: tab }),
      closeGuidance:  () => set({ guidancePanelOpen: false }),

      markWordBankIntroPlayed: () => set({ wordBankIntroPlayed: true }),
      markGapSlotIntroPlayed:  () => set({ gapSlotIntroPlayed:  true }),
    }),
    {
      name: 'pwp-session',
      // Only persist the one-time intro flags across reloads
      partialize: (s) => ({
        wordBankIntroPlayed: s.wordBankIntroPlayed,
        gapSlotIntroPlayed:  s.gapSlotIntroPlayed,
      }),
    }
  )
)

// ── Gamification store (XP, streak, title) ─────────────────────────────────
interface GameState {
  totalXp: number
  streakDays: number
  highestLevelReached: number
  levelTitle: LevelTitle
  wordBankPhase: WordBankPhase

  setProgress: (xp: number, streak: number, highest: number, phaseOverride: WordBankPhase | null) => void
  addXp: (xp: number) => void
  updateStreak: (days: number) => void
  setHighestLevel: (level: number) => void
}

function getLevelTitle(highest: number): LevelTitle {
  if (highest <= 3)  return 'Apprentice Writer'
  if (highest <= 8)  return 'Sentence Builder'
  if (highest <= 14) return 'Phrase Crafter'
  if (highest <= 19) return 'Paragraph Writer'
  return 'Master Composer'
}

function getWordBankPhase(level: number, override: WordBankPhase | null): WordBankPhase {
  if (override) return override
  if (level <= 6)  return 'A'
  if (level <= 19) return 'B'
  if (level <= 25) return 'C'
  return 'D'
}

export const useGameStore = create<GameState>((set) => ({
  totalXp: 0,
  streakDays: 0,
  highestLevelReached: 1,
  levelTitle: 'Apprentice Writer',
  wordBankPhase: 'A',

  setProgress: (xp, streak, highest, phaseOverride) =>
    set({
      totalXp: xp,
      streakDays: streak,
      highestLevelReached: highest,
      levelTitle: getLevelTitle(highest),
      wordBankPhase: getWordBankPhase(highest, phaseOverride),
    }),

  addXp: (xp) =>
    set(s => ({ totalXp: s.totalXp + xp })),

  updateStreak: (days) =>
    set({ streakDays: days }),

  setHighestLevel: (level) =>
    set({
      highestLevelReached: level,
      levelTitle: getLevelTitle(level),
      wordBankPhase: getWordBankPhase(level, null),
    }),
}))
