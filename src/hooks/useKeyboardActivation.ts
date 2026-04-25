/**
 * WF-045 — Keyboard Activation Hook
 * Returns props to make non-button elements keyboard accessible.
 * Fires onClick on Enter and Space.
 */

import type { KeyboardEvent } from 'react'

interface KeyboardActivationProps {
  onKeyDown: (e: KeyboardEvent) => void
  tabIndex: number
  role: 'button'
}

export function useKeyboardActivation(onClick: () => void): KeyboardActivationProps {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }

  return {
    onKeyDown,
    tabIndex: 0,
    role: 'button',
  }
}
