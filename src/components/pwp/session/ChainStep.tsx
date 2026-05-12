/**
 * ChainStep — single formula step in the PWP chain.
 * Shows the previous sentence (reference), the formula instruction,
 * a text input, and AI feedback after submission.
 */

import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SessionStepState } from '../../../stores/pwpSessionStore'

interface ChainStepProps {
  stepState: SessionStepState
  stepIndex: number
  totalSteps: number
  onSubmit: (sentence: string) => Promise<void>
  onAdvance: () => void
  previousSentence?: string
}

export const ChainStep: React.FC<ChainStepProps> = ({
  stepState,
  stepIndex,
  totalSteps,
  onSubmit,
  onAdvance,
  previousSentence,
}) => {
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus input when step becomes active
  useEffect(() => {
    if (stepState.status === 'pending') {
      setInput('')
      textareaRef.current?.focus()
    }
  }, [stepState.status])

  const canSubmit = input.trim().length >= 3 && !submitting && stepState.status !== 'assessing'

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await onSubmit(input.trim())
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const isAssessing = stepState.status === 'assessing' || submitting
  const isPassed = stepState.status === 'passed' || stepState.status === 'soft_passed'
  const needsRevision = stepState.status === 'needs_revision'

  return (
    <div className="w-full" data-testid={`chain-step-${stepIndex}`}>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="text-xs font-bold px-3 py-1 rounded-full"
          style={{ backgroundColor: 'var(--color-brand-primary)', color: '#fff' }}
          data-tts={`Step ${stepIndex + 1} of ${totalSteps}`}
        >
          Step {stepIndex + 1} of {totalSteps}
        </span>
        <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${((stepIndex) / totalSteps) * 100}%`,
              backgroundColor: 'var(--color-brand-primary)',
            }}
          />
        </div>
      </div>

      {/* Previous sentence reference card */}
      {previousSentence && (
        <div
          className="mb-4 px-4 py-3 rounded-xl text-sm"
          style={{
            backgroundColor: 'rgba(108,92,231,0.06)',
            border: '1px solid rgba(108,92,231,0.15)',
            color: 'var(--color-text-muted)',
          }}
          data-testid="previous-sentence-card"
          data-tts={`Your previous sentence was: ${previousSentence}`}
        >
          <div className="text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: 'var(--color-brand-primary)' }}>
            Your previous sentence
          </div>
          <div className="italic" style={{ color: 'var(--color-text)' }}>"{previousSentence}"</div>
        </div>
      )}

      {/* Formula instruction */}
      <div
        className="mb-5 px-5 py-4 rounded-2xl"
        style={{ backgroundColor: 'var(--color-brand-secondary)', color: '#fff' }}
        data-testid="formula-instruction"
        data-tts={stepState.step.formulaLabel}
      >
        <div className="text-xs font-bold uppercase tracking-wide mb-1 opacity-80">Formula instruction</div>
        <div className="text-base font-semibold leading-snug">{stepState.step.formulaLabel}</div>
        {stepState.step.example && (
          <div className="mt-2 text-xs opacity-75">
            Example: <span className="italic">"{stepState.step.example}"</span>
          </div>
        )}
      </div>

      {/* Input */}
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write your sentence here…"
        rows={3}
        maxLength={300}
        disabled={isPassed || isAssessing}
        data-testid="sentence-input"
        data-tts="Write your sentence here"
        className="w-full px-4 py-3 rounded-2xl text-base resize-none outline-none transition"
        style={{
          border: `2px solid ${needsRevision ? 'var(--color-error)' : 'var(--color-brand-primary)'}`,
          color: 'var(--color-text)',
          backgroundColor: 'var(--color-background)',
          opacity: isPassed ? 0.6 : 1,
        }}
        onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(108,92,231,0.2)' }}
        onBlur={(e) => { e.currentTarget.style.boxShadow = 'none' }}
      />

      {/* Submit button */}
      {!isPassed && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          data-testid="submit-sentence-btn"
          data-tts={isAssessing ? 'Checking your sentence' : 'Check my sentence'}
          className="mt-3 w-full py-3 rounded-full font-bold text-base transition disabled:opacity-40"
          style={{
            backgroundColor: canSubmit ? 'var(--color-brand-primary)' : 'var(--color-disabled)',
            color: '#fff',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          {isAssessing ? 'Checking…' : stepState.attempts > 0 ? 'Try again →' : 'Check my sentence →'}
        </button>
      )}

      {/* AI feedback — mode="wait" removed (React 19 + Framer Motion WAAPI bug) */}
      <AnimatePresence>
        {stepState.assessment && (
          <motion.div
            key={stepState.status}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-4 px-4 py-4 rounded-2xl"
            style={{
              backgroundColor: isPassed
                ? 'rgba(39,174,96,0.08)'
                : 'rgba(231,76,60,0.06)',
              border: `1.5px solid ${isPassed ? 'rgba(39,174,96,0.3)' : 'rgba(231,76,60,0.25)'}`,
            }}
            data-testid="step-feedback"
            data-tts={stepState.assessment.feedback}
          >
            <div className="text-sm font-semibold mb-1" style={{ color: isPassed ? '#27ae60' : '#c0392b' }}>
              {isPassed ? '✓ Well done!' : 'Almost there…'}
            </div>
            <div className="text-sm" style={{ color: 'var(--color-text)' }}>
              {stepState.assessment.feedback}
            </div>
            {needsRevision && stepState.assessment.suggestedRevision && (
              <div className="mt-2 text-sm italic" style={{ color: 'var(--color-text-muted)' }}>
                Try: "{stepState.assessment.suggestedRevision}"
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advance button — shown when passed */}
      {isPassed && (
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          type="button"
          onClick={onAdvance}
          data-testid="advance-btn"
          data-tts={stepIndex + 1 < totalSteps ? 'Next step' : 'Complete the chain'}
          className="mt-4 w-full py-3 rounded-full font-bold text-base"
          style={{ backgroundColor: 'var(--color-brand-secondary)', color: '#fff' }}
        >
          {stepIndex + 1 < totalSteps ? 'Next step →' : 'Chain complete! →'}
        </motion.button>
      )}
    </div>
  )
}
