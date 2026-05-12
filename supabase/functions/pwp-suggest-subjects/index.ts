import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

interface SuggestSubjectsRequest {
  pupilId: string;
  themeNoun: string;
  genreHint?: string;
}

interface SuggestSubjectsResponse {
  suggestions: string[];
}

const FALLBACK_SUGGESTIONS = [
  'the ancient warrior',
  'a silver rocket',
  'the curious explorer',
];

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

    const body: SuggestSubjectsRequest = await req.json();
    const { pupilId, themeNoun, genreHint } = body;

    if (!pupilId || !themeNoun) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: pupilId, themeNoun' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the pupil's recent subject nouns so we can avoid repetition
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: recentSessions } = await supabase
      .from('pwp_sessions')
      .select('subject_noun')
      .eq('pupil_id', pupilId)
      .order('created_at', { ascending: false })
      .limit(10);

    const recentSubjects = [...new Set(
      (recentSessions ?? []).map((s) => s.subject_noun).filter(Boolean)
    )].slice(0, 6);

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ suggestions: FALLBACK_SUGGESTIONS } as SuggestSubjectsResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const recentContext = recentSubjects.length > 0
      ? `\nThe pupil has recently written about: ${recentSubjects.map((s) => `"${s}"`).join(', ')}. Avoid repeating these or very similar subjects.\n`
      : '';

    const genreContext = genreHint
      ? `\nThe session genre direction is: ${genreHint}. Choose subjects that lend themselves naturally to ${genreHint} writing.\n`
      : '';

    const prompt = `Generate exactly 3 varied subject noun phrases for a UK primary school pupil's writing practice session.

This week's teacher theme: "${themeNoun}"
${genreContext}${recentContext}
RULES:
- Each suggestion should be 2–5 words and start with "the", "a", or "an"
- Suggestions should relate to or be inspired by the theme, but can interpret it creatively
- All 3 should be distinct from each other in tone and imagery
- Keep language age-appropriate for UK primary school (Years 3–6)
- Do NOT use people's names

Respond with valid JSON only:
{ "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"] }`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error('Anthropic API error:', await response.text());
      return new Response(
        JSON.stringify({ suggestions: FALLBACK_SUGGESTIONS } as SuggestSubjectsResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const rawContent = data.content?.[0]?.text ?? '';
    const content = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

    let result: SuggestSubjectsResponse;
    try {
      result = JSON.parse(content);
      // Validate: must be an array of 3 strings
      if (!Array.isArray(result.suggestions) || result.suggestions.length === 0) {
        throw new Error('Invalid suggestions shape');
      }
      result.suggestions = result.suggestions.slice(0, 3);
    } catch {
      return new Response(
        JSON.stringify({ suggestions: FALLBACK_SUGGESTIONS } as SuggestSubjectsResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('pwp-suggest-subjects error:', err);
    return new Response(
      JSON.stringify({ suggestions: FALLBACK_SUGGESTIONS } as SuggestSubjectsResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
