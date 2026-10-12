/**
 * test-step13-boundary-deadlines.mjs
 *
 * Tests Essay task checkpoint generation under boundary deadline times:
 *   1. 11:00 PM Africa/Lagos (outside evening boundary):
 *      - CP4 lands at 9:00 PM (21:00) on deadline day.
 *      - Within working hours (9 AM - 9 PM), on or before deadline.
 *
 *   2. 6:00 AM Africa/Lagos (outside morning boundary):
 *      - Clamping up to 9:00 AM would exceed the 6:00 AM deadline.
 *      - The fix rolls back CP4 to the latest valid working-hours slot
 *        on or before the deadline: 9:00 PM (21:00) on the previous day.
 *      - Within working hours (9 AM - 9 PM), on or before deadline.
 *
 * Run: node tests/test-step13-boundary-deadlines.mjs
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

console.log('\n── Step 13: Boundary Deadlines (11:00 PM & 6:00 AM Lagos) ────────')

// Extract adjustToWorkingHours from CreateTask.jsx source
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
const adjustToWorkingHours = extractFn(clampToWorkingHours, user)

const templateSequence = [
  { type: 'Thesis Statement', percentage_of_time: 0.25 },
  { type: 'Outline',          percentage_of_time: 0.50 },
  { type: 'First Draft',      percentage_of_time: 0.75 },
  { type: 'Final Version',    percentage_of_time: 1.00 },
]

function generateTemplateCheckpoints(now, deadline) {
  const spanMs = deadline.getTime() - now.getTime()
  const generated = templateSequence.map((cp, i) => {
    const rawDate = new Date(now.getTime() + spanMs * cp.percentage_of_time)
    const adjusted = adjustToWorkingHours(rawDate, deadline, spanMs)
    return {
      checkpoint_number: i + 1,
      checkpoint_type: cp.type,
      due_date: adjusted.toISOString(),
    }
  })
  return validateAndRepairDueDates(generated, now, deadline, user.user_metadata.working_hours)
}

// ── Case 1: Deadline at 11:00 PM Lagos (22:00 UTC) ─────────────────────────────
console.log('\nCase 1: Deadline Mon 19 Oct 11:00 PM Lagos (22:00 UTC)')
{
  const now = new Date('2026-10-12T10:00:00.000Z') // Mon 12 Oct 11:00 AM Lagos
  const deadline = new Date('2026-10-19T22:00:00.000Z') // Mon 19 Oct 11:00 PM Lagos
  const checkpoints = generateTemplateCheckpoints(now, deadline)

  const cp4 = new Date(checkpoints[3].due_date)
  const lagosHour = cp4.getUTCHours() + 1
  const lagosDate = cp4.toISOString().slice(0, 10)

  console.log(`  CP4 Due Date: ${checkpoints[3].due_date} (Lagos: ${lagosDate} ${lagosHour}:00)`)

  // Checkpoint 4 lands at 9:00 PM (21:00) on the deadline day
  assert(lagosDate === '2026-10-19', '11pm: CP4 is on deadline day (Mon 19 Oct)')
  assert(lagosHour === 21, '11pm: CP4 lands at 9:00 PM Lagos (21:00)')
  assert(
    lagosHour >= 9 && lagosHour <= 21,
    '11pm: CP4 does NOT break working-hours rule (between 9 AM and 9 PM)'
  )
  assert(cp4.getTime() <= deadline.getTime(), '11pm: CP4 is on or before deadline')

  // Monotonic ordering
  for (let i = 1; i < checkpoints.length; i++) {
    const prev = new Date(checkpoints[i - 1].due_date).getTime()
    const curr = new Date(checkpoints[i].due_date).getTime()
    assert(curr > prev, `11pm: CP${i + 1} is strictly after CP${i}`)
  }
}

// ── Case 2: Deadline at 6:00 AM Lagos (05:00 UTC) ──────────────────────────────
console.log('\nCase 2: Deadline Mon 19 Oct 6:00 AM Lagos (05:00 UTC)')
{
  const now = new Date('2026-10-12T05:00:00.000Z') // Mon 12 Oct 6:00 AM Lagos
  const deadline = new Date('2026-10-19T05:00:00.000Z') // Mon 19 Oct 6:00 AM Lagos
  const checkpoints = generateTemplateCheckpoints(now, deadline)

  const cp4 = new Date(checkpoints[3].due_date)
  const lagosHour = cp4.getUTCHours() + 1
  const lagosDate = cp4.toISOString().slice(0, 10)

  console.log(`  CP4 Due Date: ${checkpoints[3].due_date} (Lagos: ${lagosDate} ${lagosHour}:00)`)

  // Checkpoint 4 rolls back to previous day at 9:00 PM (21:00)
  assert(lagosDate === '2026-10-18', '6am: CP4 rolls back to previous day (Sun 18 Oct)')
  assert(lagosHour === 21, '6am: CP4 lands at latest valid working-hours slot (9:00 PM Lagos / 21:00)')
  assert(
    lagosHour >= 9 && lagosHour <= 21,
    '6am: CP4 does NOT break working-hours rule (between 9 AM and 9 PM)'
  )
  assert(cp4.getTime() <= deadline.getTime(), '6am: CP4 is on or before deadline')

  // Monotonic ordering
  for (let i = 1; i < checkpoints.length; i++) {
    const prev = new Date(checkpoints[i - 1].due_date).getTime()
    const curr = new Date(checkpoints[i].due_date).getTime()
    assert(curr > prev, `6am: CP${i + 1} is strictly after CP${i}`)
  }
}

console.log(`\nResult: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
