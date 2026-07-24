import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useSearchParams } from 'react-router-dom'

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
  const [searchParams] = useSearchParams()
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
  const [mode, setMode]             = useState(initialMode) // 'signin' | 'signup' | 'forgot'
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [showPassword, setShowPw]   = useState(false)
  const [loading, setLoading]       = useState(false)
  const [message, setMessage]       = useState(null)    // { type, text }

  const isSignUp = mode === 'signup'
  const isForgot = mode === 'forgot'

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
        // With email confirmation disabled, signUp immediately signs the user in.
        // onAuthStateChange fires and App.jsx redirects before any success message
        // could render here — so we intentionally show nothing and let the redirect
        // act as the confirmation.
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        // onAuthStateChange in useAuth fires → App.jsx re-renders → redirect happens automatically
      }
    } catch (err) {
      const msg = err.message ?? ''
      const text = msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('too many')
        ? 'Too many attempts. Please wait a moment and try again.'
        : msg.includes('Invalid login credentials')
        ? 'Incorrect email or password. Please try again.'
        : msg || 'Something went wrong. Please try again.'
      setMessage({ type: 'error', text })
    } finally {
      setLoading(false)
    }
  }

  function switchMode() {
    setMode(m => m === 'signin' ? 'signup' : 'signin')
    setMessage(null)
  }

  async function handleForgotPassword(e) {
    e?.preventDefault()
    setMessage(null)
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Enter your email address.' })
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setMessage({ type: 'success', text: 'Reset link sent! Check your email.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Something went wrong.' })
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setLoading(true)
    try {
      const options = {
        redirectTo: `${window.location.origin}/`,
      }
      
      // If we are signing up, force Google to show the account chooser
      if (mode === 'signup') {
        options.queryParams = {
          prompt: 'select_account'
        }
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options
      })
      if (error) throw error
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to login with Google.' })
      setLoading(false)
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-device-frame">

        {/* LEFT PANEL — illustrated scene */}
        <div className="auth-left" />

        {/* RIGHT PANEL — auth form */}
        <div className="auth-right">
          <div className="auth-form-card">

            {/* Logo */}
            <div className="auth-brand">
              <img
                src="/logos/full/cadence-light-transparent.svg"
                alt="Cadence"
                style={{ height: '28.8px', width: 'auto', objectFit: 'contain' }}
              />
            </div>
            <p style={{ fontSize: '9.6px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4.8px' }}>
              {isForgot ? 'Password recovery' : isSignUp ? 'Get started' : 'Welcome back'}
            </p>
            <h1 style={{ fontSize: 'clamp(16px, 2vw, 22.4px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#111827', marginBottom: '4.8px', lineHeight: 1.1 }}>
              {isForgot ? 'Reset your password.' : isSignUp ? 'Create your account.' : 'Sign in to continue.'}
            </h1>
            <p style={{ fontSize: '11.2px', color: '#6b7280', marginBottom: '16px' }}>
              {isForgot
                ? "Enter your email and we'll send a reset link."
                : isSignUp
                ? 'Start your accountability journey today.'
                : 'Your tasks and checkpoints are waiting.'}
            </p>

            {/* Google Login — hide on forgot mode */}
            {!isForgot && (
            <>
              <button
                type="button"
                className="btn-google"
                onClick={handleGoogleLogin}
                disabled={loading}
                style={{ 
                  width: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px',
                  padding: '8.8px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  background: '#f9fafb',
                  color: '#111827',
                  fontSize: '11.2px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  marginBottom: '12.8px',
                  transition: 'all 0.15s ease'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '9.6px', marginBottom: 'var(--s4)' }}>
                <div style={{ flex: 1, height: '1px', background: '#eee' }}></div>
                <span style={{ fontSize: '9.6px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Or continue with email</span>
                <div style={{ flex: 1, height: '1px', background: '#eee' }}></div>
              </div>
            </>
            )}

            {isForgot ? (
            <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '11.2px' }}>
              <div className="field-group">
                <label className="field-label" htmlFor="auth-email">Email address</label>
                <input
                  id="auth-email"
                  className="field-input"
                  type="email"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value)
                    if (message) setMessage(null)
                  }}
                  placeholder="you@university.ac.uk"
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              {/* Feedback message (floating) */}
              <div style={{ position: 'relative', height: 0, zIndex: 10 }}>
                {message && (
                  <div 
                    className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'}`}
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      left: 0,
                      right: 0,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                    }}
                  >
                    {message.text}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn-primary auth-submit"
                disabled={loading}
                style={{ marginTop: 'var(--s1)' }}
              >
                {loading ? (
                  <><span className="spinner" style={{ borderTopColor: '#fff' }} />Sending…</>
                ) : 'Send Reset Link'}
              </button>

              <p style={{ textAlign: 'center', marginTop: 'var(--s3)', fontSize: 'var(--text-sm)', color: 'var(--text-3)' }}>
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setMessage(null) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontWeight: 600, fontSize: 'inherit', padding: 0, textDecoration: 'underline', textUnderlineOffset: '3px' }}
                >
                  ← Back to sign in
                </button>
              </p>
            </form>
            ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '11.2px' }}>

            {/* Email */}
            <div className="field-group">
              <label className="field-label" htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                className="field-input"
                type="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value)
                  if (message) setMessage(null)
                }}
                placeholder="you@university.ac.uk"
                autoComplete="email"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="field-group">
              <label className="field-label" htmlFor="auth-password" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  Password
                  {isSignUp && (
                    <span style={{ color: 'var(--text-3)', fontWeight: 400, marginLeft: '6px' }}>
                      (min. 6 characters)
                    </span>
                  )}
                </span>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setMessage(null) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontWeight: 400, fontSize: 'var(--text-xs)', padding: 0, textDecoration: 'underline', textUnderlineOffset: '3px' }}
                  >
                    Forgot password?
                  </button>
                )}
              </label>
              <div className="auth-input-wrapper">
                <input
                  id="auth-password"
                  className="field-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value)
                    if (message) setMessage(null)
                  }}
                  placeholder={isSignUp ? 'Create a password' : '••••••••'}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  disabled={loading}
                  style={{ paddingRight: '35.2px' }}
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

            {/* Feedback message (floating) */}
            <div style={{ position: 'relative', height: 0, zIndex: 10 }}>
              {message && (
                <div 
                  className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'}`}
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    left: 0,
                    right: 0,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                  }}
                >
                  {message.text}
                </div>
              )}
            </div>

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
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
            </form>
            )}

            {/* Mode switch — hide on forgot */}
            {!isForgot && (
            <p style={{ textAlign: 'center', marginTop: '12.8px', fontSize: '11.2px', color: '#6b7280' }}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              {' '}
              <button
                onClick={switchMode}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontWeight: 600, fontSize: 'inherit', padding: 0, textDecoration: 'underline', textUnderlineOffset: '3px' }}
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
