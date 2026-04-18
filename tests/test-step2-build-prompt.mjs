/**
 * test-step2-build-prompt.mjs
 *
 * Step 2 test: verifies buildCheckpointPrompt is a pure function that
 * - Returns a string containing all task parameters
 * - Injects working hours into the rules section
 * - Uses the injected currentTimeISO (deterministic)
 * - Is no longer inlined in generateCheckpoints.js
 *
 * Run: node tests/test-step2-build-prompt.mjs
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { buildCheckpointPrompt } from '../src/utils/buildCheckpointPrompt.js'

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

console.log('\n── Step 2: buildCheckpointPrompt extraction ──────────────────')

// ── Test 1: Output contains all injected parameters ─────────────────────────
const FIXED_TIME = '2026-01-15T09:00:00.000Z'
const FIXED_DEADLINE = '2026-01-22T17:00:00.000Z'
const result = buildCheckpointPrompt(
  'Write a 3000-word history essay',
  'essay',
  FIXED_DEADLINE,
  'Focus on WWI and WWII causes',
  { start: 9, end: 21 },
  FIXED_TIME
)

assert(typeof result === 'string', 'Returns a string')
assert(result.length > 100, 'String is non-trivially long')
assert(result.includes('Write a 3000-word history essay'), 'Contains task title')
assert(result.includes('essay'), 'Contains task type')
assert(result.includes(FIXED_DEADLINE), 'Contains deadline ISO')
assert(result.includes('Focus on WWI and WWII causes'), 'Contains notes')
assert(result.includes(FIXED_TIME), 'Uses injected currentTimeISO (deterministic)')
assert(result.includes('9:00-21:00'), 'Contains working hours range')
assert(result.includes('JSON array'), 'Instructs model to return JSON array')

// ── Test 2: No notes falls back to 'None' ───────────────────────────────────
const noNotes = buildCheckpointPrompt('Task', 'exam_prep', FIXED_DEADLINE, '', { start: 8, end: 20 }, FIXED_TIME)
assert(noNotes.includes('Notes: None'), 'Empty notes renders as "None"')
assert(noNotes.includes('8:00-20:00'), 'Custom working hours injected correctly')

// ── Test 3: null notes also falls back to 'None' ────────────────────────────
const nullNotes = buildCheckpointPrompt('Task', 'problem_set', FIXED_DEADLINE, null, { start: 9, end: 21 }, FIXED_TIME)
assert(nullNotes.includes('Notes: None'), 'Null notes renders as "None"')

// ── Test 4: generateCheckpoints.js no longer contains the inline template ────
const genPath = path.join(root, 'src/utils/generateCheckpoints.js')
const genSource = readFileSync(genPath, 'utf8')
assert(
  genSource.includes("import { buildCheckpointPrompt }"),
  'generateCheckpoints.js imports buildCheckpointPrompt'
)
assert(
  !genSource.includes('You are an academic task planner'),
  'generateCheckpoints.js no longer contains the inline prompt string'
)
assert(
  genSource.includes('buildCheckpointPrompt('),
  'generateCheckpoints.js calls buildCheckpointPrompt()'
)

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\nResult: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
