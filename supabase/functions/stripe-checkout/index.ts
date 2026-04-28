/**
 * stripe-checkout — POST /stripe-checkout
 *
 * Creates a Stripe Checkout session for a WriFe parent subscription.
 * Requires an authenticated user (Supabase JWT).
 *
 * Body: { priceId: string }
 * Returns: { url: string } — redirect the client to this URL
 *
 * Environment variables required:
 *   STRIPE_SECRET_KEY
 *   NEXT_PUBLIC_SITE_URL  (or SITE_URL) — base URL for success/cancel redirects
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@^14';
import { createClient } from 'npm:@supabase/supabase-js@^2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return null;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── Auth: extract Supabase user from JWT ────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const jwt = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── Parse body ──────────────────────────────────────────────────────────
  let priceId: string;
  try {
    const body = await req.json();
    priceId = body.priceId;
    if (!priceId) throw new Error('priceId is required');
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── Stripe init ─────────────────────────────────────────────────────────
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2024-06-20',
  });

  const siteUrl = Deno.env.get('SITE_URL') ?? 'https://app.wrife.co.uk';

  // ── Retrieve or create Stripe customer ─────────────────────────────────
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('stripe_customer_id, first_name')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return new Response(JSON.stringify({ error: 'Profile not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let stripeCustomerId: string = profile.stripe_customer_id ?? '';

  if (!stripeCustomerId) {
    // Create a new Stripe customer and save it
    const customer = await stripe.customers.create({
      email: user.email,
      name: profile.first_name ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    stripeCustomerId = customer.id;

    await supabase
      .from('profiles')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', user.id);
  }

  // ── Create checkout session ─────────────────────────────────────────────
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/parent?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/pricing?checkout=cancelled`,
    allow_promotion_codes: true,
    metadata: { supabase_user_id: user.id },
  });

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
