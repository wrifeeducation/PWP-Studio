/**
 * WF-036: notify-teacher Edge Function
 * Sends an email notification to the teacher when a pupil submits a writing piece.
 *
 * Required secrets (set via `supabase secrets set`):
 *   RESEND_API_KEY — API key from resend.com
 *   APP_URL — the public URL of the app (e.g. https://pwp-studio.vercel.app)
 *
 * Fallback: if RESEND_API_KEY is not set, logs to intervention_log instead.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotifyTeacherPayload {
  pieceId: string
  pupilName: string
  teacherId: string
  genre: string
  wordCount: number
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const payload: NotifyTeacherPayload = await req.json()
    const { pieceId, pupilName, teacherId, genre, wordCount } = payload

    if (!pieceId || !pupilName || !teacherId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: pieceId, pupilName, teacherId' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const appUrl = Deno.env.get('APP_URL') ?? 'https://pwp-studio.vercel.app'
    const reviewUrl = `${appUrl}/teacher/review/${pieceId}`

    const emailBody = `New writing submission from ${pupilName} — ${genre}, ${wordCount} words.\n\nReview it here: ${reviewUrl}`

    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (resendApiKey) {
      // Fetch teacher email
      const { data: teacherAuth } = await supabase.auth.admin.getUserById(teacherId)
      const teacherEmail = teacherAuth?.user?.email

      if (teacherEmail) {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'WriFe <noreply@pwp-studio.vercel.app>',
            to: [teacherEmail],
            subject: `New submission from ${pupilName}`,
            text: emailBody,
          }),
        })

        if (!emailRes.ok) {
          console.error('Resend API error:', await emailRes.text())
          // Fall through to intervention_log fallback
        } else {
          return new Response(
            JSON.stringify({ success: true, method: 'email' }),
            { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    // Fallback: log to intervention_log
    await supabase.from('intervention_log').insert({
      pupil_id: teacherId, // placeholder — stores notification context
      trigger_layer: 'writing',
      trigger_date: new Date().toISOString().split('T')[0],
      error_pattern: { category: 'submission_notification', frequency: 1 },
      action_taken: emailBody,
      consolidation_pack_generated: false,
    })

    return new Response(
      JSON.stringify({ success: true, method: 'intervention_log_fallback' }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('notify-teacher error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
