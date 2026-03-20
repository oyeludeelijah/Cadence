// Shared helper functions for checkpoint status logic
// Used by both TaskListPage and TaskDetailPage

/**
 * Returns the effective status of a checkpoint:
 * 'completed', 'overdue', 'urgent', or 'pending'
 */
export function getCheckpointStatus(checkpoint) {
  const now = new Date()
  const due = new Date(checkpoint.due_date)

  if (checkpoint.status === 'completed') return 'completed'
  if (due < now) return 'overdue'

  const hoursUntilDue = (due - now) / (1000 * 60 * 60)
  if (hoursUntilDue < 24) return 'urgent'

  return 'pending'
}

/**
 * Returns a human-readable string for how long ago a date was.
 * e.g. "2 days", "3 hours", "just now"
 */
export function getOverdueText(dueDate) {
  const now = new Date()
  const due = new Date(dueDate)
  const diffMs = now - due
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''}`
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''}`
  return 'just now'
}

/**
 * Returns a human-readable string for time until a due date.
 * Returns null if more than 24 hours away (not urgent).
 * e.g. "45 minutes", "3 hours"
 */
export function getTimeUntilDue(dueDate) {
  const now = new Date()
  const due = new Date(dueDate)
  const diffMs = due - now

  // Fix 4.4: guard against being called on an already-past date.
  // This shouldn't happen through current call sites (callers check status === 'urgent'),
  // but protects against future misuse returning a negative minute string.
  if (diffMs <= 0) return 'just now'

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`
  }
  return null // Not urgent
}
