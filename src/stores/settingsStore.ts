/**
 * WF-031 / WF-037 / WF-038: Settings store — user preferences persisted to localStorage.
 * Stores TTS settings, high contrast mode, display preferences.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  ttsEnabled: boolean
  ttsRate: number
  ttsVoice: string | null
  highContrast: boolean
  fontSize: 'normal' | 'large'
  avatarColour: string
}

interface SettingsActions {
  setTtsEnabled: (enabled: boolean) => void
  setTtsRate: (rate: number) => void
  setTtsVoice: (voice: string | null) => void
  setHighContrast: (enabled: boolean) => void
  setFontSize: (size: 'normal' | 'large') => void
  setAvatarColour: (colour: string) => void
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      // TTS defaults
      ttsEnabled: true,
      ttsRate: 0.85,
      ttsVoice: null,

      // Accessibility
      highContrast: false,
      fontSize: 'normal',
      avatarColour: '#2563EB',

      // Actions
      setTtsEnabled: (enabled) => set({ ttsEnabled: enabled }),
      setTtsRate: (rate) => set({ ttsRate: rate }),
      setTtsVoice: (voice) => set({ ttsVoice: voice }),
      setHighContrast: (enabled) => set({ highContrast: enabled }),
      setFontSize: (size) => set({ fontSize: size }),
      setAvatarColour: (colour) => set({ avatarColour: colour }),
    }),
    {
      name: 'wrifeapp-settings',
    }
  )
)
