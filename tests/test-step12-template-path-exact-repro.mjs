/**
 * test-step12-template-path-exact-repro.mjs
 *
 * Reproduces the exact reported bug through the TEMPLATE code path:
 *   - Task deadline: Mon 19 Oct 2026 11:15 AM (Africa/Lagos, UTC+1 -> 10:15 UTC)
 *   - Created about: Mon 12 Oct 2026 11:15 AM (Africa/Lagos, UTC+1 -> 10:15 UTC)
 *   - Template: 'essay'
 *       CP1 (0.25): Wed 14 Oct 09:00
 *       CP2 (0.50): Thu 15 Oct 21:00
 *       CP3 (0.75): Sat 17 Oct 17:15
 *       CP4 (1.00): Thu 15 Oct 23:15 <-- BUG: 50% midpoint fallback because rawDate == deadline
 *                   failed the strict `< deadline` guard!
 *
 * Run: node tests/test-step12-template-path-exact-repro.mjs
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { clampToWorkingHours, validateAndRepairDueDates } from '../src/utils/normaliseDueDates.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../')
const ctSource = readFileSync(path.join(root, 'src/components/CreateTask.jsx'), 'utf8')

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

console.log('\n── Step 12: Template Path Exact Bug Reproduction ────────────────')

// Extract the live adjustToWorkingHours function directly from CreateTask.jsx source
const fnMatch = ctSource.match(/function adjustToWorkingHours\(([\s\S]*?)\)\s*\{([\s\S]*?\n  \})/m)
if (!fnMatch) {
  console.error('Could not extract adjustToWorkingHours from CreateTask.jsx')
  process.exit(1)
}

const user = { user_metadata: { working_hours: { start: 9, end: 21 } } }
const extractFn = new Function(
  'clampToWorkingHours',
  'user',
  `return ${fnMatch[0]}`
)
const liveAdjustToWorkingHours = extractFn(clampToWorkingHours, user)

// Exact test inputs matching bug report
const now = new Date('2026-10-12T10:15:34.000Z') // Mon 12 Oct 11:15:34 Lagos (UTC+1)
const deadline = new Date('2026-10-19T10:15:00.000Z') // Mon 19 Oct 11:15:00 Lagos (UTC+1)
const spanMs = deadline.getTime() - now.getTime()

const templateCheckpointSequence = [
  { type: 'Thesis Statement', percentage_of_time: 0.25 },
  { type: 'Outline',          percentage_of_time: 0.50 },
  { type: 'First Draft',      percentage_of_time: 0.75 },
  { type: 'Final Version',    percentage_of_time: 1.00 },
]

// Simulate the template map in CreateTask.jsx
const checkpoints = templateCheckpointSequence.map((cp, i) => {
  const rawDate = new Date(now.getTime() + spanMs * cp.percentage_of_time)
  const adjusted = liveAdjustToWorkingHours(rawDate, deadline, spanMs)
  return {
    checkpoint_number: i + 1,
    checkpoint_type: cp.type,
    due_date: adjusted.toISOString(),
  }
})

console.log('Generated Checkpoints from CreateTask.jsx template path:')
checkpoints.forEach((cp, idx) => {
  const d = new Date(cp.due_date)
  const lagosHour = d.getUTCHours() + 1
  const lagosMin = String(d.getUTCMinutes()).padStart(2, '0')
  console.log(`  CP${idx + 1} (${cp.checkpoint_type}): ${cp.due_date} -> Lagos time: ${d.toISOString().slice(0, 10)} ${lagosHour}:${lagosMin}`)
})

const cp3Ms = new Date(checkpoints[2].due_date).getTime()
const cp4Ms = new Date(checkpoints[3].due_date).getTime()

// Assertions that must pass when the fix is in place:
// 1. CP4 must be scheduled AFTER CP3
assert(cp4Ms > cp3Ms, 'CP4 is strictly after CP3 (monotonic ordering)')

// 2. CP4 must not hit the 50% midpoint fallback (Thu 15 Oct)
const midpointMs = now.getTime() + spanMs / 2
const diffFromMidpointHours = Math.abs(cp4Ms - midpointMs) / (1000 * 60 * 60)
assert(diffFromMidpointHours > 24, 'CP4 did not collapse into 50% midpoint fallback')

// 3. CP4 should match or be at/before the final deadline
assert(cp4Ms <= deadline.getTime(), 'CP4 is at or before deadline')

// 4. CP4 should be on the deadline date (Mon 19 Oct)
const cp4DateStr = new Date(cp4Ms).toISOString().slice(0, 10)
assert(cp4DateStr === '2026-10-19', 'CP4 is scheduled on deadline day (Mon 19 Oct), not Thu 15 Oct')

// 5. Source check: CreateTask.jsx must import and use validateAndRepairDueDates
assert(
  ctSource.includes('validateAndRepairDueDates'),
  'CreateTask.jsx calls validateAndRepairDueDates on template output'
)

console.log(`\nResult: ${passed} passed, ${failed} failed\n`)
if (failed > 0) {
  process.exit(1)
}
