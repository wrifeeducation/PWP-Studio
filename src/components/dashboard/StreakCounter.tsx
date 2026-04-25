import { motion } from 'framer-motion'

interface StreakCounterProps {
  currentStreak: number
  longestStreak: number
}

export const StreakCounter = ({ currentStreak, longestStreak }: StreakCounterProps) => {
  const isActive = currentStreak > 0

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
      className="flex flex-col items-center justify-center rounded-2xl px-6 py-4 min-w-[120px]"
      style={{
        backgroundColor: isActive ? 'var(--color-adverb)' : 'var(--color-border)',
        color: isActive ? '#fff' : 'var(--color-text-muted)',
      }}
      data-testid="streak-counter"
    >
      <span className="text-2xl mb-1" aria-hidden="true">
        {isActive ? '🔥' : '💤'}
      </span>
      <span
        className="text-2xl font-bold leading-none"
        data-tts={`${currentStreak} day streak`}
      >
        {currentStreak}
      </span>
      <span className="text-xs font-semibold mt-1 opacity-90 tracking-wider uppercase" data-tts="day streak">
        {currentStreak === 1 ? 'day' : 'days'}
      </span>
      {longestStreak > 0 && (
        <span
          className="text-xs mt-1 opacity-70"
          data-tts={`Best: ${longestStreak} days`}
        >
          Best: {longestStreak}
        </span>
      )}
    </motion.div>
  )
}
