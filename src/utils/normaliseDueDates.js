/**
 * normaliseDueDates.js
 *
 * Shared working-hour clamping utility.
 *
 * SCOPE (intentionally narrow — per project decision):
 *   This module provides ONLY the shared working-hour clamping logic that was
 *   previously duplicated in:
 *     - CreateTask.jsx  (adjustToWorkingHours)
 *     - generateCheckpoints.js  (the Safety UI Clamp block inside .map())
 *
 *   Each caller keeps its own higher-level logic intact:
 *     - CreateTask's adjustToWorkingHours still owns the 24h skip rule,
 *       the rawDate validity fallback, and the midpoint emergency fallback.
 *     - generateCheckpoints still owns the long-term/short-term branching,
 *       the consistent-hour forcing, and the hard deadline/future clamps.
 *
 *   The one thing they share — "given a Date and a working-hours window,
 *   snap it to within [startHour, endHour]" — lives here.
 */

/**
 * Snaps `date` into the caller's working-hour window.
 *
 * Handles two scheduling modes:
 *   - Normal (start ≤ end): e.g. 9 AM–9 PM. Hours before start → clamped to
 *     start. Hours at or after end → clamped to end.
 *   - Night-owl (start > end): e.g. 14:00–02:00. Times that fall in the
 *     "dead zone" between end and start are snapped to the nearer boundary.
 *
 * This function MUTATES the passed Date object (same behaviour as the two
 * original setHours() call-sites it replaces) and also returns it for chaining.
 *
 * @param {Date}   date         - The date to clamp (mutated in place)
 * @param {{ start: number, end: number }} workingHours
 *                              - { start: 0-23, end: 0-23 } hour boundaries
 * @returns {Date} The same (mutated) date object
 */
export function clampToWorkingHours(date, workingHours) {
  const startH = parseInt(workingHours.start, 10)
  const endH   = parseInt(workingHours.end,   10)
  const h      = date.getHours()

  if (startH <= endH) {
    // Normal schedule: e.g. 9 AM → 9 PM
    if (h < startH)      date.setHours(startH, 0, 0, 0)
    else if (h >= endH)  date.setHours(endH,   0, 0, 0)
  } else {
    // Night-owl schedule (wraps midnight): e.g. 14:00 → 02:00
    // "Dead zone" is between endH and startH (e.g. 02:00..14:00)
    if (h >= endH && h < startH) {
      if (h - endH < startH - h) date.setHours(endH,   0, 0, 0)  // closer to end
      else                        date.setHours(startH, 0, 0, 0)  // closer to start
    }
  }

  return date
}

/**
 * Validates and deterministically repairs a list of checkpoint due-dates so that:
 *   1. All dates are strictly increasing in checkpoint_number order.
 *   2. All dates are before the task deadline.
 *   3. No date is in the past.
 *   4. Dates fall within working hours (unless the deadline is < 24h away).
 *
 * If the list already satisfies all rules, it is returned unchanged.
 * If any rule is violated, the entire list is re-spaced evenly across
 * [now+1min, deadline-1min], preserving the checkpoint metadata.
 * Working-hour clamping is re-applied after re-spacing (unless span < 24h).
 *
 * This is a pure repair function — it never discards AI output, it fixes it.
 *
 * @param {Array<{due_date: string, checkpoint_number: number, [key: string]: any}>} checkpoints
 *   Must already be sorted by checkpoint_number ascending.
 * @param {Date} now          - Current time reference (injectable for testing)
 * @param {Date} deadlineDate - Task final deadline
 * @param {{ start: number, end: number }} workingHours
 * @returns {Array} The same array (possibly mutated) with repaired due_dates
 */
export function validateAndRepairDueDates(checkpoints, now, deadlineDate, workingHours = { start: 9, end: 21 }) {
  if (!checkpoints || checkpoints.length === 0) return checkpoints

  const spanMs = deadlineDate.getTime() - now.getTime()
  const n = checkpoints.length

  // Check if the list is already valid
  let isValid = true
  let prevMs = now.getTime()
  for (const cp of checkpoints) {
    const ms = new Date(cp.due_date).getTime()
    if (isNaN(ms) || ms <= prevMs || ms > deadlineDate.getTime()) {
      isValid = false
      break
    }
    prevMs = ms
  }

  if (isValid) return checkpoints

  // Re-space evenly: slot i gets position (i+1)/(n+1) of the span
  console.warn('[validateAndRepairDueDates] Out-of-order or out-of-bounds due dates detected — re-spacing evenly.')

  return checkpoints.map((cp, i) => {
    const slotMs = now.getTime() + (spanMs * (i + 1)) / (n + 1)
    const repaired = new Date(slotMs)

    // Re-apply working-hour clamping unless it's an emergency (< 24h)
    if (spanMs >= 24 * 60 * 60 * 1000) {
      clampToWorkingHours(repaired, workingHours)
    }

    // Hard clamp: must stay strictly between now and deadline
    if (repaired >= deadlineDate) {
      repaired.setTime(deadlineDate.getTime() - 60_000)
    }
    if (repaired <= now) {
      repaired.setTime(now.getTime() + 60_000)
    }

    return { ...cp, due_date: repaired.toISOString() }
  })
}
