/**
 * OutOfStars — WF-050
 * Shown when a free-tier pupil exhausts their daily star allocation.
 * Friendly, calm, not punishing. Countdown to midnight replenishment.
 * Review mode is always available.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface OutOfStarsProps {
  onReview: () => void   // navigate to review / dashboard
  onUpgrade: () => void  // navigate to pricing page
}

function getSecondsUntilMidnight(): number {
  const now = new Date()
  const midnight = new Date()
  midnight.setHours(24, 0, 0, 0)
  return Math.floor((midnight.getTime() - now.getTime()) / 1000)
}

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':')
}

export function OutOfStars({ onReview, onUpgrade }: OutOfStarsProps) {
  const [secondsLeft, setSecondsLeft] = useState(getSecondsUntilMidnight())

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(getSecondsUntilMidnight())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        background: 'var(--color-bg)',
        fontFamily: "'Nunito', sans-serif",
        textAlign: 'center',
        gap: 0,
      }}
      data-testid="out-of-stars-screen"
    >
      {/* Stars illustration */}
      <div style={{ fontSize: 52, marginBottom: 8, lineHeight: 1 }} aria-hidden="true">
        ☆☆☆
      </div>

      <h1
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: 'var(--color-text)',
          margin: '0 0 10px',
        }}
        data-tts="You've used all your stars for today"
      >
        You've used all your stars today!
      </h1>

      <p
        style={{
          fontSize: 15,
          color: 'var(--color-text-muted)',
          margin: '0 0 28px',
          maxWidth: 320,
          lineHeight: 1.5,
        }}
        data-tts="Great effort! Your stars will be back tomorrow. Keep practising to earn them back sooner."
      >
        Great effort! Your stars come back tomorrow — or go Pro for unlimited practice every day.
      </p>

      {/* Countdown */}
      <div
        style={{
          background: '#FFF7ED',
          border: '1px solid #FED7AA',
          borderRadius: 16,
          padding: '16px 28px',
          marginBottom: 28,
        }}
      >
        <p style={{ fontSize: 11, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>
          Stars back in
        </p>
        <p
          style={{ fontSize: 32, fontWeight: 800, color: '#D97706', margin: 0, fontVariantNumeric: 'tabular-nums' }}
          data-tts={`Stars replenish in ${formatCountdown(secondsLeft)}`}
          aria-live="polite"
        >
          {formatCountdown(secondsLeft)}
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
        {/* Review completed levels — always free */}
        <button
          onClick={onReview}
          style={{
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 14,
            padding: '14px 20px',
            fontSize: 15,
            fontWeight: 800,
            fontFamily: 'inherit',
            cursor: 'pointer',
            width: '100%',
          }}
          data-tts="Review completed levels"
        >
          📖 Review completed levels
        </button>

        {/* Upgrade */}
        <button
          onClick={onUpgrade}
          style={{
            background: 'transparent',
            color: '#6C5CE7',
            border: '2px solid #6C5CE7',
            borderRadius: 14,
            padding: '13px 20px',
            fontSize: 15,
            fontWeight: 800,
            fontFamily: 'inherit',
            cursor: 'pointer',
            width: '100%',
          }}
          data-tts="Go Pro for unlimited stars"
        >
          ✦ Go Pro — unlimited stars
        </button>
      </div>

      {/* Small reassurance */}
      <p
        style={{
          fontSize: 12,
          color: 'var(--color-text-muted)',
          marginTop: 24,
          maxWidth: 280,
          lineHeight: 1.5,
        }}
      >
        Tip: Getting answers right first time means your stars last longer!
      </p>
    </div>
  )
}
