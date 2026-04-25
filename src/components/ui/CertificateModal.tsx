/**
 * WF-042 — Certificate Modal
 * Celebratory modal shown when a pupil earns a certificate.
 * CSS-only confetti/stars animation — no extra libraries.
 */

import { useEffect, useRef } from 'react'
import type { CertificateType } from '../../lib/certificateEngine'

interface CertificateModalProps {
  pupilName: string
  levelId: number
  certificateType: CertificateType
  awardedAt: string
  onClose: () => void
  onDownload: () => void
}

const TYPE_LABELS: Record<CertificateType, string> = {
  formula_mastery: 'Formula Master',
  paragraph_mastery: 'Paragraph Master',
  writing_band2: 'Writing Star',
  writing_band3: 'Writing Champion',
  streak_30: '30-Day Streak Champion',
}

export function CertificateModal({
  pupilName,
  levelId,
  certificateType,
  awardedAt,
  onClose,
  onDownload,
}: CertificateModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose()
  }

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const dateFormatted = new Date(awardedAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <>
      <style>{`
        @keyframes certStar {
          0%   { transform: scale(0) rotate(0deg); opacity: 0; }
          60%  { transform: scale(1.3) rotate(20deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes certConfetti {
          0%   { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(80px) rotate(360deg); opacity: 0; }
        }
        @keyframes certSlideIn {
          from { transform: translateY(40px) scale(0.95); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }
        .cert-star { animation: certStar 0.6s cubic-bezier(0.34,1.56,0.64,1) both; }
        .cert-confetti { animation: certConfetti 1.2s ease-in forwards; }
        .cert-panel { animation: certSlideIn 0.4s ease-out both; }
      `}</style>

      <div
        ref={backdropRef}
        onClick={handleBackdropClick}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cert-heading"
        data-testid="certificate-modal"
      >
        {/* Confetti particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="cert-confetti absolute w-2 h-2 rounded-sm"
              style={{
                left: `${10 + i * 4.5}%`,
                top: `${5 + (i % 5) * 5}%`,
                backgroundColor: ['#F59E0B', '#2563EB', '#7C3AED', '#16A34A', '#DB2777'][i % 5],
                animationDelay: `${i * 0.06}s`,
              }}
            />
          ))}
        </div>

        {/* Certificate card */}
        <div
          className="cert-panel relative rounded-2xl p-8 max-w-sm w-full mx-4 text-center"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '3px solid var(--color-brand-primary)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}
        >
          {/* Stars */}
          <div className="flex justify-center gap-3 mb-4" aria-hidden="true">
            {[0, 0.1, 0.2].map((delay, i) => (
              <span
                key={i}
                className="cert-star text-3xl"
                style={{ animationDelay: `${delay}s` }}
              >
                ⭐
              </span>
            ))}
          </div>

          <h2
            id="cert-heading"
            className="text-2xl font-bold mb-1"
            style={{ color: 'var(--color-brand-primary)' }}
            data-tts={`Level ${levelId} ${TYPE_LABELS[certificateType]}`}
          >
            Level {levelId} {TYPE_LABELS[certificateType]}
          </h2>

          <p className="text-base font-semibold mt-2" style={{ color: 'var(--color-text)' }}>
            {pupilName}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Awarded {dateFormatted}
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={onDownload}
              data-testid="download-certificate-button"
              className="print-btn w-full py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: 'var(--color-brand-primary)' }}
              data-tts="Download certificate"
            >
              Download Certificate
            </button>
            <button
              type="button"
              onClick={onClose}
              data-testid="close-certificate-modal"
              className="w-full py-2 rounded-lg text-sm font-medium"
              style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
