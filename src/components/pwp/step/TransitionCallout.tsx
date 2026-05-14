/**
 * TransitionCallout — shown on transition and three_stage steps.
 *
 * Transition:   Sam ran.  →  The boy ran.
 * Three-stage:  Sam ran.
 *               The boy ran.
 *               He ran.
 *
 * The example sentences in the DB are stored as a single string, separated
 * by ' / ' for three-stage steps and ' → ' for transition steps.
 * We detect which format to use from step_type, then render accordingly.
 *
 * Sam is used as the example character — the pupil's own subject is separate.
 */

import { motion } from 'framer-motion'

export interface TransitionCalloutProps {
  stepType: 'transition' | 'three_stage'
  example: string    // raw example string from DB (may contain ' / ' or ' → ')
  accent: string     // theme colour
}

export function TransitionCallout({ stepType, example, accent }: TransitionCalloutProps) {
  if (!example) return null

  if (stepType === 'transition') {
    // Split on ' → ' or '→'; fall back to showing as before/after if plain text
    const parts = example.split(/\s*→\s*/)
    const before = parts[0]?.trim() ?? example
    const after  = parts[1]?.trim() ?? ''

    return (
      <motion.div
        className="rounded-xl px-4 py-3 mb-4 border-l-4"
        style={{ background: '#FDF8EE', borderColor: accent }}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div
          className="text-[10px] font-bold uppercase tracking-wider mb-2"
          style={{ color: accent }}
        >
          Formula change
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="px-3 py-[5px] rounded-lg text-[13px] font-semibold bg-white border"
            style={{ color: '#2D3436', borderColor: `${accent}30` }}
            data-tts={before}
          >
            {before}
          </span>
          <span className="text-[18px]" aria-label="changes to" style={{ color: accent }}>→</span>
          <span
            className="px-3 py-[5px] rounded-lg text-[13px] font-semibold"
            style={{ background: `${accent}15`, color: accent, border: `1.5px solid ${accent}40` }}
            data-tts={after}
          >
            {after}
          </span>
        </div>
      </motion.div>
    )
  }

  // three_stage: split on ' / '
  const lines = example.split(/\s*\/\s*/).filter(Boolean)

  return (
    <motion.div
      className="rounded-xl px-4 py-3 mb-4 border-l-4"
      style={{ background: '#FDF8EE', borderColor: accent }}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div
        className="text-[10px] font-bold uppercase tracking-wider mb-2"
        style={{ color: accent }}
      >
        Three ways to write it
      </div>
      <div className="flex flex-col gap-[6px]">
        {lines.map((line, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              style={{ background: `${accent}20`, color: accent }}
            >
              {i + 1}
            </span>
            <span
              className="text-[13px] font-semibold text-[#2D3436]"
              data-tts={line.trim()}
            >
              {line.trim()}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
