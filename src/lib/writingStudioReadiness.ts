/**
 * Phase 5: Writing Studio readiness checker (§5.2 of adaptive-progression-plan)
 *
 * Three criteria must ALL be true before the system suggests Writing Studio
 * to the teacher:
 *
 *   Breadth   — pupil has mastered ≥6 formula levels spanning ≥2 curriculum phases
 *   Depth     — pupil has ≥3 paragraph sessions with composite ≥70 across ≥2 genres
 *   Coherence — the pupil's last 3 paragraph sessions each have tense_register_score ≥2
 *
 * This module is intentionally side-effect-free (readiness check) and
 * separately effectful (trigger). Callers own error handling.
 */

import { supabase } from './supabase'
import { Genre, MasteryEventType, TeacherNotificationType } from '../types/index'

// ─── Thresholds (mirrors §5.2) ────────────────────────────────────────────────

export const READINESS_BREADTH_LEVELS = 6       // levels_mastered_count >= 6
export const READINESS_BREADTH_PHASES = 2       // mastered levels must span >= 2 phases
export const READINESS_DEPTH_SESSIONS = 3       // qualifying paragraph sessions >= 3
export const READINESS_DEPTH_GENRES = 2         // across >= 2 distinct genres
export const READINESS_DEPTH_COMPOSITE = 70     // composite_paragraph_score >= 70
export const READINESS_COHERENCE_SESSIONS = 3   // last N sessions checked
export const READINESS_COHERENCE_MIN_SCORE = 2  // tense_register_score >= 2 (0-3)

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReadinessEvidence {
  breadthLevelsMastered: number
  breadthPhases: string[]
  depthQualifyingSessions: number
  depthGenres: Genre[]
  coherenceSessionsChecked: number
  coherenceSessionsPassing: number
}

export interface ReadinessResult {
  ready: boolean
  breadthMet: boolean
  depthMet: boolean
  coherenceMet: boolean
  evidence: ReadinessEvidence
}

// ─── Breadth criterion ────────────────────────────────────────────────────────

async function checkBreadth(
  pupilId: string
): Promise<{ met: boolean; levelsMastered: number; phases: string[] }> {
  // Step 1: get levels_mastered_count from pupil_progress (fast — single row)
  const { data: progress } = await supabase
    .from('formula_progress')
    .select('levels_mastered_count')
    .eq('pupil_id', pupilId)
    .single()

  const levelsMastered = progress?.levels_mastered_count ?? 0

  if (levelsMastered < READINESS_BREADTH_LEVELS) {
    return { met: false, levelsMastered, phases: [] }
  }

  // Step 2: fetch the formula levels that were mastered (via mastery_events)
  // and look up their phases to confirm 2+ curriculum phases are covered.
  const { data: events } = await supabase
    .from('mastery_events')
    .select('level_id')
    .eq('pupil_id', pupilId)
    .eq('event_type', MasteryEventType.LEVEL_MASTERED)
    .not('level_id', 'is', null)

  const levelIds = [...new Set((events ?? []).map((e) => e.level_id).filter(Boolean) as number[])]

  if (levelIds.length === 0) {
    return { met: false, levelsMastered, phases: [] }
  }

  const { data: formulaLevels } = await supabase
    .from('formula_levels')
    .select('id, phase')
    .in('id', levelIds)

  const phases = [...new Set((formulaLevels ?? []).map((l) => l.phase as string).filter(Boolean))]

  const met = levelsMastered >= READINESS_BREADTH_LEVELS && phases.length >= READINESS_BREADTH_PHASES

  return { met, levelsMastered, phases }
}

// ─── Depth criterion ──────────────────────────────────────────────────────────

async function checkDepth(
  pupilId: string
): Promise<{ met: boolean; qualifyingSessions: number; genres: Genre[] }> {
  const { data: sessions } = await supabase
    .from('paragraph_sessions')
    .select('genre, composite_paragraph_score')
    .eq('pupil_id', pupilId)
    .gte('composite_paragraph_score', READINESS_DEPTH_COMPOSITE)
    .order('created_at', { ascending: false })

  if (!sessions || sessions.length === 0) {
    return { met: false, qualifyingSessions: 0, genres: [] }
  }

  const qualifyingSessions = sessions.length
  const genres = [...new Set(sessions.map((s) => s.genre as Genre))]

  const met =
    qualifyingSessions >= READINESS_DEPTH_SESSIONS &&
    genres.length >= READINESS_DEPTH_GENRES

  return { met, qualifyingSessions, genres }
}

// ─── Coherence criterion ──────────────────────────────────────────────────────

async function checkCoherence(
  pupilId: string
): Promise<{ met: boolean; sessionsPassing: number; sessionsChecked: number }> {
  // Fetch the last N paragraph sessions regardless of genre/score
  const { data: sessions } = await supabase
    .from('paragraph_sessions')
    .select('tense_register_score')
    .eq('pupil_id', pupilId)
    .order('created_at', { ascending: false })
    .limit(READINESS_COHERENCE_SESSIONS)

  if (!sessions || sessions.length < READINESS_COHERENCE_SESSIONS) {
    // Not enough sessions yet to evaluate coherence
    return { met: false, sessionsPassing: 0, sessionsChecked: sessions?.length ?? 0 }
  }

  const sessionsPassing = sessions.filter(
    (s) => (s.tense_register_score ?? 0) >= READINESS_COHERENCE_MIN_SCORE
  ).length

  const met = sessionsPassing === READINESS_COHERENCE_SESSIONS

  return { met, sessionsPassing, sessionsChecked: sessions.length }
}

// ─── Public: check readiness ──────────────────────────────────────────────────

/**
 * Checks all three §5.2 criteria for a pupil.
 * Pure read — no DB writes.
 */
export async function checkWritingStudioReadiness(
  pupilId: string
): Promise<ReadinessResult> {
  const [breadth, depth, coherence] = await Promise.all([
    checkBreadth(pupilId),
    checkDepth(pupilId),
    checkCoherence(pupilId),
  ])

  const ready = breadth.met && depth.met && coherence.met

  return {
    ready,
    breadthMet: breadth.met,
    depthMet: depth.met,
    coherenceMet: coherence.met,
    evidence: {
      breadthLevelsMastered: breadth.levelsMastered,
      breadthPhases: breadth.phases,
      depthQualifyingSessions: depth.qualifyingSessions,
      depthGenres: depth.genres,
      coherenceSessionsChecked: coherence.sessionsChecked,
      coherenceSessionsPassing: coherence.sessionsPassing,
    },
  }
}

// ─── Public: trigger suggestion ───────────────────────────────────────────────

/**
 * Called once when readiness is confirmed. Writes:
 *  1. writing_studio_suggested_at on pupil_progress
 *  2. mastery_event of type WRITING_STUDIO_SUGGESTED
 *  3. teacher_notification of type WRITING_STUDIO_READY (action_required = true)
 *
 * Safe to call only when readiness.ready === true and suggested_at is currently null.
 * Non-critical writes (teacher notification) are wrapped so failures don't throw.
 */
export async function triggerWritingStudioSuggestion(
  pupilId: string,
  evidence: ReadinessEvidence
): Promise<void> {
  const now = new Date().toISOString()

  // 1. Stamp writing_studio_suggested_at on pupil_progress
  await supabase
    .from('formula_progress')
    .update({ writing_studio_suggested_at: now })
    .eq('pupil_id', pupilId)

  // 2. Mastery event — permanent audit trail
  await supabase.from('mastery_events').insert({
    pupil_id: pupilId,
    event_type: MasteryEventType.WRITING_STUDIO_SUGGESTED,
    triggered_by: 'system' as const,
    evidence: evidence as unknown as Record<string, unknown>,
  })

  // 3. Teacher notification — action required (teacher must confirm before WS unlocks)
  try {
    const { data: pupilProfile } = await supabase
      .from('profiles')
      .select('class_id, first_name')
      .eq('id', pupilId)
      .single()

    if (pupilProfile?.class_id) {
      const { data: classRow } = await supabase
        .from('classes')
        .select('teacher_id')
        .eq('id', pupilProfile.class_id)
        .single()

      if (classRow?.teacher_id) {
        await supabase.from('teacher_notifications').insert({
          teacher_id: classRow.teacher_id,
          pupil_id: pupilId,
          notification_type: TeacherNotificationType.WRITING_STUDIO_READY,
          title: `${pupilProfile.first_name} is ready for Writing Studio`,
          body: [
            `${pupilProfile.first_name} has met all three readiness criteria:`,
            `• Breadth: mastered ${evidence.breadthLevelsMastered} levels across ${evidence.breadthPhases.join(', ')} phases`,
            `• Depth: ${evidence.depthQualifyingSessions} quality paragraph sessions across ${evidence.depthGenres.length} genres`,
            `• Coherence: consistent tense/register in last 3 sessions`,
            `Please review and confirm to unlock Writing Studio for ${pupilProfile.first_name}.`,
          ].join('\n'),
          data: {
            evidence,
            breadth_phases: evidence.breadthPhases,
            depth_genres: evidence.depthGenres,
          },
          action_required: true,
        })
      }
    }
  } catch {
    // Teacher notification failure is non-critical — swallow silently
  }
}
