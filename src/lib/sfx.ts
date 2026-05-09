/**
 * WriFe Sound Effects — Web Audio API
 *
 * Generates all sounds procedurally using OscillatorNode — no audio files
 * needed, works fully offline. Sounds are short, child-friendly tones.
 *
 * Usage:
 *   import { sfx } from '../lib/sfx'
 *   sfx.click()      // button press
 *   sfx.drop()       // word tile placed in slot
 *   sfx.clear()      // slot cleared
 *   sfx.success()    // correct answer
 *   sfx.error()      // incorrect answer
 *   sfx.levelUp()    // level completed / badge earned
 *   sfx.star()       // star earned / reward
 *
 * Volume is controlled by the global sfxVolume (0–1).
 * Call sfx.setEnabled(false) to mute all effects (e.g. when user disables sound).
 */

let _ctx: AudioContext | null = null
let _enabled = true
let _volume = 0.35  // master volume (0–1)

/**
 * S-06: Returns true when the user has opted into reduced motion.
 * We silence SFX too — many gamification sounds accompany animations,
 * and playing sounds without their paired animation is confusing.
 */
function motionReduced(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function getCtx(): AudioContext | null {
  if (!_enabled) return null
  // S-06: respect prefers-reduced-motion — do not play sounds tied to animations
  if (motionReduced()) return null
  if (!_ctx) {
    try {
      _ctx = new AudioContext()
    } catch {
      return null
    }
  }
  // Resume if suspended (browser requires user gesture first)
  if (_ctx.state === 'suspended') {
    _ctx.resume().catch(() => {})
  }
  return _ctx
}

/** Play a tone: frequency (Hz), duration (s), waveform, optional volume scale */
function tone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  vol = 1.0,
  attack = 0.005,
  release = 0.08,
): void {
  const ctx = getCtx()
  if (!ctx) return

  const now = ctx.currentTime
  const gain = ctx.createGain()
  gain.connect(ctx.destination)

  // Envelope: quick attack, hold, gentle release to avoid clicks
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(_volume * vol, now + attack)
  gain.gain.setValueAtTime(_volume * vol, now + duration - release)
  gain.gain.linearRampToValueAtTime(0, now + duration)

  const osc = ctx.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(freq, now)
  osc.connect(gain)
  osc.start(now)
  osc.stop(now + duration)
}

/** Play a sequence of tones */
function sequence(
  notes: Array<{ freq: number; dur: number; delay?: number; type?: OscillatorType; vol?: number }>,
): void {
  let offset = 0
  for (const note of notes) {
    const delay = note.delay ?? 0
    offset += delay
    const capturedOffset = offset
    setTimeout(
      () => tone(note.freq, note.dur, note.type ?? 'sine', note.vol ?? 1),
      capturedOffset * 1000,
    )
    offset += note.dur
  }
}

// ─── Public sound effects ──────────────────────────────────────────────────────

export const sfx = {
  /**
   * S-02: Prime the AudioContext within a synchronous user gesture handler.
   * Call this at the very TOP of any async onClick before any `await` statements.
   * iOS Safari requires AudioContext creation/resume to happen within the same
   * synchronous call stack as the user gesture; after the first `await`, the
   * gesture context is lost and AudioContext will be silently blocked.
   */
  prime(): void {
    // Calling getCtx() creates and/or resumes the AudioContext within the gesture.
    // No sound plays — this is purely a context warm-up call.
    getCtx()
  },

  /**
   * S-07: Unlock <audio> element autoplay within a synchronous user gesture handler.
   * iOS Safari blocks programmatic audio.play() calls that happen outside a direct
   * user gesture (e.g. inside a useEffect after navigation). Call this at the very
   * TOP of any onClick that navigates to a page with TTS — it "blesses" the page for
   * subsequent audio.play() calls by touching a silent Audio element while the gesture
   * context is still active.
   *
   * Call alongside sfx.prime() so both Web Audio API and <audio> elements are unlocked:
   *   sfx.prime()
   *   sfx.unlockAudio()
   */
  unlockAudio(): void {
    try {
      // A 1-sample silent WAV as a data URI — plays and ends instantly.
      const silent = new Audio(
        'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='
      )
      silent.volume = 0
      silent.play().catch(() => {})
    } catch {
      // ignore — not all browsers support this; we try best-effort
    }
  },

  /** Enable or disable all sound effects */
  setEnabled(enabled: boolean): void {
    _enabled = enabled
  },

  /** Whether SFX are currently enabled */
  isEnabled(): boolean {
    return _enabled
  },

  /** Set master volume (0–1) */
  setVolume(vol: number): void {
    _volume = Math.max(0, Math.min(1, vol))
  },

  /** Soft click — buttons, navigation */
  click(): void {
    tone(880, 0.07, 'sine', 0.5, 0.002, 0.05)
  },

  /** Tile placed into a slot */
  drop(): void {
    sequence([
      { freq: 523, dur: 0.06, type: 'sine', vol: 0.6 },  // C5
      { freq: 659, dur: 0.07, type: 'sine', vol: 0.5 },  // E5
    ])
  },

  /** Slot cleared */
  clear(): void {
    tone(330, 0.08, 'triangle', 0.3)
  },

  /** Correct sentence — bright ascending arpeggio */
  success(): void {
    sequence([
      { freq: 523, dur: 0.1, type: 'sine', vol: 0.7 },   // C5
      { freq: 659, dur: 0.1, type: 'sine', vol: 0.7 },   // E5
      { freq: 784, dur: 0.15, type: 'sine', vol: 0.8 },  // G5
      { freq: 1047, dur: 0.2, type: 'sine', vol: 0.7 },  // C6
    ])
  },

  /** Incorrect sentence — low descending notes */
  error(): void {
    sequence([
      { freq: 349, dur: 0.12, type: 'triangle', vol: 0.5 },
      { freq: 277, dur: 0.18, type: 'triangle', vol: 0.4 },
    ])
  },

  /** Level complete / badge earned — celebratory fanfare */
  levelUp(): void {
    sequence([
      { freq: 523, dur: 0.1, type: 'sine', vol: 0.7 },
      { freq: 659, dur: 0.1, type: 'sine', vol: 0.7 },
      { freq: 784, dur: 0.1, type: 'sine', vol: 0.8 },
      { freq: 1047, dur: 0.08, type: 'sine', vol: 0.7 },
      { delay: 0.05, freq: 1319, dur: 0.25, type: 'sine', vol: 0.9 },
    ])
  },

  /** Star earned or shield used */
  star(): void {
    sequence([
      { freq: 1047, dur: 0.08, type: 'sine', vol: 0.6 },
      { freq: 1319, dur: 0.12, type: 'sine', vol: 0.5 },
    ])
  },

  /** Card flip / concept card advance */
  flip(): void {
    tone(660, 0.06, 'triangle', 0.35, 0.003, 0.04)
  },

  /** Unlock / new content revealed */
  unlock(): void {
    sequence([
      { freq: 698, dur: 0.08, type: 'sine', vol: 0.5 },
      { freq: 880, dur: 0.1, type: 'sine', vol: 0.6 },
      { freq: 1047, dur: 0.15, type: 'sine', vol: 0.55 },
    ])
  },
}
