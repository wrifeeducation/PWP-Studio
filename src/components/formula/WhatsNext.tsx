/**
 * WhatsNext — shown after a formula feedback screen instead of dumping
 * the pupil back to the dashboard. Gives a sense of learning progression:
 * score recap, XP earned, mastery progress bar, and clear next-step CTAs.
 */

import React from 'react'
import { motion } from 'framer-motion'
import type { FormulaLevel } from '../../types/index'

// ─── Chapter colour lookup (mirrors chapters.ts palette) ─────────────────────

const CHAPTER_COLOUR_FOR_LEVEL = (level: number): string => {
  if (level <= 10) return '#6C5CE7'
  if (level <= 20) return '#00B894'
  if (level <= 30) return '#E17055'
  if (level <= 40) return '#0984E3'
  if (level <= 55) return '#6C5CE7'
  return '#D63031'
}

// ─── Score ring ───────────────────────────────────────────────────────────────

const ScoreRing: React.FC<{ score: number; colour: string }> = ({ score, colour }) => {
  const r = 38
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  return (
    <svg width={96} height={96} viewBox="0 0 96 96" aria-hidden="true">
      {/* Track */}
      <circle cx={48} cy={48} r={r} fill="none" stroke="#E8ECF0" strokeWidth={8} />
      {/* Progress */}
      <circle
        cx={48} cy={48} r={r}
        fill="none"
        stroke={colour}
        strokeWidth={8}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 48 48)"
      />
      <text x={48} y={52} textAnchor="middle" fontSize={20} fontWeight={800} fill={colour}>
        {score}
      </text>
      <text x={48} y={66} textAnchor="middle" fontSize={9} fontWeight={600} fill="#8E9BAE">
        / 100
      </text>
    </svg>
  )
}

// ─── Mastery progress bar ─────────────────────────────────────────────────────

const MasteryBar: React.FC<{
  sessionsCompleted: number
  gateThreshold: number
  colour: string
}> = ({ sessionsCompleted, gateThreshold, colour }) => {
  const pct = Math.min(100, Math.round((sessionsCompleted / gateThreshold) * 100))
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#2D3436' }}>Level mastery</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: colour }}>
          {sessionsCompleted}/{gateThreshold} sessions
        </span>
      </div>
      <div style={{
        height: 10, borderRadius: 8, background: '#E8ECF0', overflow: 'hidden',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.3 }}
          style={{ height: '100%', borderRadius: 8, background: colour }}
        />
      </div>
      <p style={{ fontSize: 11, color: '#8E9BAE', marginTop: 5 }}>
        {pct >= 100
          ? '🎉 Gate passed — ready to advance!'
          : `Keep practising to unlock the next level`}
      </p>
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface WhatsNextProps {
  level: FormulaLevel
  score: number
  xpEarned: number
  sessionsCompleted: number
  paragraphActive: boolean
  writingUnlocked: boolean
  leadSentence?: string
  formulaScore?: number
  /** Navigate to paragraph builder */
  onParagraph?: () => void
  /** Try the same level again */
  onRetry: () => void
  /** Go to dashboard */
  onDashboard: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export const WhatsNext: React.FC<WhatsNextProps> = ({
  level,
  score,
  xpEarned,
  sessionsCompleted,
  paragraphActive,
  writingUnlocked,
  onParagraph,
  onRetry,
  onDashboard,
}) => {
  const colour = CHAPTER_COLOUR_FOR_LEVEL(level.id)
  // Mastery gate threshold: 3 sessions with avg >= 80 to advance
  const GATE_THRESHOLD = 3

  const scoreLabel =
    score >= 90 ? '🌟 Outstanding!' :
    score >= 80 ? '🎯 Great work!' :
    score >= 65 ? '👍 Good effort!' :
    '💪 Keep going!'

  const scoreColour =
    score >= 80 ? '#27AE60' :
    score >= 65 ? '#F39C12' :
    '#E74C3C'

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      style={{ paddingBottom: 32 }}
      data-testid="whats-next-screen"
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
          style={{ fontSize: 40, marginBottom: 8 }}
          role="img"
          aria-label="Session complete"
        >
          ✅
        </motion.div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#2D3436', margin: '0 0 4px' }}
          data-tts="Session complete">
          Session Complete!
        </h2>
        <p style={{ fontSize: 13, color: '#8E9BAE', margin: 0 }}
          data-tts={`Level ${level.id} formula practice done`}>
          Level {level.id} · Formula Practice
        </p>
      </div>

      {/* Score + XP row */}
      <div style={{
        display: 'flex',
        gap: 16,
        marginBottom: 24,
        alignItems: 'stretch',
      }}>
        {/* Score ring card */}
        <div style={{
          flex: 1,
          background: '#FFFFFF',
          border: '1px solid #EDEBE7',
          borderRadius: 16,
          padding: '18px 12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}>
          <ScoreRing score={score} colour={scoreColour} />
          <span style={{ fontSize: 13, fontWeight: 800, color: scoreColour }}
            data-tts={scoreLabel}>
            {scoreLabel}
          </span>
        </div>

        {/* XP + streak column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* XP earned */}
          <div style={{
            background: '#FFFBEB',
            border: '1.5px solid #FCD34D',
            borderRadius: 14,
            padding: '14px 12px',
            textAlign: 'center',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ fontSize: 22 }} role="img" aria-label="XP">⭐</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#D97706', lineHeight: 1.1 }}
              data-tts={`Plus ${xpEarned} XP earned`}>
              +{xpEarned}
            </span>
            <span style={{ fontSize: 10, color: '#92400E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              XP earned
            </span>
          </div>

          {/* Feature unlocked hint */}
          {(paragraphActive || writingUnlocked) && (
            <div style={{
              background: `${colour}12`,
              border: `1.5px solid ${colour}44`,
              borderRadius: 14,
              padding: '10px 12px',
              textAlign: 'center',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ fontSize: 18 }} role="img" aria-label="Unlocked">🔓</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: colour, lineHeight: 1.2, marginTop: 2 }}>
                {paragraphActive ? 'Paragraph\nBuilder' : 'Writing\nStudio'}
              </span>
              <span style={{ fontSize: 10, color: colour, opacity: 0.7 }}>unlocked</span>
            </div>
          )}
        </div>
      </div>

      {/* Mastery progress */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #EDEBE7',
        borderRadius: 16,
        padding: '16px 18px',
        marginBottom: 24,
      }}>
        <MasteryBar
          sessionsCompleted={sessionsCompleted}
          gateThreshold={GATE_THRESHOLD}
          colour={colour}
        />
      </div>

      {/* What's next section */}
      <div style={{ marginBottom: 20 }}>
        <p style={{
          fontSize: 11, fontWeight: 700, color: '#8E9BAE',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          marginBottom: 12,
        }}>
          What would you like to do next?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Practice again — primary CTA */}
          <button
            onClick={onRetry}
            data-testid="whats-next-retry"
            data-tts="Practice this level again"
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 16,
              background: colour,
              border: 'none',
              color: '#fff',
              fontSize: 15,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>🔁</span>
            Practice Level {level.id} Again
          </button>

          {/* Paragraph builder — if unlocked */}
          {paragraphActive && onParagraph && (
            <button
              onClick={onParagraph}
              data-testid="whats-next-paragraph"
              data-tts="Continue to Paragraph Builder"
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: 16,
                background: '#ECFDF5',
                border: `2px solid #34D399`,
                color: '#065F46',
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 18 }}>📝</span>
              Continue to Paragraph Builder
            </button>
          )}

          {/* Dashboard */}
          <button
            onClick={onDashboard}
            data-testid="whats-next-dashboard"
            data-tts="Return to your learning path"
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 16,
              background: '#F8F9FA',
              border: '1.5px solid #EDEBE7',
              color: '#636E72',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>🗺️</span>
            Back to Learning Path
          </button>
        </div>
      </div>
    </motion.div>
  )
}
