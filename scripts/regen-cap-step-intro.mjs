/**
 * One-shot: regenerates ONLY cap-step--intro.mp3 with Alistair's voice.
 *
 * - Calls ElevenLabs to generate the updated audio
 * - Upserts the file in Supabase Storage (same path → same URL → no manifest change)
 * - Does NOT touch tts-manifest.ts
 *
 * Usage:
 *   ELEVENLABS_API_KEY=sk_... \
 *   ALISTAIR_VOICE_ID=l30f87tf05uxyknGdDw6 \
 *   SUPABASE_SERVICE_KEY=eyJ... \
 *   node scripts/regen-cap-step-intro.mjs
 *
 * Optional:
 *   SUPABASE_URL  — defaults to the WriFe Platform project
 */

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const ALISTAIR_VOICE_ID  = process.env.ALISTAIR_VOICE_ID
const SUPABASE_URL       = process.env.SUPABASE_URL || 'https://gzmgjkbtsvezfclmreru.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!ELEVENLABS_API_KEY || !ALISTAIR_VOICE_ID || !SUPABASE_SERVICE_KEY) {
  console.error('❌  Missing env vars. Set ELEVENLABS_API_KEY, ALISTAIR_VOICE_ID, SUPABASE_SERVICE_KEY.')
  process.exit(1)
}

const TEXT        = 'Now add the correct punctuation marks.'
const MODEL_ID    = 'eleven_turbo_v2_5'
const STORAGE_KEY = 'alistair/cap-step--intro.mp3'

const VOICE_SETTINGS = {
  stability:        0.55,
  similarity_boost: 0.75,
  style:            0.20,
  use_speaker_boost: true,
}

async function main() {
  // 1. Generate MP3 via ElevenLabs
  console.log(`🎙  Generating: "${TEXT}"`)
  const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ALISTAIR_VOICE_ID}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: TEXT, model_id: MODEL_ID, voice_settings: VOICE_SETTINGS }),
  })
  if (!ttsRes.ok) {
    const err = await ttsRes.text()
    throw new Error(`ElevenLabs error ${ttsRes.status}: ${err}`)
  }
  const mp3 = Buffer.from(await ttsRes.arrayBuffer())
  console.log(`✅  Audio generated (${mp3.length} bytes)`)

  // 2. Upsert into Supabase Storage (same path → URL unchanged)
  console.log(`📤  Uploading to ${SUPABASE_URL}/storage/v1/object/tts-audio/${STORAGE_KEY}`)
  const uploadRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/tts-audio/${STORAGE_KEY}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'audio/mpeg',
        'x-upsert': 'true',
      },
      body: mp3,
    }
  )
  if (!uploadRes.ok) {
    const err = await uploadRes.text()
    throw new Error(`Upload error ${uploadRes.status}: ${err}`)
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/tts-audio/${STORAGE_KEY}`
  console.log(`✅  Uploaded. Public URL:\n    ${publicUrl}`)
  console.log('\n🎉  Done — no manifest changes needed (same URL, new audio).')
}

main().catch(err => {
  console.error('\n❌', err.message)
  process.exit(1)
})
