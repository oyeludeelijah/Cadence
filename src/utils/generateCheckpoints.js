/**
 * generateCheckpoints.js
 *
 * Calls the NVIDIA NIM API (OpenAI-compatible endpoint) to generate a
 * checkpoint plan for a student task.  Uses deepseek-ai/deepseek-v3.2.
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
- "checkpoint_type": short label (e.g. "Thesis Statement", "First Draft", "Practice Problems")
- "checkpoint_number": integer starting at 1
- "due_date": ISO 8601 timestamp, spaced proportionally between now and the deadline
- "status": "pending"

Rules:
- 3-5 checkpoints maximum
- First checkpoint due within 24-48 hours of now
- Last checkpoint due at least 2 hours before the final deadline
- Space checkpoints proportionally across the available time
- due_dates must be between working hours 9AM-9PM
- If deadline is less than 24 hours away, return exactly 1 checkpoint due halfway between now and the deadline`

  try {
    // Hard 20-second timeout — if the model is slow, fall back to templates
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

    // Normalise — enforce status:'pending', ensure checkpoint_number exists,
    // and fix the time to 17:00 (5 PM) on the AI-chosen date.
    // The AI reliably picks correct dates but always repeats the same time of
    // day — we strip that and use a clean, consistent 5 PM deadline instead.
    return parsed.map((cp, i) => {
      const aiDate = new Date(cp.due_date)
      // Keep the AI's date (year / month / day), set time to 17:00 local time
      aiDate.setHours(17, 0, 0, 0)
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
