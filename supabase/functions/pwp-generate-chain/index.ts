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

interface FormulaElement {
  id: string;
  code: string;
  name: string;
  description: string;
  unlock_lesson: number;
  word_classes: string[];
  sort_order: number;
  example: string;
}

interface ChainStep {
  elementId: string;
  code: string;
  formulaLabel: string;
  description: string;
  sortOrder: number;
  example: string;
}

interface GenerateChainRequest {
  pupilId: string;
  highestLesson: number;
  /** Optional override: use this custom chain instead of auto-generating */
  customElementIds?: string[];
}

interface GenerateChainResponse {
  chain: ChainStep[];
  source: 'auto' | 'custom';
  highestLesson: number;
}

/**
 * Determines the effective Formula 1 sort_order threshold.
 * Pupils who are more advanced skip the very basic elements that are
 * now fully internalised (no longer need deliberate practice).
 */
function getMinSortOrder(highestLesson: number): number {
  if (highestLesson >= 30) return 5;  // skip noun/determiner/proper noun/helping verb
  if (highestLesson >= 20) return 3;  // skip bare noun
  return 1;                           // include everything
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

    const body: GenerateChainRequest = await req.json();
    const { pupilId, highestLesson, customElementIds } = body;

    if (!pupilId || highestLesson === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: pupilId, highestLesson' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // --- Custom chain path ---
    if (customElementIds && customElementIds.length > 0) {
      const { data: elements, error } = await supabase
        .from('pwp_formula_elements')
        .select('id, code, name, description, unlock_lesson, word_classes, sort_order, example')
        .in('id', customElementIds)
        .eq('active', true);

      if (error) throw error;

      // Preserve the teacher's specified order
      const ordered = customElementIds
        .map(id => elements?.find((e: FormulaElement) => e.id === id))
        .filter((e): e is FormulaElement => !!e);

      const chain: ChainStep[] = ordered.map((el, idx) => ({
        elementId: el.id,
        code: el.code,
        formulaLabel: buildFormulaLabel(el, idx + 1),
        description: el.description,
        sortOrder: el.sort_order,
        example: el.example,
      }));

      return new Response(
        JSON.stringify({ chain, source: 'custom', highestLesson } as GenerateChainResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- Auto-generate path ---
    const minSortOrder = getMinSortOrder(highestLesson);

    const { data: elements, error } = await supabase
      .from('pwp_formula_elements')
      .select('id, code, name, description, unlock_lesson, word_classes, sort_order, example')
      .lte('unlock_lesson', highestLesson)
      .gte('sort_order', minSortOrder)
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    if (!elements || elements.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No formula elements found for this curriculum position' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const chain: ChainStep[] = (elements as FormulaElement[]).map((el, idx) => ({
      elementId: el.id,
      code: el.code,
      formulaLabel: buildFormulaLabel(el, idx + 1),
      description: el.description,
      sortOrder: el.sort_order,
      example: el.example,
    }));

    return new Response(
      JSON.stringify({ chain, source: 'auto', highestLesson } as GenerateChainResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('pwp-generate-chain error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildFormulaLabel(el: FormulaElement, stepNumber: number): string {
  return `Step ${stepNumber}: ${el.name} — ${el.description}`;
}
