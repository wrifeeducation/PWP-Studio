/**
 * invite-teacher Edge Function
 * Uses the Supabase Admin API (service role key) to send an invitation email.
 * POST body: { email: string, first_name: string, school_id: string }
 *
 * The invited user is created with role='teacher' in auth.users;
 * a profile row should be created by a DB trigger or by a second insert here.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, first_name, school_id } = await req.json() as {
      email: string
      first_name: string
      school_id: string
    }

    if (!email || !first_name || !school_id) {
      return new Response(
        JSON.stringify({ error: 'email, first_name, and school_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Admin client uses service role key — only available server-side
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Invite user via Supabase Admin API
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        first_name,
        school_id,
        role: 'teacher',
      },
      redirectTo: `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '') ?? ''}/accept-invite`,
    })

    if (error) {
      console.error('invite-teacher error:', error.message)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // After invite, create a pending profile row so the admin can see the teacher
    // (auth trigger may also do this — check on_auth_user_created trigger if set up)
    if (data?.user) {
      await supabaseAdmin.from('profiles').upsert({
        id: data.user.id,
        school_id,
        role: 'teacher',
        first_name,
        avatar_colour: 'blue',
      }, { onConflict: 'id', ignoreDuplicates: true })
    }

    return new Response(
      JSON.stringify({ success: true, user_id: data?.user?.id ?? null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('invite-teacher unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
