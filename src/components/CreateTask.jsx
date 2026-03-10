import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { generateCheckpoints } from '../utils/generateCheckpoints'

const TASK_TYPE_OPTIONS = [
  { value: 'essay',       label: 'Essay' },
  { value: 'problem_set', label: 'Problem Set' },
  { value: 'exam_prep',   label: 'Exam Prep' },
]

function CreateTask({ onTaskCreated }) {
  const [form, setForm] = useState({
    title:    '',
    taskType: 'essay',
    dueDate:  '',
    notes:    '',
  })
  const [loading, setLoading]   = useState(false)
  const [aiActive, setAiActive] = useState(false)  // true while AI is generating
  const [message, setMessage]   = useState(null)   // { type: 'success'|'error', text }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  /**
   * Adjusts a checkpoint time to reasonable working hours (9 AM – 9 PM).
   *
   * IMPORTANT RULES:
   * 1. If the total deadline span is < 24 h, skip adjustment entirely.
   *    Checkpoints must stay proportional to the short window — clamping them
   *    to 9 AM would push them past the deadline itself (the bug you saw).
   * 2. After any adjustment, if the resulting time would exceed the deadline,
   *    fall back to the original unadjusted time as a safety net.
   *
   * @param {Date} rawDate   - The proportionally-calculated checkpoint time
   * @param {Date} deadline  - The task's final deadline
   * @param {number} spanMs  - Total ms between now and deadline
   */
  function adjustToWorkingHours(rawDate, deadline, spanMs) {
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000

    // Rule 1: skip adjustment for tight deadlines
    if (spanMs < TWENTY_FOUR_HOURS) return rawDate

    const d = new Date(rawDate)
    const h = d.getHours()
    if (h >= 0 && h < 9)  d.setHours(9,  0, 0, 0)
    if (h >= 22)           d.setHours(21, 0, 0, 0)

    // Rule 2: safety net — never push past the deadline
    return d < deadline ? d : rawDate
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)

    if (!form.title.trim() || !form.dueDate) {
      setMessage({ type: 'error', text: 'Please provide a title and due date.' })
      return
    }

    const now      = new Date()
    const deadline = new Date(form.dueDate)
    const spanMs   = deadline - now

    if (spanMs <= 0) {
      setMessage({ type: 'error', text: 'Due date must be in the future.' })
      return
    }

    setLoading(true)
    try {
      // ── Step 1: Try AI (NVIDIA NIM) first ────────────────────────────────────
      setAiActive(true)
      const aiCheckpoints = await generateCheckpoints(
        form.title.trim(),
        form.taskType,
        deadline,
        form.notes.trim(),
      )
      setAiActive(false)

      let checkpointSource   // 'ai' | 'template'
      let rawSequence        // array of { checkpoint_type, checkpoint_number, due_date }

      if (aiCheckpoints) {
        // AI succeeded
        checkpointSource = 'ai'
        rawSequence = aiCheckpoints
      } else {
        // ── Step 1b: Fall back to task_templates ─────────────────────────────
        const { data: template, error: fetchError } = await supabase
          .from('task_templates')
          .select('checkpoint_sequence')
          .eq('task_type', form.taskType)
          .single()

        if (fetchError) throw fetchError
        if (!template) {
          setMessage({ type: 'error', text: 'This task type has not been configured yet.' })
          setLoading(false)
          return
        }

        checkpointSource = 'template'
        rawSequence = template.checkpoint_sequence.map((cp, i) => {
          const rawDate = new Date(now.getTime() + spanMs * cp.percentage_of_time)
          return {
            checkpoint_number: i + 1,
            checkpoint_type:   cp.type,
            due_date:          adjustToWorkingHours(rawDate, deadline, spanMs).toISOString(),
          }
        })
      }

      // ── Step 2: Insert task ─────────────────────────────────────────────────
      const { data: newTask, error: taskError } = await supabase
        .from('tasks')
        .insert({
          title:          form.title.trim(),
          task_type:      form.taskType,
          final_deadline: deadline.toISOString(),
          notes:          form.notes.trim() || null,
          status:         'active',
        })
        .select('id')
        .single()

      if (taskError) throw taskError

      // ── Step 3: Bulk-insert checkpoints ────────────────────────────────────
      const isAI = checkpointSource === 'ai'
      const checkpoints = rawSequence.map((cp) => ({
        task_id:           newTask.id,
        checkpoint_number: cp.checkpoint_number,
        checkpoint_type:   cp.checkpoint_type,
        due_date:          cp.due_date,
        status:            'pending',
        ai_generated:      isAI,
      }))

      const { error: cpError } = await supabase.from('checkpoints').insert(checkpoints)
      if (cpError) throw cpError

      const countLabel = `${checkpoints.length} checkpoint${checkpoints.length !== 1 ? 's' : ''}`
      const sourceLabel = isAI ? 'generated by AI ✨' : 'created'
      setMessage({ type: 'success', text: `"${form.title.trim()}" — ${countLabel} ${sourceLabel}.` })
      setForm({ title: '', taskType: 'essay', dueDate: '', notes: '' })
      // Delay modal close so user can read the success/AI message before it disappears
      setTimeout(() => { if (onTaskCreated) onTaskCreated() }, 1800)
    } catch (err) {
      setMessage({ type: 'error', text: '⚠️ Connection error. Please check your internet and try again.' })
    } finally {
      setAiActive(false)
      setLoading(false)
    }
  }

  return (
    <div
      className="glass"
      style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: 'var(--s5)',
        borderRadius: 'var(--r-xl)',
        borderTop: '1px solid rgba(99,102,241,0.25)',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 'var(--s5)' }}>
        <p className="section-eyebrow" style={{ marginBottom: 'var(--s1)' }}>New Task</p>
        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text)' }}>
          Break it down, get it done
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', marginTop: '6px', maxWidth: '100%' }}>
          We'll automatically generate checkpoints based on your deadline.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
        {/* Title */}
        <div className="field-group">
          <label className="field-label" htmlFor="task-title">Task Title</label>
          <input
            id="task-title"
            className="field-input"
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="e.g. Write 3000-word history essay"
            autoComplete="off"
          />
        </div>

        {/* Task Type */}
        <div className="field-group">
          <label className="field-label" htmlFor="task-type">Task Type</label>
          <select
            id="task-type"
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

        {/* Due Date */}
        <div className="field-group">
          <label className="field-label" htmlFor="task-due">Final Deadline</label>
          <input
            id="task-due"
            className="field-input"
            type="datetime-local"
            name="dueDate"
            value={form.dueDate}
            onChange={handleChange}
          />
        </div>

        {/* Notes */}
        <div className="field-group">
          <label className="field-label" htmlFor="task-notes">Notes <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
          <textarea
            id="task-notes"
            className="field-textarea"
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Any extra context — compare WWI &amp; WWII causes, chapters 4–8, etc."
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
          style={{ width: '100%', padding: 'var(--s2) var(--s4)', fontSize: 'var(--text-base)' }}
        >
          {aiActive ? (
            <>
              <span className="spinner" style={{ borderTopColor: '#fff' }} />
              AI is planning your task…
            </>
          ) : loading ? (
            <>
              <span className="spinner" style={{ borderTopColor: '#fff' }} />
              Creating checkpoints…
            </>
          ) : (
            '+ Create Task'
          )}
        </button>
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

export default CreateTask
