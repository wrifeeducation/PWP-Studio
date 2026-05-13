// ParagraphBuilder — LSC scaffold UI for paragraph steps (L29–35)
//
// Three-section form: Lead (L) → Support (S, 2-3 sentences) → Close (C)
// Emits assembled string via onChange when all required parts are filled.
// Emits raw parts via onPartsChange so LevelPage can call assessParagraphClose.
// onChange('') is emitted whenever the paragraph is incomplete → disables Submit.

import { useEffect, useState } from 'react'
import type { PwpStep } from '@/types/pwp'

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface ParagraphParts {
  lead:     string
  supports: string[]
  close:    string
}

export interface ParagraphBuilderProps {
  step:          PwpStep
  onChange:      (assembled: string) => void
  onPartsChange: (parts: ParagraphParts) => void
  disabled:      boolean
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Append exactly one full stop to a trimmed sentence */
function endSentence(s: string): string {
  const t = s.trim()
  if (!t) return ''
  return t.replace(/[.!?]*$/, '') + '.'
}

// ─── SECTION LABEL CHIP ───────────────────────────────────────────────────────

interface LabelChipProps { letter: string; colour: string; title: string; hint: string }

function LabelChip({ letter, colour, title, hint }: LabelChipProps) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div
        className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center text-white text-[12px] font-extrabold flex-shrink-0"
        style={{ background: colour }}
      >
        {letter}
      </div>
      <span className="text-[13px] font-bold text-[#2D3436]">{title}</span>
      <span className="text-[11px] text-[#aaa]">{hint}</span>
    </div>
  )
}

// ─── PARAGRAPH TEXTAREA ───────────────────────────────────────────────────────

interface ParaInputProps {
  value:       string
  onChange:    (v: string) => void
  placeholder: string
  accent:      string
  disabled:    boolean
  tts:         string
  rows?:       number
}

function ParaInput({ value, onChange, placeholder, accent, disabled, tts, rows = 2 }: ParaInputProps) {
  const filled = value.trim() !== ''
  return (
    <textarea
      className="w-full border-2 rounded-[10px] px-3 py-[9px] text-[14px] text-[#2D3436] outline-none resize-none transition-all font-[inherit]"
      style={{
        borderColor: filled ? accent : '#e0d8ff',
        background:  filled ? '#fdfcff' : '#fff',
        boxShadow:   filled ? `0 0 0 3px ${accent}18` : 'none',
      }}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={e => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${accent}18` }}
      onBlur={e => {
        e.target.style.borderColor  = filled ? accent : '#e0d8ff'
        e.target.style.boxShadow    = filled ? `0 0 0 3px ${accent}18` : 'none'
      }}
      rows={rows}
      disabled={disabled}
      data-tts={tts}
    />
  )
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export function ParagraphBuilder({ step, onChange, onPartsChange, disabled }: ParagraphBuilderProps) {
  // Extract "Lead sentence + 2-3 Support sentences + Close" after "PARAGRAPH — "
  const structureHint = step.formula.replace(/^PARAGRAPH\s*[—–-]\s*/i, '')

  const [lead,      setLead]      = useState('')
  const [supports,  setSupports]  = useState<string[]>(['', ''])
  const [close,     setClose]     = useState('')
  const [showThird, setShowThird] = useState(false)

  const updateSupport = (i: number, val: string) => {
    setSupports(prev => prev.map((s, idx) => (idx === i ? val : s)))
  }

  // Derive completeness and assembled text whenever parts change
  useEffect(() => {
    const leadOk     = lead.trim() !== ''
    const supportOk  = supports.some(s => s.trim() !== '')
    const closeOk    = close.trim() !== ''
    const isComplete = leadOk && supportOk && closeOk

    const parts: ParagraphParts = { lead, supports, close }
    onPartsChange(parts)

    if (!isComplete) {
      onChange('')
      return
    }

    // Assemble: Lead. Support1. Support2?. Support3?. Close.
    const sentences: string[] = [
      endSentence(lead),
      ...supports.map(s => endSentence(s)).filter(Boolean),
      endSentence(close),
    ]
    onChange(sentences.join(' '))
  }, [lead, supports, close]) // eslint-disable-line react-hooks/exhaustive-deps

  const leadFilled    = lead.trim() !== ''
  const supportFilled = supports.some(s => s.trim() !== '')
  const closeFilled   = close.trim() !== ''

  return (
    <div className="select-none mb-3">
      {/* Structure label */}
      <div className="text-[10px] font-bold text-[#00b894] uppercase tracking-wide mb-3">
        Build your paragraph: {structureHint}
      </div>

      {/* ── LEAD ── */}
      <div
        className="bg-white rounded-xl px-4 py-3 mb-3 border-2 transition-colors"
        style={{ borderColor: leadFilled ? '#00b894' : '#e8e0ff' }}
      >
        <LabelChip
          letter="L"
          colour="#00b894"
          title="Lead sentence"
          hint="— your formula sentence from this step"
        />
        <ParaInput
          value={lead}
          onChange={setLead}
          placeholder={`${step.subject_prompt}…  (use your formula)`}
          accent="#00b894"
          disabled={disabled}
          tts="Write your lead sentence"
        />
        {leadFilled && (
          <div className="flex items-center gap-1 mt-[6px]">
            <span className="text-[#00b894] text-[12px]">✓</span>
            <span className="text-[11px] text-[#00b894] font-medium">Lead done</span>
          </div>
        )}
      </div>

      {/* ── SUPPORT ── */}
      <div
        className="bg-white rounded-xl px-4 py-3 mb-3 border-2 transition-colors"
        style={{ borderColor: supportFilled ? '#6C5CE7' : '#e8e0ff' }}
      >
        <LabelChip
          letter="S"
          colour="#6C5CE7"
          title="Support sentences"
          hint="— add 2–3 sentences of detail"
        />
        <div className="flex flex-col gap-2">
          {supports.slice(0, showThird ? 3 : 2).map((s, i) => (
            <ParaInput
              key={i}
              value={s}
              onChange={val => updateSupport(i, val)}
              placeholder={`Support sentence ${i + 1}…`}
              accent="#6C5CE7"
              disabled={disabled}
              tts={`Write support sentence ${i + 1}`}
            />
          ))}
        </div>
        {!showThird && !disabled && (
          <button
            className="mt-2 text-[11px] text-[#9b87f0] font-semibold hover:text-[#6C5CE7] transition-colors"
            onClick={() => {
              setShowThird(true)
              setSupports(prev => [...prev, ''])
            }}
            data-tts="Add a third support sentence"
          >
            + Add a third support sentence
          </button>
        )}
        {supportFilled && (
          <div className="flex items-center gap-1 mt-[6px]">
            <span className="text-[#6C5CE7] text-[12px]">✓</span>
            <span className="text-[11px] text-[#6C5CE7] font-medium">Support done</span>
          </div>
        )}
      </div>

      {/* ── CLOSE ── */}
      <div
        className="bg-white rounded-xl px-4 py-3 border-2 transition-colors"
        style={{ borderColor: closeFilled ? '#F5A623' : '#e8e0ff' }}
      >
        <LabelChip
          letter="C"
          colour="#F5A623"
          title="Close sentence"
          hint="— wrap up your paragraph"
        />
        <ParaInput
          value={close}
          onChange={setClose}
          placeholder="Write your closing sentence…"
          accent="#F5A623"
          disabled={disabled}
          tts="Write your closing sentence"
        />
        {closeFilled && (
          <div className="flex items-center gap-1 mt-[6px]">
            <span className="text-[#F5A623] text-[12px]">✓</span>
            <span className="text-[11px] text-[#F5A623] font-medium">Close done</span>
          </div>
        )}
      </div>

      {/* Completeness nudge */}
      {!(leadFilled && supportFilled && closeFilled) && (
        <p className="text-[11px] text-[#bbb] text-center mt-2">
          Fill in Lead, at least one Support, and Close to submit
        </p>
      )}
    </div>
  )
}
