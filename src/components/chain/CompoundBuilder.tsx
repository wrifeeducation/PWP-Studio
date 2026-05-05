/**
 * PWP Daily Chain Practice — Compound / Complex Sentence Builder
 *
 * Shows after the chain is complete for pupils at CL9+.
 * Pupil extends their anchor sentence with a conjunction and second clause.
 *
 * Props:
 *   anchorSentence        — read-only formula sentence from the chain session
 *   allowedTypes          — which conjunction sets are unlocked for this pupil
 *   strictPunctuation     — W4+ pupils: comma error is hard, not soft
 *   onAccepted(result)    — called when the compound sentence is validated
 *   onSkip                — pupil skips this step (always available)
 *
 * Max 200 lines.
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ConjunctionType, CompoundValidationResult } from '../../types/index'
import {
  validateCompoundSentence,
  COORDINATING_CONJUNCTIONS,
  SUBORDINATING_CONJUNCTIONS_BASIC,
  SUBORDINATING_CONJUNCTIONS_EXTENDED,
} from '../../lib/chain/validateCompoundSentence'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompoundBuilderProps {
  anchorSentence: string
  allowedTypes?: ConjunctionType[]
  strictPunctuation?: boolean
  onAccepted: (result: CompoundValidationResult) => void
  onSkip: () => void
}

// ─── Conjunction tab config ───────────────────────────────────────────────────

const CONJ_TABS: Array<{
  type: ConjunctionType
  label: string
  words: readonly string[]
}> = [
  { type: 'coordinating',           label: 'Compound (and / but…)',  words: COORDINATING_CONJUNCTIONS },
  { type: 'subordinating_basic',    label: 'Complex (because / when…)', words: SUBORDINATING_CONJUNCTIONS_BASIC },
  { type: 'subordinating_extended', label: 'Extended (although…)',   words: SUBORDINATING_CONJUNCTIONS_EXTENDED },
]

// ─── Component ────────────────────────────────────────────────────────────────

export const CompoundBuilder: React.FC<CompoundBuilderProps> = ({
  anchorSentence,
  allowedTypes = ['coordinating'],
  strictPunctuation = false,
  onAccepted,
  onSkip,
}) => {
  const availableTabs = CONJ_TABS.filter((t) => allowedTypes.includes(t.type))
  const [activeTab, setActiveTab] = useState<ConjunctionType>(availableTabs[0]?.type ?? 'coordinating')
  const [selectedConj, setSelectedConj] = useState<string>('')
  const [secondClause, setSecondClause] = useState('')
  const [result, setResult] = useState<CompoundValidationResult | null>(null)
  const [attempts, setAttempts] = useState(0)

  const activeTabData = CONJ_TABS.find((t) => t.type === activeTab)

  // Live preview of the compound sentence
  const preview = selectedConj && secondClause.trim()
    ? activeTab === 'coordinating'
      ? `${anchorSentence.replace(/[.!?]+$/, '')}, ${selectedConj} ${secondClause.trim()}.`
      : `${anchorSentence.replace(/[.!?]+$/, '')} ${selectedConj} ${secondClause.trim()}.`
    : null

  const handleCheck = () => {
    if (!selectedConj || !secondClause.trim()) return
    const r = validateCompoundSentence(
      anchorSentence, selectedConj, secondClause, allowedTypes, strictPunctuation,
    )
    setAttempts((a) => a + 1)
    setResult(r)
    if (r.accepted) onAccepted({ ...r })
  }

  const handleTabChange = (type: ConjunctionType) => {
    setActiveTab(type)
    setSelectedConj('')
    setResult(null)
  }

  const isReady = !!selectedConj && secondClause.trim().length >= 3

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl mx-auto"
      data-testid="compound-builder"
    >
      {/* Header */}
      <h2
        className="text-2xl font-bold text-center mb-1"
        style={{ color: 'var(--color-brand-primary)', fontFamily: 'var(--font-display)' }}
        data-tts="Now extend your sentence"
      >
        Now extend your sentence
      </h2>
      <p className="text-center text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}
         data-tts="Join your anchor sentence to a second clause using a joining word">
        Join your anchor sentence to a second clause using a joining word.
      </p>

      {/* Anchor sentence (read-only) */}
      <div
        className="mb-5 px-4 py-3 rounded-2xl text-base font-semibold text-center"
        style={{
          backgroundColor: 'var(--color-brand-primary-light)',
          border: '2px solid var(--color-brand-primary)',
          color: 'var(--color-brand-primary)',
        }}
        data-testid="anchor-display"
        data-tts={`Your anchor sentence: ${anchorSentence}`}
      >
        {anchorSentence}
      </div>

      {/* Conjunction type tabs */}
      {availableTabs.length > 1 && (
        <div className="flex gap-2 mb-4 justify-center flex-wrap">
          {availableTabs.map((tab) => (
            <button
              key={tab.type}
              type="button"
              onClick={() => handleTabChange(tab.type)}
              data-testid={`conj-tab-${tab.type}`}
              className="px-3 py-1.5 rounded-full text-sm font-semibold transition"
              style={{
                backgroundColor: activeTab === tab.type
                  ? 'var(--color-brand-primary)' : 'var(--color-brand-primary-light)',
                color: activeTab === tab.type ? '#fff' : 'var(--color-brand-primary)',
                border: '2px solid var(--color-brand-primary)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Conjunction chips */}
      <div className="flex flex-wrap gap-2 justify-center mb-5" data-testid="conjunction-chips">
        {activeTabData?.words.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => { setSelectedConj(w); setResult(null) }}
            data-testid={`conj-${w}`}
            data-tts={w}
            className="px-4 py-2 rounded-full font-bold text-sm transition"
            style={{
              backgroundColor: selectedConj === w
                ? 'var(--color-brand-secondary)' : 'var(--color-brand-secondary-light)',
              color: selectedConj === w ? '#fff' : 'var(--color-brand-secondary-dark)',
              border: `2px solid ${selectedConj === w ? 'var(--color-brand-secondary)' : 'var(--color-brand-secondary)'}`,
            }}
          >
            {w}
          </button>
        ))}
      </div>

      {/* Second clause input */}
      <input
        type="text"
        value={secondClause}
        onChange={(e) => { setSecondClause(e.target.value); setResult(null) }}
        onKeyDown={(e) => e.key === 'Enter' && isReady && handleCheck()}
        placeholder={selectedConj
          ? `…${selectedConj} (type your second clause here)`
          : 'Choose a joining word first, then type your second part…'}
        maxLength={150}
        autoComplete="off"
        data-testid="second-clause-input"
        data-tts="Type your second clause here"
        className="w-full px-5 py-4 rounded-2xl text-base outline-none transition mb-3"
        style={{
          border: '2px solid var(--color-brand-primary)',
          color: 'var(--color-text)',
          backgroundColor: 'var(--color-background)',
        }}
        onFocus={(e) => (e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-brand-primary-light)')}
        onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
      />

      {/* Live preview */}
      {preview && (
        <p className="text-sm italic text-center mb-4" style={{ color: 'var(--color-text-muted)' }}
           data-tts={`Preview: ${preview}`}>
          Preview: <em>{preview}</em>
        </p>
      )}

      {/* Feedback */}
      <AnimatePresence>
        {result && !result.accepted && (
          <motion.div
            key="error"
            initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
            className="mb-3 px-4 py-3 rounded-2xl text-sm"
            style={{ backgroundColor: 'var(--color-error-light)', color: 'var(--color-error-dark)', border: '1px solid var(--color-error)' }}
            data-testid="compound-error"
          >
            {result.errorMessage}
          </motion.div>
        )}
        {result?.warning && (
          <motion.div
            key="warning"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mb-3 px-4 py-3 rounded-2xl text-sm"
            style={{ backgroundColor: 'var(--color-gold-light)', color: 'var(--color-gold-dark)', border: '1px solid var(--color-gold)' }}
            data-testid="compound-warning"
          >
            💡 {result.warning}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attempt counter */}
      {attempts > 0 && !result?.accepted && (
        <p className="text-xs text-center mb-2" style={{ color: 'var(--color-text-muted)' }}>
          Attempt {attempts}
        </p>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleCheck}
          disabled={!isReady || result?.accepted}
          data-testid="check-compound-btn"
          data-tts="Check my sentence"
          className="flex-1 py-4 rounded-full text-white font-bold text-lg transition disabled:opacity-40"
          style={{ backgroundColor: 'var(--color-brand-secondary)' }}
        >
          Check ✓
        </button>
        <button
          type="button"
          onClick={onSkip}
          data-testid="skip-compound-btn"
          data-tts="Skip this step"
          className="py-4 px-5 rounded-full font-semibold text-sm transition"
          style={{ backgroundColor: 'var(--color-brand-primary-light)', color: 'var(--color-brand-primary)', border: '2px solid var(--color-brand-primary)' }}
        >
          Skip
        </button>
      </div>
    </motion.div>
  )
}
