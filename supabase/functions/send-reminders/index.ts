import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Edge function context variables
const RESEND_API_KEY     = Deno.env.get('RESEND_API_KEY')!
const SERVICE_ROLE_KEY   = Deno.env.get('SERVICE_ROLE_KEY')!
const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

serve(async () => {
  try {
    const now = new Date()
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    // Call our new safe RPC function (using ISO string as argument)
    const { data: reminders, error } = await supabase
      .rpc('get_pending_reminders', { time_window_iso: in24Hours.toISOString() })

    if (error) {
      console.error('Error fetching reminders:', error)
      throw error
    }

    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ message: 'No reminders to send', sent: 0 }), { status: 200 })
    }

    let sentCount = 0

    for (const reminder of reminders) {
      // Deconstruct the returned row
      const {
        checkpoint_id,
        checkpoint_type,
        checkpoint_number,
        due_date,
        task_title,
        user_email,
        is_overdue,
        reminder_sent_urgent,
        reminder_sent_overdue
      } = reminder

      // Spam Prevention Filter
      if (is_overdue && reminder_sent_overdue) continue
      if (!is_overdue && reminder_sent_urgent) continue

      // Fix 8.3: basic email format guard.
      // user_email comes from auth.users (validated by Supabase on sign-up) so
      // this should never fail in practice, but guards against RPC changes that
      // might return unexpected data without crashing the whole batch.
      if (!user_email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(user_email)) {
        console.warn(`[send-reminders] Skipping checkpoint ${checkpoint_id}: invalid email '${user_email}'`)
        continue
      }

      const dueDateObj = new Date(due_date)
      const dueDateStr = dueDateObj.toLocaleString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit', hour12: true,
      })

      const subject = is_overdue
        ? `⚠️ Overdue: "${checkpoint_type}" for "${task_title}"`
        : `⏰ Due soon: "${checkpoint_type}" for "${task_title}"`

      const body = is_overdue
        ? `
          <p>Hi,</p>
          <p>This checkpoint is <strong>overdue</strong> and still incomplete:</p>
          <ul>
            <li><strong>Task:</strong> ${task_title}</li>
            <li><strong>Checkpoint ${checkpoint_number}:</strong> ${checkpoint_type}</li>
            <li><strong>Was due:</strong> ${dueDateStr}</li>
          </ul>
          <p>Log in to mark it complete or review your progress.</p>
          <p>— AI Accountability System</p>
        `
        : `
          <p>Hi,</p>
          <p>This checkpoint is due within the next 24 hours:</p>
          <ul>
            <li><strong>Task:</strong> ${task_title}</li>
            <li><strong>Checkpoint ${checkpoint_number}:</strong> ${checkpoint_type}</li>
            <li><strong>Due:</strong> ${dueDateStr}</li>
          </ul>
          <p>Log in to mark it complete and stay on track.</p>
          <p>— AI Accountability System</p>
        `

      // Send the email via Resend
      // Fix 8.2 — PRODUCTION NOTE: 'onboarding@resend.dev' is the Resend sandbox sender.
      // Emails from this domain will be classified as spam by Gmail, Outlook, and
      // institutional mail servers. Before real deployment, replace with a verified
      // custom domain: https://resend.com/docs/dashboard/domains/introduction
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'AI Accountability System <onboarding@resend.dev>',
          to: user_email,
          subject,
          html: body,
        }),
      })

      if (res.ok) {
        sentCount++
        
        // Mark the email as sent in the database!
        const updatePayload: any = {}
        if (is_overdue) {
          updatePayload.reminder_sent_overdue = true
        } else {
          updatePayload.reminder_sent_urgent = true
        }

        await supabase
          .from('checkpoints')
          .update(updatePayload)
          .eq('id', checkpoint_id)
      } else {
        const errorText = await res.text()
        console.error(`Failed to send email to ${user_email}:`, errorText)
      }
    }

    return new Response(JSON.stringify({ sent: sentCount }), { status: 200 })

  } catch (err) {
    console.error('Function error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})