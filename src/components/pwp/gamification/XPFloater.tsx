// XPFloater — floating "+N XP" animation triggered on correct answers.
//
// Usage:
//   <XPFloater key={floaterKey} amount={xpEarned} />
//
// The component mounts, plays the float-up/fade-out animation, then self-removes.
// Parent controls when it shows by changing the `key` prop (forces re-mount).
// Pass amount=0 to skip rendering entirely.

import { motion } from 'framer-motion'

interface XPFloaterProps {
  amount: number
  /** Optional colour accent — defaults to gold */
  colour?: string
}

export function XPFloater({ amount, colour = '#F5C500' }: XPFloaterProps) {
  if (amount <= 0) return null

  return (
    <motion.div
      className="pointer-events-none select-none absolute left-1/2 z-30 flex items-center gap-[5px]"
      style={{ transform: 'translateX(-50%)', top: '-10px' }}
      initial={{ opacity: 1, y: 0, scale: 0.9 }}
      animate={{ opacity: 0, y: -52, scale: 1.1 }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden="true"
    >
      <span
        className="text-[22px] font-extrabold leading-none"
        style={{
          color: colour,
          textShadow: '0 2px 8px rgba(0,0,0,0.18)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        +{amount}
      </span>
      <span
        className="text-[13px] font-bold leading-none mt-[2px]"
        style={{ color: colour, opacity: 0.9 }}
      >
        XP
      </span>
    </motion.div>
  )
}
