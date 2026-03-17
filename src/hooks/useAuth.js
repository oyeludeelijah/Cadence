import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

/**
 * useAuth — wraps Supabase Auth session management.
 *
 * Returns:
 *   session  {object|null}  — the current Supabase session (null = not logged in)
 *   loading  {boolean}      — true on first load while session is being resolved
 */
export function useAuth() {
  const [session, setSession] = useState(undefined) // undefined = not yet resolved

  useEffect(() => {
    // Get the current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? null)
    })

    // Listen for sign in / sign out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return {
    session,
    loading: session === undefined, // still resolving
    user: session?.user ?? null,
  }
}
