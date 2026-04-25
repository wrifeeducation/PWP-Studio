/**
 * WF-038: High Contrast Mode utilities.
 * Adds/removes `.high-contrast` class on document.documentElement.
 */

export const enableHighContrast = (): void => {
  document.documentElement.classList.add('high-contrast')
}

export const disableHighContrast = (): void => {
  document.documentElement.classList.remove('high-contrast')
}

export const isHighContrast = (): boolean => {
  return document.documentElement.classList.contains('high-contrast')
}

/** Apply high contrast based on stored preference. Call on app startup. */
export const applyHighContrastPreference = (enabled: boolean): void => {
  if (enabled) {
    enableHighContrast()
  } else {
    disableHighContrast()
  }
}
