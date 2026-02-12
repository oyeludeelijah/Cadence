import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function TaskDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [task, setTask] = useState(null)
  const [checkpoints, setCheckpoints] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkpointLoading, setCheckpointLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)
  const [undoTimeout, setUndoTimeout] = useState(null)
  const [undoableCheckpoint, setUndoableCheckpoint] = useState(null)
  const [undoCountdown, setUndoCountdown] = useState(10)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchTaskDetails()
  }, [id])

  async function fetchTaskDetails() {
    setLoading(true)
    try {
      // Fetch task
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single()

      if (taskError) throw taskError
      setTask(taskData)

      // Fetch checkpoints for this task
      const { data: checkpointsData, error: checkpointsError } = await supabase
        .from('checkpoints')
        .select('*')
        .eq('task_id', id)
        .order('checkpoint_number', { ascending: true })

      if (checkpointsError) throw checkpointsError
      setCheckpoints(checkpointsData || [])
      setError(null)

    } catch (error) {
      console.error('Error fetching task details:', error)
      setError('⚠️ Connection error. Please check your internet and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function toggleCheckpointStatus(checkpointId, currentStatus) {
    // Check if trying to undo outside the 10-second window
    if (currentStatus === 'completed' && undoableCheckpoint !== checkpointId) {
      setSuccessMessage('❌ Cannot undo - checkpoint is locked in')
      setTimeout(() => setSuccessMessage(null), 3000)
      return
    }

    setCheckpointLoading(true)
    
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null

    try {
      const { error } = await supabase
        .from('checkpoints')
        .update({ 
          status: newStatus,
          completed_at: completedAt
        })
        .eq('id', checkpointId)

      if (error) throw error

      // Refresh checkpoints first to get updated data
      await fetchTaskDetails()

      // Show success message based on action
      if (newStatus === 'completed') {
        // Clear any existing undo timeout
        if (undoTimeout) {
          clearTimeout(undoTimeout)
        }

        // Set this checkpoint as undoable
        setUndoableCheckpoint(checkpointId)

        // Reset countdown to 10 seconds
        setUndoCountdown(10)

        // Show undo message with countdown
        setSuccessMessage('✅ Checkpoint completed! [Undo] (10s)')

        // Update countdown every second
        let secondsLeft = 10
        const countdownInterval = setInterval(() => {
          secondsLeft--
          setUndoCountdown(secondsLeft)
          if (secondsLeft > 0) {
            setSuccessMessage(`✅ Checkpoint completed! [Undo] (${secondsLeft}s)`)
          } else {
            clearInterval(countdownInterval)
          }
        }, 1000)

        // After 10 seconds, lock it in and show final message
        const timeout = setTimeout(async () => {
          clearInterval(countdownInterval)
          
          // Check if there's a next checkpoint
          const updatedCheckpoints = await supabase
            .from('checkpoints')
            .select('*')
            .eq('task_id', id)
            .eq('status', 'pending')
            .order('checkpoint_number', { ascending: true })
            .limit(1)

          const hasNextCheckpoint = updatedCheckpoints.data && updatedCheckpoints.data.length > 0
          
          setSuccessMessage(
            hasNextCheckpoint 
              ? '✅ Checkpoint completed! Next one is ready.' 
              : '✅ Checkpoint completed! All checkpoints done.'
          )
          
          // Lock it in - no longer undoable
          setUndoableCheckpoint(null)
          
          // Auto-hide after 3 more seconds
          setTimeout(() => setSuccessMessage(null), 3000)
        }, 10000) // 10 seconds

        setUndoTimeout(timeout)

      } else {
        // User undid a checkpoint
        setSuccessMessage('Checkpoint marked as pending')
        
        // Clear undo tracking
        if (undoTimeout) {
          clearTimeout(undoTimeout)
          setUndoTimeout(null)
        }
        setUndoableCheckpoint(null)
        
        // Auto-hide message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000)
      }

    } catch (error) {
      console.error('Error updating checkpoint:', error)
      setSuccessMessage('❌ Error updating checkpoint')
      setTimeout(() => setSuccessMessage(null), 3000)
    } finally {
      setCheckpointLoading(false)
    }
  }

  // Handle undo click from success message
  function handleUndoClick() {
    if (undoableCheckpoint) {
      toggleCheckpointStatus(undoableCheckpoint, 'completed')
    }
  }

  // Handle task deletion - show confirmation modal
  function handleDeleteTask() {
    setShowDeleteConfirm(true)
  }

  // Confirm and execute deletion
  async function confirmDelete() {
    setShowDeleteConfirm(false)
    setLoading(true)

    try {
      // Delete checkpoints first (foreign key constraint)
      const { error: checkpointsError } = await supabase
        .from('checkpoints')
        .delete()
        .eq('task_id', id)

      if (checkpointsError) throw checkpointsError

      // Delete the task
      const { error: taskError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

      if (taskError) throw taskError

      // Navigate back to home with success message
      navigate('/')
    } catch (error) {
      console.error('Error deleting task:', error)
      setSuccessMessage('❌ Error deleting task')
      setTimeout(() => setSuccessMessage(null), 3000)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="mesh-gradient"></div>
        <div className="spinner spinner-large" style={{ marginBottom: '1.5rem' }}></div>
        <p style={{ color: 'var(--text-color)', fontSize: '1.25rem', fontWeight: '500' }}>Loading task details...</p>
      </div>
    )
  }

  if (!task) {
    return (
      <div style={{ minHeight: '100vh', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="mesh-gradient"></div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-color)', fontSize: '1.25rem', marginBottom: '1rem' }}>Task not found</p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              color: 'white',
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer'
            }}
          >
            Back to Tasks
          </button>
        </div>
      </div>
    )
  }

  const completedCheckpoints = checkpoints.filter(cp => cp.status === 'completed').length
  const totalCheckpoints = checkpoints.length
  const progressPercentage = totalCheckpoints > 0 ? (completedCheckpoints / totalCheckpoints) * 100 : 0
  
  // Find the current (next pending) checkpoint
  const currentCheckpoint = checkpoints.find(cp => cp.status === 'pending')

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

  return (
    <div style={{ minHeight: '100vh', padding: 'var(--container-padding, 2rem)' }}>
      <div className="mesh-gradient"></div>
      
      {/* Global Error Banner */}
      {error && (
        <div style={{
          marginBottom: '2rem',
          padding: '1rem',
          backgroundColor: '#fee2e2',
          border: '2px solid #ef4444',
          borderRadius: '0.5rem',
          color: '#dc2626',
          fontWeight: '600',
          textAlign: 'center',
          maxWidth: '800px',
          margin: '0 auto 2rem'
        }}>
          {error}
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
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
              zIndex: 9998,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
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
                Are you sure you want to delete <strong>"{task?.title}"</strong>?
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
                  disabled={loading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: 'white',
                    backgroundColor: loading ? '#6b7280' : '#ef4444',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) e.currentTarget.style.backgroundColor = '#dc2626'
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) e.currentTarget.style.backgroundColor = '#ef4444'
                  }}
                >
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Success Message */}
        {successMessage && (
          <div 
            onClick={successMessage.includes('[Undo]') ? handleUndoClick : undefined}
            style={{
              position: 'fixed',
              top: '1rem',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'max-content',
              maxWidth: '90%',
              padding: '1rem 1.5rem',
              backgroundColor: successMessage.includes('Error') || successMessage.includes('Cannot') ? '#fee2e2' : '#d1fae5',
              color: successMessage.includes('Error') || successMessage.includes('Cannot') ? '#991b1b' : '#065f46',
              borderRadius: '0.5rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              zIndex: 1000,
              fontWeight: '600',
              border: `1px solid ${successMessage.includes('Error') || successMessage.includes('Cannot') ? '#fca5a5' : '#6ee7b7'}`,
              cursor: successMessage.includes('[Undo]') ? 'pointer' : 'default',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (successMessage.includes('[Undo]')) {
                e.currentTarget.style.transform = 'scale(1.02)'
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)'
              }
            }}
            onMouseLeave={(e) => {
              if (successMessage.includes('[Undo]')) {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'
              }
            }}
          >
            {successMessage}
          </div>
        )}
        {/* Back Button and Delete Button */}
        <div className="mobile-stack" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button
            onClick={() => navigate('/')}
            className="mobile-full-width"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
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
            ← Back to Tasks
          </button>

          <button
            onClick={handleDeleteTask}
            className="mobile-full-width"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
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
            🗑️ Delete Task
          </button>
        </div>

        {/* Task Header */}
        <div className="glass" style={{ padding: '2rem', borderRadius: '1rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
            <h1 style={{ 
              fontSize: '2rem', 
              fontWeight: '700',
              color: 'var(--text-color)'
            }}>
              {task.title}
            </h1>
            <span style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              backgroundColor: task.status === 'active' ? '#10b98120' : '#6b728020',
              color: task.status === 'active' ? '#10b981' : '#6b7280'
            }}>
              {task.status}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <div>
              <span style={{ fontWeight: '600' }}>Type:</span>{' '}
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: 'var(--glass-border)',
                textTransform: 'capitalize'
              }}>
                {task.task_type.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span style={{ fontWeight: '600' }}>Due:</span>{' '}
              {new Date(task.final_deadline).toLocaleString()}
            </div>
          </div>

          {task.notes && (
            <div style={{ 
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: 'var(--glass-border)',
              borderRadius: '0.5rem'
            }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <strong>Notes:</strong> {task.notes}
              </p>
            </div>
          )}

          {/* Progress Bar */}
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-color)' }}>
                Progress
              </span>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {completedCheckpoints} / {totalCheckpoints} checkpoints
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '0.5rem',
              backgroundColor: 'var(--glass-border)',
              borderRadius: '0.25rem',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progressPercentage}%`,
                height: '100%',
                backgroundColor: '#10b981',
                transition: 'width 0.3s ease'
              }}></div>
            </div>
          </div>
        </div>

        {/* Checkpoints */}
        <div>
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: '600', 
            marginBottom: '1rem',
            color: 'var(--text-color)'
          }}>
            Checkpoints
          </h2>

          {checkpoints.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No checkpoints for this task.</p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {checkpoints.map((checkpoint) => {
                const status = getCheckpointStatus(checkpoint)
                const isCurrent = currentCheckpoint && checkpoint.id === currentCheckpoint.id
                
                return (
                  <div
                    key={checkpoint.id}
                    className="glass"
                    style={{
                      padding: '1.5rem',
                      borderRadius: '0.75rem',
                      opacity: status === 'completed' ? 0.7 : 1,
                      borderLeft: `4px solid ${
                        isCurrent ? '#f59e0b' : 
                        status === 'completed' ? '#10b981' : 
                        status === 'overdue' ? '#ef4444' : 
                        status === 'urgent' ? '#f59e0b' : '#3b82f6'
                      }`,
                      backgroundColor: isCurrent ? 'rgba(245, 158, 11, 0.05)' : 'var(--glass-bg)',
                      position: 'relative'
                    }}
                  >
                    {/* Current Badge */}
                    {isCurrent && (
                      <div style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        padding: '0.25rem 0.75rem',
                        backgroundColor: '#f59e0b',
                        color: 'white',
                        borderRadius: '0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        textTransform: 'uppercase'
                      }}>
                        ⚡ Current
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleCheckpointStatus(checkpoint.id, checkpoint.status)}
                        style={{
                          width: '1.5rem',
                          height: '1.5rem',
                          borderRadius: '0.25rem',
                          border: `2px solid ${checkpoint.status === 'completed' ? '#10b981' : 'var(--glass-border)'}`,
                          backgroundColor: checkpoint.status === 'completed' ? '#10b981' : 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.2s'
                        }}
                      >
                        {checkpoint.status === 'completed' && (
                          <span style={{ color: 'white', fontSize: '1rem' }}>✓</span>
                        )}
                      </button>

                      <div style={{ flex: 1 }}>
                        {/* Status Warning Banner */}
                        {(status === 'overdue' || status === 'urgent') && (
                          <div style={{
                            backgroundColor: status === 'overdue' ? '#fee2e2' : '#fef3c7',
                            border: `2px solid ${status === 'overdue' ? '#ef4444' : '#f59e0b'}`,
                            borderRadius: '0.5rem',
                            padding: '0.75rem',
                            marginBottom: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            <span style={{ fontSize: '1.25rem' }}>
                              {status === 'overdue' ? '⚠️' : '⏰'}
                            </span>
                            <div>
                              <div style={{
                                fontWeight: '700',
                                color: status === 'overdue' ? '#dc2626' : '#d97706',
                                fontSize: '0.875rem'
                              }}>
                                {status === 'overdue' 
                                  ? `OVERDUE by ${getOverdueText(checkpoint.due_date)}`
                                  : `URGENT - Due in ${getTimeUntilDue(checkpoint.due_date)}`
                                }
                              </div>
                              <div style={{
                                fontSize: '0.75rem',
                                color: status === 'overdue' ? '#991b1b' : '#92400e',
                                marginTop: '0.125rem'
                              }}>
                                {status === 'overdue'
                                  ? 'This checkpoint needs immediate attention'
                                  : 'Complete this checkpoint soon to stay on track'
                                }
                              </div>
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div>
                            <h3 style={{
                              fontSize: '1.125rem',
                              fontWeight: '600',
                              color: 'var(--text-color)',
                              textDecoration: checkpoint.status === 'completed' ? 'line-through' : 'none'
                            }}>
                              {checkpoint.checkpoint_number}. {checkpoint.checkpoint_type}
                            </h3>
                            <p style={{ 
                              fontSize: '0.875rem', 
                              color: status === 'overdue' ? '#ef4444' : status === 'urgent' ? '#f59e0b' : 'var(--text-secondary)',
                              marginTop: '0.25rem'
                            }}>
                              Due: {new Date(checkpoint.due_date).toLocaleString()}
                              {status === 'overdue' && ' (Overdue)'}
                              {status === 'urgent' && ' (Urgent)'}
                            </p>
                            {checkpoint.completed_at && (
                              <p style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem' }}>
                                Completed: {new Date(checkpoint.completed_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            backgroundColor: checkpoint.status === 'completed' ? '#10b98120' : '#3b82f620',
                            color: checkpoint.status === 'completed' ? '#10b981' : '#3b82f6'
                          }}>
                            {checkpoint.status}
                          </span>
                        </div>

                        {/* Mark Complete Button for Current Checkpoint */}
                        {isCurrent && checkpoint.status === 'pending' && (
                            <button
                              onClick={() => toggleCheckpointStatus(checkpoint.id, checkpoint.status)}
                              disabled={checkpointLoading}
                              style={{
                                marginTop: '1rem',
                                padding: '0.75rem 1.5rem',
                                fontSize: '1rem',
                                fontWeight: '600',
                                color: 'white',
                                backgroundColor: checkpointLoading ? '#6b7280' : '#10b981',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: checkpointLoading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.75rem'
                              }}
                              onMouseEnter={(e) => {
                                if (!checkpointLoading) {
                                  e.currentTarget.style.backgroundColor = '#059669'
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!checkpointLoading) {
                                  e.currentTarget.style.backgroundColor = '#10b981'
                                }
                              }}
                            >
                              {checkpointLoading ? (
                                <>
                                  <div className="spinner"></div>
                                  Updating...
                                </>
                              ) : (
                                '✓ Mark Complete'
                              )}
                            </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TaskDetailPage
