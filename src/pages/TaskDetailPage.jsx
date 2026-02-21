import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useReveal } from '../hooks/useReveal'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import {
  getCheckpointStatus,
  getOverdueText,
  getTimeUntilDue,
} from '../utils/checkpointHelpers'

// ─── Checkpoint Card ──────────────────────────────────────────────────────────
function CheckpointCard({ checkpoint, isCurrent, onToggle, checkpointLoading }) {
  const ref = useReveal(0.1)
  const status = getCheckpointStatus(checkpoint)
  const isCompleted = checkpoint.status === 'completed'

  const borderColor = isCompleted
    ? 'var(--success)'
    : isCurrent
    ? 'var(--warning)'
    : status === 'overdue'
    ? 'var(--danger)'
    : status === 'urgent'
    ? 'var(--warning)'
    : 'var(--border-2)'

  return (
    <div
      ref={ref}
      className="glass reveal"
      style={{
        padding: 'var(--s4)',
        borderRadius: 'var(--r-lg)',
        borderLeft: `3px solid ${borderColor}`,
        opacity: isCompleted ? 0.6 : 1,
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
        {/* Checkbox */}
        <button
          className={`checkbox-btn ${isCompleted ? 'checked' : ''}`}
          onClick={() => onToggle(checkpoint.id, checkpoint.status)}
          title={isCompleted ? 'Mark as pending' : 'Mark as complete'}
          style={{ marginTop: '2px' }}
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

            <span className={`badge ${
              isCompleted           ? 'badge-success' :
              status === 'overdue'  ? 'badge-danger'  :
              status === 'urgent'   ? 'badge-warning'  :
              'badge-accent'
            }`}>
              {isCompleted ? 'done' : status}
            </span>
          </div>

          {/* Mark Complete button — only on the current (next pending) checkpoint */}
          {isCurrent && !isCompleted && (
            <button
              onClick={() => onToggle(checkpoint.id, checkpoint.status)}
              disabled={checkpointLoading}
              className="btn-primary"
              style={{ marginTop: 'var(--s3)', width: '100%' }}
            >
              {checkpointLoading ? (
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
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function TaskDetailPage() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [task, setTask]                     = useState(null)
  const [checkpoints, setCheckpoints]       = useState([])
  const [loading, setLoading]               = useState(true)
  const [checkpointLoading, setCpLoading]   = useState(false)
  const [toast, setToast]                   = useState(null)   // { type, text, isUndo }
  const [undoableCheckpoint, setUndoable]   = useState(null)
  const [showDeleteConfirm, setShowDelete]  = useState(false)
  const [error, setError]                   = useState(null)

  // useRef for timers — avoids extra re-renders from useState
  const undoTimeoutRef = useRef(null)
  const countdownRef   = useRef(null)

  // Cleanup on unmount — prevents state updates after navigation
  useEffect(() => {
    return () => {
      clearTimeout(undoTimeoutRef.current)
      clearInterval(countdownRef.current)
    }
  }, [])

  // ── Toast helper ────────────────────────────────────────────────────────────
  const showToast = useCallback((text, type = 'success', isUndo = false) => {
    setToast({ text, type, isUndo })
    setTimeout(() => setToast(null), 4000)
  }, [])

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchTaskDetails = useCallback(async () => {
    setLoading(true)
    try {
      const { data: taskData, error: taskError } = await supabase
        .from('tasks').select('*').eq('id', id).single()
      if (taskError) throw taskError
      setTask(taskData)

      const { data: cps, error: cpError } = await supabase
        .from('checkpoints').select('*').eq('task_id', id)
        .order('checkpoint_number', { ascending: true })
      if (cpError) throw cpError
      setCheckpoints(cps || [])
      setError(null)
    } catch (err) {
      console.error(err)
      setError('⚠️ Could not load task. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchTaskDetails() }, [fetchTaskDetails])

  // ── Toggle checkpoint ──────────────────────────────────────────────────────
  async function toggleCheckpointStatus(checkpointId, currentStatus) {
    // Block undo outside the 10-second window
    if (currentStatus === 'completed' && undoableCheckpoint !== checkpointId) {
      showToast('⛔ Cannot undo — checkpoint has locked in', 'error')
      return
    }

    setCpLoading(true)
    const newStatus   = currentStatus === 'completed' ? 'pending' : 'completed'
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null

    try {
      const { error } = await supabase
        .from('checkpoints')
        .update({ status: newStatus, completed_at: completedAt })
        .eq('id', checkpointId)
      if (error) throw error

      await fetchTaskDetails()

      if (newStatus === 'completed') {
        // Cancel any previous undo countdown
        clearTimeout(undoTimeoutRef.current)
        clearInterval(countdownRef.current)

        setUndoable(checkpointId)
        setToast({ text: '✅ Checkpoint completed! Tap to undo (10s)', type: 'undo', isUndo: true })

        let secs = 10
        countdownRef.current = setInterval(() => {
          secs--
          if (secs > 0) {
            setToast({ text: `✅ Checkpoint completed! Tap to undo (${secs}s)`, type: 'undo', isUndo: true })
          } else {
            clearInterval(countdownRef.current)
          }
        }, 1000)

        undoTimeoutRef.current = setTimeout(async () => {
          clearInterval(countdownRef.current)
          const { data } = await supabase
            .from('checkpoints').select('id')
            .eq('task_id', id).eq('status', 'pending').limit(1)
          setToast({
            text: data?.length > 0 ? '✅ Checkpoint locked in. Next one is ready.' : '🎉 All checkpoints completed!',
            type: 'success',
            isUndo: false,
          })
          setTimeout(() => setToast(null), 3500)
          setUndoable(null)
        }, 10000)

      } else {
        // Undo: clear all timers
        clearTimeout(undoTimeoutRef.current)
        clearInterval(countdownRef.current)
        undoTimeoutRef.current = null
        setUndoable(null)
        showToast('↩ Checkpoint marked as pending', 'success')
      }
    } catch (err) {
      console.error(err)
      showToast('❌ Error updating checkpoint. Try again.', 'error')
    } finally {
      setCpLoading(false)
    }
  }

  // ── Delete task ────────────────────────────────────────────────────────────
  async function confirmDelete() {
    setShowDelete(false)
    setLoading(true)
    try {
      await supabase.from('checkpoints').delete().eq('task_id', id)
      await supabase.from('tasks').delete().eq('id', id)
      navigate('/')
    } catch (err) {
      console.error(err)
      showToast('❌ Error deleting task', 'error')
      setLoading(false)
    }
  }

  // ── Loading / Error screens ────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--s3)' }}>
        <div className="mesh-gradient" />
        <div className="spinner spinner-large" />
        <p style={{ color: 'var(--text-2)', fontSize: 'var(--text-base)', fontWeight: 500, margin: 0 }}>
          Loading task…
        </p>
      </div>
    )
  }

  if (!task) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="mesh-gradient" />
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-2)', marginBottom: 'var(--s3)', fontSize: 'var(--text-lg)' }}>
            Task not found
          </p>
          <button className="btn-primary" onClick={() => navigate('/')}>← Back to Tasks</button>
        </div>
      </div>
    )
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const completedCount    = checkpoints.filter(cp => cp.status === 'completed').length
  const totalCount        = checkpoints.length
  const progress          = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  const currentCheckpoint = checkpoints.find(cp => cp.status === 'pending')
  const isTaskOverdue     = new Date(task.final_deadline) < new Date() && task.status !== 'completed'

  const toastClass = toast?.type === 'undo'
    ? 'toast toast-undo'
    : toast?.type === 'error'
    ? 'toast toast-error'
    : 'toast toast-success'

  return (
    <div style={{ minHeight: '100vh', padding: 'var(--s6) var(--container-padding)', maxWidth: '900px', margin: '0 auto' }}>
      <div className="mesh-gradient" />

      {/* ── Toast ─────────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={toastClass}
          onClick={toast.isUndo
            ? () => undoableCheckpoint && toggleCheckpointStatus(undoableCheckpoint, 'completed')
            : undefined}
        >
          {toast.text}
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────────────────── */}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 'var(--s4)' }}>
          <span>⚠️</span><span>{error}</span>
        </div>
      )}

      {/* ── Delete modal ──────────────────────────────────────────────────────── */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          taskTitle={task.title}
          loading={loading}
          onConfirm={confirmDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}

      {/* ── Nav bar ───────────────────────────────────────────────────────────── */}
      <div className="mobile-stack" style={{ display: 'flex', gap: 'var(--s2)', marginBottom: 'var(--s5)' }}>
        <button className="btn-secondary" onClick={() => navigate('/')}>← Back to Tasks</button>
        <div style={{ flex: 1 }} />
        <button className="btn-danger" onClick={() => setShowDelete(true)}>🗑 Delete Task</button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          TASK HEADER
          ════════════════════════════════════════════════════════════════════ */}
      <div
        className="glass"
        style={{
          padding: 'var(--s5)',
          borderRadius: 'var(--r-xl)',
          marginBottom: 'var(--s5)',
          borderTop: progress === 100
            ? '1px solid rgba(16,185,129,0.3)'
            : isTaskOverdue
            ? '1px solid rgba(239,68,68,0.3)'
            : '1px solid rgba(99,102,241,0.2)',
        }}
      >
        {/* Title row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--s3)', gap: 'var(--s2)', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <p className="section-eyebrow" style={{ marginBottom: '8px' }}>Task Detail</p>
            <h1 style={{ fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
              {task.title}
            </h1>
          </div>
          <span className={`badge ${
            progress === 100    ? 'badge-success' :
            task.status === 'active' ? 'badge-accent'  :
            'badge-neutral'
          }`} style={{ fontSize: 'var(--text-xs)' }}>
            {progress === 100 ? '✓ Complete' : task.status}
          </span>
        </div>

        {/* Meta */}
        <div style={{
          display: 'flex',
          gap: 'var(--s4)',
          flexWrap: 'wrap',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-2)',
          marginBottom: 'var(--s4)',
          paddingBottom: 'var(--s4)',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-3)' }}>Type</span>
            <span style={{
              padding: '3px 10px',
              background: 'var(--accent-dim)',
              border: '1px solid transparent',
              borderRadius: 'var(--r-pill)',
              color: 'var(--accent)',
              fontWeight: 500,
              fontSize: 'var(--text-xs)',
              textTransform: 'capitalize',
            }}>
              {task.task_type.replaceAll('_', ' ')}
            </span>
          </div>
          <div style={{ color: isTaskOverdue ? 'var(--danger)' : 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-3)' }}>Deadline</span>
            <span>
              {new Date(task.final_deadline).toLocaleString('en-GB', {
                weekday: 'short', day: 'numeric', month: 'short',
                year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
              })}
              {isTaskOverdue && <span style={{ fontWeight: 600, marginLeft: '6px' }}>· Overdue</span>}
            </span>
          </div>
        </div>

        {/* Notes */}
        {task.notes && (
          <div style={{
            padding: 'var(--s2) var(--s3)',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            marginBottom: 'var(--s4)',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-2)',
          }}>
            <strong style={{ color: 'var(--text-3)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Notes</strong>
            <p style={{ margin: '4px 0 0', lineHeight: 1.6, maxWidth: 'none' }}>{task.notes}</p>
          </div>
        )}

        {/* Progress */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Progress
            </span>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-2)' }}>
              {completedCount} / {totalCount} checkpoints
              {progress === 100 && <span style={{ color: 'var(--success)', marginLeft: '8px' }}>🎉 All done!</span>}
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* ── Checkpoints ──────────────────────────────────────────────────────── */}
      <div>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--s4)', color: 'var(--text)', letterSpacing: '-0.01em' }}>
          Checkpoints
        </h2>

        {checkpoints.length === 0 ? (
          <p style={{ color: 'var(--text-3)', fontSize: 'var(--text-sm)', margin: 0 }}>
            No checkpoints for this task.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--s3)' }}>
            {checkpoints.map(cp => (
              <CheckpointCard
                key={cp.id}
                checkpoint={cp}
                isCurrent={currentCheckpoint?.id === cp.id}
                onToggle={toggleCheckpointStatus}
                checkpointLoading={checkpointLoading}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default TaskDetailPage
