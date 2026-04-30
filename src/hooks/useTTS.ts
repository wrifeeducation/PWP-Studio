/**
 * WF-031: useTTS hook — React wrapper around the TTS library.
 * Returns speak, stop, isSpeaking. Reads rate/voice from settingsStore.
 */

import { useState, useCallback, useEffect } from 'react'
import { speak as ttsSpeak, stopSpeaking, isSpeaking as ttsIsSpeaking } from '../lib/tts'
import { useSettingsStore } from '../stores/settingsStore'

interface UseTTSReturn {
  speak: (text: string) => void
  stop: () => void
  isSpeaking: boolean
}

export const useTTS = (): UseTTSReturn => {
  const { ttsEnabled, ttsRate } = useSettingsStore()
  const [isSpeakingState, setIsSpeakingState] = useState(false)

  // Poll speaking state every 200ms (Web Speech API has no reliable event for mid-speech)
  useEffect(() => {
    const interval = setInterval(() => {
      setIsSpeakingState(ttsIsSpeaking())
    }, 200)
    return () => clearInterval(interval)
  }, [])

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!ttsEnabled) {
        onEnd?.() // advance UI even when TTS is off
        return
      }
      ttsSpeak(text, ttsRate, 1.1, onEnd)
      setIsSpeakingState(true)
    },
    [ttsEnabled, ttsRate]
  )

  const stop = useCallback(() => {
    stopSpeaking()
    setIsSpeakingState(false)
  }, [])

  return { speak, stop, isSpeaking: isSpeakingState }
}
