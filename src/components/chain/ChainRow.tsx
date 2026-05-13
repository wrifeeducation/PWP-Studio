/**
 * PWP Daily Chain Practice — ChainRow
 *
 * One row in the chain builder. Shows:
 *   - Level badge (e.g. "L3")
 *   - Formula name + coloured word-class chips (always visible for L1–4)
 *   - Word bank: tappable coloured word chips (always open L1–4, toggle L5–8)
 *   - Sentence input (when active) OR accepted sentence (when done)
 *   - Inline validation error
 *
 * States: pending | active | accepted | error
 * Max 200 lines.
 */

import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WordClass } from '../../types/index'
import type { ChainRowState } from '../../types/index'
import type { ChainFormulaDefinition } from '../../lib/chain/formulaDefinitions'

// ─── Word-class colour map ────────────────────────────────────────────────────

const WC_COLOUR: Record<WordClass, string> = {
  [WordClass.DETERMINER]:  '#9B59B6',
  [WordClass.ADJECTIVE]:   '#27AE60',
  [WordClass.NOUN]:        '#2980B9',
  [WordClass.VERB]:        '#C0392B',
  [WordClass.ADVERB]:      '#E67E22',
  [WordClass.PREPOSITION]: '#795548',
  [WordClass.PRONOUN]:     '#E91E63',
  [WordClass.CONJUNCTION]: '#8B7A00',
}

const WC_LABEL: Record<WordClass, string> = {
  [WordClass.DETERMINER]:  'Describing word',
  [WordClass.ADJECTIVE]:   'Describing word',
  [WordClass.NOUN]:        'Naming word',
  [WordClass.VERB]:        'Doing word',
  [WordClass.ADVERB]:      'How/when word',
  [WordClass.PREPOSITION]: 'Position word',
  [WordClass.PRONOUN]:     'Pronoun',
  [WordClass.CONJUNCTION]: 'Joining word',
}

const WC_SHORT: Record<WordClass, string> = {
  [WordClass.DETERMINER]:  'DET',
  [WordClass.ADJECTIVE]:   'ADJ',
  [WordClass.NOUN]:        'NOUN',
  [WordClass.VERB]:        'VERB',
  [WordClass.ADVERB]:      'ADV',
  [WordClass.PREPOSITION]: 'PREP',
  [WordClass.PRONOUN]:     'PRON',
  [WordClass.CONJUNCTION]: 'CONJ',
}

// Word bank always open for early levels; toggle for mid levels; hidden above 8
const WORD_BANK_ALWAYS_OPEN_MAX = 4
const WORD_BANK_TOGGLE_MAX      = 8

interface ChainRowProps {
  rowState: ChainRowState
  formula: ChainFormulaDefinition
  subjectNoun: string
  /**
   * The accepted (punctuated) sentence from the previous step.
   * Shown as a scaffold so the pupil can evolve it into this step's formula.
   * Undefined for the first row.
   */
  previousSentence?: string
  onSubmit: (sentence: string) => void
  /** Called when pupil confirms capitalisation + punctuation */
  onPunctuationConfirmed: (punctuatedSentence: string) => void
  autoFocus?: boolean
  helpMode?: boolean
}

export const ChainRow: React.FC<ChainRowProps> = ({
  rowState,
  formula,
  subjectNoun,
  previousSentence,
  onSubmit,
  onPunctuationConfirmed,
  autoFocus = false,
  helpMode = false,
}) => {
  const [draft, setDraft] = useState(rowState.sentence)
  const [hintOpen, setHintOpen] = useState(false)
  const [wordBankOpen, setWordBankOpen] = useState(formula.level <= WORD_BANK_ALWAYS_OPEN_MAX)
  const inputRef = useRef<HTMLInputElement>(null)

  // Punctuation step state
  const [capitalised, setCapitalised] = useState(false)
  const [chosenPunct, setChosenPunct] = useState<'.' | '!' | '?' | null>(null)

  // Reset punctuation state whenever the row enters 'punctuating'
  useEffect(() => {
    if (rowState.status === 'punctuating') {
      setCapitalised(false)
      setChosenPunct(null)
    }
  }, [rowState.status])

  useEffect(() => {
    if (autoFocus && rowState.status === 'active' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus, rowState.status])

  useEffect(() => {
    if (rowState.status !== 'active') setDraft(rowState.sentence)
  }, [rowState.status, rowState.sentence])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && draft.trim().length >= 3) onSubmit(draft.trim())
  }

  /** Tap a word chip → append to draft with a space */
  const handleWordTap = (word: string) => {
    setDraft((prev) => {
      const trimmed = prev.trimEnd()
      return trimmed ? `${trimmed} ${word}` : word
    })
    inputRef.current?.focus()
  }

  const isAccepted     = rowState.status === 'accepted'
  const isActive       = rowState.status === 'active'
  const isError        = rowState.status === 'error'
  const isPending      = rowState.status === 'pending'
  const isPunctuating  = rowState.status === 'punctuating'

  const borderColour =
    isAccepted    ? '#27AE60' :
    isPunctuating ? '#F5A623' :
    isError       ? '#E74C3C' :
    isActive      ? '#6C5CE7' :
    '#D0D5DD'

  // Build the display sentence for the punctuation step
  const rawSentence = rowState.sentence
  const firstLetter = rawSentence.charAt(0)
  const rest        = rawSentence.slice(1)
  const displayFirst = capitalised ? firstLetter.toUpperCase() : firstLetter.toLowerCase()
  const punctuatedPreview = `${displayFirst}${rest}${chosenPunct ?? '…'}`

  const handlePunctuationSave = () => {
    if (!chosenPunct) return
    const final = `${displayFirst}${rest}${chosenPunct}`
    onPunctuationConfirmed(final)
  }

  const hasWordBank = !!formula.wordBank && formula.level <= WORD_BANK_TOGGLE_MAX
  const showWordBankToggle = hasWordBank && formula.level > WORD_BANK_ALWAYS_OPEN_MAX

  // Collect word bank chips with word-class colour
  const wordBankChips: { word: string; colour: string; wc: string }[] = []
  if (formula.wordBank) {
    const wb = formula.wordBank
    wb.nouns?.forEach((w)        => wordBankChips.push({ word: w, colour: WC_COLOUR[WordClass.NOUN],        wc: 'naming word' }))
    wb.verbs?.forEach((w)        => wordBankChips.push({ word: w, colour: WC_COLOUR[WordClass.VERB],        wc: 'doing word' }))
    wb.adjectives?.forEach((w)   => wordBankChips.push({ word: w, colour: WC_COLOUR[WordClass.ADJECTIVE],   wc: 'describing word' }))
    wb.adverbs?.forEach((w)      => wordBankChips.push({ word: w, colour: WC_COLOUR[WordClass.ADVERB],      wc: 'how/when word' }))
    wb.prepositions?.forEach((w) => wordBankChips.push({ word: w, colour: WC_COLOUR[WordClass.PREPOSITION], wc: 'position word' }))
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      data-testid={`chain-row-l${formula.level}`}
      style={{
        border: `2px solid ${borderColour}`,
        borderRadius: 20,
        padding: '16px 16px 12px',
        marginBottom: 14,
        backgroundColor: isAccepted ? '#F0FAF4' : '#FDFAF5',
        opacity: isPending ? 0.45 : 1,
        transition: 'border-color 0.2s, background-color 0.2s',
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <span
          data-testid={`level-badge-${formula.level}`}
          data-tts={`Level ${formula.level}`}
          style={{
            flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 40, height: 40, borderRadius: '50%',
            fontSize: 13, fontWeight: 900, color: '#fff',
            backgroundColor: isAccepted ? '#27AE60' : '#6C5CE7',
          }}
        >
          L{formula.level}
        </span>

        <span
          style={{ fontSize: 13, fontWeight: 700, color: '#5A5A72', flex: 1, fontFamily: 'monospace' }}
          data-tts={`Formula: ${formula.name}`}
        >
          {formula.name}
        </span>

        <span
          style={{
            flexShrink: 0, padding: '2px 8px', borderRadius: 10,
            fontSize: 11, fontWeight: 800,
            backgroundColor: '#E8F8EF', color: '#1A7A45',
            border: '1px solid #27AE6055',
          }}
          data-tts={`New this level: ${formula.newElement}`}
        >
          {formula.newElement}
        </span>

        {isAccepted && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ fontSize: 20 }} aria-label="Accepted">✅</motion.span>
        )}

        <button
          type="button"
          onClick={() => setHintOpen((o) => !o)}
          data-testid={`hint-toggle-l${formula.level}`}
          data-tts={hintOpen ? 'Hide hint' : 'Show hint'}
          style={{
            padding: '4px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700,
            cursor: 'pointer', border: 'none', backgroundColor: '#EDE7F6', color: '#6C5CE7',
          }}
        >
          {hintOpen ? 'Hide' : '💡 Hint'}
        </button>
      </div>

      {/* ── Formula pattern chips (always shown L1–4, or in helpMode) ── */}
      {(helpMode || formula.level <= WORD_BANK_ALWAYS_OPEN_MAX) && (
        <div
          style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}
          data-testid={`help-band-l${formula.level}`}
          data-tts={`Formula pattern: ${formula.pattern.map((wc) => WC_SHORT[wc]).join(', ')}`}
        >
          {formula.pattern.map((wc, idx) => (
            <span
              key={idx}
              title={WC_LABEL[wc]}
              style={{
                padding: '3px 10px', borderRadius: 20,
                backgroundColor: WC_COLOUR[wc], color: '#fff',
                fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
              }}
            >
              {WC_SHORT[wc]}
            </span>
          ))}
        </div>
      )}

      {/* ── Hint panel ── */}
      <AnimatePresence>
        {hintOpen && (
          <motion.div key="hint"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
            <div style={{
              marginBottom: 10, padding: '10px 14px', borderRadius: 14,
              backgroundColor: '#FFF8E7', border: '1px solid #F5A62344',
              fontSize: 14, color: '#4A3000',
            }} data-tts={formula.hint}>
              <p style={{ margin: '0 0 4px' }}>{formula.hint}</p>
              <p style={{ margin: 0, fontStyle: 'italic', color: '#7A6000', fontSize: 13 }}>
                Example: {formula.example}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Accepted sentence ── */}
      {isAccepted && (
        <p style={{ fontSize: 17, fontWeight: 600, color: '#1A7A45', margin: 0 }}
          data-tts={`Your sentence: ${rowState.punctuatedSentence ?? rowState.sentence}`}>
          {rowState.punctuatedSentence ?? rowState.sentence}
        </p>
      )}

      {/* ── Punctuation step ── */}
      {isPunctuating && (
        <motion.div
          key="punctuate"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          data-testid={`punctuate-panel-l${formula.level}`}
        >
          {/* Instruction */}
          <p style={{ fontSize: 13, fontWeight: 700, color: '#7A5800', marginBottom: 10,
            padding: '6px 12px', borderRadius: 10, backgroundColor: '#FFF8E7', textAlign: 'center' }}
            data-tts="Now fix your sentence! Tap the first letter to make it a capital, then choose the correct punctuation.">
            ✏️ Fix your sentence — tap the first letter, then choose the punctuation!
          </p>

          {/* Sentence display: first letter is tappable */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 0, marginBottom: 14,
            padding: '10px 16px', borderRadius: 14, backgroundColor: '#fff',
            border: '2px solid #F5A62355', fontSize: 20, fontWeight: 600, color: '#2D3436',
            flexWrap: 'wrap' }}
            data-tts={`Sentence preview: ${punctuatedPreview}`}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => setCapitalised((c) => !c)}
              data-testid="capitalise-btn"
              data-tts={capitalised ? 'First letter is capital — tap to make it lowercase' : 'Tap to capitalise the first letter'}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 20, fontWeight: 900,
                backgroundColor: capitalised ? '#6C5CE7' : '#EDE7F6',
                color: capitalised ? '#fff' : '#6C5CE7',
                marginRight: 2, transition: 'background-color 0.15s',
              }}
              title="Tap to toggle capital letter"
            >
              {displayFirst}
            </motion.button>
            <span>{rest}</span>
            <span style={{ color: chosenPunct ? '#27AE60' : '#D0D5DD', marginLeft: 2 }}>
              {chosenPunct ?? '…'}
            </span>
          </div>

          {/* Punctuation picker */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, justifyContent: 'center' }}>
            {(['.', '!', '?'] as const).map((p) => (
              <motion.button
                key={p}
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => setChosenPunct(p)}
                data-testid={`punct-btn-${p}`}
                data-tts={p === '.' ? 'Full stop' : p === '!' ? 'Exclamation mark' : 'Question mark'}
                style={{
                  width: 64, height: 64, borderRadius: 16, border: 'none', cursor: 'pointer',
                  fontSize: 30, fontWeight: 900,
                  backgroundColor: chosenPunct === p ? '#6C5CE7' : '#F0ECFF',
                  color: chosenPunct === p ? '#fff' : '#6C5CE7',
                  transition: 'background-color 0.15s',
                  boxShadow: chosenPunct === p ? '0 4px 12px rgba(108,92,231,0.4)' : 'none',
                }}
              >
                {p}
              </motion.button>
            ))}
          </div>

          {/* Save button */}
          <button
            type="button"
            onClick={handlePunctuationSave}
            disabled={!chosenPunct}
            data-testid="punctuation-save-btn"
            data-tts="Save my sentence"
            style={{
              width: '100%', padding: '12px', borderRadius: 14, border: 'none',
              fontSize: 16, fontWeight: 800, cursor: chosenPunct ? 'pointer' : 'not-allowed',
              backgroundColor: chosenPunct ? '#27AE60' : '#D0D5DD',
              color: '#fff', transition: 'background-color 0.2s',
            }}
          >
            {chosenPunct ? `Save — "${punctuatedPreview}" ✓` : 'Choose the punctuation first'}
          </button>
        </motion.div>
      )}

      {/* ── Active input ── */}
      {isActive && (
        <>
          {/* ── Previous sentence scaffold (steps 2+) ── */}
          {previousSentence && (
            <div
              style={{
                marginBottom: 12,
                padding: '10px 14px',
                borderRadius: 14,
                backgroundColor: '#EDE7F6',
                border: '1.5px solid #6C5CE755',
              }}
              data-tts={`Build on your previous sentence: ${previousSentence}`}
              data-testid="previous-sentence-scaffold"
            >
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800,
                color: '#6C5CE7', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Build on this ↓
              </p>
              <p style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 600, color: '#2D3436' }}>
                {previousSentence}
              </p>
              {/* Previous sentence words as tappable chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}
                data-tts="Tap a word to add it to your new sentence">
                {previousSentence
                  .replace(/[.!?,]/g, '')
                  .split(' ')
                  .filter(Boolean)
                  .map((word, i) => (
                    <motion.button
                      key={i}
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleWordTap(word)}
                      data-testid={`prev-word-chip-${i}`}
                      data-tts={`Add word: ${word}`}
                      style={{
                        padding: '5px 12px', borderRadius: 16,
                        backgroundColor: '#6C5CE7', color: '#fff',
                        fontSize: 14, fontWeight: 700, border: 'none',
                        cursor: 'pointer', minHeight: 34,
                      }}
                    >
                      {word}
                    </motion.button>
                  ))}
              </div>
            </div>
          )}

          {/* Word bank */}
          {hasWordBank && (
            <div style={{ marginBottom: 10 }}>
              {showWordBankToggle && (
                <button type="button" onClick={() => setWordBankOpen((o) => !o)}
                  style={{
                    marginBottom: 6, padding: '4px 12px', borderRadius: 10, fontSize: 12,
                    fontWeight: 700, cursor: 'pointer', border: 'none',
                    backgroundColor: '#E3F2FD', color: '#1565C0',
                  }}
                  data-tts={wordBankOpen ? 'Hide word ideas' : 'Show word ideas'}>
                  {wordBankOpen ? '🔤 Hide words' : '🔤 Word ideas'}
                </button>
              )}
              <AnimatePresence>
                {wordBankOpen && (
                  <motion.div key="wordbank"
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} data-tts="Word bank — tap a word to add it">
                      {wordBankChips.map(({ word, colour, wc }, i) => (
                        <motion.button key={i} type="button" whileTap={{ scale: 0.92 }}
                          onClick={() => handleWordTap(word)}
                          title={wc}
                          data-testid={`word-chip-${word}`}
                          data-tts={`${word} — ${wc}`}
                          style={{
                            padding: '7px 16px', borderRadius: 20,
                            backgroundColor: colour, color: '#fff',
                            fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', minHeight: 38,
                          }}>
                          {word}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Input + check */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Write your sentence using "${subjectNoun}"…`}
              maxLength={120}
              autoComplete="off"
              data-testid={`sentence-input-l${formula.level}`}
              data-tts={`Type your level ${formula.level} sentence`}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 14, fontSize: 17, outline: 'none',
                border: `2px solid ${isError ? '#E74C3C' : '#6C5CE7'}`,
                color: '#2D3436', backgroundColor: '#fff',
              }}
            />
            <button
              type="button"
              onClick={() => draft.trim().length >= 3 && onSubmit(draft.trim())}
              disabled={draft.trim().length < 3}
              data-testid={`check-btn-l${formula.level}`}
              data-tts="Check my sentence"
              style={{
                padding: '12px 18px', borderRadius: 14, fontSize: 16, fontWeight: 800,
                color: '#fff', border: 'none', cursor: 'pointer',
                backgroundColor: '#F5A623', minWidth: 80,
                opacity: draft.trim().length < 3 ? 0.4 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              Check ✓
            </button>
          </div>

          {rowState.attempts > 0 && (
            <p style={{ marginTop: 4, fontSize: 12, color: '#888' }} data-tts={`Attempt ${rowState.attempts + 1}`}>
              Attempt {rowState.attempts + 1}
            </p>
          )}
        </>
      )}

      {/* ── Error feedback ── */}
      <AnimatePresence>
        {isError && rowState.lastError && (
          <motion.div key="error"
            initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            style={{
              marginTop: 8, padding: '8px 14px', borderRadius: 12, fontSize: 14,
              backgroundColor: '#FFF0F0', color: '#C0392B',
              border: '1px solid #E74C3C55',
            }}
            data-testid={`error-msg-l${formula.level}`}
            data-tts={`Feedback: ${rowState.lastError}`}>
            {rowState.lastError}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
