/**
 * generateCheckpoints.js
 *
 * Calls the NVIDIA NIM API (OpenAI-compatible endpoint) to generate a
 * checkpoint plan for a student task.  Uses meta/llama-3.1-8b-instruct.
 *
 * Falls back silently to task_templates if the API call fails.
 */

// /nvidia-api is proxied to https://integrate.api.nvidia.com/v1 by vite.config.js
// This runs through Node.js on the dev server — no CORS issues.
const NVIDIA_ENDPOINT = '/nvidia-api/chat/completions'

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
export async function generateCheckpoints(taskTitle, taskType, deadlineDate, notes) {
  const apiKey = import.meta.env.VITE_NVIDIA_API_KEY
  if (!apiKey || apiKey === 'your_nvidia_api_key_here') {
    console.warn('[generateCheckpoints] No NVIDIA API key — skipping AI generation.')
    return null
  }

  // Debug: confirm key is loaded (first 8 chars only)
  console.log('[generateCheckpoints] Key prefix:', apiKey.substring(0, 8))

  const currentTime = new Date().toISOString()
  const deadlineISO = deadlineDate.toISOString()

  const prompt = `You are an academic task planner. Generate a checkpoint plan for a student's task.

Task: ${taskTitle}
Type: ${taskType} (essay / problem_set / exam_prep)
Deadline: ${deadlineISO}
Notes: ${notes || 'None'}
Current time: ${currentTime}

Return ONLY a valid JSON array. No explanation, no markdown, no backticks. Just the raw JSON array.

Each checkpoint must have:
- "checkpoint_type": a short, specific action label tailored to the task title and notes above. For example, for a history essay comparing WWI and WWII causes, use labels like "Map Key Causes of WWI", "Draft Comparison Argument", "Refine Conclusion" — NOT generic labels like "Research", "First Draft", or "Second Draft"
- "checkpoint_number": integer starting at 1
- "due_date": ISO 8601 timestamp, spaced proportionally between now and the deadline
- "status": "pending"

Rules:
- 3-5 checkpoints maximum
- Checkpoint names MUST reflect the specific task title and notes — do not reuse generic stage names
- First checkpoint due within 24-48 hours of now
- Last checkpoint due at least 2 hours before the final deadline
- Space checkpoints proportionally across the available time
- due_dates must be between working hours 9AM-9PM
- If deadline is less than 24 hours away, return exactly 1 checkpoint due halfway between now and the deadline`

  try {
    // 20-second hard abort: if the model hasn't started responding, give up and
    // fall back to templates.  clearTimeout runs in the inner finally so the timer
    // is cancelled as soon as fetch settles (resolve or reject) — not 20s later.
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20_000)

    let response
    try {
      response = await fetch(NVIDIA_ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta/llama-3.1-8b-instruct', // fast 8B model, great at JSON
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 512,  // 3-5 checkpoints in JSON fits easily under 512 tokens
          stream: false,
        }),
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`NVIDIA API ${response.status}: ${errText}`)
    }

    const data = await response.json()
    const raw = data?.choices?.[0]?.message?.content?.trim()

    if (!raw) {
      throw new Error('Empty content in NVIDIA response')
    }

    // Strip any stray markdown fences the model may include
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    const parsed = JSON.parse(cleaned)

    // Basic structural validation
    if (
      !Array.isArray(parsed) ||
      parsed.length === 0 ||
      !parsed[0].checkpoint_type ||
      !parsed[0].due_date
    ) {
      console.warn('[generateCheckpoints] Unexpected response shape:', parsed)
      return null
    }

    // Normalise — enforce status:'pending', ensure checkpoint_number exists.
    // RULE: For major tasks (> 36h away), we fix the time to 17:00 (5 PM) for consistency.
    // SAFETY: After forcing 5 PM, we verify the result is still before the deadline.
    // For short-term tasks (< 36h), we trust the AI's proportional timing but STILL
    // verify the date is both in the future AND before the deadline.
    // HARD CLAMP: after all logic runs, a final guard ensures no checkpoint is ever
    // born at or past the deadline — regardless of what the AI or maths produces.
    const spanMs = deadlineDate.getTime() - new Date().getTime()
    const now = new Date()
    return parsed.map((cp, i) => {
      const rawAiDate = new Date(cp.due_date)
      let aiDate = new Date(cp.due_date)

      // Proportional slot helper: evenly spaces checkpoint i within [now, deadline)
      const proportionalSlot = () =>
        new Date(now.getTime() + (spanMs * (i + 1)) / (parsed.length + 1))

      if (spanMs > (36 * 60 * 60 * 1000)) {
        // Long-term task: Fix to 5 PM local time
        aiDate.setHours(17, 0, 0, 0)

        // Safety net: if forcing 5 PM pushes the date to/past the deadline, fall back.
        if (aiDate >= deadlineDate) {
          // Try the raw AI date first; if that's also bad, use a proportional slot.
          aiDate = (rawAiDate > now && rawAiDate < deadlineDate)
            ? rawAiDate
            : proportionalSlot()
        }
      } else {
        // Tight deadline (< 36 h): trust the AI's proportional timing, but verify
        // BOTH directions — the AI may return dates in the past OR after the deadline
        // (e.g. the model picks "working hours" on the deadline day ignoring the time).
        if (aiDate <= now || aiDate >= deadlineDate) {
          // Try the raw AI date if it's valid; otherwise use a proportional slot.
          aiDate = (rawAiDate > now && rawAiDate < deadlineDate)
            ? rawAiDate
            : proportionalSlot()
        }
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
