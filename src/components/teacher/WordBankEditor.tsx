/**
 * WF-034: WordBankEditor — teacher UI to add/remove custom words from word banks.
 * Only L1–L20 (Phase A/B). Changes apply immediately to all pupils in the class.
 */

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { WordClass } from '../../types/index'

const PHASE_AB_LEVELS = Array.from({ length: 20 }, (_, i) => i + 1)

const WORD_CLASS_LABELS: Record<WordClass, string> = {
  [WordClass.DETERMINER]: 'Determiner',
  [WordClass.ADJECTIVE]: 'Adjective',
  [WordClass.NOUN]: 'Noun',
  [WordClass.VERB]: 'Verb',
  [WordClass.ADVERB]: 'Adverb',
  [WordClass.PREPOSITION]: 'Preposition',
  [WordClass.PRONOUN]: 'Pronoun',
  [WordClass.CONJUNCTION]: 'Conjunction',
}

const WORD_CLASS_COLOURS: Record<WordClass, string> = {
  [WordClass.DETERMINER]: 'var(--color-determiner)',
  [WordClass.ADJECTIVE]: 'var(--color-adjective)',
  [WordClass.NOUN]: 'var(--color-noun)',
  [WordClass.VERB]: 'var(--color-verb)',
  [WordClass.ADVERB]: 'var(--color-adverb)',
  [WordClass.PREPOSITION]: 'var(--color-preposition)',
  [WordClass.PRONOUN]: 'var(--color-pronoun)',
  [WordClass.CONJUNCTION]: 'var(--color-conjunction)',
}

export const WordBankEditor: React.FC = () => {
  const [selectedLevel, setSelectedLevel] = useState<number>(1)
  const [selectedWordClass, setSelectedWordClass] = useState<WordClass>(WordClass.NOUN)
  const [words, setWords] = useState<string[]>([])
  const [bankId, setBankId] = useState<string | null>(null)
  const [newWord, setNewWord] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadWordBank()
  }, [selectedLevel, selectedWordClass]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadWordBank = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await supabase
        .from('word_banks')
        .select('id, words')
        .eq('level_id', selectedLevel)
        .eq('word_class', selectedWordClass)
        .maybeSingle()

      if (data) {
        setBankId(data.id)
        setWords(data.words as string[])
      } else {
        setBankId(null)
        setWords([])
      }
    } catch {
      setError('Failed to load word bank.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddWord = async () => {
    const trimmed = newWord.trim().toLowerCase()
    if (!trimmed || words.includes(trimmed)) {
      setNewWord('')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const updatedWords = [...words, trimmed]
      if (bankId) {
        await supabase
          .from('word_banks')
          .update({ words: updatedWords })
          .eq('id', bankId)
      } else {
        const { data } = await supabase
          .from('word_banks')
          .insert({
            level_id: selectedLevel,
            word_class: selectedWordClass,
            words: updatedWords,
            images: [],
          })
          .select('id')
          .single()
        if (data) setBankId(data.id)
      }
      setWords(updatedWords)
      setNewWord('')
    } catch {
      setError('Failed to save word.')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveWord = async (word: string) => {
    if (!bankId) return
    setSaving(true)
    setError(null)
    try {
      const updatedWords = words.filter((w) => w !== word)
      await supabase
        .from('word_banks')
        .update({ words: updatedWords })
        .eq('id', bankId)
      setWords(updatedWords)
    } catch {
      setError('Failed to remove word.')
    } finally {
      setSaving(false)
    }
  }

  const colour = WORD_CLASS_COLOURS[selectedWordClass]

  return (
    <div className="space-y-5 max-w-2xl" data-testid="word-bank-editor">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            className="text-lg font-semibold"
            style={{ color: 'var(--color-text)' }}
            data-tts="Word Bank Editor"
          >
            Word Bank Editor
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Add custom words for Phases A &amp; B (Levels 1–20). Changes apply immediately.
          </p>
        </div>
      </div>

      {/* Selectors row */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="level-select"
            className="text-xs font-medium"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Formula Level
          </label>
          <select
            id="level-select"
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(Number(e.target.value))}
            data-testid="level-select"
            className="rounded-lg px-3 py-2 text-sm"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          >
            {PHASE_AB_LEVELS.map((l) => (
              <option key={l} value={l}>
                Level {l}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="wordclass-select"
            className="text-xs font-medium"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Word Class
          </label>
          <select
            id="wordclass-select"
            value={selectedWordClass}
            onChange={(e) => setSelectedWordClass(e.target.value as WordClass)}
            data-testid="wordclass-select"
            className="rounded-lg px-3 py-2 text-sm"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          >
            {Object.values(WordClass).map((wc) => (
              <option key={wc} value={wc}>
                {WORD_CLASS_LABELS[wc]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="text-sm" style={{ color: '#DC2626' }} role="alert">
          {error}
        </p>
      )}

      {/* Current word list */}
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
            style={{ backgroundColor: `${colour}22`, color: colour }}
          >
            {WORD_CLASS_LABELS[selectedWordClass]}
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            L{selectedLevel} · {words.length} word{words.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Loading…
          </p>
        ) : words.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No words yet. Add the first one below.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {words.map((word) => (
              <span
                key={word}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium"
                style={{ backgroundColor: `${colour}15`, color: colour }}
                data-testid={`word-chip-${word}`}
              >
                {word}
                <button
                  type="button"
                  onClick={() => handleRemoveWord(word)}
                  disabled={saving}
                  aria-label={`Remove ${word}`}
                  data-testid={`remove-word-${word}`}
                  className="flex items-center justify-center w-4 h-4 rounded-full text-xs leading-none hover:bg-black/10 transition-colors"
                  style={{ color: colour }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Add word input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
          placeholder="Type a new word…"
          maxLength={40}
          data-testid="new-word-input"
          className="flex-1 rounded-lg px-3 py-2 text-sm"
          style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        />
        <button
          type="button"
          onClick={handleAddWord}
          disabled={!newWord.trim() || saving}
          data-testid="add-word-button"
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity"
          style={{
            backgroundColor: 'var(--color-brand-primary)',
            opacity: !newWord.trim() || saving ? 0.5 : 1,
            cursor: !newWord.trim() || saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : 'Add Word'}
        </button>
      </div>

      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Note: Phase C/D (Levels 21–67) words are generated contextually and cannot be edited here.
      </p>
    </div>
  )
}
