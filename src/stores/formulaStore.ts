/**
 * Zustand store for formula practice session UI state.
 * No async logic — all API calls live in hooks/lib files.
 */

import { create } from 'zustand'
import type { Nullable } from '../types/index'

interface FormulaSlotState {
  /** Map of slot position → selected word (null = empty) */
  slotSelections: Record<number, Nullable<string>>
  /** Words already used (moved from bank to a slot) */
  usedWordIds: Set<string>
  /** Has the session been submitted */
  isSubmitted: boolean
  /** Is the AI assessment in-flight */
  isAssessing: boolean
  /** Session score after assessment (0-100) */
  score: Nullable<number>
  /** Raw AI response stored for feedback display */
  aiResponse: Nullable<Record<string, unknown>>
  /** Labels-visible timer state (Phase B: fades after 3s) */
  labelsVisible: boolean
}

interface FormulaStoreActions {
  setSlotWord: (position: number, word: string, wordId: string) => void
  clearSlot: (position: number, wordId: string) => void
  resetSession: () => void
  setSubmitted: (submitted: boolean) => void
  setAssessing: (assessing: boolean) => void
  setScore: (score: number) => void
  setAiResponse: (response: Record<string, unknown>) => void
  setLabelsVisible: (visible: boolean) => void
  areAllSlotsFilled: (totalSlots: number) => boolean
}

const INITIAL_STATE: FormulaSlotState = {
  slotSelections: {},
  usedWordIds: new Set<string>(),
  isSubmitted: false,
  isAssessing: false,
  score: null,
  aiResponse: null,
  labelsVisible: true,
}

export const useFormulaStore = create<FormulaSlotState & FormulaStoreActions>((set, get) => ({
  ...INITIAL_STATE,
  usedWordIds: new Set<string>(),

  setSlotWord: (position, word, wordId) =>
    set((state) => {
      const newSelections = { ...state.slotSelections, [position]: word }
      const newUsed = new Set(state.usedWordIds)
      newUsed.add(wordId)
      return { slotSelections: newSelections, usedWordIds: newUsed }
    }),

  clearSlot: (position, wordId) =>
    set((state) => {
      const newSelections = { ...state.slotSelections, [position]: null }
      const newUsed = new Set(state.usedWordIds)
      newUsed.delete(wordId)
      return { slotSelections: newSelections, usedWordIds: newUsed }
    }),

  resetSession: () =>
    set({
      slotSelections: {},
      usedWordIds: new Set<string>(),
      isSubmitted: false,
      isAssessing: false,
      score: null,
      aiResponse: null,
      labelsVisible: true,
    }),

  setSubmitted: (submitted) => set({ isSubmitted: submitted }),
  setAssessing: (assessing) => set({ isAssessing: assessing }),
  setScore: (score) => set({ score }),
  setAiResponse: (response) => set({ aiResponse: response }),
  setLabelsVisible: (visible) => set({ labelsVisible: visible }),

  areAllSlotsFilled: (totalSlots) => {
    const { slotSelections } = get()
    for (let i = 0; i < totalSlots; i++) {
      if (!slotSelections[i]) return false
    }
    return true
  },
}))
