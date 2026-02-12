import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import CreateTask from '../CreateTask'

function TaskListPage() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState('Checking...')
  const [activeTab, setActiveTab] = useState('active') // 'active' or 'completed'
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState(null)
  const [error, setError] = useState(null)

  // Check Supabase connection
  useEffect(() => {
    async function checkConnection() {
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
      console.log('Supabase Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY)
      
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.error('Environment variables not loaded!')
        setConnectionStatus('Env vars missing')
        return
      }
      
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Supabase error details:', error)
          setConnectionStatus(`Error: ${error.message}`)
        } else {
          console.log('Supabase connected successfully!')
          setConnectionStatus('✓ Connected')
        }
      } catch (err) {
        console.error('Supabase connection error:', err)
        setConnectionStatus(`Error: ${err.message}`)
      }
    }
    checkConnection()
  }, [])

  // Fetch tasks with checkpoints
  useEffect(() => {
    fetchTasks()
  }, [activeTab])

  async function fetchTasks() {
    setLoading(true)
    try {
      // Fetch ALL tasks (we'll filter by completion status based on checkpoints)
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('final_deadline', { ascending: true })

      if (tasksError) throw tasksError

      // For each task, fetch its checkpoints and determine completion status
      const tasksWithCheckpoints = await Promise.all(
        (tasksData || []).map(async (task) => {
          const { data: checkpoints, error: checkpointsError } = await supabase
            .from('checkpoints')
            .select('*')
            .eq('task_id', task.id)
            .order('due_date', { ascending: true })

          if (checkpointsError) {
            console.error('Error fetching checkpoints:', checkpointsError)
            return { ...task, checkpoints: [], isCompleted: false }
          }

          // Check if ALL checkpoints are completed
          const allCheckpointsCompleted = checkpoints && checkpoints.length > 0 
            && checkpoints.every(cp => cp.status === 'completed')

          // Find next pending checkpoint
          const nextCheckpoint = checkpoints?.find(cp => cp.status === 'pending')

          // Auto-update task status in database if needed
          if (allCheckpointsCompleted && task.status !== 'completed') {
            await supabase
              .from('tasks')
              .update({ status: 'completed' })
              .eq('id', task.id)
          } else if (!allCheckpointsCompleted && task.status === 'completed') {
            await supabase
              .from('tasks')
              .update({ status: 'active' })
              .eq('id', task.id)
          }

          return {
            ...task,
            checkpoints: checkpoints || [],
            nextCheckpoint,
            isCompleted: allCheckpointsCompleted
          }
        })
      )

      // Filter based on active tab
      const filteredTasks = tasksWithCheckpoints.filter(task => {
        if (activeTab === 'completed') {
          return task.isCompleted
        } else {
          return !task.isCompleted
        }
      })

      setTasks(filteredTasks)
      setError(null)
    } catch (error) {
      console.error('Error fetching tasks:', error)
      setError('⚠️ Connection error. Please check your internet and try again.')
    } finally {
      setLoading(false)
    }
  }

  // Handle task creation success - refresh the list
  const handleTaskCreated = () => {
    fetchTasks()
    setShowCreateForm(false)
  }

  // Handle delete button click - show confirmation modal
  function handleDeleteTask(task, event) {
    event.stopPropagation() // Prevent navigation to task detail
    setTaskToDelete(task)
    setShowDeleteConfirm(true)
  }

  // Confirm and execute deletion
  async function confirmDelete() {
    if (!taskToDelete) return

    setShowDeleteConfirm(false)
    setLoading(true)

    try {
      // Delete checkpoints first (foreign key constraint)
      const { error: checkpointsError } = await supabase
        .from('checkpoints')
        .delete()
        .eq('task_id', taskToDelete.id)

      if (checkpointsError) throw checkpointsError

      // Delete the task
      const { error: taskError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskToDelete.id)

      if (taskError) throw taskError

      // Refresh task list
      await fetchTasks()
      setTaskToDelete(null)
    } catch (error) {
      console.error('Error deleting task:', error)
      setLoading(false)
    }
  }

  // Group tasks by urgency based on next checkpoint due date
  function groupTasksByUrgency(tasks) {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfToday = new Date(today)
    endOfToday.setDate(endOfToday.getDate() + 1) // Tomorrow at midnight (today + 24 hours)
    
    const endOfWeek = new Date(today)
    endOfWeek.setDate(endOfWeek.getDate() + 7) // 7 days from today

    const dueToday = []
    const dueThisWeek = []
    const dueLater = []

    tasks.forEach(task => {
      // Use next checkpoint due date for urgency grouping
      // If no next checkpoint, fall back to task final deadline
      const urgencyDate = task.nextCheckpoint 
        ? new Date(task.nextCheckpoint.due_date)
        : new Date(task.final_deadline)
      
      if (urgencyDate < endOfToday) {
        dueToday.push(task)
      } else if (urgencyDate < endOfWeek) {
        dueThisWeek.push(task)
      } else {
        dueLater.push(task)
      }
    })

    return { dueToday, dueThisWeek, dueLater }
  }

  // Helper function to get checkpoint status
  function getCheckpointStatus(checkpoint) {
    const now = new Date()
    const due = new Date(checkpoint.due_date)
    
    if (checkpoint.status === 'completed') return 'completed'
    if (due < now) return 'overdue'
    
    const hoursUntilDue = (due - now) / (1000 * 60 * 60)
    if (hoursUntilDue < 24) return 'urgent'
    
    return 'pending'
  }

  // Helper function to get overdue text
  function getOverdueText(dueDate) {
    const now = new Date()
    const due = new Date(dueDate)
    const diffMs = now - due
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''}`
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''}`
    } else {
      return 'just now'
    }
  }

  // Helper function to get time until due
  function getTimeUntilDue(dueDate) {
    const now = new Date()
    const due = new Date(dueDate)
    const diffMs = due - now
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`
    } else {
      return null // Not urgent
    }
  }

  const { dueToday, dueThisWeek, dueLater } = groupTasksByUrgency(tasks)

  // Render task card
  function renderTaskCard(task) {
    const isOverdue = new Date(task.final_deadline) < new Date() && !task.isCompleted
    
    return (
      <div
        key={task.id}
        onClick={() => navigate(`/tasks/${task.id}`)}
        className="glass"
        style={{
          padding: '1.5rem',
          borderRadius: '1rem',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          borderLeft: `4px solid ${
            task.isCompleted ? '#10b981' : 
            isOverdue ? '#ef4444' : '#3b82f6'
          }`,
          opacity: task.isCompleted ? 0.9 : 1
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.background = 'var(--glass-hover)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.background = 'var(--glass-bg)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '600', 
              marginBottom: '0.5rem',
              color: 'var(--text-color)'
            }}>
              {task.title}
            </h3>
            
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: 'var(--glass-border)',
                textTransform: 'capitalize'
              }}>
                {task.task_type.replace('_', ' ')}
              </span>
              <span style={{ color: isOverdue ? '#ef4444' : 'var(--text-secondary)' }}>
                Due: {new Date(task.final_deadline).toLocaleDateString()}
                {isOverdue && ' (Overdue)'}
              </span>
            </div>

            {/* Next Checkpoint with Status Indicator */}
            {task.nextCheckpoint && (() => {
              const status = getCheckpointStatus(task.nextCheckpoint)
              
              return (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: 
                    status === 'overdue' ? '#fee2e2' : 
                    status === 'urgent' ? '#fef3c7' : 
                    'var(--glass-border)',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  marginTop: '0.75rem',
                  border: 
                    status === 'overdue' ? '2px solid #ef4444' : 
                    status === 'urgent' ? '2px solid #f59e0b' : 
                    'none'
                }}>
                  {status === 'overdue' && (
                    <div style={{
                      fontWeight: '700',
                      color: '#dc2626',
                      marginBottom: '0.5rem',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      ⚠️ OVERDUE by {getOverdueText(task.nextCheckpoint.due_date)}
                    </div>
                  )}
                  {status === 'urgent' && (
                    <div style={{
                      fontWeight: '700',
                      color: '#d97706',
                      marginBottom: '0.5rem',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      ⏰ URGENT - Due in {getTimeUntilDue(task.nextCheckpoint.due_date)}
                    </div>
                  )}
                  <div style={{ 
                    fontWeight: '600', 
                    color: 
                      status === 'overdue' ? '#991b1b' : 
                      status === 'urgent' ? '#92400e' : 
                      'var(--text-color)', 
                    marginBottom: '0.25rem' 
                  }}>
                    Next: {task.nextCheckpoint.checkpoint_type}
                  </div>
                  <div style={{ 
                    color: 
                      status === 'overdue' ? '#991b1b' : 
                      status === 'urgent' ? '#92400e' : 
                      'var(--text-secondary)' 
                  }}>
                    Due: {new Date(task.nextCheckpoint.due_date).toLocaleString()}
                  </div>
                </div>
              )
            })()}

            {/* Progress or Completion Badge */}
            {task.isCompleted ? (
              <div style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                backgroundColor: '#d1fae5',
                border: '2px solid #10b981',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{ fontSize: '1.25rem' }}>✓</span>
                <div>
                  <div style={{
                    fontWeight: '700',
                    color: '#059669',
                    fontSize: '0.875rem'
                  }}>
                    Task Completed!
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#047857'
                  }}>
                    All {task.checkpoints.length} checkpoints finished
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {task.checkpoints.filter(cp => cp.status === 'completed').length} / {task.checkpoints.length} checkpoints completed
              </div>
            )}

            {task.notes && (
              <p style={{ 
                marginTop: '0.75rem', 
                color: 'var(--text-secondary)',
                fontSize: '0.875rem'
              }}>
                {task.notes}
              </p>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'start', gap: '0.5rem' }}>
            <span style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              backgroundColor: task.isCompleted ? '#10b98120' : '#3b82f620',
              color: task.isCompleted ? '#10b981' : '#3b82f6'
            }}>
              {task.isCompleted ? 'completed' : 'active'}
            </span>
            
            {/* Delete Icon */}
            <button
              onClick={(e) => handleDeleteTask(task, e)}
              style={{
                padding: '0.25rem 0.5rem',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'all 0.2s',
                opacity: 0.6
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1'
                e.currentTarget.style.backgroundColor = '#fee2e2'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.6'
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
              title="Delete task"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', padding: 'var(--container-padding, 2rem)' }}>
      <div className="mesh-gradient"></div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && taskToDelete && (
        <>
          {/* Backdrop with blur */}
          <div 
            onClick={() => setShowDeleteConfirm(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(3px)',
              zIndex: 9998
            }}
          />
          
          {/* Modal */}
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 9999,
            width: '90%',
            maxWidth: '500px'
          }}>
            <div className="glass" style={{
              padding: '2rem',
              borderRadius: '1rem',
              border: '2px solid #ef4444'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#ef4444',
                marginBottom: '1rem'
              }}>
                🗑️ Delete Task
              </h2>
              
              <p style={{
                color: 'var(--text-color)',
                marginBottom: '0.5rem',
                fontSize: '1rem'
              }}>
                Are you sure you want to delete <strong>"{taskToDelete.title}"</strong>?
              </p>
              
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
                marginBottom: '1.5rem'
              }}>
                This will permanently delete the task and all its checkpoints. This action cannot be undone.
              </p>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: 'var(--text-color)',
                    backgroundColor: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--glass-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--glass-bg)'}
                >
                  Cancel
                </button>
                
                <button
                  onClick={confirmDelete}
                  style={{
                    padding: '0.75rem 1.5rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: 'white',
                    backgroundColor: '#ef4444',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Header */}
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        marginBottom: '2rem',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: '700', 
          marginBottom: '1rem',
          color: 'var(--text-color)'
        }}>
          Task Management System
        </h1>
        
        <div style={{ 
          fontSize: '0.9rem', 
          color: connectionStatus.includes('Connected') ? '#10b981' : '#f43f5e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: connectionStatus.includes('Connected') ? '#10b981' : '#f43f5e',
            boxShadow: connectionStatus.includes('Connected') ? '0 0 10px #10b981' : '0 0 10px #f43f5e'
          }}></span>
          Supabase: {connectionStatus}
        </div>

        {/* Global Error Banner */}
        {error && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: '#fee2e2',
            border: '2px solid #ef4444',
            borderRadius: '0.5rem',
            color: '#dc2626',
            fontWeight: '600',
            textAlign: 'center',
            maxWidth: '600px',
            margin: '1.5rem auto 0'
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Create Task Button */}
      <div style={{ maxWidth: '1200px', margin: '0 auto 2rem' }}>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="mobile-full-width"
          style={{
            padding: '1rem 2rem',
            fontSize: '1rem',
            fontWeight: '600',
            color: 'white',
            backgroundColor: '#3b82f6',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
        >
          {showCreateForm ? '− Hide Form' : '+ Create New Task'}
        </button>
      </div>

      {/* Create Task Form */}
      {showCreateForm && (
        <div style={{ marginBottom: '3rem' }}>
          <CreateTask onTaskCreated={handleTaskCreated} />
        </div>
      )}

      {/* Tabs */}
      <div style={{ maxWidth: '1200px', margin: '0 auto 2rem' }}>
        <div className="mobile-stack" style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid var(--glass-border)' }}>
          <button
            onClick={() => setActiveTab('active')}
            className="mobile-full-width"
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              color: activeTab === 'active' ? '#3b82f6' : 'var(--text-secondary)',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: `3px solid ${activeTab === 'active' ? '#3b82f6' : 'transparent'}`,
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: '-2px'
            }}
          >
            Active Tasks
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className="mobile-full-width"
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              color: activeTab === 'completed' ? '#3b82f6' : 'var(--text-secondary)',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: `3px solid ${activeTab === 'completed' ? '#3b82f6' : 'transparent'}`,
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: '-2px'
            }}
          >
            Completed Tasks
          </button>
        </div>
      </div>

      {/* Task List */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '4rem 2rem',
            color: 'var(--text-secondary)' 
          }}>
            <div className="spinner spinner-large" style={{ marginBottom: '1.5rem' }}></div>
            <p style={{ fontSize: '1.125rem', fontWeight: '500' }}>Loading your tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="glass" style={{
            padding: '4rem 2rem',
            borderRadius: '1rem',
            textAlign: 'center',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            {activeTab === 'active' ? (
              <>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📝</div>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: 'var(--text-color)',
                  marginBottom: '0.5rem'
                }}>
                  No Active Tasks
                </h2>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  {dueToday.length === 0 && dueThisWeek.length === 0 && dueLater.length === 0
                    ? "You're all caught up! 🎉 Create your first task to get started."
                    : "You're on track! All your tasks are completed. 🎉"
                  }
                </p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  style={{
                    padding: '0.75rem 2rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: 'white',
                    backgroundColor: '#3b82f6',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                >
                  + Create Your First Task
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎯</div>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: 'var(--text-color)',
                  marginBottom: '0.5rem'
                }}>
                  No Completed Tasks Yet
                </h2>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '1rem'
                }}>
                  Complete all checkpoints in a task to see it here. Keep going! 💪
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Due Today */}
            {dueToday.length > 0 ? (
              <div style={{ marginBottom: '3rem' }}>
                <h2 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '600', 
                  marginBottom: '1rem',
                  color: '#ef4444'
                }}>
                  🔥 Due Today ({dueToday.length})
                </h2>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {dueToday.map(renderTaskCard)}
                </div>
              </div>
            ) : activeTab === 'active' && (dueThisWeek.length > 0 || dueLater.length > 0) && (
              <div className="glass" style={{
                padding: '2rem',
                borderRadius: '1rem',
                marginBottom: '3rem',
                textAlign: 'center',
                border: '2px solid #10b981'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#059669',
                  marginBottom: '0.25rem'
                }}>
                  You're on track!
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  No tasks due today. Keep up the great work!
                </p>
              </div>
            )}

            {/* Due This Week */}
            {dueThisWeek.length > 0 && (
              <div style={{ marginBottom: '3rem' }}>
                <h2 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '600', 
                  marginBottom: '1rem',
                  color: '#f59e0b'
                }}>
                  📅 Due This Week ({dueThisWeek.length})
                </h2>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {dueThisWeek.map(renderTaskCard)}
                </div>
              </div>
            )}

            {/* Due Later */}
            {dueLater.length > 0 && (
              <div>
                <h2 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '600', 
                  marginBottom: '1rem',
                  color: 'var(--text-color)'
                }}>
                  📆 Due Later ({dueLater.length})
                </h2>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {dueLater.map(renderTaskCard)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default TaskListPage
