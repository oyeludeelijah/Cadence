import { useState, useEffect, useCallback } from 'react'
import { usePageTransition } from '../hooks/usePageTransition'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useReveal } from '../hooks/useReveal'
import { useAuth } from '../hooks/useAuth'
import CreateTask from '../components/CreateTask'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import {
  getCheckpointStatus,
  getOverdueText,
  getTimeUntilDue,
} from '../utils/checkpointHelpers'
import { useModalAnimation } from '../hooks/useModalAnimation'

// ─── groupTasks — pure function, defined outside component so it is not
//     re-created on every render. ─────────────────────────────────────────────
function groupTasks(tasks) {
  const now    = new Date()
  const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endDay = new Date(today); endDay.setDate(endDay.getDate() + 1)
  const endWk  = new Date(today); endWk.setDate(endWk.getDate() + 7)

  const dueToday = [], dueThisWeek = [], dueLater = []
  tasks.forEach(t => {
    // Fix 3.2: completed tasks have no meaningful urgency date — always put them
    // in dueLater so they never appear under the 🔥 "Due Today" heading.
    if (t.isCompleted) { dueLater.push(t); return }

    const urgDate = t.nextCheckpoint
      ? new Date(t.nextCheckpoint.due_date)
      : new Date(t.final_deadline)
    if (urgDate < endDay)     dueToday.push(t)
    else if (urgDate < endWk) dueThisWeek.push(t)
    else                      dueLater.push(t)
  })
  return { dueToday, dueThisWeek, dueLater }
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({ task, onDelete, onNavigate }) {
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
      className="glass reveal"
      onClick={() => onNavigate(task.id)}
      style={{
        borderRadius: 'var(--r-lg)',
        borderLeft: `3px solid ${accentBorder}`,
        cursor: 'pointer',
        padding: 'var(--s4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s3)',
      }}
    >
      {/* Card Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s2)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 600,
            color: 'var(--text)',
            marginBottom: '6px',
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {task.title}
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
              {task.task_type.replaceAll('_', ' ')}
            </span>
            {task.checkpoints.some(cp => cp.ai_generated) && (
              <span className="badge badge-accent" style={{ fontSize: '10px', padding: '2px 8px' }}>
                AI ✨
              </span>
            )}
            <span style={{
              fontSize: 'var(--text-xs)',
              color: isOverdue ? 'var(--danger)' : 'var(--text-3)',
            }}>
              Final deadline: {new Date(task.final_deadline).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric'
              })}
              {isOverdue && ' · Overdue'}
            </span>
          </div>
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
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
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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

      {/* Next checkpoint banner */}
      {nextCp && !task.isCompleted && (() => {
        const isOverdueCp = nextStatus === 'overdue'
        const isUrgentCp  = nextStatus === 'urgent'
        if (!isOverdueCp && !isUrgentCp) return (
          <div style={{
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
          <div className={`alert ${isOverdueCp ? 'alert-danger' : 'alert-warning'}`}>
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

      {/* Completed state */}
      {task.isCompleted && (
        <div className="alert alert-success">
          <span>✓</span>
          <span>All {total} checkpoints completed</span>
        </div>
      )}

      {/* Notes */}
      {task.notes && (
        <p style={{
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

// ─── Urgency Group ────────────────────────────────────────────────────────────
function UrgencyGroup({ label, emoji, color, tasks, onDelete, onNavigate }) {
  const ref = useReveal()
  return (
    <section style={{ marginBottom: 'var(--s8)' }}>
      <div ref={ref} className="reveal" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--s3)' }}>
        <span style={{ fontSize: '20px' }}>{emoji}</span>
        <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
          {label}
        </h2>
        <span style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          color: 'var(--text-3)',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-pill)',
          padding: '2px 8px',
        }}>
          {tasks.length}
        </span>
      </div>
      <div style={{ display: 'grid', gap: 'var(--s3)', gridTemplateColumns: 'minmax(0, 1fr)' }}>
        {/* Pass onNavigate directly — no extra wrapper lambda */}
        {tasks.map(t => (
          <TaskCard key={t.id} task={t} onDelete={onDelete} onNavigate={onNavigate} />
        ))}
      </div>
    </section>
  )
}

// ─── Create Modal Panel ───────────────────────────────────────────────────────
// Extracted so useModalAnimation runs at the top level and the discard-confirm
// logic cleanly maps directly to this modal without polluting the parent page.
function CreateModalPanel({ onClose, onTaskCreated }) {
  const { panelRef, close } = useModalAnimation(onClose)
  const [isDirty, setIsDirty] = useState(false)
  const [showDiscard, setShowDiscard] = useState(false)

  const handleCloseAttempt = useCallback(() => {
    if (isDirty) {
      setShowDiscard(true)
    } else {
      close()
    }
  }, [isDirty, close])

  // Intercept Escape key
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        if (showDiscard) {
          setShowDiscard(false)
        } else {
          handleCloseAttempt()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [showDiscard, handleCloseAttempt])

  return (
    <>
      {showDiscard && (
        <div 
          className="discard-confirm-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDiscard(false) }}
        >
          <div className="discard-confirm-panel">
            <h4>Discard Changes?</h4>
            <p>You have unsaved task details. Are you sure you want to exit?</p>
            <button 
              className="btn-danger" 
              style={{ width: '100%', padding: '10px' }}
              onClick={() => {
                setShowDiscard(false)
                close()
              }}
            >
              Yes, Discard All
            </button>
            <div className="discard-confirm-footer">
              Click anywhere outside to keep editing
            </div>
          </div>
        </div>
      )}

      <div
        className="modal-overlay bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Create new task"
        onClick={(e) => { if (e.target === e.currentTarget) handleCloseAttempt() }}
      >
        <div className="modal-panel glass" ref={panelRef}>
          <button
            className="modal-close-btn"
            onClick={handleCloseAttempt}
            aria-label="Close"
          >
            ×
          </button>
          <CreateTask 
             onTaskCreated={() => {
               close() 
               // The API call completed, and after 1.8s CreateTask calls us.
               // We close the GSAP animation, and then tell the parent to fetch.
               // Wait a beat matching the animation out before fetching so UI doesn't stutter.
               setTimeout(onTaskCreated, 180)
             }} 
             onIsDirtyChange={setIsDirty} 
          />
        </div>
      </div>
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function TaskListPage() {
  const navigate = useNavigate()
  const pageRef = usePageTransition()
  const { user } = useAuth()

  const [tasks, setTasks]                 = useState([])      // ALL tasks (both tabs)
  const [loading, setLoading]             = useState(true)
  // Fix 3.3: separate state so deleting doesn't replace the whole list with a spinner.
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [connectionStatus, setConnection] = useState('Checking…')
  const [activeTab, setActiveTab]         = useState('active')
  const [showCreateForm, setShowCreate]   = useState(false)
  const [showDeleteConfirm, setShowDelete]= useState(false)
  const [taskToDelete, setTaskToDelete]   = useState(null)
  const [error, setError]                 = useState(null)

  // ── Connection check ────────────────────────────────────────────────────────
  useEffect(() => {
    async function check() {
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        setConnection('Env vars missing'); return
      }
      try {
        const { error } = await supabase.from('tasks').select('id').limit(1)
        setConnection(error ? `Error: ${error.message}` : '✓ Connected')
      } catch (e) {
        setConnection(`Error: ${e.message}`)
      }
    }
    check()
  }, [])

  // ── Fetch (stable useCallback -- no [activeTab] dependency) ─────────────────
  // Fetches ALL tasks. Tab filtering is done client-side at render time so
  // switching tabs never re-fetches and avoids the duplicate-entry race.
  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const query = supabase
        .from('tasks')
        .select('*, checkpoints(*)')
        .order('final_deadline', { ascending: true })

      // Fix 3.5: defence-in-depth user_id filter in addition to RLS.
      // If RLS were ever misconfigured, this prevents cross-user data leaks.
      if (user?.id) query.eq('user_id', user.id)

      const { data: tasksData, error: tasksError } = await query
      if (tasksError) throw tasksError

      const enriched = await Promise.all(
        (tasksData || []).map(async (task) => {
          // Fix 3.6: sort by checkpoint_number to match TaskDetailPage ordering.
          // Previously sorted by due_date, which could disagree with the detail
          // page if AI-generated checkpoints had non-sequential dates.
          const checkpoints = (task.checkpoints || [])
            .slice()
            .sort((a, b) => a.checkpoint_number - b.checkpoint_number)

          const allDone = checkpoints.length > 0 && checkpoints.every(cp => cp.status === 'completed')

          // Fix 3.1: reconcile task.status with checkpoint reality.
          // Still fire-and-forget (must not block the render), but errors are
          // now logged so silent DB drift is visible during development.
          if (allDone && task.status !== 'completed') {
            supabase.from('tasks').update({ status: 'completed' }).eq('id', task.id)
              .then(({ error }) => { if (error) console.error('[reconcile] failed to mark completed:', error.message) })
          } else if (!allDone && task.status === 'completed') {
            supabase.from('tasks').update({ status: 'active' }).eq('id', task.id)
              .then(({ error }) => { if (error) console.error('[reconcile] failed to mark active:', error.message) })
          }

          return {
            ...task,
            checkpoints,
            nextCheckpoint: checkpoints.find(cp => cp.status === 'pending'),
            isCompleted: allDone,
          }
        })
      )

      setTasks(enriched)   // store ALL tasks; tab filter applied at render time
      setError(null)
    } catch (err) {
      setError('Connection error. Please check your internet and try again.')
    } finally {
      setLoading(false)
    }
  }, [user?.id])  // re-fetch if the user identity changes (e.g. sign-in after expiry)

  useEffect(() => { fetchTasks() }, [fetchTasks])

  function handleTaskCreated() {
    fetchTasks()
  }

  function handleDeleteTask(task) {
    setError(null) // Clear any old errors
    setTaskToDelete(task)
    setShowDelete(true)
  }

  async function confirmDelete() {
    if (!taskToDelete) return
    setError(null)
    setShowDelete(false)
    // Fix 3.3: use deleteLoading instead of loading so the task list stays
    // visible during the delete — the spinner now only lives inside the modal.
    setDeleteLoading(true)
    try {
      const { error: cpErr } = await supabase
        .from('checkpoints').delete().eq('task_id', taskToDelete.id)
      if (cpErr) throw cpErr
      const { error: tErr } = await supabase
        .from('tasks').delete().eq('id', taskToDelete.id)
      if (tErr) throw tErr
      await fetchTasks()
    } catch (err) {
      setError(`❌ Could not delete "${taskToDelete.title}". Please try again.`)
    } finally {
      setDeleteLoading(false)
      setTaskToDelete(null)
    }
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const isConnected = connectionStatus.includes('Connected')
  // Filter client-side by tab — tasks state now holds ALL tasks
  const visibleTasks = tasks.filter(t => activeTab === 'completed' ? t.isCompleted : !t.isCompleted)
  const { dueToday, dueThisWeek, dueLater } = groupTasks(visibleTasks)
  const hasTasks = visibleTasks.length > 0
  const overdueCount = visibleTasks.filter(t =>
    t.nextCheckpoint && getCheckpointStatus(t.nextCheckpoint) === 'overdue'
  ).length

  // Shared navigate handler — stable reference so UrgencyGroup/TaskCard don't get a new fn each render
  const navigateToTask = useCallback((id) => navigate(`/tasks/${id}`), [navigate])

  return (
    <div ref={pageRef} style={{ maxWidth: 'var(--container-max)', margin: '0 auto' }}>
      <div className="mesh-gradient" />

      {/* ── Delete Modal ───────────────────────────────────────────────────── */}
      {showDeleteConfirm && taskToDelete && (
        <DeleteConfirmModal
          taskTitle={taskToDelete.title}
          loading={deleteLoading}
          onConfirm={confirmDelete}
          onCancel={() => { setShowDelete(false); setError(null); }}
        />
      )}

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <header style={{ marginBottom: 'var(--s6)', paddingBottom: 'var(--s4)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--s3)' }}>
          <div>
            <p className="section-eyebrow" style={{ marginBottom: '6px' }}>Overview</p>
            <h1 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)', lineHeight: 1.1 }}>
              My Tasks
            </h1>
          </div>

          {/* Status pills + connection */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {hasTasks && (
              <>
                <span className="badge badge-accent">{visibleTasks.length} {activeTab === 'completed' ? 'completed' : 'active'}</span>
                {overdueCount > 0 && <span className="badge badge-danger">{overdueCount} overdue</span>}
                {dueToday.length > 0 && <span className="badge badge-warning">{dueToday.length} due today</span>}
              </>
            )}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: 'var(--text-xs)',
              color: isConnected ? 'var(--success)' : 'var(--danger)',
              background: isConnected ? 'var(--success-dim)' : 'var(--danger-dim)',
              border: `1px solid ${isConnected ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
              borderRadius: 'var(--r-pill)',
              padding: '5px 10px',
              fontWeight: 500,
            }}>
              <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
              {connectionStatus}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-danger" style={{ marginTop: 'var(--s3)' }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </header>

      {/* ── Action Row ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--s5)',
        flexWrap: 'wrap',
        gap: 'var(--s2)',
      }}>
        {/* Tab Bar */}
        <div className="tab-bar">
          {[{ id: 'active', label: 'Active' }, { id: 'completed', label: 'Completed' }].map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Primary CTA */}
        <button className="btn-primary" onClick={() => setShowCreate(true)} style={{ gap: '8px' }}>
          <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span>
          Create New Task
        </button>
      </div>

      {/* ── Create Task Modal ─────────────────────────────────────────────────── */}
      {showCreateForm && (
        <CreateModalPanel 
          onClose={() => setShowCreate(false)}
          onTaskCreated={handleTaskCreated}
        />
      )}

      {/* ── Task List ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--s16) var(--s4)', color: 'var(--text-2)' }}>
          <div className="spinner spinner-large" style={{ marginBottom: 'var(--s3)' }} />
          <p style={{ fontSize: 'var(--text-base)', fontWeight: 500, margin: '0 auto' }}>Loading your tasks…</p>
        </div>
      ) : !hasTasks ? (
        /* Empty state */
        <div className="glass empty-state" style={{ borderRadius: 'var(--r-xl)', maxWidth: '520px', margin: '0 auto' }}>
          {activeTab === 'active' ? (
            <>
              <span className="empty-state-icon">📋</span>
              <h3>No active tasks</h3>
              <p>Create your first task and we'll build a checkpoint plan around your deadline.</p>
              <button className="btn-primary" onClick={() => setShowCreate(true)}>
                + Create Your First Task
              </button>
            </>
          ) : (
            <>
              <span className="empty-state-icon">🎯</span>
              <h3>Nothing completed yet</h3>
              <p>Finish all checkpoints on a task and it'll appear here. You've got this.</p>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Due Today */}
          {dueToday.length > 0 && (
            <UrgencyGroup
              label="Due Today"
              emoji="🔥"
              color="var(--danger)"
              tasks={dueToday}
              onDelete={handleDeleteTask}
              onNavigate={navigateToTask}
            />
          )}

          {/* On-track banner */}
          {dueToday.length === 0 && activeTab === 'active' && (dueThisWeek.length > 0 || dueLater.length > 0) && (
            <div className="glass" style={{
              borderRadius: 'var(--r-lg)',
              padding: 'var(--s3) var(--s4)',
              marginBottom: 'var(--s6)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--s2)',
              border: '1px solid rgba(16,185,129,0.2)',
              background: 'var(--success-dim)',
            }}>
              <span style={{ fontSize: '20px' }}>🎉</span>
              <div>
                <strong style={{ color: 'var(--success)', fontSize: 'var(--text-sm)' }}>You're on track</strong>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-2)', margin: 0 }}>No tasks due today. Keep up the momentum.</p>
              </div>
            </div>
          )}

          {/* Due This Week */}
          {dueThisWeek.length > 0 && (
            <UrgencyGroup
              label="Due This Week"
              emoji="📅"
              color="var(--warning)"
              tasks={dueThisWeek}
              onDelete={handleDeleteTask}
              onNavigate={navigateToTask}
            />
          )}

          {/* Coming Up */}
          {dueLater.length > 0 && (
            <UrgencyGroup
              label="Coming Up"
              emoji="📆"
              color="var(--text-2)"
              tasks={dueLater}
              onDelete={handleDeleteTask}
              onNavigate={navigateToTask}
            />
          )}

        </>
      )}
    </div>
  )
}

export default TaskListPage
