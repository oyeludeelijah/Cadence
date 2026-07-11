import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { TASK_TYPE_OPTIONS } from '../constants/taskTypes'

/**
 * EditTask
 *
 * Pre-filled edit form for an existing task's metadata. 
 * Does NOT regenerate checkpoints — existing checkpoint progress is preserved.
 *
 * Props:
 *   task     {object}  — The current task object from Supabase
 *   onSaved  {fn}      — Called after a successful save (no args)
 *   onCancel {fn}      — Called when the user clicks Cancel or ×
 */
function EditTask({ task, onSaved, onCancel }) {
  // task.checkpoints may not be passed by every caller, so fall back to empty array.
  const existingCheckpoints = task.checkpoints ?? []
  /**
   * Robust conversion of ISO date string to local datetime-local input value (YYYY-MM-DDTHH:mm).
   * This ensures the browser displays the date in the user's local time, not UTC.
   */
  function isoToLocalInput(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    // Fix 5.3: guard against corrupt ISO strings in the DB.
    // new Date('garbage') returns Invalid Date; getFullYear() would return NaN,
    // producing 'NaN-aN-aNTNaN:NaN' in the input which would then save NaN to
    // the DB. Return '' instead so the input stays empty and validation catches it.
    if (isNaN(d.getTime())) return ''
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const [form, setForm] = useState({
    title:    task.title ?? '',
    taskType: task.task_type ?? 'essay',
    dueDate:  isoToLocalInput(task.final_deadline),
    notes:    task.notes ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)   // { type: 'success'|'error', text }
  const [conflictInfo, setConflictInfo]       = useState(null)  // { conflictCount, deadline, pendingCheckpoints }
  const [resolutionChoice, setResolutionChoice] = useState(null) // 'reschedule' | 'keep'

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)

    if (!form.title.trim()) {
      setMessage({ type: 'error', text: 'Title cannot be empty.' })
      return
    }
    if (!form.dueDate) {
      setMessage({ type: 'error', text: 'Please set a deadline.' })
      return
    }

    const deadline = new Date(form.dueDate)
    if (deadline <= new Date()) {
      setMessage({ type: 'error', text: 'Due date must be in the future.' })
      return
    }

    // Fix 5.2 (updated): if deadline conflicts with pending checkpoints, show a
    // resolution choice instead of a dead-end error.
    const pendingCheckpoints = existingCheckpoints.filter(
      cp => cp.status !== 'completed'
    )
    const conflictCount = pendingCheckpoints.filter(
      cp => new Date(cp.due_date) > deadline
    ).length

    if (conflictCount > 0 && !resolutionChoice) {
      setConflictInfo({ conflictCount, deadline, pendingCheckpoints })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title:          form.title.trim(),
          task_type:      form.taskType,
          final_deadline: deadline.toISOString(),
          notes:          form.notes.trim() || null,
        })
        .eq('id', task.id)
        .eq('user_id', task.user_id)

      if (error) throw error

      // If student chose to reschedule, proportionally redistribute pending checkpoint dates
      if (resolutionChoice === 'reschedule' && conflictInfo) {
        const now = new Date()
        const span = conflictInfo.deadline - now
        const count = conflictInfo.pendingCheckpoints.length

        const updates = conflictInfo.pendingCheckpoints.map((cp, i) => {
          const newDate = new Date(now.getTime() + span * ((i + 1) / (count + 1)))
          return supabase
            .from('checkpoints')
            .update({ due_date: newDate.toISOString() })
            .eq('id', cp.id)
        })
        await Promise.all(updates)
      }

      setMessage({ type: 'success', text: 'Task updated successfully ✨' })
      setConflictInfo(null)
      setResolutionChoice(null)
      // Small delay so user sees success before modal closes
      setTimeout(() => { if (onSaved) onSaved() }, 1000)
    } catch {
      setMessage({ type: 'error', text: '⚠️ Could not save changes. Please check your connection.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="glass"
      style={{
        padding: 'var(--s5)',
        borderRadius: 'var(--r-xl)',
        borderTop: '1px solid rgba(99,102,241,0.25)',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 'var(--s5)' }}>
        <p className="section-eyebrow" style={{ marginBottom: 'var(--s1)' }}>Edit Task</p>
        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text)' }}>
          Update task details
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)', marginTop: '6px' }}>
          Checkpoints are not regenerated when you edit — existing progress is preserved.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
        {/* Title */}
        <div className="field-group">
          <label className="field-label" htmlFor="edit-title">Task Title</label>
          <input
            id="edit-title"
            className="field-input"
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="What needs to be done?"
            autoComplete="off"
          />
        </div>

        {/* Task Type */}
        <div className="field-group">
          <label className="field-label" htmlFor="edit-type">Task Type</label>
          <select
            id="edit-type"
            className="field-select"
            name="taskType"
            value={form.taskType}
            onChange={handleChange}
          >
            {TASK_TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Deadline */}
        <div className="field-group">
          <label className="field-label" htmlFor="edit-due">Final Deadline</label>
          <input
            id="edit-due"
            className="field-input"
            type="datetime-local"
            name="dueDate"
            value={form.dueDate}
            onChange={handleChange}
          />
        </div>

        {/* Notes */}
        <div className="field-group">
          <label className="field-label" htmlFor="edit-notes">
            Notes <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            id="edit-notes"
            className="field-textarea"
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Any extra context..."
          />
        </div>

        {/* Conflict resolution choice — shown when new deadline conflicts with pending checkpoints */}
        {conflictInfo && (
          <div style={{
            background: 'var(--warning-dim, rgba(245,158,11,0.1))',
            border: '1px solid rgba(245,158,11,0.35)',
            borderRadius: 'var(--r-md)',
            padding: 'var(--s3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--s2)',
          }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text)', margin: 0, fontWeight: 600 }}>
              ⚠️ {conflictInfo.conflictCount} pending checkpoint{conflictInfo.conflictCount > 1 ? 's' : ''} fall after this new deadline.
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-2)', margin: 0 }}>How would you like to handle them?</p>
            <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' }}>
              <button
                type="submit"
                className="btn-primary"
                onClick={() => setResolutionChoice('reschedule')}
                style={{ flex: 1 }}
              >
                📅 Reschedule proportionally
              </button>
              <button
                type="submit"
                className="btn-secondary"
                onClick={() => setResolutionChoice('keep')}
                style={{ flex: 1 }}
              >
                Keep existing dates
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--s2)', marginTop: 'var(--s1)' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={loading}
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--s1)' }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ borderTopColor: '#fff' }} />
                Saving…
              </>
            ) : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Message */}
      {message && (
        <div
          className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'}`}
          style={{ marginTop: 'var(--s3)' }}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}

export default EditTask
