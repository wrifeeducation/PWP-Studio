/**
 * WriFe TTS generation script
 *
 * Generates pre-baked ElevenLabs MP3s for fixed UI phrases and uploads
 * them to the Supabase `tts-audio` storage bucket.
 *
 * Usage:
 *   node scripts/generate-tts.mjs
 *
 * Required env vars (create a .env.tts file or export before running):
 *   ELEVENLABS_API_KEY   — your ElevenLabs API key
 *   SUPABASE_URL         — https://gzmgjkbtsvezfclmreru.supabase.co
 *   SUPABASE_SERVICE_KEY — service role key from Supabase project settings
 *
 * Files are uploaded to: tts-audio/{voiceName}/{phraseKey}.mp3
 * Public URL pattern:    {SUPABASE_URL}/storage/v1/object/public/tts-audio/{voiceName}/{phraseKey}.mp3
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Config ────────────────────────────────────────────────────────────────────

const ELEVENLABS_API_KEY   = process.env.ELEVENLABS_API_KEY
const SUPABASE_URL         = process.env.SUPABASE_URL || 'https://gzmgjkbtsvezfclmreru.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const AMELIA_VOICE_ID      = process.env.AMELIA_VOICE_ID
const ALISTAIR_VOICE_ID    = process.env.ALISTAIR_VOICE_ID

if (!ELEVENLABS_API_KEY) {
  console.error('❌  ELEVENLABS_API_KEY is not set.')
  process.exit(1)
}
if (!SUPABASE_SERVICE_KEY) {
  console.error('❌  SUPABASE_SERVICE_KEY is not set. Find it in Supabase → Project Settings → API → service_role key.')
  process.exit(1)
}
if (!AMELIA_VOICE_ID || !ALISTAIR_VOICE_ID) {
  console.error('❌  AMELIA_VOICE_ID and ALISTAIR_VOICE_ID are required.')
  console.error('    Find them in ElevenLabs → Voices → click a voice → the ID is in the URL or the voice card.')
  process.exit(1)
}

// ── Voice model ───────────────────────────────────────────────────────────────

const MODEL_ID = 'eleven_turbo_v2_5'   // fast + high quality, UK English

// Voice settings per character
const VOICE_SETTINGS = {
  amelia:  { stability: 0.45, similarity_boost: 0.80, style: 0.35, use_speaker_boost: true },
  alistair:{ stability: 0.55, similarity_boost: 0.75, style: 0.20, use_speaker_boost: true },
}

// ── Phrases ───────────────────────────────────────────────────────────────────
// key        → filename stem (used in useTTS lookup)
// text       → what ElevenLabs speaks
// voice      → 'amelia' (energetic) | 'alistair' (instructional)

const PHRASES = [
  // Session intro — Amelia
  { key: 'session-intro--new-user',   voice: 'amelia',   text: "Let's get started!" },
  { key: 'session-intro--returning',  voice: 'amelia',   text: "Welcome back! Let's practise." },
  { key: 'session-intro--watch',      voice: 'amelia',   text: 'Watch how to build your sentence.' },
  { key: 'session-intro--your-turn',  voice: 'amelia',   text: "That's how it works! Now it's your turn." },
  { key: 'session-intro--ready',      voice: 'amelia',   text: "I'm ready! Let's go." },

  // FormulaBuilder feedback — Alistair
  { key: 'feedback--correct',         voice: 'alistair', text: 'Well done! That sentence is correct.' },
  { key: 'feedback--try-again',       voice: 'alistair', text: 'Not quite — have another go.' },
  { key: 'feedback--great-sentence',  voice: 'alistair', text: 'Great sentence! You matched the pattern perfectly.' },
  { key: 'feedback--check-order',     voice: 'alistair', text: "Check the order of your words — does it match the pattern?" },

  // Capitalisation / punctuation step — Alistair
  { key: 'cap-step--intro',           voice: 'alistair', text: 'Now add the correct punctuation marks.' },
  { key: 'cap-step--done',            voice: 'alistair', text: 'Perfect punctuation!' },

  // XP / gamification — Amelia
  { key: 'xp--earned',                voice: 'amelia',   text: 'You earned XP! Keep going.' },
  { key: 'xp--streak',                voice: 'amelia',   text: "Amazing streak! You're on fire." },
  { key: 'xp--level-up',              voice: 'amelia',   text: "Level up! You've unlocked a new formula." },
]

// ── ElevenLabs helpers ────────────────────────────────────────────────────────

async function fetchVoices() {
  const res = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': ELEVENLABS_API_KEY }
  })
  if (!res.ok) throw new Error(`ElevenLabs voices fetch failed: ${res.status}`)
  const data = await res.json()
  return data.voices  // [{ voice_id, name, ... }]
}

async function generateMP3(voiceId, text, settings) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: settings,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${err}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

// ── Supabase Storage upload ───────────────────────────────────────────────────

async function uploadToStorage(filePath, buffer) {
  const url = `${SUPABASE_URL}/storage/v1/object/tts-audio/${filePath}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'audio/mpeg',
      'x-upsert': 'true',
    },
    body: buffer,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Storage upload failed for ${filePath} (${res.status}): ${err}`)
  }
  return `${SUPABASE_URL}/storage/v1/object/public/tts-audio/${filePath}`
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🎙  WriFe TTS generator\n')

  const voiceIds = { amelia: AMELIA_VOICE_ID, alistair: ALISTAIR_VOICE_ID }
  console.log(`✅  Amelia   → ${AMELIA_VOICE_ID}`)
  console.log(`✅  Alistair → ${ALISTAIR_VOICE_ID}\n`)

  // 2. Generate + upload each phrase
  const manifest = {}   // { key: publicUrl }
  let ok = 0, fail = 0

  for (const phrase of PHRASES) {
    const { key, voice, text } = phrase
    const voiceId = voiceIds[voice]
    const settings = VOICE_SETTINGS[voice]
    const storagePath = `${voice}/${key}.mp3`

    process.stdout.write(`  Generating [${voice}] "${key}"… `)
    try {
      const mp3 = await generateMP3(voiceId, text, settings)
      const publicUrl = await uploadToStorage(storagePath, mp3)
      manifest[key] = { url: publicUrl, voice, text }
      console.log('✅')
      ok++
    } catch (err) {
      console.log(`❌  ${err.message}`)
      fail++
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 300))
  }

  // 3. Write manifest to src/lib/tts-manifest.ts
  const manifestPath = path.join(__dirname, '../src/lib/tts-manifest.ts')
  const tsContent = `/**
 * Auto-generated by scripts/generate-tts.mjs — do not edit by hand.
 * Re-run the script to add new phrases.
 */
export const TTS_MANIFEST: Record<string, string> = ${JSON.stringify(
    Object.fromEntries(Object.entries(manifest).map(([k, v]) => [k, v.url])),
    null, 2
  )}
`
  fs.writeFileSync(manifestPath, tsContent, 'utf8')

  console.log(`\n✅  ${ok} phrases generated, ${fail} failed.`)
  console.log(`📄  Manifest written to src/lib/tts-manifest.ts`)
  console.log(`\nNext: commit tts-manifest.ts and deploy. useTTS will pick up the new files automatically.`)
}

main().catch(err => {
  console.error('\n❌  Unexpected error:', err.message)
  process.exit(1)
})
