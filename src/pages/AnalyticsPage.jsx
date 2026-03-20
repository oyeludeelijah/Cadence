import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth }  from '../hooks/useAuth'

// ─── computeMetrics ─────────────────────────────────────────────────────────
// Pure function — all analytics derived from the fetched tasks+checkpoints array.
// Called via useMemo so it only re-runs when allTasks changes.
function computeMetrics(allTasks) {
  // Flatten all checkpoints across every task
  const allCheckpoints = allTasks.flatMap(t => t.checkpoints || [])
  const completed      = allCheckpoints.filter(cp => cp.status === 'completed' && cp.completed_at)

  // ── Summary stats ──────────────────────────────────────────────────────────
  const totalTasks     = allTasks.length
  const completedTasks = allTasks.filter(t => t.status === 'completed').length
  const totalCPs       = allCheckpoints.length
  const completedCPs   = completed.length

  // On-time: completed_at strictly before due_date
  const onTimeCount = completed.filter(
    cp => new Date(cp.completed_at) < new Date(cp.due_date)
  ).length
  const onTimeRate = completedCPs > 0
    ? Math.round((onTimeCount / completedCPs) * 100)
    : null   // null = not enough data

  // ── Streak — consecutive calendar days (desc from today) with ≥1 completion ─
  const completionDays = new Set(
    completed.map(cp => new Date(cp.completed_at).toDateString())
  )
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    if (completionDays.has(d.toDateString())) {
      streak++
    } else if (i > 0) {
      break  // gap found — streak ends
    }
  }

  // ── AI vs Template ─────────────────────────────────────────────────────────
  const aiCompleted  = completed.filter(cp => cp.ai_generated)
  const tplCompleted = completed.filter(cp => !cp.ai_generated)

  function onTimeRateFor(group) {
    if (group.length === 0) return null
    const n = group.filter(cp => new Date(cp.completed_at) < new Date(cp.due_date)).length
    return Math.round((n / group.length) * 100)
  }

  const aiOnTimeRate  = onTimeRateFor(aiCompleted)
  const tplOnTimeRate = onTimeRateFor(tplCompleted)

  // ── Procrastination Index ──────────────────────────────────────────────────
  // Mean of (completed_at − due_date) in hours across all completed checkpoints.
  // Negative = completed early; positive = completed late.
  const deltas = completed.map(cp =>
    (new Date(cp.completed_at) - new Date(cp.due_date)) / (1000 * 60 * 60)
  )
  const procrastinationIndex = deltas.length > 0
    ? deltas.reduce((a, b) => a + b, 0) / deltas.length
    : null   // null = no data

  // Distribution buckets (±1 h boundary)
  const early  = deltas.filter(d => d < -1).length
  const onTime = deltas.filter(d => d >= -1 && d <= 1).length
  const late   = deltas.filter(d => d > 1).length

  return {
    // Summary
    totalTasks,
    completedTasks,
    totalCPs,
    completedCPs,
    onTimeRate,
    streak,
    // AI vs Template
    aiOnTimeRate,
    tplOnTimeRate,
    aiSampleSize:  aiCompleted.length,
    tplSampleSize: tplCompleted.length,
    // Procrastination
    procrastinationIndex,
    distribution: [
      { label: 'Early (>1h)',   count: early,  key: 'early'  },
      { label: 'On Time (±1h)', count: onTime, key: 'ontime' },
      { label: 'Late (>1h)',    count: late,   key: 'late'   },
    ],
    hasEnoughData: completedCPs >= 1,
  }
}

// ─── AnalyticsPage ────────────────────────────────────────────────────────────
function AnalyticsPage() {
  const { user } = useAuth()

  const [allTasks, setAllTasks] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

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

  // ── Compute all metrics ────────────────────────────────────────────────────
  const metrics = useMemo(() => computeMetrics(allTasks), [allTasks])

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

      {/* ── Sections — populated by Chunks 3 & 4 ── */}
      {allTasks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s8)' }}>
          {/* Summary Cards — Chunk 3 */}
          <SummaryCards metrics={metrics} />

          {/* Charts — Chunk 4 */}
          <Charts metrics={metrics} />
        </div>
      )}
    </div>
  )
}

// ─── Placeholder sub-components (replaced fully in Chunks 3 & 4) ─────────────
function SummaryCards({ metrics }) {
  return (
    <section>
      <p style={{ color: 'var(--text-3)', fontSize: 'var(--text-sm)' }}>
        ⏳ Summary cards — coming in Chunk 3
        {/* Data preview (dev only): */}
        <br /><code style={{ fontSize: '11px' }}>{JSON.stringify({
          totalTasks: metrics.totalTasks,
          completedCPs: metrics.completedCPs,
          onTimeRate: metrics.onTimeRate,
          streak: metrics.streak,
        })}</code>
      </p>
    </section>
  )
}

function Charts({ metrics }) {
  return (
    <section>
      <p style={{ color: 'var(--text-3)', fontSize: 'var(--text-sm)' }}>
        ⏳ Charts — coming in Chunk 4
        <br /><code style={{ fontSize: '11px' }}>{JSON.stringify({
          aiOnTimeRate: metrics.aiOnTimeRate,
          tplOnTimeRate: metrics.tplOnTimeRate,
          procrastinationIndex: metrics.procrastinationIndex?.toFixed(1),
          distribution: metrics.distribution,
        })}</code>
      </p>
    </section>
  )
}

export default AnalyticsPage
