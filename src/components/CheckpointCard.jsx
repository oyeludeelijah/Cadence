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
    ? 'var(--border-2)'
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
        className={`glass ${isLocked ? 'checkpoint-card-locked' : ''}`}
        style={{
          padding: 'var(--s4)',
          borderRadius: 'var(--r-lg)',
          borderLeft: `3px solid ${borderColor}`,
          opacity: isCompleted ? 0.65 : 1,
          transition: 'opacity 0.3s ease',
          position: 'relative',
        }}
      >
      {/* Current badge */}
      {isCurrent && !isCompleted && (
        <div style={{ position: 'absolute', top: 'var(--s2)', right: 'var(--s2)' }}>
          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Current
          </span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--s3)' }}>
        {/* Checkbox — disabled when loading or when a prior checkpoint is still pending */}
        <button
          className={`checkbox-btn ${isCompleted ? 'checked' : ''} ${isLocked && !isCompleted ? 'locked' : ''}`}
          onClick={() => onToggle(checkpoint.id, checkpoint.status)}
          disabled={checkpointLoading !== null || (isLocked && !isCompleted)}
          title={isLocked && !isCompleted ? 'Complete the previous checkpoint first' : isCompleted ? 'Mark as pending' : 'Mark as complete'}
          style={{ marginTop: '2px', cursor: isLocked && !isCompleted ? 'not-allowed' : 'pointer' }}
        >
          {isCompleted ? (
            <span className="checkmark">✓</span>
          ) : isLocked ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          ) : null}
        </button>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Status warning banner */}
          {(status === 'overdue' || status === 'urgent') && !isCompleted && (
            <div
              className={`alert ${status === 'overdue' ? 'alert-danger' : 'alert-warning'}`}
              style={{ marginBottom: 'var(--s2)' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', marginTop: '2px' }}>
                {status === 'overdue' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                )}
              </span>
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
                color: isLocked ? 'var(--text-2)' : 'var(--text)',
                textDecoration: isCompleted ? 'line-through' : 'none',
                textDecorationColor: 'var(--text-3)',
                marginBottom: checkpoint.rationale ? '3px' : '4px',
                letterSpacing: '-0.01em',
                textTransform: 'capitalize',
              }}>
                {checkpoint.checkpoint_number}.{' '}
                {checkpoint.checkpoint_type.replaceAll('_', ' ')}
              </h3>

              {checkpoint.rationale && (
                <p style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-2)',
                  margin: '0 0 4px',
                  fontStyle: 'italic',
                }}>
                  {checkpoint.rationale}
                </p>
              )}

              <p style={{
                fontSize: 'var(--text-sm)',
                color: isLocked
                  ? 'var(--text-2)'
                  : status === 'overdue'
                  ? 'var(--danger)'
                  : status === 'urgent'
                  ? 'var(--warning)'
                  : 'var(--text-2)',
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

            {/* Don't render inline badge when the absolute Current badge is already showing */}
            {!(isCurrent && !isCompleted) && (
              <span
                className={`badge ${
                  isCompleted ? 'badge-success' :
                  isLocked || status === 'locked' ? 'badge-neutral' :
                  status === 'overdue' ? 'badge-danger' :
                  status === 'urgent' ? 'badge-warning' :
                  'badge-accent'
                }`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                {isCompleted ? (
                  '✓ done'
                ) : isLocked || status === 'locked' ? (
                  <>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Locked
                  </>
                ) : (
                  status
                )}
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
