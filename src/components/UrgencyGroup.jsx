/**
 * UrgencyGroup.jsx
 *
 * Renders a group of tasks (e.g. "Due Today") with a header, emoji, and count badge.
 */

import { useReveal } from '../hooks/useReveal'
import TaskCard from './TaskCard'

export default function UrgencyGroup({ label, emoji, color, tasks, onDelete, onNavigate, isOverdue = false }) {
  const ref = useReveal()
  const overdue = Boolean(isOverdue || label.toLowerCase().includes('overdue'))

  return (
    <section className="urgency-group" style={{ marginBottom: 'var(--s8)' }}>
      <div ref={ref} className="reveal urgency-group-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--s3)' }}>
        <span className="urgency-group-emoji" style={{ fontSize: '20px' }}>{emoji}</span>
        <h2
          className={`urgency-group-title ${overdue ? 'urgency-overdue' : ''}`}
          style={{ fontSize: 'var(--text-base)', fontWeight: 600, color, letterSpacing: '0.02em', textTransform: 'uppercase' }}
        >
          {label}
        </h2>
        <span
          className="urgency-group-count"
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--text-3)',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-pill)',
            padding: '2px 8px',
          }}
        >
          {tasks.length}
        </span>
      </div>
      <div className="urgency-group-list" style={{ display: 'grid', gap: 'var(--s3)', gridTemplateColumns: 'minmax(0, 1fr)' }}>
        {/* Pass onNavigate directly — no extra wrapper lambda */}
        {tasks.map(t => (
          <TaskCard key={t.id} task={t} onDelete={onDelete} onNavigate={onNavigate} />
        ))}
      </div>
    </section>
  )
}
