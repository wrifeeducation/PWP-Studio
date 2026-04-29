/**
 * admin-action Edge Function
 * Handles privileged admin operations that require service_role access.
 * Caller must be an authenticated admin (checked via ADMIN_EMAILS allowlist).
 *
 * Supported actions:
 *   create_school    — insert a new school row
 *   delete_school    — delete a school by id
 *   delete_user      — delete a user from auth + profiles
 *   update_role      — change a user's role
 *   reset_password   — send a password reset email to a user
 *   find_user_email  — look up a user id/profile by email (auth.users join)
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

    // Use anon client to verify the caller's identity
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

    // ── Service role client for privileged operations ─────────────────────────
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json()
    const { action, ...payload } = body

    // ── Action handlers ───────────────────────────────────────────────────────

    if (action === 'create_school') {
      const { name, contactEmail } = payload
      if (!name) return err('name is required')
      const { data, error } = await admin
        .from('schools')
        .insert({ name, contact_email: contactEmail || null })
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

    if (action === 'delete_user') {
      const { userId } = payload
      if (!userId) return err('userId is required')
      // Delete profile first (FK), then auth user
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

    if (action === 'reset_password') {
      const { userId } = payload
      if (!userId) return err('userId is required')
      // Get the user's email via service role
      const { data: authUser, error: lookupError } = await admin.auth.admin.getUserById(userId)
      if (lookupError || !authUser?.user?.email) return err('User not found')
      const siteUrl = Deno.env.get('SITE_URL') ?? 'https://pwp-studio.wrife.co.uk'
      const { error } = await admin.auth.resetPasswordForEmail(authUser.user.email, {
        redirectTo: `${siteUrl}/auth/confirm`,
      })
      if (error) return err(error.message)
      return ok({ sent: true, email: authUser.user.email })
    }

    if (action === 'find_user_email') {
      // Look up a profile by email — joins auth.users (service role only)
      const { email } = payload
      if (!email) return err('email is required')
      const { data: authUser, error: lookupError } = await admin.auth.admin.listUsers()
      if (lookupError) return err(lookupError.message)
      const match = authUser.users.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      )
      if (!match) return ok({ user: null })
      const { data: profile } = await admin
        .from('profiles')
        .select('*')
        .eq('id', match.id)
        .single()
      return ok({ user: { ...profile, email: match.email, id: match.id } })
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
