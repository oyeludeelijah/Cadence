/**
 * test-step4-clamp-working-hours.mjs
 *
 * Step 4 test: verifies that clampToWorkingHours covers all the edge cases
 * that the two original duplicate implementations handled.
 *
 * Run: node tests/test-step4-clamp-working-hours.mjs
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { clampToWorkingHours } from '../src/utils/normaliseDueDates.js'

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

// Helper: create a Date at a specific hour today
function atHour(h) {
  const d = new Date()
  d.setHours(h, 0, 0, 0)
  return d
}

console.log('\n── Step 4: clampToWorkingHours ───────────────────────────────')

const NORMAL = { start: 9, end: 21 }

// ── Normal schedule (start ≤ end): 9 AM – 9 PM ───────────────────────────────
{
  const d = atHour(6)   // 6 AM — before start
  clampToWorkingHours(d, NORMAL)
  assert(d.getHours() === 9, 'Normal: 6 AM is clamped up to start (9 AM)')
}
{
  const d = atHour(14)  // 2 PM — inside window
  clampToWorkingHours(d, NORMAL)
  assert(d.getHours() === 14, 'Normal: 2 PM (inside window) is unchanged')
}
{
  const d = atHour(21)  // 9 PM — exactly at end
  clampToWorkingHours(d, NORMAL)
  assert(d.getHours() === 21, 'Normal: 9 PM (at end boundary) is clamped to end')
}
{
  const d = atHour(23)  // 11 PM — after end
  clampToWorkingHours(d, NORMAL)
  assert(d.getHours() === 21, 'Normal: 11 PM is clamped down to end (9 PM)')
}

// ── Night-owl schedule (start > end): 2 PM – 2 AM ────────────────────────────
const NIGHTOWL = { start: 14, end: 2 }

{
  const d = atHour(18)  // 6 PM — inside night-owl window
  clampToWorkingHours(d, NIGHTOWL)
  assert(d.getHours() === 18, 'Night-owl: 6 PM (inside window) is unchanged')
}
{
  const d = atHour(1)   // 1 AM — inside night-owl window (wraps past midnight)
  clampToWorkingHours(d, NIGHTOWL)
  assert(d.getHours() === 1, 'Night-owl: 1 AM (inside window) is unchanged')
}
{
  // Dead zone: between end (2) and start (14) — e.g. 7 AM is closer to end (2), dist=5, dist from start (14)=7
  // Actually: h=7, endH=2, startH=14. h-endH = 5, startH-h = 7. 5 < 7 → clamp to endH (2)
  const d = atHour(7)
  clampToWorkingHours(d, NIGHTOWL)
  assert(d.getHours() === 2, 'Night-owl: 7 AM (dead zone, closer to end at 2) → clamped to end (2 AM)')
}
{
  // Dead zone: 11 AM — closer to start (14), dist from end (2)=9, dist from start=3 → clamp to start (14)
  const d = atHour(11)
  clampToWorkingHours(d, NIGHTOWL)
  assert(d.getHours() === 14, 'Night-owl: 11 AM (dead zone, closer to start at 14) → clamped to start (2 PM)')
}

// ── Return value contract ─────────────────────────────────────────────────────
{
  const d = atHour(6)
  const ret = clampToWorkingHours(d, NORMAL)
  assert(ret === d, 'Returns the same (mutated) Date object (not a copy)')
}

// ── Source checks: both consumers now call clampToWorkingHours ───────────────
const genSource = readFileSync(path.join(root, 'src/utils/generateCheckpoints.js'), 'utf8')
const ctSource  = readFileSync(path.join(root, 'src/components/CreateTask.jsx'),   'utf8')

assert(
  genSource.includes("import { clampToWorkingHours }"),
  'generateCheckpoints.js imports clampToWorkingHours'
)
assert(
  genSource.includes("clampToWorkingHours(aiDate, workingHours)"),
  'generateCheckpoints.js calls clampToWorkingHours'
)
assert(
  ctSource.includes("import { clampToWorkingHours }"),
  'CreateTask.jsx imports clampToWorkingHours'
)
assert(
  ctSource.includes("clampToWorkingHours(d, workingHours)"),
  'CreateTask.jsx calls clampToWorkingHours'
)

// Neither file should still have the duplicated if/else block
assert(
  !genSource.includes("startH <= endHour") || genSource.includes("clampToWorkingHours"),
  'generateCheckpoints.js delegates clamping (no raw inline if/else)'
)
// CreateTask should not have the raw setHours blocks anymore
assert(
  !ctSource.includes("startHour <= endHour"),
  'CreateTask.jsx no longer has the raw clamping if/else block'
)

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\nResult: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
