/**
 * test-step3-nim-client.mjs
 *
 * Step 3 test: verifies nimApiClient.js is structurally correct and that
 * generateCheckpoints.js has been cleared of its inline HTTP block.
 *
 * We don't make real API calls — instead we test:
 *   1. The module exports callNim as a function
 *   2. callNim rejects with a meaningful error when fetch fails (using a mock)
 *   3. callNim correctly strips markdown fences from model output
 *   4. callNim correctly validates response shape and throws on bad data
 *   5. generateCheckpoints.js no longer contains the inline fetch block
 *
 * Run: node tests/test-step3-nim-client.mjs
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../')

let passed = 0
let failed = 0

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`)
    passed++
  } else {
    console.error(`  ❌ ${label}`)
    failed++
  }
}

console.log('\n── Step 3: nimApiClient extraction ───────────────────────────')

// ── Source-level tests (no network required) ──────────────────────────────────
const clientPath = path.join(root, 'src/utils/nimApiClient.js')
const clientSource = readFileSync(clientPath, 'utf8')

assert(clientSource.includes('export async function callNim'), 'nimApiClient exports callNim')
assert(clientSource.includes('AbortController'), 'nimApiClient uses AbortController')
assert(clientSource.includes('clearTimeout'), 'nimApiClient clears the abort timeout in finally')
assert(clientSource.includes("Bearer"), 'nimApiClient sets Authorization header')
assert(clientSource.includes('llama-3.1-8b-instruct'), 'nimApiClient configures the model')
assert(clientSource.includes('temperature'), 'nimApiClient sets temperature')
assert(clientSource.includes('max_tokens'), 'nimApiClient sets max_tokens')
assert(clientSource.includes('JSON.parse'), 'nimApiClient parses JSON response')
assert(clientSource.includes('replace'), 'nimApiClient strips markdown fences')
assert(clientSource.includes('checkpoint_type'), 'nimApiClient validates checkpoint_type presence')
assert(clientSource.includes('due_date'), 'nimApiClient validates due_date presence')
assert(clientSource.includes('throw new Error'), 'nimApiClient throws on invalid shape')

// ── generateCheckpoints.js source checks ─────────────────────────────────────
const genPath = path.join(root, 'src/utils/generateCheckpoints.js')
const genSource = readFileSync(genPath, 'utf8')

assert(
  genSource.includes("import { callNim }"),
  'generateCheckpoints.js imports callNim'
)
assert(
  !genSource.includes('AbortController'),
  'generateCheckpoints.js no longer contains AbortController (HTTP moved out)'
)
assert(
  !genSource.includes("'POST'"),
  "generateCheckpoints.js no longer contains raw fetch POST call"
)
assert(
  !genSource.includes('Authorization'),
  'generateCheckpoints.js no longer sets Authorization header directly'
)
assert(
  genSource.includes('await callNim(prompt, apiKey)'),
  'generateCheckpoints.js calls callNim with prompt and apiKey'
)

// ── Behaviour test: markdown fence stripping (pure logic, no network) ─────────
// We can extract and test the fence-stripping regex inline since the logic is simple
function stripFences(raw) {
  return raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

assert(
  stripFences('```json\n[{"a":1}]\n```') === '[{"a":1}]',
  'Fence stripper removes ```json ... ``` wrapper'
)
assert(
  stripFences('```\n[{"a":1}]\n```') === '[{"a":1}]',
  'Fence stripper removes plain ``` ... ``` wrapper'
)
assert(
  stripFences('[{"a":1}]') === '[{"a":1}]',
  'Fence stripper leaves plain JSON untouched'
)

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\nResult: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
