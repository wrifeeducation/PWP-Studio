import { motion } from 'framer-motion'

interface XPBadgeProps {
  totalXP: number
}

export const XPBadge = ({ totalXP }: XPBadgeProps) => {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="flex flex-col items-center justify-center rounded-2xl px-6 py-4 min-w-[120px]"
      style={{
        backgroundColor: 'var(--color-brand-accent)',
        color: '#fff',
      }}
      data-testid="xp-badge"
    >
      <span
        className="text-3xl font-bold leading-none"
        data-tts={`${totalXP} XP`}
      >
        {totalXP.toLocaleString()}
      </span>
      <span className="text-xs font-semibold mt-1 opacity-90 tracking-wider uppercase" data-tts="XP">
        XP
      </span>
    </motion.div>
  )
}
