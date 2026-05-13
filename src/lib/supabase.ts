import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnon) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

// ── Route A (school hub SSO) detection ────────────────────────────────────
// School pupils arrive via: https://pwp-studio.wrife.co.uk/dashboard#access_token=...
// We must read the hash BEFORE createClient() processes and clears it.
// sessionStorage clears on tab close — a fresh direct load never shows the ← WriFe button.
if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
  sessionStorage.setItem('entryViaHub', '1')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnon, {
  auth: {
    autoRefreshToken:  true,
    persistSession:    true,
    detectSessionInUrl: true,  // processes the hash token on Route A
  },
})
