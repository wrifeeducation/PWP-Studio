/**
 * ChallengeCard — shown on the WhatsNext screen when a teacher/parent/AI
 * has assigned an extension challenge for this pupil.
 *
 * Props:
 *   challenge  — the active assignment row from pwp_challenge_assignments
 *   onAccept   — pupil taps "Try it" (logs event, dismisses card)
 *   onSkip     — pupil taps "Skip" (dismisses card, no penalty)
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export type ChallengeType = 'sentence_type' | 'add_list' | 'compound' | 'complex'

export interface ActiveChallenge {
  id: string
  challenge_type: ChallengeType
  source: string
  class_id: string | null
  pupil_id: string | null
}

// ── Challenge metadata ────────────────────────────────────────────────────────

const CHALLENGE_ICONS: Record<ChallengeType, string> = {
  sentence_type: '❓',
  add_list: '📝',
  compound: '🔗',
  complex: '🌿',
}

const CHALLENGE_TITLES: Record<ChallengeType, string> = {
  sentence_type: 'Change Sentence Type',
  add_list: 'Add a List',
  compound: 'Make it Compound',
  complex: 'Make it Complex',
}

const CHALLENGE_INSTRUCTIONS: Record<ChallengeType, string> = {
  sentence_type:
    'Take the sentence you just built and rewrite it as a question, an imperative (command), or an exclamatory sentence. Think about what changes — the word order, the punctuation, the opening word.',
  add_list:
    'Find the noun in your sentence and add a comma-separated list of adjectives (or nouns) before it. For example: "the tall, graceful, silver fox" instead of "the fox". Keep it grammatically correct!',
  compound:
    'Write your sentence again, then join it to a second clause using a coordinating conjunction — For, And, Nor, But, Or, Yet, So (FANBOYS). Both clauses must make sense on their own.',
  complex:
    'Add a subordinate clause to your sentence using a subordinating conjunction (because, although, when, if, after, before, since, while, unless…). The subordinate clause adds extra information but cannot stand alone.',
}

const SOURCE_LABELS: Record<string, string> = {
  teacher: 'Set by your teacher',
  independent: 'Set by your teacher',
  parent: 'Set by a parent',
  ai_suggested: 'Teacher-approved challenge',
  ai_auto: 'Bonus challenge',
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ChallengeCardProps {
  challenge: ActiveChallenge
  onAccept: (challenge: ActiveChallenge) => void
  onSkip: (challenge: ActiveChallenge) => void
}

export function ChallengeCard({ challenge, onAccept, onSkip }: ChallengeCardProps) {
  const [accepted, setAccepted] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const type = challenge.challenge_type
  const icon = CHALLENGE_ICONS[type]
  const title = CHALLENGE_TITLES[type]
  const instructions = CHALLENGE_INSTRUCTIONS[type]
  const sourceLabel = SOURCE_LABELS[challenge.source] ?? 'Bonus challenge'

  const handleAccept = () => {
    setAccepted(true)
    onAccept(challenge)
  }

  const handleSkip = () => {
    setDismissed(true)
    onSkip(challenge)
  }

  if (dismissed) return null

  return (
    <AnimatePresence>
      <motion.div
        key="challenge-card"
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #EDE9FE 0%, #F5F3FF 100%)',
          border: '2px solid #7C3AED',
        }}
        data-testid="challenge-card"
      >
        {/* Header stripe */}
        <div
          className="px-4 py-2 flex items-center justify-between"
          style={{ backgroundColor: '#7C3AED' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">{icon}</span>
            <span className="text-sm font-bold text-white" data-tts={`Bonus challenge: ${title}`}>
              Bonus Challenge
            </span>
          </div>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            +50 XP
          </span>
        </div>

        {/* Body */}
        <div className="p-4">
          <p
            className="text-base font-bold mb-1"
            style={{ color: '#4C1D95' }}
            data-tts={title}
          >
            {title}
          </p>
          <p
            className="text-xs mb-1"
            style={{ color: '#6D28D9' }}
          >
            {sourceLabel}
          </p>

          <AnimatePresence>
            {accepted ? (
              <motion.div
                key="instructions"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className="mt-3 p-3 rounded-xl text-sm"
                  style={{ backgroundColor: 'rgba(255,255,255,0.7)', color: '#3B0764' }}
                  data-tts={instructions}
                >
                  <p className="font-semibold mb-1">How to do it:</p>
                  <p>{instructions}</p>
                </div>
                <p
                  className="mt-3 text-xs text-center font-medium"
                  style={{ color: '#6D28D9' }}
                  data-tts="Give it a go in your book or on paper. Your teacher or parent will check it."
                >
                  ✏️ Try it in your book or on paper. Your teacher or parent will check it.
                </p>
              </motion.div>
            ) : (
              <motion.p
                key="teaser"
                className="text-sm mt-2"
                style={{ color: '#5B21B6' }}
                data-tts={`Can you ${title.toLowerCase()} your sentence? Extra 50 XP if you do!`}
              >
                Can you <strong>{title.toLowerCase()}</strong>? 🌟
              </motion.p>
            )}
          </AnimatePresence>

          {/* Buttons */}
          {!accepted && (
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handleAccept}
                className="flex-1 py-2.5 rounded-full text-sm font-bold transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#7C3AED', color: '#fff' }}
                data-tts="Accept the challenge and see what to do"
                data-testid="challenge-accept-btn"
              >
                ✨ Accept Challenge
              </button>
              <button
                type="button"
                onClick={handleSkip}
                className="px-4 py-2.5 rounded-full text-sm font-medium transition-opacity hover:opacity-70"
                style={{
                  border: '1px solid #7C3AED',
                  color: '#7C3AED',
                  backgroundColor: 'transparent',
                }}
                data-tts="Skip this challenge"
                data-testid="challenge-skip-btn"
              >
                Skip
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
