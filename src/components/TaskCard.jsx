/**
 * TaskCard.jsx
 *
 * Displays a single task summary and its next upcoming checkpoint.
 * Has an accent border that indicates urgency:
 *  - Green: Completed
 *  - Red: Overdue
 *  - Yellow: Urgent (due soon)
 *  - Blue (accent): Normal
 */

import { useReveal } from '../hooks/useReveal'
import {
  getCheckpointStatus,
  getOverdueText,
  getTimeUntilDue,
} from '../utils/checkpointHelpers'

export default function TaskCard({ task, onDelete, onNavigate }) {
  const ref = useReveal()
  const now = new Date()
  const isOverdue = new Date(task.final_deadline) < now && !task.isCompleted
  const completedCount = task.checkpoints.filter(cp => cp.status === 'completed').length
  const total = task.checkpoints.length
  const progress = total > 0 ? (completedCount / total) * 100 : 0

  const nextCp = task.nextCheckpoint
  const nextStatus = nextCp ? getCheckpointStatus(nextCp) : null

  // Fix 3.4: reflect checkpoint-level overdue on the card border, not just task-level.
  // Checkpoint overdue (next milestone missed) is more immediately actionable than
  // the overall deadline being past.
  const accentBorder = task.isCompleted
    ? 'var(--success)'
    : nextStatus === 'overdue' || isOverdue
    ? 'var(--danger)'
    : nextStatus === 'urgent'
    ? 'var(--warning)'
    : 'var(--accent)'

  return (
    <div
      ref={ref}
      className="glass reveal task-card"
      onClick={() => onNavigate(task.id)}
      style={{
        borderRadius: 'var(--r-lg)',
        borderLeft: `3px solid ${accentBorder}`,
        cursor: 'pointer',
      }}
    >
      {/* Card Header */}
      <div className="task-card-header">
        <div className="task-card-info">
          <h3 className="task-card-title">
            {task.title}
          </h3>
          <div className="task-card-meta">
            <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
              {task.task_type.replaceAll('_', ' ')}
            </span>
            {task.checkpoints.some(cp => cp.ai_generated) && (
              <span className="badge badge-accent" style={{ fontSize: '10px', padding: '2px 8px' }}>
                AI ✨
              </span>
            )}
            <span className="task-card-deadline" style={{
              fontSize: 'var(--text-xs)',
              color: isOverdue ? 'var(--danger)' : 'var(--text-3)',
            }}>
              <span className="task-card-deadline-label">Final deadline: </span>
              {new Date(task.final_deadline).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric'
              })}
              {isOverdue && ' · Overdue'}
            </span>
          </div>
        </div>

        {/* Right controls - Desktop only */}
        <div className="task-card-controls">
          <span className={`badge ${task.isCompleted ? 'badge-success' : 'badge-accent'}`}>
            {task.isCompleted ? 'Done' : 'Active'}
          </span>
          <button
            className="btn-danger"
            onClick={(e) => { e.stopPropagation(); onDelete(task) }}
            style={{ padding: '4px 8px', fontSize: '16px', fontWeight: 400, lineHeight: 1 }}
            title="Delete task"
          >
            ×
          </button>
        </div>

        {/* Mobile progress - Mobile only ("x / y" progress) */}
        <div className="task-card-mobile-progress">
          {completedCount} / {total}
        </div>
      </div>

      {/* Progress - Desktop only */}
      <div className="task-card-progress-desktop">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', fontWeight: 500 }}>
            PROGRESS
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-2)', fontWeight: 600 }}>
            {completedCount} / {total} checkpoints
          </span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Next checkpoint banner - Desktop only */}
      {nextCp && !task.isCompleted && (() => {
        const isOverdueCp = nextStatus === 'overdue'
        const isUrgentCp  = nextStatus === 'urgent'
        if (!isOverdueCp && !isUrgentCp) return (
          <div className="task-card-next" style={{
            padding: '10px var(--s2)',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 'var(--r-sm)',
            border: '1px solid var(--border)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-2)',
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span>Next: <strong style={{ color: 'var(--text)', textTransform: 'capitalize' }}>{nextCp.checkpoint_type}</strong></span>
            <span>{new Date(nextCp.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
          </div>
        )
        return (
          <div className={`alert task-card-next ${isOverdueCp ? 'alert-danger' : 'alert-warning'}`}>
            <span style={{ flexShrink: 0 }}>{isOverdueCp ? '⚠️' : '⏰'}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, marginBottom: '2px', wordBreak: 'break-word' }}>
                {isOverdueCp
                  ? `Overdue by ${getOverdueText(nextCp.due_date)}`
                  : `Due in ${getTimeUntilDue(nextCp.due_date)}`} — <span style={{ textTransform: 'capitalize' }}>{nextCp.checkpoint_type}</span>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Completed state - Desktop only */}
      {task.isCompleted && (
        <div className="alert alert-success task-card-completed">
          <span>✓</span>
          <span>All {total} checkpoints completed</span>
        </div>
      )}

      {/* Notes - Desktop only */}
      {task.notes && (
        <p className="task-card-notes" style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--text-3)',
          margin: 0,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {task.notes}
        </p>
      )}
    </div>
  )
}
