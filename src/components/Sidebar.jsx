import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { useAuth }  from '../hooks/useAuth'
import { supabase } from '../supabaseClient'
import { gsap } from 'gsap'

// ── SVG Icons (inline — no external dependency) ──────────────────────────────
const IconTasks     = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
)
const IconAnalytics = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
  </svg>
)
const IconSettings  = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)
const IconChevronLeft = ({ flipped }) => (
  <svg
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: 'transform 0.3s ease', transform: flipped ? 'rotate(180deg)' : 'rotate(0deg)' }}
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
)
const IconSun  = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)
const IconMoon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)
const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
)

// ── Nav links config ─────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'My Tasks',   icon: IconTasks,     path: '/' },
  { label: 'Analytics',  icon: IconAnalytics, path: '/analytics' },
  { label: 'Settings',   icon: IconSettings,  path: '/settings',   disabled: true },
]

// ── Sidebar ──────────────────────────────────────────────────────────────────
export function Sidebar({ mobileOpen, onMobileClose }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { theme, toggle } = useTheme()
  const { user }  = useAuth()

  // Persist collapsed state
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebarCollapsed') === 'true' } catch { return false }
  })
  // Internal state to delay removing DOM nodes until after GSAP fade-out finishes
  const [cssCollapsed, setCssCollapsed] = useState(collapsed)

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(collapsed))

    if (window.innerWidth <= 768 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCssCollapsed(collapsed)
      return
    }

    if (collapsed) {
      // 1. Fade out text fast, removing stagger to avoid long empty delays
      gsap.to('.gsap-text', {
        opacity: 0, x: -10, duration: 0.1
      })
      // 2. Trigger CSS box shrink almost immediately so they overlap smoothly
      setTimeout(() => setCssCollapsed(true), 50)
    } else {
      // 1. Instantly render DOM nodes & trigger CSS box expand
      setCssCollapsed(false)
      
      // 2. Wait a tick for React to paint, then animate text fading in
      setTimeout(() => {
        gsap.fromTo('.gsap-text', 
          { opacity: 0, x: 10 },
          { opacity: 1, x: 0, duration: 0.25, stagger: 0.03, delay: 0.15, clearProps: 'transform' }
        )
      }, 0)
    }
  }, [collapsed])

  function handleNav(item) {
    if (item.disabled) return
    navigate(item.path)
    if (onMobileClose) onMobileClose()
  }

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={onMobileClose} />
      )}

      <aside className={`sidebar ${cssCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>

        {/* ── Brand ───────────────────────────────────────────────────────── */}
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <span>⚡</span>
          </div>
          {!cssCollapsed && (
            <div className="sidebar-brand-text gsap-text">
              <span className="sidebar-brand-name">AI Accountability</span>
              <span className="sidebar-brand-sub">System</span>
            </div>
          )}
        </div>

        {/* ── Collapse toggle ──────────────────────────────────────────────── */}
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <IconChevronLeft flipped={collapsed} />
        </button>

        {/* ── Nav ─────────────────────────────────────────────────────────── */}
        <nav className="sidebar-nav">
          <span 
            className="sidebar-nav-label gsap-text"
            style={{ 
              visibility: cssCollapsed ? 'hidden' : 'visible',
              opacity: cssCollapsed ? 0 : '',
            }}
          >
            Menu
          </span>
          {NAV_ITEMS.map(item => {
            const active = isActive(item.path)
            return (
              <button
                key={item.path}
                className={`sidebar-nav-item ${active ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
                onClick={() => handleNav(item)}
                title={item.disabled ? `${item.label} — coming soon` : collapsed ? item.label : undefined}
                aria-current={active ? 'page' : undefined}
                disabled={item.disabled || undefined}
                aria-disabled={item.disabled ? 'true' : undefined}
              >
                <span className="sidebar-nav-icon"><item.icon /></span>
                {!cssCollapsed && <span className="sidebar-nav-text gsap-text">{item.label}</span>}
                {!cssCollapsed && item.disabled && (
                  <span className="sidebar-coming-soon gsap-text">Soon</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* ── Spacer ──────────────────────────────────────────────────────── */}
        <div style={{ flex: 1 }} />

        {/* ── Theme toggle ────────────────────────────────────────────────── */}
        <div className="sidebar-section">
          {cssCollapsed ? (
            <button
              className="sidebar-nav-item"
              onClick={toggle}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span className="sidebar-nav-icon">
                {theme === 'dark' ? <IconSun /> : <IconMoon />}
              </span>
            </button>
          ) : (
            <div className="theme-pill-toggle">
              <button
                className={`theme-pill-option ${theme === 'light' ? 'active' : ''}`}
                onClick={() => theme !== 'light' && toggle()}
                title="Light mode"
              >
                <IconSun /> Light
              </button>
              <button
                className={`theme-pill-option ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => theme !== 'dark' && toggle()}
                title="Dark mode"
              >
                <IconMoon /> Dark
              </button>
            </div>
          )}
        </div>

        {/* ── User section ────────────────────────────────────────────────── */}
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            <IconUser />
          </div>
          {!cssCollapsed && (
            <div className="sidebar-user-info gsap-text">
              <span className="sidebar-user-name" title={user?.email}>
                {user?.email?.split('@')[0] ?? 'Student'}
              </span>
              <span className="sidebar-user-sub" style={{ fontSize: '10px' }}>
                {user?.email ?? ''}
              </span>
            </div>
          )}
          {/* Sign Out — icon only to save space and prevent email truncation */}
          <button
            onClick={() => supabase.auth.signOut()}
            title="Sign out"
            style={{
              marginLeft: cssCollapsed ? 0 : 'auto',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-3)',
              padding: '6px',
              borderRadius: 'var(--r-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--danger)';
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-3)';
              e.currentTarget.style.background = 'none';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>

      </aside>
    </>
  )
}
