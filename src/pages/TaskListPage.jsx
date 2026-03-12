import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useReveal } from '../hooks/useReveal'
import CreateTask from '../components/CreateTask'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import {
  getCheckpointStatus,
  getOverdueText,
  getTimeUntilDue,
} from '../utils/checkpointHelpers'

// ─── groupTasks — pure function, defined outside component so it is not
//     re-created on every render. ─────────────────────────────────────────────
function groupTasks(tasks) {
  const now    = new Date()
  const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endDay = new Date(today); endDay.setDate(endDay.getDate() + 1)
  const endWk  = new Date(today); endWk.setDate(endWk.getDate() + 7)

  const dueToday = [], dueThisWeek = [], dueLater = []
  tasks.forEach(t => {
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

  const accentBorder = task.isCompleted
    ? 'var(--success)'
    : isOverdue
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
            <span>{isOverdueCp ? '⚠️' : '⏰'}</span>
            <div>
              <div style={{ fontWeight: 600, marginBottom: '2px' }}>
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
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '100%',
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
      <div style={{ display: 'grid', gap: 'var(--s3)' }}>
        {/* Pass onNavigate directly — no extra wrapper lambda */}
        {tasks.map(t => (
          <TaskCard key={t.id} task={t} onDelete={onDelete} onNavigate={onNavigate} />
        ))}
      </div>
    </section>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function TaskListPage() {
  const navigate = useNavigate()

  const [tasks, setTasks]                 = useState([])      // ALL tasks (both tabs)
  const [loading, setLoading]             = useState(true)
  const [connectionStatus, setConnection] = useState('Checking…')
  const [activeTab, setActiveTab]         = useState('active')
  const [showCreateForm, setShowCreate]   = useState(false)
  const [showDeleteConfirm, setShowDelete]= useState(false)
  const [taskToDelete, setTaskToDelete]   = useState(null)
  const [error, setError]                 = useState(null)
  const [formIsDirty, setFormDirty]       = useState(false)   // true once user edits any field
  const [showCancelConfirm, setCancelConfirm] = useState(false) // discard-form popup
  const [isClosing, setIsClosing]         = useState(false)    // true during dismissal animation

  // ── Connection check ────────────────────────────────────────────────────────
  useEffect(() => {
    async function check() {
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        setConnection('Env vars missing'); return
      }
      try {
        const { error } = await supabase.auth.getSession()
        setConnection(error ? `Error: ${error.message}` : '✓ Connected')
      } catch (e) {
        setConnection(`Error: ${e.message}`)
      }
    }
    check()
  }, [])

  // ── Close modal on Escape key ───────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Escape') return
      if (showCancelConfirm) { setCancelConfirm(false); return }      // Esc dismisses confirm → back to form
      if (showCreateForm && !isClosing) {
        if (formIsDirty) setCancelConfirm(true)
        else executeClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [showCreateForm, formIsDirty, showCancelConfirm])

  // ── Guard close — show confirm if form has been touched ─────────────────────
  function executeClose() {
    setIsClosing(true)
    setTimeout(() => {
      setShowCreate(false)
      setIsClosing(false)
      setFormDirty(false)
      setCancelConfirm(false)
    }, 300) // matches CSS animación duration
  }

  function handleRequestClose() {
    if (isClosing) return
    if (formIsDirty) setCancelConfirm(true)
    else             executeClose()
  }

  function handleConfirmCancel() {
    setCancelConfirm(false)
    executeClose()
  }

  // -- Fetch (stable useCallback -- no [activeTab] dependency)
  // Fetches ALL tasks. Tab filtering is done client-side at render time so
  // switching tabs never re-fetches and avoids the duplicate-entry race.
  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*, checkpoints(*)')
        .order('final_deadline', { ascending: true })

      if (tasksError) throw tasksError

      const enriched = await Promise.all(
        (tasksData || []).map(async (task) => {
          const checkpoints = (task.checkpoints || [])
            .slice()
            .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))

          const allDone = checkpoints.length > 0 && checkpoints.every(cp => cp.status === 'completed')

          // Reconcile task.status with checkpoint reality (fire-and-forget)
          if (allDone && task.status !== 'completed') {
            supabase.from('tasks').update({ status: 'completed' }).eq('id', task.id)
          } else if (!allDone && task.status === 'completed') {
            supabase.from('tasks').update({ status: 'active' }).eq('id', task.id)
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
  }, [])  // stable -- no deps change between renders

  useEffect(() => { fetchTasks() }, [fetchTasks])

  function handleTaskCreated() {
    fetchTasks()
    executeClose()
  }

  function handleDeleteTask(task) {
    setTaskToDelete(task)
    setShowDelete(true)
  }

  async function confirmDelete() {
    if (!taskToDelete) return
    setShowDelete(false)
    setLoading(true)
    try {
      const { error: cpErr } = await supabase
        .from('checkpoints').delete().eq('task_id', taskToDelete.id)
      if (cpErr) throw cpErr
      const { error: tErr } = await supabase
        .from('tasks').delete().eq('id', taskToDelete.id)
      if (tErr) throw tErr
      await fetchTasks()
    } catch (err) {
      setLoading(false)
    } finally {
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
    <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto' }}>
      <div className="mesh-gradient" />

      {/* ── Delete Modal ───────────────────────────────────────────────────── */}
      {showDeleteConfirm && taskToDelete && (
        <DeleteConfirmModal
          taskTitle={taskToDelete.title}
          loading={loading}
          onConfirm={confirmDelete}
          onCancel={() => setShowDelete(false)}
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

      {/* ── Create Task Modal ───────────────────────────────────────────────────
           position:fixed lifts it above all content.
           Closes on: backdrop click · Escape key · × button.
           If form is dirty, backdrop/× shows a discard-confirm popup instead.
          ─────────────────────────────────────────────────────────────────── */}
      {showCreateForm && (
        <div
          className={`modal-overlay ${isClosing ? 'closing' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="Create new task"
          onClick={(e) => { if (e.target === e.currentTarget) handleRequestClose() }}
        >
          <div className={`modal-panel glass ${isClosing ? 'closing' : ''}`}>
            <button
              className="modal-close-btn"
              onClick={handleRequestClose}
              aria-label="Close"
            >
              ×
            </button>
            <CreateTask onTaskCreated={handleTaskCreated} onDirtyChange={setFormDirty} />
          </div>

          {/* ── Discard-confirm popup — only when form is dirty ─────────────── */}
          {showCancelConfirm && (
            <div
              onClick={(e) => { if (e.target === e.currentTarget) setCancelConfirm(false) }}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--s4)',
                background: 'rgba(4, 4, 12, 0.60)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                zIndex: 10,
                animation: 'modalBackdropIn 0.2s ease both',
              }}
            >
              <div
                className="glass"
                style={{
                  padding: 'var(--s4) var(--s4) var(--s3)',
                  borderRadius: 'var(--r-xl)',
                  maxWidth: '340px',
                  width: '100%',
                  textAlign: 'center',
                  borderTop: '2px solid var(--warning)',
                  boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
                  animation: 'modalPanelIn 0.25s cubic-bezier(0.25,0.46,0.45,0.94) both',
                }}
              >
                <p style={{ fontSize: '28px', marginBottom: 'var(--s1)', lineHeight: 1 }}>✋</p>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--s1)', color: 'var(--text)' }}>
                  Discard this form?
                </h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', marginBottom: 'var(--s3)', maxWidth: 'none' }}>
                  You've started filling in a task. Leaving now will lose everything you've typed.
                </p>
                <button
                  className="btn-danger"
                  onClick={handleConfirmCancel}
                  style={{ width: '100%', marginBottom: 'var(--s2)' }}
                >
                  Yes, discard form
                </button>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', margin: 0 }}>
                  Click the dim area to keep editing
                </p>
              </div>
            </div>
          )}
        </div>
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
