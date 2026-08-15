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
 *
 * All hook instances stay in sync via a MutationObserver on <html>'s
 * data-theme attribute — toggling in one component (e.g. nav) propagates
 * to all others (e.g. footer) without needing a context provider.
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  // Write to DOM + localStorage when this instance changes theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Sync from DOM — picks up changes made by sibling hook instances
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const current = document.documentElement.getAttribute('data-theme')
      if ((current === 'dark' || current === 'light') && current !== theme) {
        setTheme(current)
      }
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [theme])

  // React to live OS theme changes while the app is open.
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
