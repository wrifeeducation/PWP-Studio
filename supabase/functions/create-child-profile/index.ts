/**
 * create-child-profile Edge Function
 * Called from ParentPage after parent signup when sessionStorage has 'wrife_pending_child'.
 *
 * POST body: { nickname: string, year_group: number }
 * Auth: parent JWT (verify_jwt = true)
 *
 * Behaviour:
 *   1. Verifies the caller is a parent (role = 'parent' in profiles).
 *   2. Generates a unique 6-digit PIN for the home pupil.
 *      Uses home-{pin}@wrife.school as the Supabase auth email (distinct from
 *      school pupils who use pupil-{4digit-pin}@wrife.school).
 *   3. Creates a Supabase auth user with the service role key.
 *   4. Creates a profile row: role=pupil, first_name=nickname, year_group.
 *   5. Creates a parent_pupil link: parent_id=caller, pupil_id=new user, approved=true.
 *   6. Returns { pupil_id, first_name, year_group, pin } so the parent can share PIN with child.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Generate a random 6-digit PIN as a zero-padded string. */
function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── 1. Extract and validate body ──────────────────────────────────────────
    const { nickname, year_group } = await req.json() as {
      nickname: string
      year_group: number
    }

    if (!nickname || typeof year_group !== 'number') {
      return new Response(
        JSON.stringify({ error: 'nickname and year_group are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 2. Identify the calling parent from their JWT ─────────────────────────
    const authHeader = req.headers.get('Authorization') ?? ''
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser()
    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the caller is a parent
    const { data: parentProfile, error: profileError } = await callerClient
      .from('profiles')
      .select('id, role')
      .eq('id', caller.id)
      .single()

    if (profileError || parentProfile?.role !== 'parent') {
      return new Response(
        JSON.stringify({ error: 'Only parents can create child profiles' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 3. Admin client for user creation ─────────────────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // ── 4. Generate unique PIN (retry up to 5 times on collision) ─────────────
    let pin = ''
    let newUserId = ''

    for (let attempt = 0; attempt < 5; attempt++) {
      pin = generatePin()
      const email = `home-${pin}@wrife.school`

      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: pin,
        email_confirm: true,        // home pupils don't go through email confirm flow
        user_metadata: {
          first_name: nickname,
          role: 'pupil',
          is_home_pupil: true,
        },
      })

      if (!createError && created?.user) {
        newUserId = created.user.id
        break
      }

      // If the email already exists, try a new PIN
      if (createError?.message?.includes('already registered') ||
          createError?.message?.includes('already exists')) {
        continue
      }

      // Any other error is fatal
      console.error('create-child-profile: auth.admin.createUser error', createError?.message)
      return new Response(
        JSON.stringify({ error: 'Failed to create child account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!newUserId) {
      return new Response(
        JSON.stringify({ error: 'Could not generate a unique PIN after 5 attempts. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 5. Create profile row ─────────────────────────────────────────────────
    // The handle_new_user trigger fires on auth.admin.createUser and inserts a
    // minimal profile (id, email, role, display_name). We UPDATE to add the
    // fields the trigger doesn't know about. Using UPDATE avoids the NOT NULL
    // email constraint problem that upsert INSERT would hit.
    const { error: profileInsertError } = await supabaseAdmin
      .from('profiles')
      .update({
        role: 'pupil',
        first_name: nickname,
        year_group,
        pin_code: pin,
        is_active: true,
        membership_tier: 'free',
      })
      .eq('id', newUserId)

    if (profileInsertError) {
      console.error('create-child-profile: profile insert error', profileInsertError.message)
      // Clean up the auth user to avoid orphaned accounts
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
      return new Response(
        JSON.stringify({ error: 'Failed to create child profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 6. Link parent ↔ pupil ────────────────────────────────────────────────
    const { error: linkError } = await supabaseAdmin
      .from('parent_pupil')
      .insert({
        parent_id: caller.id,
        pupil_id: newUserId,
        approved: true,
        is_direct_signup: true,
        child_display_name: nickname,
      })

    if (linkError) {
      console.error('create-child-profile: parent_pupil insert error', linkError.message)
      // Not fatal — the pupil account exists, parent can be re-linked manually
      // but return a warning
      return new Response(
        JSON.stringify({
          success: true,
          warning: 'Child account created but parent link failed — contact support',
          pupil_id: newUserId,
          first_name: nickname,
          year_group,
          pin,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 7. Return success ─────────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        pupil_id: newUserId,
        first_name: nickname,
        year_group,
        pin,   // Parent shares this PIN with the child for login
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('create-child-profile: unexpected error', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
