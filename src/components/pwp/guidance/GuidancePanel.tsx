// GuidancePanel — Progressive three-level hint system
//
// Hint 1 (Remind)  — Formula reminder; costs 2 XP
// Hint 2 (Model)   — Annotated example sentence; costs another 2 XP
// Hint 3 (Explain) — Full formula breakdown by word-class part; costs another 2 XP
//
// The panel is hidden while feedback is showing.
// XP penalty is emitted via onHintUsed so LevelPage can deduct from the award.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PwpStep } from '@/types/pwp'

// ─── FORMULA BREAKDOWN ───────────────────────────────────────────────────────

/** Split a formula string by + and render coloured part chips */
function FormulaBreakdown({ formula }: { formula: string }) {
  // Split on ' + ' but keep parenthesised groups intact
  const rawParts = formula.split(/\s*\+\s*/g)

  const partColours = [
    { bg: '#DBEAFE', fg: '#1E40AF' },
    { bg: '#FFEDD5', fg: '#9A3412' },
    { bg: '#DCFCE7', fg: '#14532D' },
    { bg: '#FCE7F3', fg: '#9D174D' },
    { bg: '#D1FAE5', fg: '#064E3B' },
    { bg: '#FEF9C3', fg: '#713F12' },
    { bg: '#EDE9FE', fg: '#4C1D95' },
    { bg: '#F3F4F6', fg: '#374151' },
  ]

  return (
    <div className="flex flex-wrap items-center gap-1 mt-2">
      {rawParts.map((part, i) => {
        const { bg, fg } = partColours[i % partColours.length]
        return (
          <span key={i} className="flex items-center gap-1">
            <span
              className="px-[9px] py-[3px] rounded-[8px] text-[12px] font-semibold"
              style={{ background: bg, color: fg }}
              data-tts={part.trim()}
            >
              {part.trim()}
            </span>
            {i < rawParts.length - 1 && (
              <span className="text-[14px] font-bold text-[#b0a0cc]">+</span>
            )}
          </span>
        )
      })}
    </div>
  )
}

// ─── HINT CARD ────────────────────────────────────────────────────────────────

interface HintCardProps {
  level: 1 | 2 | 3
  children: React.ReactNode
}

const HINT_META = {
  1: { icon: '💡', label: 'Formula Reminder',  bg: '#FEF9C3', border: '#F5C500', fg: '#713F12' },
  2: { icon: '🔍', label: 'Example Sentence',  bg: '#EFF6FF', border: '#93c5fd', fg: '#1e40af' },
  3: { icon: '🧩', label: 'Full Breakdown',    bg: '#F0FDF4', border: '#86efac', fg: '#14532d' },
}

function HintCard({ level, children }: HintCardProps) {
  const { icon, label, bg, border, fg } = HINT_META[level]
  return (
    <motion.div
      className="rounded-xl px-4 py-3 mb-2"
      style={{ background: bg, border: `1.5px solid ${border}` }}
      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
      animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className="text-[11px] font-bold uppercase tracking-wide mb-[6px]" style={{ color: fg }}>
        {icon} {label}
      </div>
      <div style={{ color: fg === '#713F12' ? '#2D3436' : fg }}>
        {children}
      </div>
    </motion.div>
  )
}

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface GuidancePanelProps {
  step:        PwpStep
  onHintUsed:  (hintLevel: number) => void
  disabled:    boolean
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export function GuidancePanel({ step, onHintUsed, disabled }: GuidancePanelProps) {
  const [revealed,  setRevealed]  = useState(0)   // how many hints are showing
  const [expanded,  setExpanded]  = useState(false) // panel open/closed

  const MAX_HINTS = 3

  const handleRevealNext = () => {
    if (disabled || revealed >= MAX_HINTS) return
    const next = revealed + 1
    setRevealed(next)
    onHintUsed(next)
    setExpanded(true)
  }

  const allRevealed = revealed >= MAX_HINTS

  return (
    <div className="mb-3 select-none">
      {/* Trigger row */}
      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-[6px] px-3 py-[5px] rounded-[8px] text-[12px] font-semibold transition-colors"
          style={{
            background: disabled ? '#f3f0ff' : (revealed > 0 ? '#FEF9C3' : '#f8f5ff'),
            color:      disabled ? '#ccc'     : (revealed > 0 ? '#713F12' : '#9b87f0'),
            border:     `1.5px solid ${revealed > 0 ? '#F5C50050' : '#e8e0ff'}`,
            cursor:     disabled || allRevealed ? 'default' : 'pointer',
          }}
          onClick={() => {
            if (!expanded && revealed > 0) { setExpanded(e => !e); return }
            if (!allRevealed) handleRevealNext()
          }}
          disabled={disabled}
          data-tts={allRevealed ? 'All hints revealed' : 'Get a hint'}
        >
          <span>💡</span>
          <span>
            {allRevealed
              ? 'All hints shown'
              : revealed === 0
              ? 'Need a hint?'
              : `Hint ${revealed}/${MAX_HINTS} — next hint?`}
          </span>
        </button>

        {/* No XP penalty for using hints — hints are free to encourage engagement */}

        {/* Toggle collapse if hints already showing */}
        {expanded && revealed > 0 && (
          <button
            className="ml-auto text-[11px] text-[#aaa] hover:text-[#888]"
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? 'Hide ▲' : 'Show ▼'}
          </button>
        )}
      </div>

      {/* Hint cards */}
      <AnimatePresence>
        {expanded && revealed > 0 && (
          <motion.div
            className="mt-2 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* Hint 1 — Formula Reminder */}
            {revealed >= 1 && (
              <HintCard level={1}>
                <p className="text-[13px] font-semibold mb-1 text-[#2D3436]">
                  {step.formula}
                </p>
                <p className="text-[12px] text-[#555] leading-[1.5]">
                  Use this structure with <strong>"{step.subject_prompt}"</strong> as your subject.
                </p>
              </HintCard>
            )}

            {/* Hint 2 — Example Sentence */}
            {revealed >= 2 && (
              <HintCard level={2}>
                <p className="text-[13px] italic text-[#2D3436] mb-1">
                  "{step.example}"
                </p>
                <p className="text-[12px] text-[#555] leading-[1.5]">
                  Notice how the parts fit together. Now write your own version.
                </p>
              </HintCard>
            )}

            {/* Hint 3 — Full Breakdown */}
            {revealed >= 3 && (
              <HintCard level={3}>
                <p className="text-[12px] text-[#2D3436] mb-1 font-medium">
                  Each part of the formula, in order:
                </p>
                <FormulaBreakdown formula={step.formula} />
                <p className="text-[12px] text-[#555] mt-2 leading-[1.5]">
                  Build your sentence piece by piece using <strong>"{step.subject_prompt}"</strong>.
                </p>
              </HintCard>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
