/**
 * generate-session-content — Phase 3 Edge Function
 *
 * Generates a fresh, subject-rotated session payload for a formula practice session.
 *
 * Input (JSON body):
 *   pupil_id      string   — UUID of the pupil
 *   level_id      number   — formula_levels.id
 *   scaffold_stage number  — current scaffold stage (1–4); defaults to 1
 *
 * Output:
 *   subject           string   — the subject chosen for today (e.g. "knight")
 *   context_sentence  string   — AI-generated model sentence using today's subject + formula
 *   word_bank_subset  object   — { [wordClass]: string[] } curated word bank for this session
 *   distractor_words  object   — { [wordClass]: string[] } wrong-class words (stage 3+)
 *
 * Word bank morphology guarantees (prevents unfair assessment penalties):
 *   verb        — 3 base forms expanded to [base, 3rd-person-singular] pairs (6 tiles total)
 *                 so pupils always have the correct agreement form available
 *   determiner  — "a" and "an" are always included together if both exist in the level bank
 *                 so pupils are never forced into "a" before a vowel-starting word
 *   pronoun     — subject/object counterparts are always paired (he/him, she/her, etc.)
 *                 so pupils always have both forms available for any pronoun they choose
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ─── CORS ────────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormulaElement {
  word_class: string;
  position: number;
}

interface FormulaLevel {
  id: number;
  word_banks: Record<string, string[]>;
  subject_rotation_bank: string[];
  formula_elements: FormulaElement[];
}

interface SessionContent {
  subject: string;
  context_sentence: string | null;
  word_bank_subset: Record<string, string[]>;
  distractor_words: Record<string, string[]>;
}

// ─── Verb inflection ──────────────────────────────────────────────────────────

/**
 * Small table of irregular third-person singular present tense forms.
 * All other verbs follow the regular rules below.
 */
const IRREGULAR_VERB_SINGULAR: Record<string, string> = {
  be: "is",
  have: "has",
  do: "does",
  go: "goes",
  say: "says",
  make: "makes",
  know: "knows",
};

/**
 * Returns the third-person singular present tense of a verb (he/she/it ___s).
 * Rules applied in order:
 *   1. Irregular table
 *   2. Ends in ss/sh/ch/x/z → add "es"  (watch→watches, mix→mixes)
 *   3. Ends in consonant + y → drop y, add "ies"  (fly→flies, carry→carries)
 *   4. Default → add "s"  (dance→dances, run→runs)
 */
function inflectVerbSingular(base: string): string {
  if (base in IRREGULAR_VERB_SINGULAR) return IRREGULAR_VERB_SINGULAR[base];
  if (/(?:ss|sh|ch|x|z)$/.test(base)) return base + "es";
  if (/[^aeiou]y$/.test(base)) return base.slice(0, -1) + "ies";
  return base + "s";
}

// ─── Pronoun subject/object pairing ──────────────────────────────────────────

/**
 * Maps each pronoun to its subject/object counterpart.
 * "you" and "it" are invariant — no counterpart needed.
 */
const PRONOUN_COUNTERPART: Record<string, string> = {
  // subject → object
  i: "me",
  he: "him",
  she: "her",
  we: "us",
  they: "them",
  // object → subject
  me: "i",
  him: "he",
  her: "she",
  us: "we",
  them: "they",
};

/**
 * Expands a pronoun list to include subject/object counterparts.
 * Ensures pupils always have both forms available when a pronoun slot is present.
 */
function expandPronounBank(pronouns: string[]): string[] {
  const set = new Set<string>(pronouns.map((p) => p.toLowerCase()));
  for (const p of pronouns) {
    const counterpart = PRONOUN_COUNTERPART[p.toLowerCase()];
    if (counterpart) set.add(counterpart);
  }
  return Array.from(set);
}

// ─── Subject rotation ─────────────────────────────────────────────────────────

/**
 * Pick a subject from the bank that the pupil hasn't used in recent sessions.
 * If all subjects have been used recently, pick the least-recently-used.
 */
function pickSubject(bank: string[], recentSubjects: string[]): string {
  const fresh = bank.filter((s) => !recentSubjects.includes(s));
  if (fresh.length > 0) {
    return fresh[Math.floor(Math.random() * fresh.length)];
  }
  const mostRecent3 = new Set(recentSubjects.slice(0, 3));
  const leastRecent = bank.filter((s) => !mostRecent3.has(s));
  if (leastRecent.length > 0) {
    return leastRecent[Math.floor(Math.random() * leastRecent.length)];
  }
  return bank[Math.floor(Math.random() * bank.length)];
}

// ─── Word bank subset ─────────────────────────────────────────────────────────

/**
 * Build a curated word bank for this session with morphology guarantees:
 *
 * noun        — chosen subject guaranteed in slot; capped at 6, shuffled
 * verb        — 3 base forms picked, each expanded to [base, singular] = 6 tiles
 *               e.g. ["dance","dances","run","runs","sleep","sleeps"] (then shuffled)
 * determiner  — "a" and "an" always paired together if both in level bank;
 *               remaining slots filled from the rest; capped at 6
 * pronoun     — each pronoun's subject/object counterpart added automatically;
 *               capped at 6, shuffled
 * all others  — random shuffle, capped at 6
 */
function buildWordBankSubset(
  wordBanks: Record<string, string[]>,
  subject: string
): Record<string, string[]> {
  const subset: Record<string, string[]> = {};

  for (const [wordClass, words] of Object.entries(wordBanks)) {
    let result: string[];

    if (wordClass === "noun") {
      // Guarantee the chosen subject is present; shuffle the rest
      const rest = words
        .filter((w) => w !== subject)
        .sort(() => Math.random() - 0.5);
      result = [subject, ...rest].slice(0, 6);

    } else if (wordClass === "verb") {
      // Pick 3 base forms, expand each to [base, 3rd-person-singular] → 6 tiles
      // Shuffle the pool first so we get different bases each session
      const pool = [...words].sort(() => Math.random() - 0.5);
      const bases = pool.slice(0, 3);
      const pairs = bases.flatMap((base) => [base, inflectVerbSingular(base)]);
      // Shuffle so base and singular aren't always adjacent
      result = pairs.sort(() => Math.random() - 0.5);

    } else if (wordClass === "determiner") {
      // Always include both "a" and "an" as a protected pair if both are in the
      // level's bank — prevents pupils being forced into "a" before vowel words
      const guaranteed: string[] = [];
      if (words.includes("a")) guaranteed.push("a");
      if (words.includes("an")) guaranteed.push("an");
      const rest = words
        .filter((w) => w !== "a" && w !== "an")
        .sort(() => Math.random() - 0.5);
      result = [...guaranteed, ...rest].slice(0, 6);

    } else if (wordClass === "pronoun") {
      // Expand to include subject/object counterparts, then cap at 6
      const expanded = expandPronounBank(words).sort(
        () => Math.random() - 0.5
      );
      result = expanded.slice(0, 6);

    } else {
      result = [...words].sort(() => Math.random() - 0.5).slice(0, 6);
    }

    subset[wordClass] = result;
  }

  return subset;
}

// ─── Distractor words ─────────────────────────────────────────────────────────

/**
 * Build distractor words (wrong-class words added to each slot's bank)
 * to increase difficulty at scaffold stage 3+.
 * Returns 1 distractor per slot from a different word class.
 */
function buildDistractors(
  wordBanks: Record<string, string[]>,
  formulaWordClasses: string[]
): Record<string, string[]> {
  const distractors: Record<string, string[]> = {};
  const allClasses = Object.keys(wordBanks);

  for (const wc of formulaWordClasses) {
    const otherClasses = allClasses.filter((k) => k !== wc);
    if (otherClasses.length === 0) continue;

    const sourceClass =
      otherClasses[Math.floor(Math.random() * otherClasses.length)];
    const bank = wordBanks[sourceClass];
    if (!bank || bank.length === 0) continue;

    const distractor = bank[Math.floor(Math.random() * bank.length)];
    distractors[wc] = [distractor];
  }

  return distractors;
}

// ─── Context sentence generation ──────────────────────────────────────────────

/**
 * Ask Claude Haiku to write one model sentence about today's subject
 * matching the formula pattern. Falls back to null if AI is unavailable.
 */
async function generateContextSentence(
  subject: string,
  formulaPattern: string,
  anthropicKey: string
): Promise<string | null> {
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 80,
        messages: [
          {
            role: "user",
            content: `Write ONE short, vivid sentence about a ${subject} using this exact word pattern: ${formulaPattern}.

Rules:
- Follow the word class pattern in order (${formulaPattern})
- Use simple vocabulary suitable for UK primary school pupils aged 7–11
- Make it interesting and imaginative
- Start with a capital letter, end with a full stop
- Return ONLY the sentence, nothing else`,
          },
        ],
      }),
    });

    if (!resp.ok) return null;

    const data = await resp.json();
    const text: string = data?.content?.[0]?.text?.trim() ?? "";
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;

  try {
    const { pupil_id, level_id, scaffold_stage = 1 } = await req.json();

    if (!pupil_id || !level_id) {
      return new Response(
        JSON.stringify({ error: "pupil_id and level_id are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Service-role client to bypass RLS for reading formula_sessions
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch formula level
    const { data: level, error: levelError } = await supabaseAdmin
      .from("formula_levels")
      .select("id, word_banks, subject_rotation_bank, formula_elements")
      .eq("id", level_id)
      .single<FormulaLevel>();

    if (levelError || !level) {
      return new Response(JSON.stringify({ error: "Level not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bank = level.subject_rotation_bank ?? [];
    if (bank.length === 0) {
      return new Response(
        JSON.stringify({ error: "No subjects in rotation bank" }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch recent subjects used by this pupil on this level (up to 5)
    const { data: recentSessions } = await supabaseAdmin
      .from("formula_sessions")
      .select("subject_used")
      .eq("pupil_id", pupil_id)
      .eq("level_id", level_id)
      .not("subject_used", "is", null)
      .order("created_at", { ascending: false })
      .limit(5);

    const recentSubjects = (recentSessions ?? [])
      .map((s: { subject_used: string | null }) => s.subject_used)
      .filter((s): s is string => typeof s === "string" && s.length > 0);

    // Pick the subject for this session
    const subject = pickSubject(bank, recentSubjects);

    // Build word bank subset with morphology guarantees
    const wordBanks = level.word_banks as Record<string, string[]>;
    const wordBankSubset = buildWordBankSubset(wordBanks, subject);

    // Get ordered, unique word classes from formula elements
    const seen = new Set<string>();
    const formulaWordClasses: string[] = [];
    for (const el of level.formula_elements.sort(
      (a, b) => a.position - b.position
    )) {
      if (!seen.has(el.word_class)) {
        seen.add(el.word_class);
        formulaWordClasses.push(el.word_class);
      }
    }

    // Build distractor words for scaffold stage 3+
    const distractorWords: Record<string, string[]> =
      scaffold_stage >= 3
        ? buildDistractors(wordBanks, formulaWordClasses)
        : {};

    // Generate context sentence via Claude Haiku
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const formulaPattern = formulaWordClasses
      .map((wc) => wc.charAt(0).toUpperCase() + wc.slice(1))
      .join(", ");

    const contextSentence = anthropicKey
      ? await generateContextSentence(subject, formulaPattern, anthropicKey)
      : null;

    const result: SessionContent = {
      subject,
      context_sentence: contextSentence,
      word_bank_subset: wordBankSubset,
      distractor_words: distractorWords,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-session-content error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
