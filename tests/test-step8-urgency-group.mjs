/**
 * test-step8-urgency-group.mjs
 *
 * Step 8 test: verifies UrgencyGroup.jsx was created and TaskListPage.jsx imports it.
 *
 * Run: node tests/test-step8-urgency-group.mjs
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

console.log('\n── Step 8: UrgencyGroup extraction ────────────────────────────')

// ── Source checks ───────────────
const tlpSource = readFileSync(path.join(root, 'src/pages/TaskListPage.jsx'), 'utf8')
const ugSource  = readFileSync(path.join(root, 'src/components/UrgencyGroup.jsx'), 'utf8')

assert(
  ugSource.includes("export default function UrgencyGroup"),
  'UrgencyGroup.jsx exports UrgencyGroup component'
)
assert(
  ugSource.includes("useReveal"),
  'UrgencyGroup.jsx imports useReveal'
)
assert(
  ugSource.includes("import TaskCard from './TaskCard'"),
  'UrgencyGroup.jsx imports TaskCard'
)
assert(
  tlpSource.includes("import UrgencyGroup from '../components/UrgencyGroup'"),
  'TaskListPage.jsx imports UrgencyGroup'
)
assert(
  !tlpSource.includes("function UrgencyGroup({"),
  'TaskListPage.jsx no longer defines UrgencyGroup locally'
)

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\nResult: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
