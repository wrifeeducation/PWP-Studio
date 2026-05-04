/**
 * WF-016 — Writing Studio Page
 * Route: /studio — pupils only; requires writing_studio_unlocked = true.
 * Includes: genre selector, task prompt, planning scaffold toggle, tiptap editor,
 * word count target, save draft, and submit for assessment.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { WrifeEditor } from '../components/writing-studio/WrifeEditor'
import { PlanningScaffold } from '../components/writing-studio/PlanningScaffold'
import type { PlanData } from '../components/writing-studio/PlanningScaffold'
import { AssessmentReport } from '../components/writing-studio/AssessmentReport'
import { TTSButton } from '../components/ui/TTSButton'
import { assessWriting } from '../lib/assessWriting'
import type { AssessWritingOutput } from '../lib/assessWriting'
import { calcWritingXP } from '../lib/xpEngine'
import { Genre, WritingDimension } from '../types/index'
import { sanitizeText } from '../lib/sanitize'
import { SessionExpiryBanner } from '../components/ui/SessionExpiryBanner'
// WF-050: Writing Studio is now open to all tiers — stars model gates free users via mistake cost
import writingTasks from '../../content/writing-tasks.json'

// ─── Local task type (from JSON) ──────────────────────────────────────────────

interface LocalWritingTask {
  id: string
  genre: string
  year_group_min: number
  year_group_max: number
  title: string
  prompt_text: string
  word_count_min: number
  word_count_max: number
  success_criteria: string[]
  planning_scaffold_type: string | null
}

const GENRE_LABELS: Record<Genre, string> = {
  [Genre.NARRATIVE]: 'Narrative',
  [Genre.NON_FICTION]: 'Non-fiction',
  [Genre.PERSUASIVE]: 'Persuasive',
  [Genre.POETRY]: 'Poetry',
}

// ─── Helper: pick random task for genre + year group ─────────────────────────

function pickTask(genre: Genre, yearGroup: number): LocalWritingTask | null {
  const candidates = (writingTasks as LocalWritingTask[]).filter(
    (t) =>
      t.genre === genre &&
      yearGroup >= t.year_group_min &&
      yearGroup <= t.year_group_max
  )
  if (candidates.length === 0) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function WritingStudioPage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  // WF-050: No tier gate here — all pupils can access Writing Studio

  // Guard: check studio unlocked
  const [studioChecked, setStudioChecked] = useState(false)
  const [unlocked, setUnlocked] = useState(false)

  // Genre & task
  const [genre, setGenre] = useState<Genre>(Genre.NARRATIVE)
  const [task, setTask] = useState<LocalWritingTask | null>(null)
  const [planOpen, setPlanOpen] = useState(false)
  const [planData, setPlanData] = useState<PlanData>({})

  // Editor state
  const [_html, setHtml] = useState('')
  const [plainText, setPlainText] = useState('')
  const [wordCount, setWordCount] = useState(0)

  // Saving / assessment state
  const [pieceId, setPieceId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [assessing, setAssessing] = useState(false)
  const [assessment, setAssessment] = useState<AssessWritingOutput | null>(null)
  const [flashMessage, setFlashMessage] = useState<string | null>(null)

  // Check writing_studio_unlocked on mount
  useEffect(() => {
    if (!profile) return
    supabase
      .from('formula_progress')
      .select('writing_studio_unlocked')
      .eq('pupil_id', profile.id)
      .single()
      .then(({ data }) => {
        if (data?.writing_studio_unlocked) {
          setUnlocked(true)
        } else {
          navigate('/dashboard', { replace: true, state: { flash: 'Complete more Formula Practice to unlock Writing Studio.' } })
        }
        setStudioChecked(true)
      })
  }, [profile, navigate])

  // Load initial task
  useEffect(() => {
    if (!profile?.year_group) return
    setTask(pickTask(genre, profile.year_group))
  }, [genre, profile?.year_group])

  // Check for teacher-assigned task on load
  useEffect(() => {
    if (!profile) return
    supabase
      .from('teacher_task_assignments')
      .select('*, writing_tasks(*)')
      .eq('pupil_id', profile.id)
      .order('assigned_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data?.writing_tasks) {
          const assignedTask = data.writing_tasks as unknown as LocalWritingTask
          setTask(assignedTask)
          if (assignedTask.genre) setGenre(assignedTask.genre as Genre)
        }
      })
  }, [profile])

  const handleEditorChange = useCallback(
    (newHtml: string, newPlain: string, wc: number) => {
      setHtml(newHtml)
      setPlainText(newPlain)
      setWordCount(wc)
    },
    []
  )

  const handleNewPrompt = () => {
    if (!profile?.year_group) return
    setTask(pickTask(genre, profile.year_group))
    setPlanData({})
  }

  const handleGenreChange = (g: Genre) => {
    setGenre(g)
    setPlanData({})
  }

  // Save draft
  const handleSaveDraft = async () => {
    if (!profile || !task) return
    setSaving(true)
    try {
      if (pieceId) {
        await supabase
          .from('writing_pieces')
          .update({
            full_text: sanitizeText(plainText),
            word_count: wordCount,
            plan_data: planData,
            status: 'draft',
          })
          .eq('id', pieceId)
      } else {
        const { data } = await supabase
          .from('writing_pieces')
          .insert({
            pupil_id: profile.id,
            genre,
            task_prompt_text: task.prompt_text,
            full_text: sanitizeText(plainText),
            word_count: wordCount,
            plan_data: planData,
            status: 'draft',
          })
          .select('id')
          .single()
        if (data) setPieceId(data.id)
      }
      setFlashMessage('Draft saved!')
      setTimeout(() => setFlashMessage(null), 2500)
    } finally {
      setSaving(false)
    }
  }

  // Submit for assessment
  const handleSubmit = async () => {
    if (!profile || !task) return
    setAssessing(true)
    try {
      // Ensure we have a piece ID
      let currentPieceId = pieceId
      if (!currentPieceId) {
        const { data } = await supabase
          .from('writing_pieces')
          .insert({
            pupil_id: profile.id,
            genre,
            task_prompt_text: task.prompt_text,
            full_text: sanitizeText(plainText),
            word_count: wordCount,
            plan_data: planData,
            status: 'draft',
          })
          .select('id')
          .single()
        if (data) {
          currentPieceId = data.id
          setPieceId(data.id)
        }
      }
      if (!currentPieceId) throw new Error('Could not create writing piece')

      const result = await assessWriting({
        piece_id: currentPieceId,
        genre,
        year_group: profile.year_group ?? 4,
        task_prompt_text: task.prompt_text,
        full_text: sanitizeText(plainText),
        word_count: wordCount,
        plan_submitted: Object.keys(planData).some((k) => !!planData[k]),
      })

      setAssessment(result)

      // WF-018: Award XP
      const xp = calcWritingXP(result.overall_band)
      const { data: progressRow } = await supabase
        .from('formula_progress')
        .select('total_xp')
        .eq('pupil_id', profile.id)
        .single()
      if (progressRow) {
        await supabase
          .from('formula_progress')
          .update({ total_xp: progressRow.total_xp + xp })
          .eq('pupil_id', profile.id)
      }
    } catch (err) {
      setFlashMessage('Assessment failed. Please try again.')
      setTimeout(() => setFlashMessage(null), 3000)
      console.error(err)
    } finally {
      setAssessing(false)
    }
  }

  // Publish to teacher (WF-036: triggers notify-teacher Edge Function)
  const handlePublish = async () => {
    if (!pieceId || !profile) return
    await supabase
      .from('writing_pieces')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', pieceId)

    // Fetch teacher_id from teacher_task_assignments if available
    const { data: assignment } = await supabase
      .from('teacher_task_assignments')
      .select('teacher_id')
      .eq('pupil_id', profile.id)
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (assignment?.teacher_id) {
      await supabase.functions.invoke('notify-teacher', {
        body: {
          pieceId,
          pupilName: profile.first_name,
          teacherId: assignment.teacher_id,
          genre,
          wordCount,
        },
      })
    }
  }

  // Save self-review scores
  const handleSelfReview = async (scores: Record<WritingDimension, number>) => {
    if (!pieceId) return
    await supabase
      .from('writing_pieces')
      .update({ self_review_scores: scores })
      .eq('id', pieceId)
  }

  // Save pupil confidence
  const handlePupilConfidence = async (rating: number) => {
    if (!pieceId) return
    await supabase
      .from('writing_pieces')
      .update({ pupil_confidence: rating })
      .eq('id', pieceId)
  }

  if (!studioChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
      </div>
    )
  }

  if (!unlocked) return null

  const minWords = task?.word_count_min ?? 50
  const maxWords = task?.word_count_max ?? 700
  const canSubmit = wordCount >= minWords && !assessing
  const progress = Math.min((wordCount / minWords) * 100, 100)

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--color-background)' }}
      data-testid="writing-studio-page"
    >
      {/* WF-047: Session expiry warning */}
      <SessionExpiryBanner />

      {/* Header */}
      <header
        className="px-4 py-3 flex items-center justify-between sticky top-0 z-10"
        style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
      >
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="text-sm px-3 py-1.5 rounded-lg"
          style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
          data-testid="back-button"
        >
          ← Dashboard
        </button>

        <span
          className="font-bold text-base"
          style={{ color: 'var(--color-text)' }}
          data-tts="Writing Studio"
        >
          Writing Studio
        </span>

        <span
          className="text-xs px-2 py-1 rounded-full"
          style={{ backgroundColor: '#EFF6FF', color: 'var(--color-brand-primary)' }}
          data-tts={`Year ${profile?.year_group ?? ''}`}
        >
          Year {profile?.year_group ?? ''}
        </span>
      </header>

      {/* Flash message */}
      {flashMessage && (
        <div
          className="text-center py-2 text-sm font-medium"
          style={{ backgroundColor: '#F0FDF4', color: '#166534' }}
          role="status"
          aria-live="polite"
        >
          {flashMessage}
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row gap-0 max-w-6xl mx-auto w-full">

        {/* Left sidebar: genre + task */}
        <aside
          className="w-full lg:w-80 flex-shrink-0 p-4 space-y-4"
          style={{ borderRight: '1px solid var(--color-border)' }}
        >
          {/* Genre selector */}
          <section>
            <h2
              className="text-xs font-semibold uppercase tracking-wide mb-2"
              style={{ color: 'var(--color-text-muted)' }}
              data-tts="Select genre"
            >
              Genre
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(Genre).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => handleGenreChange(g)}
                  data-testid={`genre-${g}`}
                  className="py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: genre === g ? 'var(--color-brand-primary)' : 'var(--color-surface)',
                    color: genre === g ? '#fff' : 'var(--color-text)',
                    border: genre === g ? 'none' : '1px solid var(--color-border)',
                  }}
                >
                  {GENRE_LABELS[g]}
                </button>
              ))}
            </div>
          </section>

          {/* Task prompt */}
          {task && (
            <section
              className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              data-testid="task-prompt"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3
                  className="text-sm font-bold"
                  style={{ color: 'var(--color-text)' }}
                  data-tts={task.title}
                >
                  {task.title}
                </h3>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <TTSButton text={task.prompt_text} />
                  <button
                    type="button"
                    onClick={handleNewPrompt}
                    className="text-xs px-2 py-1 rounded whitespace-nowrap"
                    style={{ color: 'var(--color-brand-primary)', border: '1px solid var(--color-brand-primary)' }}
                    data-testid="new-prompt-button"
                    data-tts="New prompt"
                  >
                    New prompt
                  </button>
                </div>
              </div>

              <p
                className="text-sm"
                style={{ color: 'var(--color-text)', lineHeight: '1.55' }}
                data-tts={task.prompt_text}
              >
                {task.prompt_text}
              </p>

              {/* Word count target */}
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  <span data-tts={`Target: ${minWords} to ${maxWords} words`}>
                    Target: {minWords}–{maxWords} words
                  </span>
                  <span>{wordCount} written</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: progress >= 100 ? '#16A34A' : 'var(--color-brand-primary)',
                    }}
                  />
                </div>
              </div>

              {/* Success criteria */}
              {task.success_criteria.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {task.success_criteria.map((c, i) => (
                    <li
                      key={i}
                      className="text-xs flex items-start gap-1.5"
                      style={{ color: 'var(--color-text-muted)' }}
                      data-tts={c}
                    >
                      <span className="text-green-600 flex-shrink-0">✓</span>
                      {c}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Planning scaffold toggle */}
          <section>
            <button
              type="button"
              onClick={() => setPlanOpen((o) => !o)}
              className="w-full py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-between"
              style={{
                backgroundColor: planOpen ? '#EFF6FF' : 'var(--color-surface)',
                color: 'var(--color-brand-primary)',
                border: '1px solid var(--color-brand-primary)',
              }}
              data-testid="planning-toggle"
              data-tts={planOpen ? 'Hide planning scaffold' : 'Show planning scaffold'}
            >
              <span>Planning Scaffold</span>
              <span>{planOpen ? '▲' : '▼'}</span>
            </button>

            {planOpen && (
              <div className="mt-3">
                <PlanningScaffold
                  genre={genre}
                  planData={planData}
                  onChange={setPlanData}
                />
              </div>
            )}
          </section>
        </aside>

        {/* Main editor area */}
        <main className="flex-1 p-4 space-y-4">
          {!assessment ? (
            <>
              <WrifeEditor
                onChange={handleEditorChange}
                minWords={minWords}
              />

              {/* Action buttons */}
              <div className="flex gap-3 justify-end flex-wrap">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saving || wordCount === 0}
                  data-testid="save-draft-button"
                  data-tts="Save draft"
                  className="px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity"
                  style={{
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                    opacity: saving || wordCount === 0 ? 0.5 : 1,
                    cursor: saving || wordCount === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Saving…' : 'Save Draft'}
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  data-testid="submit-assessment-button"
                  data-tts="Submit for assessment"
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity"
                  style={{
                    backgroundColor: 'var(--color-brand-primary)',
                    opacity: canSubmit ? 1 : 0.45,
                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                  }}
                >
                  {assessing ? 'Assessing…' : 'Submit for Assessment'}
                </button>
              </div>
            </>
          ) : (
            /* Assessment result view */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2
                  className="text-xl font-bold"
                  style={{ color: 'var(--color-text)' }}
                  data-tts="Your assessment results"
                >
                  Your Assessment Results
                </h2>
                <button
                  type="button"
                  onClick={() => setAssessment(null)}
                  className="text-sm px-3 py-1.5 rounded-lg"
                  style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                  data-testid="back-to-editor"
                >
                  ← Edit again
                </button>
              </div>
              <AssessmentReport
                assessment={assessment}
                pieceId={pieceId ?? ''}
                onPublish={handlePublish}
                onSelfReview={handleSelfReview}
                onPupilConfidence={handlePupilConfidence}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
