/**
 * ConnectGrid — 3-column planning table (spec §5)
 *
 * Sits between the Formula Chain and the Paragraph Builder.
 * Columns:
 *   Col 1 — Structure / Topic sentence (anchor sentence pre-seeds the chosen row)
 *   Col 2 — Theme (Mc plot thread — teacher-provided at W1–W4, pupil at W5–W6)
 *   Col 3 — Events / Facts / Details (scaffolded at W1–W4, blank at W5–W6)
 *
 * W-level governs: how many rows are active, what scaffolding appears,
 * whether the anchor row is locked to Opening (W1–W3) or pupil-chosen (W4–W6).
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Genre,
  GRID_ROW_LABELS,
  GRID_ROW_COUNT_BY_W_LEVEL,
  type GridRowState,
  type GridStageIndex,
  type GridSessionState,
} from '../../types/index'

// ── Genre selector config ─────────────────────────────────────────────────────

const GENRE_CONFIG: {
  value: Genre
  label: string
  emoji: string
  colour: string
  textColour: string
}[] = [
  { value: Genre.NARRATIVE,   label: 'Narrative',   emoji: '📖', colour: '#EDE7F6', textColour: '#6D28D9' },
  { value: Genre.NON_FICTION, label: 'Non-fiction',  emoji: '📰', colour: '#E0F2FE', textColour: '#0369A1' },
  { value: Genre.PERSUASIVE,  label: 'Persuasive',  emoji: '💬', colour: '#FEF3C7', textColour: '#92400E' },
  { value: Genre.POETRY,      label: 'Poetry',      emoji: '🌸', colour: '#FCE7F3', textColour: '#9D174D' },
]

// ── Sensible Col 2 defaults (used when no teacher template exists) ─────────────
// Written impersonally using "Mc" as placeholder per spec

const DEFAULT_COL2: Record<Genre, [string, string, string, string, string]> = {
  [Genre.NARRATIVE]: [
    'Mc arrived at the place for the first time.',
    'Mc noticed something strange and moved closer.',
    'Mc faced the biggest challenge of the journey.',
    'Mc found a way through and things began to change.',
    'Mc looked back and understood what had happened.',
  ],
  [Genre.NON_FICTION]: [
    'This text is about [topic].',
    'One important fact is that Mc [key fact].',
    'Another key point is that Mc [key fact].',
    'For example, Mc [example or counter-point].',
    'In conclusion, Mc [summary statement].',
  ],
  [Genre.PERSUASIVE]: [
    'Mc strongly believes that [claim].',
    'First, Mc argues that [argument 1].',
    'Furthermore, Mc points out that [argument 2].',
    'Some people say [counter-claim], but Mc disagrees because [rebuttal].',
    'Therefore, Mc urges you to [call to action].',
  ],
  [Genre.POETRY]: [
    'Mc saw [opening image].',
    'Mc felt [emotion or sensation] as [development].',
    'But then Mc realised [turn or shift].',
    'Mc understood that [resolution or reflection].',
    'Mc was left with [closing image].',
  ],
}

const DEFAULT_COL3_HINTS: Record<Genre, [string, string, string, string, string]> = {
  [Genre.NARRATIVE]: [
    'Where? What did it look like? How did Mc feel arriving?',
    'What was strange? What sound / sight / smell caught attention?',
    'What went wrong? What did Mc have to do?',
    'How did Mc solve it? Who helped?',
    'What did Mc learn? How was it different from the start?',
  ],
  [Genre.NON_FICTION]: [
    'What is the subject? Why does it matter?',
    'Give one clear fact. Use a number or example.',
    'Give a second fact. How does it link to fact 1?',
    'Give an example OR a different viewpoint.',
    'Sum up in one sentence. Use a connective like "Overall".',
  ],
  [Genre.PERSUASIVE]: [
    'State the issue. Why does it matter to the reader?',
    'Give a reason + evidence or example.',
    'Give another reason. How is it different from reason 1?',
    'What might someone disagree with? How do you answer them?',
    'What do you want the reader to do or believe?',
  ],
  [Genre.POETRY]: [
    'Describe what you can see. Use precise nouns.',
    'Add a sound, smell, or feeling. Use a simile.',
    'Something changes or surprises. Use a short line.',
    'A thought or feeling settles. Use a longer line.',
    'Return to the opening image — but changed. End with a quiet line.',
  ],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildInitialRows(
  genre: Genre,
  wLevel: number,
  anchorSentence: string,
  anchorStageIndex: GridStageIndex,
  col2Defaults: string[],
  col3Hints: string[],
): GridRowState[] {
  const rowCount = GRID_ROW_COUNT_BY_W_LEVEL[wLevel] ?? 1
  const labels = GRID_ROW_LABELS[genre]

  return Array.from({ length: 5 }, (_, i) => {
    const stageIndex = i as GridStageIndex
    const isAnchorRow = stageIndex === anchorStageIndex
    const isActive = i < rowCount

    // Col 1: structural label only (anchor sentence fills on anchor row)
    const col1 = isAnchorRow ? anchorSentence : ''

    // Col 2: teacher/default text at W1-W4, blank hint at W5-W6
    const col2 = wLevel <= 4
      ? (col2Defaults[i] ?? DEFAULT_COL2[genre][i] ?? '')
      : ''

    // Col 3: hint text at W1-W4, blank at W5-W6
    const col3 = wLevel <= 4 && isActive
      ? (col3Hints[i] ?? DEFAULT_COL3_HINTS[genre][i] ?? '')
      : ''

    return {
      stageIndex,
      col1,
      col2,
      col3,
      ready: false,
      isAnchorRow,
      _label: labels[i],   // not part of type but used locally
      _isActive: isActive,
    } as GridRowState & { _label: string; _isActive: boolean }
  })
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ConnectGridProps {
  /** Anchor sentence carried in from the chain */
  anchorSentence: string
  /** W-level from class settings (defaults to 2) */
  wLevel?: 1 | 2 | 3 | 4 | 5 | 6
  /** Pre-set genre (teacher-selected). If null, pupil picks first. */
  initialGenre?: Genre | null
  /** Teacher-provided Col 2 strings per stage (from grid_templates) */
  templateCol2?: string[]
  /** Teacher-provided Col 3 hint strings per stage */
  templateCol3?: string[]
  /** Called when pupil marks the session as done */
  onComplete: (session: GridSessionState) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ConnectGrid({
  anchorSentence,
  wLevel = 2,
  initialGenre = null,
  templateCol2 = [],
  templateCol3 = [],
  onComplete,
}: ConnectGridProps) {
  // ── Phase 1: genre selection (skipped if teacher pre-set) ──────────────────
  const [genre, setGenre] = useState<Genre | null>(initialGenre)

  // ── Phase 2: anchor row selection (W4+ only; W1-W3 default to Opening) ─────
  const [anchorRowChosen, setAnchorRowChosen] = useState<boolean>(wLevel <= 3)

  // ── Phase 3: grid editing ──────────────────────────────────────────────────
  const [rows, setRows] = useState<(GridRowState & { _label: string; _isActive: boolean })[]>([])
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  // Initialise grid once genre + anchor row are confirmed
  const initGrid = useCallback(
    (chosenGenre: Genre, chosenAnchor: GridStageIndex) => {
      const col2 = templateCol2.length === 5 ? templateCol2 : DEFAULT_COL2[chosenGenre]
      const col3 = templateCol3.length === 5 ? templateCol3 : DEFAULT_COL3_HINTS[chosenGenre]
      const initialised = buildInitialRows(
        chosenGenre, wLevel, anchorSentence, chosenAnchor, col2, col3,
      ) as (GridRowState & { _label: string; _isActive: boolean })[]
      setRows(initialised)
      setExpandedRow(chosenAnchor) // open anchor row first
    },
    [anchorSentence, wLevel, templateCol2, templateCol3],
  )

  const handleGenreSelect = (g: Genre) => {
    setGenre(g)
    if (wLevel <= 3) {
      // Anchor always goes in Opening for W1-W3
      initGrid(g, 0)
    }
    // W4+: will now show anchor row picker
  }

  const handleAnchorRowSelect = (idx: GridStageIndex) => {
    setAnchorRowChosen(true)
    initGrid(genre!, idx)
  }

  const updateRow = (stageIndex: number, field: 'col1' | 'col2' | 'col3', value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.stageIndex === stageIndex ? { ...r, [field]: value } : r)),
    )
  }

  const toggleReady = (stageIndex: number) => {
    setRows((prev) =>
      prev.map((r) => (r.stageIndex === stageIndex ? { ...r, ready: !r.ready } : r)),
    )
  }

  const readyRows = rows.filter((r) => r._isActive && r.ready)
  const activeRows = rows.filter((r) => r._isActive)
  const allReady = activeRows.length > 0 && readyRows.length === activeRows.length

  const handleDone = () => {
    if (!genre) return
    onComplete({
      genre,
      wLevel: wLevel as GridSessionState['wLevel'],
      anchorSentence,
      rows: rows.map(({ _label: _l, _isActive: _a, ...r }) => r),
    })
  }

  // ── Render: genre selection ────────────────────────────────────────────────
  if (!genre) {
    return (
      <div className="max-w-xl mx-auto" data-testid="genre-selector">
        <div className="text-center mb-6">
          <p
            className="text-2xl font-bold mb-1"
            style={{ color: 'var(--color-text)' }}
            data-tts="Choose your genre"
          >
            What will you write today?
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Choose a genre to start your Connect Grid
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {GENRE_CONFIG.map((g) => (
            <motion.button
              key={g.value}
              onClick={() => handleGenreSelect(g.value)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="rounded-2xl p-5 text-left focus:outline-none"
              style={{ backgroundColor: g.colour, border: `2px solid ${g.textColour}22` }}
              data-testid={`genre-btn-${g.value}`}
              data-tts={g.label}
            >
              <div className="text-3xl mb-2" aria-hidden="true">{g.emoji}</div>
              <p className="font-bold text-base" style={{ color: g.textColour }}>{g.label}</p>
            </motion.button>
          ))}
        </div>
      </div>
    )
  }

  // ── Render: anchor row picker (W4+ only) ───────────────────────────────────
  if (!anchorRowChosen) {
    const labels = GRID_ROW_LABELS[genre]
    const rowCount = GRID_ROW_COUNT_BY_W_LEVEL[wLevel] ?? 5

    return (
      <div className="max-w-xl mx-auto" data-testid="anchor-row-picker">
        <div className="text-center mb-6">
          <p className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>
            Where does your sentence fit?
          </p>
          <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>
            Choose the story stage that best matches your anchor sentence
          </p>

          <div
            className="rounded-xl p-3 mx-auto max-w-sm text-sm text-left mb-5"
            style={{ backgroundColor: '#EDE7F6', color: '#4C1D95' }}
            data-tts="Your anchor sentence"
          >
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#6D28D9' }}>
              Your anchor sentence
            </p>
            <p className="font-medium leading-snug">"{anchorSentence}"</p>
          </div>
        </div>

        <div className="space-y-2">
          {labels.slice(0, rowCount).map((label, i) => (
            <motion.button
              key={i}
              onClick={() => handleAnchorRowSelect(i as GridStageIndex)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full rounded-xl px-4 py-3 text-left transition-all"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '2px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#6C5CE7')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              data-testid={`anchor-row-${i}`}
            >
              <span className="text-xs font-semibold mr-2 text-[var(--color-text-muted)]">{i + 1}.</span>
              {label}
            </motion.button>
          ))}
        </div>
      </div>
    )
  }

  // ── Render: the grid ───────────────────────────────────────────────────────
  const genreCfg = GENRE_CONFIG.find((g) => g.value === genre)!
  const col2ReadOnly = wLevel <= 4

  return (
    <div className="max-w-2xl mx-auto" data-testid="connect-grid">

      {/* Header strip */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: genreCfg.colour, color: genreCfg.textColour }}
        >
          {genreCfg.emoji} {genreCfg.label}
        </span>
        <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text-muted)' }}>
          W{wLevel}
        </span>
        <span className="text-xs ml-auto" style={{ color: 'var(--color-text-muted)' }}>
          {readyRows.length} / {activeRows.length} rows ready
        </span>
      </div>

      {/* Column headers */}
      <div
        className="grid gap-2 mb-2 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wide"
        style={{
          gridTemplateColumns: '2fr 3fr 3fr',
          backgroundColor: 'var(--color-background)',
          color: 'var(--color-text-muted)',
        }}
      >
        <span>Stage</span>
        <span>Theme (what happens?)</span>
        <span>Details / Events</span>
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {rows.filter((r) => r._isActive).map((row) => {
          const isExpanded = expandedRow === row.stageIndex
          const isAnchor = row.isAnchorRow

          return (
            <motion.div
              key={row.stageIndex}
              layout
              className="rounded-2xl overflow-hidden"
              style={{
                border: `2px solid ${isAnchor ? '#6C5CE7' : row.ready ? '#059669' : 'var(--color-border)'}`,
                backgroundColor: 'var(--color-surface)',
              }}
            >
              {/* Row header — tap to expand */}
              <button
                type="button"
                onClick={() => setExpandedRow(isExpanded ? null : row.stageIndex)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
                data-testid={`row-header-${row.stageIndex}`}
                data-tts={row._label}
              >
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: isAnchor ? '#6C5CE7' : row.ready ? '#059669' : 'var(--color-background)',
                    color: (isAnchor || row.ready) ? '#fff' : 'var(--color-text-muted)',
                  }}
                  aria-hidden="true"
                >
                  {row.ready ? '✓' : row.stageIndex + 1}
                </span>

                <span className="flex-1 text-sm font-semibold" style={{ color: isAnchor ? '#6C5CE7' : 'var(--color-text)' }}>
                  {row._label}
                  {isAnchor && <span className="ml-2 text-xs font-normal" style={{ color: '#9F7AEA' }}>⚓ anchor row</span>}
                </span>

                {row.col1 && !isExpanded && (
                  <span className="text-xs truncate max-w-[140px] hidden sm:block" style={{ color: 'var(--color-text-muted)' }}>
                    {row.col1.slice(0, 50)}…
                  </span>
                )}

                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }} aria-hidden="true">
                  {isExpanded ? '▲' : '▼'}
                </span>
              </button>

              {/* Expanded content */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="grid gap-3 px-4 pb-4"
                      style={{ gridTemplateColumns: '1fr 1fr' }}
                    >
                      {/* Col 1 — topic sentence */}
                      <div className="col-span-2">
                        <label
                          className="block text-xs font-semibold mb-1 uppercase tracking-wide"
                          style={{ color: '#6C5CE7' }}
                          data-tts="Column 1, topic sentence"
                        >
                          ✏️ Topic sentence
                          {isAnchor && <span className="ml-1 font-normal text-xs" style={{ color: '#9F7AEA' }}>(from your chain)</span>}
                        </label>
                        {isAnchor ? (
                          // Anchor sentence is read-only
                          <div
                            className="w-full rounded-xl px-3 py-2 text-sm"
                            style={{
                              backgroundColor: '#EDE7F6',
                              color: '#4C1D95',
                              border: '2px solid #C4B5FD',
                            }}
                            data-tts={row.col1}
                          >
                            {row.col1}
                          </div>
                        ) : (
                          <textarea
                            value={row.col1}
                            onChange={(e) => updateRow(row.stageIndex, 'col1', e.target.value)}
                            placeholder="Write your topic sentence for this paragraph…"
                            rows={2}
                            className="w-full rounded-xl px-3 py-2 text-sm resize-none outline-none"
                            style={{
                              backgroundColor: 'var(--color-background)',
                              border: '2px solid var(--color-border)',
                              color: 'var(--color-text)',
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = '#6C5CE7')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                            data-testid={`col1-${row.stageIndex}`}
                            data-tts="Topic sentence field"
                          />
                        )}
                      </div>

                      {/* Col 2 — theme / Mc plot thread */}
                      <div>
                        <label
                          className="block text-xs font-semibold mb-1 uppercase tracking-wide"
                          style={{ color: '#0369A1' }}
                          data-tts="Column 2, theme or plot thread"
                        >
                          🔵 Theme (Mc)
                        </label>
                        {col2ReadOnly ? (
                          // Teacher text — read only at W1-W4
                          <div
                            className="rounded-xl px-3 py-2 text-sm leading-relaxed"
                            style={{
                              backgroundColor: '#E0F2FE',
                              color: '#075985',
                              border: '1.5px solid #BAE6FD',
                              minHeight: 64,
                            }}
                            data-tts={row.col2}
                          >
                            {row.col2 || <span style={{ color: '#93C5FD', fontStyle: 'italic' }}>Teacher will fill this in</span>}
                          </div>
                        ) : (
                          <textarea
                            value={row.col2}
                            onChange={(e) => updateRow(row.stageIndex, 'col2', e.target.value)}
                            placeholder="Write what happens (use Mc instead of names)…"
                            rows={3}
                            className="w-full rounded-xl px-3 py-2 text-sm resize-none outline-none"
                            style={{
                              backgroundColor: 'var(--color-background)',
                              border: '2px solid var(--color-border)',
                              color: 'var(--color-text)',
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = '#0369A1')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                            data-testid={`col2-${row.stageIndex}`}
                            data-tts="Theme field"
                          />
                        )}
                      </div>

                      {/* Col 3 — events / details */}
                      <div>
                        <label
                          className="block text-xs font-semibold mb-1 uppercase tracking-wide"
                          style={{ color: '#92400E' }}
                          data-tts="Column 3, events and details"
                        >
                          🟡 Details
                        </label>
                        <textarea
                          value={row.col3}
                          onChange={(e) => updateRow(row.stageIndex, 'col3', e.target.value)}
                          placeholder={DEFAULT_COL3_HINTS[genre]?.[row.stageIndex] ?? 'Add your details…'}
                          rows={3}
                          className="w-full rounded-xl px-3 py-2 text-sm resize-none outline-none"
                          style={{
                            backgroundColor: 'var(--color-background)',
                            border: '2px solid var(--color-border)',
                            color: 'var(--color-text)',
                          }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = '#92400E')}
                          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                          data-testid={`col3-${row.stageIndex}`}
                          data-tts="Details field"
                        />
                      </div>

                      {/* Row ready button */}
                      <div className="col-span-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => toggleReady(row.stageIndex)}
                          className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
                          style={{
                            backgroundColor: row.ready ? '#059669' : 'var(--color-background)',
                            color: row.ready ? '#fff' : 'var(--color-text-muted)',
                            border: `1.5px solid ${row.ready ? '#059669' : 'var(--color-border)'}`,
                          }}
                          data-testid={`row-ready-${row.stageIndex}`}
                          data-tts={row.ready ? 'Mark as not ready' : 'Mark row as ready'}
                        >
                          {row.ready ? '✓ Done' : 'Mark as done'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* Complete button */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: allReady ? 1 : 0.4, y: 0 }}
        className="mt-6"
      >
        <button
          type="button"
          onClick={handleDone}
          disabled={!allReady}
          className="w-full py-4 rounded-2xl text-base font-bold text-white transition-opacity disabled:cursor-not-allowed"
          style={{ backgroundColor: allReady ? '#6C5CE7' : '#9CA3AF' }}
          data-testid="grid-done-btn"
          data-tts="Finish planning and write my paragraph"
        >
          {allReady ? '✏️ Write my paragraph →' : `Complete all ${activeRows.length} rows first`}
        </button>
      </motion.div>
    </div>
  )
}
