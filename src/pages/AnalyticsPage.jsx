import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth }  from '../hooks/useAuth'

// ─── computeMetrics — pure function, runs on every allTasks change ────────────
// All metrics derived client-side from the tasks + checkpoints payload.
// Returns a single `metrics` object consumed by the card and chart sections.
function computeMetrics(tasks) {
  const allCps       = tasks.flatMap(t => t.checkpoints || [])
  const completedCps = allCps.filter(cp => cp.status === 'completed' && cp.completed_at)

  // ── Summary ────────────────────────────────────────────────────────────────
  const totalTasks     = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'completed').length

  const onTimeCount = completedCps.filter(
    cp => new Date(cp.completed_at) < new Date(cp.due_date)
  ).length
  const onTimeRate = completedCps.length > 0
    ? Math.round((onTimeCount / completedCps.length) * 100)
    : null

  // ── Streak — consecutive calendar days (backwards from today) ─────────────
  const completionDays = new Set(
    completedCps.map(cp => {
      const d = new Date(cp.completed_at)
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    })
  )
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    if (completionDays.has(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)) streak++
    else break
  }

  // ── AI vs Template ─────────────────────────────────────────────────────────
  const aiCps  = completedCps.filter(cp =>  cp.ai_generated)
  const tmplCps = completedCps.filter(cp => !cp.ai_generated)

  const countOnTime = arr => arr.filter(
    cp => new Date(cp.completed_at) < new Date(cp.due_date)
  ).length

  const aiOnTimeRate   = aiCps.length   > 0 ? Math.round((countOnTime(aiCps)   / aiCps.length)   * 100) : null
  const tmplOnTimeRate = tmplCps.length > 0 ? Math.round((countOnTime(tmplCps) / tmplCps.length) * 100) : null

  // ── Procrastination Index ─────────────────────────────────────────────────
  // Mean delta in hours: completed_at − due_date.
  // Negative = completed early (good).  Positive = completed late (bad).
  let procrastinationHours = null
  if (completedCps.length > 0) {
    const sum = completedCps.reduce((acc, cp) => {
      return acc + (new Date(cp.completed_at) - new Date(cp.due_date)) / 3_600_000
    }, 0)
    procrastinationHours = sum / completedCps.length
  }

  // ── Distribution buckets (Early / On-Time / Late) ──────────────────────────
  // Early  : completed > 1 h before due  → delta < −1
  // On-Time: within ±1 h window          → −1 ≤ delta ≤ 1
  // Late   : completed > 1 h after due   → delta > 1
  const buckets = { early: 0, onTime: 0, late: 0 }
  completedCps.forEach(cp => {
    const deltaH = (new Date(cp.completed_at) - new Date(cp.due_date)) / 3_600_000
    if      (deltaH < -1) buckets.early++
    else if (deltaH <=  1) buckets.onTime++
    else                   buckets.late++
  })

  return {
    totalTasks, completedTasks,
    onTimeRate, onTimeCount,
    streak,
    aiOnTimeRate,   aiTotal:   aiCps.length,   aiOnTimeCount:   countOnTime(aiCps),
    tmplOnTimeRate, tmplTotal: tmplCps.length,  tmplOnTimeCount: countOnTime(tmplCps),
    procrastinationHours,
    buckets,
    totalCompleted: completedCps.length,
  }
}

// ─── AnalyticsPage ────────────────────────────────────────────────────────────
function AnalyticsPage() {
  const { user } = useAuth()

  const [allTasks,   setAllTasks]   = useState([])
  const metrics = useMemo(() => computeMetrics(allTasks), [allTasks])
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
          {/* Chunk 3: SummaryCards will go here, receives `metrics` prop */}
          {/* Chunk 4: Charts will go here, receives `metrics` prop */}
          <p style={{ color: 'var(--text-3)', fontSize: 'var(--text-sm)' }}>
            ⏳ Cards + charts coming in Chunks 3 &amp; 4… (metrics computed ✓)
          </p>
        </div>
      )}
    </div>
  )
}

export default AnalyticsPage
