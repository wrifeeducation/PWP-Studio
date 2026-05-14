/**
 * WordBankTenseVariety — L3 / L6 tense variety step
 *
 * Presents three sentence trays side by side (PAST / PRESENT / CONTINUOUS).
 * The bank contains three labelled verb-group chip sections.
 * Pupils tap a verb chip to assign it to the matching tray.
 * Noun chips (un-prefixed strings) appear in a shared subject section.
 *
 * bank_words format (flat array, grouped by prefix convention):
 *   Verb chips:  those ending in "ing" → continuous tray
 *                those NOT matching a present-tense heuristic → past
 *                otherwise → present
 *   Noun/proper noun chips: guessed by wordClassColours utility
 *
 * The assembled string is emitted as "PAST:<p> | PRESENT:<pr> | CONTINUOUS:<c>"
 * so the assessor can evaluate each tray independently. The parent LevelPage
 * passes this to the assessment API as-is.
 *
 * Per PWP_Word_Bank_Clarification.md §LEVEL 3.
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { chipColourForWord, getWordClassColour, guessWordClass } from '@/constants/wordClassColours'

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
    'swam','ran','sang','drank','ate','wrote','read','saw','took','made','gave','found',
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
  { id: 'past',       label: 'PAST',       colour: '#FFEDD5', text: '#9A3412' },
  { id: 'present',    label: 'PRESENT',    colour: '#DBEAFE', text: '#1E40AF' },
  { id: 'continuous', label: 'CONTINUOUS', colour: '#DCFCE7', text: '#14532D' },
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
      if (t === 'noun')       nouns.push(w)
      else if (t === 'past')  past.push(w)
      else if (t === 'present') present.push(w)
      else continuous.push(w)
    })
    return {
      nounChips: nouns,
      verbGroups: { past, present, continuous } as Record<TrayId, string[]>,
    }
  }, [bankWords])

  // Each tray holds: subject (from noun section) + verb (from verb group)
  const [traySubject, setTraySubject]  = useState<Record<TrayId, string>>({ past: '', present: '', continuous: '' })
  const [trayVerb, setTrayVerb]        = useState<Record<TrayId, string>>({ past: '', present: '', continuous: '' })

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

  const nounColour = getWordClassColour('noun')

  return (
    <div className="select-none space-y-4">

      {/* ── Subject noun section (shared across all three trays) ─────── */}
      {nounChips.length > 0 && (
        <div className="bg-[#f8f5ff] border-2 border-[#e8e0ff] rounded-xl px-3 py-3 sm:px-4">
          <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: nounColour.bg }}>
            Choose a subject for each tray
          </div>
          <div className="flex flex-wrap gap-2">
            {nounChips.map(word => {
              const { bg, fg } = chipColourForWord(word)
              return (
                <button
                  key={word}
                  className="px-3 py-2 rounded-xl text-sm sm:text-base font-semibold min-h-[44px] border shadow-sm hover:shadow-md active:scale-95 transition-all"
                  style={{ background: bg, color: fg, borderColor: `${fg}30` }}
                  onClick={() => {/* Subject tapped — assign to first empty tray */
                    const firstEmpty = TRAYS.find(t => !traySubject[t.id])
                    if (firstEmpty) pickSubject(firstEmpty.id, word)
                  }}
                  disabled={disabled}
                  data-tts={word}
                >
                  {word}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Three trays ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TRAYS.map(tray => {
          const verbs  = verbGroups[tray.id]
          const subj   = traySubject[tray.id]
          const verb   = trayVerb[tray.id]
          const filled = !!verb

          return (
            <div key={tray.id} className="flex flex-col gap-2">
              {/* Tray label */}
              <div
                className="text-[10px] font-bold uppercase tracking-wider text-center px-2 py-1 rounded-lg"
                style={{ background: tray.colour, color: tray.text }}
              >
                {tray.label}
              </div>

              {/* Sentence preview */}
              <div
                className="bg-white border-2 rounded-xl px-3 py-2 min-h-[52px] flex flex-wrap items-center gap-1.5 transition-colors"
                style={{ borderColor: filled ? tray.text + '80' : '#e0d8ff' }}
              >
                {subj && (
                  <motion.span
                    className="px-2 py-1 rounded-lg text-xs sm:text-sm font-semibold"
                    style={{ ...chipColourForWord(subj), border: '1px solid transparent' }}
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
                      className="px-2 py-1 rounded-lg text-xs sm:text-sm font-semibold"
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
                  <span className="text-[11px] text-[#ccc] italic">Tap a verb below…</span>
                )}
              </div>

              {/* Verb chips for this tray */}
              <div className="flex flex-wrap gap-1.5">
                {verbs.map(w => {
                  const selected = trayVerb[tray.id] === w
                  return (
                    <button
                      key={w}
                      className="px-2 py-1.5 rounded-lg text-xs sm:text-sm font-semibold min-h-[40px] border transition-all"
                      style={{
                        background:  selected ? tray.colour : '#fff',
                        color:       tray.text,
                        borderColor: selected ? tray.text + '80' : '#e0d8ff',
                        boxShadow:   selected ? `0 0 0 2px ${tray.text}30` : 'none',
                      }}
                      onClick={() => pickVerb(tray.id, w)}
                      disabled={disabled}
                      data-tts={w}
                    >
                      {w}
                    </button>
                  )
                })}
              </div>

              {/* Clear tray */}
              {(subj || verb) && !disabled && (
                <button
                  className="text-[10px] text-[#bbb] hover:text-[#888] transition-colors text-right"
                  onClick={() => {
                    const ns = { ...traySubject, [tray.id]: '' }
                    const nv = { ...trayVerb, [tray.id]: '' }
                    setTraySubject(ns); setTrayVerb(nv); emit(ns, nv)
                  }}
                >
                  Clear ✕
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
