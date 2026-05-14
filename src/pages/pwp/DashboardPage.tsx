// PWP Dashboard — learning path (world map) + sidebar
// Phase 6 implementation

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

// ─── STATIC PATH DATA ────────────────────────────────────────────────────────

const PWP_LEVELS = [
  { id: 1,  levelNumber: 1,  title: 'Past Tense',                newElement: 'Noun + verb (past tense)',              isParagraph: false },
  { id: 2,  levelNumber: 2,  title: 'Present Tense',             newElement: 'Noun + verb (present tense)',           isParagraph: false },
  { id: 3,  levelNumber: 3,  title: 'Continuous Tense',          newElement: 'Helping verb + verb(-ing)',             isParagraph: false },
  { id: 4,  levelNumber: 4,  title: 'Object Noun',               newElement: 'Subject + verb + noun(object)',         isParagraph: false },
  { id: 5,  levelNumber: 5,  title: 'Determiner on Subject',     newElement: 'Det + noun(subject) + verb',            isParagraph: false },
  { id: 6,  levelNumber: 6,  title: 'Determiner on Object',      newElement: 'Det + noun + verb + det + noun',        isParagraph: false },
  { id: 7,  levelNumber: 7,  title: 'Adjective on Subject',      newElement: 'Det + adj + noun(subject) + verb',      isParagraph: false },
  { id: 8,  levelNumber: 8,  title: 'Adjective on Object',       newElement: 'Verb + adj + noun(object)',             isParagraph: false },
  { id: 9,  levelNumber: 9,  title: 'Adjective on Both',         newElement: 'Adj on subject and object',             isParagraph: false },
  { id: 10, levelNumber: 10, title: 'Adverb of Manner',          newElement: 'Verb + adverb(manner)',                 isParagraph: false },
  { id: 11, levelNumber: 11, title: 'Adverb of Time',            newElement: 'Verb + adverb(time)',                   isParagraph: false },
  { id: 12, levelNumber: 12, title: 'Adverb of Place',           newElement: 'Verb + adverb(place)',                  isParagraph: false },
  { id: 13, levelNumber: 13, title: 'Combined Adverbs',          newElement: 'All three adverb types in one sentence', isParagraph: false },
  { id: 14, levelNumber: 14, title: 'Pronoun as Subject',        newElement: 'Pronoun(subject) + verb',               isParagraph: false },
  { id: 15, levelNumber: 15, title: 'Pronoun in Full Sentences', newElement: 'Pronoun in full combinations',          isParagraph: false },
  { id: 16, levelNumber: 16, title: 'Preposition + Bare Noun',   newElement: 'Verb + preposition + noun',             isParagraph: false },
  { id: 17, levelNumber: 17, title: 'Preposition + Det + Noun',  newElement: 'Verb + prep + det + noun',              isParagraph: false },
  { id: 18, levelNumber: 18, title: 'Full Prep Phrase',          newElement: 'Prep + det + adj + noun',               isParagraph: false },
  { id: 19, levelNumber: 19, title: 'Prep Phrase Integration',   newElement: 'Prep phrase + all prior elements',      isParagraph: false },
  { id: 20, levelNumber: 20, title: 'Yes/No Questions',          newElement: 'Did + subject + verb?',                 isParagraph: false },
  { id: 21, levelNumber: 21, title: 'Wh- Questions',             newElement: 'Where/Why/How + subject + verb?',       isParagraph: false },
  { id: 22, levelNumber: 22, title: 'Commands & Exclamations',   newElement: 'Imperative / What a...! / How...!',     isParagraph: false },
  { id: 23, levelNumber: 23, title: 'Named Phrases',             newElement: 'Noun phrase / adverb phrase / prep phrase', isParagraph: false },
  { id: 24, levelNumber: 24, title: 'Dependent Clauses',         newElement: 'Because / when / although',             isParagraph: false },
  { id: 25, levelNumber: 25, title: 'Extended Subordinators',    newElement: 'If / unless / before / while / until',  isParagraph: false },
  { id: 26, levelNumber: 26, title: 'Relative Clauses',          newElement: 'Who / which / that — relative clauses', isParagraph: false },
  { id: 27, levelNumber: 27, title: 'Fronted Adverb',            newElement: 'Adverb + , + main clause',              isParagraph: false },
  { id: 28, levelNumber: 28, title: 'Fronted Phrases',           newElement: 'Fronted prep phrase / sub clause',      isParagraph: false },
  { id: 29, levelNumber: 29, title: 'Paragraph Phase',           newElement: 'Lead + Support + Close',                isParagraph: true  },
  { id: 30, levelNumber: 30, title: 'Compound Sentences',        newElement: 'Main clause + FANBOYS + main clause',   isParagraph: true  },
  { id: 31, levelNumber: 31, title: 'Compound-Complex',          newElement: 'Fronted sub + compound-complex',        isParagraph: true  },
  { id: 32, levelNumber: 32, title: 'Stacked Adjectives',        newElement: 'Det + adj, adj + noun',                 isParagraph: true  },
  { id: 33, levelNumber: 33, title: 'Embedded Relatives',        newElement: 'Embedded relative + transitional phrases', isParagraph: true },
  { id: 34, levelNumber: 34, title: 'Cohesion Devices',          newElement: 'Pronoun / synonym / connective reference', isParagraph: true },
  { id: 35, levelNumber: 35, title: 'Mastery',                   newElement: 'Full compound-complex — all elements',  isParagraph: true  },
] as const

const PWP_QUIZZES = [
  { id: 1,  quizNumber: 1,  title: 'Tense Mastery',                  insertedAfterLevel: 3  },
  { id: 2,  quizNumber: 2,  title: 'Determiner Mastery',             insertedAfterLevel: 6  },
  { id: 3,  quizNumber: 3,  title: 'Adjective Mastery',              insertedAfterLevel: 9  },
  { id: 4,  quizNumber: 4,  title: 'Adverb Mastery',                 insertedAfterLevel: 13 },
  { id: 5,  quizNumber: 5,  title: 'Pronoun Mastery',                insertedAfterLevel: 15 },
  { id: 6,  quizNumber: 6,  title: 'Preposition Phrase Mastery',     insertedAfterLevel: 19 },
  { id: 7,  quizNumber: 7,  title: 'Sentence Purpose Mastery',       insertedAfterLevel: 22 },
  { id: 8,  quizNumber: 8,  title: 'Named Phrases Mastery',          insertedAfterLevel: 23 },
  { id: 9,  quizNumber: 9,  title: 'Clause Mastery',                 insertedAfterLevel: 26 },
  { id: 10, quizNumber: 10, title: 'Fronted Adverbial Mastery',      insertedAfterLevel: 28 },
  { id: 11, quizNumber: 11, title: 'Compound & Complex Mastery',     insertedAfterLevel: 31 },
  { id: 12, quizNumber: 12, title: 'Phrases & Transitions Mastery',  insertedAfterLevel: 33 },
  { id: 13, quizNumber: 13, title: 'Cohesion Mastery',               insertedAfterLevel: 34 },
] as const

const CHAPTERS = [
  {
    id: 1, name: 'The Building Blocks', icon: '🧱',
    startLevel: 1,  endLevel: 9,
    pills: ['Nouns', 'Tenses', 'Determiners', 'Adjectives'],
  },
  {
    id: 2, name: 'Adding Detail', icon: '✨',
    startLevel: 10, endLevel: 19,
    pills: ['Adverbs', 'Pronouns', 'Prepositions'],
  },
  {
    id: 3, name: 'Different Sentences', icon: '❓',
    startLevel: 20, endLevel: 28,
    pills: ['Questions', 'Commands', 'Clauses', 'Fronted Adverbials'],
  },
  {
    id: 4, name: 'Paragraph Power', icon: '📝',
    startLevel: 29, endLevel: 35,
    pills: ['Paragraphs', 'Compound-Complex', 'Cohesion'],
  },
] as const

// ─── TYPES ───────────────────────────────────────────────────────────────────

type NodeState = 'done' | 'current' | 'next' | 'locked'

interface LevelNode {
  kind: 'level'
  id: number
  levelNumber: number
  title: string
  newElement: string
  isParagraph: boolean
  state: NodeState
}

interface QuizNode {
  kind: 'quiz'
  id: number
  quizNumber: number
  title: string
  newElement?: string
  insertedAfterLevel: number
  state: NodeState
}

type PathNode = LevelNode | QuizNode

interface ProgressData {
  totalXp: number
  streakDays: number
  highestLevel: number       // 1-35  (0 = not started)
  currentPwpLevelId: number | null
  levelsMastered: number
  badgeCount: number
  completedQuizIds: Set<number>
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getPupilId(): string | null {
  const { user } = useAuthStore.getState()
  if (user?.id) return user.id
  try {
    const raw = localStorage.getItem('pupilSession')
    if (raw) {
      const parsed = JSON.parse(raw)
      return parsed.pupilId ?? parsed.id ?? null
    }
  } catch { /* ignore */ }
  return null
}

function buildPathNodes(progress: ProgressData | null): PathNode[] {
  const highest = progress?.highestLevel ?? 1
  const completedQuizIds = progress?.completedQuizIds ?? new Set<number>()
  const nodes: PathNode[] = []

  for (const lvl of PWP_LEVELS) {
    let state: NodeState
    if (lvl.levelNumber < highest)       state = 'done'
    else if (lvl.levelNumber === highest) state = 'current'
    else if (lvl.levelNumber === highest + 1) state = 'next'
    else                                  state = 'locked'

    nodes.push({
      kind: 'level',
      id: lvl.id,
      levelNumber: lvl.levelNumber,
      title: lvl.title,
      newElement: lvl.newElement,
      isParagraph: lvl.isParagraph,
      state,
    })

    // Insert quiz after this level if one is mapped here
    const quiz = PWP_QUIZZES.find(q => q.insertedAfterLevel === lvl.levelNumber)
    if (quiz) {
      let qState: NodeState
      if (completedQuizIds.has(quiz.id))    qState = 'done'
      else if (lvl.levelNumber < highest)   qState = 'done'  // level after is done → quiz is done
      else if (lvl.levelNumber === highest) qState = 'current'
      else                                  qState = 'locked'

      nodes.push({
        kind: 'quiz',
        id: quiz.id,
        quizNumber: quiz.quizNumber,
        title: quiz.title,
        newElement: `Mastery checkpoint — Quiz ${quiz.quizNumber}`,
        insertedAfterLevel: quiz.insertedAfterLevel,
        state: qState,
      })
    }
  }

  return nodes
}

function getLevelTitle(levelsMastered: number): string {
  if (levelsMastered === 0)  return 'Apprentice Writer'
  if (levelsMastered < 5)   return 'Word Builder'
  if (levelsMastered < 10)  return 'Sentence Crafter'
  if (levelsMastered < 20)  return 'Grammar Explorer'
  if (levelsMastered < 30)  return 'Formula Master'
  return 'WriFe Champion'
}

function xpForTier(totalXp: number): { current: number; max: number } {
  const tier = Math.floor(totalXp / 500)
  return { current: totalXp - tier * 500, max: 500 }
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────

interface SidebarProps {
  progress: ProgressData
  pupilName: string
  onSignOut: () => void
}

function Sidebar({ progress, pupilName, onSignOut }: SidebarProps) {
  const navigate = useNavigate()
  const { current: xpCurrent, max: xpMax } = xpForTier(progress.totalXp)
  const xpPct = Math.min(100, Math.round((xpCurrent / xpMax) * 100))
  const ringDeg = Math.round((xpPct / 100) * 360)

  // Build Mon-Sun dots; today highlighted with flame
  const today = new Date()
  const dow = today.getDay() // 0=Sun
  const todayIdx = dow === 0 ? 6 : dow - 1  // Mon=0 … Sun=6
  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  const streakDots = DAY_LABELS.map((label, i) => {
    const daysAgo = (todayIdx - i + 7) % 7
    const isToday = i === todayIdx
    const isFilled = daysAgo < progress.streakDays
    return { label, isToday, isFilled }
  })

  return (
    <div style={{ width: 'var(--pwp-sidebar-width)', minHeight: '100dvh', backgroundColor: '#6C5CE7', display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', overflowY: 'auto', flexShrink: 0 }}>
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1 text-white/60 text-xs hover:text-white/90 transition-colors"
        data-tts="Back to WriFe Hub"
      >
        ← WriFe Hub
      </button>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-2 mt-1">
        <div
          className="w-[70px] h-[70px] rounded-full flex items-center justify-center"
          style={{
            background: `conic-gradient(#F5C500 0deg ${ringDeg}deg, rgba(255,255,255,0.15) ${ringDeg}deg 360deg)`,
          }}
        >
          <div className="w-[58px] h-[58px] rounded-full bg-[#5a4bd1] flex items-center justify-center text-[26px]">
            ✏️
          </div>
        </div>
        <div className="text-white font-bold text-[15px]" data-tts={pupilName}>{pupilName}</div>
        <div className="bg-white/20 text-[#F5C500] text-[11px] font-bold px-3 py-[2px] rounded-full">
          {getLevelTitle(progress.levelsMastered)}
        </div>
      </div>

      {/* XP progress bar */}
      <div>
        <div className="bg-white/10 rounded-md p-[2px]">
          <div
            className="h-[6px] rounded-sm transition-all duration-700"
            style={{ width: `${xpPct}%`, background: 'linear-gradient(90deg, #F5C500, #F5A623)' }}
          />
        </div>
        <div className="flex justify-between text-white/55 text-[10px] mt-1">
          <span>{xpCurrent.toLocaleString()} XP</span>
          <span>{xpMax} XP</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-[6px]">
        {[
          { icon: '⭐', label: 'Total XP',    val: progress.totalXp >= 1000 ? `${(progress.totalXp / 1000).toFixed(1)}k` : String(progress.totalXp) },
          { icon: '🔥', label: 'Streak',      val: `${progress.streakDays}d` },
          { icon: '🏅', label: 'Badges',      val: String(progress.badgeCount) },
          { icon: '📖', label: 'Levels Done', val: String(progress.levelsMastered) },
        ].map(({ icon, label, val }) => (
          <div key={label} className="bg-white/[0.12] rounded-[10px] p-2 text-center">
            <div className="text-[18px]">{icon}</div>
            <div className="text-white/55 text-[9px] uppercase tracking-wide mt-[1px]">{label}</div>
            <div className="text-white text-[15px] font-bold">{val}</div>
          </div>
        ))}
      </div>

      {/* Weekly calendar */}
      <div className="bg-white/10 rounded-[10px] px-[10px] py-2">
        <div className="text-white/55 text-[9px] uppercase tracking-wide mb-[5px]">This week</div>
        <div className="flex gap-[3px]">
          {streakDots.map(({ label, isToday, isFilled }, i) => (
            <div
              key={i}
              className="w-[24px] h-[24px] rounded-[5px] flex items-center justify-center text-[10px] font-bold"
              style={{
                background: isToday   ? '#F5C500'
                          : isFilled  ? '#F5A623'
                          : 'rgba(255,255,255,0.12)',
                color: isToday || isFilled ? '#fff' : 'rgba(255,255,255,0.3)',
                fontSize: isToday ? '13px' : '10px',
              }}
            >
              {isToday ? '🔥' : isFilled ? '✓' : label}
            </div>
          ))}
        </div>
      </div>

      {/* Sign out */}
      <button
        className="mt-auto text-white/40 text-[11px] hover:text-white/70 transition-colors text-left pt-2"
        onClick={onSignOut}
        data-tts="Sign out"
      >
        Sign out
      </button>
    </div>
  )
}

// ─── CHAPTER CARD ────────────────────────────────────────────────────────────

interface ChapterCardProps {
  chapter: typeof CHAPTERS[number]
  levelsDone: number
  totalLevels: number
}

function ChapterCard({ chapter, levelsDone, totalLevels }: ChapterCardProps) {
  return (
    <div
      className="bg-white rounded-2xl px-5 py-4 mb-4 border-2 border-[#e8e0ff] flex items-center gap-4"
      style={{ boxShadow: '0 2px 12px rgba(108,92,231,0.08)' }}
    >
      <div className="text-[32px] flex-shrink-0">{chapter.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold text-[#6C5CE7] uppercase tracking-[1px]">
          Chapter {chapter.id}
        </div>
        <div className="text-[16px] font-extrabold text-[#2D3436] my-[2px]">{chapter.name}</div>
        <div className="flex gap-[5px] flex-wrap mt-1">
          {chapter.pills.map(p => (
            <span key={p} className="bg-[#f0ecff] text-[#6C5CE7] text-[10px] font-semibold px-2 py-[1px] rounded-xl">
              {p}
            </span>
          ))}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-[20px] font-extrabold text-[#6C5CE7]">{levelsDone}/{totalLevels}</div>
        <div className="text-[10px] text-[#aaa]">levels complete</div>
      </div>
    </div>
  )
}

// ─── PATH NODE ROW ────────────────────────────────────────────────────────────

interface PathNodeRowProps {
  node: PathNode
  isLast: boolean
  isCurrent: boolean
  nodeRef?: React.RefObject<HTMLDivElement | null>
  onClick: () => void
}

function PathNodeRow({ node, isLast, isCurrent, nodeRef, onClick }: PathNodeRowProps) {
  const isLevel    = node.kind === 'level'
  const isParagraph = isLevel && (node as LevelNode).isParagraph
  const isQuiz     = node.kind === 'quiz'

  const PRIMARY   = isParagraph ? '#00b894' : isQuiz ? '#F5C500' : '#6C5CE7'
  const DONE_BG   = isParagraph ? '#55d6b3' : isQuiz ? '#fde68a' : '#a29bf5'
  const LOCKED_BG = isParagraph ? '#b2f0e0' : isQuiz ? '#fef3c7' : '#e0daf8'

  const nodeBg =
    node.state === 'done'    ? DONE_BG  :
    node.state === 'current' ? PRIMARY  :
    node.state === 'next'    ? PRIMARY  :
    LOCKED_BG

  const nodeIcon =
    node.state === 'done'   ? '✓' :
    node.state === 'locked' ? '🔒' :
    isQuiz                  ? '⭐' :
    isParagraph             ? '📝' : '✏️'

  const tagBg   = isParagraph ? '#e0faf4' : isQuiz ? '#fef9e0' : '#f0ecff'
  const tagText = isParagraph ? '#00b894' : isQuiz ? '#d4a017' : '#6C5CE7'
  const tagLabel = isQuiz ? '★ Checkpoint' : isParagraph ? '📝 Paragraph' : 'Formula Chain'

  const badge = {
    done:    { bg: '#e0faf4', fg: '#00b894', label: '✓ Done' },
    current: { bg: '#6C5CE7', fg: '#fff',    label: '▶ You are here' },
    next:    { bg: '#f0ecff', fg: '#6C5CE7', label: 'Up next →' },
    locked:  { bg: '#f0f0f0', fg: '#bbb',    label: '🔒 Locked' },
  }[node.state]

  const isClickable = node.state !== 'locked'

  return (
    <>
      <div
        ref={isCurrent ? (nodeRef as React.RefObject<HTMLDivElement>) : undefined}
        className="flex items-center gap-3 mb-2"
      >
        {/* Circle node — rendered as a button when clickable for keyboard access */}
        <motion.button
          className="w-[60px] h-[60px] rounded-full flex flex-col items-center justify-center flex-shrink-0 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#6C5CE7]"
          style={{
            background: nodeBg,
            cursor:     isClickable ? 'pointer' : 'default',
            opacity:    node.state === 'locked' ? 0.6 : 1,
            border:     'none',
            boxShadow:  isCurrent
              ? `0 0 0 4px ${PRIMARY}40, 0 4px 14px ${PRIMARY}50`
              : undefined,
          }}
          animate={isCurrent ? { scale: [1, 1.08, 1] } : {}}
          transition={isCurrent ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
          onClick={isClickable ? onClick : undefined}
          whileHover={isClickable ? { scale: 1.06 } : {}}
          whileTap={isClickable  ? { scale: 0.97 } : {}}
          disabled={!isClickable}
          aria-label={
            isClickable
              ? `Start ${isLevel ? `Level ${(node as LevelNode).levelNumber}` : node.title} — ${node.title}`
              : `${node.title} — locked`
          }
          aria-current={isCurrent ? 'step' : undefined}
          data-tts={node.title}
        >
          {isLevel && (
            <span className="text-white text-[10px] font-bold leading-none">
              {(node as LevelNode).levelNumber}
            </span>
          )}
          <span
            className="text-[18px] leading-none"
            style={{ opacity: node.state === 'locked' ? 0.5 : 1 }}
            aria-hidden="true"
          >
            {nodeIcon}
          </span>
        </motion.button>

        {/* Info text */}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-[#2D3436] truncate" data-tts={node.title}>
            {isLevel ? `Level ${(node as LevelNode).levelNumber} — ${node.title}` : node.title}
          </div>
          <div className="text-[11px] text-[#aaa] mt-[1px] truncate">
            {node.newElement ?? ''}
          </div>
          <span
            className="inline-block mt-[3px] px-2 py-[1px] rounded-[10px] text-[10px] font-semibold"
            style={{ background: tagBg, color: tagText }}
          >
            {tagLabel}
          </span>
        </div>

        {/* State badge */}
        <div
          className="flex-shrink-0 px-[10px] py-1 rounded-[20px] text-[11px] font-bold whitespace-nowrap"
          style={{ background: badge.bg, color: badge.fg }}
        >
          {badge.label}
        </div>
      </div>

      {/* Vertical connector */}
      {!isLast && (
        <div
          className="w-[3px] h-[24px] rounded-sm ml-[28px] mb-2"
          style={{ background: `linear-gradient(${PRIMARY}, ${PRIMARY}88)` }}
        />
      )}
    </>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate    = useNavigate()
  const { profile } = useAuthStore()
  const currentNodeRef = useRef<HTMLDivElement>(null)

  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  const pathNodes = buildPathNodes(progress)

  // ── Fetch progress ────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const pupilId = getPupilId()
      if (!pupilId) { navigate('/login'); return }

      try {
        // formula_progress has extra PWP columns (highest_level_reached, etc.)
        const { data: prog } = await supabase
          .from('formula_progress')
          .select('*')
          .eq('pupil_id', pupilId)
          .maybeSingle()

        const { count: badgeCount } = await supabase
          .from('pwp_pupil_badges')
          .select('*', { count: 'exact', head: true })
          .eq('pupil_id', pupilId)

        const { data: quizResults } = await supabase
          .from('pwp_quiz_results')
          .select('quiz_id, overall_passed')
          .eq('pupil_id', pupilId)
          .eq('overall_passed', true)

        const completedQuizIds = new Set<number>(
          (quizResults ?? [])
            .filter(r => r.quiz_id != null)
            .map(r => r.quiz_id as number)
        )

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = prog as any

        // First-login check: redirect to onboarding if the pupil hasn't
        // completed the walkthrough yet. Null progress also means new pupil.
        if (!p || p.pwp_onboarding_complete === false) {
          navigate('/onboarding', { replace: true })
          return
        }

        setProgress({
          totalXp:           p?.total_xp ?? 0,
          streakDays:        p?.streak_days ?? p?.current_streak ?? 0,
          highestLevel:      p?.highest_level_reached ?? p?.current_formula_level ?? 1,
          currentPwpLevelId: p?.current_pwp_level_id ?? null,
          levelsMastered:    p?.levels_mastered_count ?? 0,
          badgeCount:        badgeCount ?? 0,
          completedQuizIds,
        })
      } catch (err) {
        console.error('[Dashboard] fetch error:', err)
        setError('Could not load progress. Check your connection and try again.')
        setProgress({
          totalXp: 0, streakDays: 0, highestLevel: 1,
          currentPwpLevelId: 1, levelsMastered: 0,
          badgeCount: 0, completedQuizIds: new Set(),
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-scroll to current node once loaded
  useEffect(() => {
    if (!loading && currentNodeRef.current) {
      setTimeout(() => {
        currentNodeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 350)
    }
  }, [loading])

  // ── Sign out ──────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('pupilSession')
    navigate('/login')
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleNodeClick = (node: PathNode) => {
    if (node.kind === 'level') navigate(`/level/${node.id}`)
    else navigate(`/quiz/${node.id}`)
  }

  // ── Pupil name ────────────────────────────────────────────────────────────
  const pupilName = profile?.first_name ?? (() => {
    try {
      const s = localStorage.getItem('pupilSession')
      if (s) return JSON.parse(s).username ?? 'Writer'
    } catch { /* ignore */ }
    return 'Writer'
  })()

  // ── Quick resume target ────────────────────────────────────────────────────
  const quickResumeNode =
    pathNodes.find(n => n.state === 'current') ??
    pathNodes.find(n => n.state === 'next')

  // ── Chapter stats ─────────────────────────────────────────────────────────
  const chapterStats = CHAPTERS.map(ch => {
    const totalLevels = ch.endLevel - ch.startLevel + 1
    const levelsDone  = pathNodes.filter(
      n => n.kind === 'level' &&
           (n as LevelNode).levelNumber >= ch.startLevel &&
           (n as LevelNode).levelNumber <= ch.endLevel &&
           n.state === 'done'
    ).length
    return { ...ch, levelsDone, totalLevels }
  })

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          className="w-12 h-12 rounded-full border-4 border-[#6C5CE7] border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-background)', display: 'flex', flexDirection: 'column' }}>
      {/* Skip navigation */}
      <a href="#pwp-main-content" className="skip-nav">
        Skip to learning path
      </a>

      {/* ── Mobile top strip (hidden md+) ─────────────────────────────────── */}
      {progress && (
        <div
          className="flex md:hidden items-center gap-3 px-4"
          style={{ backgroundColor: '#6C5CE7', minHeight: 'var(--pwp-touch-xl)', flexShrink: 0 }}
        >
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'rgba(255,255,255,0.18)',
              border: '1.5px solid rgba(255,255,255,0.35)',
              borderRadius: '8px', color: '#fff',
              fontSize: 'var(--pwp-text-xs)', fontWeight: 700,
              padding: '6px 10px', cursor: 'pointer',
              minHeight: 'var(--pwp-touch-min)', whiteSpace: 'nowrap',
            }}
            data-tts="Back to WriFe Hub"
          >
            ← Hub
          </button>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 'var(--pwp-text-sm)', fontWeight: 700, color: '#fff' }} className="truncate">
              {pupilName}
            </div>
            <div style={{ fontSize: 'var(--pwp-text-2xs)', color: 'rgba(255,255,255,0.75)' }}>
              ⭐ {progress.totalXp.toLocaleString()} XP · 🔥 {progress.streakDays}d streak
            </div>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              background: 'transparent', border: 'none',
              color: 'rgba(255,255,255,0.6)', fontSize: 'var(--pwp-text-2xs)',
              cursor: 'pointer', minHeight: 'var(--pwp-touch-min)', padding: '0 4px',
            }}
            data-tts="Sign out"
          >
            Sign out
          </button>
        </div>
      )}

      {/* ── Main layout: sidebar + content ───────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1 }}>

        {/* Desktop sidebar — hidden on mobile */}
        {progress && (
          <div className="hidden md:block flex-shrink-0">
            <Sidebar progress={progress} pupilName={pupilName} onSignOut={handleSignOut} />
          </div>
        )}

        {/* MAIN PANEL */}
        <main id="pwp-main-content" className="flex-1 bg-[#FDF8EE]" style={{ padding: 'clamp(16px, 3vw, 32px)' }}>

          {/* Header */}
          <div className="mb-5">
            <h1 className="text-[24px] font-extrabold text-[#2D3436]">
              Your Learning Path ✨
            </h1>
            <p className="text-[13px] text-[#666] mt-[2px]">
              Keep going — every step makes you a better writer!
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">
              {error}
            </div>
          )}

          {/* Quick Resume button */}
          {quickResumeNode && (
            <motion.button
              className="w-full mb-6 py-4 rounded-2xl text-white font-extrabold text-[16px] flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #F5A623 0%, #F5C500 100%)',
                boxShadow: '0 4px 20px rgba(245,166,35,0.45)',
              }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleNodeClick(quickResumeNode)}
              data-tts="Quick Resume"
            >
              ▶ Quick Resume —{' '}
              {quickResumeNode.kind === 'level'
                ? `Level ${(quickResumeNode as LevelNode).levelNumber}: ${quickResumeNode.title}`
                : quickResumeNode.title}
            </motion.button>
          )}

          {/* Chapter groups */}
          {CHAPTERS.map(ch => {
            const stat = chapterStats.find(s => s.id === ch.id)!

            const chapterNodes = pathNodes.filter(n => {
              if (n.kind === 'level') {
                return (n as LevelNode).levelNumber >= ch.startLevel &&
                       (n as LevelNode).levelNumber <= ch.endLevel
              }
              // Quiz: belongs to chapter if its anchor level is in this chapter
              return (n as QuizNode).insertedAfterLevel >= ch.startLevel &&
                     (n as QuizNode).insertedAfterLevel <= ch.endLevel
            })

            return (
              <div key={ch.id}>
                <ChapterCard
                  chapter={ch}
                  levelsDone={stat.levelsDone}
                  totalLevels={stat.totalLevels}
                />

                <div className="pl-10 mb-8">
                  {chapterNodes.map((node, idx) => {
                    const isCurrent = node.state === 'current'
                    const isLast    = idx === chapterNodes.length - 1
                    return (
                      <PathNodeRow
                        key={`${node.kind}-${node.id}`}
                        node={node}
                        isLast={isLast}
                        isCurrent={isCurrent}
                        nodeRef={isCurrent ? currentNodeRef : undefined}
                        onClick={() => handleNodeClick(node)}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Completion state */}
          {progress && progress.levelsMastered >= 35 && (
            <div className="text-center py-10">
              <div className="text-[52px] mb-3">🏆</div>
              <div className="text-[22px] font-extrabold text-[#6C5CE7]">
                You've mastered all 35 levels!
              </div>
              <div className="text-[#666] mt-2 text-[14px]">
                You are a true WriFe Champion.
              </div>
            </div>
          )}
        </main>
      </div>{/* end main layout */}
    </div>
  )
}
