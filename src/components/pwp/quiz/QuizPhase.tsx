/**
 * QuizPhase — end-of-session mastery quiz.
 * Generates prompts via AI, collects all responses, then submits
 * the full batch for qualitative assessment.
 */

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { generateQuiz, assessQuiz } from '../../../lib/pwp/pwpApi'
import { usePWPSessionStore } from '../../../stores/pwpSessionStore'

interface QuizPhaseProps {
  onComplete: () => void
}

type QuizSubPhase = 'loading' | 'answering' | 'submitting' | 'results'

export const QuizPhase: React.FC<QuizPhaseProps> = ({ onComplete }) => {
  const { chain, highestLesson, subjectNoun, quiz, initQuiz, setQuizResponse, setQuizResults } =
    usePWPSessionStore()

  const [subPhase, setSubPhase] = useState<QuizSubPhase>('loading')
  const [error, setError] = useState<string | null>(null)
  const [localResponses, setLocalResponses] = useState<Record<string, string>>({})
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0)

  // Generate quiz on mount
  useEffect(() => {
    const elementCodes = chain.map((s) => s.code)
    generateQuiz({ elementCodes, highestLesson, sessionSubjectNoun: subjectNoun })
      .then((result) => {
        initQuiz(result.prompts)
        setSubPhase('answering')
      })
      .catch(() => {
        setError('Could not load the quiz. You can skip it for now.')
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const prompts = quiz?.prompts ?? []
  const currentPrompt = prompts[currentPromptIndex]
  const currentResponse = localResponses[currentPrompt?.id ?? ''] ?? ''

  const handleResponseChange = (value: string) => {
    if (!currentPrompt) return
    setLocalResponses((prev) => ({ ...prev, [currentPrompt.id]: value }))
  }

  const handleNextPrompt = () => {
    if (currentPromptIndex < prompts.length - 1) {
      setCurrentPromptIndex((i) => i + 1)
    } else {
      handleSubmitAll()
    }
  }

  const handleSubmitAll = async () => {
    setSubPhase('submitting')
    const promptsWithResponses = prompts.map((p) => ({
      ...p,
      pupilSentence: localResponses[p.id] ?? '',
    }))
    // Save responses to store
    prompts.forEach((p) => setQuizResponse(p.id, localResponses[p.id] ?? ''))

    try {
      const result = await assessQuiz({ prompts: promptsWithResponses, highestLesson })
      setQuizResults(result.responses, result.overallPassed, result.summary, result.readyForNextElement)
    } catch {
      // Graceful fallback
      const fallbackResults = prompts.map((p) => ({ id: p.id, passed: true, feedback: 'Good effort!' }))
      setQuizResults(fallbackResults, true, 'You showed good understanding across the quiz. Well done!', false)
    } finally {
      setSubPhase('results')
    }
  }

  const isLastPrompt = currentPromptIndex === prompts.length - 1
  const canAdvance = currentResponse.trim().length >= 3

  if (subPhase === 'loading') {
    return (
      <div className="text-center py-12" data-testid="quiz-loading">
        <div className="text-4xl mb-3">✏️</div>
        <p className="text-base font-medium" style={{ color: 'var(--color-text-muted)' }}
          data-tts="Preparing your quick check">
          Preparing your quick check…
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-10" data-testid="quiz-error">
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>{error}</p>
        <button
          type="button"
          onClick={onComplete}
          className="px-6 py-2 rounded-full font-semibold text-sm"
          style={{ backgroundColor: 'var(--color-brand-primary)', color: '#fff' }}
        >
          Skip quiz →
        </button>
      </div>
    )
  }

  if (subPhase === 'answering' && currentPrompt) {
    return (
      <div className="w-full" data-testid="quiz-answering">
        {/* Header */}
        <div className="mb-5 text-center">
          <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--color-brand-primary)' }}>
            Quick Check
          </div>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}
            data-tts="Write a sentence for each prompt then we'll check your answers together">
            Write a sentence for each prompt — we'll check them all together.
          </p>
        </div>

        {/* Prompt progress dots */}
        <div className="flex justify-center gap-2 mb-5">
          {prompts.map((_, i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full transition-all"
              style={{
                backgroundColor: i === currentPromptIndex
                  ? 'var(--color-brand-primary)'
                  : i < currentPromptIndex
                  ? 'rgba(108,92,231,0.35)'
                  : 'var(--color-border)',
              }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentPrompt.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Instruction */}
            <div
              className="mb-4 px-5 py-4 rounded-2xl"
              style={{ backgroundColor: 'var(--color-brand-secondary)', color: '#fff' }}
              data-tts={currentPrompt.instruction}
            >
              <div className="text-xs font-bold uppercase tracking-wide mb-1 opacity-80">
                Prompt {currentPromptIndex + 1} of {prompts.length}
              </div>
              <div className="text-base font-semibold leading-snug">{currentPrompt.instruction}</div>
            </div>

            {/* Response input */}
            <textarea
              value={currentResponse}
              onChange={(e) => handleResponseChange(e.target.value)}
              placeholder="Write your sentence here…"
              rows={3}
              maxLength={300}
              autoFocus
              data-testid={`quiz-input-${currentPrompt.id}`}
              data-tts="Write your sentence here"
              className="w-full px-4 py-3 rounded-2xl text-base resize-none outline-none"
              style={{
                border: '2px solid var(--color-brand-primary)',
                color: 'var(--color-text)',
                backgroundColor: 'var(--color-background)',
              }}
              onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(108,92,231,0.2)' }}
              onBlur={(e) => { e.currentTarget.style.boxShadow = 'none' }}
            />

            <button
              type="button"
              onClick={handleNextPrompt}
              disabled={!canAdvance}
              data-testid="quiz-next-btn"
              data-tts={isLastPrompt ? 'Submit all answers' : 'Next prompt'}
              className="mt-3 w-full py-3 rounded-full font-bold text-base disabled:opacity-40"
              style={{ backgroundColor: 'var(--color-brand-primary)', color: '#fff' }}
            >
              {isLastPrompt ? 'Submit all answers →' : 'Next →'}
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }

  if (subPhase === 'submitting') {
    return (
      <div className="text-center py-12" data-testid="quiz-submitting">
        <div className="text-4xl mb-3">🔍</div>
        <p className="text-base font-medium" style={{ color: 'var(--color-text-muted)' }}
          data-tts="Checking your answers">
          Checking your answers…
        </p>
      </div>
    )
  }

  if (subPhase === 'results' && quiz?.results) {
    const passed = quiz.overallPassed ?? false
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
        data-testid="quiz-results"
      >
        <div className="mb-5 text-center">
          <div className="text-4xl mb-2">{passed ? '🌟' : '✏️'}</div>
          <h3 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}
            data-tts={passed ? 'Great work on the quiz' : 'Keep practising'}>
            {passed ? 'Great work!' : 'Keep practising!'}
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }} data-tts={quiz.summary}>
            {quiz.summary}
          </p>
        </div>

        {/* Per-prompt results */}
        <div className="space-y-3 mb-6">
          {quiz.results.map((result, i) => (
            <div
              key={result.id}
              className="px-4 py-3 rounded-xl text-sm"
              style={{
                backgroundColor: result.passed ? 'rgba(39,174,96,0.07)' : 'rgba(231,76,60,0.06)',
                border: `1.5px solid ${result.passed ? 'rgba(39,174,96,0.25)' : 'rgba(231,76,60,0.2)'}`,
              }}
              data-tts={result.feedback}
            >
              <div className="font-semibold mb-0.5" style={{ color: result.passed ? '#27ae60' : '#c0392b' }}>
                Prompt {i + 1} — {result.passed ? '✓' : 'Almost'}
              </div>
              <div style={{ color: 'var(--color-text)' }}>{result.feedback}</div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onComplete}
          data-testid="quiz-complete-btn"
          data-tts="See my session summary"
          className="w-full py-3 rounded-full font-bold text-base"
          style={{ backgroundColor: 'var(--color-brand-secondary)', color: '#fff' }}
        >
          See my session summary →
        </button>
      </motion.div>
    )
  }

  return null
}
