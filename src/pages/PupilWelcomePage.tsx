/**
 * PupilWelcomePage — the celebratory landing screen pupils see on login.
 *
 * Shows:
 *   • Animated Writz avatar (their chosen cosmetic)
 *   • Personalised greeting with their first name
 *   • Streak, level, XP, coins at a glance
 *   • XP progress bar toward the next milestone
 *   • Up to 6 most-recently-earned badges
 *   • "Start Learning" CTA → /practice?skip_intro=true
 *   • "My Journey" link → /dashboard (full stats view)
 *
 * Route: /welcome (pupils only)
 */

import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { AvatarVariantId } from '../components/WritzAvatar'
import { WritzAvatar } from '../components/WritzAvatar'

// ── types ──────────────────────────────────────────────────────────────────────

interface FormulaProgress {
  current_formula_level: number
  total_xp: number
  current_streak: number
  longest_streak: number
  coins: number
}

interface PupilBadgeRow {
  badge_id: string
  earned_at: string
  badges: {
    name: string
    image_emoji: string
    description: string
  } | null
}

// ── constants ─────────────────────────────────────────────────────────────────

// XP required to reach each level milestone (every 10 levels = 1 chapter)
const XP_PER_LEVEL = 120
const TOTAL_LEVELS = 67

// Friendly greetings that rotate randomly
const GREETINGS = [
  'Great to see you',
  'Welcome back',
  'Ready to write',
  'Hello',
  "You're on a roll",
]

// Floating sparkle positions (decorative background)
const SPARKLES = [
  { x: '8%',  y: '12%', size: 18, delay: 0    },
  { x: '88%', y: '8%',  size: 22, delay: 0.3  },
  { x: '4%',  y: '70%', size: 14, delay: 0.6  },
  { x: '92%', y: '60%', size: 20, delay: 0.9  },
  { x: '50%', y: '6%',  size: 16, delay: 1.2  },
  { x: '20%', y: '88%', size: 12, delay: 0.4  },
  { x: '75%', y: '85%', size: 18, delay: 0.7  },
]

// ── sub-components ─────────────────────────────────────────────────────────────

interface StatPillProps {
  emoji: string
  value: string | number
  label: string
  colour: string
  delay?: number
}

const StatPill: React.FC<StatPillProps> = ({ emoji, value, label, colour, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: 'backOut' }}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
      background: 'var(--color-surface)',
      borderRadius: 16,
      padding: '14px 18px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      border: `2px solid ${colour}22`,
      minWidth: 76,
    }}
  >
    <span style={{ fontSize: 26 }}>{emoji}</span>
    <span style={{ fontSize: 20, fontWeight: 800, color: colour, lineHeight: 1 }}>{value}</span>
    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {label}
    </span>
  </motion.div>
)

interface XPBarProps {
  totalXp: number
  level: number
}

const XPBar: React.FC<XPBarProps> = ({ totalXp, level }) => {
  const xpForCurrentLevel = (level - 1) * XP_PER_LEVEL
  const xpForNextLevel    = level * XP_PER_LEVEL
  const xpInThisLevel     = Math.max(0, totalXp - xpForCurrentLevel)
  const xpNeeded          = xpForNextLevel - xpForCurrentLevel
  const pct               = Math.min(100, Math.round((xpInThisLevel / xpNeeded) * 100))
  const isMaxLevel        = level >= TOTAL_LEVELS

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.4 }}
      style={{ width: '100%' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
          ⭐ {isMaxLevel ? 'Max level!' : `Level ${level} progress`}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)' }}>
          {isMaxLevel ? `${totalXp.toLocaleString()} XP total` : `${xpInThisLevel} / ${xpNeeded} XP`}
        </span>
      </div>
      <div style={{
        height: 14,
        background: 'var(--color-border)',
        borderRadius: 999,
        overflow: 'hidden',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${isMaxLevel ? 100 : pct}%` }}
          transition={{ delay: 0.8, duration: 0.9, ease: 'easeOut' }}
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, var(--color-brand-primary), var(--color-brand-secondary))',
            borderRadius: 999,
          }}
        />
      </div>
      {!isMaxLevel && (
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6, textAlign: 'right' }}>
          {xpNeeded - xpInThisLevel} XP to Level {level + 1}
        </p>
      )}
    </motion.div>
  )
}

interface BadgeTileProps {
  emoji: string
  name: string
  delay?: number
}

const BadgeTile: React.FC<BadgeTileProps> = ({ emoji, name, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.6 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 0.35, ease: 'backOut' }}
    title={name}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      background: 'linear-gradient(135deg, #FFF7ED, #FEF3C7)',
      border: '2px solid #FDE68A',
      borderRadius: 14,
      padding: '10px 12px',
      minWidth: 68,
    }}
  >
    <span style={{ fontSize: 28 }}>{emoji}</span>
    <span style={{ fontSize: 10, fontWeight: 700, color: '#92400E', textAlign: 'center', lineHeight: 1.2 }}>
      {name}
    </span>
  </motion.div>
)

// ── main page ─────────────────────────────────────────────────────────────────

export default function PupilWelcomePage() {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const pupilId = user?.id
  const profileAny = profile as (typeof profile & { selected_avatar?: string }) | null
  const avatarVariant = (profileAny?.selected_avatar ?? 'wizard') as AvatarVariantId
  const firstName = profile?.first_name ?? 'Pupil'

  // Pick a greeting once per mount
  const greeting = useRef(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]).current

  // Subtle pulsing glow on the avatar
  const [glowVisible, setGlowVisible] = useState(true)
  useEffect(() => {
    const t = setInterval(() => setGlowVisible((v) => !v), 2000)
    return () => clearInterval(t)
  }, [])

  const { data: progress } = useQuery<FormulaProgress | null>({
    queryKey: ['formula_progress', pupilId],
    queryFn: async () => {
      if (!pupilId) return null
      const { data, error } = await supabase
        .from('formula_progress')
        .select('current_formula_level, total_xp, current_streak, longest_streak, coins')
        .eq('pupil_id', pupilId)
        .maybeSingle()
      if (error) throw error
      return data as FormulaProgress | null
    },
    enabled: !!pupilId,
    staleTime: 1000 * 30,
  })

  const { data: pupilBadges } = useQuery<PupilBadgeRow[]>({
    queryKey: ['pupil_badges', pupilId],
    queryFn: async () => {
      if (!pupilId) return []
      const { data, error } = await supabase
        .from('pupil_badges')
        .select('badge_id, earned_at, badges(name, image_emoji, description)')
        .eq('pupil_id', pupilId)
        .order('earned_at', { ascending: false })
        .limit(6)
      if (error) throw error
      return (data ?? []) as unknown as PupilBadgeRow[]
    },
    enabled: !!pupilId,
    staleTime: 1000 * 60 * 2,
  })

  const level   = progress?.current_formula_level ?? 1
  const totalXp = progress?.total_xp ?? 0
  const streak  = progress?.current_streak ?? 0
  const coins   = progress?.coins ?? 0
  const badges  = pupilBadges ?? []

  return (
    <div
      data-testid="pupil-welcome-page"
      style={{
        minHeight: '100vh',
        background: 'var(--color-background)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 16px 48px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── Decorative floating sparkles ── */}
      {SPARKLES.map((s, i) => (
        <motion.div
          key={i}
          aria-hidden="true"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 0.7, 0], scale: [0, 1, 0], y: [0, -20, 0] }}
          transition={{ delay: s.delay, duration: 3.5, repeat: Infinity, repeatDelay: 2 }}
          style={{
            position: 'absolute',
            left: s.x,
            top: s.y,
            fontSize: s.size,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          ✦
        </motion.div>
      ))}

      {/* ── Page content (capped width) ── */}
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>

        {/* ── Avatar + greeting ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'backOut' }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
        >
          {/* Glowing halo behind avatar */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
            <AnimatePresence>
              {glowVisible && (
                <motion.div
                  key="glow"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 0.35, scale: 1.15 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 1.8 }}
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    width: 140,
                    height: 140,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, var(--color-brand-primary), transparent 70%)',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                  }}
                />
              )}
            </AnimatePresence>

            <WritzAvatar
              variant={avatarVariant}
              size={130}
              animated
              data-tts={`Your avatar: ${avatarVariant}`}
            />
          </div>

          <div style={{ textAlign: 'center' }}>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              style={{ fontSize: 15, color: 'var(--color-text-muted)', fontWeight: 600, margin: 0 }}
              data-tts={greeting}
            >
              {greeting},
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              style={{
                fontSize: 34,
                fontWeight: 900,
                color: 'var(--color-text)',
                margin: '2px 0 0',
                lineHeight: 1.1,
              }}
              data-tts={firstName}
            >
              {firstName}! 👋
            </motion.h1>
          </div>
        </motion.div>

        {/* ── Stats row ── */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
          <StatPill emoji="🔥" value={streak > 0 ? `${streak}d` : '–'}  label="Streak"  colour="#E74C3C" delay={0.4} />
          <StatPill emoji="📖" value={`L${level}`}                       label="Level"   colour="var(--color-brand-primary)" delay={0.48} />
          <StatPill emoji="⭐" value={totalXp.toLocaleString()}          label="XP"      colour="#F5C500" delay={0.56} />
          <StatPill emoji="🪙" value={coins}                             label="Coins"   colour="#F5A623" delay={0.64} />
        </div>

        {/* ── XP progress bar ── */}
        <div style={{
          width: '100%',
          background: 'var(--color-surface)',
          borderRadius: 18,
          padding: '18px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
        }}>
          <XPBar totalXp={totalXp} level={level} />
        </div>

        {/* ── Badges ── */}
        {badges.length > 0 && (
          <div style={{ width: '100%' }}>
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                margin: '0 0 12px',
              }}
              data-tts="Your badges"
            >
              🏅 Your Badges
            </motion.h2>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {badges.map((pb, i) => (
                <BadgeTile
                  key={pb.badge_id}
                  emoji={pb.badges?.image_emoji ?? '🏅'}
                  name={pb.badges?.name ?? 'Badge'}
                  delay={0.75 + i * 0.08}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── No badges yet — encouraging placeholder ── */}
        {badges.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            style={{
              width: '100%',
              background: 'var(--color-surface)',
              borderRadius: 18,
              padding: '20px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>🏅</div>
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-text)', fontSize: 15 }}>
              Earn your first badge!
            </p>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
              Complete your first session to unlock a badge.
            </p>
          </motion.div>
        )}

        {/* ── Streak celebration ── */}
        {streak >= 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9, type: 'spring', stiffness: 260, damping: 20 }}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #FFF5F5, #FFE4E4)',
              border: '2px solid #FCA5A5',
              borderRadius: 18,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <span style={{ fontSize: 40 }}>🔥</span>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: '#DC2626' }}>
                {streak}-day streak!
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#7F1D1D' }}>
                {streak >= 7
                  ? "You're unstoppable — keep it going!"
                  : "Great work — don't break the chain!"}
              </p>
            </div>
          </motion.div>
        )}

        {/* ── CTAs ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', paddingTop: 8 }}>
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.4, ease: 'backOut' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/practice?skip_intro=true')}
            data-testid="start-learning-btn"
            data-tts="Start learning"
            style={{
              width: '100%',
              padding: '18px',
              fontSize: 19,
              fontWeight: 900,
              background: 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))',
              color: '#fff',
              border: 'none',
              borderRadius: 18,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(108, 92, 231, 0.35)',
              letterSpacing: '0.01em',
              minHeight: 56,
            }}
          >
            🚀 Start Learning!
          </motion.button>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.15 }}
            onClick={() => navigate('/dashboard')}
            data-testid="my-journey-btn"
            data-tts="My journey"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: 15,
              fontWeight: 700,
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '2px solid var(--color-border)',
              borderRadius: 18,
              cursor: 'pointer',
              minHeight: 48,
            }}
          >
            📊 My Journey
          </motion.button>
        </div>

      </div>
    </div>
  )
}
