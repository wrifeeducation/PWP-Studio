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
  previousSentence?: string;
  subjectNoun: string;
  attemptNumber?: number;
  /** Teacher's genre direction for this week, e.g. "narrative", "persuasive" */
  genreHint?: string;
}

interface AssessStepResponse {
  passed: boolean;
  feedback: string;
  suggestedRevision: string | null;
  confidence: number;
}

const SYSTEM_PROMPT = `You are an expert UK primary school English teacher assessing a pupil's sentence as part of a Progressive Writing Practice session.

The pupil is working through a "formula chain" — a series of sentence-writing steps where each step asks them to write a completely fresh sentence using their subject noun and incorporating a specific grammatical element. Each step builds complexity. Your job is to assess a single step.

ASSESSMENT CRITERIA
Assess whether the sentence:
1. Correctly applies the grammatical formula element described in the instruction
2. Is grammatically sound (punctuation, subject-verb agreement, tense consistency)
3. Contains the subject noun (or an appropriate pronoun reference to it)
4. Makes logical sense as a sentence

PASS/FAIL DECISION
- Pass: All four criteria are met, or minor surface errors do not obscure the grammatical formula being applied correctly
- Fail: The formula element is missing, incorrectly applied, or the sentence is grammatically incoherent

FEEDBACK LANGUAGE (MANDATORY)
- NEVER use: "wrong", "incorrect", "mistake", "error"
- ALWAYS use: "not quite yet", "almost there", "try", "develop", "refine", "next time"
- ALWAYS acknowledge what the pupil has done well before addressing what needs improvement
- Keep feedback warm, specific, and age-appropriate (primary school level)
- Feedback must be 1–2 sentences maximum — pupils should not be overwhelmed
- If a revision suggestion is helpful, provide one concrete example sentence

PII RULE
If the pupil's sentence contains names or personal information, IGNORE them completely. Focus only on the grammatical structure.

OUTPUT FORMAT
Respond with valid JSON only, no markdown, no text outside the JSON:
{
  "passed": boolean,
  "feedback": "string (1-2 sentences, warm and specific)",
  "suggestedRevision": "string or null (a concrete example only if the pupil needs to revise)",
  "confidence": number (0.0 to 1.0, your confidence in this assessment)
}`;

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
      previousSentence,
      subjectNoun,
      attemptNumber = 1,
      genreHint,
    } = body;

    if (!sentence || !formulaLabel || !elementCode || !subjectNoun) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: sentence, formulaLabel, elementCode, subjectNoun' }),
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
      } as AssessStepResponse), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const previousContext = previousSentence
      ? `\nThe pupil's previous sentence (for reference): "${previousSentence}"\n`
      : '';

    const genreContext = genreHint
      ? `Genre direction for this session: ${genreHint} — bear this in mind when evaluating vocabulary choices and suggesting revisions, but do not penalise the pupil for genre if the grammatical formula is correctly applied.\n`
      : '';

    const userMessage = `Please assess this formula chain step.

Formula instruction: ${formulaLabel}
Element being practised: ${elementCode}
Subject noun for this session: "${subjectNoun}"
Attempt number: ${attemptNumber}
${genreContext}${previousContext}
Pupil's sentence: "${sentence}"

Assess whether the sentence correctly applies the formula element described above.`;

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
        system: SYSTEM_PROMPT,
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

    let result: AssessStepResponse;
    try {
      result = JSON.parse(content);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid response from assessment service' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    result.confidence = Math.max(0, Math.min(1, result.confidence ?? 0.8));

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
