/**
 * taskTypes.js
 *
 * Canonical list of task type options used across CreateTask, EditTask,
 * and any future form that needs to display or validate task types.
 *
 * Single source of truth — import from here, never redefine locally.
 */

export const TASK_TYPE_OPTIONS = [
  { value: 'essay',       label: 'Essay' },
  { value: 'problem_set', label: 'Problem Set' },
  { value: 'exam_prep',   label: 'Exam Prep' },
]

/** Convenience set for fast validation (e.g. in tests or API guards) */
export const VALID_TASK_TYPES = new Set(TASK_TYPE_OPTIONS.map(o => o.value))
