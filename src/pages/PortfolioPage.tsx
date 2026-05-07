/**
 * WF-029: Pupil Portfolio
 * Route: /portfolio — pupils only.
 * Shows published writing pieces, badges strip, and progress charts.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { pdf } from '@react-pdf/renderer'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { WritingPiecePDF } from '../components/writing-studio/WritingPiecePDF'
import { getPupilCertificates, type Certificate } from '../lib/certificateEngine'
import type {
  WritingPiece,
  AIAssessment,
  TeacherAnnotation,
  Badge,
  PupilBadge,
  BadgeCategory,
  FormulaSession,
} from '../types/index'
import { Genre } from '../types/index'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GENRE_COLOURS: Record<Genre, string> = {
  [Genre.NARRATIVE]: '#7C3AED',
  [Genre.NON_FICTION]: '#0369A1',
  [Genre.PERSUASIVE]: '#B45309',
  [Genre.POETRY]: '#BE185D',
}

const GENRE_LABELS: Record<Genre, string> = {
  [Genre.NARRATIVE]: 'Narrative',
  [Genre.NON_FICTION]: 'Non-fiction',
  [Genre.PERSUASIVE]: 'Persuasive',
  [Genre.POETRY]: 'Poetry',
}

const ASSESSMENT_BAND_LABELS = ['Pre-Emergent', 'Working Towards', 'Expected', 'Greater Depth']

function promptTitle(piece: WritingPiece): string {
  const words = piece.task_prompt_text.split(' ').slice(0, 8).join(' ')
  return words.length < piece.task_prompt_text.length ? `${words}…` : words
}

// ─── XP progress line chart (simple SVG) ──────────────────────────────────────

interface XPChartProps {
  sessions: FormulaSession[]
}

function XPChart({ sessions }: XPChartProps) {
  if (sessions.length < 2) {
    return (
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }} data-tts="Not enough sessions to show a chart yet">
        Complete more sessions to see your progress chart.
      </p>
    )
  }

  const cumulative: number[] = []
  sessions.reduce((acc, s, i) => {
    cumulative[i] = acc + s.xp_earned
    return cumulative[i]
  }, 0)

  const maxXP = cumulative[cumulative.length - 1] || 1
  const W = 320
  const H = 80
  const pts = cumulative.map((v, i) => {
    const x = (i / (cumulative.length - 1)) * W
    const y = H - (v / maxXP) * (H - 8) - 4
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      role="img"
      aria-label="XP progress over time"
      data-testid="xp-line-chart"
    >
      <polyline
        fill="none"
        stroke="var(--color-brand-primary)"
        strokeWidth="2"
        strokeLinejoin="round"
        points={pts.join(' ')}
      />
      {cumulative.map((_, i) => {
        const x = (i / (cumulative.length - 1)) * W
        const y = H - (cumulative[i] / maxXP) * (H - 8) - 4
        return (
          <circle key={i} cx={x} cy={y} r={3} fill="var(--color-brand-primary)" />
        )
      })}
    </svg>
  )
}

// ─── Piece card ────────────────────────────────────────────────────────────────

interface PieceCardProps {
  piece: WritingPiece
  assessment: AIAssessment | undefined
  annotationCount: number
  pupilName: string
}

function PieceCard({ piece, assessment, annotationCount, pupilName }: PieceCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const colour = GENRE_COLOURS[piece.genre] ?? '#6B7280'

  const handleDownloadPDF = async () => {
    setDownloading(true)
    try {
      const blob = await pdf(
        <WritingPiecePDF piece={piece} assessment={assessment} pupilName={pupilName} />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `WriFe-${pupilName.replace(/\s/g, '-')}-${promptTitle(piece).replace(/\s/g, '-').slice(0, 30)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF generation failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <motion.div
      layout
      className="rounded-xl overflow-hidden"
      style={{ border: `2px solid ${colour}33`, backgroundColor: 'var(--color-surface)' }}
      data-testid={`portfolio-piece-${piece.id}`}
    >
      {/* Card header */}
      <button
        type="button"
        className="w-full text-left p-4 flex items-start gap-3 focus:outline-none focus-visible:ring-2"
        onClick={() => setExpanded((v) => !v)}
        data-tts={`Writing piece: ${promptTitle(piece)}`}
        aria-expanded={expanded}
      >
        {/* Genre colour bar */}
        <div
          className="w-1 self-stretch rounded-full flex-shrink-0"
          style={{ backgroundColor: colour }}
          aria-hidden="true"
        />

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ backgroundColor: `${colour}22`, color: colour }}
            >
              {GENRE_LABELS[piece.genre]}
            </span>
            {assessment?.overall_band != null && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' }}
                data-tts={`NC Band: ${ASSESSMENT_BAND_LABELS[assessment.overall_band]}`}
              >
                {ASSESSMENT_BAND_LABELS[assessment.overall_band]}
              </span>
            )}
          </div>

          <p
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--color-text)' }}
            data-tts={promptTitle(piece)}
          >
            {promptTitle(piece)}
          </p>

          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <span data-tts={`${piece.word_count} words`}>{piece.word_count} words</span>
            {piece.published_at && (
              <span data-tts={`Published ${new Date(piece.published_at).toLocaleDateString('en-GB')}`}>
                {new Date(piece.published_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            )}
            {annotationCount > 0 && (
              <span data-tts={`${annotationCount} teacher comments`}>
                {annotationCount} comment{annotationCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        <span
          className="text-lg flex-shrink-0 transition-transform"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      {/* Expanded: full piece + assessment summary */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t px-4 pb-4 pt-3 space-y-4"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {/* Download PDF button (WF-033) */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={downloading}
              data-testid={`download-pdf-${piece.id}`}
              className="text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-opacity"
              style={{
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)',
                opacity: downloading ? 0.6 : 1,
              }}
              data-tts="Download as PDF"
            >
              📄 {downloading ? 'Generating…' : 'Download PDF'}
            </button>
          </div>

          {/* Full piece text */}
          <div
            className="prose prose-sm max-w-none text-sm leading-relaxed"
            style={{ color: 'var(--color-text)' }}
            dangerouslySetInnerHTML={{ __html: piece.full_text }}
            data-tts="Full writing piece"
          />

          {/* AI assessment summary */}
          {assessment && (
            <div
              className="rounded-lg p-3 text-xs space-y-1"
              style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)' }}
            >
              <p className="font-semibold" style={{ color: 'var(--color-text)' }} data-tts="AI assessment">
                AI Assessment
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1" style={{ color: 'var(--color-text-muted)' }}>
                {assessment.composition_score != null && (
                  <span data-tts={`Composition: ${ASSESSMENT_BAND_LABELS[assessment.composition_score]}`}>
                    Composition: {ASSESSMENT_BAND_LABELS[assessment.composition_score]}
                  </span>
                )}
                {assessment.vocabulary_score != null && (
                  <span data-tts={`Vocabulary: ${ASSESSMENT_BAND_LABELS[assessment.vocabulary_score]}`}>
                    Vocabulary: {ASSESSMENT_BAND_LABELS[assessment.vocabulary_score]}
                  </span>
                )}
                {assessment.grammar_score != null && (
                  <span data-tts={`Grammar: ${ASSESSMENT_BAND_LABELS[assessment.grammar_score]}`}>
                    Grammar: {ASSESSMENT_BAND_LABELS[assessment.grammar_score]}
                  </span>
                )}
                {assessment.spelling_score != null && (
                  <span data-tts={`Spelling: ${ASSESSMENT_BAND_LABELS[assessment.spelling_score]}`}>
                    Spelling: {ASSESSMENT_BAND_LABELS[assessment.spelling_score]}
                  </span>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}

// ─── Badges strip ──────────────────────────────────────────────────────────────

interface BadgesStripProps {
  pupilId: string
}

function BadgesStrip({ pupilId }: BadgesStripProps) {
  const { data: pupilBadges } = useQuery<Array<PupilBadge & { badges: Badge }>>({
    queryKey: ['portfolio_badges', pupilId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pupil_badges')
        .select('*, badges(*)')
        .eq('pupil_id', pupilId)
        .order('earned_at', { ascending: true })
      if (error) throw error
      return data as Array<PupilBadge & { badges: Badge }>
    },
    enabled: !!pupilId,
    staleTime: 1000 * 60 * 2,
  })

  if (!pupilBadges?.length) return null

  // Group by category
  const grouped: Record<string, Array<PupilBadge & { badges: Badge }>> = {}
  for (const pb of pupilBadges) {
    const cat: BadgeCategory = pb.badges?.category ?? 'shared'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(pb)
  }

  return (
    <section aria-label="My Badges" data-testid="portfolio-badges">
      <h2
        className="text-sm font-semibold uppercase tracking-wider mb-3"
        style={{ color: 'var(--color-text-muted)' }}
        data-tts="My Badges"
      >
        My Badges
      </h2>
      {Object.entries(grouped).map(([category, badges]) => (
        <div key={category} className="mb-4">
          <p className="text-xs font-medium mb-2 capitalize" style={{ color: 'var(--color-text-muted)' }}>
            {category.replace(/_/g, ' ')}
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollSnapType: 'x mandatory' }}>
            {badges.map((pb, i) => (
              <div
                key={pb.id}
                className="flex flex-col items-center gap-1 flex-shrink-0"
                style={{ scrollSnapAlign: 'start' }}
                data-testid={`badge-strip-${i}`}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
                    border: '2px solid #FCD34D',
                  }}
                  title={pb.badges?.name}
                  aria-label={pb.badges?.name}
                >
                  {pb.badges?.icon_key || '🏅'}
                </div>
                <span
                  className="text-xs text-center leading-tight"
                  style={{ color: 'var(--color-text-muted)', maxWidth: '56px' }}
                  data-tts={pb.badges?.name}
                >
                  {pb.badges?.name?.slice(0, 14) ?? 'Badge'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

// ─── My Progress section ───────────────────────────────────────────────────────

interface ProgressSectionProps {
  pupilId: string
}

function ProgressSection({ pupilId }: ProgressSectionProps) {
  const { data: sessions } = useQuery<FormulaSession[]>({
    queryKey: ['portfolio_formula_sessions', pupilId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('formula_sessions')
        .select('*')
        .eq('pupil_id', pupilId)
        .order('created_at', { ascending: true })
        .limit(50)
      if (error) throw error
      return data as FormulaSession[]
    },
    enabled: !!pupilId,
    staleTime: 1000 * 60 * 5,
  })

  if (!sessions?.length) return null

  return (
    <section aria-label="My Progress" data-testid="portfolio-progress">
      <h2
        className="text-sm font-semibold uppercase tracking-wider mb-3"
        style={{ color: 'var(--color-text-muted)' }}
        data-tts="My Progress"
      >
        My Progress
      </h2>

      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }} data-tts="XP over time">
          XP over time
        </p>
        <XPChart sessions={sessions} />

        <div className="mt-3 flex gap-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <span data-tts={`Total sessions: ${sessions.length}`}>
            Sessions: <strong style={{ color: 'var(--color-text)' }}>{sessions.length}</strong>
          </span>
          <span data-tts={`Current level: ${sessions[sessions.length - 1]?.level_id ?? 1}`}>
            Current level:{' '}
            <strong style={{ color: 'var(--color-text)' }}>
              L{sessions[sessions.length - 1]?.level_id ?? 1}
            </strong>
          </span>
        </div>
      </div>
    </section>
  )
}

// ─── Main Portfolio Page ───────────────────────────────────────────────────────

export default function PortfolioPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const pupilName = profile?.first_name ?? 'Pupil'

  // Fetch published writing pieces
  const { data: pieces, isLoading: piecesLoading } = useQuery<WritingPiece[]>({
    queryKey: ['portfolio_pieces', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data, error } = await supabase
        .from('writing_pieces')
        .select('*')
        .eq('pupil_id', user.id)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
      if (error) throw error
      return data as WritingPiece[]
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  })

  // Fetch AI assessments for those pieces
  const pieceIds = (pieces ?? []).map((p) => p.id)
  const { data: assessments } = useQuery<AIAssessment[]>({
    queryKey: ['portfolio_assessments', pieceIds],
    queryFn: async () => {
      if (!pieceIds.length) return []
      const { data, error } = await supabase
        .from('ai_assessments')
        .select('*')
        .in('piece_id', pieceIds)
      if (error) throw error
      return data as AIAssessment[]
    },
    enabled: pieceIds.length > 0,
    staleTime: 1000 * 60 * 5,
  })

  // Fetch teacher annotation counts
  const { data: annotations } = useQuery<TeacherAnnotation[]>({
    queryKey: ['portfolio_annotations', pieceIds],
    queryFn: async () => {
      if (!pieceIds.length) return []
      const { data, error } = await supabase
        .from('teacher_annotations')
        .select('id, piece_id')
        .in('piece_id', pieceIds)
      if (error) throw error
      return data as TeacherAnnotation[]
    },
    enabled: pieceIds.length > 0,
    staleTime: 1000 * 60 * 5,
  })

  const assessmentMap = Object.fromEntries(
    (assessments ?? []).map((a) => [a.piece_id, a])
  )

  const annotationCountMap: Record<string, number> = {}
  for (const a of annotations ?? []) {
    if (a.piece_id) {
      annotationCountMap[a.piece_id] = (annotationCountMap[a.piece_id] ?? 0) + 1
    }
  }

  return (
    <div
      className="min-h-screen pb-12"
      style={{ backgroundColor: 'var(--color-background)' }}
      data-testid="portfolio-page"
    >
      {/* Header */}
      <header
        className="px-4 py-4 flex items-center justify-between sticky top-0 z-10"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
        }}
        data-testid="portfolio-header"
      >
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm px-3 py-1.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2"
          style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
          data-testid="portfolio-back"
          data-tts="Back to dashboard"
          aria-label="Back to dashboard"
        >
          ← Back
        </button>

        <span
          className="font-bold text-base"
          style={{ color: 'var(--color-text)' }}
          data-tts="My Portfolio"
        >
          My Portfolio
        </span>

        <div style={{ width: '60px' }} aria-hidden="true" />
      </header>

      <main className="max-w-xl mx-auto px-4 pt-6 space-y-8">
        {/* Published pieces section */}
        <section aria-label="Published Writing" data-testid="portfolio-pieces-section">
          <h2
            className="text-sm font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-text-muted)' }}
            data-tts="My Writing"
          >
            My Writing
          </h2>

          {piecesLoading && (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Loading…
            </p>
          )}

          {!piecesLoading && (!pieces || pieces.length === 0) && (
            <div
              className="rounded-xl p-6 text-center"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <p
                className="text-sm"
                style={{ color: 'var(--color-text-muted)' }}
                data-tts="No published writing yet. Complete a Writing Studio task to see your work here."
              >
                No published writing yet. Complete a Writing Studio task to see your work here.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {(pieces ?? []).map((piece, i) => (
              <motion.div
                key={piece.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <PieceCard
                  piece={piece}
                  assessment={assessmentMap[piece.id]}
                  annotationCount={annotationCountMap[piece.id] ?? 0}
                  pupilName={pupilName}
                />
              </motion.div>
            ))}
          </div>
        </section>

        {/* Certificates section (WF-042) */}
        {user?.id && <CertificatesSection pupilId={user.id} pupilName={pupilName} />}

        {/* Badges strip */}
        {user?.id && <BadgesStrip pupilId={user.id} />}

        {/* Progress section */}
        {user?.id && <ProgressSection pupilId={user.id} />}
      </main>
    </div>
  )
}

// ─── Certificates Section ──────────────────────────────────────────────────────

interface CertificatesSectionProps {
  pupilId: string
  pupilName: string
}

const CERT_LABELS: Record<Certificate['certificate_type'], string> = {
  formula_mastery: 'Formula Master',
  paragraph_mastery: 'Paragraph Master',
  writing_band2: 'Writing Star',
  writing_band3: 'Writing Champion',
  streak_30: '30-Day Streak Champion',
}

function CertificatesSection({ pupilId, pupilName }: CertificatesSectionProps) {
  const { data: certificates, isLoading } = useQuery<Certificate[]>({
    queryKey: ['portfolio_certificates', pupilId],
    queryFn: () => getPupilCertificates(pupilId),
    enabled: !!pupilId,
    staleTime: 1000 * 60 * 5,
  })

  if (isLoading || !certificates?.length) return null

  return (
    <section aria-label="My Certificates" data-testid="portfolio-certificates">
      <h2
        className="text-sm font-semibold uppercase tracking-wider mb-3"
        style={{ color: 'var(--color-text-muted)' }}
        data-tts="My Certificates"
      >
        My Certificates
      </h2>
      <div className="space-y-2">
        {certificates.map((cert) => (
          <div
            key={cert.id}
            className="rounded-xl p-4 flex items-center justify-between print-section"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '2px solid var(--color-brand-primary)',
            }}
            data-testid={`certificate-${cert.id}`}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-brand-primary)' }}>
                ⭐ Level {cert.level_id} — {CERT_LABELS[cert.certificate_type] ?? cert.certificate_type}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {pupilName} · {new Date(cert.awarded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                // Certificate PDF download — placeholder for now
                window.print()
              }}
              className="print-btn text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ backgroundColor: 'var(--color-brand-primary)', color: '#fff' }}
              data-testid={`download-cert-${cert.id}`}
              data-tts="Download certificate"
            >
              Download
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
