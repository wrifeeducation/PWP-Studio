/**
 * PWP Daily Chain Practice — ChainRow
 *
 * One row in the chain builder. Shows:
 *   - Level badge (e.g. "L3")
 *   - Formula name (e.g. "det + adj + noun + verb")
 *   - Sentence input (when active) OR accepted sentence (when done)
 *   - Formula hint (collapses/expands)
 *   - Inline validation error when applicable
 *
 * States: pending | active | accepted | error
 * Max 200 lines.
 */

import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ChainRowState } from '../../types/index'
import type { ChainFormulaDefinition } from '../../lib/chain/formulaDefinitions'

interface ChainRowProps {
  rowState: ChainRowState
  formula: ChainFormulaDefinition
  subjectNoun: string
  onSubmit: (sentence: string) => void
  /** Whether this row's input should receive focus */
  autoFocus?: boolean
}

export const ChainRow: React.FC<ChainRowProps> = ({
  rowState,
  formula,
  subjectNoun,
  onSubmit,
  autoFocus = false,
}) => {
  const [draft, setDraft] = useState(rowState.sentence)
  const [hintOpen, setHintOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus && rowState.status === 'active' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus, rowState.status])

  // Sync draft if external state resets
  useEffect(() => {
    if (rowState.status !== 'active') setDraft(rowState.sentence)
  }, [rowState.status, rowState.sentence])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && draft.trim().length >= 3) {
      onSubmit(draft.trim())
    }
  }

  const isAccepted = rowState.status === 'accepted'
  const isActive = rowState.status === 'active'
  const isError = rowState.status === 'error'

  // ── Border colour by status ──────────────────────────────────────────────────
  const borderColour = isAccepted
    ? 'var(--color-success)'
    : isError
    ? 'var(--color-error)'
    : isActive
    ? 'var(--color-brand-primary)'
    : 'var(--color-border)'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      data-testid={`chain-row-l${formula.level}`}
      className="w-full rounded-2xl p-4 mb-3"
      style={{
        border: `2px solid ${borderColour}`,
        backgroundColor: isAccepted
          ? 'var(--color-success-light)'
          : 'var(--color-background)',
      }}
    >
      {/* Header row: badge + formula name + hint toggle */}
      <div className="flex items-center gap-3 mb-3">
        {/* Level badge */}
        <span
          className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold text-white"
          style={{
            backgroundColor: isAccepted
              ? 'var(--color-success)'
              : 'var(--color-brand-primary)',
          }}
          data-testid={`level-badge-${formula.level}`}
          data-tts={`Level ${formula.level}`}
        >
          L{formula.level}
        </span>

        {/* Formula name */}
        <span
          className="text-sm font-semibold flex-1"
          style={{ color: 'var(--color-text-muted)', fontFamily: 'monospace' }}
          data-tts={`Formula: ${formula.name}`}
        >
          {formula.name}
        </span>

        {/* Tick on accepted */}
        {isAccepted && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-xl"
            data-tts="Accepted"
            aria-label="Accepted"
          >
            ✅
          </motion.span>
        )}

        {/* Hint toggle */}
        <button
          type="button"
          onClick={() => setHintOpen((o) => !o)}
          data-testid={`hint-toggle-l${formula.level}`}
          data-tts={hintOpen ? 'Hide hint' : 'Show hint'}
          className="text-xs px-2 py-1 rounded-lg transition hover:opacity-80"
          style={{
            backgroundColor: 'var(--color-brand-primary-light)',
            color: 'var(--color-brand-primary)',
          }}
        >
          {hintOpen ? 'Hide hint' : '💡 Hint'}
        </button>
      </div>

      {/* Collapsible hint */}
      <AnimatePresence>
        {hintOpen && (
          <motion.div
            key="hint"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="mb-3 px-3 py-2 rounded-xl text-sm"
              style={{
                backgroundColor: 'var(--color-brand-secondary-light)',
                color: 'var(--color-text)',
              }}
              data-tts={formula.hint}
            >
              <p>{formula.hint}</p>
              <p className="mt-1 italic" style={{ color: 'var(--color-text-muted)' }}>
                Example: {formula.example}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Accepted sentence display */}
      {isAccepted && (
        <p
          className="text-base font-medium"
          style={{ color: 'var(--color-success-dark)' }}
          data-tts={`Your accepted sentence: ${rowState.sentence}`}
        >
          {rowState.sentence}
        </p>
      )}

      {/* Active input */}
      {isActive && (
        <>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Write your L${formula.level} sentence using "${subjectNoun}"…`}
              maxLength={120}
              autoComplete="off"
              data-testid={`sentence-input-l${formula.level}`}
              data-tts={`Type your level ${formula.level} sentence`}
              className="flex-1 px-4 py-3 rounded-xl outline-none text-base transition"
              style={{
                border: `2px solid ${isError ? 'var(--color-error)' : 'var(--color-brand-primary)'}`,
                color: 'var(--color-text)',
                backgroundColor: 'var(--color-background)',
              }}
            />
            <button
              type="button"
              onClick={() => draft.trim().length >= 3 && onSubmit(draft.trim())}
              disabled={draft.trim().length < 3}
              data-testid={`check-btn-l${formula.level}`}
              data-tts="Check my sentence"
              className="px-4 py-3 rounded-xl font-bold text-white transition disabled:opacity-40"
              style={{ backgroundColor: 'var(--color-brand-secondary)', minWidth: 72 }}
            >
              Check
            </button>
          </div>

          {/* Attempt counter */}
          {rowState.attempts > 0 && (
            <p
              className="mt-1 text-xs"
              style={{ color: 'var(--color-text-muted)' }}
              data-tts={`Attempt ${rowState.attempts}`}
            >
              Attempt {rowState.attempts + 1}
            </p>
          )}
        </>
      )}

      {/* Error feedback */}
      <AnimatePresence>
        {isError && rowState.lastError && (
          <motion.div
            key="error"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 px-3 py-2 rounded-xl text-sm"
            style={{
              backgroundColor: 'var(--color-error-light)',
              color: 'var(--color-error-dark)',
              border: '1px solid var(--color-error)',
            }}
            data-testid={`error-msg-l${formula.level}`}
            data-tts={`Error: ${rowState.lastError}`}
          >
            {rowState.lastError}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
