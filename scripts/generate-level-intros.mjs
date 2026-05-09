/**
 * WriFe — generate Alistair narration for all formula level intros.
 *
 * Fetches every formula level from Supabase, builds a narration string,
 * generates an MP3 with Alistair's ElevenLabs voice, uploads to Supabase
 * Storage, and appends the entries to src/lib/tts-manifest.ts.
 *
 * Usage:
 *   node scripts/generate-level-intros.mjs
 *
 * Required env vars:
 *   ELEVENLABS_API_KEY    — ElevenLabs API key
 *   ALISTAIR_VOICE_ID     — ElevenLabs voice ID for Alistair
 *   SUPABASE_SERVICE_KEY  — service role key (for Storage uploads)
 *
 * Optional:
 *   SUPABASE_URL          — defaults to the WriFe Platform project URL
 *   SUPABASE_ANON_KEY     — for fetching formula levels (public read)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Config ────────────────────────────────────────────────────────────────────

const ELEVENLABS_API_KEY  = process.env.ELEVENLABS_API_KEY
const ALISTAIR_VOICE_ID   = process.env.ALISTAIR_VOICE_ID
const SUPABASE_URL        = process.env.SUPABASE_URL || 'https://gzmgjkbtsvezfclmreru.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const SUPABASE_ANON_KEY   = process.env.SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bWdqa2J0c3ZlemZjbG1yZXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MjU4NzAsImV4cCI6MjA2MTAwMTg3MH0.VyFjhqPpxaLN3Y1lHMV5yAj5eDQfQg8OGrZJPqMBf7E'

if (!ELEVENLABS_API_KEY || !ALISTAIR_VOICE_ID || !SUPABASE_SERVICE_KEY) {
  console.error('❌  Missing required env vars: ELEVENLABS_API_KEY, ALISTAIR_VOICE_ID, SUPABASE_SERVICE_KEY')
  process.exit(1)
}

// ── Plain English word class names (mirrors WORD_CLASS_DEFINITIONS) ───────────

const PLAIN_NAMES = {
  noun:        'naming word',
  verb:        'doing word',
  determiner:  'pointer word',
  adjective:   'describing word',
  adverb:      'how word',
  preposition: 'position word',
  conjunction: 'joining word',
  pronoun:     'replacing word',
}

// ── Narration builder (mirrors SessionIntro.tsx buildExampleNarration) ────────

function buildNarration(formulaElements) {
  if (!formulaElements.length) return null

  const fragments = formulaElements.map((el, i) => {
    const plainName = PLAIN_NAMES[el.word_class] ?? el.word_class
    const word = el.example ?? ''
    if (i === 0) return `My ${plainName} is ${word}`
    if (i === formulaElements.length - 1) return `and my ${plainName} is ${word}`
    return `my ${plainName} is ${word}`
  })

  const sentence = formulaElements.map(el => el.example ?? '').join(' ')

  const listStr = fragments.length === 1
    ? fragments[0]
    : fragments.slice(0, -1).join(', ') + ', ' + fragments[fragments.length - 1]

  return `Watch me build a sentence. ${listStr}. ${sentence}!`
}

// ── ElevenLabs ────────────────────────────────────────────────────────────────

const VOICE_SETTINGS = { stability: 0.55, similarity_boost: 0.75, style: 0.20, use_speaker_boost: true }
const MODEL_ID = 'eleven_turbo_v2_5'

async function generateMP3(text) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ALISTAIR_VOICE_ID}`, {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: MODEL_ID, voice_settings: VOICE_SETTINGS }),
  })
  if (!res.ok) throw new Error(`ElevenLabs error ${res.status}: ${await res.text()}`)
  return Buffer.from(await res.arrayBuffer())
}

// ── Supabase Storage upload ───────────────────────────────────────────────────

async function upload(storagePath, buffer) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/tts-audio/${storagePath}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'audio/mpeg',
      'x-upsert': 'true',
    },
    body: buffer,
  })
  if (!res.ok) throw new Error(`Upload failed ${res.status}: ${await res.text()}`)
  return `${SUPABASE_URL}/storage/v1/object/public/tts-audio/${storagePath}`
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🎙  WriFe level-intro generator (Alistair)\n')

  // 1. Fetch all formula levels
  console.log('Fetching formula levels from Supabase…')
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/formula_levels?select=id,formula_elements&order=id`,
    { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
  )
  if (!res.ok) throw new Error(`Supabase fetch failed: ${res.status}`)
  const levels = await res.json()
  console.log(`Found ${levels.length} levels.\n`)

  // 2. Load existing manifest
  const manifestPath = path.join(__dirname, '../src/lib/tts-manifest.ts')
  const manifestSrc = fs.readFileSync(manifestPath, 'utf8')
  // Extract existing entries
  const existingMatch = manifestSrc.match(/export const TTS_MANIFEST[^=]+=\s*(\{[\s\S]*?\})/)
  const existing = existingMatch ? JSON.parse(existingMatch[1]) : {}

  const newEntries = { ...existing }
  let ok = 0, skip = 0, fail = 0

  // 3. Generate + upload each level
  for (const level of levels) {
    const key = `level-intro--${level.id}`

    // Skip if already generated
    if (newEntries[key]) {
      console.log(`  [skip] ${key} — already in manifest`)
      skip++
      continue
    }

    const narration = buildNarration(level.formula_elements)
    if (!narration) { skip++; continue }

    process.stdout.write(`  Generating L${level.id}: "${narration.slice(0, 60)}…" `)
    try {
      const mp3 = await generateMP3(narration)
      const url = await upload(`alistair/${key}.mp3`, mp3)
      newEntries[key] = url
      console.log('✅')
      ok++
    } catch (err) {
      console.log(`❌  ${err.message}`)
      fail++
    }

    // Rate limit buffer
    await new Promise(r => setTimeout(r, 350))
  }

  // 4. Write updated manifest
  const tsContent = `/**
 * Auto-generated by scripts/generate-tts.mjs / generate-level-intros.mjs — do not edit by hand.
 * Re-run the scripts to add new phrases.
 */
export const TTS_MANIFEST: Record<string, string> = ${JSON.stringify(newEntries, null, 2)}
`
  fs.writeFileSync(manifestPath, tsContent, 'utf8')

  console.log(`\n✅  ${ok} generated, ${skip} skipped, ${fail} failed.`)
  console.log(`📄  Manifest updated: src/lib/tts-manifest.ts`)
  console.log(`\nNext: commit tts-manifest.ts and push to deploy.`)
}

main().catch(err => {
  console.error('\n❌', err.message)
  process.exit(1)
})
