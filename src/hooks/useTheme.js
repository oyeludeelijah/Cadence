import { useState, useEffect } from 'react'

/**
 * useTheme — persisted dark / light mode
 *
 * Priority:
 *   1. localStorage value (user's explicit preference)
 *   2. OS preference via prefers-color-scheme (live — responds to mid-session changes)
 *   3. Default: light
 *
 * Applies [data-theme="dark|light"] to <html> so CSS can respond.
 * The index.html inline script also reads localStorage to set the
 * attribute synchronously before React hydrates (prevents FOUC).
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved
    // Default to light; respect OS dark preference if explicitly set
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Fix 7.4: react to live OS theme changes while the app is open.
  // Previously the OS preference was only read once at mount — changing the
  // system theme while the tab was open had no effect.
  // Only applies when the user has no explicit localStorage override.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    function handleOsChange(e) {
      const saved = localStorage.getItem('theme')
      if (!saved || (saved !== 'light' && saved !== 'dark')) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }
    mq.addEventListener('change', handleOsChange)
    return () => mq.removeEventListener('change', handleOsChange)
  }, [])

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return { theme, toggle }
}
