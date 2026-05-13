/**
 * S5-7: Public share page — /share/:token
 * No login required. Fetches a portfolio entry via share_token using the
 * get_portfolio_by_share_token RPC (SECURITY DEFINER — anon cannot enumerate).
 * Renders a clean read-only card suitable for screenshots / sharing.
 */

import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

interface SharedEntry {
  id: string
  app: string
  level_or_lesson: string
  content: string
  ai_score: number | null
  updated_at: string
}

function scoreColour(score: number | null): string {
  if (score === null) return '#888'
  if (score >= 80) return '#16A34A'
  if (score >= 60) return '#CA8A04'
  return '#DC2626'
}

function scoreLabel(score: number | null): string {
  if (score === null) return ''
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  return 'Keep practising'
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>()

  const { data, isLoading, isError } = useQuery<SharedEntry | null>({
    queryKey: ['share_portfolio', token],
    queryFn: async () => {
      if (!token) return null
      const { data, error } = await supabase.rpc('get_portfolio_by_share_token', {
        p_token: token,
      })
      if (error) throw error
      if (!data || (Array.isArray(data) && data.length === 0)) return null
      const row = Array.isArray(data) ? data[0] : data
      return row as unknown as SharedEntry
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 10,
    retry: false,
  })

  const appLabel = data?.app === 'pwp' ? 'Formula Practice' : 'Interactive Practice'
  const levelLabel =
    data?.app === 'pwp'
      ? `Level ${data.level_or_lesson}`
      : `Lesson ${data?.level_or_lesson}`

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: 'var(--color-background)' }}
      data-testid="share-page"
    >
      {/* WriFe branding */}
      <div className="mb-8 text-center">
        <Link
          to="/"
          className="text-2xl font-bold"
          style={{ color: 'var(--color-brand-primary)', textDecoration: 'none' }}
          data-tts="WriFe — home"
        >
          WriFe ✏️
        </Link>
        <p
          className="text-sm mt-1"
          style={{ color: 'var(--color-text-muted)' }}
          data-tts="Shared sentence"
        >
          Shared Writing
        </p>
      </div>

      <div className="w-full max-w-lg">
        {isLoading && (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Loading…
            </p>
          </div>
        )}

        {!isLoading && (isError || !data) && (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            data-testid="share-not-found"
          >
            <p className="text-4xl mb-4" aria-hidden="true">🔍</p>
            <p
              className="font-semibold text-base mb-2"
              style={{ color: 'var(--color-text)' }}
              data-tts="Link not found"
            >
              Link not found
            </p>
            <p
              className="text-sm"
              style={{ color: 'var(--color-text-muted)' }}
              data-tts="This shared sentence link may have expired or is invalid"
            >
              This share link may have expired or is incorrect.
            </p>
          </div>
        )}

        {!isLoading && data && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '2px solid var(--color-brand-primary)',
              boxShadow: '0 8px 32px rgba(108,92,231,0.12)',
            }}
            data-testid="share-card"
          >
            {/* Coloured header strip */}
            <div
              className="px-6 py-4"
              style={{
                background: 'linear-gradient(135deg, #7C6FF7 0%, var(--color-brand-primary) 100%)',
              }}
            >
              <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {appLabel} · {levelLabel}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {new Date(data.updated_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>

            {/* Sentence body */}
            <div className="px-6 py-6">
              <p
                className="text-xl leading-relaxed font-medium"
                style={{ color: 'var(--color-text)', lineHeight: 1.7 }}
                data-tts={data.content}
                data-testid="share-content"
              >
                {data.content}
              </p>
            </div>

            {/* Score footer */}
            {data.ai_score !== null && (
              <div
                className="px-6 pb-5 flex items-center gap-3"
                data-testid="share-score"
              >
                <span
                  className="text-2xl font-black tabular-nums"
                  style={{ color: scoreColour(data.ai_score) }}
                  aria-label={`Score: ${data.ai_score}%`}
                >
                  {data.ai_score}%
                </span>
                <span
                  className="text-sm font-medium"
                  style={{ color: scoreColour(data.ai_score) }}
                >
                  {scoreLabel(data.ai_score)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Soft CTA */}
        {!isLoading && data && (
          <p
            className="text-center text-xs mt-6"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Created with{' '}
            <Link
              to="/"
              style={{ color: 'var(--color-brand-primary)', fontWeight: 600 }}
            >
              WriFe
            </Link>{' '}
            — helping every pupil write with confidence.
          </p>
        )}
      </div>
    </div>
  )
}
