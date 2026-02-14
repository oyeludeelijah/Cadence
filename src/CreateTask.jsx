import { useState } from 'react'
import { supabase } from './supabaseClient'

function CreateTask({ onTaskCreated }) {
  // Form state
  const [form, setForm] = useState({
    title: '',
    taskType: 'essay',
    dueDate: '',
    notes: ''
  })

  // UI state
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null) // { type: 'success' | 'error', text: string }

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)
    setLoading(true)

    try {
      // 1. Validate required fields
      if (!form.title.trim() || !form.dueDate) {
        setMessage({ type: 'error', text: 'Title and due date are required' })
        setLoading(false)
        return
      }

      // 2. Fetch the checkpoint template for the selected task type
      // Templates define the sequence of checkpoints (e.g., outline → draft → review)
      // and what percentage of total time should be allocated to each
      const { data: template, error: fetchError } = await supabase
        .from('task_templates')
        .select('checkpoint_sequence')
        .eq('task_type', form.taskType)
        .single()

      if (fetchError) throw fetchError
      if (!template) {
        setMessage({ 
          type: 'error', 
          text: '⚠️ Setup incomplete: This task type hasn\'t been configured yet. Please contact support.' 
        })
        setLoading(false)
        return
      }

      // 3. Calculate checkpoint due dates based on percentage of total time
      // Example: If deadline is 10 days away and checkpoint is at 30% (0.3),
      // that checkpoint is due in 3 days from now
      const now = new Date()
      const deadline = new Date(form.dueDate)
      const timeSpanMs = deadline - now // Total time available in milliseconds

      // Validate that deadline is in the future
      if (timeSpanMs <= 0) {
        setMessage({ type: 'error', text: 'Due date must be in the future' })
        setLoading(false)
        return
      }

      // Helper function to adjust checkpoint time to reasonable hours
      function adjustToReasonableHours(date) {
        const adjusted = new Date(date)
        const hour = adjusted.getHours()
        
        // If between midnight (0) and 8 AM, move to 9 AM same day
        if (hour >= 0 && hour < 8) {
          adjusted.setHours(9, 0, 0, 0)
        }
        // If between 10 PM (22) and midnight, move to 9 PM same day
        else if (hour >= 22) {
          adjusted.setHours(21, 0, 0, 0)
        }
        
        return adjusted
      }

      // 4. Insert the main task record
      // .toISOString() converts JavaScript Date to ISO 8601 format that Postgres timestamptz expects
      // Example: "2026-02-15T18:30:00.000Z"
      const { data: newTask, error: taskError } = await supabase
        .from('tasks')
        .insert({
          title: form.title.trim(),
          task_type: form.taskType,
          final_deadline: deadline.toISOString(),
          notes: form.notes.trim() || null,
          status: 'active'
        })
        .select('id')
        .single()

      if (taskError) throw taskError

      // 5. Bulk insert all checkpoints at once
      // This is more efficient than inserting one at a time
      // Each checkpoint gets a due date calculated from its percentage_of_time
      // and adjusted to reasonable working hours
      const checkpoints = template.checkpoint_sequence.map((cp, index) => {
        // Calculate raw due date: now + (total_time × percentage)
        const rawDueDate = new Date(now.getTime() + (timeSpanMs * cp.percentage_of_time))
        
        // Adjust to reasonable hours (8 AM - 10 PM)
        const adjustedDueDate = adjustToReasonableHours(rawDueDate)
        
        return {
          task_id: newTask.id,
          checkpoint_number: index + 1, // 1-indexed for display purposes
          checkpoint_type: cp.type, // e.g., "outline", "first_draft", "review"
          due_date: adjustedDueDate.toISOString(),
          status: 'pending'
        }
      })

      const { error: cpError } = await supabase
        .from('checkpoints')
        .insert(checkpoints)

      if (cpError) throw cpError

      // 6. Success! Clear form and show success message
      setMessage({ 
        type: 'success', 
        text: 'Task and checkpoints created successfully!' 
      })
      setForm({
        title: '',
        taskType: 'essay',
        dueDate: '',
        notes: ''
      })

      // Notify parent component that a task was created
      if (onTaskCreated) {
        onTaskCreated()
      }

    } catch (err) {
      console.error('Error creating task:', err)
      setMessage({ 
        type: 'error', 
        text: '⚠️ Connection error. Please check your internet and try again.' 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '2rem' }}>
      <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: '600' }}>
        Create New Task
      </h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Title Input */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Title
          </label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Write history essay"
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Task Type Dropdown */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Type
          </label>
          <select
            name="taskType"
            value={form.taskType}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              outline: 'none',
              backgroundColor: 'white'
            }}
          >
            <option value="essay">Essay</option>
            <option value="problem_set">Problem Set</option>
            <option value="exam_prep">Exam Prep</option>
          </select>
        </div>

        {/* Due Date Input */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Due Date
          </label>
          <input
            type="datetime-local"
            name="dueDate"
            value={form.dueDate}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Notes Textarea */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Notes (Optional)
          </label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Compare WWI and WWII causes"
            rows="4"
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              outline: 'none',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '1rem',
            fontSize: '1.125rem',
            fontWeight: '600',
            color: 'white',
            backgroundColor: loading ? '#6b7280' : '#3b82f6',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem'
          }}
        >
          {loading ? (
            <>
              <div className="spinner"></div>
              Creating...
            </>
          ) : (
            'Create Task'
          )}
        </button>
      </form>

      {/* Message Display */}
      {message && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            borderRadius: '0.5rem',
            backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#6ee7b7' : '#fca5a5'}`
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}


export default CreateTask