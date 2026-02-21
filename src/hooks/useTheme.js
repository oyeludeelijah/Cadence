import { useState, useEffect } from 'react'

/**
 * useTheme — persisted dark / light mode
 *
 * Priority:
 *   1. localStorage value (user's explicit preference)
 *   2. OS preference via prefers-color-scheme
 *   3. Default: dark
 *
 * Applies [data-theme="dark|light"] to <html> so CSS can respond.
 * The index.html inline script also reads localStorage to set the
 * attribute synchronously before React hydrates (prevents FOUC).
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark'
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return { theme, toggle }
}
