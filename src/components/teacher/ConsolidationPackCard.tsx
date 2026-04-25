/**
 * WF-032: ConsolidationPackCard — shown in Interventions tab when consolidation is required.
 * Shows pupil name, level, focus word class, practice sentences and tips.
 * "Print Pack" opens browser print dialog, "Mark Sent" updates the intervention log.
 */

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { ConsolidationPackData } from '../../lib/consolidationPack'

interface ConsolidationPackCardProps {
  interventionId: string
  pupilName: string
  pack: ConsolidationPackData
  onMarkedSent: () => void
}

const WORD_CLASS_COLOURS: Record<string, string> = {
  determiner: 'var(--color-determiner)',
  adjective: 'var(--color-adjective)',
  noun: 'var(--color-noun)',
  verb: 'var(--color-verb)',
  adverb: 'var(--color-adverb)',
  preposition: 'var(--color-preposition)',
  pronoun: 'var(--color-pronoun)',
  conjunction: 'var(--color-conjunction)',
}

export const ConsolidationPackCard: React.FC<ConsolidationPackCardProps> = ({
  interventionId,
  pupilName,
  pack,
  onMarkedSent,
}) => {
  const [marking, setMarking] = useState(false)
  const [sent, setSent] = useState(false)

  const wordClassColour = WORD_CLASS_COLOURS[pack.focusWordClass] ?? 'var(--color-brand-primary)'

  const handlePrint = () => {
    const printContent = `
      <html>
        <head>
          <title>Consolidation Pack — ${pupilName}</title>
          <style>
            body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; color: #000; }
            h1 { font-size: 24px; border-bottom: 2px solid #000; padding-bottom: 8px; }
            h2 { font-size: 18px; margin-top: 24px; }
            .chip { display: inline-block; padding: 2px 10px; border-radius: 12px; font-weight: bold; background: #eee; }
            ol, ul { margin-top: 8px; padding-left: 20px; }
            li { margin-bottom: 6px; line-height: 1.6; }
            .footer { margin-top: 40px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <h1>WriFe — Consolidation Pack</h1>
          <p><strong>Pupil:</strong> ${pupilName}</p>
          <p><strong>Level:</strong> L${pack.levelId}</p>
          <p><strong>Focus:</strong> <span class="chip">${pack.focusWordClass}</span></p>
          <h2>Practice Sentences</h2>
          <ol>${pack.practiceSentences.slice(0, 3).map((s) => `<li>${s}</li>`).join('')}</ol>
          <h2>Tips</h2>
          <ul>${pack.tips.map((t) => `<li>${t}</li>`).join('')}</ul>
          <div class="footer">Generated ${pack.generatedAt.toLocaleDateString('en-GB')} · WriFe Platform</div>
        </body>
      </html>
    `
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(printContent)
    win.document.close()
    win.print()
  }

  const handleMarkSent = async () => {
    if (marking || sent) return
    setMarking(true)
    try {
      await supabase
        .from('intervention_log')
        .update({
          action_taken: `Consolidation pack sent (focus: ${pack.focusWordClass})`,
          consolidation_pack_generated: true,
        })
        .eq('id', interventionId)
      setSent(true)
      onMarkedSent()
    } finally {
      setMarking(false)
    }
  }

  return (
    <div
      className="rounded-xl p-4 space-y-4"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: `2px solid ${wordClassColour}44`,
      }}
      data-testid={`consolidation-pack-${interventionId}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className="font-semibold text-sm"
          style={{ color: 'var(--color-text)' }}
          data-tts={`Consolidation pack for ${pupilName}`}
        >
          {pupilName}
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded"
          style={{ backgroundColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          L{pack.levelId}
        </span>
        <span
          className="text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize"
          style={{ backgroundColor: `${wordClassColour}22`, color: wordClassColour }}
          data-tts={`Focus: ${pack.focusWordClass}`}
        >
          {pack.focusWordClass}
        </span>
      </div>

      {/* Practice sentences */}
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-wide mb-2"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Practice Sentences
        </p>
        <ol className="space-y-1.5">
          {pack.practiceSentences.slice(0, 3).map((sentence, i) => (
            <li
              key={i}
              className="text-sm flex gap-2"
              style={{ color: 'var(--color-text)' }}
              data-tts={sentence}
            >
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold text-white"
                style={{ backgroundColor: wordClassColour }}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              {sentence}
            </li>
          ))}
        </ol>
      </div>

      {/* Tips */}
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-wide mb-2"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Teaching Tips
        </p>
        <ul className="space-y-1.5">
          {pack.tips.map((tip, i) => (
            <li
              key={i}
              className="text-sm"
              style={{ color: 'var(--color-text-muted)' }}
              data-tts={tip}
            >
              • {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={handlePrint}
          data-testid={`print-pack-${interventionId}`}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        >
          🖨 Print Pack
        </button>
        <button
          type="button"
          onClick={handleMarkSent}
          disabled={marking || sent}
          data-testid={`mark-sent-${interventionId}`}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity"
          style={{
            backgroundColor: sent ? '#16A34A' : wordClassColour,
            opacity: marking ? 0.6 : 1,
          }}
        >
          {sent ? '✓ Sent' : marking ? 'Saving…' : 'Mark Sent'}
        </button>
      </div>
    </div>
  )
}
