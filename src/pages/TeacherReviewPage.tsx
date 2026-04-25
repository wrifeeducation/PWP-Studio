/**
 * WF-019 — TeacherReviewPage
 * Route: /teacher/review/:pieceId
 * Shows the full writing piece, AI assessment (read-only), annotation panel,
 * and action buttons: Mark as Reviewed, Publish to Pupil.
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { AssessmentReport } from '../components/writing-studio/AssessmentReport'
import { AnnotationPanel } from '../components/teacher/AnnotationPanel'
import type { AssessWritingOutput } from '../lib/assessWriting'
import type { WritingPiece, AIAssessment } from '../types/index'
import { AssessmentBand } from '../types/index'

export default function TeacherReviewPage() {
  const { pieceId } = useParams<{ pieceId: string }>()
  const navigate = useNavigate()
  const { profile } = useAuthStore()

  const [piece, setPiece] = useState<WritingPiece | null>(null)
  const [rawAssessment, setRawAssessment] = useState<AIAssessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!pieceId) return
    Promise.all([
      supabase.from('writing_pieces').select('*').eq('id', pieceId).single(),
      supabase.from('ai_assessments').select('*').eq('piece_id', pieceId).order('assessed_at', { ascending: false }).limit(1).single(),
    ]).then(([pieceResult, assessResult]) => {
      if (pieceResult.data) setPiece(pieceResult.data as WritingPiece)
      if (assessResult.data) setRawAssessment(assessResult.data as AIAssessment)
      setLoading(false)
    })
  }, [pieceId])

  const handleMarkReviewed = async () => {
    if (!pieceId || !profile) return
    await supabase.from('writing_pieces').update({
      status: 'assessed',
      reviewed_at: new Date().toISOString(),
      teacher_id: profile.id,
    }).eq('id', pieceId)
    setActionMsg('Marked as reviewed.')
    setTimeout(() => setActionMsg(null), 2500)
  }

  const handlePublish = async () => {
    if (!pieceId) return
    await supabase.from('writing_pieces').update({
      status: 'published',
      published_at: new Date().toISOString(),
    }).eq('id', pieceId)
    setActionMsg('Published to pupil.')
    setTimeout(() => setActionMsg(null), 2500)
  }

  // Convert raw DB assessment to AssessWritingOutput shape for AssessmentReport
  const toAssessWritingOutput = (a: AIAssessment): AssessWritingOutput => {
    const getScore = (val: AssessmentBand | null): AssessmentBand => val ?? AssessmentBand.PRE_EMERGENT
    const getConf = (dim: string) =>
      ((a.confidence_scores as Record<string, number> | null)?.[dim]) ?? 0.5
    const getCitation = (dim: string) => {
      const citations = a.evidence_citations as Record<string, string[]> | null
      return citations?.[dim]?.[0] ?? ''
    }
    const raw = (a.raw_ai_response as Record<string, unknown>) ?? {}
    const feedback = (raw.pupil_feedback as AssessWritingOutput['pupil_feedback']) ?? {
      warm_comment: '',
      grow_1: { comment: '', example_rewrite: '' },
      grow_2: { comment: '', example_rewrite: '' },
      next_steps: '',
    }
    return {
      composition: { score: getScore(a.composition_score), confidence: getConf('composition'), evidence_citation: getCitation('composition') },
      vocabulary: { score: getScore(a.vocabulary_score), confidence: getConf('vocabulary'), evidence_citation: getCitation('vocabulary') },
      grammar: { score: getScore(a.grammar_score), confidence: getConf('grammar'), evidence_citation: getCitation('grammar') },
      punctuation: { score: getScore(a.punctuation_score), confidence: getConf('punctuation'), evidence_citation: getCitation('punctuation') },
      spelling: { score: getScore(a.spelling_score), confidence: getConf('spelling'), evidence_citation: getCitation('spelling') },
      purpose_audience_effect: { score: getScore(a.purpose_audience_effect_score), confidence: getConf('purpose_audience_effect'), evidence_citation: getCitation('purpose_audience_effect') },
      overall_band: getScore(a.overall_band),
      low_confidence_flags: (a.flags as { low_confidence_dims: AssessWritingOutput['low_confidence_flags'] } | null)?.low_confidence_dims ?? [],
      raw_ai_response: raw,
      pupil_feedback: feedback,
      teacher_summary: (raw.teacher_summary as string) ?? '',
      taf_band_label: (raw.taf_band_label as string) ?? '',
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
      </div>
    )
  }

  if (!piece) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: 'var(--color-text-muted)' }}>Writing piece not found.</p>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--color-background)' }}
      data-testid="teacher-review-page"
    >
      {/* Header */}
      <header
        className="px-4 py-3 flex items-center gap-4 sticky top-0 z-10 no-print"
        style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
      >
        <button
          type="button"
          onClick={() => navigate('/teacher')}
          className="text-sm px-3 py-1.5 rounded-lg"
          style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
          data-testid="back-to-teacher"
        >
          ← Teacher Dashboard
        </button>
        <span
          className="font-bold text-base"
          style={{ color: 'var(--color-text)' }}
          data-tts="Review writing piece"
        >
          Review Writing Piece
        </span>
      </header>

      {actionMsg && (
        <div
          className="text-center py-2 text-sm font-medium"
          style={{ backgroundColor: '#F0FDF4', color: '#166534' }}
          role="status"
        >
          {actionMsg}
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row max-w-6xl mx-auto w-full">

        {/* Writing piece — left */}
        <main className="flex-1 p-4 space-y-4">
          <div
            className="rounded-xl p-5 print-section"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <h2
              className="text-base font-bold mb-1"
              style={{ color: 'var(--color-text)' }}
              data-tts="Writing piece"
            >
              Writing Piece
            </h2>
            <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
              {piece.word_count} words · {piece.genre} · {piece.status}
            </p>
            <div
              className="prose prose-sm max-w-none text-left"
              style={{ color: 'var(--color-text)', lineHeight: '1.7' }}
              data-tts="Full writing piece text"
              dangerouslySetInnerHTML={{ __html: piece.full_text }}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleMarkReviewed}
              data-testid="mark-reviewed-button"
              data-tts="Mark as reviewed"
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            >
              Mark as Reviewed
            </button>
            <button
              type="button"
              onClick={handlePublish}
              data-testid="publish-to-pupil-button"
              data-tts="Publish to pupil"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: 'var(--color-brand-primary)' }}
            >
              Publish to Pupil
            </button>
          </div>
        </main>

        {/* Right sidebar: assessment + annotations */}
        <aside
          className="w-full lg:w-96 flex-shrink-0 p-4 space-y-4"
          style={{ borderLeft: '1px solid var(--color-border)' }}
        >
          {rawAssessment && (
            <AssessmentReport
              assessment={toAssessWritingOutput(rawAssessment)}
              pieceId={piece.id}
              isTeacherView
            />
          )}

          {profile && (
            <AnnotationPanel
              pieceId={piece.id}
              teacherId={profile.id}
            />
          )}
        </aside>
      </div>
    </div>
  )
}
