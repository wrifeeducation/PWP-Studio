/**
 * teacher-regenerate-pin Edge Function
 *
 * Allows teachers and school_admins to regenerate the PIN for a PIN-based pupil.
 * Verifies the pupil belongs to the caller's class or school before changing anything.
 *
 * POST body: { pupilId: string }
 * Auth: teacher or school_admin JWT (verify_jwt = true)
 *
 * Returns: { pin: string, syntheticEmail: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function ok(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function fail(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // ── 1. Parse body ─────────────────────────────────────────────────────────
    const { pupilId } = await req.json() as { pupilId: string }
    if (!pupilId?.trim()) return fail('pupilId is required')

    // ── 2. Verify caller is a teacher or school_admin ─────────────────────────
    const authHeader = req.headers.get('Authorization') ?? ''
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser()
    if (callerError || !caller) return fail('Unauthorized', 401)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, school_id')
      .eq('id', caller.id)
      .single()

    if (profileError || !callerProfile) return fail('Profile not found', 401)
    if (!['teacher', 'school_admin'].includes(callerProfile.role)) {
      return fail('Only teachers and school admins can regenerate pupil PINs', 403)
    }

    // ── 3. Load the pupil profile and verify ownership ────────────────────────
    const { data: pupilProfile, error: pupilError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, class_id, school_id')
      .eq('id', pupilId)
      .single()

    if (pupilError || !pupilProfile) return fail('Pupil not found', 404)
    if (pupilProfile.role !== 'pupil') return fail('Target user is not a pupil', 400)

    // Ownership check: pupil must belong to caller's class or (for school_admins) their school
    const { data: classes } = await supabaseAdmin
      .from('classes')
      .select('id')
      .eq('teacher_id', caller.id)

    const callerClassIds = (classes ?? []).map((c: { id: string }) => c.id)
    const pupilInCallerClass = pupilProfile.class_id && callerClassIds.includes(pupilProfile.class_id)
    const pupilInCallerSchool = callerProfile.school_id && pupilProfile.school_id === callerProfile.school_id

    if (!pupilInCallerClass && !pupilInCallerSchool) {
      return fail('This pupil does not belong to your class or school', 403)
    }

    // ── 4. Generate a new unique 4-digit PIN ──────────────────────────────────
    let newPin = ''
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = String(Math.floor(1000 + Math.random() * 9000))
      const syntheticEmail = `pupil-${candidate}@wrife.school`
      const { data: existing } = await supabaseAdmin.auth.admin.listUsers()
      const taken = existing?.users?.some(
        (u) => u.email === syntheticEmail && u.id !== pupilId
      )
      if (!taken) { newPin = candidate; break }
    }
    if (!newPin) return fail('Could not generate a unique PIN — please try again', 500)

    const newSyntheticEmail = `pupil-${newPin}@wrife.school`

    // ── 5. Update auth user: new email + password ─────────────────────────────
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUser(pupilId, {
      email: newSyntheticEmail,
      password: newPin,
    })
    if (updateAuthError) return fail(updateAuthError.message, 500)

    // ── 6. Update profile pin_code ────────────────────────────────────────────
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({ pin_code: newPin })
      .eq('id', pupilId)

    if (updateProfileError) {
      console.error('teacher-regenerate-pin: profile update error', updateProfileError.message)
      // Auth is already updated; log but don't fail the request
    }

    // ── 7. Return new PIN ─────────────────────────────────────────────────────
    return ok({ pin: newPin, syntheticEmail: newSyntheticEmail })

  } catch (err) {
    console.error('teacher-regenerate-pin: unexpected error', err)
    return fail('Internal server error', 500)
  }
})
