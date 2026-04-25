/**
 * WF-011: ParagraphFrame — main composition area for the Paragraph Builder.
 * Implements Phase A (starters shown), B (starters fade after 5s),
 * C (blank textareas), D (free composition).
 */

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Genre, Phase } from '../../types/index'

interface ParagraphSlot {
  key: 'support_1' | 'support_2' | 'close'
  label: string
  icon: string
  color: string
  starters: string[]
  minWords: number
}

interface ParagraphFrameProps {
  genre: Genre
  phase: Phase
  leadSentence: string
  support1: string
  support2: string
  closeSentence: string
  starters: {
    support_1: string[]
    support_2: string[]
    close: string[]
  }
  onSupport1Change: (v: string) => void
  onSupport2Change: (v: string) => void
  onCloseChange: (v: string) => void
  isEditable: boolean
}

const SLOT_CONFIG: Omit<ParagraphSlot, 'starters'>[] = [
  {
    key: 'support_1',
    label: 'Support 1',
    icon: '↳',
    color: 'var(--color-adjective)',
    minWords: 5,
  },
  {
    key: 'support_2',
    label: 'Support 2',
    icon: '↳',
    color: 'var(--color-noun)',
    minWords: 5,
  },
  {
    key: 'close',
    label: 'Close',
    icon: '⟲',
    color: '#1B3A6B',
    minWords: 5,
  },
]

const wordCount = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length

interface SlotTextAreaProps {
  slot: ParagraphSlot
  value: string
  phase: Phase
  onChange: (v: string) => void
  isEditable: boolean
  index: number
}

const SlotTextArea: React.FC<SlotTextAreaProps> = ({
  slot,
  value,
  phase,
  onChange,
  isEditable,
  index,
}) => {
  const [startersVisible, setStartersVisible] = useState(true)
  const [selectedStarter, setSelectedStarter] = useState<string>('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Phase B: fade starters after 5 seconds
  useEffect(() => {
    if (phase === 'B') {
      timerRef.current = setTimeout(() => setStartersVisible(false), 5000)
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    }
  }, [phase])

  const showStarters = (phase === 'A' || (phase === 'B' && startersVisible)) && isEditable
  const showBlank = phase === 'C' || phase === 'D'
  const wc = wordCount(value)
  const hasEnoughWords = wc >= slot.minWords

  const handleStarterClick = (starter: string) => {
    setSelectedStarter(starter)
    onChange(starter + ' ')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="rounded-xl overflow-hidden"
      style={{
        border: `2px solid ${slot.color}`,
        backgroundColor: 'var(--color-surface)',
      }}
      data-testid={`paragraph-slot-${slot.key}`}
    >
      {/* Slot header */}
      <div
        className="flex items-center gap-2 px-4 py-2"
        style={{ backgroundColor: `${slot.color}15` }}
      >
        <span className="text-lg font-bold" style={{ color: slot.color }} aria-hidden="true">
          {slot.icon}
        </span>
        <span
          className="font-semibold text-sm"
          style={{ color: slot.color }}
          data-tts={slot.label}
        >
          {slot.label}
        </span>
        <span
          className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            backgroundColor: hasEnoughWords ? `${slot.color}20` : '#F3F4F6',
            color: hasEnoughWords ? slot.color : 'var(--color-text-muted)',
          }}
          data-tts={`${wc} words`}
        >
          {wc} words
        </span>
      </div>

      <div className="p-3 space-y-2">
        {/* Sentence starters (Phase A and Phase B before fade) */}
        <AnimatePresence>
          {showStarters && slot.starters.length > 0 && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-wrap gap-2"
              data-testid={`starters-${slot.key}`}
            >
              {slot.starters.slice(0, 4).map((starter, i) => (
                <button
                  key={i}
                  onClick={() => handleStarterClick(starter)}
                  className="text-xs px-3 py-1.5 rounded-full transition-all font-medium"
                  style={{
                    backgroundColor: selectedStarter === starter ? slot.color : `${slot.color}15`,
                    color: selectedStarter === starter ? '#FFFFFF' : slot.color,
                    border: `1px solid ${slot.color}`,
                  }}
                  data-testid={`starter-${slot.key}-${i}`}
                  data-tts={starter}
                >
                  {starter}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Textarea */}
        {(showBlank || showStarters || phase === 'B') && (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={!isEditable}
            placeholder={
              showBlank
                ? 'Write your sentence here…'
                : 'Click a starter above or write your own…'
            }
            rows={3}
            className="w-full rounded-lg p-3 text-sm resize-none transition-colors outline-none focus:ring-2"
            style={{
              border: `1px solid ${hasEnoughWords ? slot.color : 'var(--color-border)'}`,
              backgroundColor: isEditable ? 'var(--color-background)' : '#F9FAFB',
              color: 'var(--color-text)',
            }}
            data-testid={`textarea-${slot.key}`}
            data-tts={`${slot.label} input`}
          />
        )}
      </div>
    </motion.div>
  )
}

export const ParagraphFrame: React.FC<ParagraphFrameProps> = ({
  genre,
  phase,
  leadSentence,
  support1,
  support2,
  closeSentence,
  starters,
  onSupport1Change,
  onSupport2Change,
  onCloseChange,
  isEditable,
}) => {
  const slots: ParagraphSlot[] = SLOT_CONFIG.map((cfg) => ({
    ...cfg,
    starters: starters[cfg.key],
  }))

  const values = {
    support_1: support1,
    support_2: support2,
    close: closeSentence,
  }

  const handlers = {
    support_1: onSupport1Change,
    support_2: onSupport2Change,
    close: onCloseChange,
  }

  // Phase D: single free composition area
  if (phase === 'D') {
    const allText = [leadSentence, support1, support2, closeSentence]
      .filter(Boolean)
      .join(' ')
    return (
      <div
        className="rounded-xl p-4"
        style={{ border: '2px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        data-testid="paragraph-frame-phase-d"
      >
        <label
          className="block text-sm font-semibold mb-2"
          style={{ color: 'var(--color-text-muted)' }}
          data-tts="Free composition"
        >
          Free Composition ({genre})
        </label>
        <textarea
          value={allText}
          readOnly={!isEditable}
          rows={8}
          className="w-full rounded-lg p-3 text-sm resize-none outline-none"
          style={{
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-background)',
            color: 'var(--color-text)',
          }}
          data-testid="textarea-phase-d"
          data-tts="Free composition textarea"
        />
      </div>
    )
  }

  return (
    <div className="space-y-4" data-testid="paragraph-frame">
      {/* Lead sentence (read-only, auto-populated from formula session) */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '2px solid var(--color-adjective)' }}
        data-testid="paragraph-slot-lead"
      >
        <div
          className="flex items-center gap-2 px-4 py-2"
          style={{ backgroundColor: 'rgba(22,163,74,0.1)' }}
        >
          <span className="text-lg font-bold" style={{ color: 'var(--color-adjective)' }} aria-hidden="true">
            →
          </span>
          <span
            className="font-semibold text-sm"
            style={{ color: 'var(--color-adjective)' }}
            data-tts="Lead sentence"
          >
            Lead
          </span>
          <span
            className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: 'rgba(22,163,74,0.15)', color: 'var(--color-adjective)' }}
          >
            From formula
          </span>
        </div>
        <div
          className="px-4 py-3 text-sm font-medium italic"
          style={{ color: 'var(--color-text)', backgroundColor: 'var(--color-surface)' }}
          data-tts={leadSentence}
          data-testid="lead-sentence-display"
        >
          {leadSentence || 'Your formula sentence will appear here'}
        </div>
      </div>

      {/* Support and Close slots */}
      {slots.map((slot, i) => (
        <SlotTextArea
          key={slot.key}
          slot={slot}
          value={values[slot.key]}
          phase={phase}
          onChange={handlers[slot.key]}
          isEditable={isEditable}
          index={i}
        />
      ))}
    </div>
  )
}
