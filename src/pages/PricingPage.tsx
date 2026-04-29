/**
 * WF-058: Pricing Page (v2 — 3-tier freemium / standard / annual)
 *
 * Tiers:
 *   Free      — £0, 3 formula sessions/day, no rewards
 *   Standard  — £4.99/month (VITE_STRIPE_PRO_MONTHLY_PRICE_ID)
 *   Annual    — £30/year  (VITE_STRIPE_PRO_ANNUAL_PRICE_ID)
 *
 * Monthly/Annual toggle controls which Pro price is sent to stripe-checkout.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

const PRO_MONTHLY_PRICE_ID = import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID ?? ''
const PRO_ANNUAL_PRICE_ID = import.meta.env.VITE_STRIPE_PRO_ANNUAL_PRICE_ID ?? ''

// ─── Feature lists ────────────────────────────────────────────────────────────

const FEATURES_FREE = [
  '3 formula practice sessions per day',
  'Access all 67 WriFe formula levels',
  'Basic progress tracking',
]

const FEATURES_PRO = [
  'Unlimited formula practice sessions',
  'Paragraph Builder (L8+)',
  'Writing Studio',
  'Full XP, badges & streak rewards',
  'AI-powered writing feedback',
  'Weekly progress email digest',
  'Up to 3 child profiles',
]

const FEATURES_FREE_MISSING = [
  'No Paragraph Builder',
  'No Writing Studio',
  'No XP, badges or streaks',
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const navigate = useNavigate()
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')

  const priceId = billing === 'monthly' ? PRO_MONTHLY_PRICE_ID : PRO_ANNUAL_PRICE_ID
  const proPrice = billing === 'monthly' ? '£4.99' : '£30'
  const proPeriod = billing === 'monthly' ? '/ month' : '/ year'
  const annualMonthlyEquiv = '£2.50 / month'

  const handleProCheckout = async () => {
    setCheckoutError('')

    if (!priceId) {
      console.warn('Stripe Price ID not configured for', billing, '— navigating to parent')
      navigate('/parent', { replace: true })
      return
    }

    setIsCheckingOut(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        navigate('/login')
        return
      }

      const res = await supabase.functions.invoke('stripe-checkout', {
        body: { priceId },
      })

      if (res.error) throw new Error(res.error.message)
      const { url } = res.data as { url: string }
      if (url) window.location.href = url
    } catch (err) {
      setCheckoutError('Something went wrong starting checkout. Please try again.')
      console.error('PricingPage: checkout error', err)
    } finally {
      setIsCheckingOut(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: 'var(--color-background)' }}
      data-testid="pricing-page"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-8"
      >
        <h1
          className="text-3xl font-bold mb-2"
          style={{ color: 'var(--color-brand-dark)' }}
          data-tts="Choose your plan"
        >
          Choose your plan
        </h1>
        <p
          className="text-base"
          style={{ color: 'var(--color-text-muted)' }}
          data-tts="Start for free, upgrade when you're ready"
        >
          Start for free — upgrade when you're ready
        </p>
      </motion.div>

      {/* Billing toggle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-1 mb-8 p-1 rounded-xl"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        role="group"
        aria-label="Billing period"
      >
        <button
          onClick={() => setBilling('monthly')}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{
            backgroundColor: billing === 'monthly' ? 'var(--color-brand-primary)' : 'transparent',
            color: billing === 'monthly' ? '#fff' : 'var(--color-text-muted)',
          }}
          data-testid="billing-monthly"
          data-tts="Monthly billing"
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling('annual')}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5"
          style={{
            backgroundColor: billing === 'annual' ? 'var(--color-brand-primary)' : 'transparent',
            color: billing === 'annual' ? '#fff' : 'var(--color-text-muted)',
          }}
          data-testid="billing-annual"
          data-tts="Annual billing, save 50 percent"
        >
          Annual
          <span
            className="text-xs font-bold px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: billing === 'annual' ? 'rgba(255,255,255,0.25)' : '#FEF3C7',
              color: billing === 'annual' ? '#fff' : '#92400E',
            }}
          >
            Save 50%
          </span>
        </button>
      </motion.div>

      {/* Plan cards — 3 column on sm+ */}
      <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* ── Free card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="rounded-2xl p-6 flex flex-col"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
          data-testid="plan-free-card"
        >
          <div className="mb-4">
            <p
              className="text-xs font-semibold tracking-widest uppercase mb-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              FREE
            </p>
            <p className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
              £0
              <span className="text-sm font-normal" style={{ color: 'var(--color-text-muted)' }}>
                {' '}/ month
              </span>
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              No credit card needed
            </p>
          </div>

          {/* What's included */}
          <ul className="space-y-1.5 mb-4 flex-1">
            {FEATURES_FREE.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-text)' }}>
                <span style={{ color: '#059669', marginTop: 2, flexShrink: 0 }}>✓</span>
                <span data-tts={f}>{f}</span>
              </li>
            ))}
            {FEATURES_FREE_MISSING.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
                <span style={{ marginTop: 2, flexShrink: 0 }}>✕</span>
                <span data-tts={f}>{f}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => navigate('/parent', { replace: true })}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity"
            style={{
              backgroundColor: 'transparent',
              border: '1.5px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
            data-testid="plan-free-btn"
            data-tts="Continue with free plan"
          >
            Continue with Free
          </button>
        </motion.div>

        {/* ── Pro (Standard/Annual) card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.22 }}
          className="rounded-2xl p-6 relative flex flex-col sm:col-span-2"
          style={{
            background: 'linear-gradient(135deg, #059669 0%, #0F766E 100%)',
            border: '2px solid #059669',
          }}
          data-testid="plan-pro-card"
        >
          {/* Badge */}
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold"
            style={{ backgroundColor: '#F5A623', color: '#fff', whiteSpace: 'nowrap' }}
          >
            Most popular
          </div>

          <div className="mb-4">
            <p
              className="text-xs font-semibold tracking-widest uppercase mb-1"
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              PRO
            </p>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-bold" style={{ color: '#fff' }}>
                {proPrice}
                <span className="text-sm font-normal" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {' '}{proPeriod}
                </span>
              </p>
              {billing === 'annual' && (
                <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  ({annualMonthlyEquiv})
                </p>
              )}
            </div>
            {billing === 'annual' && (
              <p className="text-xs mt-0.5 font-semibold" style={{ color: '#FDE68A' }}>
                You save £29.88 vs monthly
              </p>
            )}
          </div>

          <ul className="space-y-1.5 mb-6 flex-1">
            {FEATURES_PRO.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm" style={{ color: '#fff' }}>
                <span style={{ color: 'rgba(255,255,255,0.9)', marginTop: 2, flexShrink: 0 }}>✓</span>
                <span data-tts={f}>{f}</span>
              </li>
            ))}
          </ul>

          {checkoutError && (
            <p className="mb-2 text-xs text-center" style={{ color: '#FCA5A5' }}>
              {checkoutError}
            </p>
          )}

          <button
            onClick={handleProCheckout}
            disabled={isCheckingOut}
            className="w-full py-3 rounded-xl text-sm font-bold transition-opacity disabled:opacity-60"
            style={{ backgroundColor: '#fff', color: '#059669' }}
            data-testid="plan-pro-btn"
            data-tts={`Start Pro ${billing} plan`}
          >
            {isCheckingOut
              ? 'Redirecting to checkout…'
              : billing === 'monthly'
              ? 'Start Pro — £4.99 / month'
              : 'Start Pro — £30 / year'}
          </button>

          <p className="mt-2 text-center text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Cancel any time. No commitment.
          </p>
        </motion.div>
      </div>

      {/* School tier callout */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="mt-6 w-full max-w-3xl rounded-xl px-5 py-4 flex items-center justify-between gap-4"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
            🏫 School licence
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Per-school pricing for whole-class access. Includes teacher dashboard, class analytics & admin tools.
          </p>
        </div>
        <a
          href="mailto:schools@wrife.co.uk"
          className="text-xs font-semibold whitespace-nowrap px-4 py-2 rounded-lg"
          style={{
            backgroundColor: 'var(--color-background)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-brand-primary)',
          }}
          data-tts="Contact us for school pricing"
        >
          Contact us →
        </a>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="mt-6 text-xs"
        style={{ color: 'var(--color-text-muted)' }}
        data-tts="WriFe pricing"
      >
        WriFe · Questions?{' '}
        <a href="mailto:hello@wrife.co.uk" style={{ color: 'var(--color-brand-primary)' }}>
          hello@wrife.co.uk
        </a>
      </motion.p>
    </div>
  )
}
