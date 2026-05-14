/**
 * TypeModeTileInput — type-mode word-tile builder
 *
 * Matches the visual experience of click-mode: each word the pupil types
 * and confirms (space / Enter / tap) appears as a coloured chip in the
 * sentence tray above, not as raw text.
 *
 * The assembled word list is emitted via onChange as a plain string on
 * every change, identical to what WordBankPhaseA emits — PunctuationStep
 * sits on top and handles capitalisation + punctuation downstream.
 */

import { useState, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { chipColourForWord } from '@/constants/wordClassColours'

export interface TypeModeTileInputProps {
  onChange:  (assembled: string) => void
  disabled:  boolean
}

export function TypeModeTileInput({ onChange, disabled }: TypeModeTileInputProps) {
  const [tiles, setTiles]       = useState<string[]>([])
  const [draft, setDraft]       = useState('')
  const inputRef                = useRef<HTMLInputElement>(null)

  const commitDraft = () => {
    const word = draft.trim()
    if (!word) return
    const next = [...tiles, word]
    setTiles(next)
    setDraft('')
    onChange(next.join(' '))
    inputRef.current?.focus()
  }

  const removeLast = () => {
    if (tiles.length === 0) return
    const next = tiles.slice(0, -1)
    setTiles(next)
    onChange(next.join(' '))
  }

  const clearAll = () => {
    setTiles([])
    setDraft('')
    onChange('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      commitDraft()
    } else if (e.key === 'Backspace' && draft === '') {
      removeLast()
    }
  }

  return (
    <div className="select-none space-y-2">
      {/* ── Tile tray ──────────────────────────────────────────────── */}
      <div
        className="bg-white border-2 rounded-xl px-3 py-3 sm:px-4 min-h-[64px] sm:min-h-[72px] flex flex-wrap items-center gap-2 transition-colors cursor-text"
        style={{ borderColor: tiles.length > 0 ? '#6C5CE7' : '#e0d8ff' }}
        onClick={() => inputRef.current?.focus()}
        aria-label="Typed sentence tiles"
      >
        {tiles.length === 0 && draft === '' ? (
          <span className="text-xs sm:text-sm text-[#bbb] italic pointer-events-none">
            Type a word then press space to add it as a tile…
          </span>
        ) : (
          <>
            <AnimatePresence>
              {tiles.map((word, i) => {
                const { bg, fg } = chipColourForWord(word)
                return (
                  <motion.span
                    key={i}
                    className="px-3 py-2 rounded-xl text-sm sm:text-base font-semibold min-h-[44px] border flex items-center"
                    style={{ background: bg, color: fg, borderColor: `${fg}30` }}
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                    data-tts={word}
                  >
                    {word}
                  </motion.span>
                )
              })}
            </AnimatePresence>

            {/* Inline draft preview chip */}
            {draft.trim() !== '' && (
              <span
                className="px-3 py-2 rounded-xl text-sm sm:text-base font-semibold border-2 border-dashed border-[#9b87f0] text-[#6C5CE7] bg-[#f0ecff] min-h-[44px] flex items-center"
                aria-live="polite"
              >
                {draft}
              </span>
            )}

            {tiles.length > 0 && !disabled && (
              <button
                className="ml-auto text-xs text-[#bbb] hover:text-[#888] transition-colors flex-shrink-0 min-h-[44px] px-2"
                onClick={clearAll}
                aria-label="Clear all tiles"
              >
                Clear ✕
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Text input ─────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          className="flex-1 border-2 rounded-xl px-4 py-3 text-base sm:text-lg text-[#2D3436] outline-none font-[inherit] bg-white transition-colors"
          style={{ borderColor: '#e0d8ff' }}
          placeholder="Type a word…"
          value={draft}
          onChange={e => setDraft(e.target.value.replace(/\s/g, ''))} // prevent spaces in field
          onKeyDown={handleKeyDown}
          onFocus={e => { e.target.style.borderColor = '#6C5CE7' }}
          onBlur={e => { e.target.style.borderColor = '#e0d8ff' }}
          disabled={disabled}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Type a word and press space or Enter to add it"
          data-tts="Type a word"
        />
        <button
          className="px-4 py-3 rounded-xl bg-[#6C5CE7] text-white font-bold text-sm min-h-[44px] disabled:opacity-40 transition-colors hover:bg-[#5a4ccf]"
          onClick={commitDraft}
          disabled={disabled || draft.trim() === ''}
          aria-label="Add word as tile"
          data-tts="Add"
        >
          Add
        </button>
      </div>

      <p className="text-[11px] text-[#aaa]">
        Press <kbd className="bg-[#f3f0ff] px-1 rounded text-[#6C5CE7]">space</kbd> or{' '}
        <kbd className="bg-[#f3f0ff] px-1 rounded text-[#6C5CE7]">enter</kbd> after each word •{' '}
        <kbd className="bg-[#f3f0ff] px-1 rounded text-[#6C5CE7]">backspace</kbd> removes last tile
      </p>
    </div>
  )
}
