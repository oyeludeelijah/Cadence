/**
 * CheckpointCard.jsx
 *
 * Renders a single checkpoint within the TaskDetailPage timeline.
 * Handles display of overdue/urgent warnings, current status badges, and
 * the "Mark Complete" toggle disabled states.
 */

import {
  getCheckpointStatus,
  getOverdueText,
  getTimeUntilDue,
} from '../utils/checkpointHelpers'

export default function CheckpointCard({ checkpoint, isCurrent, onToggle, checkpointLoading, isLocked }) {
  const status = getCheckpointStatus(checkpoint, isLocked)
  const isCompleted = checkpoint.status === 'completed'

  const borderColor = isCompleted
    ? 'var(--success)'
    : isLocked
    ? 'var(--border)'
    : isCurrent
    ? 'var(--warning)'
    : status === 'overdue'
    ? 'var(--danger)'
    : status === 'urgent'
    ? 'var(--warning)'
    : 'var(--accent)'

  return (
    <div className="gsap-checkpoint-card">
      <div
        className="glass"
        style={{
          padding: 'var(--s4)',
          borderRadius: 'var(--r-lg)',
          borderLeft: `3px solid ${borderColor}`,
          opacity: isCompleted ? 0.6 : isLocked ? 0.45 : 1,
          transition: 'opacity 0.3s ease',
          position: 'relative',
        }}
      >
      {/* Current badge */}
      {isCurrent && !isCompleted && (
        <div style={{ position: 'absolute', top: 'var(--s2)', right: 'var(--s2)' }}>
          <span className="badge badge-warning">⚡ Current</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--s3)' }}>
        {/* Checkbox — disabled when loading or when a prior checkpoint is still pending */}
        <button
          className={`checkbox-btn ${isCompleted ? 'checked' : ''}`}
          onClick={() => onToggle(checkpoint.id, checkpoint.status)}
          disabled={checkpointLoading !== null || (isLocked && !isCompleted)}
          title={isLocked && !isCompleted ? 'Complete the previous checkpoint first' : isCompleted ? 'Mark as pending' : 'Mark as complete'}
          style={{ marginTop: '2px', cursor: isLocked && !isCompleted ? 'not-allowed' : 'pointer' }}
        >
          {isCompleted && <span className="checkmark">✓</span>}
        </button>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Status warning banner */}
          {(status === 'overdue' || status === 'urgent') && !isCompleted && (
            <div
              className={`alert ${status === 'overdue' ? 'alert-danger' : 'alert-warning'}`}
              style={{ marginBottom: 'var(--s2)' }}
            >
              <span>{status === 'overdue' ? '⚠️' : '⏰'}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-xs)' }}>
                  {status === 'overdue'
                    ? `Overdue by ${getOverdueText(checkpoint.due_date)}`
                    : `Due in ${getTimeUntilDue(checkpoint.due_date)}`}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', opacity: 0.8, marginTop: '2px' }}>
                  {status === 'overdue'
                    ? 'Needs immediate attention'
                    : 'Complete this checkpoint soon to stay on track'}
                </div>
              </div>
            </div>
          )}

          {/* Title row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s2)', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{
                fontSize: 'var(--text-base)',
                fontWeight: 600,
                color: 'var(--text)',
                textDecoration: isCompleted ? 'line-through' : 'none',
                textDecorationColor: 'var(--text-3)',
                marginBottom: '4px',
                letterSpacing: '-0.01em',
                textTransform: 'capitalize',
              }}>
                {checkpoint.checkpoint_number}.{' '}
                {checkpoint.checkpoint_type.replaceAll('_', ' ')}
              </h3>

              <p style={{
                fontSize: 'var(--text-sm)',
                color: status === 'overdue'
                  ? 'var(--danger)'
                  : status === 'urgent'
                  ? 'var(--warning)'
                  : 'var(--text-3)',
                margin: 0,
              }}>
                Due: {new Date(checkpoint.due_date).toLocaleString('en-GB', {
                  weekday: 'short', day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit', hour12: true,
                })}
              </p>

              {checkpoint.completed_at && (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--success)', margin: '4px 0 0' }}>
                  ✓ Completed {new Date(checkpoint.completed_at).toLocaleString('en-GB', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
                  })}
                </p>
              )}
            </div>

            {/* Don't render inline badge when the absolute ⚡ Current badge is already showing */}
            {!(isCurrent && !isCompleted) && (
              <span className={`badge ${
                isCompleted          ? 'badge-success' :
                status === 'locked'  ? 'badge-neutral'  :
                status === 'overdue' ? 'badge-danger'   :
                status === 'urgent'  ? 'badge-warning'  :
                'badge-accent'
              }`}>
                {isCompleted ? '✓ done' : status}
              </span>
            )}
          </div>

          {/* Mark Complete button — only on the current (next pending) checkpoint */}
          {isCurrent && !isCompleted && (
            <button
              onClick={() => onToggle(checkpoint.id, checkpoint.status)}
              disabled={checkpointLoading !== null}
              className="btn-primary"
              style={{ marginTop: 'var(--s3)', width: '100%' }}
            >
              {checkpointLoading === checkpoint.id ? (
                <>
                  <span className="spinner" style={{ borderTopColor: '#fff' }} />
                  Saving…
                </>
              ) : '✓ Mark Complete'}
            </button>
          )}
        </div>
      </div>
    </div>
    </div>
  )
}
