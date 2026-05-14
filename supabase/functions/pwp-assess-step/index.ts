import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

interface AssessStepRequest {
  sentence: string;
  formulaLabel: string;
  elementCode: string;
  /** The structural subject type required by this step's formula */
  subject_type?: 'proper_noun' | 'det_noun' | 'pronoun';
  /** The tense required by this step */
  tense?: 'past' | 'present' | 'continuous' | 'any';
  /** The step category */
  step_type?: 'new_element' | 'consolidation' | 'tense_variety' | 'transition';
  previousSentence?: string;
  /** @deprecated — subjectNoun is no longer used for assessment.
   *  Assessment checks subject TYPE, not a specific word. */
  subjectNoun?: string;
  attemptNumber?: number;
  genreHint?: string;
}

interface AssessStepResponse {
  passed: boolean;
  feedback: string;
  suggestedRevision: string | null;
  confidence: number;
  // Extended detail fields (used by teacher dashboard / future FeedbackCard)
  error_type: string | null;
  error_word: string | null;
  tense_found: string | null;
  tense_required: string | null;
}

// ─── System prompt — per PWP_Assessment_Corrections_Prompt.md Part 3 ─────────
// Updated: 2026-05-14
// Key changes from original:
//   • Subject freedom: any valid proper noun / det+noun / pronoun passes
//   • Never enforces a specific subject word (e.g. "Sam")
//   • Phrasal verb recognition: auxiliary + participle = ONE verb slot
//   • Tense detection via auxiliary, not participle
//   • target_sentence NOT referenced
//   • Returns structured JSON with is_correct, error_type, correction_hint etc.
const SYSTEM_PROMPT = `You are assessing a sentence written by a primary school pupil (age 7–11) in a structured writing programme.

Required formula: {FORMULA}
Required subject type: {SUBJECT_TYPE}  — 'proper_noun' | 'det_noun' | 'pronoun'
Required tense: {TENSE}  — 'past' | 'present' | 'continuous' | 'any'
Step type: {STEP_TYPE}  — 'new_element' | 'consolidation' | 'tense_variety' | 'transition'

Pupil's sentence: "{SENTENCE}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL RULES — READ BEFORE ASSESSING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. SUBJECT FREEDOM — The pupil may use ANY valid noun matching the required subject type.
   - If subject_type = 'proper_noun': any proper noun is valid. Wolf ✅ Maya ✅ Jordan ✅ Sam ✅ London ✅
   - The example character in the lesson (Sam) is NOT the required subject. Never reject a sentence for using a different name.
   - If subject_type = 'det_noun': any determiner + common noun is valid. "The dog" ✅ "A girl" ✅ "The wolf" ✅
   - If subject_type = 'pronoun': He / She / They / It — any appropriate pronoun.

2. VERB FREEDOM — The pupil may use ANY verb filling the verb slot in the correct tense.
   - Any past-tense verb passes a past-tense step. "Wolf danced" ✅ "Wolf swam" ✅ "Wolf leapt" ✅
   - Never reject a verb because it differs from the example sentence verb.

3. PHRASAL VERB RECOGNITION — A simple verb and an auxiliary+participle phrase fill ONE verb slot.
   - "ran" = one verb slot ✅
   - "was running" = one verb slot ✅  (past continuous)
   - "is running" = one verb slot ✅  (present continuous)
   - Never flag "is dancing" / "was running" as an 'extra_element'. They are single verb phrases.
   - Determine the verb tense from the AUXILIARY, not the participle.

4. TENSE CHECK FOR PHRASAL VERBS — Tense is carried by the auxiliary.
   - "Wolf is dancing"  at a past-tense step       → wrong_tense ❌
   - "Wolf was dancing" at a past-tense step       → wrong_tense ❌  (simple past required)
   - "Wolf is dancing"  at a present-tense step    → CORRECT ✅
   - "Wolf was dancing" at a present-tense step    → wrong_tense ❌
   - "Wolf is dancing"  at a continuous-tense step → CORRECT ✅
   - "Wolf was dancing" at a continuous-tense step → CORRECT ✅
   - When tense = 'any' or step_type = 'tense_variety': accept all forms.

5. CREATIVE CHOICES ARE VALID — The pupil's specific word choices (noun, verb, adjective, object noun) are creative decisions. Assess structure and tense only.

6. OBJECT AND ADJECTIVE FREEDOM — Any valid word in the required class passes.
   - "Wolf kicked a cloud" is as valid as "Wolf kicked a ball." ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ASSESSMENT INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Assess the sentence against the formula structure only. Check:
1. Is every required word class present?
2. Are they in the correct sequence?
3. Is the verb (simple or phrasal) in the correct tense?
4. Does the subject match the required subject type (not a specific word — the TYPE)?
5. Are there word classes present not yet in the formula?
6. Where the formula specifies a determiner, is the correct one used?

FEEDBACK LANGUAGE
- NEVER use: "wrong", "incorrect", "mistake", "error"
- ALWAYS use: "not quite yet", "almost there", "try", "develop", "refine", "next time"
- Acknowledge what the pupil did well before addressing what needs improvement
- Keep correction_hint warm, specific, and under 15 words
- Do NOT mention "Sam" in any correction_hint. Do NOT reference the example sentence.

OUTPUT FORMAT — respond with valid JSON only, no markdown, no text outside the JSON:
{
  "is_correct": boolean,
  "error_type": string | null,
  "error_word": string | null,
  "error_position": number | null,
  "formula_position": number | null,
  "expected_word_class": string | null,
  "found_word_class": string | null,
  "correction_hint": string | null,
  "tense_found": string | null,
  "tense_required": string | null
}

error_type values: "missing_element" | "wrong_order" | "wrong_tense" | "wrong_subject_type" | "extra_element" | "incomplete" | null
correction_hint must be child-friendly, specific, and under 15 words. null when is_correct is true.`;

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: AssessStepRequest = await req.json();
    const {
      sentence,
      formulaLabel,
      elementCode,
      subject_type = 'proper_noun',
      tense = 'past',
      step_type = 'new_element',
      previousSentence,
      attemptNumber = 1,
      genreHint,
    } = body;

    if (!sentence || !formulaLabel || !elementCode) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: sentence, formulaLabel, elementCode' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      // Graceful fallback when key not configured
      return new Response(JSON.stringify({
        passed: true,
        feedback: "Great effort — your sentence shows good understanding of the formula.",
        suggestedRevision: null,
        confidence: 0.5,
        error_type: null,
        error_word: null,
        tense_found: null,
        tense_required: null,
      } as AssessStepResponse), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const previousContext = previousSentence
      ? `\nPupil's previous sentence (for reference only): "${previousSentence}"\n`
      : '';

    const genreContext = genreHint
      ? `Genre direction: ${genreHint} — bear this in mind when suggesting revisions, but do not penalise the pupil for genre if the grammatical formula is correctly applied.\n`
      : '';

    // Build the prompt, substituting structural params
    const systemPromptFilled = SYSTEM_PROMPT
      .replace('{FORMULA}', formulaLabel)
      .replace('{SUBJECT_TYPE}', subject_type)
      .replace('{TENSE}', tense)
      .replace('{STEP_TYPE}', step_type)
      .replace('{SENTENCE}', sentence);

    const userMessage = `Formula element being practised: ${elementCode}
Attempt number: ${attemptNumber}
${genreContext}${previousContext}
Please assess the pupil's sentence against the formula structure and return the JSON result.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: systemPromptFilled,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Assessment service unavailable' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const rawContent = data.content?.[0]?.text ?? '';
    const content = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

    let raw: {
      is_correct?: boolean;
      error_type?: string | null;
      error_word?: string | null;
      error_position?: number | null;
      formula_position?: number | null;
      expected_word_class?: string | null;
      found_word_class?: string | null;
      correction_hint?: string | null;
      tense_found?: string | null;
      tense_required?: string | null;
    };

    try {
      raw = JSON.parse(content);
    } catch {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ error: 'Invalid response from assessment service' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map spec format → client format
    // feedback = correction_hint when failing, positive when passing
    const feedback = raw.is_correct
      ? "Well done — your sentence follows the formula correctly."
      : (raw.correction_hint ?? "Not quite yet — look at the formula and try again.")

    const result: AssessStepResponse = {
      passed:           raw.is_correct ?? false,
      feedback,
      suggestedRevision: null,
      confidence:       0.85,
      error_type:       raw.error_type ?? null,
      error_word:       raw.error_word ?? null,
      tense_found:      raw.tense_found ?? null,
      tense_required:   raw.tense_required ?? null,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('pwp-assess-step error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
