/**
 * FullscreenButton — enters/exits browser fullscreen via the Fullscreen API.
 *
 * Works on all modern browsers including iOS Safari (where it activates
 * standalone / minimal-ui presentation rather than true fullscreen).
 *
 * Usage: drop inside any layout — it listens for the fullscreenchange event
 * and updates its icon automatically.
 */

import { useEffect, useState } from 'react'
import { sfx } from '../../lib/sfx'

interface FullscreenButtonProps {
  /** Element to make fullscreen — defaults to document.documentElement */
  targetRef?: React.RefObject<HTMLElement>
  className?: string
}

export const FullscreenButton: React.FC<FullscreenButtonProps> = ({
  targetRef,
  className = '',
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    document.addEventListener('webkitfullscreenchange', onFsChange) // Safari
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange)
      document.removeEventListener('webkitfullscreenchange', onFsChange)
    }
  }, [])

  const toggle = () => {
    sfx.click()
    if (!document.fullscreenElement) {
      const el = targetRef?.current ?? document.documentElement
      ;(el.requestFullscreen?.() ??
        // Safari / older WebKit
        (el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen?.()
      )?.catch(() => {
        // Fullscreen request denied (e.g. sandboxed iframe) — silent fail
      })
    } else {
      ;(document.exitFullscreen?.() ??
        (document as Document & { webkitExitFullscreen?: () => void }).webkitExitFullscreen?.()
      )
    }
  }

  // Hide button if Fullscreen API is not supported at all
  if (!document.fullscreenEnabled && !(document as Document & { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled) {
    return null
  }

  return (
    <button
      onClick={toggle}
      className={`flex items-center justify-center rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 ${className}`}
      style={{
        width: 40,
        height: 40,
        border: '1.5px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text-muted)',
      }}
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen play mode'}
      data-tts={isFullscreen ? 'Exit fullscreen' : 'Play fullscreen'}
      data-testid="fullscreen-button"
      title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen play mode'}
    >
      {isFullscreen ? (
        /* Compress icon */
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        /* Expand icon */
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  )
}
