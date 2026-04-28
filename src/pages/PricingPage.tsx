/**
 * WF-058: Pricing Page
 * Parent-facing plan selection: free tier vs. pro upgrade.
 * Pro button calls the stripe-checkout Edge Function.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

// Update this with the real monthly Price ID once created in the Stripe Dashboard
const PRO_MONTHLY_PRICE_ID = import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID ?? ''

const FEATURES_FREE = [
  'Access to first 10 WriFe levels (L1–L10)',
  'Daily streak tracking',
  'Basic progress dashboard',
  'Up to 1 child profile',
]

const FEATURES_PRO = [
  'All 67 WriFe levels unlocked',
  'AI-powered writing feedback',
  'Weekly progress email digest',
  'Full badges and XP system',
  'Up to 3 child profiles',
  'Writing Studio access',
]

export default function PricingPage() {
  const navigate = useNavigate()
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')

  const handleProCheckout = async () => {
    setCheckoutError('')

    // Guard: if no Price ID configured yet, route to parent dashboard as fallback
    if (!PRO_MONTHLY_PRICE_ID) {
      console.warn('VITE_STRIPE_PRO_MONTHLY_PRICE_ID not set — skipping checkout')
      navigate('/parent', { replace: true })
      return
    }

    setIsCheckingOut(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/login'); return }

      const res = await supabase.functions.invoke('stripe-checkout', {
        body: { priceId: PRO_MONTHLY_PRICE_ID },
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
        className="text-center mb-10"
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

      {/* Plan cards */}
      <div className="w-full max-w-2xl flex flex-col sm:flex-row gap-4">
        {/* ── Free card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="flex-1 rounded-2xl p-6"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="mb-4">
            <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>
              FREE
            </p>
            <p className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
              £0
              <span className="text-sm font-normal" style={{ color: 'var(--color-text-muted)' }}> / month</span>
            </p>
          </div>

          <ul className="space-y-2 mb-6">
            {FEATURES_FREE.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-text)' }}>
                <span style={{ color: '#059669', marginTop: 2 }}>✓</span>
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

        {/* ── Pro card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.18 }}
          className="flex-1 rounded-2xl p-6 relative"
          style={{
            backgroundColor: '#059669',
            border: '2px solid #059669',
          }}
        >
          {/* Badge */}
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold"
            style={{ backgroundColor: '#F5A623', color: '#fff', whiteSpace: 'nowrap' }}
          >
            Most popular
          </div>

          <div className="mb-4">
            <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
              PRO
            </p>
            <p className="text-3xl font-bold" style={{ color: '#fff' }}>
              £4.99
              <span className="text-sm font-normal" style={{ color: 'rgba(255,255,255,0.7)' }}> / month</span>
            </p>
          </div>

          <ul className="space-y-2 mb-6">
            {FEATURES_PRO.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm" style={{ color: '#fff' }}>
                <span style={{ color: 'rgba(255,255,255,0.9)', marginTop: 2 }}>✓</span>
                <span data-tts={f}>{f}</span>
              </li>
            ))}
          </ul>

          {checkoutError && (
            <p className="mb-2 text-xs text-center" style={{ color: '#FCA5A5' }}>{checkoutError}</p>
          )}

          <button
            onClick={handleProCheckout}
            disabled={isCheckingOut}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{ backgroundColor: '#fff', color: '#059669' }}
            data-testid="plan-pro-btn"
            data-tts="Start pro plan"
          >
            {isCheckingOut ? 'Redirecting to checkout…' : 'Start Pro — £4.99 / month'}
          </button>

          <p className="mt-2 text-center text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Cancel any time. No commitment.
          </p>
        </motion.div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-xs"
        style={{ color: 'var(--color-text-muted)' }}
        data-tts="WriFe pricing"
      >
        WriFe · Questions? Email{' '}
        <a href="mailto:hello@wrife.co.uk" style={{ color: 'var(--color-brand-primary)' }}>
          hello@wrife.co.uk
        </a>
      </motion.p>
    </div>
  )
}
