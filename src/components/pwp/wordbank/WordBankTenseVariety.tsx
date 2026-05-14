/**
 * WordBankTenseVariety — L3 / L6 tense variety step
 *
 * Redesigned (2026-05-14) for clarity:
 *   - Instruction banner explains the task step-by-step before the pupil starts.
 *   - Each tray has its OWN subject selector so pupils choose who goes in each
 *     sentence explicitly, rather than a confusing shared pool that auto-assigns.
 *   - Verb chips remain tray-specific (grouped by tense).
 *   - Sentence preview inside each tray shows what's been built so far.
 *
 * bank_words format (flat array):
 *   Nouns/proper nouns → subject chips for all three trays
 *   Verb tense detection: -ing → continuous, -ed / irregular → past, else → present
 *
 * Assembled string: "PAST:<subject> <verb> | PRESENT:<subject> <verb> | CONTINUOUS:<subject> <verb>"
 * Parent LevelPage passes this to the assessment API as-is.
 *
 * Per PWP_Word_Bank_Clarification.md §LEVEL 3.
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { chipColourForWord, guessWordClass } from '@/constants/wordClassColours'

// ─── Tense detection heuristic ────────────────────────────────────────────────

function detectTense(word: string): 'past' | 'present' | 'continuous' | 'noun' {
  const w = word.trim()
  // Multi-word continuous ("is running", "is walking")
  if (/^(is|are|was)\s+\w+ing$/.test(w)) return 'continuous'
  // Single -ing form
  if (w.endsWith('ing') && !['ring', 'king', 'wing', 'sing', 'bring', 'spring'].includes(w)) return 'continuous'
  // Past tense heuristics: ends in -ed or known irregular past
  const PAST_IRREGULARS = new Set(['ran','fell','walked','jumped','skipped','played','shouted',
    'kicked','pushed','threw','grabbed','carried','dropped','went','came','sat','stood','flew',
    'swam','sang','drank','ate','wrote','read','saw','took','made','gave','found',
    'told','thought','knew','got','said','left','put','set','met','led','fed','held',
    'beat','cut','hit','hurt','let','shut','spread','burst','cast','cost','shed'])
  if (w.endsWith('ed') || PAST_IRREGULARS.has(w)) return 'past'
  // Guess noun/proper noun
  const wc = guessWordClass(w)
  if (wc === 'noun' || wc === 'proper' || wc === 'place') return 'noun'
  // Default: present tense
  return 'present'
}

// ─── Tray config ─────────────────────────────────────────────────────────────

const TRAYS = [
  { id: 'past',       label: 'PAST',       colour: '#FFEDD5', text: '#9A3412', example: 'e.g. Maya ran.'        },
  { id: 'present',    label: 'PRESENT',    colour: '#DBEAFE', text: '#1E40AF', example: 'e.g. Jordan runs.'     },
  { id: 'continuous', label: 'CONTINUOUS', colour: '#DCFCE7', text: '#14532D', example: 'e.g. Tom is running.'  },
] as const

type TrayId = typeof TRAYS[number]['id']

// ─── Props ───────────────────────────────────────────────────────────────────

export interface WordBankTenseVarietyProps {
  bankWords: string[]
  onChange:  (assembled: string) => void
  disabled:  boolean
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WordBankTenseVariety({ bankWords, onChange, disabled }: WordBankTenseVarietyProps) {
  // Separate bank words into noun chips and tense-grouped verb chips
  const { nounChips, verbGroups } = useMemo(() => {
    const nouns: string[] = []
    const past: string[]  = []
    const present: string[] = []
    const continuous: string[] = []
    bankWords.forEach(w => {
      const t = detectTense(w)
      if (t === 'noun')         nouns.push(w)
      else if (t === 'past')    past.push(w)
      else if (t === 'present') present.push(w)
      else                      continuous.push(w)
    })
    return { nounChips: nouns, verbGroups: { past, present, continuous } as Record<TrayId, string[]> }
  }, [bankWords])

  // Per-tray state: each tray has its own subject + verb choice
  const [traySubject, setTraySubject] = useState<Record<TrayId, string>>({ past: '', present: '', continuous: '' })
  const [trayVerb,    setTrayVerb]    = useState<Record<TrayId, string>>({ past: '', present: '', continuous: '' })

  const emit = (subjects: Record<TrayId, string>, verbs: Record<TrayId, string>) => {
    const parts = TRAYS.map(t => `${t.label}:${subjects[t.id]} ${verbs[t.id]}`.trim())
    onChange(parts.filter(p => !p.endsWith(':')).join(' | '))
  }

  const pickSubject = (trayId: TrayId, word: string) => {
    if (disabled) return
    const next = { ...traySubject, [trayId]: traySubject[trayId] === word ? '' : word }
    setTraySubject(next)
    emit(next, trayVerb)
  }

  const pickVerb = (trayId: TrayId, word: string) => {
    if (disabled) return
    const next = { ...trayVerb, [trayId]: trayVerb[trayId] === word ? '' : word }
    setTrayVerb(next)
    emit(traySubject, next)
  }

  const allDone = TRAYS.every(t => traySubject[t.id] && trayVerb[t.id])

  return (
    <div className="select-none space-y-4">

      {/* ── Instruction banner ─────────────────────────────────────────── */}
      <div className="bg-[#f0ecff] border-2 border-[#e0d8ff] rounded-xl px-4 py-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#6C5CE7] mb-1">
          🎯 Your task — build 3 sentences, one for each tense
        </div>
        <ol className="text-[12px] text-[#555] space-y-[3px] list-none pl-0">
          <li className="flex items-start gap-2">
            <span className="font-extrabold text-[#6C5CE7] flex-shrink-0">1.</span>
            <span>For each coloured box below, tap a <strong>name</strong> to choose your subject.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-extrabold text-[#6C5CE7] flex-shrink-0">2.</span>
            <span>Then tap a <strong>verb</strong> from that box's list — it must match the tense label.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-extrabold text-[#6C5CE7] flex-shrink-0">3.</span>
            <span>Fill all three boxes, then submit.</span>
          </li>
        </ol>
      </div>

      {/* ── Three trays — stacked on mobile, side-by-side on sm+ ────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {TRAYS.map(tray => {
          const verbs  = verbGroups[tray.id]
          const subj   = traySubject[tray.id]
          const verb   = trayVerb[tray.id]
          const filled = !!subj && !!verb

          return (
            <div
              key={tray.id}
              className="rounded-2xl border-2 overflow-hidden flex flex-col"
              style={{ borderColor: tray.text + '40', boxShadow: filled ? `0 2px 12px ${tray.text}18` : undefined }}
            >
              {/* Tray header */}
              <div
                className="px-3 py-2 flex items-center justify-between"
                style={{ background: tray.colour }}
              >
                <span
                  className="text-[11px] font-extrabold uppercase tracking-wider"
                  style={{ color: tray.text }}
                >
                  {tray.label} tense
                </span>
                <span className="text-[10px] italic" style={{ color: tray.text + 'b0' }}>
                  {tray.example}
                </span>
              </div>

              {/* Sentence preview */}
              <div
                className="px-3 py-2 min-h-[48px] flex flex-wrap items-center gap-1.5 bg-white border-b"
                style={{ borderColor: tray.text + '20' }}
              >
                {subj && (
                  <motion.span
                    className="px-2 py-1 rounded-lg text-xs font-semibold"
                    style={{ ...chipColourForWord(subj) }}
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    {subj}
                  </motion.span>
                )}
                <AnimatePresence>
                  {verb && (
                    <motion.span
                      key={verb}
                      className="px-2 py-1 rounded-lg text-xs font-semibold"
                      style={{ background: tray.colour, color: tray.text, border: `1px solid ${tray.text}30` }}
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                    >
                      {verb}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!subj && !verb && (
                  <span className="text-[11px] text-[#bbb] italic">Tap a name, then a verb…</span>
                )}
                {subj && !verb && (
                  <span className="text-[11px] text-[#bbb] italic">Now tap a verb below…</span>
                )}
                {filled && (
                  <motion.span
                    className="ml-auto text-[11px] font-bold"
                    style={{ color: tray.text }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    ✓
                  </motion.span>
                )}
              </div>

              {/* Tray body: subjects + verbs */}
              <div className="px-3 py-2 flex flex-col gap-2 flex-1 bg-white">

                {/* Subject chips for THIS tray */}
                {nounChips.length > 0 && (
                  <div>
                    <div
                      className="text-[9px] font-bold uppercase tracking-wider mb-1"
                      style={{ color: tray.text + '90' }}
                    >
                      Choose a name:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {nounChips.map(word => {
                        const { bg, fg } = chipColourForWord(word)
                        const selected = traySubject[tray.id] === word
                        return (
                          <button
                            key={word}
                            className="px-2 py-1 rounded-lg text-xs font-semibold min-h-[36px] border transition-all"
                            style={{
                              background:  selected ? bg : '#fff',
                              color:       fg,
                              borderColor: selected ? `${fg}80` : '#e0d8ff',
                              boxShadow:   selected ? `0 0 0 2px ${fg}25` : 'none',
                              opacity:     disabled ? 0.5 : 1,
                            }}
                            onClick={() => pickSubject(tray.id, word)}
                            disabled={disabled}
                            aria-pressed={selected}
                            data-tts={word}
                          >
                            {word}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Verb chips for this tray */}
                <div>
                  <div
                    className="text-[9px] font-bold uppercase tracking-wider mb-1"
                    style={{ color: tray.text + '90' }}
                  >
                    Choose a verb:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {verbs.map(w => {
                      const selected = trayVerb[tray.id] === w
                      return (
                        <button
                          key={w}
                          className="px-2 py-1.5 rounded-lg text-xs font-semibold min-h-[36px] border transition-all"
                          style={{
                            background:  selected ? tray.colour : '#fff',
                            color:       tray.text,
                            borderColor: selected ? tray.text + '80' : '#e0d8ff',
                            boxShadow:   selected ? `0 0 0 2px ${tray.text}30` : 'none',
                            opacity:     disabled ? 0.5 : 1,
                          }}
                          onClick={() => pickVerb(tray.id, w)}
                          disabled={disabled}
                          aria-pressed={selected}
                          data-tts={w}
                        >
                          {w}
                        </button>
                      )
                    })}
                  </div>
                </div>

              </div>

              {/* Clear tray link */}
              {(subj || verb) && !disabled && (
                <div className="px-3 pb-2 bg-white">
                  <button
                    className="text-[10px] text-[#bbb] hover:text-[#888] transition-colors"
                    onClick={() => {
                      const ns = { ...traySubject, [tray.id]: '' }
                      const nv = { ...trayVerb, [tray.id]: '' }
                      setTraySubject(ns); setTrayVerb(nv); emit(ns, nv)
                    }}
                  >
                    Clear ✕
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Progress nudge ─────────────────────────────────────────────── */}
      {!allDone && (
        <div className="text-center text-[11px] text-[#aaa]">
          {TRAYS.filter(t => traySubject[t.id] && trayVerb[t.id]).length} of 3 sentences built
        </div>
      )}
      {allDone && (
        <motion.div
          className="text-center text-[12px] font-bold text-[#6C5CE7]"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          ✅ All three sentences ready — tap Submit!
        </motion.div>
      )}

    </div>
  )
}
