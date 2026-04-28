/**
 * WF-056 — Teacher Onboarding Wizard
 * 3-step wizard for teachers with no school_id linked.
 * Step 1: School details → Step 2: Profile → Step 3: Quick-start
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { StepWizard } from '../components/ui/StepWizard'
import { SchoolPhase } from '../types/index'

const STEPS = ['Your School', 'Your Profile', "You're Ready!"]

interface SchoolFormData {
  name: string
  urn: string
  phase: SchoolPhase
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user, profile, setProfile } = useAuthStore()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [schoolData, setSchoolData] = useState<SchoolFormData>({
    name: '',
    urn: '',
    phase: SchoolPhase.PRIMARY,
  })
  const [firstName, setFirstName] = useState(profile?.first_name ?? '')

  // ─── Step 1: Create school ─────────────────────────────────────────────────

  const handleSchoolSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schoolData.name.trim() || !schoolData.urn.trim()) return
    setStep(1)
  }

  // ─── Step 2: Profile confirm ───────────────────────────────────────────────

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Use profile.id if available, otherwise fall back to the auth user id
    const profileId = profile?.id ?? user?.id
    if (!firstName.trim() || !profileId) return
    setSaving(true)
    setError(null)

    try {
      // Create school
      const { data: school, error: schoolErr } = await supabase
        .from('schools')
        .insert({
          name: schoolData.name,
          urn: schoolData.urn,
          phase: schoolData.phase,
        })
        .select()
        .single()

      if (schoolErr) throw schoolErr

      // Upsert profile — insert if no row exists yet (new teacher sign-up),
      // or update if the row already exists. Always sets role to 'teacher'.
      const { data: updatedProfile, error: profileErr } = await supabase
        .from('profiles')
        .upsert(
          { id: profileId, school_id: school.id, first_name: firstName, role: 'teacher' },
          { onConflict: 'id' }
        )
        .select()
        .single()

      if (profileErr) throw profileErr

      if (updatedProfile) setProfile(updatedProfile as typeof profile)
      setStep(2)
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'An error occurred. Please try again.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  // ─── Step 3: Done ──────────────────────────────────────────────────────────

  const handleFinish = () => {
    navigate('/teacher', { replace: true })
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--color-background)' }}
      data-testid="onboarding-page"
    >
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-brand-primary)' }}>
            Set up WriFe
          </h1>
          <StepWizard steps={STEPS} currentStep={step} />
        </div>

        {/* Step 1 */}
        {step === 0 && (
          <form onSubmit={handleSchoolSubmit} className="space-y-4" data-testid="school-form">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
              Welcome! Tell us about your school
            </h2>

            <div className="flex flex-col gap-1">
              <label htmlFor="school-name" className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                School name
              </label>
              <input
                id="school-name"
                type="text"
                required
                value={schoolData.name}
                onChange={(e) => setSchoolData((d) => ({ ...d, name: e.target.value }))}
                data-testid="school-name-input"
                className="rounded-lg px-3 py-2 text-sm"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                placeholder="e.g. St Mary's Primary School"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="school-urn" className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                URN (UK School Reference Number)
              </label>
              <input
                id="school-urn"
                type="text"
                required
                pattern="\d{6}"
                maxLength={6}
                value={schoolData.urn}
                onChange={(e) => setSchoolData((d) => ({ ...d, urn: e.target.value }))}
                data-testid="school-urn-input"
                className="rounded-lg px-3 py-2 text-sm"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                placeholder="6-digit URN"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="school-phase" className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                School phase
              </label>
              <select
                id="school-phase"
                value={schoolData.phase}
                onChange={(e) => setSchoolData((d) => ({ ...d, phase: e.target.value as SchoolPhase }))}
                data-testid="school-phase-select"
                className="rounded-lg px-3 py-2 text-sm"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              >
                <option value={SchoolPhase.PRIMARY}>Primary</option>
                <option value={SchoolPhase.SECONDARY}>Secondary</option>
                <option value={SchoolPhase.ALL_THROUGH}>All-through</option>
              </select>
            </div>

            <button
              type="submit"
              data-testid="school-next-button"
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white mt-2"
              style={{ backgroundColor: 'var(--color-brand-primary)' }}
            >
              Next
            </button>
          </form>
        )}

        {/* Step 2 */}
        {step === 1 && (
          <form onSubmit={handleProfileSubmit} className="space-y-4" data-testid="profile-form">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
              Set up your profile
            </h2>

            <div className="flex flex-col gap-1">
              <label htmlFor="first-name" className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                First name
              </label>
              <input
                id="first-name"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                data-testid="first-name-input"
                className="rounded-lg px-3 py-2 text-sm"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            <div
              className="rounded-lg p-3 text-sm"
              style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)' }}
            >
              <p style={{ color: 'var(--color-text-muted)' }}>
                <span className="font-medium" style={{ color: 'var(--color-text)' }}>Role:</span> Teacher
              </p>
              <p className="mt-1" style={{ color: 'var(--color-text-muted)' }}>
                <span className="font-medium" style={{ color: 'var(--color-text)' }}>School:</span> {schoolData.name}
              </p>
            </div>

            {error && (
              <p className="text-sm" style={{ color: '#DC2626' }} role="alert">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={saving}
                data-testid="profile-next-button"
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: 'var(--color-brand-primary)', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Saving…' : 'Finish setup'}
              </button>
            </div>
          </form>
        )}

        {/* Step 3 */}
        {step === 2 && (
          <div className="space-y-5 text-center" data-testid="onboarding-complete">
            <div className="text-5xl" aria-hidden="true">🎉</div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
              You're ready! Here's what to do next.
            </h2>
            <ul className="text-sm text-left space-y-2" style={{ color: 'var(--color-text-muted)' }}>
              <li className="flex items-start gap-2">
                <span style={{ color: 'var(--color-brand-primary)' }}>1.</span>
                <span>Create a class and invite your pupils</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: 'var(--color-brand-primary)' }}>2.</span>
                <span>Assign a writing task to get started</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: 'var(--color-brand-primary)' }}>3.</span>
                <span>Review pupil submissions in the Pending Review tab</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: 'var(--color-brand-primary)' }}>4.</span>
                <span>Track progress in the Analytics tab</span>
              </li>
            </ul>
            <button
              type="button"
              onClick={handleFinish}
              data-testid="go-to-dashboard-button"
              className="w-full py-3 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: 'var(--color-brand-primary)' }}
            >
              Go to Teacher Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
