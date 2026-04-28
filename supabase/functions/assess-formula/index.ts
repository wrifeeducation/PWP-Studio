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


interface FormulaSlot {
  position: number;
  word_class: string;
  colour?: string;
}

interface FormulaDefinition {
  slots: FormulaSlot[];
}

interface AssessFormulaRequest {
  level_id: string;
  formula_definition: FormulaDefinition;
  pupil_sentence: string;
  word_banks_used: string[];
  year_group: number;
  phase: string;
  attempt_number: number;
}

interface ElementScore {
  slot: string;
  word_class: string;
  score: number;
  feedback_short: string;
  feedback_detail: string;
}

interface AssessFormulaResponse {
  element_scores: ElementScore[];
  overall_score: number;
  top_strength: string;
  primary_improvement: string;
  common_error_type: string | null;
  confidence: number;
}

function buildSystemPrompt(levelId: string): string {
  const basePrompt = `You are an expert assessor of primary and secondary school English writing in the UK curriculum. You are assessing a pupil's sentence against a specific word-building formula.

**CRITICAL: PII AND NAMES**
If the pupil's sentence contains any names, personal identifying information, or proper nouns referencing real people, IGNORE them completely. Do not repeat them in your feedback. Focus only on the grammatical and structural elements of the sentence.

**ASSESSMENT TASK**
You will receive:
- A formula definition (the structure the pupil is learning)
- The pupil's completed sentence
- The word banks they selected from (or their own words if freestyle)
- The year group and phase

Your job is to:
1. Validate that each element of the formula has been filled correctly
2. Assign a band score (0–3) to each element:
   - **0 (Pre-emergent)**: The element is missing, unintelligible, or completely wrong
   - **1 (Working Towards)**: The element is present but has significant issues (wrong word class, poor fit, grammatical error)
   - **2 (Expected)**: The element is correct, fits the sentence meaning, and is grammatically sound
   - **3 (Greater Depth)**: The element is correct AND shows precision, ambitious vocabulary choice, or notable stylistic awareness
3. Identify common errors (see error detection table below)
4. Provide constructive feedback using the feedback language rules

**FEEDBACK LANGUAGE RULES (MANDATORY)**
- NEVER use: "wrong", "incorrect", "mistake", "error"
- ALWAYS use: "not quite yet", "almost there", "try", "develop", "refine"
- ALWAYS cite the specific slot or word class
- ALWAYS celebrate what is strong BEFORE addressing improvement
- ALWAYS provide a concrete, specific next-step suggestion
- For feedback, refer to slots by their **colour code name** (e.g. "Your Red slot (Subject) shows..." not "Your first element")

**SCORING LOGIC**
- Calculate overall_score as: (sum of element_scores × 25 / number of elements) + adjustments for consistency
- If attempt_number = 2 and score improved, boost confidence slightly
- If common errors detected, lower confidence proportionally

**CONFIDENCE THRESHOLD**
- High confidence (0.85+): Clear alignment with rubric, unambiguous grammar
- Medium confidence (0.65–0.84): Minor ambiguity or edge-case grammar
- Low confidence (< 0.65): Ambiguous intent, unconventional structure, or needs teacher verification

**SCORING CALCULATION ALGORITHM**
For any level with N elements:
base_score = (sum of individual element scores / N) × 25
overall_score = base_score + consistency_bonus + sophistication_bonus

consistency_bonus:
  - If all elements are score 2 or above: +5 points
  - If no common errors detected: +3 points

sophistication_bonus:
  - If any element is score 3: +2 points per score-3 element (max +8)

confidence_calculation:
  - Start: 0.8
  - If word_count > formula_length: +0.05 (pupil added extra)
  - If common_error detected: -0.15
  - If attempt_number = 2 AND score improved ≥ 10 points: +0.1
  - If low clarity (e.g. word is ambiguous part of speech): -0.15
  - Clamp to [0, 1]

**COMMON ERROR DETECTION TABLE**
- adjective_placement: Adjective follows noun instead of preceding
- adverb_modification: Adverb modifies noun; adverb has -ly but modifies noun
- conjunction_mismatch: Conjunction semantic relationship doesn't fit
- tense_inconsistency: Verb tense shifts mid-sentence without reason
- subject_agreement: Verb doesn't agree with subject (e.g. "dogs runs")
- register_inconsistency: Register shifts (contractions in formal, slang in academic, etc.)
- preposition_choice: Preposition is semantically odd or incorrect
- incomplete_clause: Clause after conjunction lacks a verb`;

  const levelSpecific: Record<string, string> = {
    L1: `
**L1: Subject + Verb (2 elements)**
Formula Structure: [Subject (Red)] + [Verb (Blue)]
- Red slot: Is it a single noun or pronoun? Is it performing an action?
- Blue slot: Is it a verb in present tense? Does it agree with the subject?
- Score 3: Subject is precise/specific noun; verb is vivid and active
- Score 2: Subject and verb are both correct; sentence is grammatically sound
- Score 1: Subject or verb is present but misaligned
- Score 0: Subject or verb is missing or unintelligible
Common errors: Subject is actually an object pronoun, verb not tensed correctly, subject-verb disagreement`,
    L5: `
**L5: Adjective Added (3 elements)**
Formula Structure: [Adj (Green)] + [Subject (Red)] + [Verb (Blue)]
- Green slot must precede the subject noun, not follow it
- Adjective must modify the noun directly and make semantic sense
- Score 3: Adjective is well-chosen, adds clear description, positioned correctly before noun
- Score 2: Adjective is correct, positioned before subject, modifies meaningfully
- Score 1: Adjective present but positioned incorrectly OR doesn't fit the noun well
- Score 0: Adjective is missing, wrong word class, or makes no sense
If adjective is positioned AFTER the noun, flag as "adjective_placement" error`,
    L7: `
**L7: Adverb Added (4 elements)**
Formula Structure: [Adj (Green)] + [Subject (Red)] + [Adverb (Orange)] + [Verb (Blue)]
- Orange slot must be an adverb (typically -ly ending, but not always)
- Adverb must modify the verb, not the noun
- Score 3: Adverb is precise, modifies verb meaningfully, demonstrates register awareness
- Score 2: Adverb is correct word class, modifies verb, grammatically sound
- Score 1: Adverb present but modifies noun instead of verb, or is awkwardly placed
- Score 0: Adverb is missing or wrong word class`,
    L8: `
**L8: Preposition + Noun Phrase Added (5 elements)**
Formula Structure: [Adj (Green)] + [Subject (Red)] + [Adverb (Orange)] + [Verb (Blue)] + [Prep (Yellow)] [Noun (Red)]
- Yellow slot is a preposition (in, on, under, beside, etc.)
- The noun following preposition is a complete noun phrase
- Score 3: Preposition and noun phrase are well-integrated, add clear spatial/temporal detail
- Score 2: Preposition and noun phrase are both correct and grammatically sound
- Score 1: Preposition present but noun is incomplete OR preposition choice is odd
- Score 0: Preposition is missing, wrong word class, or noun phrase is incoherent`,
    L10: `
**L10: Master Formula (8 elements)**
Formula Structure: [Adj] [Subject] [Adverb] [Verb] [Prep] [Noun] [Conj] [Clause]
- All 8 elements present and correctly positioned
- Element 7: Conjunction (and, but, because, while, etc.) is semantically appropriate
- Element 8: The clause following conjunction is grammatically complete
- Check tense consistency between Element 4 and Element 8 clause
- Score 3: All elements correct; conjunction and clause show sophisticated link
- Score 2: All elements correct; conjunction is appropriate; grammatically sound
- Score 1: Element present but has minor issue
- Score 0: Element missing or fundamentally wrong`,
    L15: `
**L15: Tense Variation**
- Primary verb tense is consistent with task instruction
- Tense changes are intentional and justified if present
- Score 3: Tense is consistent; any variation is clearly purposeful and enhances narrative
- Score 2: Tense is consistent with instruction; no unmotivated shifts
- Score 1: Tense is mostly consistent but one shift is unmotivated or confusing
- Score 0: Tense is inconsistent throughout; shifts are random`,
    L19: `
**L19-20: Register (Formal vs. Informal)**
- If task specifies formal register: No colloquialisms, contractions, casual pronouns
- If task specifies informal register: Contractions and conversational tone are acceptable
- Score 3: Register is consistent and well-chosen throughout
- Score 2: Register matches instruction consistently
- Score 1: Register is mostly appropriate but one element shifts
- Score 0: Register is inconsistent throughout or conflicts with instruction`,
    L20: `
**L19-20: Register (Formal vs. Informal)**
- If task specifies formal register: No colloquialisms, contractions, casual pronouns
- If task specifies informal register: Contractions and conversational tone are acceptable
- Score 3: Register is consistent and well-chosen throughout
- Score 2: Register matches instruction consistently
- Score 1: Register is mostly appropriate but one element shifts
- Score 0: Register is inconsistent throughout or conflicts with instruction`,
  };

  const levelKey = levelId.toUpperCase();
  const levelGuidance = levelSpecific[levelKey] || '';

  return `${basePrompt}${levelGuidance}

**OUTPUT FORMAT**
You MUST respond with valid JSON only, no markdown, no explanation outside the JSON. The JSON must match this exact shape:
{
  "element_scores": [
    {
      "slot": "string (e.g. 'Green (Adjective)')",
      "word_class": "string (e.g. 'Adjective')",
      "score": integer 0-3,
      "feedback_short": "string (one sentence, 15-20 words)",
      "feedback_detail": "string (2-3 sentences with specific suggestion)"
    }
  ],
  "overall_score": integer 0-100,
  "top_strength": "string",
  "primary_improvement": "string",
  "common_error_type": "string or null",
  "confidence": number 0-1
}`;
}

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

    const body: AssessFormulaRequest = await req.json();

    const {
      level_id,
      formula_definition,
      pupil_sentence,
      word_banks_used,
      year_group,
      phase,
      attempt_number,
    } = body;

    if (!level_id || !formula_definition || !pupil_sentence) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: level_id, formula_definition, pupil_sentence' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: 'Anthropic API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = buildSystemPrompt(level_id);

    const userMessage = `Please assess this pupil's sentence.

Level ID: ${level_id}
Year Group: ${year_group}
Phase: ${phase}
Attempt Number: ${attempt_number}

Formula Definition (slots the pupil must fill):
${JSON.stringify(formula_definition, null, 2)}

Pupil's Sentence: "${pupil_sentence}"

Word Banks Used (words the pupil selected from): ${JSON.stringify(word_banks_used)}

Assess each slot in the formula definition, calculate the overall score, and provide feedback.`;

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error('Anthropic API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Assessment service unavailable', details: anthropicResponse.status }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anthropicData = await anthropicResponse.json();
    const rawContent = anthropicData.content?.[0]?.text;

    if (!rawContent) {
      return new Response(
        JSON.stringify({ error: 'Empty response from assessment service' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Strip markdown code fences if present
    const content = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

    let result: AssessFormulaResponse;
    try {
      result = JSON.parse(content);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid response format from assessment service' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clamp values to valid ranges
    result.overall_score = Math.max(0, Math.min(100, Math.round(result.overall_score)));
    result.confidence = Math.max(0, Math.min(1, result.confidence));
    result.element_scores = result.element_scores.map((el) => ({
      ...el,
      score: Math.max(0, Math.min(3, Math.round(el.score))),
    }));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('assess-formula error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
