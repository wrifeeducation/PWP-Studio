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

interface QuizPromptResponse {
  id: string;
  instruction: string;
  elementCodes: string[];
  pupilSentence: string;
}

interface AssessQuizRequest {
  prompts: QuizPromptResponse[];
  highestLesson: number;
}

interface SinglePromptResult {
  id: string;
  passed: boolean;
  feedback: string;
}

interface AssessQuizResponse {
  responses: SinglePromptResult[];
  overallPassed: boolean;
  summary: string;
  readyForNextElement: boolean;
}

const SYSTEM_PROMPT = `You are an expert UK primary school English teacher assessing a pupil's mastery quiz responses in a Progressive Writing Practice session.

The pupil has just completed a formula chain session and is now being assessed on their independent control of the formula elements — without the scaffolding of the chain.

YOUR TASK
For each prompt-response pair:
1. Assess whether the pupil's sentence correctly applies the formula elements the prompt asked for
2. Make a pass/fail decision per prompt
3. Provide a brief, warm piece of feedback for each response

THEN make an OVERALL qualitative mastery judgement:
- Not a simple count of passes — look at the PATTERN across responses
- Consider: consistency across permutations, confidence, whether any errors were systematic
- overallPassed = true if the pupil demonstrates reasonable control across the majority of varied prompts
- readyForNextElement = true if the pupil passes at least 3 out of 5 prompts (approximately 60%) with no systematic pattern of errors — they are ready to add the next formula step to their chain. You do NOT need to see exceptional performance; consistent basic control across most prompts is sufficient

FEEDBACK LANGUAGE (MANDATORY)
- NEVER use: "wrong", "incorrect", "mistake", "error"
- ALWAYS use: "not quite yet", "almost there", "try", "develop", "refine"
- Keep individual response feedback to 1 sentence — brief and warm
- The overall summary should be 2–3 sentences, encouraging, and honest

PII RULE
Ignore all names and personal information in pupil sentences. Focus only on grammatical structure.

OUTPUT FORMAT
Respond with valid JSON only, no markdown:
{
  "responses": [
    {
      "id": "string (matching the prompt id)",
      "passed": boolean,
      "feedback": "string (1 sentence, warm and specific)"
    }
  ],
  "overallPassed": boolean,
  "summary": "string (2-3 sentences — overall qualitative mastery assessment)",
  "readyForNextElement": boolean
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

    const body: AssessQuizRequest = await req.json();
    const { prompts, highestLesson } = body;

    if (!prompts?.length || highestLesson === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: prompts, highestLesson' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      const fallback: AssessQuizResponse = {
        responses: prompts.map(p => ({
          id: p.id,
          passed: true,
          feedback: "Great effort with this sentence.",
        })),
        overallPassed: true,
        summary: "You showed good understanding across the quiz. Keep practising to build confidence.",
        readyForNextElement: false,
      };
      return new Response(JSON.stringify(fallback), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const promptsFormatted = prompts.map((p, i) =>
      `Prompt ${i + 1} (id: ${p.id}):\n  Instruction: ${p.instruction}\n  Elements tested: ${p.elementCodes.join(', ')}\n  Pupil's sentence: "${p.pupilSentence}"`
    ).join('\n\n');

    const userMessage = `Please assess these quiz responses from a pupil at curriculum position L${highestLesson}.

${promptsFormatted}

Assess each response, then make an overall qualitative mastery judgement.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
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

    let result: AssessQuizResponse;
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
    console.error('pwp-assess-quiz error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
