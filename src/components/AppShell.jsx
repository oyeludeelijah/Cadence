import { useState } from 'react'
import { Sidebar } from './Sidebar'

/**
 * AppShell — persistent layout wrapper.
 * Renders the sidebar on the left and the page content on the right.
 * All routes are wrapped in this so the sidebar is always visible.
 */
export function AppShell({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="app-shell">
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="app-main">
        {/* Mobile top bar — hamburger + brand */}
        <div className="mobile-topbar">
          <button
            className="hamburger-btn"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Open menu"
          >
            <span /><span /><span />
          </button>
          <span className="mobile-topbar-brand">⚡ AI Accountability System</span>
        </div>

        {/* Page content */}
        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  )
}
