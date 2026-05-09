/**
 * WF-031: useTTS hook — plays pre-generated ElevenLabs MP3s for known phrases,
 * falls back to Web Speech API for dynamic text.
 *
 * Pre-generated files live in Supabase Storage (tts-audio bucket).
 * The manifest at src/lib/tts-manifest.ts maps phrase keys → public URLs.
 * Re-run scripts/generate-tts.mjs to add new phrases.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { speak as ttsSpeak, stopSpeaking, isSpeaking as ttsIsSpeaking } from '../lib/tts'
import { useSettingsStore } from '../stores/settingsStore'
import { TTS_MANIFEST } from '../lib/tts-manifest'

interface UseTTSReturn {
  speak: (textOrKey: string, onEnd?: () => void) => void
  stop: () => void
  isSpeaking: boolean
}

export const useTTS = (): UseTTSReturn => {
  const { ttsEnabled, ttsRate } = useSettingsStore()
  const [isSpeakingState, setIsSpeakingState] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Poll Web Speech API state (unchanged from before)
  useEffect(() => {
    const interval = setInterval(() => {
      // Only poll WS API when not playing an <audio> element
      if (!audioRef.current || audioRef.current.paused) {
        setIsSpeakingState(ttsIsSpeaking())
      }
    }, 200)
    return () => clearInterval(interval)
  }, [])

  const speak = useCallback(
    (textOrKey: string, onEnd?: () => void) => {
      if (!ttsEnabled) {
        onEnd?.()
        return
      }

      // ── Pre-generated ElevenLabs file? ────────────────────────────────────
      const url = TTS_MANIFEST[textOrKey]
      if (url) {
        // Stop any in-flight audio — null handlers BEFORE clearing src to prevent
        // onerror firing on the old element and triggering a spurious Web Speech fallback.
        if (audioRef.current) {
          audioRef.current.onended = null
          audioRef.current.onerror = null
          audioRef.current.pause()
          audioRef.current.src = ''
        }
        stopSpeaking()

        const audio = new Audio(url)
        audioRef.current = audio
        setIsSpeakingState(true)

        audio.onended = () => {
          setIsSpeakingState(false)
          onEnd?.()
        }
        audio.onerror = () => {
          // File missing or network error — fall through to Web Speech
          setIsSpeakingState(false)
          ttsSpeak(textOrKey, ttsRate, 1.1, onEnd)
          setIsSpeakingState(true)
        }

        audio.play().catch(() => {
          // Autoplay blocked — fall through to Web Speech
          ttsSpeak(textOrKey, ttsRate, 1.1, onEnd)
          setIsSpeakingState(true)
        })
        return
      }

      // ── Dynamic text: Web Speech API fallback ──────────────────────────────
      ttsSpeak(textOrKey, ttsRate, 1.1, onEnd)
      setIsSpeakingState(true)
    },
    [ttsEnabled, ttsRate]
  )

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    stopSpeaking()
    setIsSpeakingState(false)
  }, [])

  return { speak, stop, isSpeaking: isSpeakingState }
}
