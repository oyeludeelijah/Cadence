/**
 * test-step10-checkpoint-card.mjs
 *
 * Step 10 test: verifies CheckpointCard.jsx was created and TaskDetailPage.jsx imports it.
 *
 * Run: node tests/test-step10-checkpoint-card.mjs
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

console.log('\n── Step 10: CheckpointCard extraction ──────────────────────────')

// ── Source checks ───────────────
const tdpSource = readFileSync(path.join(root, 'src/pages/TaskDetailPage.jsx'), 'utf8')
const ccSource  = readFileSync(path.join(root, 'src/components/CheckpointCard.jsx'), 'utf8')

assert(
  ccSource.includes("export default function CheckpointCard"),
  'CheckpointCard.jsx exports CheckpointCard component'
)
assert(
  ccSource.includes("getCheckpointStatus"),
  'CheckpointCard.jsx imports checkpoint helpers'
)
assert(
  tdpSource.includes("import CheckpointCard from '../components/CheckpointCard'"),
  'TaskDetailPage.jsx imports CheckpointCard'
)
assert(
  !tdpSource.includes("function CheckpointCard({"),
  'TaskDetailPage.jsx no longer defines CheckpointCard locally'
)

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\nResult: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
