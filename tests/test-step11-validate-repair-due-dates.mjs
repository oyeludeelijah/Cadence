/**
 * test-step11-validate-repair-due-dates.mjs
 *
 * Tests for validateAndRepairDueDates — the post-generation monotonic validator —
 * and for the exact real-world bug reported:
 *   Task deadline: Mon 19 Oct 2026, 11:15 AM (Africa/Lagos, UTC+1)
 *   Checkpoint 4 ("Final Version") came back as Thu 15 Oct — before checkpoint 3
 *   (Sat 17 Oct) and before the deadline.
 *
 * Run: node tests/test-step11-validate-repair-due-dates.mjs
 */

import { validateAndRepairDueDates, clampToWorkingHours } from '../src/utils/normaliseDueDates.js'

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

const WORKING_HOURS = { start: 9, end: 21 }

// ── Helper ────────────────────────────────────────────────────────────────────
function makeCheckpoint(n, isoDate) {
  return {
    checkpoint_type:   `Step ${n}`,
    rationale:         null,
    checkpoint_number: n,
    due_date:          isoDate,
    status:            'pending',
  }
}

console.log('\n── Step 11a: validateAndRepairDueDates — valid list (no-op) ──────')
{
  // All dates in order and within bounds — function must return them unchanged
  const now      = new Date('2026-10-12T08:00:00.000Z') // Mon 12 Oct 08:00 UTC
  const deadline = new Date('2026-10-19T10:15:00.000Z') // Mon 19 Oct 10:15 UTC (= 11:15 Lagos)

  const cps = [
    makeCheckpoint(1, '2026-10-14T08:00:00.000Z'), // Wed 14 Oct 09:00 Lagos
    makeCheckpoint(2, '2026-10-15T20:00:00.000Z'), // Thu 15 Oct 21:00 Lagos
    makeCheckpoint(3, '2026-10-17T16:15:00.000Z'), // Sat 17 Oct 17:15 Lagos
    makeCheckpoint(4, '2026-10-18T19:00:00.000Z'), // Sun 18 Oct 20:00 Lagos
  ]

  const result = validateAndRepairDueDates(cps, now, deadline, WORKING_HOURS)
  assert(result === cps, 'Returns the same array reference when already valid')
  assert(result.length === 4, 'Length is preserved')
  assert(result[0].due_date === cps[0].due_date, 'CP1 date unchanged')
  assert(result[3].due_date === cps[3].due_date, 'CP4 date unchanged')
}

console.log('\n── Step 11b: validateAndRepairDueDates — EXACT BUG REPRODUCTION ──')
{
  // Real data from the bug report (stored as UTC; user is UTC+1 Africa/Lagos)
  // Deadline: 2026-10-19T10:15:00Z (= 11:15 Lagos)
  // CP4 "Final Version" came back as 2026-10-15T22:15:00Z (= 15 Oct 23:15 Lagos)
  // which is BEFORE CP3 "First Draft" at 2026-10-17T16:15:00Z (= 17 Oct 17:15 Lagos)
  const now      = new Date('2026-10-12T08:00:00.000Z')
  const deadline = new Date('2026-10-19T10:15:00.000Z')

  const bugCps = [
    makeCheckpoint(1, '2026-10-14T08:00:00.000Z'), // OK — Wed 14 Oct
    makeCheckpoint(2, '2026-10-15T20:00:00.000Z'), // OK — Thu 15 Oct
    makeCheckpoint(3, '2026-10-17T16:15:00.000Z'), // OK — Sat 17 Oct
    makeCheckpoint(4, '2026-10-15T22:15:00.000Z'), // BUG — Thu 15 Oct (before CP3!)
  ]

  const result = validateAndRepairDueDates(bugCps, now, deadline, WORKING_HOURS)

  // After repair: all dates must be strictly increasing
  for (let i = 1; i < result.length; i++) {
    const prev = new Date(result[i - 1].due_date).getTime()
    const curr = new Date(result[i].due_date).getTime()
    assert(curr > prev, `CP${i + 1} is strictly after CP${i} after repair`)
  }

  // All must be before the deadline
  for (let i = 0; i < result.length; i++) {
    const ms = new Date(result[i].due_date).getTime()
    assert(ms < deadline.getTime(), `CP${i + 1} is before deadline after repair`)
  }

  // All must be after now
  for (let i = 0; i < result.length; i++) {
    const ms = new Date(result[i].due_date).getTime()
    assert(ms > now.getTime(), `CP${i + 1} is after now after repair`)
  }

  // Metadata must be preserved
  assert(result[3].checkpoint_type === 'Step 4', 'CP4 checkpoint_type preserved')
  assert(result[3].checkpoint_number === 4,       'CP4 checkpoint_number preserved')

  // Times should fall within working hours (span is > 24h here)
  for (let i = 0; i < result.length; i++) {
    const h = new Date(result[i].due_date).getUTCHours() + 1 // UTC+1 Lagos
    assert(
      h >= WORKING_HOURS.start && h < WORKING_HOURS.end,
      `CP${i + 1} time (${h}:00 Lagos) within working hours after repair`
    )
  }
}

console.log('\n── Step 11c: Edge cases ──────────────────────────────────────────')
{
  // Single checkpoint — must always pass as-is if valid
  const now      = new Date('2026-10-12T08:00:00.000Z')
  const deadline = new Date('2026-10-19T10:15:00.000Z')
  const single   = [makeCheckpoint(1, '2026-10-15T15:00:00.000Z')]
  const result   = validateAndRepairDueDates(single, now, deadline, WORKING_HOURS)
  assert(result === single, 'Single valid checkpoint: same array returned (no-op)')
}
{
  // NaN date — must trigger repair
  const now      = new Date('2026-10-12T08:00:00.000Z')
  const deadline = new Date('2026-10-19T10:15:00.000Z')
  const nanCps   = [
    makeCheckpoint(1, '2026-10-14T08:00:00.000Z'),
    makeCheckpoint(2, 'not-a-date'),
  ]
  const result = validateAndRepairDueDates(nanCps, now, deadline, WORKING_HOURS)
  for (let i = 0; i < result.length; i++) {
    assert(!isNaN(new Date(result[i].due_date).getTime()), `CP${i + 1} is a valid date after NaN repair`)
  }
}
{
  // Deadline < 24h away — working hours should NOT be forced
  const now      = new Date('2026-10-12T08:00:00.000Z')
  const deadline = new Date('2026-10-12T20:00:00.000Z') // 12h span

  // Make CP1 date land before CP2 to force a repair
  const urgentCps = [
    makeCheckpoint(1, '2026-10-12T14:00:00.000Z'),
    makeCheckpoint(2, '2026-10-12T12:00:00.000Z'), // deliberately out of order
  ]
  const result = validateAndRepairDueDates(urgentCps, now, deadline, WORKING_HOURS)
  const cp1ms = new Date(result[0].due_date).getTime()
  const cp2ms = new Date(result[1].due_date).getTime()
  assert(cp2ms > cp1ms,                 'Urgent: CP2 is after CP1 after repair')
  assert(cp2ms < deadline.getTime(),    'Urgent: CP2 is before deadline')
}
{
  // Empty list — must return without error
  const now      = new Date()
  const deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const result   = validateAndRepairDueDates([], now, deadline, WORKING_HOURS)
  assert(Array.isArray(result) && result.length === 0, 'Empty list returned as-is')
}

// ── Source-code sanity: generateCheckpoints must call validateAndRepairDueDates
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const genSource = readFileSync(path.join(__dirname, '../src/utils/generateCheckpoints.js'), 'utf8')

console.log('\n── Step 11d: Source-level checks ─────────────────────────────────')
assert(
  genSource.includes('validateAndRepairDueDates'),
  'generateCheckpoints.js calls validateAndRepairDueDates'
)
assert(
  genSource.includes('rawCheckpoints.length'),
  'generateCheckpoints.js uses rawCheckpoints.length (not parsed.length)'
)
// Check that no live code (outside comments) uses parsed.length.
// Strip single-line comments first, then verify the operative code doesn't reference it.
const genSourceNoComments = genSource.replace(/\/\/[^\n]*/g, '')
assert(
  !genSourceNoComments.includes('parsed.length'),
  'generateCheckpoints.js no live code references parsed.length'
)

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\nResult: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
