/**
 * buildCheckpointPrompt.js
 *
 * Pure function that constructs the prompt sent to the NVIDIA NIM API.
 * Extracted from generateCheckpoints.js so that:
 *  - The prompt can be tested in isolation without making real API calls
 *  - Prompt changes never risk touching HTTP or date-normalisation logic
 *
 * @param {string} taskTitle    - Task title entered by the user
 * @param {string} taskType     - 'essay' | 'problem_set' | 'exam_prep'
 * @param {string} deadlineISO  - Final deadline as an ISO 8601 string
 * @param {string} notes        - Optional notes from the user ('' or null for none)
 * @param {{ start: number, end: number }} workingHours - User's preferred working window
 * @param {string} currentTimeISO - Current time as ISO 8601 (injectable for testing)
 *
 * @returns {string} The fully-formed prompt string ready to send as the user message
 */
export function buildCheckpointPrompt(
  taskTitle,
  taskType,
  deadlineISO,
  notes,
  workingHours = { start: 9, end: 21 },
  currentTimeISO = new Date().toISOString()
) {
  return `You are an academic task planner. Generate a checkpoint plan for a student's task.

Task: ${taskTitle}
Type: ${taskType} (essay / problem_set / exam_prep)
Deadline: ${deadlineISO}
Notes: ${notes || 'None'}
Current time: ${currentTimeISO}

Return ONLY a valid JSON array. No explanation, no markdown, no backticks. Just the raw JSON array.

Each checkpoint must have:
- "checkpoint_type": a short, friendly action label written like a helpful nudge from a friend. Tailored to the task title and notes. For example, for a history essay comparing WWI and WWII causes, use labels like "List out WWI causes", "Write your comparison argument", "Polish your conclusion" — NOT academic labels like "Map Key Causes" or generic ones like "Research", "First Draft"
- "checkpoint_number": integer starting at 1
- "due_date": ISO 8601 timestamp, spaced proportionally between now and the deadline
- "status": "pending"

Rules:
- 3-5 checkpoints maximum
- Checkpoint names MUST reflect the specific task title and notes — do not reuse generic stage names
- First checkpoint due within 24-48 hours of now
- Last checkpoint due at least 2 hours before the final deadline
- Space checkpoints proportionally across the available time
- due_dates must be between working hours ${workingHours.start}:00-${workingHours.end}:00
- If deadline is less than 24 hours away, return exactly 1 checkpoint due halfway between now and the deadline`
}
