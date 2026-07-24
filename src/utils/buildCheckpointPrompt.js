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
  const typeConfigs = {
    essay: {
      goal: 'a writing and composition workflow (research -> outline -> drafting -> editing)',
      rules: 'Checkpoints must focus on researching sources, organizing thesis/arguments, writing draft sections, and proofreading.',
      forbidden: 'FORBIDDEN WORDS: Do NOT use "problem set", "calculations", "flashcards", "exam", "quiz", "formulas", "equations".'
    },
    problem_set: {
      goal: 'a problem-solving and technical calculation workflow (review requirements -> solve problem batches -> verify solutions)',
      rules: 'Checkpoints must focus on analyzing problems, working out solutions/calculations, and checking final answers.',
      forbidden: 'FORBIDDEN WORDS: Do NOT use the words "essay", "paper", "draft", "thesis", "outline", "paragraph", "writing".'
    },
    exam_prep: {
      goal: 'a revision and study workflow (review notes -> create study aids -> practice testing)',
      rules: 'Checkpoints must focus on reviewing lecture materials, creating study guides/flashcards, and self-testing.',
      forbidden: 'FORBIDDEN WORDS: Do NOT use "essay", "paper", "submit assignment", "problem set submission", "draft".'
    }
  }

  const config = typeConfigs[taskType] || typeConfigs.essay

  return `You are an academic task planner. Generate a checkpoint plan for a student's task.

Task Title: ${taskTitle}
Task Type: ${taskType}
Deadline: ${deadlineISO}
Notes: ${notes || 'None'}
Current Time: ${currentTimeISO}

Return ONLY a valid JSON array. No explanation, no markdown, no backticks. Just the raw JSON array.

WORKFLOW MANDATE FOR THIS TASK:
Target Workflow: ${config.goal}
Guidance: ${config.rules}
${config.forbidden}

Each checkpoint must have:
- "checkpoint_type": a short, friendly action label written like a helpful nudge from a friend. Must strictly follow the ${taskType} workflow and reflect the task title "${taskTitle}" and notes.
- "checkpoint_number": integer starting at 1
- "due_date": ISO 8601 timestamp, spaced proportionally between now and the deadline
- "status": "pending"

Rules:
- 3-5 checkpoints maximum
- Checkpoint names MUST reflect the specific task title, task type, and notes — NEVER reuse generic stage names
- First checkpoint due within 24-48 hours of now
- Last checkpoint due at least 2 hours before the final deadline
- Space checkpoints proportionally across the available time
- due_dates must be between working hours ${workingHours.start}:00-${workingHours.end}:00
- If deadline is less than 24 hours away, return exactly 1 checkpoint due halfway between now and the deadline`
}
