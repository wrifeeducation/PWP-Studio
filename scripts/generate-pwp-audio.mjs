/**
 * WriFe PWP — Audio Generation Script
 * Generates all 153 audio files from ElevenLabs and saves them locally.
 * Run: node generate-pwp-audio.mjs
 *
 * After generation, run with --upload flag to push to Supabase Storage:
 *   SUPABASE_SERVICE_ROLE_KEY=your_key node generate-pwp-audio.mjs --upload
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ──────────────────────────────────────────────────────────────────
const ELEVENLABS_API_KEY  = 'sk_cc36f9e6eb292c1c12a91dc4db1d7a95a5d86ba478d79824';
const ALISTAIR_VOICE_ID   = 'l30f87tf05uxyknGdDw6';
const AMELIA_VOICE_ID     = 'ZF6FPAbjXT4488VcRRnw';
const ALICE_VOICE_ID      = 'ZEt85AU1ui8Rr8FxNslW';  // Alice — variety voice
const MODEL_ID            = 'eleven_turbo_v2_5';   // fast + high quality
const SUPABASE_URL        = 'https://gzmgjkbtsvezfclmreru.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET              = 'pwp-audio';

const VOICE_SETTINGS = {
  alistair: { stability: 0.65, similarity_boost: 0.80, style: 0.20, use_speaker_boost: true },
  amelia:   { stability: 0.65, similarity_boost: 0.80, style: 0.35, use_speaker_boost: true },
  alice:    { stability: 0.70, similarity_boost: 0.75, style: 0.25, use_speaker_boost: true },
};

const OUTPUT_DIR     = join(__dirname, 'pwp-audio');
const PROGRESS_FILE  = join(__dirname, 'pwp-audio-progress.json');
const RESULTS_FILE   = join(__dirname, 'pwp-audio-results.json');
const SQL_FILE       = process.env.SQL_FILE || '/sessions/dreamy-tender-sagan/mnt/PWP Formulas/pwp_audio_seed.sql';

const RATE_LIMIT_MS  = 500;   // 500ms between requests (~2 req/s, well within free tier limits)
const DO_UPLOAD      = process.argv.includes('--upload');

// ─── Parse SQL seed file ─────────────────────────────────────────────────────
function parseAudioSeed(sqlPath) {
  const sql = readFileSync(sqlPath, 'utf8');
  const rows = [];

  // Line-by-line parse — each VALUES row starts with ('
  for (const line of sql.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("('")) continue;

    // Strip outer parens and trailing comma/semicolon
    const inner = trimmed.replace(/^\(/, '').replace(/[),;]+\s*$/, '');

    // Walk character-by-character to split 6 single-quoted fields
    const fields = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < inner.length; i++) {
      const ch = inner[i];
      if (ch === "'" && inner[i + 1] === "'") { current += "'"; i++; continue; } // escaped ''
      if (ch === "'") { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { fields.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    fields.push(current.trim());

    if (fields.length === 6) {
      rows.push({
        key:          fields[0],
        voice:        fields[1],
        category:     fields[2],
        label:        fields[3],
        storage_path: fields[4],
        script:       fields[5],
      });
    }
  }

  if (rows.length === 0) throw new Error('No rows parsed from SQL file — check format');
  return rows;
}

// ─── Load/save progress ──────────────────────────────────────────────────────
function loadProgress() {
  if (existsSync(PROGRESS_FILE)) {
    return JSON.parse(readFileSync(PROGRESS_FILE, 'utf8'));
  }
  return { completed: [], failed: [] };
}

function saveProgress(progress) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// ─── ElevenLabs API call ─────────────────────────────────────────────────────
async function generateAudio(row) {
  const voiceMap = { alistair: ALISTAIR_VOICE_ID, amelia: AMELIA_VOICE_ID, alice: ALICE_VOICE_ID };
  const voiceId = voiceMap[row.voice] ?? AMELIA_VOICE_ID;
  const settings = VOICE_SETTINGS[row.voice] ?? VOICE_SETTINGS.amelia;

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: row.script,
        model_id: MODEL_ID,
        voice_settings: settings,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ElevenLabs API error ${response.status}: ${err}`);
  }

  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}

// ─── Save file locally ───────────────────────────────────────────────────────
function saveFileLocally(row, buffer) {
  const localPath = join(OUTPUT_DIR, row.storage_path);
  const dir = dirname(localPath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(localPath, buffer);
  return localPath;
}

// ─── Get MP3 duration (rough estimate from file size at 128kbps) ─────────────
function estimateDurationMs(buffer) {
  // 128kbps MP3: bytes / (128000/8) * 1000 ms
  return Math.round((buffer.length / 16000) * 1000);
}

// ─── Upload to Supabase Storage ──────────────────────────────────────────────
async function uploadToSupabase(row, buffer) {
  if (!SUPABASE_SERVICE_KEY) {
    console.log('  ⚠ No service role key — skipping upload');
    return false;
  }

  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${row.storage_path}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'audio/mpeg',
      'x-upsert': 'true',
    },
    body: buffer,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Supabase upload error ${response.status}: ${err}`);
  }
  return true;
}

// ─── Sleep ───────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🎙  WriFe PWP — Audio Generation');
  console.log(`📂  Output dir:    ${OUTPUT_DIR}`);
  console.log(`📋  SQL file:      ${SQL_FILE}`);
  console.log(`☁   Upload mode:   ${DO_UPLOAD ? 'YES (will upload to Supabase)' : 'NO (local only)'}`);
  console.log('');

  // Parse SQL
  let rows;
  try {
    rows = parseAudioSeed(SQL_FILE);
    console.log(`✅  Parsed ${rows.length} audio rows from SQL`);
  } catch (e) {
    console.error('❌  Failed to parse SQL:', e.message);
    process.exit(1);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const progress = loadProgress();
  const completedKeys = new Set(progress.completed.map(r => r.key));
  const results = [...progress.completed];

  const remaining = rows.filter(r => !completedKeys.has(r.key));
  console.log(`📊  Total: ${rows.length} | Already done: ${progress.completed.length} | Remaining: ${remaining.length}`);

  // If --upload, also find already-generated files that haven't been uploaded yet
  const needsUpload = DO_UPLOAD
    ? progress.completed.filter(r => !r.uploaded)
    : [];
  if (DO_UPLOAD) {
    console.log(`☁   Needs upload:  ${needsUpload.length}`);
  }
  console.log('');

  // ── Upload already-generated files that weren't uploaded yet ──
  if (needsUpload.length > 0) {
    console.log('☁   Uploading previously generated files...');
    for (let i = 0; i < needsUpload.length; i++) {
      const rec = needsUpload[i];
      process.stdout.write(`[${i + 1}/${needsUpload.length}] ${rec.key} ... `);
      try {
        const buffer = readFileSync(rec.localPath);
        await uploadToSupabase({ storage_path: rec.storage_path }, buffer);
        // Mark as uploaded in progress
        const idx = progress.completed.findIndex(r => r.key === rec.key);
        if (idx !== -1) progress.completed[idx].uploaded = true;
        saveProgress(progress);
        console.log('☁ uploaded');
      } catch (err) {
        console.log(`❌  ${err.message}`);
      }
      if (i < needsUpload.length - 1) await sleep(100);
    }
    console.log('');
  }

  if (remaining.length === 0 && needsUpload.length === 0) {
    console.log('✅  All files already generated and uploaded!');
  }

  // ── Generate (and optionally upload) new files ──
  for (let i = 0; i < remaining.length; i++) {
    const row = remaining[i];
    const n = progress.completed.length + i + 1;
    process.stdout.write(`[${n}/${rows.length}] ${row.key} (${row.voice}) ... `);

    try {
      // Generate
      const buffer = await generateAudio(row);
      const duration_ms = estimateDurationMs(buffer);

      // Save locally
      const localPath = saveFileLocally(row, buffer);

      // Upload if flag set
      let uploaded = false;
      if (DO_UPLOAD) {
        uploaded = await uploadToSupabase(row, buffer);
      }

      const result = { key: row.key, voice: row.voice, storage_path: row.storage_path, duration_ms, localPath, uploaded };
      results.push(result);
      progress.completed.push(result);
      saveProgress(progress);

      console.log(`✅  ${duration_ms}ms  ${uploaded ? '☁ uploaded' : '💾 saved'}`);

    } catch (err) {
      console.log(`❌  ${err.message}`);
      progress.failed.push({ key: row.key, error: err.message, timestamp: new Date().toISOString() });
      saveProgress(progress);
    }

    // Rate limit
    if (i < remaining.length - 1) await sleep(RATE_LIMIT_MS);
  }

  // Write final results
  writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));

  console.log('');
  console.log('─'.repeat(60));
  console.log(`✅  Completed: ${progress.completed.length}/${rows.length}`);
  if (progress.failed.length > 0) {
    console.log(`❌  Failed:    ${progress.failed.length}`);
    progress.failed.forEach(f => console.log(`   - ${f.key}: ${f.error}`));
  }
  console.log(`📄  Results saved to: ${RESULTS_FILE}`);
  console.log('');

  if (!DO_UPLOAD && progress.completed.length > 0) {
    console.log('💡  To upload to Supabase Storage, run:');
    console.log('    SUPABASE_SERVICE_ROLE_KEY=<key> node generate-pwp-audio.mjs --upload');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
