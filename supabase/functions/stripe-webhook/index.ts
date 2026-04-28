/**
 * stripe-webhook — POST /stripe-webhook
 *
 * Receives and verifies Stripe webhook events. Updates the user's
 * membership_tier in the profiles table and writes to the subscriptions table.
 *
 * Events handled:
 *   checkout.session.completed        → set tier, upsert subscription
 *   customer.subscription.updated     → update tier on upgrade/downgrade/renewal
 *   customer.subscription.deleted     → reset tier to 'free'
 *
 * Environment variables required:
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * IMPORTANT: raw body must be read before any JSON parsing.
 * This function always calls req.text() and never req.json().
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@^14';
import { createClient } from 'npm:@supabase/supabase-js@^2';

// ── Tier resolution ─────────────────────────────────────────────────────────
//
// Prefer product metadata (set `wrife_tier` = 'pro' on each Stripe product).
// This map is the belt-and-braces fallback — update with real Price IDs once
// products are created in the Stripe Dashboard.
//
// Format: 'price_XXXX': 'tier'
const PRICE_ID_TO_TIER: Record<string, string> = {
  // Monthly + yearly pro prices — replace with real IDs from Stripe Dashboard
  // price_pro_monthly: 'pro',
  // price_pro_yearly: 'pro',
};

const VALID_TIERS = ['free', 'pro'];

function resolveTier(priceId: string, productMetadataTier?: string): string {
  // Prefer product metadata if set and valid
  if (productMetadataTier && VALID_TIERS.includes(productMetadataTier)) {
    return productMetadataTier;
  }
  // Fall back to hardcoded map
  return PRICE_ID_TO_TIER[priceId] ?? 'free';
}

// ── Supabase helpers ─────────────────────────────────────────────────────────

async function setUserTier(
  supabase: ReturnType<typeof createClient>,
  stripeCustomerId: string,
  tier: string,
): Promise<void> {
  await supabase
    .from('profiles')
    .update({ membership_tier: tier })
    .eq('stripe_customer_id', stripeCustomerId);
}

async function upsertSubscription(
  supabase: ReturnType<typeof createClient>,
  sub: Stripe.Subscription,
  userId?: string,
): Promise<void> {
  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;

  await supabase.from('subscriptions').upsert({
    id: sub.id,
    user_id: userId ?? null,
    status: sub.status,
    price_id: priceId,
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  });
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // CRITICAL: read raw body BEFORE any parsing
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature');

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!webhookSecret || !sig) {
    console.error('stripe-webhook: missing secret or signature');
    return new Response('Webhook secret or signature missing', { status: 400 });
  }

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2024-06-20',
  });

  // ── Verify signature ──────────────────────────────────────────────────────
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('stripe-webhook: signature verification failed', err);
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // ── Handle events ─────────────────────────────────────────────────────────
  try {
    switch (event.type) {
      // ── checkout.session.completed ───────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') break;

        const customerId = session.customer as string;
        const userId = session.metadata?.supabase_user_id;

        // Expand line items to get product metadata for tier resolution
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
          expand: ['data.price.product'],
        });

        const firstItem = lineItems.data[0];
        const product = firstItem?.price?.product as Stripe.Product | undefined;
        const priceId = firstItem?.price?.id ?? '';
        const tier = resolveTier(priceId, product?.metadata?.wrife_tier);

        // Update profile tier
        await setUserTier(supabase, customerId, tier);

        // Upsert subscription record
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          await upsertSubscription(supabase, sub, userId);
        }

        console.log(`stripe-webhook: checkout completed — customer ${customerId} → tier ${tier}`);
        break;
      }

      // ── customer.subscription.updated ───────────────────────────────────
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        // Expand to get product metadata
        const expandedSub = await stripe.subscriptions.retrieve(sub.id, {
          expand: ['items.data.price.product'],
        });

        const item = expandedSub.items.data[0];
        const product = item?.price?.product as Stripe.Product | undefined;
        const priceId = item?.price?.id ?? '';
        const tier = resolveTier(priceId, product?.metadata?.wrife_tier);

        await setUserTier(supabase, customerId, tier);
        await upsertSubscription(supabase, expandedSub);

        console.log(`stripe-webhook: subscription updated — customer ${customerId} → tier ${tier}`);
        break;
      }

      // ── customer.subscription.deleted ────────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        await setUserTier(supabase, customerId, 'free');
        await upsertSubscription(supabase, sub);

        console.log(`stripe-webhook: subscription deleted — customer ${customerId} → free`);
        break;
      }

      default:
        // Unhandled event type — ignore silently
        console.log(`stripe-webhook: unhandled event type ${event.type}`);
    }
  } catch (err) {
    console.error('stripe-webhook: handler error', err);
    // Return 500 so Stripe retries
    return new Response('Internal server error', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
