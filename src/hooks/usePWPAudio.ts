import { useQuery } from '@tanstack/react-query'
import { useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAudioStore } from '@/stores/pwpStore'

const BUCKET = 'pwp-audio'

// ── Fetch a single audio asset URL ───────────────────────────────────────────
export function usePWPAudio(key: string | null) {
  const { data } = useQuery({
    queryKey: ['pwp-audio', key],
    enabled: !!key,
    staleTime: Infinity,   // audio URLs don't change
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pwp_audio_assets')
        .select('storage_path, duration_ms')
        .eq('key', key!)
        .single()
      if (error || !data) return null
      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(data.storage_path)
      return { url: urlData.publicUrl, duration_ms: data.duration_ms as number | null }
    },
  })
  return { url: data?.url ?? null, duration_ms: data?.duration_ms ?? null }
}

// ── Play a one-shot audio key (fire-and-forget) ───────────────────────────────
export function usePWPAudioPlayer() {
  const currentAudio = useRef<HTMLAudioElement | null>(null)

  const play = useCallback(async (key: string | null) => {
    if (!key) return
    try {
      // Fetch URL from DB
      const { data } = await supabase
        .from('pwp_audio_assets')
        .select('storage_path')
        .eq('key', key)
        .single()
      if (!data) return

      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(data.storage_path)

      // Stop any playing audio
      if (currentAudio.current) {
        currentAudio.current.pause()
        currentAudio.current = null
      }

      const audio = new Audio(urlData.publicUrl)
      currentAudio.current = audio
      audio.play().catch(() => {/* autoplay blocked — silent fail */})
    } catch {
      // Audio failure is always silent — never crash the app
    }
  }, [])

  const stop = useCallback(() => {
    if (currentAudio.current) {
      currentAudio.current.pause()
      currentAudio.current = null
    }
  }, [])

  return { play, stop }
}

// ── Play a random variant from a category (round-robin, no consecutive repeat) ─
// e.g. playVariant('feedback.correct_v', 12) plays one of correct_v1..correct_v12
export function usePWPVariantPlayer() {
  const { nextVariant } = useAudioStore()
  const { play } = usePWPAudioPlayer()

  const playVariant = useCallback((prefix: string, count: number) => {
    const idx = nextVariant(prefix, count)
    play(`${prefix}${idx + 1}`)
  }, [nextVariant, play])

  return { playVariant }
}
