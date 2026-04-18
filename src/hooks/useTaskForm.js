/**
 * useTaskForm.js
 *
 * Manages the controlled form state and dirty-check logic for the CreateTask form.
 * Extracted from CreateTask.jsx so that:
 *  - Form state and validation are independently testable
 *  - The pattern is ready to reuse if EditTask ever needs a dirty-check
 *
 * @param {Function} [onIsDirtyChange] - Optional callback notified when the form
 *                                       transitions between clean and dirty states.
 *                                       Called with (boolean isDirty).
 *
 * @returns {{
 *   form:        { title: string, taskType: string, dueDate: string, notes: string },
 *   handleChange: (e: React.ChangeEvent) => void,
 *   resetForm:   () => void,
 *   isValid:     boolean,
 *   validationError: string|null,
 * }}
 */

import { useState, useEffect } from 'react'

const DEFAULT_FORM = {
  title:    '',
  taskType: 'essay',
  dueDate:  '',
  notes:    '',
}

export function useTaskForm({ onIsDirtyChange } = {}) {
  const [form, setForm] = useState({ ...DEFAULT_FORM })

  // ── Dirty check — notify parent whenever the form transitions ──────────────
  useEffect(() => {
    const isDirty =
      form.title.trim() !== '' ||
      form.notes.trim() !== '' ||
      form.dueDate      !== ''
    if (onIsDirtyChange) onIsDirtyChange(isDirty)
  }, [form, onIsDirtyChange])

  // ── Generic field handler — works for any named input / select / textarea ──
  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  // ── Reset to clean state (called after successful task creation) ────────────
  function resetForm() {
    setForm({ ...DEFAULT_FORM })
  }

  // ── Synchronous validation — returns the first error message or null ────────
  function getValidationError() {
    if (!form.title.trim()) return 'Please provide a task title.'
    if (!form.dueDate)      return 'Please provide a due date.'
    return null
  }

  const validationError = getValidationError()

  return {
    form,
    handleChange,
    resetForm,
    isValid:         validationError === null,
    validationError,
  }
}
