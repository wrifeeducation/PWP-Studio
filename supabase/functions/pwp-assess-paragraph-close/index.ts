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

interface AssessParagraphCloseRequest {
  leadSentence: string;
  supportSentences: string[];
  closeSentence: string;
  scaffoldMode?: boolean;
}

interface AssessParagraphCloseResponse {
  passed: boolean;
  feedback: string;
  suggestedRevision: string | null;
  complexity_notes: string;
}

const SYSTEM_PROMPT = `You are an expert UK primary school English teacher assessing the closing sentence of a pupil's paragraph in a Progressive Writing Practice session.

CONTEXT
The pupil has:
1. Written a Lead sentence (their most complex formula sentence, used as the topic sentence)
2. Written 2–3 free Support sentences developing their idea
3. Written a Close sentence — which MUST be more technically complex than the Support sentences

YOUR TASK
Assess whether the Close sentence is demonstrably more technically complex than the Support sentences.

WHAT COUNTS AS GREATER TECHNICAL COMPLEXITY?
- A subordinate clause (because, although, when, while, if, since, unless...)
- A fronted adverbial (Across the field, ... / Although exhausted, ...)
- An embedded relative clause (the dog, which was exhausted, ...)
- Two or more modifying phrases stacked (The tired, muddy dog...)
- A compound structure (... and ..., but ..., so ...)
- A transitional phrase (Nevertheless, ... / As a result, ...)
- Significantly more ambitious vocabulary than the support sentences

DO NOT require perfection — a pupil showing genuine grammatical ambition should pass even if there are minor surface errors, as long as the attempt at complexity is clear.

PASS/FAIL DECISION
- Pass: The close sentence is clearly more structurally complex than at least 2 of the support sentences, OR it shows a genuine, recognisable attempt at a more complex structure
- Fail: The close sentence is the same complexity or simpler than the support sentences, OR it is grammatically incoherent

SCAFFOLD MODE
If scaffold_mode is true (pupil is pre-L26), apply a more generous standard — reward any attempt at adding a subordinate clause or fronted element, even if imperfect.

FEEDBACK LANGUAGE (MANDATORY)
- NEVER use: "wrong", "incorrect", "mistake", "error"
- ALWAYS use: "not quite yet", "almost there", "try adding", "develop", "build on"
- Acknowledge what the pupil has attempted before addressing what to improve
- Keep feedback warm and specific — 1–3 sentences
- If a revision is needed, give ONE concrete example of how to make the closing sentence more complex

PII RULE
Ignore all names and personal information. Focus only on grammatical structure.

OUTPUT FORMAT
Respond with valid JSON only, no markdown:
{
  "passed": boolean,
  "feedback": "string (1-3 sentences, warm and specific)",
  "suggestedRevision": "string or null",
  "complexity_notes": "string (brief note on what grammatical features were/were not present)"
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

    const body: AssessParagraphCloseRequest = await req.json();
    const { leadSentence, supportSentences, closeSentence, scaffoldMode = false } = body;

    if (!leadSentence || !supportSentences?.length || !closeSentence) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: leadSentence, supportSentences, closeSentence' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      return new Response(JSON.stringify({
        passed: true,
        feedback: "Your closing sentence rounds off the paragraph well — great effort.",
        suggestedRevision: null,
        complexity_notes: "Assessment unavailable — teacher will review.",
      } as AssessParagraphCloseResponse), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supportFormatted = supportSentences
      .map((s, i) => `  Support ${i + 1}: "${s}"`)
      .join('\n');

    const userMessage = `Please assess the closing sentence of this pupil's paragraph.

Lead (topic sentence, already written): "${leadSentence}"

Support sentences (free writing):
${supportFormatted}

Closing sentence to assess: "${closeSentence}"

Scaffold mode (pre-L26 pupil, apply generous standard): ${scaffoldMode}

Is the closing sentence more technically complex than the support sentences?`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
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

    let result: AssessParagraphCloseResponse;
    try {
      result = JSON.parse(content);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid response from assessment service' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('pwp-assess-paragraph-close error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
