import { useState, useEffect, useCallback, useRef } from 'react'
import { usePageTransition } from '../hooks/usePageTransition'
import { useModalAnimation } from '../hooks/useModalAnimation'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useReveal } from '../hooks/useReveal'
import { AnimatedToast } from '../components/AnimatedToast'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import EditTask from '../components/EditTask'
import { gsap } from 'gsap'
import {
  getCheckpointStatus,
  getOverdueText,
  getTimeUntilDue,
} from '../utils/checkpointHelpers'
import CheckpointCard from '../components/CheckpointCard'

// Storage key for persisting the undo window across page refreshes
const undoStorageKey = (taskId) => `undo_checkpoint_${taskId}`



// ─── Edit Modal Panel ────────────────────────────────────────────────────────
// Extracted so useModalAnimation can run at the top level of a component
// (rules of hooks) and the panel ref is cleanly scoped to just this element.
function EditModalPanel({ task, onSaved, onClose }) {
  const { panelRef, close } = useModalAnimation(onClose)
  return (
    <>
      {/* Backdrop */}
      <div className="modal-overlay" onClick={close} style={{ alignItems: 'center' }} />
      {/* Positioner */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          width: '90%',
          maxWidth: '520px',
          maxHeight: '90vh',
        }}
      >
        {/* Animated Panel */}
        <div ref={panelRef} style={{ width: '100%' }}>
          <EditTask
            task={task}
            onSaved={() => { close(); setTimeout(onSaved, 180) }}
            onCancel={close}
          />
        </div>
      </div>
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function TaskDetailPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const pageRef = usePageTransition()

  const [task, setTask]                     = useState(null)
  const [checkpoints, setCheckpoints]       = useState([])
  const [loading, setLoading]               = useState(true)
  const [checkpointLoading, setCpLoading]   = useState(null)  // null, or the ID of the checkpoint currently being saved
  const [toast, setToast]                   = useState(null)   // { type, text, isUndo }
  const [undoableCheckpoint, setUndoable]   = useState(null)
  const [showDeleteConfirm, setShowDelete]  = useState(false)
  const [showEditModal, setShowEdit]        = useState(false)
  const [showMenu, setShowMenu]             = useState(false)
  const [error, setError]                   = useState(null)

  const menuRef = useRef(null)

  // Close more menu on click outside or Escape
  useEffect(() => {
    if (!showMenu) return

    function handleOutsideClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('touchstart', handleOutsideClick)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showMenu])

  // useRef for timers — avoids extra re-renders from useState
  const undoTimeoutRef   = useRef(null)
  const countdownRef     = useRef(null)
  // Fix 4.3: when true, fetchTaskDetails skips the page-level loading spinner.
  // Toggling a checkpoint triggers a silent re-fetch — the page stays visible.
  const silentRefreshRef = useRef(false)
  // Ensure stagger only fires once per page load
  const hasAnimatedRef = useRef(false)

  // Cleanup on unmount — prevents state updates after navigation
  useEffect(() => {
    return () => {
      clearTimeout(undoTimeoutRef.current)
      clearInterval(countdownRef.current)
    }
  }, [])

  // Fix 4.2: extracted shared countdown helper — previously this 20-line block was
  // copy-pasted between the fresh-complete path and the sessionStorage-restore path.
  // Having two copies meant: (a) any logic change had to be made twice, and (b) if
  // the user marked a checkpoint complete then quickly navigated away and back, both
  // the restore useEffect and a fresh toggleCheckpointStatus could start concurrent
  // intervals. Now both paths call this single function.
  const startUndoCountdown = useCallback((checkpointId, expiresAt) => {
    clearTimeout(undoTimeoutRef.current)
    clearInterval(countdownRef.current)

    setUndoable(checkpointId)
    const remaining = expiresAt - Date.now()
    setToast({ text: `✅ Checkpoint completed! Tap to undo (${Math.ceil(remaining / 1000)}s)`, type: 'undo', isUndo: true })

    countdownRef.current = setInterval(() => {
      const timeLeft = Math.ceil((expiresAt - Date.now()) / 1000)
      if (timeLeft > 0) {
        setToast({ text: `✅ Checkpoint completed! Tap to undo (${timeLeft}s)`, type: 'undo', isUndo: true })
      } else {
        clearInterval(countdownRef.current)
      }
    }, 1000)

    undoTimeoutRef.current = setTimeout(async () => {
      clearInterval(countdownRef.current)
      sessionStorage.removeItem(undoStorageKey(id))
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
    }, remaining)
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Restore undo state after page refresh ───────────────────────────────────
  useEffect(() => {
    const stored = sessionStorage.getItem(undoStorageKey(id))
    if (!stored) return

    let parsed
    try { parsed = JSON.parse(stored) } catch { return }

    const { checkpointId, expiresAt } = parsed
    const remaining = expiresAt - Date.now()

    if (remaining <= 0) {
      sessionStorage.removeItem(undoStorageKey(id))
      return
    }

    // Restore the undo window using the shared helper
    startUndoCountdown(checkpointId, expiresAt)
  }, [id, startUndoCountdown])

  // ── Toast helper ────────────────────────────────────────────────────────────
  const showToast = useCallback((text, type = 'success', isUndo = false) => {
    setToast({ text, type, isUndo })
    setTimeout(() => setToast(null), 4000)
  }, [])

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchTaskDetails = useCallback(async () => {
    // Fix 4.3: skip the page-level loading spinner for silent (post-toggle) refreshes.
    // This prevents the full page flickering to a spinner every time the user
    // marks a checkpoint complete, while still showing the spinner on initial load.
    if (!silentRefreshRef.current) setLoading(true)
    silentRefreshRef.current = false   // reset immediately after reading
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

    // Sequential enforcement: block completion if any earlier checkpoint is still pending.
    // This is a safety net — the checkbox is already visually disabled for locked
    // checkpoints, but this guard prevents any bypass (e.g. rapid double-clicks).
    if (currentStatus === 'pending') {
      const thisCheckpoint = checkpoints.find(cp => cp.id === checkpointId)
      const hasIncompletePredecessor = checkpoints.some(
        cp => cp.checkpoint_number < thisCheckpoint.checkpoint_number && cp.status !== 'completed'
      )
      if (hasIncompletePredecessor) {
        showToast('⛔ Complete the previous checkpoint first', 'error')
        return
      }
    }

    // ── Pre-emptively lock existing undo window to prevent overlaps ──
    // If a different checkpoint is toggled while an undo window is open,
    // explicitly close and lock the previous one before the new save begins.
    if (undoableCheckpoint && undoableCheckpoint !== checkpointId) {
      clearTimeout(undoTimeoutRef.current)
      clearInterval(countdownRef.current)
      undoTimeoutRef.current = null
      sessionStorage.removeItem(undoStorageKey(id))
      setUndoable(null)
    }

    setCpLoading(checkpointId)
    const newStatus   = currentStatus === 'completed' ? 'pending' : 'completed'
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null

    try {
      const { error } = await supabase
        .from('checkpoints')
        .update({ status: newStatus, completed_at: completedAt })
        .eq('id', checkpointId)
      if (error) throw error

      // Fix 4.3: mark next fetch as silent so it doesn't replace the page with a spinner
      silentRefreshRef.current = true
      await fetchTaskDetails()

      if (newStatus === 'completed') {
        // Persist undo window so it survives a page refresh
        const expiresAt = Date.now() + 10000
        sessionStorage.setItem(undoStorageKey(id), JSON.stringify({ checkpointId, expiresAt }))
        // Fix 4.2: use the shared helper instead of the inline copy
        startUndoCountdown(checkpointId, expiresAt)
      } else {
        // Undo: clear all timers and remove persisted state
        clearTimeout(undoTimeoutRef.current)
        clearInterval(countdownRef.current)
        undoTimeoutRef.current = null
        sessionStorage.removeItem(undoStorageKey(id))
        setUndoable(null)
        showToast('↩ Checkpoint marked as pending', 'success')
      }
    } catch (err) {
      showToast('❌ Error updating checkpoint. Try again.', 'error')
    } finally {
      setCpLoading(null)
    }
  }

  // ── GSAP Staggered Entrance ────────────────────────────────────────────────
  useEffect(() => {
    // Only orchestrate if data loaded, checkpoints exist, and haven't animated yet
    if (!loading && checkpoints.length > 0 && !hasAnimatedRef.current) {
      hasAnimatedRef.current = true

      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReduced) return

      const cards = gsap.utils.toArray('.gsap-checkpoint-card')
      if (cards.length > 0) {
        gsap.fromTo(cards,
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.15,
            delay: 0.3,
            ease: 'power3.out',
            clearProps: 'all' // Cleanup inline styles when done
          }
        )
      }
    }
  }, [loading, checkpoints])

  // ── Reopen task (Gap 12) ──────────────────────────────────────────────────
  // Un-completes the last completed checkpoint. The Postgres trigger then
  // automatically sets task.status back to 'active'.
  async function reopenTask() {
    const lastCompleted = [...checkpoints]
      .reverse()
      .find(cp => cp.status === 'completed')
    if (!lastCompleted) return

    try {
      const { error } = await supabase
        .from('checkpoints')
        .update({ status: 'pending', completed_at: null })
        .eq('id', lastCompleted.id)
      if (error) throw error

      silentRefreshRef.current = true
      await fetchTaskDetails()
      showToast('↩ Task reopened — last checkpoint set to pending', 'success')
    } catch {
      showToast('❌ Could not reopen task. Try again.', 'error')
    }
  }

  // ── Delete task ────────────────────────────────────────────────────────────
  async function confirmDelete() {
    setShowDelete(false)
    setLoading(true)
    try {
      // Fix 4.6: check errors from both delete calls instead of swallowing them.
      // Previously, a failed checkpoint delete would silently proceed to delete the
      // task, leaving orphaned checkpoint rows in the DB.
      const { error: cpErr } = await supabase.from('checkpoints').delete().eq('task_id', id)
      if (cpErr) throw cpErr
      const { error: tErr } = await supabase.from('tasks').delete().eq('id', id)
      if (tErr) throw tErr

      // Fix 4.5: clear the undo sessionStorage key before navigating away.
      // Without this, a stale key can produce a ghost '🎉 All done' toast if
      // the user hits the browser back button to the now-deleted task URL.
      sessionStorage.removeItem(undoStorageKey(id))
      navigate('/')
    } catch (err) {
      showToast('❌ Error deleting task', 'error')
      setLoading(false)
    }
  }

  // ── Loading / Error screens ────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--s16) var(--s4)', gap: 'var(--s3)' }}>
        <div className="spinner spinner-large" />
        <p style={{ color: 'var(--text-2)', fontSize: 'var(--text-base)', fontWeight: 500, margin: 0 }}>
          Loading task…
        </p>
      </div>
    )
  }

  if (!task) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--s16) var(--s4)' }}>
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

  return (
    <div ref={pageRef} style={{ maxWidth: '860px', margin: '0 auto' }}>
      {/* ── Toast ─────────────────────────────────────────────────────────────── */}
      <AnimatedToast
        toast={toast}
        onClick={() => {
          if (!checkpointLoading && undoableCheckpoint) {
            clearInterval(countdownRef.current)
            clearTimeout(undoTimeoutRef.current)
            setToast(prev => ({
              ...prev,
              text: 'Undoing...',
              type: 'undo',
              isActioning: true
            }))
            toggleCheckpointStatus(undoableCheckpoint, 'completed')
          }
        }}
      />

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

      {/* ── Edit modal ────────────────────────────────────────────────────────── */}
      {showEditModal && (
        <EditModalPanel
          task={task}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); fetchTaskDetails() }}
        />
      )}

      {/* ── Desktop Nav bar ─────────────────────────────────────────────────── */}
      <div className="task-detail-nav-desktop" style={{ display: 'flex', gap: 'var(--s2)', marginBottom: 'var(--s5)', alignItems: 'center' }}>
        <button className="btn-secondary" onClick={() => navigate('/')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Tasks
        </button>
        <div style={{ flex: 1 }} />
        {progress === 100 && (
          <button className="btn-secondary" onClick={reopenTask}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            Reopen
          </button>
        )}
        <button className="btn-secondary" onClick={() => setShowEdit(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          Edit
        </button>
        <button className="btn-danger" onClick={() => setShowDelete(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Delete Task
        </button>
      </div>

      {/* ── Mobile Compact Top Bar ─────────────────────────────────────────── */}
      <div className="task-detail-nav-mobile">
        <button
          className="btn-secondary task-detail-icon-btn"
          onClick={() => navigate('/')}
          aria-label="Back to tasks"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }} ref={menuRef}>
          {progress === 100 && (
            <button
              className="btn-secondary"
              onClick={reopenTask}
              style={{ minHeight: '44px', padding: '0 12px', fontSize: 'var(--text-xs)' }}
              aria-label="Reopen task"
            >
              Reopen
            </button>
          )}

          <button
            className="btn-secondary task-detail-edit-btn"
            onClick={() => setShowEdit(true)}
            aria-label="Edit task"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Edit
          </button>

          <button
            className="btn-secondary task-detail-icon-btn"
            onClick={() => setShowMenu(o => !o)}
            aria-label="More options"
            aria-expanded={showMenu}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
              <circle cx="5" cy="12" r="1.5" />
            </svg>
          </button>

          {showMenu && (
            <div className="task-detail-dropdown-menu glass">
              <button
                className="dropdown-menu-item dropdown-menu-item-danger"
                onClick={() => { setShowMenu(false); setShowDelete(true); }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete Task
              </button>
            </div>
          )}
        </div>
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
            <p className="section-eyebrow" style={{ marginBottom: '8px', color: 'var(--text-2)' }}>Task Detail</p>
            <h1 style={{ fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
              {task.title}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {checkpoints.some(cp => cp.ai_generated) && (
              <span className="badge badge-accent" style={{ fontSize: '10px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                </svg>
                AI
              </span>
            )}
            <span className={`badge ${
              progress === 100    ? 'badge-success' :
              task.status === 'active' ? 'badge-accent'  :
              'badge-neutral'
            }`} style={{ fontSize: 'var(--text-xs)' }}>
              {progress === 100 ? '✓ Complete' : task.status}
            </span>
          </div>
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
            <span style={{ color: 'var(--text-2)', fontSize: 'var(--text-xs)' }}>Type</span>
            <span className="badge badge-neutral" style={{
              padding: '3px 10px',
              borderRadius: 'var(--r-pill)',
              color: 'var(--text)',
              fontWeight: 500,
              fontSize: 'var(--text-xs)',
              textTransform: 'capitalize',
            }}>
              {task.task_type.replaceAll('_', ' ')}
            </span>
          </div>
          <div style={{ color: isTaskOverdue ? 'var(--danger)' : 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-2)', fontSize: 'var(--text-xs)' }}>Deadline</span>
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
            <strong style={{ color: 'var(--text-2)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Notes</strong>
            <p style={{ margin: '6px 0 0', lineHeight: 1.65, maxWidth: '65ch', color: 'var(--text)' }}>{task.notes}</p>
          </div>
        )}

        {/* Progress */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Progress
            </span>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-2)' }}>
              {completedCount} / {totalCount} checkpoints
              {progress === 100 && <span style={{ color: 'var(--success)', marginLeft: '8px' }}>✓ All done!</span>}
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* ── Checkpoints ──────────────────────────────────────────────────────── */}
      <div>
        {task.plan_title ? (
          <div style={{ marginBottom: 'var(--s4)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em', marginBottom: '4px' }}>
              {task.plan_title}
            </h2>
            {task.plan_summary && (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: 0 }}>
                {task.plan_summary}
              </p>
            )}
          </div>
        ) : (
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--s4)', color: 'var(--text)', letterSpacing: '-0.01em' }}>
            Checkpoints
          </h2>
        )}

        {checkpoints.length === 0 ? (
          <p style={{ color: 'var(--text-3)', fontSize: 'var(--text-sm)', margin: 0 }}>
            No checkpoints for this task.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--s3)' }}>
            {checkpoints.map(cp => {
              // A checkpoint is locked if it's pending but NOT the next one in sequence
              // (i.e. there's at least one incomplete checkpoint before it)
              const isLocked = cp.status === 'pending' && currentCheckpoint?.id !== cp.id
              return (
                <CheckpointCard
                  key={cp.id}
                  checkpoint={cp}
                  isCurrent={currentCheckpoint?.id === cp.id}
                  onToggle={toggleCheckpointStatus}
                  checkpointLoading={checkpointLoading}
                  isLocked={isLocked}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default TaskDetailPage
