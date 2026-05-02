/**
 * Phase 4: useParagraphProgress
 *
 * Reads paragraph_sessions for a pupil and computes which genres are
 * unlocked and mastered, per §4.3 of docs/adaptive-progression-plan.md.
 *
 * Genre chain: NARRATIVE → NON_FICTION → PERSUASIVE → POETRY
 *
 * Mastery criteria per genre:
 *   NARRATIVE   — 3 sessions composite ≥ 70%, at least 1 with scaffold_used = false
 *   NON_FICTION — 3 sessions composite ≥ 70% AND genre_match_score ≥ 2 (≈65% of 3)
 *   PERSUASIVE  — 3 sessions composite ≥ 70% (rhetorical device check is AI-only)
 *   POETRY      — 2 sessions composite ≥ 70%
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Genre } from '../types/index'

// ─── Mastery thresholds (mirrors §4.3) ────────────────────────────────────────

export const COMPOSITE_THRESHOLD = 70           // composite_paragraph_score >= 70
export const NON_FICTION_GENRE_MATCH_MIN = 2    // genre_match_score >= 2 on 0-3 scale

const SESSIONS_NEEDED: Record<Genre, number> = {
  [Genre.NARRATIVE]: 3,
  [Genre.NON_FICTION]: 3,
  [Genre.PERSUASIVE]: 3,
  [Genre.POETRY]: 2,
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GenreProgress {
  /** Sessions that meet the composite threshold for this genre */
  sessionsQualifying: number
  /** Sessions needed to master this genre (unlock the next) */
  sessionsNeeded: number
  /** Sessions with scaffold_used = false (relevant for NARRATIVE only) */
  unscaffoldedCount: number
  /** Whether the pupil can currently select this genre */
  unlocked: boolean
  /** Whether the pupil has met all exit criteria for this genre */
  mastered: boolean
}

export interface ParagraphProgressData {
  unlockedGenres: Genre[]
  masteredGenres: Genre[]
  genreProgress: Record<Genre, GenreProgress>
}

// ─── Row type returned from Supabase query ────────────────────────────────────

interface SessionRow {
  genre: Genre
  composite_paragraph_score: number | null
  genre_match_score: number | null
  scaffold_used: boolean
}

// ─── Pure computation (exported for use in ParagraphPage submit handler) ──────

/**
 * Returns true if the given sessions meet the mastery criteria for a genre.
 * Operates on raw sessions — caller is responsible for pre-filtering by genre.
 */
export function checkSingleGenreMastery(
  genre: Genre,
  sessions: SessionRow[]
): boolean {
  const qualifying = sessions.filter(
    (s) => (s.composite_paragraph_score ?? 0) >= COMPOSITE_THRESHOLD
  )
  const needed = SESSIONS_NEEDED[genre]

  switch (genre) {
    case Genre.NARRATIVE:
      return (
        qualifying.length >= needed &&
        qualifying.some((s) => !s.scaffold_used)
      )
    case Genre.NON_FICTION:
      return (
        qualifying.filter(
          (s) => (s.genre_match_score ?? 0) >= NON_FICTION_GENRE_MATCH_MIN
        ).length >= needed
      )
    case Genre.PERSUASIVE:
      return qualifying.length >= needed
    case Genre.POETRY:
      return qualifying.length >= needed
    default:
      return false
  }
}

/**
 * Compute full genre progression state from raw session rows
 * and the genres already recorded as mastered in pupil_progress.
 */
export function computeGenreProgress(
  sessions: SessionRow[],
  masteredFromDB: Genre[]
): ParagraphProgressData {
  const bySessions = (genre: Genre): SessionRow[] =>
    sessions.filter((s) => s.genre === genre)

  const isMastered = (genre: Genre): boolean =>
    masteredFromDB.includes(genre) ||
    checkSingleGenreMastery(genre, bySessions(genre))

  // ── Cascade unlock chain ──────────────────────────────────────────────────
  const narrativeMastered = isMastered(Genre.NARRATIVE)
  const nonFictionMastered = isMastered(Genre.NON_FICTION)
  const persuasiveMastered = isMastered(Genre.PERSUASIVE)
  const poetryMastered = isMastered(Genre.POETRY)

  const nonFictionUnlocked = narrativeMastered
  const persuasiveUnlocked = nonFictionMastered
  const poetryUnlocked = persuasiveMastered

  // ── Genre progress detail ──────────────────────────────────────────────────

  const narrativeSessions = bySessions(Genre.NARRATIVE)
  const narrativeQualifying = narrativeSessions.filter(
    (s) => (s.composite_paragraph_score ?? 0) >= COMPOSITE_THRESHOLD
  )

  const nonFictionSessions = bySessions(Genre.NON_FICTION)
  const nonFictionQualifying = nonFictionSessions.filter(
    (s) =>
      (s.composite_paragraph_score ?? 0) >= COMPOSITE_THRESHOLD &&
      (s.genre_match_score ?? 0) >= NON_FICTION_GENRE_MATCH_MIN
  )

  const persuasiveSessions = bySessions(Genre.PERSUASIVE)
  const persuasiveQualifying = persuasiveSessions.filter(
    (s) => (s.composite_paragraph_score ?? 0) >= COMPOSITE_THRESHOLD
  )

  const poetrySessions = bySessions(Genre.POETRY)
  const poetryQualifying = poetrySessions.filter(
    (s) => (s.composite_paragraph_score ?? 0) >= COMPOSITE_THRESHOLD
  )

  const genreProgress: Record<Genre, GenreProgress> = {
    [Genre.NARRATIVE]: {
      sessionsQualifying: narrativeQualifying.length,
      sessionsNeeded: SESSIONS_NEEDED[Genre.NARRATIVE],
      unscaffoldedCount: narrativeQualifying.filter((s) => !s.scaffold_used).length,
      unlocked: true,
      mastered: narrativeMastered,
    },
    [Genre.NON_FICTION]: {
      sessionsQualifying: nonFictionQualifying.length,
      sessionsNeeded: SESSIONS_NEEDED[Genre.NON_FICTION],
      unscaffoldedCount: 0,
      unlocked: nonFictionUnlocked,
      mastered: nonFictionMastered,
    },
    [Genre.PERSUASIVE]: {
      sessionsQualifying: persuasiveQualifying.length,
      sessionsNeeded: SESSIONS_NEEDED[Genre.PERSUASIVE],
      unscaffoldedCount: 0,
      unlocked: persuasiveUnlocked,
      mastered: persuasiveMastered,
    },
    [Genre.POETRY]: {
      sessionsQualifying: poetryQualifying.length,
      sessionsNeeded: SESSIONS_NEEDED[Genre.POETRY],
      unscaffoldedCount: 0,
      unlocked: poetryUnlocked,
      mastered: poetryMastered,
    },
  }

  const unlockedGenres: Genre[] = [Genre.NARRATIVE]
  if (nonFictionUnlocked) unlockedGenres.push(Genre.NON_FICTION)
  if (persuasiveUnlocked) unlockedGenres.push(Genre.PERSUASIVE)
  if (poetryUnlocked) unlockedGenres.push(Genre.POETRY)

  const masteredGenres: Genre[] = []
  if (narrativeMastered) masteredGenres.push(Genre.NARRATIVE)
  if (nonFictionMastered) masteredGenres.push(Genre.NON_FICTION)
  if (persuasiveMastered) masteredGenres.push(Genre.PERSUASIVE)
  if (poetryMastered) masteredGenres.push(Genre.POETRY)

  return { unlockedGenres, masteredGenres, genreProgress }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useParagraphProgress = (pupilId: string | null | undefined) => {
  return useQuery<ParagraphProgressData, Error>({
    queryKey: ['paragraph_progress', pupilId],
    enabled: !!pupilId,
    staleTime: 1000 * 60 * 5, // 5 minutes — refresh after submit via invalidateQueries
    queryFn: async () => {
      // Fetch all paragraph sessions for this pupil
      const { data: sessions, error: sessionsError } = await supabase
        .from('paragraph_sessions')
        .select('genre, composite_paragraph_score, genre_match_score, scaffold_used')
        .eq('pupil_id', pupilId!)
        .order('created_at', { ascending: true }) // oldest first so recent sessions stack

      if (sessionsError) throw sessionsError

      // Fetch genres already confirmed as mastered in pupil_progress
      const { data: progressRow, error: progressError } = await supabase
        .from('pupil_progress')
        .select('paragraph_genres_mastered')
        .eq('pupil_id', pupilId!)
        .single()

      if (progressError) throw progressError

      const masteredFromDB = (progressRow?.paragraph_genres_mastered ?? []) as Genre[]

      return computeGenreProgress(
        (sessions ?? []) as SessionRow[],
        masteredFromDB
      )
    },
  })
}
