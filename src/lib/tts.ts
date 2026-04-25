/**
 * WF-031: Text-to-Speech utility — wraps window.speechSynthesis.
 * Exports speak, stopSpeaking, isSpeaking.
 */

/**
 * Speak a string using the Web Speech API.
 * Automatically selects a UK English voice if available.
 * @param text - The text to speak
 * @param rate - Speech rate (default 0.85, child-appropriate)
 * @param pitch - Speech pitch (default 1.1)
 */
export const speak = (text: string, rate = 0.85, pitch = 1.1): void => {
  if (!window.speechSynthesis) return

  // Stop any current speech first
  stopSpeaking()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-GB'
  utterance.rate = rate
  utterance.pitch = pitch

  // Pick a UK English voice if available
  const voices = window.speechSynthesis.getVoices()
  const ukVoice = voices.find(
    (v) => v.lang === 'en-GB' || v.lang.startsWith('en-GB')
  )
  if (ukVoice) utterance.voice = ukVoice

  window.speechSynthesis.speak(utterance)
}

/** Stop any currently playing speech. */
export const stopSpeaking = (): void => {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
}

/** Returns true if the speech synthesiser is currently speaking. */
export const isSpeaking = (): boolean => {
  if (!window.speechSynthesis) return false
  return window.speechSynthesis.speaking
}
