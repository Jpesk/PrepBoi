// supabase/functions/notify-email/index.ts
//
// Deploy:  supabase functions deploy notify-email
// Secrets: supabase secrets set RESEND_API_KEY=re_xxxx FROM_EMAIL=hello@yourdomain.com APP_URL=https://yourapp.com
//
// Wire up: Dashboard → Database → Webhooks → Create webhook
//   Table: notifications  |  Events: INSERT  |  URL: your edge function URL

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM       = Deno.env.get('FROM_EMAIL') ?? 'noreply@prepboi.app'
const APP_URL    = Deno.env.get('APP_URL')    ?? 'https://prepboi.app'
const SB_URL     = Deno.env.get('SUPABASE_URL')!
const SB_SK      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SB_URL, SB_SK)

serve(async (req: Request) => {
  try {
    const { record } = await req.json()
    if (!record || record.email_sent) return new Response('skip', { status: 200 })
    if (!['task_submitted','training_assigned'].includes(record.type))
      return new Response('n/a', { status: 200 })

    // Fetch recipient email via admin API (needs service role key)
    const { data: { user }, error } = await supabase.auth.admin.getUserById(record.recipient_id)
    if (error || !user?.email) return new Response('no email', { status: 200 })

    const isTask   = record.type === 'task_submitted'
    const accent   = isTask ? '#84CC16' : '#F59E0B'
    const icon     = isTask ? '✅' : '📖'
    const ctaLabel = isTask ? 'View Submission →' : 'Start Training →'

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:24px;background:#1a1a18;font-family:-apple-system,sans-serif;">
<div style="max-width:480px;margin:0 auto;background:#111310;border-radius:14px;overflow:hidden;border:1px solid #2E332A;">
  <div style="padding:20px 24px;border-bottom:1px solid #2E332A;">
    <span style="font-size:19px;font-weight:900;color:#F0EBE1;">prep</span><span style="font-size:19px;font-weight:900;color:#F59E0B;">boi</span>
    <span style="font-size:10px;color:#4A4840;text-transform:uppercase;letter-spacing:2px;margin-left:8px;">kitchen ops</span>
  </div>
  <div style="padding:28px 24px;">
    <div style="font-size:36px;margin-bottom:14px;">${icon}</div>
    <h2 style="margin:0 0 8px;font-size:19px;font-weight:800;color:${accent};">${record.title}</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#B8B09E;line-height:1.65;">${record.body}</p>
    <a href="${APP_URL}" style="display:inline-block;padding:12px 22px;background:${accent};color:#0A0B09;font-weight:800;font-size:14px;border-radius:8px;text-decoration:none;">${ctaLabel}</a>
  </div>
  <div style="padding:14px 24px;border-top:1px solid #2E332A;">
    <p style="margin:0;font-size:11px;color:#4A4840;">PrepBoi · You receive this as a super user or shift leader.</p>
  </div>
</div>
</body></html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `PrepBoi <${FROM}>`, to: [user.email], subject: `PrepBoi: ${record.title}`, html }),
    })

    if (res.ok) {
      await supabase.from('notifications').update({ email_sent: true }).eq('id', record.id)
    }

    return new Response(JSON.stringify({ ok: res.ok, status: res.status }), {
      headers: { 'Content-Type': 'application/json' }, status: 200,
    })
  } catch (err) {
    console.error('notify-email error:', err)
    return new Response('error', { status: 500 })
  }
})
