import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  // Supabase sets session automatically when user lands from email link
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User is now in recovery mode, ready to set new password
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleReset(e) {
    e.preventDefault()
    setMessage(null)

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' })
      return
    }
    if (password !== confirm) {
      setMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setMessage({ type: 'success', text: 'Password updated! Redirecting…' })
      setTimeout(() => navigate('/'), 2000)
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Something went wrong.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--s4)',
      background: 'var(--bg)',
    }}>
      <div className="glass" style={{
        width: '100%',
        maxWidth: '420px',
        padding: 'var(--s6)',
        borderRadius: 'var(--r-xl)',
      }}>
        <p className="section-eyebrow" style={{ marginBottom: 'var(--s2)' }}>Password recovery</p>
        <h1 style={{
          fontSize: 'clamp(22px, 3vw, 30px)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          marginBottom: 'var(--s2)',
        }}>
          Set new password.
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)', marginBottom: 'var(--s5)' }}>
          Choose a strong password for your account.
        </p>

        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
          <div className="field-group">
            <label className="field-label" htmlFor="reset-password">New password</label>
            <input
              id="reset-password"
              className="field-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="reset-confirm">Confirm password</label>
            <input
              id="reset-confirm"
              className="field-input"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Same password again"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          {message && (
            <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ marginTop: 'var(--s1)' }}
          >
            {loading ? (
              <><span className="spinner" style={{ borderTopColor: '#fff' }} />Updating…</>
            ) : 'Update Password →'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ResetPasswordPage
