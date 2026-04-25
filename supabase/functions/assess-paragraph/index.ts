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


interface AssessParagraphRequest {
  level_id: string;
  genre: 'narrative' | 'non_fiction' | 'persuasive' | 'poetry';
  phase: 'A' | 'B' | 'C' | 'D';
  lead_sentence: string;
  support_sentences: string[];
  close_sentence: string;
  year_group: number;
  expected_support_types?: string[];
  tense_target?: string | null;
  register_target?: string | null;
}

interface ParagraphAssessmentResponse {
  cohesion_score: 0 | 1 | 2 | 3;
  genre_match_score: 0 | 1 | 2 | 3;
  tense_register_score: 0 | 1 | 2 | 3 | null;
  close_quality_score: 0 | 1 | 2 | 3;
  composite_score: number;
  strongest_sentence: string;
  weakest_sentence_position: string;
  primary_feedback: string;
  secondary_feedback: string;
  genre_type_feedback: string | null;
  confidence: number;
}

function buildGenrePrompt(genre: string): string {
  const genrePrompts: Record<string, string> = {
    narrative: `
**NARRATIVE GENRE REQUIREMENTS**
Structure: Lead → Describe (sensory/appearance) → Act (action/event) → Reflect (feeling/consequence) → Close

Support 1 (Describe): Uses sensory language; specific and immersive; helps reader visualise
Support 2 (Act): Shows something happening with vivid verbs; moves narrative forward
Support 3 if present (Reflect): Reveals feelings or consequences; deepens reader understanding
Close: Echoes opening mood; provides final reflection; ends with completion

Assess:
1. Sensory Precision in Describe slot: Look for specific adjectives, sensory verbs
   - Score 3: Rich, specific sensory detail creating atmosphere
   - Score 2: Clear sensory detail, appropriately specific
   - Score 1: Some sensory attempt but vague/generic
   - Score 0: No sensory language

2. Action Quality in Act slot: Look for vivid verbs, dynamic movement
   - Score 3: Precise, ambitious verbs showing action powerfully
   - Score 2: Clear action verbs; narrative moves forward
   - Score 1: Action present but generic/weak verbs
   - Score 0: No action or action is told not shown

3. Close: Echo of opening, final reflection, sense of completion
   - Score 3: Transforms or deepens the opening; memorable final image
   - Score 2: Clear resolution; completes the moment
   - Score 1: Present but abrupt or doesn't resolve
   - Score 0: No close or incoherent`,

    non_fiction: `
**NON-FICTION GENRE REQUIREMENTS**
Structure: Lead (Topic Sentence) → Detail (Fact/Statistic) → Example (Illustration) → Explain (Implication) → Close

Lead: Announces topic clearly; declarative statement; not opinion-based
Support 1 (Detail): Accurate factual information; specific and verifiable
Support 2 (Example): Shows fact in action; specific and concrete
Support 3 if present (Explain): Answers "So what?"; unpacks significance
Close: Summarises key point; maintains formal register; looks forward

Assess:
1. Topic Sentence Clarity (Lead): Clear, declarative statement
   - Score 3: Clear, specific, authoritative
   - Score 2: Topic is clear
   - Score 1: Fuzzy or partially obscured
   - Score 0: No clear topic or too vague

2. Factual Specificity (Support 1): Verifiable facts, plausible statistics
   - Score 3: Specific, credible fact; clearly supports topic
   - Score 2: Fact is accurate and relevant
   - Score 1: Fact present but vague
   - Score 0: No fact or invented/nonsensical

3. Example Concreteness (Support 2): Specific instances, named things
   - Score 3: Vivid, specific example powerfully illustrating the fact
   - Score 2: Clear example; reader sees fact applied
   - Score 1: Present but generic
   - Score 0: No example or incoherent`,

    persuasive: `
**PERSUASIVE GENRE REQUIREMENTS**
Structure: Lead (Claim) → Reason (Because) → Evidence (For Example) → Therefore (Conclusion/CTA) → Close

Lead: States clear position; debatable assertion; not neutral
Support 1 (Reason): Explains WHY the claim is true; causal logic; appeals to logic/safety/fairness
Support 2 (Evidence): Specific proof; fact/statistic/expert quote; shows reason in action
Support 3 if present (Therefore): Restates claim; may include call-to-action
Close: Final persuasive punch; broadened significance; often rhetorical

Assess:
1. Clarity and Strength of Claim (Lead): Debatable assertion, clear position
   - Score 3: Bold, clear, and persuasive; no ambiguity
   - Score 2: Clear and takes a position
   - Score 1: Present but weak or partially obscured
   - Score 0: No clear claim or purely factual

2. Logic and Relevance of Reason (Support 1): Genuine causal link
   - Score 3: Compelling and clearly supports claim
   - Score 2: Logical and clearly supports claim
   - Score 1: Present but weak or loosely connected
   - Score 0: No reason or illogical

3. Strength of Evidence (Support 2): Specific, believable evidence
   - Score 3: Strong, specific, credible; supports reason powerfully
   - Score 2: Present and supports reason
   - Score 1: Present but vague or weakly supports
   - Score 0: No evidence or fabricated`,

    poetry: `
**POETRY GENRE REQUIREMENTS**
Structure: Lead (Opening Image) → Extend (Develop Image) → Contrast (Opposing Image/Turn) → Echo (Return Transformed) → Close

Lead: Vivid, sensory image or moment; sets mood/tone; striking picture
Support 1 (Extend): Deepens/elaborates opening image; parallel structure, repetition, or sensory detail
Support 2 (Contrast): Introduces shift, contrast, or new perspective; the "volta" or turn
Support 3 if present (Echo): Circles back to original image but changed; circular structure
Close: Final image or reflection; cyclical or transcendent; memorable and resonant

CRITICAL NOTE: Poetry assessment requires sensitivity to unconventional syntax, deliberately fragmented lines, internal rhyme, alliteration, and non-standard punctuation. Do NOT penalise if they serve artistic purpose.

Assess:
1. Vividness of Opening Image (Lead): Sensory, specific, evocative
   - Score 3: Striking, unique, immediately visualised
   - Score 2: Clear, sensory, engaging
   - Score 1: Present but generic or underexplored
   - Score 0: No image or abstract/conceptual

2. Development (Support 1): Sensory layers, parallel structure, repetition
   - Score 3: Extension deepens image through precise language or device
   - Score 2: Image clearly extended; reader sees more detail
   - Score 1: Present but slight or vague
   - Score 0: No extension or topic shifts

3. Craft of Turn (Support 2): Deliberate shift in tone or perspective
   - Score 3: Striking and purposeful; shifts meaning powerfully
   - Score 2: Clear and serves poem development
   - Score 1: Present but weak or unclear
   - Score 0: No turn or confusing`,
  };

  return genrePrompts[genre] || '';
}

function buildPhaseGuidance(phase: string): string {
  const phaseGuides: Record<string, string> = {
    A: `**PHASE A ADJUSTMENTS**
Pupils are given the Lead and Close sentences by WriFe. They write only the middle Support sentences.
- Cohesion: Focus on how middle sentences connect to PROVIDED Lead and Close
- Genre Match: Assess whether Support sentences fulfill their role relative to given Lead and Close
- Reduce base confidence by 0.1 (scaffolding means less independent skill is evident)
- Feedback: Acknowledge scaffolding. "You were given a strong Lead and Close, and your job was to fill the middle..."`,

    B: `**PHASE B ADJUSTMENTS**
Pupils are given the Lead sentence. They write Support sentences AND the Close.
- Cohesion: Assess linking between ALL sentences including to the provided Lead
- Close Quality: Assess this dimension fully; it's now pupil-written
- Increase confidence slightly if Close is strong and independent (+0.05)
- Feedback: Acknowledge independent Close. "You were given a strong Lead, and you've written the rest independently..."`,

    C: `**PHASE C ADJUSTMENTS**
Pupils write Lead, all Support, and Close independently. Full demonstration of paragraph-building skill.
- Cohesion: Assess at full standard; no reduction for scaffolding
- Genre Match: Assess at full standard
- Confidence: Can reach full 0.9+ if all dimensions are strong
- Feedback: "You've built a whole paragraph independently..."`,

    D: `**PHASE D ADJUSTMENTS**
This is the highest standard: extended work or multiple paragraphs. Assess as polished independent writing.
- Cohesion: Assess both within-paragraph and between-paragraph links
- Genre Match: Assess consistency of genre across all paragraphs
- Confidence: Can be 0.95+ if all paragraphs show strong craft
- Feedback: "You've built a sophisticated [genre] piece..."`,
  };

  return phaseGuides[phase] || '';
}

function buildSystemPrompt(genre: string, phase: string, hasTenseOrRegisterTarget: boolean): string {
  return `You are an expert assessor of paragraph-level writing in UK primary and secondary schools. You are evaluating a paragraph built from the WriFe Paragraph Builder formula: a Lead sentence, 1–3 Support sentences, and a Close sentence.

**CRITICAL: PII AND NAMES**
If the paragraph contains any names, personal identifying information, or proper nouns referencing real people, IGNORE them completely. Do not repeat them in your feedback.

**ASSESSMENT DIMENSIONS AND BANDS**
- **0 (Pre-emergent)**: Element is missing or incoherent; lacks genre awareness
- **1 (Working Towards)**: Element is present but has significant gaps; genre role is unclear or partially fulfilled
- **2 (Expected)**: Element is clear, fits genre, and is grammatically sound
- **3 (Greater Depth)**: Element shows precision, sophistication, or unexpected insight

**COHESION ASSESSMENT (0–3)**
- Score 3: Sentences link smoothly with varied connectives; ideas flow logically
- Score 2: Sentences are linked, mostly with simple connectives; logical progression is clear
- Score 1: Minimal linking; some sentences feel disconnected
- Score 0: Sentences are isolated; no connectives; logic is incoherent

**TENSE/REGISTER ASSESSMENT (0–3)** ${hasTenseOrRegisterTarget ? '(REQUIRED for this assessment)' : '(Return null if no tense_target or register_target provided)'}
- Score 3: Target tense or register is consistent throughout; any variation is intentional
- Score 2: Target is maintained with one minor slip or one justified variation
- Score 1: Target is attempted but has multiple inconsistencies
- Score 0: No attempt to maintain target; random shifts throughout

**CLOSE QUALITY ASSESSMENT (0–3)**
- Score 3: Close sentence provides meaningful conclusion, reflection, or image; echoes or elevates the lead
- Score 2: Close sentence is present and provides some conclusion; grammatically sound
- Score 1: Close sentence is present but abrupt, vague, or doesn't clearly resolve
- Score 0: Close sentence is missing or incoherent

**COMPOSITE SCORE CALCULATION**
composite_score = round(
  (cohesion_score + genre_match_score + [tense_register_score if not null] + close_quality_score)
  / (number of dimensions) × 25
  + bonuses
)
bonuses:
  - If all scores are 2 or above: +5
  - If any score is 3: +3 per score-3 dimension (max +12)
  - If phase is A and Lead + Close are provided: +5

**CONFIDENCE CALCULATION**
- Start at 0.75
- If any dimension score is 0: –0.15
- If genre role ambiguity (Support sentences don't clearly fit type): –0.1
- If phase is A: –0.1
- If phase is C or D and all scores 2+: +0.15
- Clamp to [0, 1]

**FEEDBACK LANGUAGE RULES (MANDATORY)**
- NEVER use: "wrong", "incorrect", "mistake", "error"
- ALWAYS use: "not quite yet", "almost", "try", "develop", "refine"
- ALWAYS cite the specific sentence position (Lead, Support 1, Support 2, Close)
- ALWAYS celebrate strength BEFORE addressing improvement
- ALWAYS provide a concrete next-step suggestion

${buildGenrePrompt(genre)}

${buildPhaseGuidance(phase)}

**OUTPUT FORMAT**
Respond with valid JSON only, no markdown, no explanation outside the JSON:
{
  "cohesion_score": integer 0-3,
  "genre_match_score": integer 0-3,
  "tense_register_score": integer 0-3 or null,
  "close_quality_score": integer 0-3,
  "composite_score": integer 0-100,
  "strongest_sentence": "exact quoted sentence from the paragraph",
  "weakest_sentence_position": "Lead|Support1|Support2|Support3|Close",
  "primary_feedback": "2-3 sentences celebrating the main strength",
  "secondary_feedback": "2-3 sentences describing area for development with concrete next step",
  "genre_type_feedback": "genre-specific guidance string or null",
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

    const body: AssessParagraphRequest = await req.json();

    const {
      level_id,
      genre,
      phase,
      lead_sentence,
      support_sentences,
      close_sentence,
      year_group,
      expected_support_types,
      tense_target,
      register_target,
    } = body;

    if (!genre || !phase || !lead_sentence || !close_sentence) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: genre, phase, lead_sentence, close_sentence' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hasTenseOrRegisterTarget = !!(tense_target || register_target);
    const systemPrompt = buildSystemPrompt(genre, phase, hasTenseOrRegisterTarget);

    const paragraphText = [
      `Lead: "${lead_sentence}"`,
      ...support_sentences.map((s, i) => `Support ${i + 1}: "${s}"`),
      `Close: "${close_sentence}"`,
    ].join('\n');

    const userMessage = `Please assess this ${genre} paragraph written by a Year ${year_group} pupil at Phase ${phase}.

Level ID: ${level_id || 'not specified'}
${tense_target ? `Tense Target: ${tense_target}` : ''}
${register_target ? `Register Target: ${register_target}` : ''}
${expected_support_types?.length ? `Expected Support Types: ${expected_support_types.join(', ')}` : ''}

PARAGRAPH:
${paragraphText}

Assess all dimensions and provide constructive feedback.`;

    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      console.error('OpenAI API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Assessment service unavailable', details: openAiResponse.status }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAiData = await openAiResponse.json();
    const content = openAiData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Empty response from assessment service' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result: ParagraphAssessmentResponse;
    try {
      result = JSON.parse(content);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid response format from assessment service' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clamp and validate
    const clampBand = (v: number): 0 | 1 | 2 | 3 =>
      (Math.max(0, Math.min(3, Math.round(v))) as 0 | 1 | 2 | 3);

    result.cohesion_score = clampBand(result.cohesion_score);
    result.genre_match_score = clampBand(result.genre_match_score);
    result.close_quality_score = clampBand(result.close_quality_score);
    if (result.tense_register_score !== null && result.tense_register_score !== undefined) {
      result.tense_register_score = clampBand(result.tense_register_score as number);
    }
    result.composite_score = Math.max(0, Math.min(100, Math.round(result.composite_score)));
    result.confidence = Math.max(0, Math.min(1, result.confidence));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('assess-paragraph error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
