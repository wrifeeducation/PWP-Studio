import { motion } from 'framer-motion'

interface FormulaLevelBadgeProps {
  level: number
}

export const FormulaLevelBadge = ({ level }: FormulaLevelBadgeProps) => {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.05 }}
      className="flex flex-col items-center justify-center rounded-2xl px-6 py-4 min-w-[120px]"
      style={{
        backgroundColor: 'var(--color-brand-primary)',
        color: '#fff',
      }}
      data-testid="formula-level-badge"
    >
      <span
        className="text-xs font-semibold opacity-80 tracking-wider uppercase mb-1"
        data-tts="Formula Level"
      >
        Level
      </span>
      <span
        className="text-3xl font-bold leading-none"
        data-tts={`Formula Level ${level}`}
      >
        L{level}
      </span>
      <span className="text-xs opacity-70 mt-1" data-tts="Formula Practice">
        Formula Practice
      </span>
    </motion.div>
  )
}
