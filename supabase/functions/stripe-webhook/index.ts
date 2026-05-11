/**
 * stripe-webhook — POST /stripe-webhook
 *
 * Receives and verifies Stripe webhook events. Updates the user's subscription
 * state in either home_accounts (Route C/D: parents, independent teachers) or
 * profiles (school teachers), depending on which table holds the matching
 * stripe_customer_id.
 *
 * Events handled:
 *   checkout.session.completed        → set tier/status, upsert subscription
 *   customer.subscription.updated     → update tier/status on renewal/upgrade/downgrade
 *   customer.subscription.deleted     → reset tier to 'free', status to 'inactive'
 *
 * Table routing:
 *   We try home_accounts first (by stripe_customer_id). If found, we update
 *   subscription_tier and subscription_status there. Otherwise we fall back
 *   to profiles.membership_tier (for school teachers).
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

// ── Tier resolution ──────────────────────────────────────────────────────────
//
// Prefer product metadata (set `wrife_tier` = 'pro' on each Stripe product).
// This map is the belt-and-braces fallback using real Price IDs from Stripe.
//
const PRICE_ID_TO_TIER: Record<string, string> = {
  'price_1TRIq0Jw0OrBSQhGNomVeHsO': 'pro',   // Pro monthly £4.99
  'price_1TRa8qJw0OrBSQhGp9bQ1sMq': 'pro',   // Pro annual  £30
};

const VALID_TIERS = ['free', 'pro'];

function resolveTier(priceId: string, productMetadataTier?: string): string {
  // Prefer product metadata if set and valid
  if (productMetadataTier && VALID_TIERS.includes(productMetadataTier)) {
    return productMetadataTier;
  }
  // Fall back to hardcoded price ID map
  return PRICE_ID_TO_TIER[priceId] ?? 'free';
}

// ── Account updater: home_accounts first, profiles fallback ─────────────────

async function updateAccountTier(
  supabase: ReturnType<typeof createClient>,
  stripeCustomerId: string,
  tier: string,
  status: 'active' | 'inactive',
  stripeSubscriptionId?: string,
): Promise<void> {
  // Try home_accounts first (Route C/D: parents and independent teachers)
  const { data: homeAccount } = await supabase
    .from('home_accounts')
    .select('id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();

  if (homeAccount) {
    const updatePayload: Record<string, unknown> = {
      subscription_tier: tier,
      subscription_status: status,
      updated_at: new Date().toISOString(),
    };
    // Persist the subscription ID when we have it (set on checkout, clear on delete)
    if (stripeSubscriptionId !== undefined) {
      updatePayload.stripe_subscription_id = stripeSubscriptionId;
    }
    await supabase
      .from('home_accounts')
      .update(updatePayload)
      .eq('stripe_customer_id', stripeCustomerId);

    console.log(
      `stripe-webhook: updated home_accounts — customer ${stripeCustomerId} → tier=${tier} status=${status}`,
    );
    return;
  }

  // Fall back to profiles (school teachers subscribed via wrife.co.uk)
  await supabase
    .from('profiles')
    .update({ membership_tier: tier })
    .eq('stripe_customer_id', stripeCustomerId);

  console.log(
    `stripe-webhook: updated profiles — customer ${stripeCustomerId} → membership_tier=${tier}`,
  );
}

// ── subscriptions table upsert (unified audit record) ───────────────────────

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

// ── Resolve Stripe subscription status → our status field ───────────────────
//
// Stripe subscription statuses: trialing | active | incomplete | incomplete_expired
//                                past_due | canceled | unpaid | paused
// We collapse to 'active' for paying statuses, 'inactive' for everything else.
//
function resolveStatus(stripeStatus: string): 'active' | 'inactive' {
  return stripeStatus === 'active' || stripeStatus === 'trialing' ? 'active' : 'inactive';
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

      // ── checkout.session.completed ─────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') break;

        const customerId = session.customer as string;
        const userId = session.metadata?.supabase_user_id;
        const subscriptionId = session.subscription as string | undefined;

        // Expand line items to get product metadata for tier resolution
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
          expand: ['data.price.product'],
        });

        const firstItem = lineItems.data[0];
        const product = firstItem?.price?.product as Stripe.Product | undefined;
        const priceId = firstItem?.price?.id ?? '';
        const tier = resolveTier(priceId, product?.metadata?.wrife_tier);

        // Update the account tier and status
        await updateAccountTier(supabase, customerId, tier, 'active', subscriptionId);

        // Upsert the subscription row for audit/reporting
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertSubscription(supabase, sub, userId);
        }

        console.log(
          `stripe-webhook: checkout completed — customer ${customerId} → tier ${tier}`,
        );
        break;
      }

      // ── customer.subscription.updated ─────────────────────────────────────
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        // Expand to get product metadata for tier resolution
        const expandedSub = await stripe.subscriptions.retrieve(sub.id, {
          expand: ['items.data.price.product'],
        });

        const item = expandedSub.items.data[0];
        const product = item?.price?.product as Stripe.Product | undefined;
        const priceId = item?.price?.id ?? '';
        const tier = resolveTier(priceId, product?.metadata?.wrife_tier);
        const status = resolveStatus(expandedSub.status);

        await updateAccountTier(supabase, customerId, tier, status, sub.id);
        await upsertSubscription(supabase, expandedSub);

        console.log(
          `stripe-webhook: subscription updated — customer ${customerId} → tier ${tier} status ${status}`,
        );
        break;
      }

      // ── customer.subscription.deleted ─────────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        // Reset to free / inactive; keep stripe_subscription_id for audit trail
        await updateAccountTier(supabase, customerId, 'free', 'inactive');
        await upsertSubscription(supabase, sub);

        console.log(
          `stripe-webhook: subscription deleted — customer ${customerId} → free/inactive`,
        );
        break;
      }

      default:
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
