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

  const prompt = `You are an academic task planner. Generate a checkpoint plan for a student's task.

Task: ${taskTitle}
Type: ${taskType} (essay / problem_set / exam_prep)
Deadline: ${deadlineISO}
Notes: ${notes || 'None'}
Current time: ${currentTime}

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
        const h = aiDate.getHours()
        const startH = parseInt(workingHours.start, 10)
        if (startH <= endHour) {
          if (h < startH) aiDate.setHours(startH, 0, 0, 0)
          else if (h >= endHour) aiDate.setHours(endHour, 0, 0, 0)
        } else {
          // Night owl
          if (h >= endHour && h < startH) {
            if (h - endHour < startH - h) aiDate.setHours(endHour, 0, 0, 0)
            else aiDate.setHours(startH, 0, 0, 0)
          }
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
