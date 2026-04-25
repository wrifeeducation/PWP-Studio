import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

interface NavCardProps {
  title: string
  description: string
  isLocked: boolean
  lockReason?: string
  accentColor: string
  icon: string
  route: string
  delay?: number
}

export const NavCard = ({
  title,
  description,
  isLocked,
  lockReason,
  accentColor,
  icon,
  route,
  delay = 0,
}: NavCardProps) => {
  const navigate = useNavigate()

  const handleClick = () => {
    if (!isLocked) {
      navigate(route)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      onClick={handleClick}
      role={isLocked ? 'presentation' : 'button'}
      tabIndex={isLocked ? -1 : 0}
      onKeyDown={(e) => {
        if (!isLocked && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          handleClick()
        }
      }}
      aria-disabled={isLocked}
      aria-label={isLocked ? `${title} — ${lockReason}` : title}
      data-testid={`nav-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
      className="relative rounded-2xl p-6 flex items-start gap-4 transition-transform"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: `2px solid ${isLocked ? 'var(--color-border)' : accentColor}`,
        cursor: isLocked ? 'not-allowed' : 'pointer',
        opacity: isLocked ? 0.6 : 1,
        boxShadow: isLocked ? 'none' : `0 4px 16px ${accentColor}22`,
      }}
    >
      {/* Icon */}
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
        style={{
          backgroundColor: isLocked ? 'var(--color-border)' : `${accentColor}18`,
        }}
        aria-hidden="true"
      >
        {isLocked ? '🔒' : icon}
      </div>

      {/* Content */}
      <div className="flex-1 text-left">
        <h3
          className="text-base font-bold mb-1"
          style={{ color: isLocked ? 'var(--color-text-muted)' : 'var(--color-text)' }}
          data-tts={title}
        >
          {title}
        </h3>
        <p
          className="text-sm leading-snug"
          style={{ color: 'var(--color-text-muted)' }}
          data-tts={isLocked ? lockReason : description}
        >
          {isLocked && lockReason ? lockReason : description}
        </p>
      </div>

      {/* Arrow or lock indicator */}
      {!isLocked && (
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center self-center"
          style={{ backgroundColor: accentColor }}
          aria-hidden="true"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 8h10M9 4l4 4-4 4"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </motion.div>
  )
}
