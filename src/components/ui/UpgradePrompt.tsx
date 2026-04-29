/**
 * UpgradePrompt — shown to free-tier users when they hit a freemium gate.
 *
 * Variants:
 *   'limit'  — daily formula play limit reached (3/day)
 *   'pro'    — feature is pro-only (Paragraph Builder, Writing Studio)
 *
 * Usage:
 *   <UpgradePrompt variant="limit" playsUsed={3} playsTotal={3} />
 *   <UpgradePrompt variant="pro" feature="Paragraph Builder" />
 */

import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

interface UpgradePromptProps {
  /** 'limit' = daily cap reached; 'pro' = feature locked */
  variant: 'limit' | 'pro'
  /** Used for 'limit' variant — plays used today */
  playsUsed?: number
  /** Used for 'limit' variant — daily cap */
  playsTotal?: number
  /** Used for 'pro' variant — feature name to display */
  feature?: string
  /** Optional callback when user clicks "Go back" */
  onBack?: () => void
}

export const UpgradePrompt = ({
  variant,
  playsUsed = 0,
  playsTotal = 3,
  feature = 'this feature',
  onBack,
}: UpgradePromptProps) => {
  const navigate = useNavigate()

  const isLimit = variant === 'limit'

  const icon = isLimit ? '⏰' : '🔒'
  const heading = isLimit
    ? "You've reached today's limit"
    : `${feature} is a Pro feature`
  const body = isLimit
    ? `Free accounts can practise ${playsTotal} formula sessions per day. You've used ${playsUsed}/${playsTotal} today. Come back tomorrow — or upgrade to practise unlimited sessions!`
    : `Upgrade to WriFe Pro to unlock ${feature}, unlimited formula practice, XP, badges, streaks, and more.`

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--color-background)' }}
      data-testid="upgrade-prompt"
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 text-center"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.06)',
        }}
      >
        {/* Icon */}
        <div className="text-5xl mb-4" aria-hidden="true">{icon}</div>

        {/* Heading */}
        <h2
          className="text-xl font-bold mb-3"
          style={{ color: 'var(--color-text)' }}
          data-tts={heading}
        >
          {heading}
        </h2>

        {/* Body */}
        <p
          className="text-sm mb-6 leading-relaxed"
          style={{ color: 'var(--color-text-muted)' }}
          data-tts={body}
        >
          {body}
        </p>

        {/* Play meter (limit variant only) */}
        {isLimit && (
          <div className="mb-6">
            <div className="flex justify-between text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
              <span>Sessions today</span>
              <span>{playsUsed} / {playsTotal}</span>
            </div>
            <div
              className="w-full h-2.5 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--color-border)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (playsUsed / playsTotal) * 100)}%`,
                  backgroundColor: '#EF4444',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* CTA: Upgrade */}
        <button
          onClick={() => navigate('/pricing')}
          className="w-full py-3 rounded-xl text-sm font-bold text-white mb-3 transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-brand-primary)' }}
          data-testid="upgrade-cta"
          data-tts="Upgrade to Pro"
        >
          Upgrade to Pro →
        </button>

        {/* Secondary: Back / Dashboard */}
        <button
          onClick={onBack ?? (() => navigate('/dashboard'))}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors"
          style={{
            backgroundColor: 'transparent',
            color: 'var(--color-text-muted)',
            border: '1px solid var(--color-border)',
          }}
          data-testid="upgrade-back"
          data-tts="Back to dashboard"
        >
          {isLimit ? 'Back to dashboard' : 'Maybe later'}
        </button>
      </div>
    </motion.div>
  )
}
