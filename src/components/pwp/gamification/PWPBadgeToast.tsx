// PWPBadgeToast — badge award notification for the PWP programme.
//
// Accepts a BadgeInfo (from usePWPBadgeCheck) rather than the Interactive
// Practice Badge type, so no enum conversions are needed.
// Slides in from the bottom, auto-dismisses after 5 seconds.

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { BadgeInfo } from '@/hooks/usePWPBadgeCheck'

// ─── RARITY STYLES ───────────────────────────────────────────────────────────

const RARITY_STYLES = {
  common: {
    bg: '#F0FDF4', border: '#86EFAC', text: '#166534', label: 'Common',
  },
  uncommon: {
    bg: '#EFF6FF', border: '#93C5FD', text: '#1D4ED8', label: 'Uncommon',
  },
  rare: {
    bg: '#FAF5FF', border: '#C084FC', text: '#7E22CE', label: 'Rare',
  },
  epic: {
    bg: '#FFF7ED', border: '#FB923C', text: '#C2410C', label: 'Epic',
  },
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

interface PWPBadgeToastProps {
  badge:      BadgeInfo | null
  onDismiss:  () => void
}

export function PWPBadgeToast({ badge, onDismiss }: PWPBadgeToastProps) {
  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (!badge) return
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [badge, onDismiss])

  const rarity = badge ? RARITY_STYLES[badge.rarity] : null

  return (
    <AnimatePresence>
      {badge && rarity && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.9 }}
          animate={{ y: 0,   opacity: 1, scale: 1   }}
          exit={   { y: 100, opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed bottom-6 left-1/2 z-50 w-full max-w-sm"
          style={{ transform: 'translateX(-50%)' }}
          role="status"
          aria-live="polite"
          data-testid="pwp-badge-toast"
        >
          <div
            className="mx-4 rounded-2xl px-4 py-3 flex items-center gap-4 shadow-xl"
            style={{ background: rarity.bg, border: `2px solid ${rarity.border}` }}
          >
            {/* Badge emoji */}
            <div
              className="w-[52px] h-[52px] rounded-full flex items-center justify-center flex-shrink-0 text-[26px]"
              style={{
                background: `linear-gradient(135deg, ${rarity.border}55, ${rarity.bg})`,
                border: `2px solid ${rarity.border}`,
              }}
              aria-hidden="true"
            >
              {badge.icon}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0 text-left">
              <div
                className="text-[11px] font-bold uppercase tracking-wide mb-[2px]"
                style={{ color: rarity.text }}
                data-tts={`${rarity.label} badge unlocked`}
              >
                {rarity.label} Badge Unlocked!
              </div>
              <div
                className="font-extrabold text-[14px] truncate"
                style={{ color: rarity.text }}
                data-tts={badge.name}
              >
                {badge.name}
              </div>
              <div
                className="text-[11px] mt-[2px] line-clamp-1"
                style={{ color: rarity.text, opacity: 0.75 }}
                data-tts={badge.description}
              >
                {badge.description}
              </div>
            </div>

            {/* Dismiss */}
            <button
              onClick={onDismiss}
              className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] transition-opacity hover:opacity-60"
              style={{ color: rarity.text }}
              aria-label="Dismiss badge notification"
              data-tts="Dismiss badge"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
