/**
 * SubjectPrompt — L7+ subject selection step
 *
 * Shown before the Phase B gap-fill at Level 7+. The pupil types or selects
 * their subject ("Who or what is your sentence about?"). Once confirmed, the
 * chosen subject is displayed as a chip at the top of the composing area.
 *
 * The subject is never pre-filled by the app. It always reflects the pupil's
 * own choice, in line with PWP_Word_Bank_Clarification.md §L7-9.
 */

import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { chipColourForWord } from '@/constants/wordClassColours'

export interface SubjectPromptProps {
  /** Called once the pupil confirms their subject */
  onConfirm: (subject: string) => void
  disabled?: boolean
}

export function SubjectPrompt({ onConfirm, disabled = false }: SubjectPromptProps) {
  const [draft, setDraft]       = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [subject, setSubject]   = useState('')

  const handleConfirm = () => {
    const val = draft.trim()
    if (!val) return
    setSubject(val)
    setConfirmed(true)
    onConfirm(val)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleConfirm() }
  }

  const handleChange = () => {
    setConfirmed(false)
    setSubject('')
    setDraft('')
    onConfirm('')
  }

  if (confirmed) {
    const { bg, fg } = chipColourForWord(subject)
    return (
      <motion.div
        className="flex items-center gap-3 mb-3"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="text-xs font-semibold text-[#9b87f0] uppercase tracking-wider whitespace-nowrap">
          Your subject:
        </span>
        <span
          className="px-3 py-2 rounded-xl text-sm sm:text-base font-semibold border min-h-[44px] flex items-center"
          style={{ background: bg, color: fg, borderColor: `${fg}30` }}
          data-tts={subject}
        >
          {subject}
        </span>
        {!disabled && (
          <button
            className="text-xs text-[#bbb] hover:text-[#888] transition-colors underline underline-offset-2 whitespace-nowrap"
            onClick={handleChange}
            aria-label="Change your subject"
          >
            Change
          </button>
        )}
      </motion.div>
    )
  }

  return (
    <div className="rounded-2xl border-2 border-[#e8e0ff] bg-white px-4 py-4 sm:px-5 mb-3 space-y-3">
      <div className="text-sm font-semibold text-[#2D3436]" data-tts="Who or what is your sentence about?">
        Who or what is your sentence about?
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 border-2 rounded-xl px-4 py-3 text-base sm:text-lg text-[#2D3436] outline-none font-[inherit] bg-white transition-colors"
          style={{ borderColor: '#e0d8ff' }}
          placeholder="e.g. The tall boy"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={e => { e.target.style.borderColor = '#6C5CE7' }}
          onBlur={e => { e.target.style.borderColor = '#e0d8ff' }}
          disabled={disabled}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Type your subject"
          data-tts="Type your subject here"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
        <button
          className="px-4 py-3 rounded-xl bg-[#6C5CE7] text-white font-bold text-sm min-h-[44px] disabled:opacity-40 hover:bg-[#5a4ccf] transition-colors"
          onClick={handleConfirm}
          disabled={disabled || draft.trim() === ''}
          aria-label="Confirm your subject"
          data-tts="Confirm subject"
        >
          OK
        </button>
      </div>
    </div>
  )
}
