/**
 * PWP Daily Chain Practice — SubjectPicker
 *
 * Displays a text input for the pupil's session subject noun.
 * Optionally shows a teacher-set weekly theme hint below the input.
 * Autofocuses on mount so pupils can start typing immediately.
 *
 * Max 200 lines.
 */

import React, { useEffect, useRef } from 'react'

/** Controls what kind of subject the pupil should choose.
 *  Set by the teacher per session; defaults to 'thing' to avoid
 *  person-centred writing (WriFe PWP Dev Spec §3.3). */
export type SubjectType = 'person' | 'place' | 'thing'

interface SubjectPickerProps {
  value: string
  onChange: (value: string) => void
  onConfirm: () => void
  /** Optional: teacher-set weekly theme text, e.g. "Ancient Egypt" */
  weeklyTheme?: string | null
  /** Optional: word suggestions from pwp_class_themes.suggestions */
  themeSuggestions?: string[]
  /** Controls the subject guidance shown. Defaults to 'thing'. */
  subjectType?: SubjectType
  disabled?: boolean
}

// ─── Subject type guidance ────────────────────────────────────────────────────

const SUBJECT_GUIDANCE: Record<SubjectType, { subtitle: string; placeholder: string; tts: string }> = {
  thing: {
    subtitle: 'Choose a place or thing — avoid using a person\'s name.',
    placeholder: 'e.g. robots, the park, buses, a market…',
    tts: 'Choose a place or thing — avoid using a person\'s name.',
  },
  place: {
    subtitle: 'Choose a place — a location your subject can travel to or from.',
    placeholder: 'e.g. the park, a station, the market, school…',
    tts: 'Choose a place — a location your subject can travel to or from.',
  },
  person: {
    subtitle: 'Choose a person — use a name or a role (e.g. Ben, doctor, astronaut).',
    placeholder: 'e.g. Ben, a doctor, the astronaut…',
    tts: 'Choose a person — use a name or a role such as doctor or astronaut.',
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SubjectPicker: React.FC<SubjectPickerProps> = ({
  value,
  onChange,
  onConfirm,
  weeklyTheme,
  themeSuggestions = [],
  subjectType = 'thing',
  disabled = false,
}) => {
  const guidance = SUBJECT_GUIDANCE[subjectType]
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus()
    }
  }, [disabled])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim().length >= 2) {
      onConfirm()
    }
  }

  const handleSuggestionClick = (word: string) => {
    onChange(word)
    setTimeout(() => onConfirm(), 50)
  }

  const isValid = value.trim().length >= 2 && /^[a-zA-Z\s'-]+$/.test(value.trim())

  return (
    <div
      className="w-full max-w-lg mx-auto"
      data-testid="subject-picker"
      data-tts="Choose your subject for today's chain practice"
    >
      {/* Title */}
      <h2
        className="text-2xl font-bold text-center mb-2"
        style={{ color: 'var(--color-brand-primary)', fontFamily: 'var(--font-display)' }}
        data-tts="What is your subject today?"
      >
        What is your subject today?
      </h2>
      <p
        className="text-center text-base mb-6"
        style={{ color: 'var(--color-text-muted)' }}
        data-tts={guidance.tts}
      >
        {guidance.subtitle}
      </p>

      {/* Theme hint */}
      {weeklyTheme && (
        <div
          className="mb-4 px-4 py-3 rounded-xl text-sm text-center"
          style={{
            backgroundColor: 'var(--color-brand-secondary-light)',
            color: 'var(--color-brand-secondary-dark)',
            border: '1px solid var(--color-brand-secondary)',
          }}
          data-testid="theme-hint"
          data-tts={`This week's theme is ${weeklyTheme}`}
        >
          <span className="font-semibold">This week's theme:</span> {weeklyTheme}
        </div>
      )}

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={guidance.placeholder}
        disabled={disabled}
        maxLength={40}
        autoComplete="off"
        autoCapitalize="off"
        data-testid="subject-input"
        data-tts="Type your subject noun here"
        className="w-full px-5 py-4 rounded-2xl text-center text-xl font-semibold outline-none transition"
        style={{
          border: '2px solid var(--color-brand-primary)',
          color: 'var(--color-text)',
          backgroundColor: 'var(--color-background)',
          fontSize: '1.25rem',
        }}
        onFocus={(e) =>
          (e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-brand-primary-light)')
        }
        onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
      />

      {/* Theme word suggestions */}
      {themeSuggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 justify-center" data-testid="theme-suggestions">
          {themeSuggestions.map((word) => (
            <button
              key={word}
              type="button"
              onClick={() => handleSuggestionClick(word)}
              disabled={disabled}
              data-testid={`suggestion-${word}`}
              data-tts={`Suggestion: ${word}`}
              className="px-3 py-1 rounded-full text-sm font-medium transition hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-brand-secondary-light)',
                color: 'var(--color-brand-secondary-dark)',
                border: '1px solid var(--color-brand-secondary)',
              }}
            >
              {word}
            </button>
          ))}
        </div>
      )}

      {/* Confirm button */}
      <button
        type="button"
        onClick={onConfirm}
        disabled={!isValid || disabled}
        data-testid="confirm-subject-btn"
        data-tts="Start my chain"
        className="mt-6 w-full py-4 rounded-full text-white font-bold text-lg transition disabled:opacity-40"
        style={{
          backgroundColor: isValid ? 'var(--color-brand-secondary)' : 'var(--color-disabled)',
          cursor: isValid ? 'pointer' : 'not-allowed',
        }}
      >
        Start my chain →
      </button>

      {/* Validation nudge */}
      {value.length > 0 && !isValid && (
        <p
          className="mt-2 text-center text-sm"
          style={{ color: 'var(--color-error)' }}
          data-tts="Please enter letters only, at least 2 characters"
        >
          Please enter letters only (at least 2 characters).
        </p>
      )}
    </div>
  )
}
