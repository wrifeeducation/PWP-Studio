/**
 * Generate Alice level-intro MP3s for even-numbered levels 2–34.
 * Uses ElevenLabs API — uploads directly to Supabase Storage tts-audio bucket.
 * Files land at: amelia/level-intro--{N}.mp3
 * Voice ID: ZEt85AU1ui8Rr8FxNslW (Alice)
 */

const ELEVENLABS_KEY  = 'sk_cc36f9e6eb292c1c12a91dc4db1d7a95a5d86ba478d79824'
const ALICE_VOICE_ID  = 'ZEt85AU1ui8Rr8FxNslW'   // Alice voice
const MODEL_ID        = 'eleven_turbo_v2_5'
const SUPABASE_URL    = 'https://gzmgjkbtsvezfclmreru.supabase.co'
const SUPABASE_KEY    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bWdqa2J0c3ZlemZjbG1yZXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NjIyNjAsImV4cCI6MjA4MDUzODI2MH0.V6uTpnMjz9HYPBYWKnOMXo3VZBqnjB1BRq9S3c05L00'
const BUCKET          = 'tts-audio'
const RATE_MS         = 600   // stay under ElevenLabs rate limit

// Alice's voice settings — warm, clear, encouraging
const VOICE_SETTINGS = {
  stability: 0.70,
  similarity_boost: 0.80,
  style: 0.30,
  use_speaker_boost: true,
}

// Scripts for even levels 2–34 — Alice's perspective, encouraging female voice
const ALICE_SCRIPTS = {
  2:  "Level Two — well done for getting here! You already know the past tense from Level One. Now I'm going to show you two more: the present tense and the continuous tense. One subject, three ways of moving through time. Let's explore.",
  4:  "Welcome to Level Four! Today we add something new: the object noun. Your sentence now has three parts — a subject, a verb, and what the verb is acting on. Sam kicked a ball. The ball is new. Watch where it goes.",
  6:  "Level Six! The determiner now moves to the object noun as well. The boy kicked the ball. Both nouns have their own determiner now. Today you'll practise placing the right one in front of each. You're doing brilliantly.",
  8:  "Level Eight — and you're doing so well! The adjective moves to the object noun this time. Sam kicked the red ball. You already know where adjectives go — now place one in front of the object. Notice how it changes the picture.",
  10: "Level Ten — you have reached free writing! From here, there is no word bank and no example sentence. Just the subject chip and your own knowledge. Everything you have learned is yours now. Write from memory. I believe in you.",
  12: "Level Twelve — wonderful progress! You are deep into free composition now. The formulas live in your memory. Each sentence you write is proof of how far you have come. Carry on — you are doing something remarkable.",
  14: "Level Fourteen! Every level from here is you building on a solid foundation. Your sentences are growing more complex and more confident. Take a moment to notice how much you can do now that you couldn't before.",
  16: "Level Sixteen — you are really motoring now! The formula is yours. Every word class has its place and you know where to put each one. Today's practice is about fluency — writing the pattern smoothly and quickly.",
  18: "Level Eighteen! Look at how far you've come since Level One. A simple noun and verb has grown into something so much richer. Today we keep building. Trust your instincts — you know more than you think.",
  20: "Level Twenty — halfway through the programme and you are going strong! Your sentence-writing skills are becoming automatic. That is exactly what we are aiming for. Keep that momentum going today.",
  22: "Level Twenty-Two! Your sentences have real shape and texture now. You are making deliberate choices about every word. That is what skilled writers do. Today, keep that care and keep that confidence.",
  24: "Level Twenty-Four — excellent work reaching this point! Each session you have shown up and practised. That consistency is building something lasting. The formula is deep in your memory now. Use it well today.",
  26: "Level Twenty-Six! You are in the upper half of the programme. The writing habits you are building now will serve you in every subject and every piece of writing you do for years to come. That matters enormously.",
  28: "Level Twenty-Eight — nearly there! Your control over sentence structure is impressive. You write with precision and purpose. Today is another opportunity to show what you are capable of. I know you will do well.",
  30: "Level Thirty — what an achievement to reach this point! Three quarters of the programme complete. Your sentence-writing is strong, controlled, and expressive. The final stretch begins now. Finish with the same care you started with.",
  32: "Level Thirty-Two! You are in the final section of the programme. Every sentence you write now draws on everything — all thirty-one levels of practice. That is a lot of knowledge. Use every bit of it today.",
  34: "Level Thirty-Four — one level from the finish! You have worked through this entire programme with dedication. Today is your penultimate practice. Write carefully, write confidently, and get ready to complete something truly worth celebrating.",
}

async function generateAudio(text) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ALICE_VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: VOICE_SETTINGS,
      }),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ElevenLabs ${res.status}: ${err}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

async function uploadFile(levelNum, buffer) {
  const path = `amelia/level-intro--${levelNum}.mp3`
  const url  = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`
  const res  = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'audio/mpeg',
      'x-upsert': 'true',
    },
    body: buffer,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Upload ${res.status}: ${err}`)
  }
  return path
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  const levels = Object.keys(ALICE_SCRIPTS).map(Number).sort((a,b) => a - b)
  console.log(`🎙  Generating Alice level intros for levels: ${levels.join(', ')}`)
  console.log('')

  let ok = 0, fail = 0
  for (let i = 0; i < levels.length; i++) {
    const n = levels[i]
    process.stdout.write(`[${i+1}/${levels.length}] Level ${n} ... `)
    try {
      const buf  = await generateAudio(ALICE_SCRIPTS[n])
      const path = await uploadFile(n, buf)
      console.log(`✅  uploaded → ${path}`)
      ok++
    } catch (e) {
      console.log(`❌  ${e.message}`)
      fail++
    }
    if (i < levels.length - 1) await sleep(RATE_MS)
  }

  console.log('')
  console.log(`✅  Done: ${ok} uploaded, ${fail} failed`)
}

main().catch(e => { console.error(e); process.exit(1) })
