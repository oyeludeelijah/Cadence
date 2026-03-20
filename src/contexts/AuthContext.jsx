import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

/**
 * AuthContext — single source of truth for Supabase auth state.
 *
 * Fix 7.1: Previously, every component that called useAuth() created its
 * own independent onAuthStateChange subscription. With three callers
 * (Sidebar, CreateTask, TaskListPage) this meant three live subscriptions
 * all calling setSession on the same events. This context collapses all
 * consumers into one shared subscription via React Context.
 *
 * Usage:
 *   // In main.jsx — wrap the tree once:
 *   <AuthProvider><App /></AuthProvider>
 *
 *   // In any component — unchanged import from hooks/useAuth:
 *   const { session, loading, user } = useAuth()
 */
export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = not yet resolved

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION immediately on subscribe (Supabase JS v2),
    // resolving the session without a separate getSession() call.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{
      session,
      loading: session === undefined,
      user: session?.user ?? null,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * useAuth — consumes the shared AuthContext.
 * Must be used inside <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
