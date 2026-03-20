import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth }  from '../hooks/useAuth'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts'

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

// ─── SummaryCards ─────────────────────────────────────────────────────────────
function SummaryCards({ metrics }) {
  const {
    totalTasks, completedTasks, completedCPs,
    onTimeRate, streak, procrastinationIndex,
  } = metrics

  // Procrastination display helpers
  const piAbs    = procrastinationIndex !== null ? Math.abs(procrastinationIndex).toFixed(1) : null
  const piLabel  = procrastinationIndex === null  ? '—'
                 : procrastinationIndex < 0        ? `${piAbs}h early`
                 :                                   `${piAbs}h late`
  const piColor  = procrastinationIndex === null  ? 'var(--text-3)'
                 : procrastinationIndex < 0        ? 'var(--success, #22c55e)'
                 :                                   'var(--danger)'

  // On-time rate colour
  const onTimeColor = onTimeRate === null  ? 'var(--text-3)'
                    : onTimeRate >= 70     ? 'var(--success, #22c55e)'
                    : onTimeRate >= 40     ? 'var(--warning, #f59e0b)'
                    :                        'var(--danger)'

  const cards = [
    {
      icon: '📋',
      label: 'Total Tasks',
      value: totalTasks,
      sub: `${completedTasks} completed`,
      subColor: completedTasks > 0 ? 'var(--success, #22c55e)' : 'var(--text-3)',
    },
    {
      icon: '✅',
      label: 'Checkpoints Done',
      value: completedCPs,
      sub: completedCPs === 1 ? '1 checkpoint' : `${completedCPs} checkpoints`,
      subColor: 'var(--text-3)',
    },
    {
      icon: '🎯',
      label: 'On-Time Rate',
      value: onTimeRate !== null ? `${onTimeRate}%` : '—',
      sub: onTimeRate === null ? 'complete a checkpoint to start'
         : onTimeRate >= 70   ? 'great consistency'
         : onTimeRate >= 40   ? 'room to improve'
         :                      'falling behind',
      subColor: onTimeColor,
      valueColor: onTimeColor,
    },
    {
      icon: '⏱️',
      label: 'Procrastination Index',
      value: piLabel,
      sub: procrastinationIndex === null ? 'no data yet'
         : procrastinationIndex < 0      ? 'you\'re ahead of schedule'
         :                                  'you\'re running late',
      subColor: piColor,
      valueColor: piColor,
    },
  ]

  return (
    <section>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 'var(--s3)',
      }}>
        {cards.map(card => (
          <div
            key={card.label}
            className="glass"
            style={{
              padding: 'var(--s4)',
              borderRadius: 'var(--r-xl)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--s1)',
              borderTop: '1px solid rgba(99,102,241,0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>{card.icon}</span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)',
                             fontWeight: 600, textTransform: 'uppercase',
                             letterSpacing: '0.06em' }}>
                {card.label}
              </span>
            </div>
            <p style={{
              fontSize: 'clamp(26px, 4vw, 36px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: card.valueColor ?? 'var(--text)',
              margin: '4px 0 2px',
              lineHeight: 1,
            }}>
              {card.value}
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: card.subColor, margin: 0 }}>
              {card.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Streak badge — only shown when streak > 0 */}
      {streak > 0 && (
        <div style={{
          marginTop: 'var(--s3)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(245,158,11,0.12)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 'var(--r-full)',
          padding: '6px 14px',
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          color: 'var(--warning, #f59e0b)',
        }}>
          🔥 {streak}-day streak
        </div>
      )}
    </section>
  )
}

// ─── Charts ───────────────────────────────────────────────────────────────────
function Charts({ metrics }) {
  const {
    aiOnTimeRate, tplOnTimeRate, aiSampleSize, tplSampleSize,
    distribution, procrastinationIndex, completedCPs,
  } = metrics

  const hasAiVsTemplate = aiSampleSize > 0 || tplSampleSize > 0
  const hasDist         = completedCPs > 0

  // ── AI vs Template data ────────────────────────────────────────────────────
  const aiVsTemplateData = [
    {
      name: 'AI Generated',
      rate: aiOnTimeRate ?? 0,
      n:    aiSampleSize,
      fill: 'var(--accent, #6366f1)',
    },
    {
      name: 'Template',
      rate: tplOnTimeRate ?? 0,
      n:    tplSampleSize,
      fill: 'var(--success, #22c55e)',
    },
  ]

  // ── Distribution colours ───────────────────────────────────────────────────
  const distColors = {
    early:  'var(--success, #22c55e)',
    ontime: 'var(--accent,  #6366f1)',
    late:   'var(--danger,  #ef4444)',
  }

  // ── Procrastination insight sentence ──────────────────────────────────────
  function insightSentence() {
    if (procrastinationIndex === null) return null
    const early = distribution.find(d => d.key === 'early')?.count ?? 0
    const total = completedCPs
    const pct   = total > 0 ? Math.round((early / total) * 100) : 0
    if (procrastinationIndex < -1) return `You complete ${pct}% of checkpoints early — you're ahead of schedule. 🎉`
    if (procrastinationIndex > 1)  return `You tend to run late. Focus on completing checkpoints a day early.`
    return `You're generally on time. Keep it up!`
  }

  // ── Custom tooltip for AI vs Template ─────────────────────────────────────
  function AiTooltip({ active, payload }) {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className="glass" style={{ padding: '10px 14px', borderRadius: 'var(--r-lg)',
                                       fontSize: 'var(--text-sm)', minWidth: '140px' }}>
        <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{d.name}</p>
        <p style={{ color: d.fill, margin: '2px 0' }}>On-time: <strong>{d.n === 0 ? '—' : `${d.rate}%`}</strong></p>
        <p style={{ color: 'var(--text-3)', margin: '2px 0' }}>Sample: {d.n} checkpoint{d.n !== 1 ? 's' : ''}</p>
      </div>
    )
  }

  // ── Custom tooltip for distribution ───────────────────────────────────────
  function DistTooltip({ active, payload }) {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className="glass" style={{ padding: '10px 14px', borderRadius: 'var(--r-lg)',
                                       fontSize: 'var(--text-sm)' }}>
        <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{d.label}</p>
        <p style={{ color: distColors[d.key], margin: 0 }}>{d.count} checkpoint{d.count !== 1 ? 's' : ''}</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>

      {/* ── AI vs Template ── */}
      <section className="glass" style={{ borderRadius: 'var(--r-xl)', padding: 'var(--s5)',
                                           borderTop: '1px solid rgba(99,102,241,0.2)' }}>
        <div style={{ marginBottom: 'var(--s4)' }}>
          <p className="section-eyebrow" style={{ marginBottom: '4px' }}>Effectiveness</p>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            AI vs Template Checkpoints
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', marginTop: '4px' }}>
            On-time completion rate by checkpoint origin
          </p>
        </div>

        {!hasAiVsTemplate ? (
          <div style={{ textAlign: 'center', padding: 'var(--s8) 0', color: 'var(--text-3)' }}>
            <p style={{ fontSize: '2rem', margin: '0 0 8px' }}>📊</p>
            <p style={{ fontWeight: 600 }}>No completed checkpoints yet</p>
            <p style={{ fontSize: 'var(--text-sm)', marginTop: '4px' }}>
              Mark some checkpoints complete to see this chart.
            </p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={aiVsTemplateData} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}
                        barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border, rgba(255,255,255,0.08))" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-2)', fontSize: 12 }}
                       axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`}
                       tick={{ fill: 'var(--text-3)', fontSize: 11 }}
                       axisLine={false} tickLine={false} width={38} />
                <Tooltip content={<AiTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="rate" radius={[6, 6, 0, 0]} maxBarSize={80}>
                  {aiVsTemplateData.map(entry => (
                    <Cell key={entry.name} fill={entry.fill} fillOpacity={entry.n === 0 ? 0.25 : 0.85} />
                  ))}
                  <LabelList dataKey="rate" position="top"
                             formatter={v => v === 0 ? '—' : `${v}%`}
                             style={{ fill: 'var(--text-2)', fontSize: 12, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 'var(--s4)', marginTop: 'var(--s3)',
                          flexWrap: 'wrap', justifyContent: 'center' }}>
              {aiVsTemplateData.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center',
                                            gap: '6px', fontSize: 'var(--text-xs)',
                                            color: 'var(--text-2)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2,
                                  background: d.fill, display: 'inline-block' }} />
                  {d.name} (n={d.n})
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── Procrastination Distribution ── */}
      <section className="glass" style={{ borderRadius: 'var(--r-xl)', padding: 'var(--s5)',
                                           borderTop: '1px solid rgba(99,102,241,0.2)' }}>
        <div style={{ marginBottom: 'var(--s4)' }}>
          <p className="section-eyebrow" style={{ marginBottom: '4px' }}>Timing</p>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Procrastination Distribution
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', marginTop: '4px' }}>
            How early or late do you complete checkpoints?
          </p>
        </div>

        {!hasDist ? (
          <div style={{ textAlign: 'center', padding: 'var(--s8) 0', color: 'var(--text-3)' }}>
            <p style={{ fontSize: '2rem', margin: '0 0 8px' }}>⏱️</p>
            <p style={{ fontWeight: 600 }}>No completed checkpoints yet</p>
            <p style={{ fontSize: 'var(--text-sm)', marginTop: '4px' }}>
              Complete some checkpoints to see your timing patterns.
            </p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={distribution} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}
                        barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border, rgba(255,255,255,0.08))" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--text-2)', fontSize: 12 }}
                       axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--text-3)', fontSize: 11 }}
                       axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<DistTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={80}>
                  {distribution.map(entry => (
                    <Cell key={entry.key} fill={distColors[entry.key]} fillOpacity={0.85} />
                  ))}
                  <LabelList dataKey="count" position="top"
                             style={{ fill: 'var(--text-2)', fontSize: 12, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Insight sentence */}
            {insightSentence() && (
              <p style={{ marginTop: 'var(--s3)', fontSize: 'var(--text-sm)',
                          color: 'var(--text-2)', textAlign: 'center',
                          padding: '10px 16px',
                          background: 'rgba(99,102,241,0.06)',
                          borderRadius: 'var(--r-lg)',
                          border: '1px solid rgba(99,102,241,0.12)' }}>
                {insightSentence()}
              </p>
            )}
          </>
        )}
      </section>
    </div>
  )
}


export default AnalyticsPage
