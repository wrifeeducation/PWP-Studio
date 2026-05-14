/**
 * WF-031: Text-to-Speech utility — wraps window.speechSynthesis.
 *
 * Hardened against three Chrome Web Speech API bugs:
 *
 *  Bug 1 — cancel() + speak() in the same tick:
 *    Chrome silently drops the utterance if cancel() and speak() are called
 *    in the same synchronous block. Fix: always defer speak() by 50 ms.
 *
 *  Bug 2 — getVoices() returns [] on first call:
 *    Chrome loads voices asynchronously. If voices aren't ready we wait for
 *    the 'voiceschanged' event, then speak. A 1 s failsafe covers browsers
 *    that never fire 'voiceschanged'.
 *
 *  Bug 3 — onend not firing:
 *    Chrome sometimes doesn't fire onend when no explicit voice is set.
 *    Fix: onerror handler also calls onEnd (for non-interrupted errors).
 */

const SPEAK_DELAY_MS = 50   // must be > 0 to clear Chrome's cancel state
const VOICES_TIMEOUT_MS = 1000

/**
 * Speak a string using the Web Speech API.
 * @param text   – The text to speak
 * @param rate   – Speech rate (default 0.85, child-appropriate)
 * @param pitch  – Speech pitch (default 1.05)
 * @param onEnd  – Called when speech finishes (or errors)
 */
export const speak = (
  text: string,
  rate = 0.85,
  pitch = 1.05,
  onEnd?: () => void,
): void => {
  if (!('speechSynthesis' in window)) {
    onEnd?.()
    return
  }

  const synth = window.speechSynthesis

  // Cancel any in-flight speech (only if something is actually playing)
  if (synth.speaking || synth.pending) synth.cancel()

  const buildAndSpeak = () => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-GB'
    utterance.rate = rate
    utterance.pitch = pitch

    // Prefer a high-quality UK English voice by name, then fall back to any en-GB / en voice.
    // Named voices ranked: Daniel and Rishi are the best-quality en-GB voices on macOS/iOS.
    // "Google UK English Male/Female" cover Chrome on Android/desktop.
    const voices = synth.getVoices()
    const PREFERRED_NAMES = ['Daniel', 'Rishi', 'Google UK English Male', 'Google UK English Female', 'Arthur']
    const preferred =
      PREFERRED_NAMES.reduce<SpeechSynthesisVoice | undefined>(
        (found, name) => found ?? voices.find((v) => v.name === name),
        undefined,
      ) ??
      voices.find((v) => v.lang === 'en-GB') ??
      voices.find((v) => v.lang.startsWith('en-GB')) ??
      voices.find((v) => v.lang.startsWith('en'))
    if (preferred) utterance.voice = preferred

    utterance.onend = () => onEnd?.()
    utterance.onerror = (e) => {
      // 'interrupted' means cancel() was called deliberately — not a real error
      if (e.error !== 'interrupted') onEnd?.()
    }

    synth.speak(utterance)
  }

  const voices = synth.getVoices()

  if (voices.length > 0) {
    // Voices ready — delay to clear Chrome's cancel state (Bug 1)
    setTimeout(buildAndSpeak, SPEAK_DELAY_MS)
  } else {
    // Voices not loaded yet (Bug 2) — wait for voiceschanged
    let done = false

    const onVoicesChanged = () => {
      if (done) return
      done = true
      synth.removeEventListener('voiceschanged', onVoicesChanged)
      setTimeout(buildAndSpeak, SPEAK_DELAY_MS)
    }

    synth.addEventListener('voiceschanged', onVoicesChanged)

    // Failsafe: some browsers never fire voiceschanged
    setTimeout(() => {
      if (done) return
      done = true
      synth.removeEventListener('voiceschanged', onVoicesChanged)
      buildAndSpeak()
    }, VOICES_TIMEOUT_MS)
  }
}

/** Stop any currently playing speech. */
export const stopSpeaking = (): void => {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
}

/** Returns true if the speech synthesiser is currently speaking. */
export const isSpeaking = (): boolean => {
  if (!('speechSynthesis' in window)) return false
  return window.speechSynthesis.speaking
}
