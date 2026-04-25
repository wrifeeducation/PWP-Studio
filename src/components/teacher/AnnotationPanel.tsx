/**
 * WF-019 — AnnotationPanel
 * Teacher adds text comments; each comment can optionally override a dimension score.
 * Saves annotations to `teacher_annotations` table.
 */

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { WritingDimension, AssessmentBand } from '../../types/index'

const DIMENSION_LABELS: Record<WritingDimension, string> = {
  [WritingDimension.COMPOSITION]: 'Composition',
  [WritingDimension.VOCABULARY]: 'Vocabulary',
  [WritingDimension.GRAMMAR]: 'Grammar',
  [WritingDimension.PUNCTUATION]: 'Punctuation',
  [WritingDimension.SPELLING]: 'Spelling',
  [WritingDimension.PURPOSE_AUDIENCE_EFFECT]: 'Purpose, Audience & Effect',
}

const BAND_LABELS: Record<AssessmentBand, string> = {
  [AssessmentBand.PRE_EMERGENT]: '0 — Pre-emergent',
  [AssessmentBand.WORKING_TOWARDS]: '1 — Working Towards',
  [AssessmentBand.EXPECTED]: '2 — Expected Standard',
  [AssessmentBand.GREATER_DEPTH]: '3 — Greater Depth',
}

interface AnnotationPanelProps {
  pieceId: string
  teacherId: string
  onAnnotationSaved?: () => void
}

export const AnnotationPanel = ({ pieceId, teacherId, onAnnotationSaved }: AnnotationPanelProps) => {
  const [commentText, setCommentText] = useState('')
  const [dimensionOverride, setDimensionOverride] = useState<WritingDimension | ''>('')
  const [overrideScore, setOverrideScore] = useState<AssessmentBand | ''>('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    if (!commentText.trim()) return
    setSaving(true)
    try {
      await supabase.from('teacher_annotations').insert({
        piece_id: pieceId,
        teacher_id: teacherId,
        comment_text: commentText,
        dimension_override: dimensionOverride || null,
        override_score: overrideScore !== '' ? overrideScore : null,
      })
      setCommentText('')
      setDimensionOverride('')
      setOverrideScore('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      onAnnotationSaved?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      data-testid="annotation-panel"
    >
      <h3
        className="text-sm font-semibold"
        style={{ color: 'var(--color-text)' }}
        data-tts="Add teacher annotation"
      >
        Add Annotation
      </h3>

      <textarea
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        placeholder="Write your feedback comment here…"
        rows={4}
        data-testid="annotation-comment"
        data-tts="Teacher comment input"
        className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2"
        style={{
          border: '1px solid var(--color-border)',
          color: 'var(--color-text)',
          backgroundColor: 'var(--color-background)',
        }}
      />

      {/* Optional dimension override */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <label
            htmlFor="override-dimension"
            className="text-xs"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Override dimension (optional)
          </label>
          <select
            id="override-dimension"
            value={dimensionOverride}
            onChange={(e) => setDimensionOverride(e.target.value as WritingDimension | '')}
            data-testid="override-dimension"
            className="rounded-lg px-2 py-1.5 text-sm"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          >
            <option value="">No override</option>
            {Object.values(WritingDimension).map((d) => (
              <option key={d} value={d}>{DIMENSION_LABELS[d]}</option>
            ))}
          </select>
        </div>

        {dimensionOverride && (
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <label
              htmlFor="override-score"
              className="text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Override score
            </label>
            <select
              id="override-score"
              value={overrideScore}
              onChange={(e) => setOverrideScore(Number(e.target.value) as AssessmentBand)}
              data-testid="override-score"
              className="rounded-lg px-2 py-1.5 text-sm"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            >
              <option value="">Select band…</option>
              {([0, 1, 2, 3] as AssessmentBand[]).map((b) => (
                <option key={b} value={b}>{BAND_LABELS[b]}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !commentText.trim()}
        data-testid="save-annotation-button"
        data-tts="Save annotation"
        className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity"
        style={{
          backgroundColor: 'var(--color-brand-primary)',
          opacity: saving || !commentText.trim() ? 0.5 : 1,
          cursor: saving || !commentText.trim() ? 'not-allowed' : 'pointer',
        }}
      >
        {saving ? 'Saving…' : 'Save Annotation'}
      </button>

      {saved && (
        <p className="text-xs" style={{ color: '#16A34A' }} role="status">
          Annotation saved.
        </p>
      )}
    </div>
  )
}
