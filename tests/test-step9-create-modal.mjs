/**
 * test-step9-create-modal.mjs
 *
 * Step 9 test: verifies CreateModalPanel.jsx was created and TaskListPage.jsx imports it.
 *
 * Run: node tests/test-step9-create-modal.mjs
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

console.log('\n── Step 9: CreateModalPanel extraction ────────────────────────')

// ── Source checks ───────────────
const tlpSource = readFileSync(path.join(root, 'src/pages/TaskListPage.jsx'), 'utf8')
const mpSource  = readFileSync(path.join(root, 'src/components/CreateModalPanel.jsx'), 'utf8')

assert(
  mpSource.includes("export default function CreateModalPanel"),
  'CreateModalPanel.jsx exports CreateModalPanel component'
)
assert(
  mpSource.includes("useModalAnimation"),
  'CreateModalPanel.jsx imports useModalAnimation'
)
assert(
  mpSource.includes("import CreateTask from './CreateTask'"),
  'CreateModalPanel.jsx imports CreateTask'
)
assert(
  tlpSource.includes("import CreateModalPanel from '../components/CreateModalPanel'"),
  'TaskListPage.jsx imports CreateModalPanel'
)
assert(
  !tlpSource.includes("function CreateModalPanel({"),
  'TaskListPage.jsx no longer defines CreateModalPanel locally'
)
assert(
  !tlpSource.includes("useModalAnimation"),
  'TaskListPage.jsx no longer imports useModalAnimation'
)
assert(
  !tlpSource.includes("import CreateTask from '../components/CreateTask'"),
  'TaskListPage.jsx no longer imports CreateTask'
)

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\nResult: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
