/**
 * WF-024: Parent Read-Only View
 * Shows linked pupils' progress: formula level, streak, XP, last 3 badges, last writing piece.
 * Read-only — no mutations available.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { PupilProgress } from '../types/index'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LinkedPupil {
  id: string
  first_name: string
  year_group: number | null
  progress: PupilProgress | null
  recentBadges: BadgeSummary[]
  lastWriting: WritingSummary | null
}

interface BadgeSummary {
  badge_id: string
  name: string
  icon_key: string
  awarded_at: string
}

interface WritingSummary {
  id: string
  title: string | null
  genre: string
  overall_band: number | null
  submitted_at: string | null
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PupilCard({ pupil }: { pupil: LinkedPupil }) {
  const { progress, recentBadges, lastWriting } = pupil

  const bandLabels = ['Pre-emergent', 'Working Towards', 'Expected Standard', 'Greater Depth']
  const bandColours = ['#6B7280', '#B45309', '#166534', '#6D28D9']

  return (
    <div
      className="rounded-2xl p-5 space-y-5"
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      data-testid={`pupil-card-${pupil.id}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-base" style={{ color: 'var(--color-text)' }} data-tts={pupil.first_name}>
            {pupil.first_name}
          </p>
          {pupil.year_group && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Year {pupil.year_group}
            </p>
          )}
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: '#F0FDF4', color: '#166534' }}
        >
          Linked
        </span>
      </div>

      {/* Progress stats */}
      {progress ? (
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xl font-bold" style={{ color: 'var(--color-brand-primary)' }}>
              L{progress.current_formula_level}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Formula Level</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold" style={{ color: '#F39C12' }}>
              {progress.current_streak}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Day Streak</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold" style={{ color: '#27AE60' }}>
              {progress.total_xp.toLocaleString()}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Total XP</p>
          </div>
        </div>
      ) : (
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          No progress data yet — they haven't started a session.
        </p>
      )}

      {/* Recent badges */}
      {recentBadges.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>
            Recent Badges
          </p>
          <div className="flex flex-wrap gap-2">
            {recentBadges.map((b) => (
              <span
                key={b.badge_id}
                className="text-xs px-2 py-1 rounded-full font-medium"
                style={{ backgroundColor: '#F5F3FF', color: '#6D28D9' }}
                data-tts={b.name}
                title={new Date(b.awarded_at).toLocaleDateString('en-GB')}
              >
                {b.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Last writing piece */}
      {lastWriting && (
        <div
          className="rounded-xl p-3"
          style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>
            Last Writing Piece
          </p>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            {lastWriting.title ?? `${lastWriting.genre} piece`}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-xs px-2 py-0.5 rounded-full capitalize"
              style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}
            >
              {lastWriting.genre.replace('_', '-')}
            </span>
            {lastWriting.overall_band != null && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: bandColours[lastWriting.overall_band] + '18',
                  color: bandColours[lastWriting.overall_band],
                }}
                data-tts={bandLabels[lastWriting.overall_band]}
              >
                {bandLabels[lastWriting.overall_band]}
              </span>
            )}
            {lastWriting.submitted_at && (
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {new Date(lastWriting.submitted_at).toLocaleDateString('en-GB')}
              </span>
            )}
          </div>
        </div>
      )}

      {progress?.writing_studio_unlocked && (
        <p className="text-xs" style={{ color: '#166534' }}>
          Writing Studio unlocked
        </p>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ParentPage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [pupils, setPupils] = useState<LinkedPupil[]>([])
  const [loading, setLoading] = useState(true)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    if (!profile) return

    async function loadLinkedPupils() {
      // Fetch approved parent-pupil links
      const { data: links } = await supabase
        .from('parent_pupil')
        .select('pupil_id')
        .eq('parent_id', profile!.id)
        .eq('approved', true)

      if (!links || links.length === 0) {
        setLoading(false)
        return
      }

      const pupilIds = links.map((l) => l.pupil_id)

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, year_group')
        .in('id', pupilIds)

      if (!profiles) { setLoading(false); return }

      // Fetch all pupil data in parallel
      const enriched = await Promise.all(
        profiles.map(async (p) => {
          const [progressRes, badgesRes, writingRes] = await Promise.all([
            supabase.from('pupil_progress').select('*').eq('pupil_id', p.id).single(),
            supabase
              .from('pupil_badges')
              .select('badge_id, awarded_at, badges(name, icon_key)')
              .eq('pupil_id', p.id)
              .order('awarded_at', { ascending: false })
              .limit(3),
            supabase
              .from('writing_pieces')
              .select('id, genre, task_prompt_text, submitted_at, ai_assessments(overall_band)')
              .eq('pupil_id', p.id)
              .not('submitted_at', 'is', null)
              .order('submitted_at', { ascending: false })
              .limit(1),
          ])

          const recentBadges: BadgeSummary[] = (badgesRes.data ?? []).map((b: Record<string, unknown>) => ({
            badge_id: b.badge_id as string,
            name: (b.badges as { name: string; icon_key: string } | null)?.name ?? 'Badge',
            icon_key: (b.badges as { name: string; icon_key: string } | null)?.icon_key ?? '',
            awarded_at: b.awarded_at as string,
          }))

          const lastWP = writingRes.data?.[0] as Record<string, unknown> | undefined
          const lastWriting: WritingSummary | null = lastWP
            ? {
                id: lastWP.id as string,
                title: (lastWP.task_prompt_text as string)?.slice(0, 60) ?? null,
                genre: lastWP.genre as string,
                overall_band:
                  (lastWP.ai_assessments as { overall_band: number | null }[] | null)?.[0]?.overall_band ?? null,
                submitted_at: lastWP.submitted_at as string | null,
              }
            : null

          return {
            id: p.id,
            first_name: p.first_name,
            year_group: p.year_group,
            progress: (progressRes.data as PupilProgress) ?? null,
            recentBadges,
            lastWriting,
          } satisfies LinkedPupil
        })
      )

      setPupils(enriched)
      setLoading(false)
    }

    loadLinkedPupils()
  }, [profile])

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--color-background)' }}
      data-testid="parent-page"
    >
      {/* Header */}
      <header
        className="px-4 py-3 flex items-center justify-between sticky top-0 z-10"
        style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
      >
        <span className="font-bold text-base" style={{ color: 'var(--color-text)' }} data-tts="WriFe Parent View">
          WriFe — Parent View
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {profile?.first_name}
          </span>
          <button
            onClick={handleSignOut}
            className="text-sm px-3 py-1.5 rounded-lg"
            style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
            data-testid="sign-out-button"
            data-tts="Sign out"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-5">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }} data-tts="Your children's progress">
          Your Children's Progress
        </h1>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
          </div>
        ) : pupils.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            data-testid="no-pupils-message"
          >
            <p className="text-base font-medium mb-2" style={{ color: 'var(--color-text)' }}>
              No linked children found
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Ask your child's teacher to link your account to your child in the WriFe system.
            </p>
          </div>
        ) : (
          pupils.map((p) => <PupilCard key={p.id} pupil={p} />)
        )}
      </main>
    </div>
  )
}
