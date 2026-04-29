/**
 * Formula Level Integrity Check
 * ─────────────────────────────
 * Connects to Supabase and audits every formula_level row for consistency:
 *
 *   1. Every word_class in formula_elements has a matching key in word_banks
 *   2. Every word bank has ≥ 4 words (enough to show a meaningful choice)
 *   3. formula_elements are in sequential order (no gaps or duplicates)
 *   4. All required fields are present
 *
 * Run with: npm run check:db
 *
 * Exits with code 1 if any issue is found (CI-friendly).
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

// Load .env.local then .env
const envLocal = path.resolve(process.cwd(), '.env.local')
const envFile = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envLocal)) dotenv.config({ path: envLocal })
else if (fs.existsSync(envFile)) dotenv.config({ path: envFile })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ─── types ────────────────────────────────────────────────────────────────────

interface FormulaElement {
  position: number
  word_class: string
  required: boolean
  instruction: string
  example: string
}

interface FormulaLevelRow {
  id: number
  phase: string
  formula_elements: FormulaElement[]
  word_banks: Record<string, string[]>
  subject_rotation_bank: string[]
}

// ─── checks ───────────────────────────────────────────────────────────────────

interface Issue {
  level: number
  check: string
  detail: string
}

function auditLevel(row: FormulaLevelRow): Issue[] {
  const issues: Issue[] = []
  const { id, formula_elements, word_banks, subject_rotation_bank } = row

  // 1. Required fields present
  if (!formula_elements || !Array.isArray(formula_elements) || formula_elements.length === 0) {
    issues.push({ level: id, check: 'formula_elements', detail: 'Missing or empty formula_elements' })
    return issues // can't check further
  }
  if (!word_banks || typeof word_banks !== 'object') {
    issues.push({ level: id, check: 'word_banks', detail: 'Missing or invalid word_banks' })
    return issues
  }

  // 2. Every word_class in formula_elements has a matching bank
  const requiredClasses = new Set(formula_elements.map((el) => el.word_class))
  for (const cls of requiredClasses) {
    if (!word_banks[cls]) {
      issues.push({
        level: id,
        check: 'word_bank_missing',
        detail: `formula_elements requires word_class "${cls}" but word_banks has no "${cls}" key`,
      })
    }
  }

  // 3. Each present bank has ≥ 4 words
  for (const [cls, words] of Object.entries(word_banks)) {
    if (!Array.isArray(words) || words.length < 4) {
      issues.push({
        level: id,
        check: 'word_bank_too_small',
        detail: `word_banks["${cls}"] has only ${words?.length ?? 0} words (minimum 4)`,
      })
    }
  }

  // 4. formula_elements positions are sequential (1, 2, 3 …) with no gaps
  const positions = formula_elements.map((el) => el.position).sort((a, b) => a - b)
  for (let i = 0; i < positions.length; i++) {
    if (positions[i] !== i + 1) {
      issues.push({
        level: id,
        check: 'positions_non_sequential',
        detail: `Positions are [${positions.join(', ')}] — expected [${Array.from({ length: positions.length }, (_, i) => i + 1).join(', ')}]`,
      })
      break
    }
  }

  // 5. Each element has required fields
  for (const el of formula_elements) {
    if (!el.word_class) {
      issues.push({ level: id, check: 'element_missing_word_class', detail: `Element at position ${el.position} has no word_class` })
    }
    if (!el.instruction) {
      issues.push({ level: id, check: 'element_missing_instruction', detail: `Element at position ${el.position} has no instruction` })
    }
    if (!el.example) {
      issues.push({ level: id, check: 'element_missing_example', detail: `Element at position ${el.position} has no example` })
    }
  }

  // 6. Subject rotation bank is present
  if (!subject_rotation_bank || !Array.isArray(subject_rotation_bank) || subject_rotation_bank.length === 0) {
    issues.push({ level: id, check: 'subject_rotation_bank', detail: 'Missing or empty subject_rotation_bank' })
  }

  return issues
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔍  WriFe Formula Level Integrity Check\n')

  const { data: levels, error } = await supabase
    .from('formula_levels')
    .select('id, phase, formula_elements, word_banks, subject_rotation_bank')
    .order('id')

  if (error) {
    console.error('❌  Failed to fetch formula_levels:', error.message)
    process.exit(1)
  }

  if (!levels || levels.length === 0) {
    console.error('❌  No formula_levels found in database')
    process.exit(1)
  }

  console.log(`   Checking ${levels.length} formula levels…\n`)

  const allIssues: Issue[] = []

  for (const row of levels as FormulaLevelRow[]) {
    const issues = auditLevel(row)
    if (issues.length > 0) {
      allIssues.push(...issues)
      for (const issue of issues) {
        console.log(`   ⚠️  L${issue.level} [${issue.check}]: ${issue.detail}`)
      }
    }
  }

  console.log()

  if (allIssues.length === 0) {
    console.log(`✅  All ${levels.length} formula levels passed integrity checks.\n`)
    process.exit(0)
  } else {
    const levelCount = new Set(allIssues.map((i) => i.level)).size
    console.log(`❌  Found ${allIssues.length} issue(s) across ${levelCount} level(s). Fix the above before deploying.\n`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
