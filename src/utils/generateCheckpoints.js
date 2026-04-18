/**
 * generateCheckpoints.js
 *
 * Orchestrates AI-powered checkpoint generation:
 *   1. Guards the API key
 *   2. Builds the prompt (buildCheckpointPrompt)
 *   3. Calls NVIDIA NIM (callNim)
 *   4. Normalises dates and shapes the returned objects
 *
 * Falls back silently to task_templates (returns null) if anything fails.
 */

import { buildCheckpointPrompt } from './buildCheckpointPrompt'
import { callNim }               from './nimApiClient'
import { clampToWorkingHours }   from './normaliseDueDates'

/**
 * @param {string} taskTitle     - Task title entered by the user
 * @param {string} taskType      - 'essay' | 'problem_set' | 'exam_prep'
 * @param {Date}   deadlineDate  - Final deadline as a Date object
 * @param {string} notes         - Optional notes from the user
 *
 * @returns {Promise<Array|null>}
 *   Array of { checkpoint_type, checkpoint_number, due_date, status:'pending' }
 *   or null on any failure (caller falls back to task_templates).
 */
export async function generateCheckpoints(taskTitle, taskType, deadlineDate, notes, workingHours = { start: 9, end: 21 }) {
  const apiKey = import.meta.env.VITE_NVIDIA_API_KEY
  if (!apiKey || apiKey === 'your_nvidia_api_key_here') {
    console.warn('[generateCheckpoints] No NVIDIA API key — skipping AI generation.')
    return null
  }

  // Debug: confirm key is loaded (first 8 chars only)
  console.log('[generateCheckpoints] Key prefix:', apiKey.substring(0, 8))

  const currentTime = new Date().toISOString()
  const deadlineISO = deadlineDate.toISOString()

  const prompt = buildCheckpointPrompt(
    taskTitle,
    taskType,
    deadlineISO,
    notes,
    workingHours,
    currentTime
  )

  try {
    const parsed = await callNim(prompt, apiKey)

    // Normalise — enforce status:'pending', ensure checkpoint_number exists.
    // RULE: For major tasks (> 36h away), we fix the time for consistency. 
    // Previously hardcoded to 5 PM, now dynamically uses 1 hour before their 
    // custom working hours end (e.g., if end=21, sets to 20:00) to respect user preference.
    // SAFETY: After forcing consistency, we verify the result is still before the deadline.
    // For short-term tasks (< 36h), we trust the AI's proportional timing.
    const spanMs = deadlineDate.getTime() - new Date().getTime()
    const now = new Date()
    
    // Calculate a consistent hour (1 hour before working hours end, handle midnight wrapping)
    const endHour = parseInt(workingHours.end, 10)
    let consistentHour = endHour - 1
    if (consistentHour < 0) consistentHour += 24

    return parsed.map((cp, i) => {
      const rawAiDate = new Date(cp.due_date)
      let aiDate = new Date(cp.due_date)

      // Proportional slot helper: evenly spaces checkpoint i within [now, deadline)
      const proportionalSlot = () =>
        new Date(now.getTime() + (spanMs * (i + 1)) / (parsed.length + 1))

      if (spanMs > (36 * 60 * 60 * 1000)) {
        // Long-term task: Fix to consistent working hour
        aiDate.setHours(consistentHour, 0, 0, 0)

        // Safety net: if forcing consistent hour pushes the date to/past the deadline, fall back.
        if (aiDate >= deadlineDate) {
          aiDate = (rawAiDate > now && rawAiDate < deadlineDate) ? rawAiDate : proportionalSlot()
        }
      } else {
        // Tight deadline (< 36 h): trust the AI's proportional timing, but verify
        if (aiDate <= now || aiDate >= deadlineDate) {
          aiDate = (rawAiDate > now && rawAiDate < deadlineDate) ? rawAiDate : proportionalSlot()
        }
      }

      // Safety UI Clamp: if AI hallucinated bounds or we fell back to a proportional slot,
      // clamp to working hours (if it's not a true emergency < 24h away)
      if (spanMs >= 24 * 60 * 60 * 1000) {
        clampToWorkingHours(aiDate, workingHours)
      }

      // Hard clamp: regardless of all the above, never let a checkpoint escape at
      // or past the deadline. This guards against edge cases like spanMs being very
      // small causing proportionalSlot() to round to the deadline itself.
      if (aiDate >= deadlineDate) {
        aiDate = new Date(deadlineDate.getTime() - (60 * 1000)) // 1 min before deadline
      }
      // Also clamp to at least 1 minute in the future (prevents scheduling in the past)
      if (aiDate <= now) {
        aiDate = new Date(now.getTime() + 60 * 1000)
      }

      return {
        checkpoint_type:   cp.checkpoint_type,
        checkpoint_number: cp.checkpoint_number ?? i + 1,
        due_date:          aiDate.toISOString(),
        status:            'pending',
      }
    })
  } catch (err) {
    console.warn('[generateCheckpoints] NVIDIA call failed — falling back to templates:', err.message)
    return null
  }
}
