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

// NIM can be slow (observed ~26s latency in testing). Allow 45s per attempt.
const TIMEOUT_MS  = 45_000

// Retry config — exponential backoff with jitter
const MAX_RETRIES           = 3
const BASE_BACKOFF_MS       = 1_000  // first retry waits ~1s
const MAX_BACKOFF_MS        = 12_000 // cap at 12s
const MAX_TOTAL_BUDGET_MS   = 100_000 // bail if total time exceeds 100s

// HTTP status codes that are transient and worth retrying
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504])

/** Sleep for `ms` milliseconds */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Computes backoff delay for attempt `n` (0-indexed) with ±20% jitter.
 */
function backoffMs(attempt) {
  const base   = BASE_BACKOFF_MS * Math.pow(2, attempt)
  const jitter = base * 0.2 * (Math.random() * 2 - 1) // ±20%
  return Math.min(base + jitter, MAX_BACKOFF_MS)
}

/**
 * Helper to classify latency into thresholds for monitoring
 */
function classifyLatency(durationMs) {
  if (durationMs > 25000) return 'VERY SLOW'
  if (durationMs > 15000) return 'DEGRADED'
  if (durationMs > 8000)  return 'WARNING'
  return 'HEALTHY'
}

/**
 * Performs one HTTP attempt to the NVIDIA NIM endpoint.
 * Returns the raw Response object. Throws on network-level errors.
 */
async function attemptFetch(prompt, apiKey) {
  const controller = new AbortController()
  const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    return await fetch(NVIDIA_ENDPOINT, {
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
    clearTimeout(timeoutId)
  }
}

/**
 * Calls the NVIDIA NIM chat completions endpoint with retry + exponential backoff.
 *
 * @param {string} prompt  - The fully-formed user message string
 * @param {string} apiKey  - NVIDIA NIM API key (nvapi-…)
 *
 * @returns {Promise<Array>} Parsed JSON array of checkpoint objects
 * @throws  {Error}         On permanent failure, exhausted retries, malformed JSON,
 *                          or a response that fails structural validation
 */
export async function callNim(prompt, apiKey) {
  let lastError
  const startTime = Date.now()

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const elapsedTotal = Date.now() - startTime
    
    if (elapsedTotal > MAX_TOTAL_BUDGET_MS) {
      console.warn(`[nimApiClient] Total time budget (${MAX_TOTAL_BUDGET_MS}ms) exceeded. Bailing.`)
      throw lastError ?? new Error('NVIDIA NIM: Total time budget exceeded')
    }

    if (attempt > 0) {
      const delay = backoffMs(attempt - 1)
      console.log(`[nimApiClient] Retry ${attempt}/${MAX_RETRIES - 1} after ${Math.round(delay)}ms… (Total elapsed: ${elapsedTotal}ms)`)
      await sleep(delay)
    }

    let response
    const attemptStart = Date.now()
    
    try {
      response = await attemptFetch(prompt, apiKey)
    } catch (networkErr) {
      const attemptDuration = Date.now() - attemptStart
      lastError = networkErr
      
      console.error(JSON.stringify({
        event: 'ai_request_failed',
        timestamp: new Date().toISOString(),
        attempt: attempt + 1,
        latency_ms: attemptDuration,
        health: classifyLatency(attemptDuration),
        error: networkErr.message,
        prompt_length_chars: prompt.length
      }))
      continue
    }

    const attemptDuration = Date.now() - attemptStart

    // Non-retryable HTTP errors (auth, bad request) — fail immediately
    if (!response.ok && !RETRYABLE_STATUSES.has(response.status)) {
      const errText = await response.text()
      throw new Error(`NVIDIA API ${response.status} (non-retryable): ${errText}`)
    }

    if (!response.ok) {
      const errText = await response.text()
      lastError = new Error(`NVIDIA API ${response.status}: ${errText}`)
      
      console.warn(JSON.stringify({
        event: 'ai_request_retryable_error',
        timestamp: new Date().toISOString(),
        attempt: attempt + 1,
        status: response.status,
        latency_ms: attemptDuration,
        health: classifyLatency(attemptDuration),
        error: lastError.message,
        prompt_length_chars: prompt.length
      }))
      continue
    }

    // ── Success path ─────────────────────────────────────────────────────────
    const data = await response.json()
    const raw  = data?.choices?.[0]?.message?.content?.trim()
    const usage = data?.usage || {}

    console.info(JSON.stringify({
      event: 'ai_request_success',
      timestamp: new Date().toISOString(),
      attempt: attempt + 1,
      status: 200,
      latency_ms: attemptDuration,
      total_elapsed_ms: Date.now() - startTime,
      health: classifyLatency(attemptDuration),
      tokens: {
        prompt: usage.prompt_tokens,
        completion: usage.completion_tokens,
        total: usage.total_tokens
      }
    }, null, 2))
    
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

  // All attempts exhausted
  throw lastError ?? new Error('NVIDIA NIM: all retry attempts failed')
}
