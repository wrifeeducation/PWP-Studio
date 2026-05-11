/**
 * stripe-checkout — POST /stripe-checkout
 *
 * Creates a Stripe Checkout session for a WriFe subscription.
 * Handles both Route C/D users (home_accounts: parents, independent teachers)
 * and school teachers (profiles). Route C/D takes priority.
 *
 * Body: { priceId: string }
 * Returns: { url: string } — redirect the client to this URL
 *
 * The Stripe customer is tagged with `account_table` metadata so the webhook
 * knows which Supabase table to update on payment events.
 *
 * Environment variables required:
 *   STRIPE_SECRET_KEY
 *   SITE_URL               — base URL for success/cancel redirects
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // ── Auth: extract Supabase user from JWT ──────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const jwt = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  // ── Parse body ────────────────────────────────────────────────────────────
  let priceId: string;
  try {
    const body = await req.json();
    priceId = body.priceId;
    if (!priceId) throw new Error('priceId is required');
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  // ── Stripe init ───────────────────────────────────────────────────────────
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2024-06-20',
  });

  const siteUrl = Deno.env.get('SITE_URL') ?? 'https://pwp-studio.wrife.co.uk';

  // ── Resolve account: home_accounts first, profiles fallback ──────────────
  //
  // Route C (parents) and Route D (independent teachers) live in home_accounts.
  // School teachers who somehow reach this page live in profiles.
  // We store `account_table` in the Stripe customer metadata so the webhook
  // knows which table to update — no guesswork needed at payment time.

  type AccountTable = 'home_accounts' | 'profiles';

  let accountTable: AccountTable;
  let accountId: string;
  let displayName: string | undefined;
  let existingCustomerId: string;

  const { data: homeAccount, error: homeErr } = await supabase
    .from('home_accounts')
    .select('id, stripe_customer_id, display_name, email')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!homeErr && homeAccount) {
    // Route C / D user
    accountTable = 'home_accounts';
    accountId = homeAccount.id;
    displayName = homeAccount.display_name ?? undefined;
    existingCustomerId = homeAccount.stripe_customer_id ?? '';
  } else {
    // Fall back to profiles (school teacher path)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, stripe_customer_id, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('stripe-checkout: account not found for user', user.id);
      return json({ error: 'Account not found' }, 404);
    }

    accountTable = 'profiles';
    accountId = profile.id;
    const nameParts = [profile.first_name, profile.last_name].filter(Boolean);
    displayName = nameParts.length > 0 ? nameParts.join(' ') : undefined;
    existingCustomerId = profile.stripe_customer_id ?? '';
  }

  // ── Retrieve or create Stripe customer ────────────────────────────────────
  let stripeCustomerId = existingCustomerId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: displayName,
      metadata: {
        supabase_user_id: user.id,
        account_table: accountTable,
      },
    });
    stripeCustomerId = customer.id;

    // Persist the customer ID back to the correct table
    if (accountTable === 'home_accounts') {
      await supabase
        .from('home_accounts')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', accountId);
    } else {
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', accountId);
    }
  }

  // ── Create Stripe Checkout session ────────────────────────────────────────
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/parent?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/pricing?checkout=cancelled`,
    allow_promotion_codes: true,
    metadata: {
      supabase_user_id: user.id,
      account_table: accountTable,
    },
  });

  console.log(
    `stripe-checkout: session created for ${accountTable} user ${user.id} — customer ${stripeCustomerId}`,
  );

  return json({ url: session.url });
});
