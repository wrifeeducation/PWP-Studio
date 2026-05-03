/**
 * PWP Daily Chain Practice — ChainBuilder
 *
 * Orchestrates the full sentence chain from L1 → current level.
 * Manages per-row state (pending/active/accepted/error) and advances
 * the active row when a sentence is accepted.
 *
 * Emits onChainComplete({ rows, totalAttempts, newFormulaAttempts }) when
 * all levels are accepted so the parent page can save the session.
 *
 * Max 200 lines — row rendering is delegated to ChainRow.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { ChainRow } from './ChainRow'
import { getChainForLevel } from '../../lib/chain/formulaDefinitions'
import { validateChainSentence } from '../../lib/chain/validateChainSentence'
import type { ChainRowState } from '../../types/index'

interface ChainCompletePayload {
  rows: ChainRowState[]
  totalAttempts: number
  /** Number of attempts on the highest (new) formula level */
  newFormulaAttempts: number
}

interface ChainBuilderProps {
  /** The pupil's chosen subject noun for this session */
  subjectNoun: string
  /** The pupil's current formula level (highest row shown) */
  currentLevel: number
  /** Called when all rows are accepted */
  onChainComplete: (payload: ChainCompletePayload) => void
  /**
   * Help mode — shows word-class colour bands on each active row.
   * Enabled in Free Practice; disabled in Daily Practice.
   */
  helpMode?: boolean
}

export const ChainBuilder: React.FC<ChainBuilderProps> = ({
  subjectNoun,
  currentLevel,
  onChainComplete,
  helpMode = false,
}) => {
  const formulas = getChainForLevel(currentLevel)

  // Initialise one ChainRowState per formula
  const initRows = (): ChainRowState[] =>
    formulas.map((f, i) => ({
      level: f.level,
      status: i === 0 ? 'active' : 'pending',
      sentence: '',
      attempts: 0,
      lastError: null,
    }))

  const [rows, setRows] = useState<ChainRowState[]>(initRows)
  const [completed, setCompleted] = useState(false)

  // Re-init if currentLevel or subjectNoun changes (e.g. user goes back)
  useEffect(() => {
    setRows(initRows())
    setCompleted(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLevel, subjectNoun])

  const handleSubmit = useCallback(
    (levelIndex: number, sentence: string) => {
      const formula = formulas[levelIndex]
      if (!formula) return

      const result = validateChainSentence(sentence, formula, subjectNoun)

      setRows((prev) => {
        const next = [...prev]
        const row = { ...next[levelIndex] }

        if (result.accepted) {
          row.status = 'accepted'
          row.sentence = sentence
          // Activate the next row
          if (levelIndex + 1 < next.length) {
            next[levelIndex + 1] = { ...next[levelIndex + 1], status: 'active' }
          }
        } else {
          row.status = 'error'
          row.attempts = row.attempts + 1
          row.lastError = result.errorMessage
          row.sentence = sentence
          // Keep row active for retry
          setTimeout(() => {
            setRows((r) => {
              const updated = [...r]
              updated[levelIndex] = { ...updated[levelIndex], status: 'active' }
              return updated
            })
          }, 600)
        }

        next[levelIndex] = row
        return next
      })
    },
    [formulas, subjectNoun],
  )

  // Detect completion: all rows accepted
  useEffect(() => {
    if (completed) return
    const allAccepted = rows.every((r) => r.status === 'accepted')
    if (!allAccepted) return

    setCompleted(true)

    const totalAttempts = rows.reduce((sum, r) => sum + r.attempts + 1, 0)
    // The new formula is the last (highest level) row
    const newFormulaRow = rows[rows.length - 1]
    const newFormulaAttempts = (newFormulaRow?.attempts ?? 0) + 1

    onChainComplete({ rows, totalAttempts, newFormulaAttempts })
  }, [rows, completed, onChainComplete])

  if (formulas.length === 0) {
    return (
      <p
        className="text-center text-base py-8"
        style={{ color: 'var(--color-text-muted)' }}
        data-tts="No formula levels available yet. Ask your teacher to set your level."
      >
        No formula levels available yet. Ask your teacher to set your level.
      </p>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto" data-testid="chain-builder">
      {/* Subject banner */}
      <div
        className="mb-6 px-4 py-3 rounded-2xl text-center"
        style={{
          backgroundColor: 'var(--color-brand-primary-light)',
          border: '2px solid var(--color-brand-primary)',
        }}
      >
        <span
          className="text-base font-semibold"
          style={{ color: 'var(--color-brand-primary)' }}
          data-tts={`Today's subject: ${subjectNoun}`}
        >
          Today's subject:{' '}
          <span className="text-xl font-bold">{subjectNoun}</span>
        </span>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-1 mb-4 justify-center">
        {rows.map((row) => (
          <div
            key={row.level}
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: `${Math.max(16, 120 / rows.length)}px`,
              backgroundColor:
                row.status === 'accepted'
                  ? 'var(--color-success)'
                  : row.status === 'active'
                  ? 'var(--color-brand-primary)'
                  : 'var(--color-border)',
            }}
            title={`L${row.level}: ${row.status}`}
          />
        ))}
      </div>

      {/* Chain rows */}
      {rows.map((row, i) => {
        const formula = formulas[i]
        if (!formula || row.status === 'pending') {
          // Show a collapsed placeholder for pending rows
          return (
            <div
              key={row.level}
              className="w-full rounded-2xl p-3 mb-3 flex items-center gap-3 opacity-40"
              style={{ border: '2px solid var(--color-border)' }}
              data-testid={`chain-row-pending-l${row.level}`}
            >
              <span
                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--color-border)' }}
              >
                L{row.level}
              </span>
              <span
                className="text-sm"
                style={{ color: 'var(--color-text-muted)', fontFamily: 'monospace' }}
              >
                {formula.name}
              </span>
            </div>
          )
        }

        return (
          <ChainRow
            key={row.level}
            rowState={row}
            formula={formula}
            subjectNoun={subjectNoun}
            onSubmit={(sentence) => handleSubmit(i, sentence)}
            autoFocus={row.status === 'active'}
            helpMode={helpMode}
          />
        )
      })}
    </div>
  )
}
