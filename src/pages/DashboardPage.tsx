/**
 * DashboardPage — Duolingo-style pupil learning path.
 *
 * Layout:
 *   Mobile  (< 768px)  — vertical meandering node path, bottom nav tabs
 *   Tablet  (768–1023) — two-column: path left, stats sidebar right
 *   Desktop (≥ 1024px) — horizontal scrolling path, right stats panel
 *
 * Features:
 *   • 6 hardcoded chapters (67 levels) with mastery statements
 *   • 4 node types per level: Learn / Build / Practice / Master
 *   • Writz avatar sits at the current node
 *   • Avatar wardrobe (buy with coins)
 *   • Badges organised by learning journey (prior / current / future)
 *   • Separate XP (learning) and Coins (cosmetics) currencies
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { sfx } from '../lib/sfx'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useFreemium } from '../hooks/useFreemium'
import { WritzAvatar, type AvatarVariantId } from '../components/WritzAvatar'
import {
  CHAPTERS,
  AVATAR_VARIANTS,
  getChapterForLevel,
  getLevelsForChapter,
  type Chapter,
} from '../lib/chapters'

// ─── types ────────────────────────────────────────────────────────────────────

interface PupilProgressRow {
  pupil_id: string
  current_formula_level: number
  total_xp: number
  current_streak: number
  longest_streak: number
  streak_shield_active: boolean
  coins: number
  writing_studio_unlocked: boolean
}

interface PupilBadgeRow {
  id: string
  badge_id: string
  earned_at: string
  badges: {
    id: string
    name: string
    icon_key: string
    description: string
    trigger_type: string
    trigger_value: number
  }
}

// ─── Gold coin SVG (replaces 🪙 which renders as a grey blob on Chrome/Windows) ─

const CoinIcon: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 18, style }) => (
  <svg
    width={size} height={size} viewBox="0 0 20 20"
    style={{ display: 'inline-block', flexShrink: 0, ...style }}
    aria-hidden="true"
  >
    <circle cx="10" cy="10" r="9.5" fill="#F5A623" />
    <circle cx="10" cy="10" r="8"   fill="#FFD966" />
    <circle cx="10" cy="10" r="6.5" fill="none" stroke="#d4891c" strokeWidth="0.8" />
    <text x="10" y="14" textAnchor="middle" fontSize="8" fontWeight="900" fill="#7a4500">✦</text>
  </svg>
)

// ─── colour tokens (inline, matches existing HomePage pattern) ────────────────

/**
 * R-04: Replaced hardcoded hex values with CSS custom property references.
 * These resolve to the WriFe PWP design tokens defined in src/index.css.
 * Do NOT revert to hex — all colour decisions must go through CSS variables.
 */
const C = {
  brand:   'var(--color-brand-secondary)',  /* was #6C5CE7 — now maps to app's blue */
  orange:  'var(--color-brand-primary)',    /* was #F5A623 — now maps to app's orange */
  bg:      'var(--color-background)',       /* was #FAF9F7 — now the sky-blue page bg */
  surface: 'var(--color-surface)',          /* was #FFFFFF */
  border:  'var(--color-border)',           /* was #EDEBE7 */
  text:    'var(--color-text)',             /* was #2D3436 */
  muted:   'var(--color-text-muted)',       /* was #8E9BAE */
  green:   'var(--color-brand-success)',    /* was #27AE60 */
  pink:    'var(--color-brand-accent)',     /* was #E84393 — closest token: warm yellow; revisit if pink is needed */
} as const

// ─── Path geometry ────────────────────────────────────────────────────────────

const NODE_TYPES = ['learn', 'build', 'practice', 'master'] as const
type NodeType = typeof NODE_TYPES[number]

/** Three column X-centres creating a smooth S-curve */
const PATH_W    = 300
const COL_X     = [52, 150, 248]   // left / centre / right
const COL_PAT   = [0, 1, 2, 1]    // L→C→R→C→L
const NODE_STEP = 100              // vertical px between level centres
const AVATAR_LIFT = 95             // px above active node centre

/**
 * Node appearance tiers:
 *   done      — completed level (green ✓)
 *   active    — current level (large, pulsing ring, Writz above)
 *   next      — immediately next level (chapter colour, dimmed — "coming up")
 *   upcoming  — 2–4 levels ahead (neutral, chapter-tinted, no lock)
 *   future    — 5+ levels ahead (very small grey, subtle)
 */
type LevelTier = 'done' | 'active' | 'next' | 'upcoming' | 'future'

function levelTier(level: number, currentLevel: number): LevelTier {
  if (level < currentLevel)  return 'done'
  if (level === currentLevel) return 'active'
  if (level === currentLevel + 1) return 'next'
  if (level <= currentLevel + 4)  return 'upcoming'
  return 'future'
}

function tierRadius(tier: LevelTier): number {
  switch (tier) {
    case 'active':   return 33
    case 'done':     return 26
    case 'next':     return 26
    case 'upcoming': return 22
    case 'future':   return 18
  }
}

function colX(idx: number): number {
  return COL_X[COL_PAT[idx % 4]]
}

// ─── SVG connector between two adjacent level nodes ───────────────────────────

interface ConnSVGProps {
  x1: number; y1: number; r1: number
  x2: number; y2: number; r2: number
  tier: LevelTier
}

const NodeConnector: React.FC<ConnSVGProps> = ({ x1, y1, r1, x2, y2, r2, tier }) => {
  const sy   = y1 + r1 + 3
  const ey   = y2 - r2 - 3
  const midY = (sy + ey) / 2
  const d    = `M ${x1} ${sy} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${ey}`
  const colour =
    tier === 'done'     ? C.green   :
    tier === 'active'   ? C.green   :
    tier === 'next'     ? '#B2BEC3' :
    '#DFE6E9'
  const dash = (tier === 'done' || tier === 'active') ? undefined : '6 5'
  return (
    <path d={d} stroke={colour} strokeWidth={3} fill="none"
      strokeLinecap="round" strokeDasharray={dash} />
  )
}

// ─── Single level node ────────────────────────────────────────────────────────

interface LevelNodeProps {
  level: number
  tier: LevelTier
  chapterColour: string
  chapterEmoji: string
  avatarVariant: AvatarVariantId
  cx: number
  cy: number
  onClick?: () => void
}

const LevelNode: React.FC<LevelNodeProps> = ({
  level, tier, chapterColour, chapterEmoji, avatarVariant, cx, cy, onClick,
}) => {
  const r        = tierRadius(tier)
  const isActive = tier === 'active'
  const isDone   = tier === 'done'
  const isNext   = tier === 'next'
  const isFuture = tier === 'future'

  const bg =
    isDone     ? C.green :
    isActive   ? chapterColour :
    isNext     ? `${chapterColour}55` :
    tier === 'upcoming' ? `${chapterColour}25` :
    '#E8ECF0'

  const border =
    isDone     ? '#1e8449' :
    isActive   ? chapterColour :
    isNext     ? `${chapterColour}99` :
    tier === 'upcoming' ? `${chapterColour}55` :
    '#D0D5DD'

  const emoji =
    isDone   ? '✓' :
    isActive ? chapterEmoji :
    isNext   ? chapterEmoji :
    chapterEmoji

  const labelRight = cx <= 150
  const labelX = labelRight ? cx + r + 8 : cx - r - 8
  const labelAnchor = labelRight ? 'start' : 'end'

  const labelText =
    isDone   ? `L${level}` :
    isActive ? `Level ${level}` :
    isNext   ? `Level ${level}` :
    `L${level}`

  const labelColour =
    isDone   ? C.muted :
    isActive ? chapterColour :
    isNext   ? chapterColour :
    C.muted

  const subLabel =
    isActive ? 'You are here' :
    isNext   ? 'Up next ✨' :
    ''

  return (
    <g data-testid={`level-node-${level}`} style={{ cursor: isActive || isDone ? 'pointer' : 'default' }}
      onClick={isActive || isDone ? onClick : undefined}>

      {/* Pulsing glow rings behind active node */}
      {isActive && (
        <>
          <circle cx={cx} cy={cy} r={r + 14} fill={`${chapterColour}14`} />
          <circle cx={cx} cy={cy} r={r +  8} fill={`${chapterColour}24`} />
        </>
      )}

      {/* Node circle */}
      <circle
        cx={cx} cy={cy} r={r}
        fill={bg}
        stroke={border}
        strokeWidth={isActive ? 3 : 2}
        opacity={isFuture ? 0.4 : 1}
      />

      {/* Icon / tick */}
      <text
        x={cx} y={cy + (isDone ? 5 : 6)}
        textAnchor="middle"
        fontSize={isDone ? r * 0.8 : isActive ? r * 0.72 : r * 0.72}
        fill={isDone ? '#fff' : isActive ? '#fff' : isFuture ? '#B2BEC3' : `${chapterColour}cc`}
        fontWeight={isDone ? 900 : 700}
      >
        {emoji}
      </text>

      {/* Level label beside node */}
      {labelText !== '' && (
        <text x={labelX} y={cy - 3} textAnchor={labelAnchor}
          fontSize={isActive ? 13 : 11} fontWeight={isActive ? 800 : 600}
          fill={labelColour} opacity={isFuture ? 0.4 : 1}>
          {labelText}
        </text>
      )}
      {subLabel !== '' && (
        <text x={labelX} y={cy + 13} textAnchor={labelAnchor}
          fontSize={10} fontWeight={600}
          fill={isNext ? `${chapterColour}99` : chapterColour} opacity={0.9}>
          {subLabel}
        </text>
      )}

      {/* Writz avatar floating above active node */}
      {isActive && (
        <foreignObject x={cx - 44} y={cy - AVATAR_LIFT - 44} width={88} height={88}>
          <div style={{ position: 'relative', width: 88, height: 88 }}>
            {/* Radial glow disc */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: `radial-gradient(circle, ${chapterColour}50 0%, transparent 68%)`,
            }} />
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ position: 'relative', zIndex: 1 }}
            >
              <WritzAvatar variant={avatarVariant} size={84} animated={false} />
            </motion.div>
          </div>
        </foreignObject>
      )}
    </g>
  )
}

// ─── Chapter banner ───────────────────────────────────────────────────────────

interface ChapterBannerProps {
  chapter: Chapter
  unlocked: boolean
  isCurrent: boolean
  completed: boolean
}

const ChapterBanner: React.FC<ChapterBannerProps> = ({ chapter, unlocked, isCurrent, completed }) => (
  <div
    style={{
      background: completed ? C.green : unlocked ? chapter.colour : '#F0F0F0',
      borderRadius: 14,
      padding: '12px 16px',
      marginBottom: 24,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      border: `2px solid ${isCurrent ? chapter.textColour : 'transparent'}`,
      boxShadow: isCurrent ? `0 0 0 3px ${chapter.textColour}22` : 'none',
    }}
    data-testid={`chapter-banner-${chapter.num}`}
  >
    <span style={{ fontSize: 28 }}>{chapter.emoji}</span>
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: completed ? '#fff' : unlocked ? chapter.textColour : C.muted,
        }}>
          Chapter {chapter.num}
        </span>
        {completed && (
          <span style={{ fontSize: 12, background: '#fff', borderRadius: 6, padding: '1px 6px', color: C.green, fontWeight: 700 }}>
            ✓ Complete
          </span>
        )}
        {isCurrent && (
          <span style={{ fontSize: 11, background: chapter.textColour, borderRadius: 6, padding: '1px 7px', color: '#fff', fontWeight: 700 }}>
            In progress
          </span>
        )}
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: completed ? '#fff' : unlocked ? C.text : C.muted }}>
        {chapter.title}
      </div>
      {/* Concept tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
        {chapter.concepts.map((concept) => (
          <span
            key={concept}
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 7px',
              borderRadius: 20,
              background: completed
                ? 'rgba(255,255,255,0.2)'
                : unlocked
                  ? `${chapter.textColour}18`
                  : 'rgba(0,0,0,0.06)',
              color: completed
                ? 'rgba(255,255,255,0.9)'
                : unlocked
                  ? chapter.textColour
                  : C.muted,
              border: `1px solid ${completed ? 'rgba(255,255,255,0.3)' : unlocked ? `${chapter.textColour}35` : 'rgba(0,0,0,0.1)'}`,
            }}
          >
            {concept}
          </span>
        ))}
      </div>
      {unlocked && (
        <div style={{ fontSize: 11, color: completed ? 'rgba(255,255,255,0.75)' : C.muted, marginTop: 5, fontStyle: 'italic' }}
          data-tts={chapter.masteryStatement}>
          {chapter.masteryStatement}
        </div>
      )}
    </div>
    {!unlocked && <span style={{ fontSize: 20 }}>🔒</span>}
  </div>
)

// ─── Avatar wardrobe modal ────────────────────────────────────────────────────

interface WardrobeModalProps {
  currentAvatar: AvatarVariantId
  coins: number
  ownedAvatars: string[]
  onSelect: (id: AvatarVariantId) => void
  onClose: () => void
}

const WardrobeModal: React.FC<WardrobeModalProps> = ({
  currentAvatar, coins, ownedAvatars, onSelect, onClose
}) => (
  <div
    style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}
    onClick={onClose}
  >
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
      onClick={(e) => e.stopPropagation()}
      style={{
        background: C.surface,
        borderRadius: '20px 20px 0 0',
        padding: 24,
        width: '100%',
        maxWidth: 500,
        maxHeight: '80vh',
        overflowY: 'auto',
      }}
      data-testid="wardrobe-modal"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>Writz Wardrobe</h2>
          <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>Customise your Writz!</p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#FFF8E1', border: '1.5px solid #F5A623',
          borderRadius: 20, padding: '5px 12px',
        }}>
          <CoinIcon size={16} />
          <span style={{ fontSize: 14, fontWeight: 800, color: C.orange }}>{coins.toLocaleString()}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {AVATAR_VARIANTS.map((av) => {
          const owned = av.cost === 0 || ownedAvatars.includes(av.id)
          const isSelected = currentAvatar === av.id
          const canAfford = coins >= av.cost
          return (
            <button
              key={av.id}
              onClick={() => {
                if (owned && !av.comingSoon) onSelect(av.id as AvatarVariantId)
              }}
              disabled={av.comingSoon || (!owned && !canAfford)}
              data-testid={`avatar-option-${av.id}`}
              style={{
                borderRadius: 14,
                padding: '14px 8px 10px',
                background: isSelected ? C.brand : av.comingSoon ? '#F7F7F7' : C.surface,
                border: `2.5px solid ${isSelected ? C.brand : owned ? C.border : '#DFE6E9'}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                cursor: av.comingSoon ? 'default' : owned ? 'pointer' : canAfford ? 'pointer' : 'default',
                opacity: av.comingSoon ? 0.5 : 1,
                transition: 'transform 0.1s',
              }}
            >
              <WritzAvatar
                variant={av.comingSoon ? 'wizard' : av.id as AvatarVariantId}
                size={52}
                animated={isSelected}
              />
              <span style={{ fontSize: 11, fontWeight: 700, color: isSelected ? '#fff' : C.text, textAlign: 'center' }}>
                {av.name.replace(' Writz', '')}
              </span>
              {av.comingSoon ? (
                <span style={{ fontSize: 10, color: C.muted }}>Coming soon</span>
              ) : owned ? (
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: isSelected ? '#fff' : C.green,
                }}>
                  {isSelected ? '✓ Wearing' : 'Owned'}
                </span>
              ) : (
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: canAfford ? C.orange : C.muted,
                  display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  <CoinIcon size={13} /> {av.cost}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <p style={{ fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 16 }}>
        Earn coins by completing sessions (+5) and streak bonuses (+10)
      </p>
    </motion.div>
  </div>
)

// ─── Badges section ───────────────────────────────────────────────────────────

// 15 static badge definitions grouped by learning journey position.
// In a full build these would come from the DB; here they are defined inline
// so the UI renders meaningfully even before real badges are earned.

const BADGE_DEFS = [
  // Prior learning (earned)
  { id: 'b1',  emoji: '📖', name: 'First Words',      desc: 'Completed your first formula',          group: 'prior' },
  { id: 'b2',  emoji: '✏️', name: 'Sentence Starter', desc: 'Built 5 correct sentences',             group: 'prior' },
  { id: 'b3',  emoji: '🔥', name: 'Hot Streak',       desc: 'Achieved a 3-day streak',               group: 'prior' },
  // Current learning
  { id: 'b4',  emoji: '🏗️', name: 'Builder',          desc: 'Completed Chapter 1',                   group: 'current' },
  { id: 'b5',  emoji: '⚡', name: 'Action Hero',      desc: 'Mastered an action sentence',           group: 'current' },
  { id: 'b6',  emoji: '🌟', name: 'Star Pupil',       desc: 'Scored 100% in a session',              group: 'current' },
  { id: 'b7',  emoji: '🔗', name: 'Connector',        desc: 'Used a conjunction correctly',          group: 'current' },
  // Future learning
  { id: 'b8',  emoji: '🔍', name: 'Detail Detective', desc: 'Add detail to any part of a sentence',  group: 'future' },
  { id: 'b9',  emoji: '🏅', name: 'Chapter Master',   desc: 'Complete all levels in a chapter',      group: 'future' },
  { id: 'b10', emoji: '💎', name: 'Diamond Writer',   desc: 'Reach Level 35',                        group: 'future' },
  { id: 'b11', emoji: '🏆', name: 'Expert Writer',    desc: 'Reach Chapter 5',                       group: 'future' },
  { id: 'b12', emoji: '🎓', name: 'WriFe Graduate',   desc: 'Complete all 67 levels',                group: 'future' },
  { id: 'b13', emoji: '📝', name: 'Paragraph Pro',    desc: 'Complete the paragraph builder',        group: 'future' },
  { id: 'b14', emoji: '🌈', name: 'All Genres',       desc: 'Write in all 4 paragraph genres',       group: 'future' },
  { id: 'b15', emoji: '🚀', name: 'Writing Studio',   desc: 'Submit your first writing studio piece',group: 'future' },
] as const

type BadgeGroup = 'prior' | 'current' | 'future'

interface BadgesProps {
  earnedBadgeIds: string[]
  currentLevel: number
}

const BadgesSection: React.FC<BadgesProps> = ({ earnedBadgeIds, currentLevel: _currentLevel }) => {
  const groups: { key: BadgeGroup; label: string; subLabel: string; emoji: string }[] = [
    { key: 'prior',   label: 'What you\'ve learned',  subLabel: 'Badges you\'ve earned',         emoji: '✅' },
    { key: 'current', label: 'What you\'re learning', subLabel: 'Earn these right now',          emoji: '🎯' },
    { key: 'future',  label: 'What\'s next for you',  subLabel: 'Coming with more practice',    emoji: '🔮' },
  ]

  return (
    <div style={{ marginTop: 8 }}>
      {groups.map((g) => {
        const badges = BADGE_DEFS.filter((b) => b.group === g.key)
        return (
          <div key={g.key} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>{g.emoji}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{g.label}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{g.subLabel}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {badges.map((b) => {
                const earned = earnedBadgeIds.includes(b.id)
                return (
                  <motion.div
                    key={b.id}
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    title={b.desc}
                    data-tts={earned ? `${b.name}: ${b.desc}` : `Locked: ${b.desc}`}
                    style={{
                      width: 60,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'default',
                    }}
                  >
                    <div style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                      background: earned
                        ? 'linear-gradient(135deg, #FEF3C7, #FDE68A)'
                        : '#F0F0F0',
                      border: earned ? '2.5px solid #FCD34D' : '2.5px solid #DDD',
                      filter: earned ? 'none' : 'grayscale(1)',
                      opacity: earned ? 1 : 0.5,
                      boxShadow: earned ? '0 2px 8px rgba(252,211,77,0.4)' : 'none',
                    }}>
                      {b.emoji}
                    </div>
                    <span style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: earned ? C.text : C.muted,
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}>
                      {b.name}
                    </span>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Stats sidebar ────────────────────────────────────────────────────────────

interface StatsSidebarProps {
  progress: PupilProgressRow
  profile: { first_name?: string; selected_avatar?: string } | null
  earnedBadgeIds: string[]
  onOpenWardrobe: () => void
  isPro?: boolean
}

const StatsSidebar: React.FC<StatsSidebarProps> = ({ progress, profile, earnedBadgeIds, onOpenWardrobe, isPro = true }) => {
  const avatarId = (profile?.selected_avatar ?? 'wizard') as AvatarVariantId
  const name = profile?.first_name ?? 'Pupil'
  const currentChapter = getChapterForLevel(progress.current_formula_level)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Avatar + name */}
      <div style={{
        background: C.surface,
        borderRadius: 16,
        padding: 20,
        border: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        textAlign: 'center',
      }}>
        <button
          onClick={onOpenWardrobe}
          data-testid="open-wardrobe-btn"
          data-tts="Change your Writz avatar"
          style={{
            background: `${currentChapter.colour}`,
            border: `3px solid ${currentChapter.textColour}`,
            borderRadius: '50%',
            width: 90,
            height: 90,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <WritzAvatar variant={avatarId} size={68} animated />
          <span style={{
            position: 'absolute', bottom: -2, right: -2,
            fontSize: 18,
            background: C.surface,
            borderRadius: '50%',
            width: 26, height: 26,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1.5px solid ${C.border}`,
          }}>✏️</span>
        </button>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.text }} data-tts={name}>{name}</div>
        <div style={{
          fontSize: 11, color: currentChapter.textColour, fontWeight: 700,
          background: currentChapter.colour, borderRadius: 8, padding: '3px 10px',
        }}>
          {currentChapter.emoji} {currentChapter.title}
        </div>
      </div>

      {/* Stats row */}
      {isPro ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
        }}>
          {[
            {
              label: 'Level',
              value: `L${progress.current_formula_level ?? 1}`,
              icon: <span style={{ fontSize: 20 }}>📈</span>,
              colour: C.brand,
            },
            {
              label: 'XP',
              value: (progress.total_xp ?? 0).toLocaleString(),
              icon: <span style={{ fontSize: 20 }}>⭐</span>,
              colour: '#F39C12',
            },
            {
              label: 'Streak',
              value: (progress.current_streak ?? 0) > 0 ? `${progress.current_streak}d` : '–',
              icon: <span style={{ fontSize: 20 }}>🔥</span>,
              colour: (progress.current_streak ?? 0) > 0 ? '#E74C3C' : C.muted,
            },
            {
              label: 'Coins',
              value: (progress.coins ?? 0).toLocaleString(),
              icon: <CoinIcon size={22} />,
              colour: C.orange,
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: '12px 10px',
                textAlign: 'center',
              }}
              data-tts={`${s.label}: ${s.value}`}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}>{s.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: s.colour }}>{s.value}</div>
              <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      ) : (
        /* Free tier: single level stat + locked rewards prompt */
        <>
          <div style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: '12px 10px',
            textAlign: 'center',
          }} data-tts={`Level L${progress.current_formula_level}`}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}><span style={{ fontSize: 20 }}>📈</span></div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.brand }}>L{progress.current_formula_level}</div>
            <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Level</div>
          </div>
          <div style={{
            background: C.surface,
            border: `1px dashed ${C.border}`,
            borderRadius: 14,
            padding: 16,
            textAlign: 'center',
          }} data-testid="rewards-locked-panel">
            <div style={{ fontSize: 26, marginBottom: 6 }}>🔒</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>Rewards locked</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
              Upgrade to Pro to earn XP, streaks, coins and badges.
            </div>
            <a
              href="/pricing"
              style={{
                display: 'inline-block',
                background: C.brand,
                color: '#fff',
                borderRadius: 8,
                padding: '7px 16px',
                fontSize: 12,
                fontWeight: 700,
                textDecoration: 'none',
              }}
              data-tts="Upgrade to Pro"
            >
              Upgrade to Pro →
            </a>
          </div>
        </>
      )}

      {/* Badges panel — Pro only */}
      {isPro && (
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 16,
          overflow: 'hidden',
        }}>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: '0 0 14px' }}>Your Badges</h3>
          <BadgesSection earnedBadgeIds={earnedBadgeIds} currentLevel={progress.current_formula_level} />
        </div>
      )}
    </div>
  )
}

// ─── Continue Practice card ───────────────────────────────────────────────────

interface ContinueCardProps {
  currentLevel: number
  onContinue: () => void
}

const ContinueCard: React.FC<ContinueCardProps> = ({ currentLevel, onContinue }) => {
  const chapter = getChapterForLevel(currentLevel)
  return (
    <motion.button
      onClick={onContinue}
      whileTap={{ scale: 0.97 }}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      data-testid="continue-practice-card"
      data-tts={`Continue Level ${currentLevel} practice`}
      style={{
        width: '100%',
        background: `linear-gradient(135deg, ${chapter.textColour}ee, ${chapter.textColour}bb)`,
        border: `2px solid ${chapter.textColour}55`,
        borderRadius: 18,
        padding: '16px 20px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        cursor: 'pointer',
        textAlign: 'left',
        boxShadow: `0 4px 20px ${chapter.textColour}33`,
      }}
    >
      {/* Level badge */}
      <div style={{
        width: 54,
        height: 54,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.25)',
        border: '2.5px solid rgba(255,255,255,0.6)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>{chapter.emoji}</span>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', lineHeight: 1 }}>L{currentLevel}</span>
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', marginBottom: 2 }}>
          Continue Practice
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.82)', fontWeight: 600 }}>
          Level {currentLevel} · {chapter.title}
        </div>
      </div>

      {/* Arrow */}
      <div style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        color: '#fff',
        flexShrink: 0,
      }} aria-hidden="true">
        ▶
      </div>
    </motion.button>
  )
}

// ─── Chain streak calculator (client-side, derived from session dates) ────────

/**
 * Given an array of ISO date strings (YYYY-MM-DD) from pwp_chain_sessions,
 * returns the number of consecutive calendar days ending today (or yesterday
 * if the pupil hasn't completed today yet).
 */
function computeChainStreak(dates: string[]): number {
  if (!dates.length) return 0
  const unique = [...new Set(dates)].sort().reverse() // ISO strings sort lexically

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  // If today not yet complete, start counting from yesterday
  const cursor = new Date(today)
  if (!unique.includes(todayStr)) cursor.setDate(cursor.getDate() - 1)

  let streak = 0
  for (const dateStr of unique) {
    const expected = cursor.toISOString().split('T')[0]
    if (dateStr === expected) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else if (dateStr < expected) {
      break
    }
  }
  return streak
}

// ─── Daily Practice card ──────────────────────────────────────────────────────

interface DailyPracticeCardProps {
  completedToday: boolean
  currentLevel: number
  onStart: () => void
  masterySignal?: boolean
  masteryPoints?: number
  chainStreak?: number
}

const DailyPracticeCard: React.FC<DailyPracticeCardProps> = ({
  completedToday,
  currentLevel,
  onStart,
  masterySignal = false,
  masteryPoints = 0,
  chainStreak = 0,
}) => (
  <div style={{ marginBottom: 12 }}>
    <motion.button
      onClick={completedToday ? undefined : onStart}
      whileTap={completedToday ? {} : { scale: 0.97 }}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      data-testid="daily-practice-card"
      data-tts={completedToday ? 'Daily Chain Practice — done for today!' : 'Start Daily Chain Practice'}
      style={{
        width: '100%',
        background: completedToday
          ? 'linear-gradient(135deg, #27AE60ee, #1e8449bb)'
          : 'linear-gradient(135deg, #8B5CF6ee, #6C5CE7bb)',
        border: completedToday
          ? '2px solid #1e844966'
          : '2px solid #8B5CF666',
        borderRadius: masterySignal ? '18px 18px 0 0' : 18,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        cursor: completedToday ? 'default' : 'pointer',
        textAlign: 'left',
        boxShadow: completedToday
          ? '0 4px 20px rgba(39,174,96,0.25)'
          : '0 4px 20px rgba(108,92,231,0.3)',
      }}
    >
      {/* Icon badge */}
      <div style={{
        width: 50,
        height: 50,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.22)',
        border: '2px solid rgba(255,255,255,0.55)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: 22,
      }}>
        {completedToday ? '✓' : '🔗'}
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: '#fff', marginBottom: 2 }}>
          {completedToday ? 'Chain Practice — Done! ✓' : 'Daily Chain Practice'}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.82)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span>
            {completedToday
              ? 'Great work — come back tomorrow!'
              : `Build your L1–L${currentLevel} sentence chain`}
          </span>
          {chainStreak > 1 && (
            <span
              data-tts={`${chainStreak}-day chain streak`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                background: 'rgba(255,255,255,0.22)',
                border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: 10,
                padding: '1px 7px',
                fontSize: 10,
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}
            >
              🔗 {chainStreak}d streak
            </span>
          )}
        </div>
      </div>

      {/* Arrow / tick */}
      {!completedToday && (
        <div style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          color: '#fff',
          flexShrink: 0,
        }} aria-hidden="true">
          ▶
        </div>
      )}
    </motion.button>

    {/* Mastery signal banner — shown below the card when pupil is ready to level up */}
    {masterySignal ? (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        data-testid="mastery-signal-banner"
        data-tts="Ready to level up! Your teacher can advance you to the next level."
        style={{
          background: 'linear-gradient(135deg, #F5A623ee, #F39C12bb)',
          border: '2px solid #F5A62366',
          borderTop: 'none',
          borderRadius: '0 0 18px 18px',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 4px 16px rgba(245,166,35,0.25)',
        }}
      >
        <span style={{ fontSize: 16 }}>🌟</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>
            Ready to level up!
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
            Your teacher can advance you to L{currentLevel + 1}
          </div>
        </div>
      </motion.div>
    ) : (
      /* Progress bar — shown when not yet at mastery threshold */
      <div
        data-testid="mastery-progress-bar"
        data-tts={`Level progress: ${masteryPoints} out of 12 mastery points`}
        style={{
          background: 'rgba(108,92,231,0.08)',
          border: '2px solid rgba(108,92,231,0.18)',
          borderTop: 'none',
          borderRadius: '0 0 18px 18px',
          padding: '6px 16px 8px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: 'var(--color-text)', fontWeight: 700, opacity: 0.6 }}>
            Level progress
          </span>
          <span style={{ fontSize: 10, color: 'var(--color-brand-primary)', fontWeight: 800 }}>
            {masteryPoints}/12
          </span>
        </div>
        <div style={{
          height: 5,
          borderRadius: 3,
          background: 'rgba(108,92,231,0.15)',
          overflow: 'hidden',
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((masteryPoints / 12) * 100, 100)}%` }}
            transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
            style={{
              height: '100%',
              borderRadius: 3,
              background: 'linear-gradient(90deg, var(--color-brand-primary), #8B5CF6)',
            }}
          />
        </div>
      </div>
    )}
  </div>
)

// ─── Learning path (1 node per level) ────────────────────────────────────────

interface LearningPathProps {
  currentLevel: number
  avatarVariant: AvatarVariantId
  onNodeClick: (level: number, node: NodeType) => void
}

const LearningPath: React.FC<LearningPathProps> = ({ currentLevel, avatarVariant, onNodeClick }) => {
  return (
    <div style={{ padding: '8px 0 48px' }}>
      {CHAPTERS.map((chapter) => {
        const chapterLevels = getLevelsForChapter(chapter)
        const chapterMax    = chapter.levelRange[1]
        const chapterMin    = chapter.levelRange[0]
        const chapterDone   = currentLevel > chapterMax
        const chapterLocked = currentLevel < chapterMin
        const chapterCurrent = !chapterDone && !chapterLocked

        type LevelEntry = { level: number; tier: LevelTier; cx: number; cy: number }
        const hasActive = chapterLevels.includes(currentLevel)
        const topPad    = hasActive ? AVATAR_LIFT + 28 : 36

        const entries: LevelEntry[] = chapterLevels.map((level, li): LevelEntry => ({
          level,
          tier: levelTier(level, currentLevel),
          cx: colX(li),
          cy: topPad + li * NODE_STEP,
        }))

        const svgHeight = topPad + entries.length * NODE_STEP + 24

        return (
          <div key={chapter.num} style={{ marginBottom: 28 }}>
            <ChapterBanner
              chapter={chapter}
              unlocked={!chapterLocked}
              isCurrent={chapterCurrent}
              completed={chapterDone}
            />

            {/* R-07: SVG now uses viewBox so it scales down on screens narrower than PATH_W (300px).
                 width="100%" makes it fill its container; the viewBox preserves the coordinate system. */}
            <div style={{ overflowX: 'hidden' }}>
              <svg
                viewBox={`0 0 ${PATH_W} ${svgHeight}`}
                width="100%"
                height={svgHeight}
                preserveAspectRatio="xMidYMid meet"
                style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}
                aria-label={`Chapter ${chapter.num} levels`}
              >
                {/* Connectors behind nodes */}
                {entries.map((entry, i) => {
                  if (i === 0) return null
                  const prev = entries[i - 1]
                  return (
                    <NodeConnector
                      key={`conn-${i}`}
                      x1={prev.cx} y1={prev.cy} r1={tierRadius(prev.tier)}
                      x2={entry.cx} y2={entry.cy} r2={tierRadius(entry.tier)}
                      tier={prev.tier}
                    />
                  )
                })}

                {/* Level nodes */}
                {entries.map((entry) => (
                  <LevelNode
                    key={entry.level}
                    level={entry.level}
                    tier={entry.tier}
                    chapterColour={chapter.textColour}
                    chapterEmoji={chapter.emoji}
                    avatarVariant={avatarVariant}
                    cx={entry.cx}
                    cy={entry.cy}
                    onClick={() => onNodeClick(entry.level, 'learn')}
                  />
                ))}
              </svg>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Top bar ──────────────────────────────────────────────────────────────────

interface TopBarProps {
  name: string
  avatarId: AvatarVariantId
  streak: number
  coins: number
  onOpenWardrobe: () => void
  onLogout: () => void
  isPro?: boolean
}

const TopBar: React.FC<TopBarProps> = ({ name, avatarId, streak, coins, onOpenWardrobe, onLogout, isPro = true }) => {
  const navigate = useNavigate()
  // Show "← WriFe" only when the pupil arrived via Route A (hub SSO hash token).
  // entryViaHub is set in App.tsx AuthInitialiser on SIGNED_IN + hash detection.
  const showBackToHub = sessionStorage.getItem('entryViaHub') === '1'
  return (
  <div style={{
    position: 'sticky',
    top: 0,
    zIndex: 50,
    background: 'linear-gradient(135deg, #7C6FF7 0%, #6C5CE7 50%, #8B5CF6 100%)',
    boxShadow: '0 4px 24px rgba(108,92,231,0.55), 0 1px 0 rgba(255,255,255,0.12) inset',
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  }}>
    {/* Back to WriFe main site — Route A only */}
    {showBackToHub && (
    <a
      href="https://wrife.co.uk"
      data-tts="Back to WriFe main site"
      aria-label="Back to wrife.co.uk"
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: 'rgba(255,255,255,0.85)',
        background: 'rgba(255,255,255,0.15)',
        border: '1px solid rgba(255,255,255,0.35)',
        borderRadius: 12,
        padding: '4px 9px',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        letterSpacing: '0.02em',
      }}
    >
      ← WriFe
    </a>
    )}

    {/* Avatar button — white circle so Writz is visible */}
    <button
      onClick={onOpenWardrobe}
      data-testid="topbar-avatar-btn"
      style={{
        background: '#fff',
        border: '2.5px solid rgba(255,255,255,0.9)',
        borderRadius: '50%',
        width: 44,
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
        boxShadow: '0 0 0 3px rgba(245,166,35,0.5), 0 2px 10px rgba(0,0,0,0.25)',
      }}
    >
      <WritzAvatar variant={avatarId} size={34} />
    </button>

    {/* Brand name — centred, clickable home link */}
    <div style={{ flex: 1, textAlign: 'center' }}>
      <button
        onClick={() => navigate('/')}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          fontSize: 16,
          fontWeight: 900,
          color: '#fff',
          letterSpacing: '0.02em',
          textShadow: '0 1px 8px rgba(108,92,231,0.6)',
          opacity: 1,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.75' }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        aria-label="WriFe — go to home page"
        data-tts="WriFe — go to home page"
      >
        WriFe
      </button>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginLeft: 6 }}>
        · {name}
      </span>
    </div>

    {/* Quick stats — Pro only */}
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
      {isPro && (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'rgba(255,255,255,0.18)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 20,
            padding: '5px 12px',
            boxShadow: '0 1px 6px rgba(0,0,0,0.15)',
          }}>
            <span style={{ fontSize: 15 }}>🔥</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{streak > 0 ? streak : '–'}</span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'rgba(255,255,255,0.18)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 20,
            padding: '5px 12px',
            boxShadow: '0 1px 6px rgba(0,0,0,0.15)',
          }}>
            <CoinIcon size={15} />
            <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{coins}</span>
          </div>
        </>
      )}
      {!isPro && (
        <a
          href="/pricing"
          style={{
            fontSize: 11, fontWeight: 700, color: '#fff',
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.4)',
            borderRadius: 16,
            padding: '4px 10px',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
          data-tts="Upgrade to unlock rewards"
        >
          ⭐ Upgrade
        </a>
      )}
      <button
        onClick={onLogout}
        data-testid="logout-btn"
        style={{
          background: 'rgba(255,255,255,0.15)',
          border: '1.5px solid rgba(255,255,255,0.35)',
          borderRadius: 10,
          color: '#fff',
          fontSize: 12,
          fontWeight: 700,
          padding: '5px 12px',
          cursor: 'pointer',
          letterSpacing: '0.04em',
        }}
      >
        Exit
      </button>
    </div>
  </div>
  )
}

// ─── Main DashboardPage ───────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const { isPro: isProUser } = useFreemium()
  // R-08: respect prefers-reduced-motion for all Framer Motion animations in this page
  const prefersReducedMotion = useReducedMotion()
  const [wardrobeOpen, setWardrobeOpen] = useState(false)
  // Profile is typed without the new selected_avatar column; cast through any
  const profileAny = profile as (typeof profile & { selected_avatar?: string }) | null
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarVariantId>(
    (profileAny?.selected_avatar as AvatarVariantId) ?? 'wizard'
  )

  // Sync avatar from profile when it loads
  useEffect(() => {
    if (profileAny?.selected_avatar) {
      setSelectedAvatar(profileAny.selected_avatar as AvatarVariantId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileAny?.selected_avatar])

  const pupilId = user?.id ?? ''

  // ── fetch progress ──────────────────────────────────────────────────────────
  const { data: progress, isLoading: progressLoading } = useQuery<PupilProgressRow>({
    queryKey: ['formula_progress', pupilId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('formula_progress')
        .select('*')
        .eq('pupil_id', pupilId)
        .single()
      if (error) throw error
      return data as PupilProgressRow
    },
    enabled: !!pupilId,
    staleTime: 1000 * 30,
  })

  // ── fetch earned badges ─────────────────────────────────────────────────────
  const { data: pupilBadges } = useQuery<PupilBadgeRow[]>({
    queryKey: ['pupil_badges', pupilId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pupil_badges')
        .select('*, badges(*)')
        .eq('pupil_id', pupilId)
        .order('earned_at', { ascending: false })
      if (error) throw error
      return data as PupilBadgeRow[]
    },
    enabled: !!pupilId,
    staleTime: 1000 * 60 * 2,
  })

  // ── fetch chain level + mastery signal ─────────────────────────────────
  const { data: chainLevelData } = useQuery({
    queryKey: ['pwp_chain_level', pupilId],
    queryFn: async () => {
      if (!pupilId) return null
      const { data, error } = await supabase
        .from('pwp_pupil_levels')
        .select('current_level, mastery_points, mastery_signal')
        .eq('pupil_id', pupilId)
        .maybeSingle()
      if (error) throw error
      return data as { current_level: number; mastery_points: number; mastery_signal: boolean } | null
    },
    enabled: !!pupilId,
    staleTime: 1000 * 30,
  })

  // ── fetch chain session dates (to compute streak) ────────────────────────
  const today = new Date().toISOString().split('T')[0]
  // profiles.class_id is null for pupils — fall back to class_members lookup.
  const { data: classMemberData } = useQuery({
    queryKey: ['class_member', pupilId],
    queryFn: async () => {
      if (!pupilId) return null
      const { data, error } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('pupil_id', pupilId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!pupilId,
  })
  const classId =
    (profile as (typeof profile & { class_id?: string }) | null)?.class_id ??
    classMemberData?.class_id ??
    null
  const { data: chainToday } = useQuery({
    queryKey: ['pwp_chain_today', pupilId, today],
    queryFn: async () => {
      if (!pupilId || !classId) return null
      const { data, error } = await supabase
        .from('pwp_chain_sessions')
        .select('id')
        .eq('pupil_id', pupilId)
        .eq('session_date', today)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!pupilId && !!classId,
    staleTime: 1000 * 60 * 5,
  })
  const chainDoneToday = !!chainToday

  // ── fetch chain session dates for streak computation ──────────────────────
  const { data: chainDatesData } = useQuery({
    queryKey: ['pwp_chain_dates', pupilId, classId],
    queryFn: async () => {
      if (!pupilId || !classId) return []
      const { data, error } = await supabase
        .from('pwp_chain_sessions')
        .select('session_date')
        .eq('pupil_id', pupilId)
        .eq('class_id', classId)
        .order('session_date', { ascending: false })
        .limit(60)
      if (error) throw error
      return (data ?? []).map((r) => r.session_date as string)
    },
    enabled: !!pupilId && !!classId,
    staleTime: 1000 * 60 * 5,
  })
  const chainStreak = computeChainStreak(chainDatesData ?? [])

  // ── logout ──────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  // ── avatar select ───────────────────────────────────────────────────────────
  const handleSelectAvatar = async (id: AvatarVariantId) => {
    setSelectedAvatar(id)
    setWardrobeOpen(false)
    // Persist to DB (optimistic)
    await supabase
      .from('profiles')
      .update({ selected_avatar: id })
      .eq('id', pupilId)
  }

  // ── node click ──────────────────────────────────────────────────────────────
  const handleNodeClick = (level: number, _node: NodeType) => {
    const currentLevel = progress?.current_formula_level ?? 1
    const tier = levelTier(level, currentLevel)
    // S-07: Unlock <audio> autoplay within the gesture so SessionIntro TTS plays on iOS.
    sfx.prime()
    sfx.unlockAudio()
    if (tier === 'done') {
      // Completed level — open in review mode so progress isn't affected
      navigate(`/practice?level=${level}&review=true`)
    } else {
      // Active level — normal practice session
      navigate('/practice')
    }
  }

  // ── derived data ────────────────────────────────────────────────────────────
  const currentLevel = progress?.current_formula_level ?? 1
  const totalXp      = progress?.total_xp ?? 0
  const streak       = progress?.current_streak ?? 0
  const coins        = progress?.coins ?? 0
  const earnedBadgeIds = (pupilBadges ?? []).map((pb) => pb.badge_id)
  // Map DB badge IDs to our static BADGE_DEFS — first two badges always shown as earned for demo
  const demoEarnedIds = earnedBadgeIds.length === 0 && currentLevel >= 1
    ? ['b1', 'b2', currentLevel >= 3 ? 'b3' : ''].filter(Boolean)
    : earnedBadgeIds

  const avatarId = selectedAvatar
  // Profile.first_name is the correct field (no full_name/display_name on this schema)
  const name = profile?.first_name ?? 'Pupil'

  // ── loading ─────────────────────────────────────────────────────────────────
  if (progressLoading && !progress) {
    return (
      <div style={{
        minHeight: '100vh', background: C.bg,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 16,
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        >
          <WritzAvatar variant="wizard" size={64} />
        </motion.div>
        <p style={{ color: C.muted, fontSize: 14, fontWeight: 600 }}>Loading your adventure…</p>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // Three layout modes via CSS media query:
  //   mobile   < 768px  — single column, full-width path
  //   tablet  768–1023  — two column
  //   desktop ≥ 1024px  — two column, wider path
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    // R-06: fontFamily:'Inter' removed — Inter is not loaded; Nunito cascades from :root
    <div
      style={{ minHeight: '100dvh', background: C.bg }}
      data-testid="dashboard-page"
    >
      {/* Top bar */}
      <TopBar
        name={name}
        avatarId={avatarId}
        streak={streak}
        coins={coins}
        onOpenWardrobe={() => setWardrobeOpen(true)}
        onLogout={handleLogout}
        isPro={isProUser}
      />

      {/* Main content */}
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '24px 16px',
        // CSS grid: on small screens = 1 col; on larger = path + sidebar
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr)',
        gap: 24,
      }}
        className="dashboard-grid"
      >
        {/* ── Learning path column ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            background: C.surface,
            borderRadius: 20,
            padding: '20px 16px',
            border: `1px solid ${C.border}`,
            overflow: 'hidden',
          }}
        >
          <div style={{ marginBottom: 28, textAlign: 'center', padding: '8px 0 4px' }}>
            {/* Animated gradient heading */}
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              data-tts="Your learning path"
              className="gradient-heading-animate"
              style={{
                fontSize: 'clamp(22px, 5vw, 32px)',
                fontWeight: 900,
                margin: '0 0 6px',
                letterSpacing: '-0.01em',
                lineHeight: 1.1,
                background: `linear-gradient(90deg, var(--color-brand-secondary), var(--color-brand-primary), var(--color-brand-secondary))`,
                backgroundSize: '300% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                display: 'inline-block',
              }}
            >
              Your Learning Path
              {' '}
              {/* R-08: skip decorative wiggle when prefers-reduced-motion is set */}
              <motion.span
                style={{ display: 'inline-block', WebkitTextFillColor: 'initial', backgroundClip: 'unset' }}
                animate={prefersReducedMotion ? {} : { rotate: [0, 15, -10, 15, 0], scale: [1, 1.3, 1.1, 1.3, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
                aria-hidden="true"
              >
                ✨
              </motion.span>
            </motion.h1>

            {/* Animated underline */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
              style={{
                height: 3,
                borderRadius: 2,
                background: 'linear-gradient(90deg, var(--color-brand-secondary), var(--color-brand-primary))',
                maxWidth: 260,
                margin: '0 auto 10px',
                transformOrigin: 'left',
              }}
            />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              style={{ fontSize: 13, color: C.muted, margin: 0 }}
            >
              Keep going — every step makes you a better writer!
            </motion.p>
          </div>
          <ContinueCard
            currentLevel={currentLevel}
            onContinue={() => { sfx.prime(); sfx.unlockAudio(); navigate('/practice?skip_intro=true') }}
          />
          <DailyPracticeCard
            completedToday={chainDoneToday}
            currentLevel={currentLevel}
            onStart={() => { sfx.prime(); sfx.unlockAudio(); navigate('/daily-practice') }}
            masterySignal={chainLevelData?.mastery_signal ?? false}
            masteryPoints={chainLevelData?.mastery_points ?? 0}
            chainStreak={chainStreak}
          />

          {/* Free Practice entry — always available */}
          <motion.button
            onClick={() => { sfx.prime(); sfx.unlockAudio(); navigate('/free-practice') }}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            data-testid="free-practice-card"
            data-tts="Free Practice — practise anytime with colour-coded help"
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #F5A623cc, #F39C12aa)',
              border: '2px solid #F5A62355',
              borderRadius: 18,
              padding: '10px 20px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
              textAlign: 'left',
              boxShadow: '0 2px 12px rgba(245,166,35,0.2)',
            }}
          >
            <span style={{ fontSize: 20 }}>🎨</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 1 }}>
                Free Practice
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.88)', fontWeight: 600 }}>
                Colour-band help on · 5 XP/sentence · anytime
              </div>
            </div>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(255,255,255,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color: '#fff', flexShrink: 0,
            }} aria-hidden="true">▶</div>
          </motion.button>

          <LearningPath
            currentLevel={currentLevel}
            avatarVariant={avatarId}
            onNodeClick={handleNodeClick}
          />
        </motion.div>

        {/* ── Stats sidebar column ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="dashboard-sidebar"
        >
          <StatsSidebar
            progress={progress ?? {
              pupil_id: pupilId,
              current_formula_level: currentLevel,
              total_xp: totalXp,
              current_streak: streak,
              longest_streak: streak,
              streak_shield_active: false,
              coins,
              writing_studio_unlocked: false,
            }}
            profile={profile as { first_name?: string; selected_avatar?: string } | null}
            earnedBadgeIds={demoEarnedIds}
            onOpenWardrobe={() => setWardrobeOpen(true)}
            isPro={isProUser}
          />
        </motion.div>
      </div>

      {/* R-05: inline <style> tag removed — all rules moved to src/index.css.
           - .dashboard-grid breakpoints are now in the WF-051 responsive section
           - gradientShift keyframe is now in index.css with a prefers-reduced-motion override
           - global `button:hover` rule was REMOVED — it overrode node animations globally */}

      {/* Wardrobe modal */}
      <AnimatePresence>
        {wardrobeOpen && (
          <WardrobeModal
            currentAvatar={avatarId}
            coins={coins}
            ownedAvatars={['wizard']} // In full implementation load from DB
            onSelect={handleSelectAvatar}
            onClose={() => setWardrobeOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
