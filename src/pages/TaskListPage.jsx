import { useState, useEffect, useCallback } from 'react'
import { usePageTransition } from '../hooks/usePageTransition'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useReveal } from '../hooks/useReveal'
import { useAuth } from '../hooks/useAuth'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import UpgradeModal from '../components/UpgradeModal'
import {
  getCheckpointStatus,
  getOverdueText,
  getTimeUntilDue,
} from '../utils/checkpointHelpers'
import { groupTasks } from '../utils/taskGrouping'
import TaskCard from '../components/TaskCard'
import UrgencyGroup from '../components/UrgencyGroup'
import CreateModalPanel from '../components/CreateModalPanel'
import OverdueResolutionModal from '../components/OverdueResolutionModal'








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
  const [activeTab, setActiveTab] = useState('active')
  const [showCreateForm, setShowCreate] = useState(false)
  const [showResolutionModal, setShowResolutionModal] = useState(false)
  const [showDeleteConfirm, setShowDelete]= useState(false)
  const [taskToDelete, setTaskToDelete]   = useState(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
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

          // Status reconciliation handled by Postgres trigger on checkpoints table.

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

  // Gap 1: collect all overdue checkpoints across active tasks, attaching their task title.
  const overdueCheckpointsList = tasks
    .filter(t => !t.isCompleted && t.nextCheckpoint && getCheckpointStatus(t.nextCheckpoint) === 'overdue')
    .map(t => ({
      taskTitle: t.title,
      ...t.nextCheckpoint
    }))

  async function handleCreateClick() {
    setError(null)

    // ── Entitlement check (pre-emptive, mirrors DB function logic) ───────────
    if (user) {
      const [subRes, countRes] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('status, current_period_end')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'active'),
      ])
      const sub    = subRes.data
      const isPro  = sub?.status &&
                     ['active', 'cancelled'].includes(sub.status) &&
                     new Date(sub.current_period_end) > new Date()
      const activeCount = countRes.count ?? 0

      if (!isPro && activeCount >= 3) {
        setShowUpgradeModal(true)
        return
      }
    }
    // ── End entitlement check ────────────────────────────────────────────────

    if (overdueCheckpointsList.length > 0) {
      setShowResolutionModal(true)
    } else {
      setShowCreate(true)
    }
  }

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

      {/* ── Upgrade Modal ──────────────────────────────────────────────────── */}
      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
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
        <button className="btn-primary" onClick={handleCreateClick} style={{ gap: '8px' }}>
          <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span>
          Create New Task
        </button>
      </div>

      {/* ── Create Task Modal ─────────────────────────────────────────────────── */}
      {showCreateForm && (
        <CreateModalPanel
          onClose={() => setShowCreate(false)}
          onTaskCreated={handleTaskCreated}
          onUpgradeRequired={() => { setShowCreate(false); setShowUpgradeModal(true) }}
        />
      )}

      {/* ── Overdue Resolution Modal (Gap 1) ──────────────────────────────────── */}
      {showResolutionModal && (
        <OverdueResolutionModal
          checkpoints={overdueCheckpointsList}
          onClose={() => setShowResolutionModal(false)}
          onAllResolved={() => {
            setShowResolutionModal(false)
            fetchTasks()
            // Auto-open create form now that they are unblocked
            setShowCreate(true)
          }}
          onProgress={fetchTasks}
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
              <span className="empty-state-icon">{tasks.length > 0 ? '✅' : '📋'}</span>
              <h3>{tasks.length > 0 ? 'All caught up!' : 'No active tasks'}</h3>
              <p>
                {tasks.length > 0
                  ? 'You have no active tasks right now. Ready to tackle something new?'
                  : "Create your first task and we'll build a checkpoint plan around your deadline."
                }
              </p>
              <button className="btn-primary" onClick={handleCreateClick}>
                + {tasks.length > 0 ? 'Create New Task' : 'Create Your First Task'}
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

          {/* On-track banner — only when nothing is due today AND nothing is overdue */}
          {dueToday.length === 0 && overdueCount === 0 && activeTab === 'active' && (dueThisWeek.length > 0 || dueLater.length > 0) && (
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
