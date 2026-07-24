import { useState } from 'react'
import { useModalAnimation } from '../hooks/useModalAnimation'
import { supabase } from '../supabaseClient'

/**
 * UpgradeModal
 *
 * Shown when a free user tries to create a 4th active task.
 * Calls paystack-checkout Edge Function and redirects to Paystack hosted page.
 *
 * Props:
 *   onClose {fn} — called when user dismisses
 */
function UpgradeModal({ onClose }) {
  const { panelRef, close } = useModalAnimation(onClose)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleUpgrade() {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-checkout`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      )
      const body = await res.json()
      if (!res.ok || !body.authorization_url) throw new Error(body.error || 'Checkout failed')
      window.location.href = body.authorization_url
    } catch {
      setError('Could not start checkout. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="modal-overlay"
        onClick={close}
        style={{ alignItems: 'center' }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          width: '90%',
          maxWidth: '480px',
        }}
      >
        <div
          ref={panelRef}
          className="glass modal-panel"
          style={{
            padding: 'var(--s5)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderTop: '2px solid var(--accent)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 700,
              color: 'var(--text)',
              marginBottom: 'var(--s3)',
            }}
          >
            🔒 Upgrade to Pro
          </h2>

          <p style={{ color: 'var(--text)', marginBottom: 'var(--s2)', fontSize: 'var(--text-base)' }}>
            You've hit your free limit of 3 active tasks.
          </p>
          <p style={{ color: 'var(--text-2)', fontSize: 'var(--text-sm)', marginBottom: 'var(--s5)' }}>
            Upgrade to Pro for unlimited tasks, same full AI accountability loop.
          </p>

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: 'var(--text-sm)', marginBottom: 'var(--s3)' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: 'var(--s2)', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={close} disabled={loading}>
              Not now
            </button>
            <button
              className="btn-primary"
              onClick={handleUpgrade}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--s1)' }}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Loading…
                </>
              ) : (
                'Upgrade to Pro — ₦1,999/mo'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default UpgradeModal
