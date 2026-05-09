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

// Extend HTMLAudioElement with a cancellation flag so we can suppress
// play().catch() firing after we intentionally stop an element.
// The play() promise cannot be cancelled, but we can ignore its rejection.
interface ManagedAudio extends HTMLAudioElement {
  __cancelled?: boolean
}

export const useTTS = (): UseTTSReturn => {
  const { ttsEnabled, ttsRate } = useSettingsStore()
  const [isSpeakingState, setIsSpeakingState] = useState(false)
  const audioRef = useRef<ManagedAudio | null>(null)

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
        // Stop any in-flight audio — null handlers AND mark as cancelled BEFORE
        // clearing src. The onerror/onended properties are nulled to prevent
        // synchronous handler firing. The __cancelled flag prevents the async
        // play().catch() rejection (AbortError) from triggering Web Speech —
        // that promise cannot be cancelled so we must guard inside the handler.
        if (audioRef.current) {
          audioRef.current.onended = null
          audioRef.current.onerror = null
          audioRef.current.__cancelled = true
          audioRef.current.pause()
          audioRef.current.src = ''
        }
        stopSpeaking()

        const audio = new Audio(url) as ManagedAudio
        audio.__cancelled = false
        audioRef.current = audio
        setIsSpeakingState(true)

        audio.onended = () => {
          setIsSpeakingState(false)
          onEnd?.()
        }
        audio.onerror = () => {
          if (audio.__cancelled) return
          // File missing or network error — fall through to Web Speech
          setIsSpeakingState(false)
          ttsSpeak(textOrKey, ttsRate, 1.1, onEnd)
          setIsSpeakingState(true)
        }

        audio.play().catch(() => {
          if (audio.__cancelled) return
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
      audioRef.current.__cancelled = true
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    stopSpeaking()
    setIsSpeakingState(false)
  }, [])

  return { speak, stop, isSpeaking: isSpeakingState }
}
