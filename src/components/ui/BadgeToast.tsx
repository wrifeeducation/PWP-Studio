/**
 * WF-010: BadgeToast — animated badge award notification.
 * Slides in from bottom, shows icon + name + rarity colour, auto-dismisses.
 */

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Badge, BadgeRarity } from '../../types/index'

interface BadgeToastProps {
  badge: Badge | null
  onDismiss: () => void
}

const RARITY_STYLES: Record<BadgeRarity, { bg: string; border: string; text: string; label: string }> = {
  common: {
    bg: '#F0FDF4',
    border: '#86EFAC',
    text: '#166534',
    label: 'Common',
  },
  uncommon: {
    bg: '#EFF6FF',
    border: '#93C5FD',
    text: '#1D4ED8',
    label: 'Uncommon',
  },
  rare: {
    bg: '#FAF5FF',
    border: '#C084FC',
    text: '#7E22CE',
    label: 'Rare',
  },
  epic: {
    bg: '#FFF7ED',
    border: '#FB923C',
    text: '#C2410C',
    label: 'Epic',
  },
}

export const BadgeToast: React.FC<BadgeToastProps> = ({ badge, onDismiss }) => {
  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (!badge) return
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [badge, onDismiss])

  if (!badge) return null

  const rarity = RARITY_STYLES[badge.rarity]

  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed bottom-6 left-1/2 z-50 w-full max-w-sm"
          style={{ transform: 'translateX(-50%)' }}
          role="status"
          aria-live="polite"
          data-testid="badge-toast"
        >
          <div
            className="mx-4 rounded-2xl p-4 flex items-center gap-4 shadow-xl"
            style={{
              backgroundColor: rarity.bg,
              border: `2px solid ${rarity.border}`,
            }}
          >
            {/* Mascot celebration */}
            <img
              src="/mascot/mascot_std_3.png"
              alt=""
              aria-hidden="true"
              style={{ height: '80px', width: 'auto', flexShrink: 0 }}
            />

            {/* Badge icon */}
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 text-2xl"
              style={{
                background: `linear-gradient(135deg, ${rarity.border}, ${rarity.bg})`,
                border: `2px solid ${rarity.border}`,
              }}
              aria-hidden="true"
            >
              {badge.icon_key || '🏅'}
            </div>

            {/* Badge info */}
            <div className="flex-1 min-w-0 text-left">
              <div
                className="text-xs font-semibold uppercase tracking-wide mb-0.5"
                style={{ color: rarity.text }}
                data-tts={`${rarity.label} badge unlocked`}
              >
                {rarity.label} Badge Unlocked!
              </div>
              <div
                className="font-bold text-sm truncate"
                style={{ color: rarity.text }}
                data-tts={badge.name}
              >
                {badge.name}
              </div>
              {badge.description && (
                <div
                  className="text-xs mt-0.5 line-clamp-1"
                  style={{ color: rarity.text, opacity: 0.8 }}
                  data-tts={badge.description}
                >
                  {badge.description}
                </div>
              )}
            </div>

            {/* Dismiss button */}
            <button
              onClick={onDismiss}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ color: rarity.text }}
              data-testid="badge-toast-dismiss"
              aria-label="Dismiss badge notification"
              data-tts="Dismiss"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
