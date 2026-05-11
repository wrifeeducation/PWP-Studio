import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

// ── Route A (hub SSO) detection ──────────────────────────────────────────────
// The Supabase SDK processes and clears the URL hash inside createClient().
// We must detect the access_token BEFORE createClient() runs — this module
// is imported first, so this check fires before any React component mounts.
// sessionStorage clears on tab close so a fresh direct load never incorrectly
// shows the ← WriFe back button.
if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
  sessionStorage.setItem('entryViaHub', '1')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
