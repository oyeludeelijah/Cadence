import { useState } from 'react'
import { supabase } from '../supabaseClient'

// ── Deterministic star positions (no layout shift) ─────────────────────────
const STARS = [
  { top: '12%',  left: '18%', size: 2,   dur: '3.2s' },
  { top: '28%',  left: '72%', size: 1.5, dur: '4.5s' },
  { top: '52%',  left: '38%', size: 1,   dur: '2.8s' },
  { top: '78%',  left: '14%', size: 2.5, dur: '5.1s' },
  { top: '19%',  left: '54%', size: 1,   dur: '3.7s' },
  { top: '66%',  left: '78%', size: 2,   dur: '4.2s' },
  { top: '88%',  left: '52%', size: 1.5, dur: '3s'   },
  { top: '42%',  left: '88%', size: 1,   dur: '6s'   },
  { top: '8%',   left: '83%', size: 2,   dur: '4.8s' },
  { top: '36%',  left: '6%',  size: 1.5, dur: '2.5s' },
  { top: '92%',  left: '30%', size: 1,   dur: '5.5s' },
]

// ── Eye icon for password toggle ───────────────────────────────────────────
function EyeIcon({ open }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
function AuthPage() {
  const [mode, setMode]             = useState('signin') // 'signin' | 'signup'
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [showPassword, setShowPw]   = useState(false)
  const [loading, setLoading]       = useState(false)
  const [message, setMessage]       = useState(null)    // { type, text }

  const isSignUp = mode === 'signup'

  async function handleSubmit(e) {
    e?.preventDefault()
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
        // onAuthStateChange in useAuth fires → App.jsx re-renders → redirect happens automatically
      }
    } catch (err) {
      const text = err.message?.includes('Invalid login credentials')
        ? 'Incorrect email or password. Please try again.'
        : err.message ?? 'Something went wrong. Please try again.'
      setMessage({ type: 'error', text })
    } finally {
      setLoading(false)
    }
  }

  function switchMode() {
    setMode(m => m === 'signin' ? 'signup' : 'signin')
    setMessage(null)
  }

  return (
    <div className="auth-layout">

      {/* ══════════════════════════════════════════════════════════════════════
          LEFT PANEL — decorative / brand
          ════════════════════════════════════════════════════════════════════ */}
      <div className="auth-left">

        {/* Animated gradient orbs */}
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />

        {/* Twinkling star dots */}
        {STARS.map((s, i) => (
          <div
            key={i}
            className="auth-star"
            style={{
              top: s.top, left: s.left,
              width: `${s.size}px`, height: `${s.size}px`,
              '--star-dur': s.dur,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}

        {/* Brand — top */}
        <div className="auth-brand">
          <div className="auth-brand-icon">⚡</div>
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text)', letterSpacing: '0.05em', lineHeight: 1.2 }}>
              AI ACCOUNTABILITY
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              System
            </div>
          </div>
        </div>

        {/* Tagline — bottom */}
        <div className="auth-tagline">
          <p style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            color: 'var(--accent)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: 'var(--s2)',
          }}>
            Built for students
          </p>
          <h2 style={{
            fontSize: 'clamp(26px, 3vw, 44px)',
            fontWeight: 800,
            color: 'var(--text)',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            marginBottom: 'var(--s3)',
            maxWidth: '380px',
          }}>
            Break tasks down.<br />Stay accountable.
          </h2>
          <p style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--text-3)',
            lineHeight: 1.75,
            maxWidth: '340px',
          }}>
            AI generates a checkpoint roadmap around your deadlines —
            no more all-nighters the night before.
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          RIGHT PANEL — auth form
          ════════════════════════════════════════════════════════════════════ */}
      <div className="auth-right">
        <div className="auth-form-card">

          {/* Header */}
          <div style={{ marginBottom: 'var(--s6)' }}>
            <p className="section-eyebrow" style={{ marginBottom: 'var(--s2)' }}>
              {isSignUp ? 'Get started' : 'Welcome back'}
            </p>
            <h1 style={{
              fontSize: 'clamp(24px, 2.5vw, 34px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--text)',
              marginBottom: '8px',
              lineHeight: 1.1,
            }}>
              {isSignUp ? 'Create your account.' : 'Sign in to continue.'}
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)', margin: 0 }}>
              {isSignUp
                ? 'Start your accountability journey today.'
                : 'Your tasks and checkpoints are waiting.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>

            {/* Email */}
            <div className="field-group">
              <label className="field-label" htmlFor="auth-email">Email address</label>
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
                {isSignUp && (
                  <span style={{ color: 'var(--text-3)', fontWeight: 400, marginLeft: '6px' }}>
                    (min. 6 characters)
                  </span>
                )}
              </label>
              <div className="auth-input-wrapper">
                <input
                  id="auth-password"
                  className="field-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={isSignUp ? 'Create a password' : '••••••••'}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  disabled={loading}
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  className="auth-input-eye"
                  onClick={() => setShowPw(v => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            {/* Feedback message */}
            {message && (
              <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
                {message.text}
              </div>
            )}

            {/* Submit */}
            <button
              id="auth-submit-btn"
              type="submit"
              className="btn-primary auth-submit"
              disabled={loading}
              style={{ marginTop: 'var(--s1)' }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ borderTopColor: '#fff' }} />
                  {isSignUp ? 'Creating account…' : 'Signing in…'}
                </>
              ) : (
                isSignUp ? '+ Create Account' : 'Sign In →'
              )}
            </button>
          </form>

          {/* Mode switch */}
          <p style={{
            textAlign: 'center',
            marginTop: 'var(--s5)',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-3)',
          }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            {' '}
            <button
              onClick={switchMode}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--accent)', fontWeight: 600, fontSize: 'inherit',
                padding: 0,
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
              }}
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>

        </div>
      </div>
    </div>
  )
}

export default AuthPage
