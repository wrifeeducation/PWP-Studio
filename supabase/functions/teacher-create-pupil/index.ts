/**
 * teacher-create-pupil Edge Function
 *
 * Allows teachers and school_admins to create PIN-based pupil accounts.
 * School teachers: pupil inherits teacher's school_id → 'school' tier (unlimited).
 * Independent teachers (no school_id): pupil gets 'free' tier.
 *
 * POST body: { firstName: string, yearGroup?: number, classId?: string }
 * Auth: teacher or school_admin JWT (verify_jwt = true)
 *
 * Returns: { pupilId, firstName, yearGroup, pin, syntheticEmail }
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
    const { firstName, yearGroup, classId } = await req.json() as {
      firstName: string
      yearGroup?: number
      classId?: string
    }
    if (!firstName?.trim()) return fail('firstName is required')

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
      return fail('Only teachers and school admins can create pupil accounts', 403)
    }

    // ── 3. Derive school context from the teacher's own profile ───────────────
    const schoolId: string | null = callerProfile.school_id ?? null
    // Grant 'school' tier if the pupil belongs to a school OR is being assigned
    // to a class (independent teachers have no school_id but their pupils should
    // still have unlimited stars).
    const membershipTier = (schoolId || classId) ? 'school' : 'free'

    // ── 4. Validate classId belongs to this teacher / school ──────────────────
    if (classId) {
      const { data: cls } = await supabaseAdmin
        .from('classes')
        .select('id, teacher_id, school_id')
        .eq('id', classId)
        .single()

      const classOwnedByTeacher = cls?.teacher_id === caller.id
      const classOwnedBySchool = schoolId && cls?.school_id === schoolId
      if (!classOwnedByTeacher && !classOwnedBySchool) {
        return fail('Class not found or not owned by this teacher', 403)
      }
    }

    // ── 5. Generate a unique 4-digit PIN ──────────────────────────────────────
    let pin = ''
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = String(Math.floor(1000 + Math.random() * 9000))
      const syntheticEmail = `pupil-${candidate}@wrife.school`
      const { data: existing } = await supabaseAdmin.auth.admin.listUsers()
      const taken = existing?.users?.some((u) => u.email === syntheticEmail)
      if (!taken) { pin = candidate; break }
    }
    if (!pin) return fail('Could not generate a unique PIN — please try again', 500)

    const syntheticEmail = `pupil-${pin}@wrife.school`

    // ── 6. Create auth user ───────────────────────────────────────────────────
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: syntheticEmail,
      password: pin,
      email_confirm: true,
      user_metadata: {
        first_name: firstName.trim(),
        role: 'pupil',
        school_id: schoolId,
      },
    })
    if (createError) return fail(createError.message, 500)
    if (!newUser?.user) return fail('Failed to create user', 500)

    // ── 7. Update profile (trigger already inserted minimal row) ─────────────
    const { error: updateError } = await supabaseAdmin.from('profiles').update({
      role: 'pupil',
      first_name: firstName.trim(),
      year_group: yearGroup ?? null,
      school_id: schoolId,
      class_id: classId ?? null,
      pin_code: pin,
      membership_tier: membershipTier,
      is_active: true,
    }).eq('id', newUser.user.id)

    if (updateError) {
      console.error('teacher-create-pupil: profile update error', updateError.message)
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return fail('Failed to create pupil profile', 500)
    }

    // ── 8. Return PIN to teacher ──────────────────────────────────────────────
    return ok({
      pupilId: newUser.user.id,
      firstName: firstName.trim(),
      yearGroup: yearGroup ?? null,
      pin,
      syntheticEmail,
      tier: membershipTier,
    })

  } catch (err) {
    console.error('teacher-create-pupil: unexpected error', err)
    return fail('Internal server error', 500)
  }
})
