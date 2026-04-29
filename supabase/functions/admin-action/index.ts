/**
 * admin-action Edge Function
 * Handles privileged admin operations that require service_role access.
 * Caller must be an authenticated admin (checked via ADMIN_EMAILS allowlist).
 *
 * Supported actions:
 *   create_school         — insert a new school row
 *   delete_school         — delete a school by id
 *   toggle_school_status  — set school status (active/trial/suspended/expired)
 *   set_school_quota      — update max_teachers / max_pupils for a school
 *   invite_school_admin   — invite a user as school_admin for a school
 *   delete_user           — delete a user from auth + profiles
 *   update_role           — change a user's role
 *   change_tier           — change a user's membership_tier
 *   toggle_active         — activate or deactivate a user account
 *   reset_password        — send a password reset email to a user
 *   reset_pupil_pin       — set a new PIN for a pupil account
 *   find_user_email       — look up a user id/profile by email (auth.users join)
 *   assign_teacher_to_school — move an independent teacher into a school
 *   create_user           — create a new user account (any role)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ADMIN_EMAILS = [
  'mankrah@kafed.org.uk',
  'wrife.education@gmail.com',
  'miyk99@gmail.com',
  'admin@wrife-test.com',
]

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Auth: verify caller is a known admin ──────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await anonClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!ADMIN_EMAILS.includes(user.email ?? '')) {
      return new Response(JSON.stringify({ error: 'Forbidden — not an admin account' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Service role client ───────────────────────────────────────────────────
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json()
    const { action, ...payload } = body

    // ─────────────────────────────────────────────────────────────────────────
    // SCHOOL ACTIONS
    // ─────────────────────────────────────────────────────────────────────────

    if (action === 'create_school') {
      const { name, contactEmail, urn, phase, subscriptionTier, maxTeachers, maxPupils } = payload
      if (!name) return err('name is required')
      const { data, error } = await admin
        .from('schools')
        .insert({
          name,
          contact_email: contactEmail || null,
          urn: urn || String(Date.now()),  // fallback if URN not provided
          phase: phase || 'primary',
          subscription_tier: subscriptionTier || 'trial',
          max_teachers: maxTeachers ?? 5,
          max_pupils: maxPupils ?? 150,
          status: 'trial',
        })
        .select()
        .single()
      if (error) return err(error.message)
      return ok({ school: data })
    }

    if (action === 'delete_school') {
      const { schoolId } = payload
      if (!schoolId) return err('schoolId is required')
      const { error } = await admin.from('schools').delete().eq('id', schoolId)
      if (error) return err(error.message)
      return ok({ deleted: true })
    }

    if (action === 'toggle_school_status') {
      const { schoolId, status } = payload
      if (!schoolId || !status) return err('schoolId and status are required')
      const validStatuses = ['active', 'trial', 'suspended', 'expired']
      if (!validStatuses.includes(status)) return err('Invalid status')
      const { error } = await admin.from('schools').update({ status }).eq('id', schoolId)
      if (error) return err(error.message)
      return ok({ updated: true })
    }

    if (action === 'set_school_quota') {
      const { schoolId, maxTeachers, maxPupils, subscriptionTier } = payload
      if (!schoolId) return err('schoolId is required')
      const updates: Record<string, unknown> = {}
      if (maxTeachers !== undefined) updates.max_teachers = Number(maxTeachers)
      if (maxPupils !== undefined) updates.max_pupils = Number(maxPupils)
      if (subscriptionTier) updates.subscription_tier = subscriptionTier
      if (Object.keys(updates).length === 0) return err('No quota fields provided')
      const { error } = await admin.from('schools').update(updates).eq('id', schoolId)
      if (error) return err(error.message)
      return ok({ updated: true })
    }

    if (action === 'invite_school_admin') {
      // Invite a user as school_admin for a given school.
      // If they're already a user, update their role + school_id.
      // If new, send an invitation email via Supabase admin API.
      const { schoolId, email, firstName } = payload
      if (!schoolId || !email) return err('schoolId and email are required')

      const siteUrl = Deno.env.get('SITE_URL') ?? 'https://pwp-studio.wrife.co.uk'

      // Check if user already exists
      const { data: existingUsers } = await admin.auth.admin.listUsers()
      const existing = existingUsers?.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

      if (existing) {
        // Update existing user to school_admin role
        const { error: updateError } = await admin
          .from('profiles')
          .update({ role: 'school_admin', school_id: schoolId })
          .eq('id', existing.id)
        if (updateError) return err(updateError.message)
        // Mark school admin_user_id
        await admin.from('schools').update({ admin_user_id: existing.id }).eq('id', schoolId)
        return ok({ invited: false, updated: true, userId: existing.id })
      }

      // New user — send invite
      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
        data: {
          first_name: firstName || email.split('@')[0],
          role: 'school_admin',
          school_id: schoolId,
        },
        redirectTo: `${siteUrl}/auth/confirm`,
      })
      if (inviteError) return err(inviteError.message)

      // Create profile immediately so school admin appears in dashboard
      if (invited?.user) {
        await admin.from('profiles').upsert({
          id: invited.user.id,
          school_id: schoolId,
          role: 'school_admin',
          first_name: firstName || email.split('@')[0],
          membership_tier: 'school',
          is_active: true,
        }, { onConflict: 'id', ignoreDuplicates: true })
        await admin.from('schools').update({ admin_user_id: invited.user.id }).eq('id', schoolId)
      }
      return ok({ invited: true, userId: invited?.user?.id ?? null })
    }

    if (action === 'assign_teacher_to_school') {
      const { userId, schoolId } = payload
      if (!userId || !schoolId) return err('userId and schoolId are required')
      const { error } = await admin
        .from('profiles')
        .update({ school_id: schoolId, membership_tier: 'school' })
        .eq('id', userId)
        .eq('role', 'teacher')
      if (error) return err(error.message)
      return ok({ assigned: true })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // USER ACTIONS
    // ─────────────────────────────────────────────────────────────────────────

    if (action === 'delete_user') {
      const { userId } = payload
      if (!userId) return err('userId is required')
      await admin.from('profiles').delete().eq('id', userId)
      const { error } = await admin.auth.admin.deleteUser(userId)
      if (error) return err(error.message)
      return ok({ deleted: true })
    }

    if (action === 'update_role') {
      const { userId, role } = payload
      if (!userId || !role) return err('userId and role are required')
      const validRoles = ['pupil', 'teacher', 'school_admin', 'parent']
      if (!validRoles.includes(role)) return err('Invalid role')
      const { error } = await admin.from('profiles').update({ role }).eq('id', userId)
      if (error) return err(error.message)
      return ok({ updated: true })
    }

    if (action === 'change_tier') {
      const { userId, tier } = payload
      if (!userId || !tier) return err('userId and tier are required')
      const validTiers = ['free', 'pro', 'school']
      if (!validTiers.includes(tier)) return err('Invalid tier')
      const { error } = await admin.from('profiles').update({ membership_tier: tier }).eq('id', userId)
      if (error) return err(error.message)
      return ok({ updated: true })
    }

    if (action === 'toggle_active') {
      const { userId, activate } = payload
      if (!userId || activate === undefined) return err('userId and activate are required')
      const { error } = await admin.from('profiles').update({ is_active: Boolean(activate) }).eq('id', userId)
      if (error) return err(error.message)
      return ok({ updated: true })
    }

    if (action === 'reset_password') {
      const { userId } = payload
      if (!userId) return err('userId is required')
      const { data: authUser, error: lookupError } = await admin.auth.admin.getUserById(userId)
      if (lookupError || !authUser?.user?.email) return err('User not found')
      const siteUrl = Deno.env.get('SITE_URL') ?? 'https://pwp-studio.wrife.co.uk'
      const { error } = await admin.auth.resetPasswordForEmail(authUser.user.email, {
        redirectTo: `${siteUrl}/auth/confirm`,
      })
      if (error) return err(error.message)
      return ok({ sent: true, email: authUser.user.email })
    }

    if (action === 'reset_pupil_pin') {
      const { userId, newPin } = payload
      if (!userId || !newPin) return err('userId and newPin are required')
      if (String(newPin).length < 4) return err('PIN must be at least 4 digits')
      // Update auth password (pupils auth via synthetic email + PIN as password)
      const { error: pwError } = await admin.auth.admin.updateUserById(userId, { password: String(newPin) })
      if (pwError) return err(pwError.message)
      // Also store PIN in profiles for display
      await admin.from('profiles').update({ pin_code: String(newPin) }).eq('id', userId)
      return ok({ updated: true })
    }

    if (action === 'find_user_email') {
      const { email } = payload
      if (!email) return err('email is required')
      const { data: authUser, error: lookupError } = await admin.auth.admin.listUsers()
      if (lookupError) return err(lookupError.message)
      const match = authUser.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
      if (!match) return ok({ user: null })
      const { data: profile } = await admin
        .from('profiles')
        .select('*')
        .eq('id', match.id)
        .single()
      return ok({ user: { ...profile, email: match.email, id: match.id } })
    }

    if (action === 'create_user') {
      // Create a new user with any role, sending them an invitation email
      const { email, fullName, role, membershipTier, schoolId } = payload
      if (!email || !role) return err('email and role are required')
      const siteUrl = Deno.env.get('SITE_URL') ?? 'https://pwp-studio.wrife.co.uk'
      const firstName = fullName?.trim().split(' ')[0] || email.split('@')[0]

      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
        data: {
          first_name: firstName,
          role,
          school_id: schoolId || null,
        },
        redirectTo: `${siteUrl}/auth/confirm`,
      })
      if (inviteError) return err(inviteError.message)

      if (invited?.user) {
        await admin.from('profiles').upsert({
          id: invited.user.id,
          role,
          first_name: firstName,
          school_id: schoolId || null,
          membership_tier: membershipTier || 'free',
          is_active: true,
        }, { onConflict: 'id', ignoreDuplicates: true })
      }
      return ok({ created: true, userId: invited?.user?.id ?? null })
    }

    return err(`Unknown action: ${action}`)

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function ok(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function err(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
