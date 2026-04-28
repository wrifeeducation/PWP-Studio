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
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { WritzAvatar, type AvatarVariantId } from '../components/WritzAvatar'
import {
  CHAPTERS,
  AVATAR_VARIANTS,
  NODE_META,
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
  awarded_at: string
  badges: {
    id: string
    name: string
    icon_key: string
    description: string
    trigger_type: string
    trigger_value: number
  }
}

// ─── colour tokens (inline, matches existing HomePage pattern) ────────────────

const C = {
  brand:   '#6C5CE7',
  orange:  '#F5A623',
  bg:      '#FAF9F7',
  surface: '#FFFFFF',
  border:  '#EDEBE7',
  text:    '#2D3436',
  muted:   '#8E9BAE',
  green:   '#27AE60',
  pink:    '#E84393',
} as const

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Total number of node steps before a given level within its chapter */
const NODE_TYPES = ['learn', 'build', 'practice', 'master'] as const
type NodeType = typeof NODE_TYPES[number]

/** Pixel offset for meander: alternates left / right on mobile */
function meandX(idx: number): number {
  const pattern = [0, 40, 80, 40]
  return pattern[idx % 4]
}

// ─── Node component ───────────────────────────────────────────────────────────

interface NodeProps {
  level: number
  nodeType: NodeType
  state: 'done' | 'active' | 'locked'
  isAvatar: boolean
  chapterColour: string
  onClick?: () => void
}

const PathNode: React.FC<NodeProps> = ({ level, nodeType, state, isAvatar, chapterColour, onClick }) => {
  const meta = NODE_META[nodeType]
  const isDone   = state === 'done'
  const isActive = state === 'active'
  const isLocked = state === 'locked'

  const bg = isDone
    ? C.green
    : isActive
    ? chapterColour
    : '#DFE6E9'

  const border = isDone
    ? '#1e8449'
    : isActive
    ? chapterColour
    : '#B2BEC3'

  return (
    <button
      onClick={onClick}
      disabled={isLocked}
      aria-label={`Level ${level} ${meta.label}${isLocked ? ' (locked)' : ''}`}
      data-tts={`Level ${level} ${meta.label}`}
      data-testid={`node-${level}-${nodeType}`}
      style={{
        position: 'relative',
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: bg,
        border: `3px solid ${border}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isLocked ? 'default' : 'pointer',
        boxShadow: isActive ? `0 0 0 5px ${chapterColour}33, 0 4px 14px ${chapterColour}44` : '0 2px 6px rgba(0,0,0,0.12)',
        transition: 'transform 0.15s, box-shadow 0.15s',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }}>{isLocked ? '🔒' : meta.emoji}</span>
      {isActive && (
        <span style={{
          position: 'absolute',
          bottom: -22,
          fontSize: 10,
          fontWeight: 700,
          color: chapterColour,
          whiteSpace: 'nowrap',
          letterSpacing: '0.04em',
        }}>
          L{level}
        </span>
      )}
      {isAvatar && (
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: -60 }}
        >
          <WritzAvatar size={50} animated={false} />
        </motion.div>
      )}
    </button>
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
      {unlocked && (
        <div style={{ fontSize: 12, color: completed ? 'rgba(255,255,255,0.85)' : C.muted, marginTop: 2 }}
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
          <span style={{ fontSize: 16 }}>🪙</span>
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
                }}>
                  🪙 {av.cost}
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
  profile: { display_name?: string; full_name?: string; selected_avatar?: string } | null
  earnedBadgeIds: string[]
  onOpenWardrobe: () => void
}

const StatsSidebar: React.FC<StatsSidebarProps> = ({ progress, profile, earnedBadgeIds, onOpenWardrobe }) => {
  const avatarId = (profile?.selected_avatar ?? 'wizard') as AvatarVariantId
  const name = profile?.display_name ?? profile?.full_name ?? 'Pupil'
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
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
      }}>
        {[
          { label: 'Level', value: `L${progress.current_formula_level}`, emoji: '📈', colour: C.brand },
          { label: 'XP',    value: progress.total_xp.toLocaleString(),   emoji: '⭐', colour: '#F39C12' },
          { label: 'Streak', value: `${progress.current_streak}d`,       emoji: '🔥', colour: '#E74C3C' },
          { label: 'Coins',  value: progress.coins.toLocaleString(),      emoji: '🪙', colour: C.orange },
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
            <div style={{ fontSize: 20 }}>{s.emoji}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.colour }}>{s.value}</div>
            <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Badges panel */}
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
    </div>
  )
}

// ─── Learning path (mobile vertical) ─────────────────────────────────────────

interface LearningPathProps {
  currentLevel: number
  onNodeClick: (level: number, node: NodeType) => void
}

const LearningPath: React.FC<LearningPathProps> = ({ currentLevel, onNodeClick }) => {
  // For simplicity: "current node" = first 'learn' node at current level.
  // Completed = all nodes in levels < currentLevel.
  // Active node = 'learn' at currentLevel.

  return (
    <div style={{ position: 'relative', padding: '24px 0 80px' }}>
      {CHAPTERS.map((chapter) => {
        const chapterLevels = getLevelsForChapter(chapter)
        const chapterMax = chapter.levelRange[1]
        const chapterMin = chapter.levelRange[0]
        const chapterDone   = currentLevel > chapterMax
        const chapterLocked = currentLevel < chapterMin
        const chapterCurrent = !chapterDone && !chapterLocked

        return (
          <div key={chapter.num} style={{ marginBottom: 40 }}>
            <ChapterBanner
              chapter={chapter}
              unlocked={!chapterLocked}
              isCurrent={chapterCurrent}
              completed={chapterDone}
            />

            {/* nodes */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              paddingLeft: 16,
              gap: 0,
            }}>
              {chapterLevels.map((level, li) => (
                <div key={level}>
                  {NODE_TYPES.map((nt, ni) => {
                    const levelDone   = level < currentLevel
                    const levelActive = level === currentLevel
                    const levelLocked = level > currentLevel

                    const nodeDone   = levelDone || (levelActive && ni < NODE_TYPES.indexOf('learn' as NodeType))
                    const nodeActive = levelActive && nt === 'learn'
                    const nodeLocked = levelLocked || (levelActive && ni > NODE_TYPES.indexOf('learn' as NodeType))

                    const nodeState: 'done' | 'active' | 'locked' = nodeDone ? 'done' : nodeActive ? 'active' : 'locked'
                    const isAvatarNode = nodeActive

                    const nodeIdx = li * 4 + ni
                    const xOffset = meandX(nodeIdx)

                    return (
                      <div key={nt} style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginLeft: xOffset,
                        marginBottom: 28,
                        position: 'relative',
                      }}>
                        {/* connector line up */}
                        {(li > 0 || ni > 0) && (
                          <div style={{
                            position: 'absolute',
                            top: -22,
                            left: 24,
                            width: 3,
                            height: 22,
                            background: nodeDone || nodeActive ? C.green : '#DFE6E9',
                            borderRadius: 2,
                          }} />
                        )}
                        <PathNode
                          level={level}
                          nodeType={nt}
                          state={nodeState}
                          isAvatar={isAvatarNode}
                          chapterColour={chapter.textColour}
                          onClick={() => !nodeLocked && onNodeClick(level, nt)}
                        />
                        {/* label on right */}
                        <div style={{ marginLeft: 14 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: nodeLocked ? C.muted : C.text }}>
                            {nodeActive ? `Level ${level}` : nt === 'learn' ? `Level ${level}` : ''}
                          </div>
                          <div style={{ fontSize: 11, color: C.muted }}>
                            {nodeLocked ? '🔒 Locked' : NODE_META[nt].label}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
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
}

const TopBar: React.FC<TopBarProps> = ({ name, avatarId, streak, coins, onOpenWardrobe, onLogout }) => (
  <div style={{
    position: 'sticky',
    top: 0,
    zIndex: 50,
    background: C.brand,
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  }}>
    <button
      onClick={onOpenWardrobe}
      data-testid="topbar-avatar-btn"
      style={{
        background: 'rgba(255,255,255,0.15)',
        border: '2px solid rgba(255,255,255,0.4)',
        borderRadius: '50%',
        width: 40,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
      }}
    >
      <WritzAvatar variant={avatarId} size={30} />
    </button>

    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {name}
      </div>
    </div>

    {/* Quick stats */}
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '4px 10px' }}>
        <span style={{ fontSize: 14 }}>🔥</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{streak}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '4px 10px' }}>
        <span style={{ fontSize: 14 }}>🪙</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{coins}</span>
      </div>
      <button
        onClick={onLogout}
        data-testid="logout-btn"
        style={{
          background: 'transparent',
          border: '1.5px solid rgba(255,255,255,0.4)',
          borderRadius: 8,
          color: '#fff',
          fontSize: 12,
          fontWeight: 600,
          padding: '4px 10px',
          cursor: 'pointer',
        }}
      >
        Exit
      </button>
    </div>
  </div>
)

// ─── Main DashboardPage ───────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
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
    queryKey: ['pupil_progress', pupilId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pupil_progress')
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
        .order('awarded_at', { ascending: false })
      if (error) throw error
      return data as PupilBadgeRow[]
    },
    enabled: !!pupilId,
    staleTime: 1000 * 60 * 2,
  })

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
  const handleNodeClick = (level: number, node: NodeType) => {
    // In the full implementation this would navigate to the formula practice page
    // For now, just a placeholder
    console.log('Navigate to level', level, 'node', node)
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
  const name = (profile as any)?.display_name ?? (profile as any)?.full_name ?? 'Pupil'

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
    <div
      style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Inter', sans-serif" }}
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
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 18, fontWeight: 900, color: C.text, margin: 0 }}
              data-tts="Your learning path">
              Your Learning Path ✨
            </h1>
            <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>
              Keep going — every step makes you a better writer!
            </p>
          </div>
          <LearningPath
            currentLevel={currentLevel}
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
            profile={profile as any}
            earnedBadgeIds={demoEarnedIds}
            onOpenWardrobe={() => setWardrobeOpen(true)}
          />
        </motion.div>
      </div>

      {/* Responsive grid style */}
      <style>{`
        @media (min-width: 768px) {
          .dashboard-grid {
            grid-template-columns: 1fr 320px !important;
          }
        }
        @media (min-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: 1fr 360px !important;
          }
        }
        .dashboard-sidebar {
          /* on mobile the sidebar appears below the path */
        }
        button:hover:not(:disabled) {
          transform: scale(1.04);
        }
      `}</style>

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
