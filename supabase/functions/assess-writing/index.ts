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


interface AssessWritingRequest {
  full_text: string;
  genre: 'narrative' | 'non_fiction' | 'persuasive' | 'poetry';
  year_group: number;
  task_prompt_text: string;
  word_count: number;
  plan_data?: Record<string, unknown> | null;
  pwp_formula_level?: string;
  plan_submitted?: boolean;
}

interface PupilFeedback {
  warm_comment: string;
  grow_1: {
    comment: string;
    example_rewrite: string;
  };
  grow_2: {
    comment: string;
    example_rewrite: string;
  };
  next_steps: string;
}

interface AssessWritingResponse {
  composition_score: 0 | 1 | 2 | 3;
  vocabulary_score: 0 | 1 | 2 | 3;
  grammar_score: 0 | 1 | 2 | 3;
  punctuation_score: 0 | 1 | 2 | 3;
  spelling_score: 0 | 1 | 2 | 3;
  purpose_audience_effect_score: 0 | 1 | 2 | 3;
  overall_band: 0 | 1 | 2 | 3;
  confidence_scores: Record<string, number>;
  low_confidence_flags: string[];
  evidence_citations: Record<string, string>;
  lsc_paragraphs_detected: number;
  pwp_formula_detected: boolean;
  pupil_feedback: PupilFeedback;
  teacher_summary: string;
  taf_band_label: string;
}

function getKeyStage(yearGroup: number): string {
  if (yearGroup <= 2) return 'KS1';
  if (yearGroup <= 6) return 'KS2';
  return 'KS3';
}

function getYearGroupGuidance(yearGroup: number): string {
  if (yearGroup === 1) {
    return `Year Group: 1 (KS1, Age 5-6)
- Composition: Simple sentences in sequence; ideas organised chronologically; emerging beginning/middle/end
- Vocabulary: Simple everyday vocabulary; correct usage; emerging descriptive language (colour, size)
- Grammar: Simple subject-verb-object sentences; emerging compound sentences with "and"; correct simple tense
- Punctuation: Capital letters at sentence start; full stops at sentence end; emerging question marks
- Spelling: Phonetically plausible attempts; growing accuracy in high-frequency words
- PAE: Simple awareness that writing is FOR someone; appropriate tone for task`;
  }
  if (yearGroup === 2) {
    return `Year Group: 2 (KS1, Age 6-7)
- Composition: Simple multi-paragraph structure; chronological/thematic organisation; sequencing with connectives
- Vocabulary: Simple vocabulary with some descriptive language; correct usage; awareness of word choice for effect
- Grammar: Compound sentences with "and"; tense use is secure and varied; subject-verb agreement
- Punctuation: Capital letters, full stops, question marks; sentence demarcation mostly consistent
- Spelling: High-frequency words correct; phonetically plausible attempts at other words
- PAE: Tone is consistent and engaging; shows awareness of audience`;
  }
  if (yearGroup <= 4) {
    return `Year Group: ${yearGroup} (KS2 Yr3-4, Age 7-9)
- Composition: Multi-paragraph (2-5 paragraphs); genre-appropriate structure; LSC paragraph structure visible
- Vocabulary: Developing range; adjectives and adverbs used purposefully; some ambitious vocabulary
- Grammar: Compound + complex sentences with subordinate clauses; consistent tense; subject-verb agreement
- Punctuation: Capitals, full stops, question marks secure; commas in lists; apostrophes; speech marks
- Spelling: High-frequency and common words secure; common suffixes (-ed, -ing, -er, -tion) mostly correct
- PAE: Clear purpose and audience awareness; genre conventions followed; register appropriate`;
  }
  if (yearGroup <= 6) {
    return `Year Group: ${yearGroup} (KS2 Yr5-6, Age 9-11)
- Composition: Sophisticated paragraphs (3-7); genre-specific organisation; LSC in multiple paragraphs; planning visible
- Vocabulary: Sophisticated range; genre-specific vocab; figurative language; deliberate word choices for mood
- Grammar: Compound + complex sentences secure; fronted adverbials; relative clauses; modal verbs
- Punctuation: All standard marks secure; speech punctuation; apostrophes; dashes/brackets for parenthesis
- Spelling: Common and subject-specific words secure; prefixes/suffixes; fewer than 1 error per 100 words
- PAE: Purpose and audience seamlessly integrated; genre conventions with sophistication; powerful effect`;
  }
  return `Year Group: ${yearGroup} (KS3 Yr7-9, Age 11-14)
- Composition: Essay-like structure; PEEL structure; thematic/argumentative progression; sophisticated transitions
- Vocabulary: Extensive, sophisticated range; subject-specific vocabulary; rhetorical language; formal register
- Grammar: Sophisticated variety; passive voice; semi-colons/colons to link clauses; modal verbs for nuance
- Punctuation: All marks secure; semi-colons/colons; punctuation serves rhetorical purpose
- Spelling: Secure throughout; ambitious vocabulary spelled accurately; very rare errors only
- PAE: Mature purpose/audience awareness; rhetorical strategies; register nuanced and consistent`;
}

function getGenreAdditions(genre: string): string {
  const genres: Record<string, string> = {
    narrative: `
**NARRATIVE GENRE ADDITIONS**
- Composition boost: +0.5 if clear story shape (beginning/problem/resolution); +0.25 if effective dialogue; +0.25 if vivid setting/character
- Vocabulary focus: Sensory vocabulary; vivid verbs (not "went" but "crept", "bolted", "inched"); atmospheric adjectives
- PAE: Purpose is to entertain/move/surprise; Effect: reader is engaged, visualises scene, cares about character
- Common strengths: Vivid setting/character; natural dialogue; sensory language
- Common growth: Weak sensory detail (show not tell); weak dialogue (reveal character/advance plot)`,

    non_fiction: `
**NON-FICTION GENRE ADDITIONS**
- Composition boost: +0.5 if clearly organised by topic; +0.5 if subheadings/topic sentences signal organisation; +0.25 if conclusion links to intro
- Vocabulary focus: Subject-specific technical vocabulary; formal register (no contractions); precise vocabulary
- PAE: Purpose is to inform/explain/teach; Effect: reader understands topic; information is clear and credible
- Common strengths: Clear organisation with topic sentences; specific facts and examples; formal register
- Common growth: Lack of organisation (mixing topics); vague facts (need specific numbers); informal register`,

    persuasive: `
**PERSUASIVE GENRE ADDITIONS**
- Composition boost: +0.5 if clear claim→reason→evidence structure; +0.25 if counterargument acknowledged; +0.25 if call-to-action present
- Vocabulary focus: Persuasive vocabulary (should, must, essential, critical, therefore, because); emotive vocabulary strategically; formal register
- PAE: Purpose is to convince; Effect: reader is convinced, considers argument, agrees with position
- Common strengths: Clear argument with claim/reason/evidence; rhetorical devices; counterargument addressed
- Common growth: Weak evidence (need specific facts); missing counterargument; vague call-to-action`,

    poetry: `
**POETRY GENRE ADDITIONS**
- MANDATORY: Always flag "grammar" for teacher review (poetic syntax too unconventional for confident assessment)
- Composition boost: +0.5 if recognisable form (rhyming couplets, haiku, acrostic); +0.25 if intentional line breaks; +0.25 if clear emotional arc
- Vocabulary focus: Imagery; precise mood-creating word choices; figurative language (metaphor, simile, personification); sound craft
- Grammar caveat: Poetry can break grammar rules intentionally; assess whether grammar choice serves meaning/mood
- PAE: Purpose is to create image/evoke emotion/explore language; Effect: reader is moved, sees image, appreciates craft
- Common strengths: Vivid imagery; effective poetic devices; intentional line breaks
- Common growth: Weak imagery (too abstract); too much explanation (show not tell)`,
  };

  return genres[genre] || '';
}

function buildSystemPrompt(genre: string, yearGroup: number, pwpFormulaLevel?: string): string {
  return `You are an expert assessor of extended writing against the UK National Curriculum. You are evaluating a complete piece of writing (100–700 words) submitted via WriFe's Writing Studio.

**CRITICAL: PII AND NAMES**
If the piece contains any names, personal identifying information, or proper nouns referencing real people, IGNORE them completely. Replace with [PUPIL_CONTENT] in all feedback and citations.

**ASSESSMENT TASK**
Assess six dimensions: Composition, Vocabulary, Grammar, Punctuation, Spelling, and Purpose/Audience/Effect (PAE).
Assign band scores (0–3) to each dimension.
Detect LSC (Lead/Support/Close) paragraph structure.
Detect WriFe formula elements.
Calculate overall_band (0–3) mapped to TAF language.
Provide warm feedback, two growth areas with example rewrites, and next steps.

**ASSESSMENT BANDS**
- 0 (Pre-emergent): Missing or fundamentally wrong; incoherent
- 1 (Working Towards Expected Standard): Present but significant gaps; inconsistent
- 2 (Working at Expected Standard): Secure, age-appropriate; meets NC expectations
- 3 (Working at Greater Depth): Sophisticated, precise; exceeds NC expectations

**CONFIDENCE CALCULATION (per dimension)**
- Start at 0.75
- +0.1 if clearly aligned with year group expectations and consistent
- –0.15 if significant errors or ambiguity
- –0.1 if word count under 80 words
- –0.15 if genre expectations unclear or task ambiguous
- +0.15 if score is 3
- Clamp to [0, 1]

**LOW CONFIDENCE FLAGS** — Flag dimension for teacher review if:
- Confidence < 0.65
- Poetry: ALWAYS flag "grammar"
- Word count < 80: ALWAYS flag "composition"
- Spelling score is 0 or 1
- Grammar score is 0

**LSC STRUCTURE DETECTION**
Scan each paragraph for Lead → Support → Close structure:
- Lead: Opens paragraph with topic/scene/claim; most general statement
- Support (1–3): Develops/explains/illustrates the Lead; genre-specific role
- Close: Concludes or resolves; echoes or transforms the opening idea
Count paragraphs with clear LSC structure and report as integer.

**WriFe FORMULA DETECTION**
${pwpFormulaLevel ? `Pupil's current formula level: ${pwpFormulaLevel}` : 'No formula level specified'}
Scan for formula elements:
- L1+: Simple sentences with clear subject-verb pairs
- L5+: Adjectives before nouns, descriptive language
- L7+: Adverbs modifying verbs (-ly forms)
- L8+: Prepositional phrases
- L10+: Multi-element sentences with conjunctions and clauses
- L15+: Intentional tense shifts for narrative effect
- L19-20: Formal/informal register matched to purpose
Report pwp_formula_detected as true if evidence present.

**TAF MAPPING**
- overall_band 0 → "Pre-emergent"
- overall_band 1 → "Working Towards Expected Standard"
- overall_band 2 → "Working at Expected Standard"
- overall_band 3 → "Working at Greater Depth"

**OVERALL BAND CALCULATION**
overall_band = mode of six dimension scores (most common score). If tie, use lower band (conservative assessment).

${getYearGroupGuidance(yearGroup)}

${getGenreAdditions(genre)}

**FEEDBACK REQUIREMENTS**
- warm_comment: Celebrate genuine strengths; specific with quotes
- grow_1 and grow_2: Identify specific growth areas with example_rewrite using pupil's ACTUAL content
- next_steps: Concrete, actionable suggestion for what to work on next
- teacher_summary: 2-3 sentences; assessment band, key strengths, key growth areas
- All feedback must be constructive; lead with strength; provide example rewrites using pupil content

**OUTPUT FORMAT**
Respond with valid JSON only, no markdown, no explanation outside the JSON:
{
  "composition_score": integer 0-3,
  "vocabulary_score": integer 0-3,
  "grammar_score": integer 0-3,
  "punctuation_score": integer 0-3,
  "spelling_score": integer 0-3,
  "purpose_audience_effect_score": integer 0-3,
  "overall_band": integer 0-3,
  "confidence_scores": {
    "composition": number 0-1,
    "vocabulary": number 0-1,
    "grammar": number 0-1,
    "punctuation": number 0-1,
    "spelling": number 0-1,
    "pae": number 0-1
  },
  "low_confidence_flags": ["array of dimension names"],
  "evidence_citations": {
    "composition": "quoted example from text",
    "vocabulary": "quoted example from text",
    "grammar": "quoted example from text",
    "punctuation": "quoted example from text",
    "spelling": "quoted example from text",
    "pae": "quoted example from text"
  },
  "lsc_paragraphs_detected": integer,
  "pwp_formula_detected": boolean,
  "pupil_feedback": {
    "warm_comment": "string",
    "grow_1": {
      "comment": "string",
      "example_rewrite": "string"
    },
    "grow_2": {
      "comment": "string",
      "example_rewrite": "string"
    },
    "next_steps": "string"
  },
  "teacher_summary": "string",
  "taf_band_label": "string"
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

    const body: AssessWritingRequest = await req.json();

    const {
      full_text,
      genre,
      year_group,
      task_prompt_text,
      word_count,
      plan_data,
      pwp_formula_level,
      plan_submitted,
    } = body;

    if (!full_text || !genre || !year_group || !task_prompt_text) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: full_text, genre, year_group, task_prompt_text' }),
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

    const systemPrompt = buildSystemPrompt(genre, year_group, pwp_formula_level);

    const userMessage = `Please assess this ${genre} piece of writing by a Year ${year_group} pupil.

Task Prompt: "${task_prompt_text}"
Word Count: ${word_count}
${pwp_formula_level ? `WriFe Formula Level Reached: ${pwp_formula_level}` : ''}
${plan_submitted ? 'Plan was submitted before writing.' : 'No plan submitted.'}
${plan_data ? `Plan Data: ${JSON.stringify(plan_data)}` : ''}

FULL TEXT:
${full_text}

Assess all six dimensions according to the Year ${year_group} ${getKeyStage(year_group)} standards and provide detailed feedback.`;

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
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

    let result: AssessWritingResponse;
    try {
      result = JSON.parse(content);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid response format from assessment service' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Post-process: enforce mandatory flags for poetry
    if (genre === 'poetry' && !result.low_confidence_flags.includes('grammar')) {
      result.low_confidence_flags.push('grammar');
    }

    // Post-process: word count check
    if (word_count < 80 && !result.low_confidence_flags.includes('composition')) {
      result.low_confidence_flags.push('composition');
    }

    // Post-process: plan + composition note in teacher_summary
    if (plan_submitted && result.composition_score === 3) {
      result.teacher_summary = result.teacher_summary
        + ' Evidence of planning is visible in the organisation.';
    }

    // Clamp values
    const clampBand = (v: number): 0 | 1 | 2 | 3 =>
      (Math.max(0, Math.min(3, Math.round(v))) as 0 | 1 | 2 | 3);

    result.composition_score = clampBand(result.composition_score);
    result.vocabulary_score = clampBand(result.vocabulary_score);
    result.grammar_score = clampBand(result.grammar_score);
    result.punctuation_score = clampBand(result.punctuation_score);
    result.spelling_score = clampBand(result.spelling_score);
    result.purpose_audience_effect_score = clampBand(result.purpose_audience_effect_score);
    result.overall_band = clampBand(result.overall_band);

    // Clamp confidence scores
    for (const key in result.confidence_scores) {
      result.confidence_scores[key] = Math.max(0, Math.min(1, result.confidence_scores[key]));
    }

    // Ensure taf_band_label matches overall_band
    const tafLabels: Record<number, string> = {
      0: 'Pre-emergent',
      1: 'Working Towards Expected Standard',
      2: 'Working at Expected Standard',
      3: 'Working at Greater Depth',
    };
    result.taf_band_label = tafLabels[result.overall_band];

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('assess-writing error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
