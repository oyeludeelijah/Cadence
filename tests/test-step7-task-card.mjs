/**
 * test-step7-task-card.mjs
 *
 * Step 7 test: verifies TaskCard.jsx was created and TaskListPage.jsx imports it.
 *
 * Run: node tests/test-step7-task-card.mjs
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

console.log('\n── Step 7: TaskCard extraction ────────────────────────────────')

// ── Source checks ───────────────
const tlpSource = readFileSync(path.join(root, 'src/pages/TaskListPage.jsx'), 'utf8')
const tcSource  = readFileSync(path.join(root, 'src/components/TaskCard.jsx'), 'utf8')

assert(
  tcSource.includes("export default function TaskCard"),
  'TaskCard.jsx exports TaskCard component'
)
assert(
  tcSource.includes("useReveal"),
  'TaskCard.jsx imports useReveal'
)
assert(
  tcSource.includes("getCheckpointStatus"),
  'TaskCard.jsx imports checkpoint helpers'
)
assert(
  tlpSource.includes("import TaskCard from '../components/TaskCard'"),
  'TaskListPage.jsx imports TaskCard'
)
assert(
  !tlpSource.includes("function TaskCard({"),
  'TaskListPage.jsx no longer defines TaskCard locally'
)

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\nResult: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
