import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePageTransition } from '../hooks/usePageTransition'
import { supabase } from '../supabaseClient'
import { useAuth }  from '../hooks/useAuth'
import { AnimatedCounter } from '../components/AnimatedCounter'
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

  const now = new Date()

  // Resolved checkpoints: status completed, OR due_date already passed.
  // Pending future checkpoints must not count.
  const isResolved = cp => cp.status === 'completed' || (cp.due_date && new Date(cp.due_date) < now)

  // On-time: completed on or before due_date
  const isOnTime = cp => cp.status === 'completed' && cp.completed_at && cp.due_date && new Date(cp.completed_at) <= new Date(cp.due_date)

  const resolved = allCheckpoints.filter(isResolved)
  const onTimeCount = resolved.filter(isOnTime).length

  // ── Summary stats ──────────────────────────────────────────────────────────
  const totalTasks     = allTasks.length
  const completedTasks = allTasks.filter(t => t.status === 'completed').length
  const totalCPs       = allCheckpoints.length
  const completedCPs   = completed.length
  const resolvedCPs    = resolved.length

  // On-time rate = on-time / resolved
  const onTimeRate = resolvedCPs > 0
    ? Math.round((onTimeCount / resolvedCPs) * 100)
    : null   // null = not enough resolved data

  // ── Streak — consecutive active days (desc from today) with ≥1 completion ──
  // An "active day" is any calendar day that falls within at least one task's
  // span (created_at → final_deadline). Days outside all spans are skipped so
  // finishing work early or having no tasks on a day doesn't break the streak.
  const completionDays = new Set(
    completed.map(cp => new Date(cp.completed_at).toDateString())
  )

  // Build a set of all calendar days covered by any task's span
  const activeDayStrings = new Set()
  for (const task of allTasks) {
    const start    = task.created_at    ? new Date(task.created_at)    : null
    const end      = task.final_deadline ? new Date(task.final_deadline) : null
    if (!start || !end) continue
    const cursor = new Date(start)
    cursor.setHours(0, 0, 0, 0)
    const endDay = new Date(end)
    endDay.setHours(0, 0, 0, 0)
    while (cursor <= endDay) {
      activeDayStrings.add(cursor.toDateString())
      cursor.setDate(cursor.getDate() + 1)
    }
  }

  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const ds = d.toDateString()
    // Skip days that have no tasks active — don't count as a gap
    if (!activeDayStrings.has(ds)) continue
    if (completionDays.has(ds)) {
      streak++
    } else if (streak > 0) {
      break  // active day with no completion after streak started — breaks it
    }
  }

  // ── AI vs Template (on-time / resolved; n is resolved count) ────────────────
  const aiResolved  = resolved.filter(cp => cp.ai_generated)
  const tplResolved = resolved.filter(cp => !cp.ai_generated)

  function calcOnTimeRate(group) {
    if (group.length === 0) return null
    const onTime = group.filter(isOnTime).length
    return Math.round((onTime / group.length) * 100)
  }

  const aiOnTimeRate  = calcOnTimeRate(aiResolved)
  const tplOnTimeRate = calcOnTimeRate(tplResolved)

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
    resolvedCPs,
    onTimeRate,
    streak,
    // AI vs Template
    aiOnTimeRate,
    tplOnTimeRate,
    aiSampleSize:  aiResolved.length,
    tplSampleSize: tplResolved.length,
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

// ── Inline SVG Line Icons (matching sidebar 2px stroke style) ────────────────
const IconTasks = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M9 12h6" />
    <path d="M9 16h6" />
  </svg>
)

const IconCheckpoints = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)

const IconTarget = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
)

const IconClock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

const IconFlame = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
)

const IconAlert = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

const IconChart = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
    <line x1="2" y1="20" x2="22" y2="20" />
  </svg>
)

// ── Distribution color map ───────────────────────────────────────────────────
const DIST_COLORS = {
  early:  'var(--success)',
  ontime: 'var(--chart-ontime, var(--text-2))',
  late:   'var(--danger)',
}

// ── Custom Tooltips (defined outside render to satisfy react-hooks/static-components) ──
function AiTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="glass" style={{
      padding: '10px 14px',
      borderRadius: 'var(--r-lg)',
      fontSize: 'var(--text-sm)',
      minWidth: '150px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    }}>
      <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{d.name}</p>
      <p style={{ color: d.fill, margin: '2px 0', fontWeight: 600 }}>
        On-time: <strong>{d.n === 0 ? 'No data yet' : `${d.rate}%`}</strong>
      </p>
      <p style={{ color: 'var(--text-2)', margin: '2px 0', fontSize: 'var(--text-xs)' }}>
        Resolved: {d.n} checkpoint{d.n !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

function DistTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="glass" style={{
      padding: '10px 14px',
      borderRadius: 'var(--r-lg)',
      fontSize: 'var(--text-sm)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    }}>
      <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{d.label}</p>
      <p style={{ color: DIST_COLORS[d.key] || 'var(--text-2)', margin: 0, fontWeight: 600 }}>
        {d.count} checkpoint{d.count !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

// ── ActionSub component (defined outside render to satisfy lint & >= 44px tap target) ──
function ActionSub({ text, color, taskId, onNavigate }) {
  if (!taskId) {
    return (
      <p style={{
        fontSize: 'var(--text-xs)',
        color: color || 'var(--text-2)',
        margin: 0,
        lineHeight: 1.4,
      }}>
        {text}
      </p>
    )
  }
  return (
    <button
      onClick={() => onNavigate(`/tasks/${taskId}`)}
      style={{
        background: 'none',
        border: 'none',
        padding: '6px 0',
        minHeight: '44px',
        display: 'inline-flex',
        alignItems: 'center',
        cursor: 'pointer',
        fontSize: 'var(--text-xs)',
        color: color || 'var(--text-2)',
        margin: 0,
        textDecoration: 'underline',
        textAlign: 'left',
        touchAction: 'manipulation',
        lineHeight: 1.3,
      }}
      aria-label={`${text} for task`}
    >
      {text} →
    </button>
  )
}

// ─── AnalyticsPage ────────────────────────────────────────────────────────────
function AnalyticsPage() {
  const { user } = useAuth()
  const pageRef = usePageTransition()

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
    } catch {
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
        <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconAlert />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  // ── Page ───────────────────────────────────────────────────────────────────
  return (
    <div ref={pageRef} style={{ maxWidth: 'var(--container-max)', margin: '0 auto' }}>
      <div className="mesh-gradient" />

      {/* Header with integrated Streak Badge */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 'var(--s3)',
        marginBottom: 'var(--s6)',
        paddingBottom: 'var(--s4)',
        borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}>
        <div>
          <p className="section-eyebrow" style={{ marginBottom: '6px' }}>Insights</p>
          <h1 style={{
            fontSize: 'clamp(22px, 3vw, 32px)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--text)',
            lineHeight: 1.1,
          }}>
            Analytics
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: 'var(--text-sm)', marginTop: '6px' }}>
            How are your checkpoints performing?
          </p>
        </div>

        {/* 3. Streak chip inside page header (not floating alone) */}
        {metrics.streak > 0 && (
          <div className="badge badge-warning" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            borderRadius: 'var(--r-pill)',
            marginTop: '4px',
          }}>
            <IconFlame />
            <span>{metrics.streak}-day streak</span>
          </div>
        )}
      </header>

      {/* Empty state — no tasks yet */}
      {allTasks.length === 0 && (
        <div className="glass empty-state" style={{ borderRadius: 'var(--r-xl)', maxWidth: '520px', margin: '0 auto' }}>
          <div style={{ color: 'var(--text-2)', marginBottom: 'var(--s3)', display: 'flex', justifyContent: 'center' }}>
            <IconChart />
          </div>
          <h3>No data yet</h3>
          <p>Create tasks and complete some checkpoints to see your analytics.</p>
        </div>
      )}

      {/* ── Sections ── */}
      {allTasks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s8)' }}>
          {/* Summary Cards */}
          <SummaryCards metrics={metrics} allTasks={allTasks} />

          {/* Charts */}
          <Charts metrics={metrics} />
        </div>
      )}
    </div>
  )
}

// ─── SummaryCards ─────────────────────────────────────────────────────────────
function SummaryCards({ metrics, allTasks }) {
  const navigate = useNavigate()
  const {
    totalTasks, completedTasks, completedCPs,
    onTimeRate, procrastinationIndex,
  } = metrics

  // Find active task with most overdue checkpoints for targeted prescriptive CTA
  const mostAtRiskTask = allTasks
    .filter(t => t.status !== 'completed')
    .map(t => ({
      ...t,
      overdueCount: (t.checkpoints || []).filter(
        cp => cp.status !== 'completed' && new Date(cp.due_date) < new Date()
      ).length,
    }))
    .sort((a, b) => b.overdueCount - a.overdueCount)
    .find(t => t.overdueCount > 0)

  // ── Metric Status Thresholds (explicit & commented) ───────────────────────
  // On-time rate thresholds:
  // - >= 70%: consistent (var(--success))
  // - 40% to 69%: room to improve (var(--warning))
  // - < 40%: struggling / high delinquency (var(--danger))
  // Primary metric text stays in var(--text); only critical rate (<40%) gets an accent,
  // preventing the page from shouting in red across every card.
  const onTimeStatusColor = onTimeRate === null ? 'var(--text-2)'
                          : onTimeRate >= 70    ? 'var(--success)'
                          : onTimeRate >= 40    ? 'var(--warning)'
                          :                       'var(--danger)'

  // Procrastination Index thresholds (mean completion offset in hours):
  // - <= -1h: ahead of schedule (var(--success))
  // - -1h to +4h: normal operating variance (var(--text-2))
  // - +4h to +12h: moderate delay (var(--warning))
  // - > +12h: critically late (var(--danger))
  const piStatusColor = procrastinationIndex === null ? 'var(--text-2)'
                      : procrastinationIndex <= -1    ? 'var(--success)'
                      : procrastinationIndex <= 4     ? 'var(--text-2)'
                      : procrastinationIndex <= 12    ? 'var(--warning)'
                      :                                 'var(--danger)'

  const piAbs = procrastinationIndex !== null ? Math.abs(procrastinationIndex) : null

  const cards = [
    {
      icon: <IconTasks />,
      label: 'Total Tasks',
      value: <AnimatedCounter value={totalTasks} />,
      sub: `${completedTasks} completed`,
      subColor: completedTasks > 0 ? 'var(--success)' : 'var(--text-2)',
    },
    {
      icon: <IconCheckpoints />,
      label: 'Checkpoints Done',
      value: <AnimatedCounter value={completedCPs} />,
      sub: completedCPs === 1 ? '1 checkpoint' : `${completedCPs} checkpoints`,
      subColor: 'var(--text-2)',
    },
    {
      icon: <IconTarget />,
      label: 'On-Time Rate',
      value: onTimeRate === null ? '—' : <AnimatedCounter value={onTimeRate} suffix="%" />,
      sub: onTimeRate === null ? 'No resolved checkpoints yet'
         : onTimeRate >= 70    ? 'Great consistency'
         : onTimeRate >= 40    ? 'Room to improve'
         : mostAtRiskTask      ? 'View most at-risk task'
         :                       'Falling behind',
      subColor: onTimeStatusColor,
      valueColor: onTimeRate !== null && onTimeRate < 40 ? 'var(--danger)' : 'var(--text)',
      actionTaskId: onTimeRate !== null && onTimeRate < 40 ? mostAtRiskTask?.id : null,
    },
    {
      icon: <IconClock />,
      label: 'Procrastination Index',
      value: piAbs === null ? (
        '—'
      ) : (
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '3px', whiteSpace: 'nowrap' }}>
          <AnimatedCounter value={piAbs} decimals={1} />
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-2)' }}>h</span>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: piStatusColor, marginLeft: '3px' }}>
            {procrastinationIndex < 0 ? 'early' : 'late'}
          </span>
        </span>
      ),
      sub: procrastinationIndex === null ? 'No data yet'
         : procrastinationIndex < 0      ? "You're ahead of schedule"
         : mostAtRiskTask                ? 'View task needing attention'
         :                                 "You're running late",
      subColor: piStatusColor,
      valueColor: 'var(--text)',
      actionTaskId: procrastinationIndex !== null && procrastinationIndex > 4 ? mostAtRiskTask?.id : null,
    },
  ]

  return (
    <section>
      <div className="analytics-stats-grid">
        {cards.map(card => (
          <div
            key={card.label}
            className="glass analytics-stat-card"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--text-2)', display: 'inline-flex' }}>{card.icon}</span>
              <span style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--text-2)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {card.label}
              </span>
            </div>
            <div style={{
              fontSize: 'clamp(20px, 3.2vw, 28px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: card.valueColor || 'var(--text)',
              margin: '2px 0',
              lineHeight: 1.2,
              display: 'flex',
              alignItems: 'baseline',
              gap: '4px',
              whiteSpace: 'nowrap',
            }}>
              {card.value}
            </div>
            <ActionSub
              text={card.sub}
              color={card.subColor}
              taskId={card.actionTaskId}
              onNavigate={navigate}
            />
          </div>
        ))}
      </div>
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
      fill: 'var(--chart-1, #8EB69B)',
    },
    {
      name: 'Template',
      rate: tplOnTimeRate ?? 0,
      n:    tplSampleSize,
      fill: 'var(--chart-2, #4ade80)',
    },
  ]

  // Procrastination insight sentence (plain language, no emoji)
  let insightSentence = null
  if (procrastinationIndex !== null && completedCPs > 0) {
    const early = distribution.find(d => d.key === 'early')?.count ?? 0
    const pct   = Math.round((early / completedCPs) * 100)
    if (procrastinationIndex < -1) {
      insightSentence = `You complete ${pct}% of checkpoints early — you're consistently ahead of schedule.`
    } else if (procrastinationIndex > 1) {
      insightSentence = `You tend to run late on checkpoints. Aim to start milestones a day earlier.`
    } else {
      insightSentence = `You are generally on time. Your checkpoint pacing is balanced.`
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>

      {/* ── AI vs Template ── */}
      <section className="glass analytics-chart-card">
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
          <div style={{ textAlign: 'center', padding: 'var(--s8) 0', color: 'var(--text-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--s2)' }}>
              <IconChart />
            </div>
            <p style={{ fontWeight: 600 }}>No completed checkpoints yet</p>
            <p style={{ fontSize: 'var(--text-sm)', marginTop: '4px' }}>
              Mark some checkpoints complete to see this chart.
            </p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={aiVsTemplateData}
                margin={{ top: 20, right: 16, bottom: 4, left: 0 }}
                barCategoryGap="35%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, var(--border))" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'var(--text-2)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={v => `${v}%`}
                  tick={{ fill: 'var(--text-2)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip content={<AiTooltip />} cursor={{ fill: 'var(--chart-cursor, rgba(255,255,255,0.04))' }} />
                <Bar dataKey="rate" radius={[6, 6, 0, 0]} maxBarSize={70} minPointSize={6}>
                  {aiVsTemplateData.map(entry => (
                    <Cell
                      key={entry.name}
                      fill={entry.n === 0 ? 'transparent' : entry.fill}
                      fillOpacity={entry.n === 0 ? 0 : entry.rate === 0 ? 0.6 : 0.85}
                    />
                  ))}
                  <LabelList
                    dataKey="rate"
                    position="top"
                    content={(props) => {
                      const { x, y, width, index } = props
                      const item = aiVsTemplateData[index]
                      if (!item) return null
                      const text = item.n === 0 ? 'No data yet' : `${item.rate}%`
                      const isZero = item.n > 0 && item.rate === 0
                      return (
                        <text
                          x={x + width / 2}
                          y={isZero ? y - 6 : y - 8}
                          fill="var(--text-2)"
                          textAnchor="middle"
                          fontSize={12}
                          fontWeight={600}
                        >
                          {text}
                        </text>
                      )
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 'var(--s4)', marginTop: 'var(--s3)', flexWrap: 'wrap', justifyContent: 'center' }}>
              {aiVsTemplateData.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', color: 'var(--text-2)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: d.fill, display: 'inline-block' }} />
                  {d.name} (n={d.n})
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── Procrastination Distribution ── */}
      <section className="glass analytics-chart-card">
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
          <div style={{ textAlign: 'center', padding: 'var(--s8) 0', color: 'var(--text-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--s2)' }}>
              <IconClock />
            </div>
            <p style={{ fontWeight: 600 }}>No completed checkpoints yet</p>
            <p style={{ fontSize: 'var(--text-sm)', marginTop: '4px' }}>
              Complete some checkpoints to see your timing patterns.
            </p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={distribution}
                margin={{ top: 20, right: 16, bottom: 4, left: 0 }}
                barCategoryGap="35%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--text-2)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: 'var(--text-2)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip content={<DistTooltip />} cursor={{ fill: 'var(--chart-cursor, rgba(255,255,255,0.04))' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={70} minPointSize={4}>
                  {distribution.map(entry => (
                    <Cell key={entry.key} fill={DIST_COLORS[entry.key] || 'var(--text-2)'} fillOpacity={entry.count === 0 ? 0.3 : 0.85} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="top"
                    style={{ fill: 'var(--text-2)', fontSize: 12, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Insight sentence */}
            {insightSentence && (
              <p style={{
                marginTop: 'var(--s4)',
                fontSize: 'var(--text-sm)',
                color: 'var(--text-2)',
                textAlign: 'center',
                padding: '10px 16px',
                background: 'rgba(35, 83, 71, 0.12)',
                borderRadius: 'var(--r-lg)',
                border: '1px solid var(--border)',
                lineHeight: 1.5,
              }}>
                {insightSentence}
              </p>
            )}
          </>
        )}
      </section>
    </div>
  )
}

export default AnalyticsPage
