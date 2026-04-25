/**
 * WF-017 — AssessmentReport
 * Displays AI writing assessment results for pupil and teacher views.
 * Six dimension score cards, overall band, evidence citations, confidence flags,
 * pupil self-review section, and "Publish to Teacher" button.
 */

import { useState } from 'react'
import type { AssessWritingOutput } from '../../lib/assessWriting'
import type { WritingDimension } from '../../types/index'
import { AssessmentBand } from '../../types/index'

// ─── Band config ──────────────────────────────────────────────────────────────

const BAND_LABELS: Record<AssessmentBand, string> = {
  [AssessmentBand.PRE_EMERGENT]: 'Pre-emergent',
  [AssessmentBand.WORKING_TOWARDS]: 'Working Towards Expected',
  [AssessmentBand.EXPECTED]: 'Expected Standard',
  [AssessmentBand.GREATER_DEPTH]: 'Greater Depth',
}

const BAND_COLOURS: Record<AssessmentBand, string> = {
  [AssessmentBand.PRE_EMERGENT]: '#6B7280',
  [AssessmentBand.WORKING_TOWARDS]: '#D97706',
  [AssessmentBand.EXPECTED]: '#16A34A',
  [AssessmentBand.GREATER_DEPTH]: '#7C3AED',
}

const DIMENSION_LABELS: Record<string, string> = {
  composition: 'Composition',
  vocabulary: 'Vocabulary',
  grammar: 'Grammar',
  punctuation: 'Punctuation',
  spelling: 'Spelling',
  purpose_audience_effect: 'Purpose, Audience & Effect',
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AssessmentReportProps {
  assessment: AssessWritingOutput
  pieceId: string
  isTeacherView?: boolean
  onPublish?: () => void
  onSelfReview?: (scores: Record<WritingDimension, number>) => void
  onPupilConfidence?: (rating: number) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AssessmentReport = ({
  assessment,
  pieceId: _pieceId,
  isTeacherView = false,
  onPublish,
  onSelfReview,
  onPupilConfidence,
}: AssessmentReportProps) => {
  const [selfReview, setSelfReview] = useState<Partial<Record<WritingDimension, number>>>({})
  const [pupilConfidence, setPupilConfidence] = useState<number | null>(null)
  const [published, setPublished] = useState(false)

  const overallBand = assessment.overall_band
  const overallColour = BAND_COLOURS[overallBand]

  const dimensionKeys = [
    'composition',
    'vocabulary',
    'grammar',
    'punctuation',
    'spelling',
    'purpose_audience_effect',
  ] as const

  const handleSelfReviewChange = (dim: WritingDimension, rating: number) => {
    const updated = { ...selfReview, [dim]: rating }
    setSelfReview(updated)
    onSelfReview?.(updated as Record<WritingDimension, number>)
  }

  const handleConfidence = (rating: number) => {
    setPupilConfidence(rating)
    onPupilConfidence?.(rating)
  }

  const handlePublish = () => {
    setPublished(true)
    onPublish?.()
  }

  return (
    <div className="space-y-6" data-testid="assessment-report">

      {/* Overall band badge */}
      <div
        className="flex flex-col items-center py-6 rounded-xl"
        style={{ backgroundColor: overallColour + '18', border: `2px solid ${overallColour}` }}
        data-testid="overall-band"
      >
        <span
          className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: overallColour }}
          data-tts="Overall NC band"
        >
          Overall NC Band
        </span>
        <span
          className="text-3xl font-bold"
          style={{ color: overallColour }}
          data-tts={BAND_LABELS[overallBand]}
        >
          {BAND_LABELS[overallBand]}
        </span>
        <span className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {assessment.taf_band_label}
        </span>
      </div>

      {/* Dimension score cards */}
      <section>
        <h3
          className="text-base font-semibold mb-3"
          style={{ color: 'var(--color-text)' }}
          data-tts="Dimension scores"
        >
          Dimension Scores
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {dimensionKeys.map((dim) => {
            const dimData = assessment[dim]
            const band = dimData.score
            const colour = BAND_COLOURS[band]
            const isLowConf = assessment.low_confidence_flags.includes(dim as WritingDimension)

            return (
              <div
                key={dim}
                className="rounded-lg p-4"
                style={{
                  border: `1px solid ${colour}55`,
                  backgroundColor: colour + '0c',
                }}
                data-testid={`dimension-card-${dim}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: 'var(--color-text)' }}
                    data-tts={`${DIMENSION_LABELS[dim]}: ${BAND_LABELS[band]}`}
                  >
                    {DIMENSION_LABELS[dim]}
                  </span>
                  {isLowConf && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
                      title="Teacher review recommended"
                      data-tts="Low confidence — teacher review recommended"
                    >
                      Review
                    </span>
                  )}
                </div>

                <span
                  className="text-xs font-medium"
                  style={{ color: colour }}
                >
                  {BAND_LABELS[band]}
                </span>

                {/* Band pips */}
                <div className="flex gap-1 mt-2">
                  {([0, 1, 2, 3] as AssessmentBand[]).map((b) => (
                    <div
                      key={b}
                      className="h-1.5 flex-1 rounded-full"
                      style={{ backgroundColor: b <= band ? colour : '#E5E7EB' }}
                    />
                  ))}
                </div>

                {/* Evidence citation */}
                {dimData.evidence_citation && (
                  <p
                    className="text-xs mt-2 italic"
                    style={{ color: 'var(--color-text-muted)' }}
                    data-tts={`Evidence: ${dimData.evidence_citation}`}
                  >
                    "{dimData.evidence_citation}"
                  </p>
                )}

                {/* Pupil self-review stars — pupil view only */}
                {!isTeacherView && (
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-xs mr-1" style={{ color: 'var(--color-text-muted)' }}>
                      Your rating:
                    </span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleSelfReviewChange(dim as WritingDimension, star)}
                        aria-label={`Rate ${star} star${star > 1 ? 's' : ''} for ${DIMENSION_LABELS[dim]}`}
                        data-testid={`self-review-${dim}-${star}`}
                        className="text-base transition-transform hover:scale-110"
                        style={{
                          color: (selfReview[dim as WritingDimension] ?? 0) >= star ? '#F59E0B' : '#D1D5DB',
                        }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Low confidence flags */}
      {assessment.low_confidence_flags.length > 0 && (
        <section data-testid="confidence-flags">
          <h3
            className="text-sm font-semibold mb-2"
            style={{ color: 'var(--color-text)' }}
            data-tts="Areas for teacher review"
          >
            Areas for Teacher Review
          </h3>
          <div className="flex flex-wrap gap-2">
            {assessment.low_confidence_flags.map((flag) => (
              <span
                key={flag}
                className="text-xs px-3 py-1 rounded-full"
                style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}
                data-tts={`${DIMENSION_LABELS[flag]} needs teacher review`}
              >
                {DIMENSION_LABELS[flag]} — teacher review recommended
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Pupil feedback */}
      {!isTeacherView && (
        <section
          className="rounded-xl p-4 space-y-3"
          style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}
          data-testid="pupil-feedback"
        >
          <h3
            className="text-base font-semibold"
            style={{ color: '#166534' }}
            data-tts="Your feedback"
          >
            Your Feedback
          </h3>

          <p
            className="text-sm"
            style={{ color: '#166534' }}
            data-tts={assessment.pupil_feedback.warm_comment}
          >
            {assessment.pupil_feedback.warm_comment}
          </p>

          {[assessment.pupil_feedback.grow_1, assessment.pupil_feedback.grow_2].map((grow, i) => (
            <div key={i} className="rounded-lg p-3" style={{ backgroundColor: '#fff', border: '1px solid #BBF7D0' }}>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                Grow {i + 1}: {grow.comment}
              </p>
              {grow.example_rewrite && (
                <p
                  className="text-xs italic"
                  style={{ color: 'var(--color-text-muted)' }}
                  data-tts={`Example rewrite: ${grow.example_rewrite}`}
                >
                  Try: "{grow.example_rewrite}"
                </p>
              )}
            </div>
          ))}

          {assessment.pupil_feedback.next_steps && (
            <p
              className="text-sm font-medium"
              style={{ color: '#1E40AF' }}
              data-tts={`Next steps: ${assessment.pupil_feedback.next_steps}`}
            >
              Next steps: {assessment.pupil_feedback.next_steps}
            </p>
          )}
        </section>
      )}

      {/* Teacher summary — teacher view only */}
      {isTeacherView && assessment.teacher_summary && (
        <section
          className="rounded-xl p-4"
          style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}
          data-testid="teacher-summary"
        >
          <h3 className="text-sm font-semibold mb-2" style={{ color: '#1E40AF' }}>
            Teacher Summary
          </h3>
          <p className="text-sm" style={{ color: '#1E3A8A' }}>
            {assessment.teacher_summary}
          </p>
        </section>
      )}

      {/* Pupil confidence — pupil view only */}
      {!isTeacherView && (
        <section data-testid="pupil-confidence">
          <h3
            className="text-sm font-semibold mb-2"
            style={{ color: 'var(--color-text)' }}
            data-tts="How confident do you feel about this piece?"
          >
            How confident do you feel about this piece?
          </h3>
          <div className="flex gap-3">
            {[
              { rating: 1, emoji: '😟', label: 'Not confident' },
              { rating: 2, emoji: '😐', label: 'A little unsure' },
              { rating: 3, emoji: '🙂', label: 'Okay' },
              { rating: 4, emoji: '😊', label: 'Pretty good' },
              { rating: 5, emoji: '😄', label: 'Very confident' },
            ].map(({ rating, emoji, label }) => (
              <button
                key={rating}
                type="button"
                onClick={() => handleConfidence(rating)}
                aria-label={label}
                aria-pressed={pupilConfidence === rating}
                data-testid={`confidence-${rating}`}
                className="flex flex-col items-center gap-1 p-2 rounded-lg transition-all text-2xl"
                style={{
                  border: pupilConfidence === rating
                    ? '2px solid var(--color-brand-primary)'
                    : '2px solid var(--color-border)',
                  backgroundColor: pupilConfidence === rating ? '#EFF6FF' : 'transparent',
                  minWidth: '48px',
                  minHeight: '60px',
                }}
              >
                {emoji}
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {rating}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Publish button — pupil view only */}
      {!isTeacherView && !published && (
        <button
          type="button"
          onClick={handlePublish}
          data-testid="publish-button"
          data-tts="Publish to Teacher"
          className="w-full py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-brand-primary)' }}
        >
          Publish to Teacher
        </button>
      )}
      {!isTeacherView && published && (
        <div
          className="text-center py-3 rounded-xl text-sm font-medium"
          style={{ backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' }}
          data-tts="Published to your teacher"
        >
          Published to your teacher
        </div>
      )}
    </div>
  )
}
