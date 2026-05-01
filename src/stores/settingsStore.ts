/**
 * WF-031 / WF-037 / WF-038: Settings store — user preferences persisted to localStorage.
 * Stores TTS settings, SFX settings, high contrast mode, display preferences.
 *
 * S-01: Added sfxEnabled and sfxVolume — previously missing, causing sfx module to
 *        have no connection to user preferences. Both are persisted via Zustand persist.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  ttsEnabled: boolean
  ttsRate: number
  ttsVoice: string | null
  /** S-01: Whether sound effects are active (default on) */
  sfxEnabled: boolean
  /** S-01: SFX volume 0–1 (default 0.5) */
  sfxVolume: number
  highContrast: boolean
  fontSize: 'normal' | 'large'
  avatarColour: string
}

interface SettingsActions {
  setTtsEnabled: (enabled: boolean) => void
  setTtsRate: (rate: number) => void
  setTtsVoice: (voice: string | null) => void
  setSfxEnabled: (enabled: boolean) => void
  setSfxVolume: (volume: number) => void
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

      // SFX defaults (S-01)
      sfxEnabled: true,
      sfxVolume: 0.5,

      // Accessibility
      highContrast: false,
      fontSize: 'normal',
      avatarColour: '#2563EB',

      // Actions
      setTtsEnabled: (enabled) => set({ ttsEnabled: enabled }),
      setTtsRate: (rate) => set({ ttsRate: rate }),
      setTtsVoice: (voice) => set({ ttsVoice: voice }),
      setSfxEnabled: (enabled) => set({ sfxEnabled: enabled }),
      setSfxVolume: (volume) => set({ sfxVolume: volume }),
      setHighContrast: (enabled) => set({ highContrast: enabled }),
      setFontSize: (size) => set({ fontSize: size }),
      setAvatarColour: (colour) => set({ avatarColour: colour }),
    }),
    {
      name: 'wrifeapp-settings',
    }
  )
)
