/**
 * WF-037: Settings Page — /settings
 * Sections: Display, Accessibility, Account.
 * Saves to Supabase profiles and settingsStore.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useSettingsStore } from '../stores/settingsStore'
import { supabase } from '../lib/supabase'
import { applyHighContrastPreference } from '../lib/contrastMode'
import { sfx } from '../lib/sfx'

const AVATAR_COLOURS = [
  '#2563EB', // blue (noun)
  '#7C3AED', // purple (determiner)
  '#16A34A', // green (adjective)
  '#DC2626', // red (verb)
  '#EA580C', // orange (adverb)
  '#92400E', // brown (preposition)
  '#DB2777', // pink (pronoun)
  '#CA8A04', // yellow (conjunction)
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, profile, setProfile } = useAuthStore()
  const {
    ttsEnabled,
    ttsRate,
    highContrast,
    fontSize,
    avatarColour,
    sfxEnabled,
    sfxVolume,
    setTtsEnabled,
    setTtsRate,
    setHighContrast,
    setFontSize,
    setAvatarColour,
    setSfxEnabled,
    setSfxVolume,
  } = useSettingsStore()

  const [firstName, setFirstName] = useState(profile?.first_name ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // S-03: Sync persisted sfx settings → sfx module on every mount.
  // The sfx module resets to defaults when the page reloads; the store is
  // the source of truth since it persists to localStorage.
  // Using a one-time init pattern avoids useEffect dependency churn.
  useState(() => {
    sfx.setEnabled(sfxEnabled)
    sfx.setVolume(sfxVolume)
  })

  const handleSaveName = async () => {
    if (!user?.id || !firstName.trim()) return
    setSaving(true)
    try {
      const { data } = await supabase
        .from('profiles')
        .update({ first_name: firstName.trim() })
        .eq('id', user.id)
        .select()
        .single()
      if (data && setProfile) setProfile(data as typeof profile)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const handleHighContrastToggle = (enabled: boolean) => {
    setHighContrast(enabled)
    applyHighContrastPreference(enabled)
  }

  // S-03: SFX handlers — keep sfx module in sync with persisted settings
  const handleSfxEnabledToggle = (enabled: boolean) => {
    setSfxEnabled(enabled)
    sfx.setEnabled(enabled)
    // Play a preview tone so the user can hear the change
    if (enabled) sfx.click()
  }

  const handleSfxVolumeChange = (vol: number) => {
    setSfxVolume(vol)
    sfx.setVolume(vol)
  }

  const handleFontSizeChange = (size: 'normal' | 'large') => {
    setFontSize(size)
    if (size === 'large') {
      document.documentElement.classList.add('font-large')
    } else {
      document.documentElement.classList.remove('font-large')
    }
  }

  return (
    <div
      className="min-h-screen pb-12"
      style={{ backgroundColor: 'var(--color-background)' }}
      data-testid="settings-page"
    >
      {/* Header */}
      <header
        className="px-4 py-4 flex items-center justify-between sticky top-0 z-10"
        style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
      >
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="text-sm px-3 py-1.5 rounded-lg"
          style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
          data-testid="settings-back"
          data-tts="Back to dashboard"
        >
          ← Back
        </button>
        <span
          className="font-bold text-base"
          style={{ color: 'var(--color-text)' }}
          data-tts="Settings"
        >
          Settings
        </span>
        <div style={{ width: '60px' }} />
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* ── Display ──────────────────────────────────────────────────── */}
        <section
          className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          data-testid="settings-display"
        >
          <h2 className="font-semibold text-base" style={{ color: 'var(--color-text)' }} data-tts="Display">
            Display
          </h2>

          {/* Avatar colour */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Avatar Colour
            </p>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_COLOURS.map((colour) => (
                <button
                  key={colour}
                  type="button"
                  onClick={() => setAvatarColour(colour)}
                  aria-label={`Avatar colour ${colour}`}
                  data-testid={`avatar-colour-${colour}`}
                  className="w-9 h-9 rounded-full transition-transform focus:outline-none focus-visible:ring-2"
                  style={{
                    backgroundColor: colour,
                    transform: avatarColour === colour ? 'scale(1.2)' : 'scale(1)',
                    boxShadow: avatarColour === colour ? `0 0 0 3px #fff, 0 0 0 5px ${colour}` : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Font size */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Font Size
            </p>
            <div className="flex gap-2">
              {(['normal', 'large'] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleFontSizeChange(size)}
                  data-testid={`font-size-${size}`}
                  className="px-4 py-2 rounded-lg text-sm font-medium capitalize"
                  style={{
                    backgroundColor: fontSize === size ? 'var(--color-brand-primary)' : 'var(--color-background)',
                    color: fontSize === size ? '#fff' : 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Sound Effects ─────────────────────────────────────────── */}
        {/* S-03: new section — previously sfxEnabled/sfxVolume had no UI */}
        <section
          className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          data-testid="settings-sfx"
        >
          <h2 className="font-semibold text-base" style={{ color: 'var(--color-text)' }} data-tts="Sound Effects">
            Sound Effects
          </h2>

          {/* SFX on/off toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }} data-tts="Sound effects">
                Sound Effects
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Tones for correct answers, badges, and level-ups
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={sfxEnabled}
              onClick={() => handleSfxEnabledToggle(!sfxEnabled)}
              data-testid="sfx-toggle"
              className="relative w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2"
              style={{ backgroundColor: sfxEnabled ? 'var(--color-brand-primary)' : 'var(--color-border)' }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                style={{ transform: sfxEnabled ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </button>
          </div>

          {/* SFX volume slider — only shown when SFX is on */}
          {sfxEnabled && (
            <div>
              <label
                className="text-xs font-medium flex items-center justify-between mb-2"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <span>Volume</span>
                <span>{Math.round(sfxVolume * 100)}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={sfxVolume}
                onChange={(e) => handleSfxVolumeChange(Number(e.target.value))}
                onMouseUp={() => sfx.click()}
                onTouchEnd={() => sfx.click()}
                data-testid="sfx-volume-slider"
                className="w-full accent-orange-500"
                aria-label="Sound effects volume"
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                <span>Quieter</span>
                <span>Louder</span>
              </div>
            </div>
          )}
        </section>

        {/* ── Accessibility ────────────────────────────────────────────── */}
        <section
          className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          data-testid="settings-accessibility"
        >
          <h2 className="font-semibold text-base" style={{ color: 'var(--color-text)' }} data-tts="Accessibility">
            Accessibility
          </h2>

          {/* TTS toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }} data-tts="Read aloud (TTS)">
                Read Aloud (TTS)
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                UK English voice, child-appropriate speed
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={ttsEnabled}
              onClick={() => setTtsEnabled(!ttsEnabled)}
              data-testid="tts-toggle"
              className="relative w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2"
              style={{ backgroundColor: ttsEnabled ? 'var(--color-brand-primary)' : 'var(--color-border)' }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                style={{ transform: ttsEnabled ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </button>
          </div>

          {/* TTS rate slider */}
          {ttsEnabled && (
            <div>
              <label
                className="text-xs font-medium flex items-center justify-between mb-2"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <span>Reading speed</span>
                <span>{ttsRate.toFixed(2)}×</span>
              </label>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.05}
                value={ttsRate}
                onChange={(e) => setTtsRate(Number(e.target.value))}
                data-testid="tts-rate-slider"
                className="w-full accent-blue-600"
                aria-label="Reading speed"
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                <span>Slower</span>
                <span>Faster</span>
              </div>
            </div>
          )}

          {/* High contrast */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }} data-tts="High contrast mode">
                High Contrast Mode
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Black background, white text, increased contrast
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={highContrast}
              onClick={() => handleHighContrastToggle(!highContrast)}
              data-testid="high-contrast-toggle"
              className="relative w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2"
              style={{ backgroundColor: highContrast ? 'var(--color-brand-primary)' : 'var(--color-border)' }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                style={{ transform: highContrast ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </button>
          </div>
        </section>

        {/* ── Account ──────────────────────────────────────────────────── */}
        <section
          className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          data-testid="settings-account"
        >
          <h2 className="font-semibold text-base" style={{ color: 'var(--color-text)' }} data-tts="Account">
            Account
          </h2>

          {/* First name */}
          <div>
            <label
              htmlFor="first-name"
              className="text-xs font-medium"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Display Name
            </label>
            <div className="flex gap-2 mt-1">
              <input
                id="first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={40}
                data-testid="first-name-input"
                className="flex-1 rounded-lg px-3 py-2 text-sm"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              />
              <button
                type="button"
                onClick={handleSaveName}
                disabled={saving || !firstName.trim()}
                data-testid="save-name-button"
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity"
                style={{
                  backgroundColor: saved ? '#16A34A' : 'var(--color-brand-primary)',
                  opacity: saving || !firstName.trim() ? 0.5 : 1,
                }}
              >
                {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          {/* Email (read-only) */}
          <div>
            <label
              className="text-xs font-medium"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Email Address
            </label>
            <p
              className="mt-1 text-sm px-3 py-2 rounded-lg"
              style={{
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)',
              }}
              data-testid="email-display"
            >
              {user?.email ?? '—'}
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
