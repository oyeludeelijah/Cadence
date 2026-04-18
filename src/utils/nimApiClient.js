/**
 * nimApiClient.js
 *
 * Handles the HTTP transport layer for NVIDIA NIM API calls.
 * Extracted from generateCheckpoints.js so that:
 *  - The fetch/AbortController/timeout logic can be changed without touching
 *    prompt engineering or date normalisation
 *  - The client can be swapped for a different endpoint or provider without
 *    touching the orchestrator
 *
 * Model config is co-located here because it is HTTP-layer configuration —
 * changing the model or temperature is a transport concern, not a prompt concern.
 */

const NVIDIA_ENDPOINT = '/nvidia-api/chat/completions'

const MODEL_CONFIG = {
  model:       'meta/llama-3.1-8b-instruct', // fast 8B model, great at JSON
  temperature: 0.3,
  max_tokens:  512,  // 3-5 checkpoints in JSON fits easily under 512 tokens
  stream:      false,
}

const TIMEOUT_MS = 20_000 // 20-second hard abort

/**
 * Calls the NVIDIA NIM chat completions endpoint with the given prompt.
 *
 * @param {string} prompt  - The fully-formed user message string
 * @param {string} apiKey  - NVIDIA NIM API key (nvapi-…)
 *
 * @returns {Promise<Array>} Parsed JSON array of checkpoint objects
 * @throws  {Error}         On network failure, non-OK response, malformed JSON,
 *                          or a response that fails structural validation
 */
export async function callNim(prompt, apiKey) {
  const controller = new AbortController()
  const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let response
  try {
    response = await fetch(NVIDIA_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
      },
      body: JSON.stringify({
        ...MODEL_CONFIG,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
  } finally {
    // Cancel the abort timer as soon as fetch settles (resolve or reject),
    // not 20 seconds later — prevents the timer from firing after we've moved on
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`NVIDIA API ${response.status}: ${errText}`)
  }

  const data = await response.json()
  const raw  = data?.choices?.[0]?.message?.content?.trim()

  if (!raw) {
    throw new Error('Empty content in NVIDIA response')
  }

  // Strip any stray markdown fences the model may include despite instructions
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  const parsed = JSON.parse(cleaned)

  // Basic structural validation — bail early rather than letting malformed data
  // propagate to the normalisation layer
  if (
    !Array.isArray(parsed) ||
    parsed.length === 0    ||
    !parsed[0].checkpoint_type ||
    !parsed[0].due_date
  ) {
    throw new Error(`Unexpected response shape from NIM: ${JSON.stringify(parsed).slice(0, 200)}`)
  }

  return parsed
}
