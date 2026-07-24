import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../hooks/useAuth'

const POLL_INTERVAL_MS = 2000   // check every 2s
const SLOW_THRESHOLD_MS = 10000 // show "still processing" after 10s

export default function PaymentCallbackPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // 'waiting' | 'active' | 'slow'
  const [state, setState] = useState('waiting')
  const startTime = useRef(Date.now())
  const timer = useRef(null)

  useEffect(() => {
    if (!user) return

    async function poll() {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('user_id', user.id)
        .single()

      if (!error && data?.status === 'active' && new Date(data.current_period_end) > new Date()) {
        clearInterval(timer.current)
        setState('active')
        return
      }

      // Still waiting — check if we've crossed the slow threshold
      if (Date.now() - startTime.current >= SLOW_THRESHOLD_MS) {
        setState('slow')
      }
    }

    // Poll immediately, then on interval
    poll()
    timer.current = setInterval(poll, POLL_INTERVAL_MS)

    return () => clearInterval(timer.current)
  }, [user])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: 'var(--s4)',
    }}>
      <div className="glass" style={{
        maxWidth: '440px',
        width: '100%',
        padding: 'var(--s8) var(--s6)',
        borderRadius: 'var(--r-xl)',
        textAlign: 'center',
      }}>
        {state === 'waiting' && (
          <>
            <div className="spinner spinner-large" style={{ margin: '0 auto var(--s5)' }} />
            <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text)', marginBottom: 'var(--s2)' }}>
              Activating your plan…
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: 0 }}>
              Confirming your payment with Paystack.
            </p>
          </>
        )}

        {state === 'slow' && (
          <>
            <div className="spinner spinner-large" style={{ margin: '0 auto var(--s5)' }} />
            <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text)', marginBottom: 'var(--s2)' }}>
              Still processing…
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: 0 }}>
              This can take a minute. Keep this page open — it will update automatically.
            </p>
          </>
        )}

        {state === 'active' && (
          <>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--accent-dim)',
              border: '1px solid var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--s5)',
              fontSize: '22px',
            }}>
              ✓
            </div>
            <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text)', marginBottom: 'var(--s2)' }}>
              You're all set — Pro is active.
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', marginBottom: 'var(--s6)' }}>
              Unlimited tasks, full AI accountability loop. Let's go.
            </p>
            <button
              className="btn-primary"
              style={{ width: '100%' }}
              onClick={() => navigate('/')}
            >
              Go to My Tasks
            </button>
          </>
        )}
      </div>
    </div>
  )
}
