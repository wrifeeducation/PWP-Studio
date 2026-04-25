/**
 * WF-031: TTSButton — speaker icon button that toggles TTS playback.
 * Shows animated sound waves when speaking. Pass `text` prop to speak.
 */

import { useTTS } from '../../hooks/useTTS'

interface TTSButtonProps {
  text: string
  className?: string
  size?: 'sm' | 'md'
}

export const TTSButton: React.FC<TTSButtonProps> = ({ text, className = '', size = 'sm' }) => {
  const { speak, stop, isSpeaking } = useTTS()

  const handleClick = () => {
    if (isSpeaking) {
      stop()
    } else {
      speak(text)
    }
  }

  const btnSize = size === 'sm' ? '28px' : '36px'
  const iconSize = size === 'sm' ? '14px' : '18px'

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isSpeaking ? 'Stop reading aloud' : 'Read aloud'}
      title={isSpeaking ? 'Stop' : 'Read aloud'}
      data-testid="tts-button"
      className={`tts-btn flex items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 ${className}`}
      style={{
        width: btnSize,
        height: btnSize,
        backgroundColor: isSpeaking ? 'var(--color-brand-primary)' : 'var(--color-border)',
        color: isSpeaking ? '#fff' : 'var(--color-text-muted)',
        flexShrink: 0,
      }}
    >
      {isSpeaking ? (
        <span
          className="tts-waves"
          aria-hidden="true"
          style={{ fontSize: iconSize, lineHeight: 1 }}
        >
          <span className="tts-wave" />
          <span className="tts-wave" />
          <span className="tts-wave" />
        </span>
      ) : (
        <svg
          aria-hidden="true"
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
        </svg>
      )}
    </button>
  )
}
