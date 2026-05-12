/**
 * PWP Session Store — Zustand
 * Holds all runtime state for an active PWP session.
 * Server state (saves, queries) lives in React Query; this store
 * owns only transient UI + session progress state.
 */

import { create } from 'zustand'
import type { ChainStep, AssessStepResponse, QuizPrompt, SinglePromptResult } from '../lib/pwp/pwpApi'

// ─── Step state ───────────────────────────────────────────────────────────────

export type StepStatus = 'pending' | 'assessing' | 'passed' | 'needs_revision' | 'soft_passed'

export interface SessionStepState {
  step: ChainStep
  sentence: string
  status: StepStatus
  assessment: AssessStepResponse | null
  attempts: number
}

// ─── Paragraph state ──────────────────────────────────────────────────────────

export interface ParagraphState {
  leadSentence: string          // = final chain step sentence
  supportSentences: string[]    // 2-3 free sentences
  closeSentence: string
  closeAssessment: { passed: boolean; feedback: string; suggestedRevision: string | null } | null
  closeAttempts: number
}

// ─── Quiz state ───────────────────────────────────────────────────────────────

export interface QuizState {
  prompts: QuizPrompt[]
  responses: Record<string, string>   // promptId → pupil's sentence
  results: SinglePromptResult[]
  overallPassed: boolean | null
  summary: string
  readyForNextElement: boolean
}

// ─── Overall session phase ────────────────────────────────────────────────────

export type SessionPhase = 'entry' | 'chain' | 'paragraph' | 'quiz' | 'complete'

// ─── Resume payload ───────────────────────────────────────────────────────────

export interface ResumePayload {
  sessionId: string
  subjectNoun: string
  chain: ChainStep[]
  steps: SessionStepState[]
  currentStepIndex: number
  highestLesson: number
  phase: SessionPhase
  paragraph: ParagraphState | null
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface PWPSessionState {
  phase: SessionPhase
  sessionId: string | null
  subjectNoun: string
  highestLesson: number
  chain: ChainStep[]
  steps: SessionStepState[]
  currentStepIndex: number
  paragraph: ParagraphState | null
  quiz: QuizState | null
  paragraphEnabled: boolean   // true when highestLesson >= 26 or teacher override
}

interface PWPSessionActions {
  setPhase: (phase: SessionPhase) => void
  setSessionId: (id: string) => void
  setSubjectNoun: (noun: string) => void
  setHighestLesson: (lesson: number) => void
  setParagraphEnabled: (enabled: boolean) => void
  initChain: (chain: ChainStep[], highestLesson: number) => void
  updateStep: (index: number, update: Partial<SessionStepState>) => void
  advanceStep: () => void
  initParagraph: (leadSentence: string) => void
  updateParagraph: (update: Partial<ParagraphState>) => void
  initQuiz: (prompts: QuizPrompt[]) => void
  setQuizResponse: (promptId: string, sentence: string) => void
  setQuizResults: (results: SinglePromptResult[], overallPassed: boolean, summary: string, ready: boolean) => void
  /** Atomically restores full session state when resuming a saved session. */
  resumeSession: (payload: ResumePayload) => void
  reset: () => void
}

const initialState: PWPSessionState = {
  phase: 'entry',
  sessionId: null,
  subjectNoun: '',
  highestLesson: 10,
  chain: [],
  steps: [],
  currentStepIndex: 0,
  paragraph: null,
  quiz: null,
  paragraphEnabled: false,
}

export const usePWPSessionStore = create<PWPSessionState & PWPSessionActions>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setSessionId: (sessionId) => set({ sessionId }),
  setSubjectNoun: (subjectNoun) => set({ subjectNoun }),
  setHighestLesson: (highestLesson) => set({ highestLesson }),
  setParagraphEnabled: (paragraphEnabled) => set({ paragraphEnabled }),

  initChain: (chain, highestLesson) => set({
    chain,
    highestLesson,
    steps: chain.map((step) => ({
      step,
      sentence: '',
      status: 'pending',
      assessment: null,
      attempts: 0,
    })),
    currentStepIndex: 0,
    paragraphEnabled: highestLesson >= 26,
  }),

  updateStep: (index, update) => set((state) => {
    const steps = [...state.steps]
    steps[index] = { ...steps[index], ...update }
    return { steps }
  }),

  advanceStep: () => set((state) => {
    const next = state.currentStepIndex + 1
    if (next >= state.steps.length) {
      // Chain complete — determine next phase
      const leadSentence = state.steps[state.steps.length - 1]?.sentence ?? ''
      return {
        currentStepIndex: next,
        phase: state.paragraphEnabled ? 'paragraph' : 'quiz',
        paragraph: state.paragraphEnabled
          ? { leadSentence, supportSentences: [], closeSentence: '', closeAssessment: null, closeAttempts: 0 }
          : null,
      }
    }
    return { currentStepIndex: next }
  }),

  initParagraph: (leadSentence) => set({
    paragraph: {
      leadSentence,
      supportSentences: [],
      closeSentence: '',
      closeAssessment: null,
      closeAttempts: 0,
    },
  }),

  updateParagraph: (update) => set((state) => ({
    paragraph: state.paragraph ? { ...state.paragraph, ...update } : null,
  })),

  initQuiz: (prompts) => set({
    quiz: {
      prompts,
      responses: {},
      results: [],
      overallPassed: null,
      summary: '',
      readyForNextElement: false,
    },
  }),

  setQuizResponse: (promptId, sentence) => set((state) => ({
    quiz: state.quiz
      ? { ...state.quiz, responses: { ...state.quiz.responses, [promptId]: sentence } }
      : null,
  })),

  setQuizResults: (results, overallPassed, summary, readyForNextElement) => set((state) => ({
    quiz: state.quiz ? { ...state.quiz, results, overallPassed, summary, readyForNextElement } : null,
  })),

  resumeSession: (payload) => set({
    sessionId: payload.sessionId,
    subjectNoun: payload.subjectNoun,
    chain: payload.chain,
    steps: payload.steps,
    currentStepIndex: payload.currentStepIndex,
    highestLesson: payload.highestLesson,
    paragraphEnabled: payload.highestLesson >= 26,
    paragraph: payload.paragraph,
    quiz: null,
    phase: payload.phase,
  }),

  reset: () => set(initialState),
}))
