/**
 * Connect Grid Page — /connect-grid
 *
 * Receives the anchor sentence from DailyPracticePage via navigation state,
 * loads any teacher-configured grid templates, presents the ConnectGrid component,
 * then saves the session to grid_sessions and navigates to ParagraphPage.
 *
 * Navigation state expected: { anchorSentence: string; classId: string | null }
 * Navigation state forwarded to ParagraphPage: { gridSession: GridSessionState }
 */

import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ConnectGrid } from '../components/chain/ConnectGrid'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { GridSessionState, GridSessionSave, GridTemplate } from '../types/index'
import { Genre } from '../types/index'

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ConnectGridPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()

  const pupilId = user?.id ?? null

  // Anchor sentence + classId passed from DailyPracticePage
  const locationState = location.state as {
    anchorSentence?: string
    classId?: string | null
  } | null

  const anchorSentence = locationState?.anchorSentence ?? ''
  const classId = locationState?.classId ?? null

  const [saving, setSaving] = useState(false)

  // ── Fetch class settings (w_level, active_genre) ─────────────────────────
  const { data: classData } = useQuery({
    queryKey: ['class_settings', classId],
    queryFn: async () => {
      if (!classId) return null
      const { data, error } = await supabase
        .from('classes')
        .select('w_level, active_genre')
        .eq('id', classId)
        .single()
      if (error) throw error
      return data as { w_level: number; active_genre: string }
    },
    enabled: !!classId,
  })

  const wLevel = (classData?.w_level ?? 2) as 1 | 2 | 3 | 4 | 5 | 6
  const activeGenre = (classData?.active_genre as Genre | undefined) ?? null

  // ── Fetch teacher grid template (if any) ──────────────────────────────────
  const { data: template } = useQuery({
    queryKey: ['grid_template', classId, activeGenre, wLevel],
    queryFn: async () => {
      if (!activeGenre) return null
      // Try class-specific template first, then global fallback
      const { data } = await supabase
        .from('grid_templates')
        .select('*')
        .eq('genre', activeGenre)
        .eq('w_level', wLevel)
        .or(classId ? `class_id.eq.${classId},class_id.is.null` : 'class_id.is.null')
        .order('class_id', { ascending: false, nullsFirst: false }) // class-specific wins
        .limit(1)
        .maybeSingle()
      return data as GridTemplate | null
    },
    enabled: !!activeGenre,
  })

  // ── Save handler ──────────────────────────────────────────────────────────
  const handleComplete = async (session: GridSessionState) => {
    if (!pupilId) {
      // Navigate to paragraph even if we can't save — don't strand the pupil
      navigate('/paragraph', { state: { gridSession: session } })
      return
    }

    setSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const payload: GridSessionSave = {
        pupil_id: pupilId,
        class_id: classId,
        session_date: today,
        anchor_sentence: anchorSentence,
        genre: session.genre,
        w_level: session.wLevel,
        rows: session.rows,
        xp_earned: 10,
      }

      const { error } = await supabase.from('grid_sessions').insert(payload)
      if (error) {
        console.warn('ConnectGridPage: grid_sessions insert failed (non-fatal):', error)
      }
    } catch (err) {
      console.warn('ConnectGridPage: unexpected save error (non-fatal):', err)
    } finally {
      setSaving(false)
      navigate('/paragraph', { state: { gridSession: session } })
    }
  }

  // ── Guard: no anchor sentence means someone navigated directly ────────────
  if (!anchorSentence) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="text-center p-8">
          <p className="text-base font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
            No anchor sentence found.
          </p>
          <button
            onClick={() => navigate('/daily-practice')}
            className="px-5 py-2 rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--color-brand-primary)' }}
          >
            ← Go to Daily Practice
          </button>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Nav bar */}
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 30,
          background: 'linear-gradient(135deg, #7C6FF7 0%, var(--color-brand-primary) 100%)',
          boxShadow: '0 2px 12px rgba(108,92,231,0.35)',
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(255,255,255,0.18)',
            border: '1.5px solid rgba(255,255,255,0.35)',
            borderRadius: '8px', color: '#fff', fontSize: '14px',
            fontWeight: 600, padding: '6px 12px', cursor: 'pointer',
            minHeight: '36px', flexShrink: 0,
          }}
          data-tts="Back"
        >
          ←
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            PWP Studio
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
            Connect Grid 🗂️
          </div>
        </div>
        <div style={{ width: 60 }} aria-hidden="true" />
      </div>

      {/* Anchor sentence reminder */}
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-2">
        <div
          className="rounded-xl px-4 py-3 mb-5 flex items-start gap-3"
          style={{ backgroundColor: '#EDE7F6', border: '1.5px solid #C4B5FD' }}
          data-tts="Your anchor sentence"
        >
          <span style={{ fontSize: 18 }} aria-hidden="true">⚓</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#6D28D9' }}>
              Your anchor sentence
            </p>
            <p className="text-sm font-medium" style={{ color: '#4C1D95' }}>
              "{anchorSentence}"
            </p>
          </div>
        </div>

        {saving ? (
          <div className="flex items-center justify-center py-12">
            <p style={{ color: 'var(--color-text-muted)' }}>Saving your plan…</p>
          </div>
        ) : (
          <ConnectGrid
            anchorSentence={anchorSentence}
            wLevel={wLevel}
            initialGenre={activeGenre}
            templateCol2={template?.col2_defaults ?? []}
            templateCol3={template?.col3_hints ?? []}
            onComplete={handleComplete}
          />
        )}
      </div>
    </div>
  )
}
