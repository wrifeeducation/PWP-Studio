// Shared pupil-name resolver.
//
// School pupils arrive via Route A SSO and carry their name in the JWT
// user_metadata (first_name / display_name). Their `profiles` row is a stub
// with a NULL first_name, so reading `profile.first_name` alone falls back to
// "Writer". The JWT is the authoritative source at SSO time and is the same
// data the wrife.co.uk hub and Interactive Practice use — prefer it.
//
// Resolution order: JWT first_name → JWT display_name → profiles.first_name →
// local pupilSession.username → fallback ('Writer').

import type { User } from '@supabase/supabase-js'

type ProfileLike = { first_name?: string | null } | null | undefined

export function resolvePupilName(
  user: User | null | undefined,
  profile: ProfileLike,
  fallback = 'Writer',
): string {
  const meta = (user?.user_metadata ?? {}) as {
    first_name?: string
    display_name?: string
  }

  const fromToken = meta.first_name?.trim() || meta.display_name?.trim()
  if (fromToken) return fromToken

  const fromProfile = profile?.first_name?.trim()
  if (fromProfile) return fromProfile

  try {
    const s = localStorage.getItem('pupilSession')
    if (s) {
      const parsed = JSON.parse(s) as { username?: string }
      if (parsed?.username?.trim()) return parsed.username.trim()
    }
  } catch {
    /* ignore malformed localStorage */
  }

  return fallback
}
