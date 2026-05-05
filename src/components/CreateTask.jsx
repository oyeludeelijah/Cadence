import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { generateCheckpoints } from '../utils/generateCheckpoints'
import { useAuth } from '../hooks/useAuth'
import { TASK_TYPE_OPTIONS } from '../constants/taskTypes'
import { clampToWorkingHours } from '../utils/normaliseDueDates'
import { useTaskForm } from '../hooks/useTaskForm'

function CreateTask({ onTaskCreated, onIsDirtyChange }) {
  const { user } = useAuth()
  const { form, handleChange, resetForm } = useTaskForm({ onIsDirtyChange })
  const [loading, setLoading]     = useState(false)
  const [aiActive, setAiActive]   = useState(false)
  const [aiPhase, setAiPhase]     = useState(0)   // cycles through progress messages
  const [message, setMessage]     = useState(null) // { type: 'success'|'error', text }
  const phaseTimer                = useRef(null)

  const AI_PHASES = [
    { icon: '🔌', text: 'Connecting to AI engine…',       hint: 'Cold starts can take ~20–30s' },
    { icon: '🧠', text: 'Analysing your task…',           hint: 'Reading your title, type & deadline' },
    { icon: '📋', text: 'Building your checkpoint roadmap…', hint: 'Structuring a step-by-step plan' },
    { icon: '✨', text: 'Almost done…',                   hint: 'Finalising dates & timings' },
  ]

  useEffect(() => {
    if (aiActive) {
      setAiPhase(0)
      phaseTimer.current = setInterval(() => {
        setAiPhase(p => Math.min(p + 1, AI_PHASES.length - 1))
      }, 7000) // advance every 7s
    } else {
      clearInterval(phaseTimer.current)
    }
    return () => clearInterval(phaseTimer.current)
  }, [aiActive])

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
    const now = new Date()
    
    const workingHours = user?.user_metadata?.working_hours || { start: 9, end: 21 }

    // Rule 1: skip adjustment for tight deadlines (< 24h)
    // proportional timing is more important than "sleep" for emergencies
    if (spanMs < TWENTY_FOUR_HOURS) {
      return rawDate > now && rawDate < deadline ? rawDate : new Date(now.getTime() + (deadline - now) / 2)
    }

    const d = new Date(rawDate)

    // Clamp to working hours using the shared utility
    clampToWorkingHours(d, workingHours)

    // Rule 2: safety net — never push past the deadline or into the past
    // If adjusted time is invalid, fall back to unadjusted rawDate (if valid)
    // or else halfway between now and deadline.
    if (d > now && d < deadline) return d
    if (rawDate > now && rawDate < deadline) return rawDate
    return new Date(now.getTime() + (deadline - now) / 2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)

    if (!form.title.trim() || !form.dueDate) {
      setMessage({ type: 'error', text: 'Please provide a title and due date.' })
      return
    }

    // Guard: session may expire silently during a long AI call (up to 20s).
    // Catch it here so we show a clear message instead of a TypeError crash.
    if (!user) {
      setMessage({ type: 'error', text: '⚠️ Your session has expired. Please sign in again.' })
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
      // ── Step 1: Try AI (NVIDIA NIM) first ──────────────────────────────────────
      setAiActive(true)
      const aiCheckpoints = await generateCheckpoints(
        form.title.trim(),
        form.taskType,
        deadline,
        form.notes.trim(),
        user?.user_metadata?.working_hours || { start: 9, end: 21 }
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
          user_id:        user.id,
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
      if (cpError) {
        // Checkpoint insert failed — roll back by deleting the task row we just
        // created, so the user doesn't end up with a task that has 0 checkpoints.
        await supabase.from('tasks').delete().eq('id', newTask.id)
        throw cpError
      }

      const countLabel = `${checkpoints.length} checkpoint${checkpoints.length !== 1 ? 's' : ''}`
      const sourceLabel = isAI ? 'generated by AI ✨' : 'created'
      setMessage({ type: 'success', text: `"${form.title.trim()}" — ${countLabel} ${sourceLabel}.` })
      resetForm()
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

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)', position: 'relative' }}>
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
            maxLength={150}
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
        <div 
          className="field-group date-picker-group"
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            const input = e.currentTarget.querySelector('input');
            if (input) {
              if (typeof input.showPicker === 'function') {
                input.showPicker();
              } else {
                input.click();
              }
            }
          }}
        >
          <label className="field-label" htmlFor="task-due">Final Deadline</label>
          <input
            id="task-due"
            className="field-input clickable-input"
            type="datetime-local"
            name="dueDate"
            value={form.dueDate}
            onChange={handleChange}
            style={{ cursor: 'pointer' }}
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
            maxLength={600}
          />
        </div>

        {/* AI Loading Overlay — shown while NIM is generating */}
        {aiActive && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(10,10,20,0.92)',
            backdropFilter: 'blur(8px)',
            borderRadius: 'var(--r-xl)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--s3)',
            zIndex: 10,
            padding: 'var(--s6)',
          }}>
            {/* Animated ring */}
            <div style={{
              width: 64, height: 64,
              borderRadius: '50%',
              border: '3px solid rgba(99,102,241,0.2)',
              borderTop: '3px solid var(--accent)',
              animation: 'spin 1s linear infinite',
              flexShrink: 0,
            }} />

            {/* Phase text */}
            <div style={{ textAlign: 'center', maxWidth: 280 }}>
              <p style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 600,
                color: '#ffffff',
                margin: '0 0 6px 0',
                transition: 'opacity 0.4s',
              }}>
                {AI_PHASES[aiPhase].icon} {AI_PHASES[aiPhase].text}
              </p>
              <p style={{
                fontSize: 'var(--text-sm)',
                color: 'rgba(255, 255, 255, 0.7)',
                margin: 0,
              }}>
                {AI_PHASES[aiPhase].hint}
              </p>
            </div>

            {/* Progress dots */}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {AI_PHASES.map((_, i) => (
                <div key={i} style={{
                  width: i === aiPhase ? 20 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i <= aiPhase ? 'var(--accent)' : 'rgba(99,102,241,0.2)',
                  transition: 'all 0.4s ease',
                }} />
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
          style={{ width: '100%', padding: 'var(--s2) var(--s4)', fontSize: 'var(--text-base)' }}
        >
          {loading ? (
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
