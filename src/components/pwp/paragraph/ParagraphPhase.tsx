/**
 * ParagraphPhase — Lead / Support / Close paragraph builder.
 * Lead is pre-filled from the final formula sentence.
 * Support is free writing (2-3 sentences, no AI assessment).
 * Close is AI-assessed for technical complexity.
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { assessParagraphClose } from '../../../lib/pwp/pwpApi'
import { usePWPSessionStore } from '../../../stores/pwpSessionStore'

interface ParagraphPhaseProps {
  onComplete: () => void
  genreHint?: string
}

type ParaSubPhase = 'lead' | 'support' | 'close' | 'done'

export const ParagraphPhase: React.FC<ParagraphPhaseProps> = ({ onComplete, genreHint }) => {
  const { paragraph, updateParagraph, highestLesson } = usePWPSessionStore()

  const [subPhase, setSubPhase] = useState<ParaSubPhase>('lead')
  const [supportText, setSupportText] = useState('')
  const [closeText, setCloseText] = useState('')
  const [assessing, setAssessing] = useState(false)

  const scaffoldMode = highestLesson < 26

  if (!paragraph) return null

  const supportSentences = supportText
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  const handleSupportConfirm = () => {
    if (supportSentences.length < 1) return
    updateParagraph({ supportSentences })
    setSubPhase('close')
  }

  const handleCloseSubmit = async () => {
    if (closeText.trim().length < 5) return
    setAssessing(true)
    try {
      const result = await assessParagraphClose({
        leadSentence: paragraph.leadSentence,
        supportSentences,
        closeSentence: closeText.trim(),
        scaffoldMode,
        genreHint,
      })
      updateParagraph({
        closeSentence: closeText.trim(),
        closeAssessment: {
          passed: result.passed,
          feedback: result.feedback,
          suggestedRevision: result.suggestedRevision,
        },
        closeAttempts: paragraph.closeAttempts + 1,
      })
      if (result.passed) {
        setSubPhase('done')
      }
    } catch {
      // Soft-pass on error — don't strand the pupil
      updateParagraph({
        closeSentence: closeText.trim(),
        closeAssessment: { passed: true, feedback: 'Great closing sentence!', suggestedRevision: null },
      })
      setSubPhase('done')
    } finally {
      setAssessing(false)
    }
  }

  const cardStyle = {
    backgroundColor: 'var(--color-background)',
    border: '1.5px solid var(--color-border)',
    borderRadius: '16px',
    padding: '16px 20px',
    marginBottom: '12px',
  }

  return (
    <div className="w-full" data-testid="paragraph-phase">

      {/* Header */}
      <div className="mb-5 text-center">
        <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--color-brand-primary)' }}>
          Paragraph Builder
        </div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }} data-tts="Write your paragraph">
          Build your paragraph
        </h2>
        {scaffoldMode && (
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Great work — let's turn your sentence into a paragraph!
          </p>
        )}
      </div>

      {/* Lead — always shown */}
      <div style={cardStyle}>
        <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--color-brand-primary)' }}>
          Lead (Topic sentence)
        </div>
        <p className="text-base font-medium italic" style={{ color: 'var(--color-text)' }}
          data-tts={`Your topic sentence: ${paragraph.leadSentence}`}>
          "{paragraph.leadSentence}"
        </p>
      </div>

      {/* Phase: Lead confirm */}
      {subPhase === 'lead' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm mb-4 text-center" style={{ color: 'var(--color-text-muted)' }}
            data-tts="This is your topic sentence — now write 2 or 3 sentences to develop the idea">
            This is your topic sentence. Now write 2–3 sentences to develop the idea.
          </p>
          <button
            type="button"
            onClick={() => setSubPhase('support')}
            data-testid="confirm-lead-btn"
            data-tts="Use this as my topic sentence"
            className="w-full py-3 rounded-full font-bold text-base"
            style={{ backgroundColor: 'var(--color-brand-primary)', color: '#fff' }}
          >
            Use this as my topic sentence →
          </button>
        </motion.div>
      )}

      {/* Phase: Support */}
      {subPhase === 'support' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-2">
            <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
              Support (2–3 sentences)
            </label>
            {scaffoldMode && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Add some detail. What happened? Why? What did it look, sound, or feel like?
              </p>
            )}
          </div>
          <textarea
            value={supportText}
            onChange={(e) => setSupportText(e.target.value)}
            placeholder={scaffoldMode ? 'It was… / This happened because… / I noticed…' : 'Develop your idea with 2 or 3 sentences…'}
            rows={4}
            maxLength={500}
            data-testid="support-input"
            data-tts="Write your supporting sentences here"
            className="w-full px-4 py-3 rounded-2xl text-base resize-none outline-none"
            style={{
              border: '2px solid var(--color-brand-primary)',
              color: 'var(--color-text)',
              backgroundColor: 'var(--color-background)',
            }}
            onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(108,92,231,0.2)' }}
            onBlur={(e) => { e.currentTarget.style.boxShadow = 'none' }}
          />
          <div className="mt-1 text-xs text-right" style={{ color: 'var(--color-text-muted)' }}>
            {supportSentences.length} sentence{supportSentences.length !== 1 ? 's' : ''}
          </div>
          <button
            type="button"
            onClick={handleSupportConfirm}
            disabled={supportSentences.length < 1}
            data-testid="confirm-support-btn"
            data-tts="Continue to closing sentence"
            className="mt-3 w-full py-3 rounded-full font-bold text-base disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-brand-primary)', color: '#fff' }}
          >
            Continue →
          </button>
        </motion.div>
      )}

      {/* Phase: Close */}
      {(subPhase === 'close' || subPhase === 'done') && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {/* Show support preview */}
          <div style={{ ...cardStyle, opacity: 0.75 }}>
            <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Support</div>
            <p className="text-sm italic" style={{ color: 'var(--color-text)' }}>{supportText}</p>
          </div>

          {subPhase === 'close' && (
            <>
              <div className="mb-2">
                <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                  Close (Concluding sentence)
                </label>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  Make this your most technically complex sentence — try adding a clause, fronted adverbial, or extra phrase.
                </p>
              </div>
              <textarea
                value={closeText}
                onChange={(e) => setCloseText(e.target.value)}
                placeholder={scaffoldMode ? 'Although… / Despite this… / As a result, …' : 'Write your most complex sentence to close the paragraph…'}
                rows={3}
                maxLength={300}
                data-testid="close-input"
                data-tts="Write your closing sentence here"
                className="w-full px-4 py-3 rounded-2xl text-base resize-none outline-none"
                style={{
                  border: `2px solid ${paragraph.closeAssessment && !paragraph.closeAssessment.passed ? 'var(--color-error)' : 'var(--color-brand-primary)'}`,
                  color: 'var(--color-text)',
                  backgroundColor: 'var(--color-background)',
                }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(108,92,231,0.2)' }}
                onBlur={(e) => { e.currentTarget.style.boxShadow = 'none' }}
              />

              {paragraph.closeAssessment && !paragraph.closeAssessment.passed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 px-4 py-3 rounded-2xl text-sm"
                  style={{ backgroundColor: 'rgba(231,76,60,0.06)', border: '1.5px solid rgba(231,76,60,0.25)' }}
                  data-tts={paragraph.closeAssessment.feedback}
                >
                  <div className="font-semibold mb-1" style={{ color: '#c0392b' }}>Almost there…</div>
                  <div style={{ color: 'var(--color-text)' }}>{paragraph.closeAssessment.feedback}</div>
                  {paragraph.closeAssessment.suggestedRevision && (
                    <div className="mt-2 italic text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      Try: "{paragraph.closeAssessment.suggestedRevision}"
                    </div>
                  )}
                </motion.div>
              )}

              <button
                type="button"
                onClick={handleCloseSubmit}
                disabled={closeText.trim().length < 5 || assessing}
                data-testid="submit-close-btn"
                data-tts={assessing ? 'Checking your closing sentence' : 'Check my closing sentence'}
                className="mt-3 w-full py-3 rounded-full font-bold text-base disabled:opacity-40"
                style={{ backgroundColor: 'var(--color-brand-primary)', color: '#fff' }}
              >
                {assessing ? 'Checking…' : paragraph.closeAttempts > 0 ? 'Try again →' : 'Check my closing sentence →'}
              </button>
            </>
          )}

          {subPhase === 'done' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div style={{ ...cardStyle, borderColor: 'rgba(39,174,96,0.35)', backgroundColor: 'rgba(39,174,96,0.06)' }}>
                <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#27ae60' }}>Close ✓</div>
                <p className="text-sm italic" style={{ color: 'var(--color-text)' }}>"{paragraph.closeSentence}"</p>
                {paragraph.closeAssessment?.feedback && (
                  <p className="text-xs mt-2" style={{ color: '#27ae60' }}>{paragraph.closeAssessment.feedback}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onComplete}
                data-testid="paragraph-complete-btn"
                data-tts="Continue to the quiz"
                className="w-full py-3 rounded-full font-bold text-base"
                style={{ backgroundColor: 'var(--color-brand-secondary)', color: '#fff' }}
              >
                Continue to quick quiz →
              </button>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  )
}
