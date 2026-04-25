/**
 * WF-013: LevelUpModal — Framer Motion celebration modal.
 * Shows when a pupil passes the mastery gate and advances to the next level.
 */

import { motion, AnimatePresence } from 'framer-motion'

interface LevelUpModalProps {
  isOpen: boolean
  previousLevel: number
  newLevel: number
  xpSummary: {
    formulaXP: number
    paragraphXP?: number
    streakBonus: number
    total: number
  }
  didUnlockParagraph: boolean
  onContinue: () => void
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  isOpen,
  previousLevel,
  newLevel,
  xpSummary,
  didUnlockParagraph,
  onContinue,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          data-testid="level-up-modal"
          onClick={onContinue}
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #1B3A6B 0%, #2563EB 100%)',
              color: '#FFFFFF',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mascot celebration */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.15, 1] }}
              transition={{ delay: 0.05, duration: 0.5 }}
              className="mb-2 flex justify-center"
            >
              <img
                src="/mascot/mascot_std_3.png"
                alt=""
                aria-hidden="true"
                style={{ height: '96px', width: 'auto' }}
              />
            </motion.div>

            {/* Confetti burst */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-5xl mb-4"
              aria-hidden="true"
            >
              🎉
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold mb-1"
              data-tts="Level up! Congratulations!"
            >
              Level Up!
            </motion.h2>

            {/* Level badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-center gap-3 my-4"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold opacity-60"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                data-tts={`Level ${previousLevel}`}
              >
                L{previousLevel}
              </div>
              <span className="text-2xl" aria-hidden="true">→</span>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.35 }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.25)',
                  border: '2px solid rgba(255,255,255,0.5)',
                  boxShadow: '0 0 20px rgba(255,255,255,0.3)',
                }}
                data-tts={`Level ${newLevel}`}
              >
                L{newLevel}
              </motion.div>
            </motion.div>

            {/* XP summary */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="rounded-xl p-4 mb-4 text-sm text-left"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
              data-testid="level-up-xp-summary"
            >
              <p className="font-semibold mb-2 text-center" data-tts="XP earned this session">
                XP Earned
              </p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span style={{ opacity: 0.85 }} data-tts={`Formula XP: ${xpSummary.formulaXP}`}>
                    Formula
                  </span>
                  <span className="font-bold">+{xpSummary.formulaXP}</span>
                </div>
                {xpSummary.paragraphXP !== undefined && (
                  <div className="flex justify-between">
                    <span style={{ opacity: 0.85 }} data-tts={`Paragraph XP: ${xpSummary.paragraphXP}`}>
                      Paragraph
                    </span>
                    <span className="font-bold">+{xpSummary.paragraphXP}</span>
                  </div>
                )}
                {xpSummary.streakBonus > 0 && (
                  <div className="flex justify-between">
                    <span style={{ opacity: 0.85 }} data-tts={`Streak bonus: ${xpSummary.streakBonus}`}>
                      Streak Bonus
                    </span>
                    <span className="font-bold">+{xpSummary.streakBonus}</span>
                  </div>
                )}
                <div
                  className="flex justify-between pt-1 mt-1"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}
                >
                  <span className="font-semibold" data-tts={`Total XP: ${xpSummary.total}`}>
                    Total
                  </span>
                  <span className="font-bold text-base">+{xpSummary.total} XP</span>
                </div>
              </div>
            </motion.div>

            {/* Paragraph unlock celebration */}
            {didUnlockParagraph && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.55 }}
                className="rounded-xl p-3 mb-4 text-sm"
                style={{ backgroundColor: 'rgba(74,124,89,0.4)', border: '1px solid rgba(74,124,89,0.6)' }}
                data-testid="paragraph-unlock-banner"
                data-tts="Paragraph Builder unlocked!"
              >
                📝 Paragraph Builder Unlocked!
              </motion.div>
            )}

            {/* CTA */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onContinue}
              className="w-full py-3 rounded-2xl font-bold text-base transition-all"
              style={{ backgroundColor: '#FFFFFF', color: '#1B3A6B' }}
              data-testid="level-up-continue"
              data-tts="Next challenge"
            >
              Next Challenge →
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
