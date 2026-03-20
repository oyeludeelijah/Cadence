import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth }  from '../hooks/useAuth'

// ─── AnalyticsPage ────────────────────────────────────────────────────────────
function AnalyticsPage() {
  const { user } = useAuth()

  const [allTasks,   setAllTasks]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const { data, error: fetchErr } = await supabase
        .from('tasks')
        .select('*, checkpoints(*)')
        .eq('user_id', user.id)
      if (fetchErr) throw fetchErr
      setAllTasks(data || [])
      setError(null)
    } catch (err) {
      setError('Could not load analytics data. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', padding: 'var(--s16) var(--s4)', gap: 'var(--s3)' }}>
        <div className="spinner spinner-large" />
        <p style={{ color: 'var(--text-2)', fontWeight: 500, margin: 0 }}>Loading analytics…</p>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto' }}>
        <div className="alert alert-danger">
          <span>⚠️</span><span>{error}</span>
        </div>
      </div>
    )
  }

  // ── Page ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto' }}>
      <div className="mesh-gradient" />

      {/* Header */}
      <header style={{ marginBottom: 'var(--s6)', paddingBottom: 'var(--s4)',
                       borderBottom: '1px solid var(--border)' }}>
        <p className="section-eyebrow" style={{ marginBottom: '6px' }}>Insights</p>
        <h1 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800,
                     letterSpacing: '-0.03em', color: 'var(--text)', lineHeight: 1.1 }}>
          Analytics
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: 'var(--text-sm)', marginTop: '6px' }}>
          How are your checkpoints performing?
        </p>
      </header>

      {/* Empty state — no tasks yet */}
      {allTasks.length === 0 && (
        <div className="glass empty-state" style={{ borderRadius: 'var(--r-xl)',
                                                     maxWidth: '520px', margin: '0 auto' }}>
          <span className="empty-state-icon">📊</span>
          <h3>No data yet</h3>
          <p>Create tasks and complete some checkpoints to see your analytics.</p>
        </div>
      )}

      {/* ── Sections (populated in Chunks 3 & 4) ── */}
      {allTasks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s8)' }}>
          {/* Placeholder — replaced by real sections in Chunk 3 & 4 */}
          <p style={{ color: 'var(--text-3)', fontSize: 'var(--text-sm)' }}>
            ⏳ Charts coming in Chunks 3 &amp; 4…
          </p>
        </div>
      )}
    </div>
  )
}

export default AnalyticsPage
