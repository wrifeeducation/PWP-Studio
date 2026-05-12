// Hardcoded WriFe PWP chapter + level structure.
// 67 formula levels grouped into 6 chapters.
// Each chapter has 4 node types per level: Learn → Build → Practice → Master.

export type NodeType = 'learn' | 'build' | 'practice' | 'master'

export interface LevelNode {
  level: number
  nodeType: NodeType
  label: string
  emoji: string
}

export interface Chapter {
  num: number
  title: string
  levelRange: [number, number] // inclusive
  masteryStatement: string
  concepts: string[]           // grammatical concepts taught in this chapter
  colour: string   // background for chapter banner
  textColour: string
  emoji: string
}

export const CHAPTERS: Chapter[] = [
  {
    num: 1,
    title: 'The Building Blocks',
    levelRange: [1, 8],
    masteryStatement: 'I can name and describe things using the right words.',
    concepts: ['Nouns', 'Determiners', 'Adjectives', 'Noun phrases'],
    colour: '#EDE7F6',
    textColour: '#6C5CE7',
    emoji: '🧱',
  },
  {
    num: 2,
    title: 'Adding Action',
    levelRange: [9, 20],
    masteryStatement: 'I can write complete sentences that show action.',
    concepts: ['Verbs', 'Adverbs', 'Subject & verb', 'Verb phrases'],
    colour: '#FFF3E0',
    textColour: '#F5A623',
    emoji: '⚡',
  },
  {
    num: 3,
    title: 'The Detail Makers',
    levelRange: [21, 35],
    masteryStatement: 'I can add detail to any part of a sentence.',
    concepts: ['Prepositional phrases', 'Adverbials', 'Fronted adverbials', 'Relative clauses'],
    colour: '#E8F5E9',
    textColour: '#27AE60',
    emoji: '🔍',
  },
  {
    num: 4,
    title: 'Joining Ideas',
    levelRange: [36, 50],
    masteryStatement: 'I can connect and extend ideas across sentences.',
    concepts: ['Coordinating conjunctions', 'Subordinating conjunctions', 'Compound sentences', 'Complex sentences'],
    colour: '#E3F2FD',
    textColour: '#2980B9',
    emoji: '🔗',
  },
  {
    num: 5,
    title: 'The Expert Writer',
    levelRange: [51, 60],
    masteryStatement: 'I write with sophistication and control.',
    concepts: ['Embedded clauses', 'Passive voice', 'Varied sentence openers', 'Sophisticated vocabulary'],
    colour: '#FCE4EC',
    textColour: '#E84393',
    emoji: '✍️',
  },
  {
    num: 6,
    title: 'Mastery Showcase',
    levelRange: [61, 67],
    masteryStatement: 'I can demonstrate mastery across all writing patterns.',
    concepts: ['Multi-clause sentences', 'Extended writing', 'All grammar patterns', 'Writer\'s craft'],
    colour: '#FFF8E1',
    textColour: '#F39C12',
    emoji: '🏆',
  },
]

/** Return the chapter that contains a given level (1-indexed) */
export function getChapterForLevel(level: number): Chapter {
  return CHAPTERS.find(
    (c) => level >= c.levelRange[0] && level <= c.levelRange[1]
  ) ?? CHAPTERS[CHAPTERS.length - 1]
}

/** Return all levels for a chapter as an ordered array */
export function getLevelsForChapter(chapter: Chapter): number[] {
  const levels: number[] = []
  for (let l = chapter.levelRange[0]; l <= chapter.levelRange[1]; l++) {
    levels.push(l)
  }
  return levels
}

// ─── Milestone types ──────────────────────────────────────────────────────────

export type MilestoneType = 'practice' | 'quiz' | 'paragraph'

/**
 * Quiz milestones — end of each chapter.
 * Pupil must pass a mastery quiz before the chapter is marked complete.
 */
const QUIZ_LEVELS = new Set([8, 20, 35, 50, 60, 67])

/**
 * Paragraph milestones — entry point of chapters 2, 3, 4.
 * Pupil writes a short paragraph (Lead → Support → Close) using the formula
 * sentence they have mastered as the topic sentence.
 */
const PARAGRAPH_LEVELS = new Set([9, 21, 36])

/** Returns the milestone type for a given world-map level number. */
export function getMilestoneType(level: number): MilestoneType {
  if (PARAGRAPH_LEVELS.has(level)) return 'paragraph'
  if (QUIZ_LEVELS.has(level))      return 'quiz'
  return 'practice'
}

export interface MilestoneMeta {
  emoji: string
  label: string
  /** Override node colour (undefined = use chapter colour) */
  colour?: string
  /** Ring accent colour */
  accent?: string
}

export const MILESTONE_META: Record<MilestoneType, MilestoneMeta> = {
  practice:  { emoji: '✏️',  label: 'Writing' },
  quiz:      { emoji: '🎯',  label: 'Quiz',      colour: '#E84393', accent: '#FF6EB4' },
  paragraph: { emoji: '📝',  label: 'Paragraph', colour: '#27AE60', accent: '#52D68A' },
}

/** Node labels and emojis per type */
export const NODE_META: Record<NodeType, { label: string; emoji: string }> = {
  learn:    { label: 'Learn',    emoji: '📖' },
  build:    { label: 'Build',    emoji: '🔨' },
  practice: { label: 'Practice', emoji: '🔄' },
  master:   { label: 'Master',   emoji: '⭐' },
}

/**
 * Coin costs and names for Writz avatars.
 * The `id` must match the `selected_avatar` value stored in the DB.
 */
export interface AvatarVariant {
  id: string
  name: string
  cost: number   // 0 = free default
  comingSoon?: boolean
}

export const AVATAR_VARIANTS: AvatarVariant[] = [
  { id: 'wizard',     name: 'Wizard Writz',     cost: 0 },
  { id: 'royal',      name: 'Royal Writz',      cost: 100 },
  { id: 'explorer',   name: 'Explorer Writz',   cost: 150 },
  { id: 'popstar',    name: 'Pop Star Writz',   cost: 200 },
  { id: 'ninja',      name: 'Ninja Writz',      cost: 200 },
  { id: 'astronaut',  name: 'Astronaut Writz',  cost: 250, comingSoon: true },
  { id: 'chef',       name: 'Chef Writz',       cost: 250, comingSoon: true },
  { id: 'knight',     name: 'Knight Writz',     cost: 300, comingSoon: true },
]

/** Coin earnings schedule */
export const COIN_EARNINGS = {
  perSession:      5,
  streakBonus:    10,   // awarded when streak milestone hit
  chapterComplete: 25,
} as const
