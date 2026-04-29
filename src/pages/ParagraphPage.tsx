/**
 * WF-011: Paragraph Builder page at /paragraph.
 * Stage 3B of the formula session — follows formula practice when
 * formula_level.paragraph_active = true (L8+).
 */

import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { assessParagraph } from '../lib/assessParagraph'
import type { RawParagraphAssessment } from '../lib/assessParagraph'
import { ParagraphFrame } from '../components/paragraph/ParagraphFrame'
import { ParagraphFeedback } from '../components/paragraph/ParagraphFeedback'
import { Genre, Phase } from '../types/index'
import paragraphStartersJson from '../../content/paragraph-starters.json'
import { sanitizeText } from '../lib/sanitize'
import { useFreemium } from '../hooks/useFreemium'
import { UpgradePrompt } from '../components/ui/UpgradePrompt'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StarterEntry {
  id: string
  genre: string
  phase: string
  slot_type: string
  starter_text: string
}

type Screen = 'compose' | 'feedback' | 'error'

// ─── Genre helpers ────────────────────────────────────────────────────────────

const GENRE_LABELS: Record<Genre, string> = {
  [Genre.NARRATIVE]: 'Narrative',
  [Genre.NON_FICTION]: 'Non-fiction',
  [Genre.PERSUASIVE]: 'Persuasive',
  [Genre.POETRY]: 'Poetry',
}

const GENRE_ICONS: Record<Genre, string> = {
  [Genre.NARRATIVE]: '📖',
  [Genre.NON_FICTION]: '📰',
  [Genre.PERSUASIVE]: '💬',
  [Genre.POETRY]: '🌸',
}

const GENRES = [Genre.NARRATIVE, Genre.NON_FICTION, Genre.PERSUASIVE, Genre.POETRY]

const wordCount = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length

// ─── Starter matching ─────────────────────────────────────────────────────────

const getStarters = (
  genre: Genre,
  phase: Phase
): { support_1: string[]; support_2: string[]; close: string[] } => {
  const allStarters = paragraphStartersJson as StarterEntry[]

  // Normalise genre string (JSON uses 'non-fiction', type uses 'non_fiction')
  const genreNorm = genre.replace('_', '-')

  const filtered = allStarters.filter(
    (s) => s.genre === genreNorm && s.phase === phase
  )

  const pick = (slotType: string) =>
    filtered
      .filter((s) => s.slot_type === slotType)
      .slice(0, 6)
      .map((s) => s.starter_text)

  return {
    support_1: pick('support_1'),
    support_2: pick('support_2'),
    close: pick('close'),
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ParagraphPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { user, profile } = useAuthStore()
  const freemium = useFreemium()

  // Freemium gate — Paragraph Builder is pro-only
  if (!freemium.loading && freemium.isFree) {
    return (
      <UpgradePrompt
        variant="pro"
        feature="Paragraph Builder"
        onBack={() => navigate('/dashboard')}
      />
    )
  }

  // Props passed from FormulaPage via router state
  const state = location.state as {
    leadSentence?: string
    levelId?: number
    formulaScore?: number
    phase?: Phase
    genreRotation?: Genre[]
  } | null

  const levelId = state?.levelId ?? 8
  const formulaScore = state?.formulaScore ?? 0
  const phase: Phase = state?.phase ?? Phase.A
  const genreRotation = state?.genreRotation ?? GENRES
  const leadSentence = state?.leadSentence ?? ''

  // Default genre: first in rotation
  const [selectedGenre, setSelectedGenre] = useState<Genre>(genreRotation[0] ?? Genre.NARRATIVE)
  const [support1, setSupport1] = useState('')
  const [support2, setSupport2] = useState('')
  const [closeSentence, setCloseSentence] = useState('')
  const [screen, setScreen] = useState<Screen>('compose')
  const [isAssessing, setIsAssessing] = useState(false)
  const [assessResult, setAssessResult] = useState<RawParagraphAssessment | null>(null)
  const [compositeScore, setCompositeScore] = useState(0)
  const [xpEarned, setXpEarned] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const yearGroup = profile?.year_group ?? 4
  const starters = getStarters(selectedGenre, phase)

  // Check all slots have enough words
  const allReady =
    wordCount(support1) >= 5 &&
    wordCount(support2) >= 5 &&
    wordCount(closeSentence) >= 5

  const handleSubmit = async () => {
    if (!user?.id || !allReady) return
    setIsAssessing(true)
    setSubmitError(null)

    try {
      // WF-043: pass paragraph_model for KS3 (L51+)
      // WF-055: sanitize text before saving
      const isPEEL = levelId >= 51
      const result = await assessParagraph({
        pupilId: user.id,
        levelId,
        genre: selectedGenre,
        phase,
        leadSentence: sanitizeText(leadSentence),
        supportSentences: [sanitizeText(support1), sanitizeText(support2)].filter(Boolean),
        closeSentence: sanitizeText(closeSentence),
        yearGroup,
        formulaScore,
        paragraphActive: true,
        ...(isPEEL ? { paragraph_model: 'PEEL' as const } : {}),
      })

      setAssessResult(result.raw)
      setCompositeScore(result.compositeScore)
      setXpEarned(result.xpEarned)
      queryClient.invalidateQueries({ queryKey: ['pupil_progress', user?.id] })
      setScreen('feedback')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setSubmitError(msg)
    } finally {
      setIsAssessing(false)
    }
  }

  const handleRetry = () => {
    setSupport1('')
    setSupport2('')
    setCloseSentence('')
    setAssessResult(null)
    setSubmitError(null)
    setScreen('compose')
  }

  return (
    <div
      className="min-h-screen pb-16"
      style={{ backgroundColor: 'var(--color-background)' }}
      data-testid="paragraph-page"
    >
      {/* Header */}
      <header
        className="px-4 py-4 flex items-center justify-between sticky top-0 z-10"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
        }}
        data-testid="paragraph-header"
      >
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
          data-testid="back-button"
          data-tts="Back to dashboard"
          aria-label="Back to dashboard"
        >
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: 'var(--color-adjective)' }}
            aria-hidden="true"
          >
            P
          </span>
          <span
            className="font-bold text-base"
            style={{ color: 'var(--color-text)' }}
            data-tts="Paragraph Builder"
          >
            Paragraph Builder
          </span>
        </div>
        <div
          className="text-xs font-semibold px-2 py-1 rounded"
          style={{ backgroundColor: '#F0FDF4', color: 'var(--color-adjective)' }}
          data-tts={`Phase ${phase}`}
        >
          Phase {phase}
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-5 space-y-5">
        {/* Submit error */}
        {submitError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 rounded-xl text-sm"
            style={{ backgroundColor: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' }}
            role="alert"
            data-testid="submit-error"
            data-tts={submitError}
          >
            {submitError}
          </motion.div>
        )}

        {screen === 'compose' && (
          <>
            {/* Genre selector */}
            <section data-testid="genre-selector">
              <h2
                className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: 'var(--color-text-muted)' }}
                data-tts="Choose your genre"
              >
                Genre
              </h2>
              <div className="flex gap-2 flex-wrap">
                {genreRotation.map((g) => {
                  const active = g === selectedGenre
                  return (
                    <button
                      key={g}
                      onClick={() => setSelectedGenre(g)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                      style={{
                        backgroundColor: active ? 'var(--color-adjective)' : 'var(--color-surface)',
                        color: active ? '#FFFFFF' : 'var(--color-text)',
                        border: `2px solid ${active ? 'var(--color-adjective)' : 'var(--color-border)'}`,
                      }}
                      data-testid={`genre-tab-${g}`}
                      data-tts={GENRE_LABELS[g]}
                    >
                      <span aria-hidden="true">{GENRE_ICONS[g]}</span>
                      {GENRE_LABELS[g]}
                    </button>
                  )
                })}
              </div>
            </section>

            {/* Paragraph frame */}
            <ParagraphFrame
              genre={selectedGenre}
              phase={phase}
              levelId={levelId}
              leadSentence={leadSentence}
              support1={support1}
              support2={support2}
              closeSentence={closeSentence}
              starters={starters}
              onSupport1Change={setSupport1}
              onSupport2Change={setSupport2}
              onCloseChange={setCloseSentence}
              isEditable={!isAssessing}
            />

            {/* Live paragraph preview */}
            {(support1 || support2 || closeSentence) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl p-4 text-sm"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
                data-testid="paragraph-preview"
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--color-text-muted)' }}
                  data-tts="Paragraph preview"
                >
                  Preview
                </p>
                <p
                  className="leading-relaxed"
                  style={{ color: 'var(--color-text)' }}
                  data-tts="Your paragraph so far"
                >
                  {[leadSentence, support1, support2, closeSentence]
                    .filter(Boolean)
                    .join(' ')}
                </p>
              </motion.div>
            )}

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={!allReady || isAssessing}
              className="w-full py-4 rounded-2xl font-bold text-base transition-all"
              style={{
                backgroundColor: allReady && !isAssessing ? 'var(--color-adjective)' : 'var(--color-border)',
                color: allReady && !isAssessing ? '#FFFFFF' : 'var(--color-text-muted)',
                cursor: allReady && !isAssessing ? 'pointer' : 'not-allowed',
              }}
              data-testid="submit-paragraph-button"
              data-tts={
                allReady
                  ? 'Submit your paragraph for assessment'
                  : 'Write at least 5 words in each section first'
              }
            >
              {isAssessing ? 'Assessing…' : allReady ? 'Build Paragraph →' : 'Write at least 5 words in each section'}
            </button>
          </>
        )}

        {screen === 'feedback' && assessResult && (
          <ParagraphFeedback
            result={assessResult}
            compositeScore={compositeScore}
            xpEarned={xpEarned}
            onRetry={handleRetry}
            onContinue={() => navigate('/dashboard')}
          />
        )}
      </main>
    </div>
  )
}
