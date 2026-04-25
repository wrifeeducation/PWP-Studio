/**
 * PlanningScaffold — genre-specific planning tool for Writing Studio.
 * Narrative: Opening, Event 1, Event 2, Climax, Resolution.
 * Non-fiction: Point, Evidence, Explanation (×2), Conclusion.
 * Persuasive: Claim, Reason 1 + Evidence, Reason 2 + Evidence, Counter, Call-to-Action.
 * Poetry: Theme/Mood, Imagery, Key Lines, Form, Effect.
 */

import { Genre } from '../../types/index'

export interface PlanData {
  [key: string]: string
}

interface PlanningScaffoldProps {
  genre: Genre
  planData: PlanData
  onChange: (data: PlanData) => void
  readOnly?: boolean
}

const SCAFFOLDS: Record<Genre, { key: string; label: string; placeholder: string }[]> = {
  [Genre.NARRATIVE]: [
    { key: 'opening', label: 'Opening', placeholder: 'Set the scene — where, when, who?' },
    { key: 'event1', label: 'Event 1', placeholder: 'What happens first?' },
    { key: 'event2', label: 'Event 2', placeholder: 'What happens next? Add detail.' },
    { key: 'climax', label: 'Climax', placeholder: 'What is the most exciting moment?' },
    { key: 'resolution', label: 'Resolution', placeholder: 'How does it end? How does the character feel?' },
  ],
  [Genre.NON_FICTION]: [
    { key: 'point1', label: 'Point', placeholder: 'Main idea or topic' },
    { key: 'evidence1', label: 'Evidence', placeholder: 'Fact or example that supports it' },
    { key: 'explanation1', label: 'Explanation', placeholder: 'Why does this matter? Explain for the reader.' },
    { key: 'point2', label: 'Second Point', placeholder: 'Another key idea' },
    { key: 'conclusion', label: 'Conclusion', placeholder: 'Sum up: what do you want the reader to remember?' },
  ],
  [Genre.PERSUASIVE]: [
    { key: 'claim', label: 'Claim', placeholder: 'Your main argument / position' },
    { key: 'reason1', label: 'Reason 1 + Evidence', placeholder: 'First reason and supporting evidence' },
    { key: 'reason2', label: 'Reason 2 + Evidence', placeholder: 'Second reason and supporting evidence' },
    { key: 'counter', label: 'Counterargument', placeholder: 'What might someone argue against you? How will you respond?' },
    { key: 'cta', label: 'Call to Action', placeholder: 'What should the reader do or think?' },
  ],
  [Genre.POETRY]: [
    { key: 'theme', label: 'Theme / Mood', placeholder: 'What feeling or idea does your poem explore?' },
    { key: 'imagery', label: 'Key Image', placeholder: 'What image will carry the poem? (e.g. a candle, a storm, a door)' },
    { key: 'keylines', label: 'Key Lines', placeholder: 'Draft 1–2 strong lines you want to include' },
    { key: 'form', label: 'Form', placeholder: 'How will it look on the page? (rhyming, free verse, haiku, acrostic…)' },
    { key: 'effect', label: 'Effect on Reader', placeholder: 'What do you want the reader to feel at the end?' },
  ],
}

const GENRE_COLOURS: Record<Genre, string> = {
  [Genre.NARRATIVE]: '#7C3AED',
  [Genre.NON_FICTION]: '#2563EB',
  [Genre.PERSUASIVE]: '#DC2626',
  [Genre.POETRY]: '#16A34A',
}

export const PlanningScaffold = ({
  genre,
  planData,
  onChange,
  readOnly = false,
}: PlanningScaffoldProps) => {
  const fields = SCAFFOLDS[genre] ?? SCAFFOLDS[Genre.NARRATIVE]
  const accentColour = GENRE_COLOURS[genre]

  const handleChange = (key: string, value: string) => {
    onChange({ ...planData, [key]: value })
  }

  return (
    <div className="space-y-3" data-testid="planning-scaffold">
      {fields.map((field) => (
        <div key={field.key} className="flex flex-col gap-1">
          <label
            htmlFor={`plan-${field.key}`}
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: accentColour }}
            data-tts={`Planning box: ${field.label}`}
          >
            {field.label}
          </label>
          <textarea
            id={`plan-${field.key}`}
            value={planData[field.key] ?? ''}
            onChange={(e) => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            readOnly={readOnly}
            rows={2}
            data-testid={`plan-field-${field.key}`}
            data-tts={`${field.label} planning box`}
            className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 transition-colors"
            style={{
              border: `1px solid var(--color-border)`,
              backgroundColor: readOnly ? 'var(--color-background)' : 'var(--color-surface)',
              color: 'var(--color-text)',
              boxShadow: 'none',
            }}
          />
        </div>
      ))}
    </div>
  )
}
