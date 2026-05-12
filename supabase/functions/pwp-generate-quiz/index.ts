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

interface GenerateQuizRequest {
  elementCodes: string[];
  highestLesson: number;
  sessionSubjectNoun?: string;
}

interface QuizPrompt {
  id: string;
  instruction: string;
  elementCodes: string[];
}

interface GenerateQuizResponse {
  prompts: QuizPrompt[];
}

const SYSTEM_PROMPT = `You are an expert UK primary school English teacher generating a short mastery quiz for a Progressive Writing Practice session.

The pupil has just completed a formula chain — writing sentences using specific grammatical elements. Your job is to generate 4–6 quiz prompts that test whether they have genuinely internalised these elements, independent of the scaffold they just used.

QUIZ DESIGN PRINCIPLES
Each prompt must ask the pupil to WRITE A SENTENCE from scratch. Vary across all prompts:

1. TENSE — mix present, past, and continuous tense requirements
2. SUBJECT TYPE — vary between: proper noun, determiner+noun (e.g. "the dragon"), pronoun (he/she/it/they)
3. VERB TYPE — mix regular verbs, irregular verbs, and phrasal verbs (e.g. "is dancing", "had run", "was creeping")
4. SENTENCE PURPOSE — mix statements, questions (where the pupil has that element), and exclamations/commands (if unlocked)
5. TOPIC — do NOT use the same subject noun as the session; use a variety (animals, objects, places, concepts)

PROMPT WRITING RULES
- Each prompt is a clear instruction a Year 3–6 pupil can understand
- Do not use technical linguistic jargon in the prompt text — use plain English ("word that describes HOW" not "adverb of manner")
- Each prompt must clearly specify: the subject to use, the tense, and which formula elements to include
- Keep prompts varied — no two should feel like repeats

ELEMENT CODE REFERENCE (for tagging — do not include in the prompt text shown to pupil)
noun, determiner_noun, proper_noun_subject, helping_verb, tense_present, tense_past,
tense_continuous, svo, adjective_noun, adjective_object, adverb_how, adverb_when,
adverb_where, pronoun_subject, prepositional_phrase, question_form, imperative,
exclamative, noun_phrase, adverb_phrase, independent_clause, dependent_clause,
fronted_adverbial, sva_pattern, compound_fanboys, complex_subordinate,
stacked_phrase_modifier, transitional_opening, reference_word, connective, adverbial_cohesion

OUTPUT FORMAT
Respond with valid JSON only, no markdown:
{
  "prompts": [
    {
      "id": "q1",
      "instruction": "string — the prompt shown to the pupil",
      "elementCodes": ["array", "of", "element", "codes", "being", "tested"]
    }
  ]
}

Generate exactly 5 prompts unless fewer than 3 element codes are provided, in which case generate 4.`;

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

    const body: GenerateQuizRequest = await req.json();
    const { elementCodes, highestLesson, sessionSubjectNoun } = body;

    if (!elementCodes?.length || highestLesson === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: elementCodes, highestLesson' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      // Fallback prompts when AI unavailable
      const fallback: GenerateQuizResponse = {
        prompts: [
          { id: 'q1', instruction: 'Write a sentence in the past tense about a tiger, using a describing word before the noun and a word that tells us HOW.', elementCodes: ['adjective_noun', 'tense_past', 'adverb_how'] },
          { id: 'q2', instruction: 'Write a sentence using "they" as your subject. Include a word that tells us WHERE the action happened.', elementCodes: ['pronoun_subject', 'adverb_where'] },
          { id: 'q3', instruction: 'Write a sentence about a river in the present tense. Add a prepositional phrase (use a word like in, through, beside, or across).', elementCodes: ['tense_present', 'prepositional_phrase'] },
          { id: 'q4', instruction: 'Write a sentence that includes two parts joined by "because" or "although".', elementCodes: ['dependent_clause'] },
        ],
      };
      return new Response(JSON.stringify(fallback), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const avoidNoun = sessionSubjectNoun ? `\nDo NOT use "${sessionSubjectNoun}" as the subject in any prompt — the pupil just used it.` : '';

    const userMessage = `Generate a mastery quiz for a pupil who has completed ${elementCodes.length} formula steps.

Formula elements to test: ${elementCodes.join(', ')}
Pupil's curriculum position: highest lesson = ${highestLesson}
${avoidNoun}

Generate varied prompts that test these elements across different tenses, subject types, verb types, and sentence purposes.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Quiz generation service unavailable' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const rawContent = data.content?.[0]?.text ?? '';
    const content = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

    let result: GenerateQuizResponse;
    try {
      result = JSON.parse(content);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid response from quiz generation service' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure IDs are present
    result.prompts = result.prompts.map((p, i) => ({
      ...p,
      id: p.id ?? `q${i + 1}`,
    }));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('pwp-generate-quiz error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
