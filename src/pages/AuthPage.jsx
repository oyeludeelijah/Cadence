import { useState } from 'react'
import { supabase } from '../supabaseClient'

/**
 * AuthPage — Sign In / Sign Up form.
 * Shown to unauthenticated users. App.jsx redirects here automatically.
 */
function AuthPage() {
  const [mode, setMode]       = useState('signin') // 'signin' | 'signup'
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null) // { type: 'error'|'success', text }

  const isSignUp = mode === 'signup'

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage(null)

    if (!email.trim() || !password) {
      setMessage({ type: 'error', text: 'Please enter your email and password.' })
      return
    }
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' })
      return
    }

    setLoading(true)
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password })
        if (error) throw error
        setMessage({ type: 'success', text: '✅ Account created! Signing you in…' })
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        // onAuthStateChange in useAuth will update session → App.jsx redirects automatically
      }
    } catch (err) {
      // Surface Supabase errors in plain English
      const msg = err.message?.includes('Invalid login credentials')
        ? 'Incorrect email or password. Please try again.'
        : err.message ?? 'Something went wrong. Please try again.'
      setMessage({ type: 'error', text: msg })
    } finally {
      setLoading(false)
    }
  }

  function switchMode() {
    setMode(m => m === 'signin' ? 'signup' : 'signin')
    setMessage(null)
    setEmail('')
    setPassword('')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--s4)',
      background: 'var(--bg)',
      position: 'relative',
    }}>
      {/* Ambient background mesh */}
      <div className="mesh-gradient" />

      <div style={{ width: '100%', maxWidth: '440px', position: 'relative' }}>

        {/* Brand mark */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--s6)' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px', height: '56px',
            background: 'var(--accent-dim)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 'var(--r-xl)',
            fontSize: '28px',
            marginBottom: 'var(--s3)',
          }}>
            ⚡
          </div>
          <h1 style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--text)',
            marginBottom: '6px',
          }}>
            AI Accountability System
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)', margin: 0 }}>
            {isSignUp ? 'Create an account to get started.' : 'Welcome back. Sign in to continue.'}
          </p>
        </div>

        {/* Auth card */}
        <div className="glass" style={{
          padding: 'var(--s5)',
          borderRadius: 'var(--r-xl)',
          borderTop: '1px solid rgba(99,102,241,0.25)',
        }}>
          {/* Mode toggle tabs */}
          <div className="tab-bar" style={{ marginBottom: 'var(--s4)' }}>
            {[{ id: 'signin', label: 'Sign In' }, { id: 'signup', label: 'Sign Up' }].map(tab => (
              <button
                key={tab.id}
                className={`tab-btn ${mode === tab.id ? 'active' : ''}`}
                onClick={() => { setMode(tab.id); setMessage(null) }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
            {/* Email */}
            <div className="field-group">
              <label className="field-label" htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                className="field-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@university.ac.uk"
                autoComplete="email"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="field-group">
              <label className="field-label" htmlFor="auth-password">
                Password
                {isSignUp && <span style={{ color: 'var(--text-3)', fontWeight: 400, marginLeft: '6px' }}>(min. 6 characters)</span>}
              </label>
              <input
                id="auth-password"
                className="field-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                disabled={loading}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: 'var(--s2) var(--s4)', fontSize: 'var(--text-base)', marginTop: 'var(--s1)' }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ borderTopColor: '#fff' }} />
                  {isSignUp ? 'Creating account…' : 'Signing in…'}
                </>
              ) : (
                isSignUp ? '+ Create Account' : '→ Sign In'
              )}
            </button>
          </form>

          {/* Message */}
          {message && (
            <div
              className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'}`}
              style={{ marginTop: 'var(--s3)' }}
            >
              {message.text}
            </div>
          )}

          {/* Switch mode link */}
          <p style={{ textAlign: 'center', marginTop: 'var(--s4)', fontSize: 'var(--text-sm)', color: 'var(--text-3)' }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            {' '}
            <button
              onClick={switchMode}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--accent)', fontWeight: 600, fontSize: 'inherit',
                padding: 0,
              }}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
