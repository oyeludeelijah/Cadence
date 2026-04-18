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
