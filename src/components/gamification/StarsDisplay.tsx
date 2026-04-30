/**
 * StarsDisplay — WF-050
 * Shows the pupil's remaining daily stars during a practice session.
 * Stars animate when depleted. Shield glow appears when star_shield_active.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { DAILY_STAR_MAX } from '../../hooks/useStars'

interface StarsDisplayProps {
  starsRemaining: number
  shieldActive?: boolean
  isFree: boolean
}

export function StarsDisplay({ starsRemaining, shieldActive = false, isFree }: StarsDisplayProps) {
  if (!isFree) return null // Pro/school: no star display needed

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 4 }}
      title={`${starsRemaining} of ${DAILY_STAR_MAX} stars remaining today`}
      data-tts={`${starsRemaining} stars remaining`}
      data-testid="stars-display"
    >
      {Array.from({ length: DAILY_STAR_MAX }).map((_, i) => {
        const filled = i < starsRemaining
        return (
          <AnimatePresence key={i} mode="wait">
            <motion.span
              key={filled ? 'filled' : 'empty'}
              initial={{ scale: filled ? 1 : 1.3, opacity: filled ? 1 : 0.6 }}
              animate={{
                scale: 1,
                opacity: 1,
                filter: shieldActive && filled
                  ? 'drop-shadow(0 0 4px #FFD700)'
                  : 'none',
              }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              style={{
                fontSize: 18,
                lineHeight: 1,
                display: 'inline-block',
                color: filled ? '#F59E0B' : '#D1D5DB',
                filter: shieldActive && filled ? 'drop-shadow(0 0 5px #FCD34D)' : undefined,
              }}
              aria-hidden="true"
            >
              {filled ? '★' : '☆'}
            </motion.span>
          </AnimatePresence>
        )
      })}

      {/* Shield indicator */}
      {shieldActive && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{ fontSize: 14, marginLeft: 2 }}
          title="Star shield active — next mistake is free!"
          aria-label="Star shield active"
        >
          🛡️
        </motion.span>
      )}
    </div>
  )
}
