/**
 * test-step6-task-grouping.mjs
 *
 * Step 6 test: verifies `groupTasks` properly groups tasks by urgency based
 * on their `nextCheckpoint` or `final_deadline`.
 * Completed tasks should always go to `dueLater`.
 *
 * Run: node tests/test-step6-task-grouping.mjs
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { groupTasks } from '../src/utils/taskGrouping.js'

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

console.log('\n── Step 6: taskGrouping ───────────────────────────────────────')

const now = new Date()
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

const in1Hour = new Date(now.getTime() + 60 * 60 * 1000).toISOString()
const tomorrow = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000 - 1000).toISOString() // safe for "this week"
const nextWeek = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString()

const mockTasks = [
  { id: '1', title: 'Due Today with CP', nextCheckpoint: { due_date: in1Hour }, isCompleted: false },
  { id: '2', title: 'Due Today, no CP', nextCheckpoint: null, final_deadline: in1Hour, isCompleted: false },
  { id: '3', title: 'Due this week with CP', nextCheckpoint: { due_date: tomorrow }, isCompleted: false },
  { id: '4', title: 'Due later with CP', nextCheckpoint: { due_date: nextWeek }, isCompleted: false },
  { id: '5', title: 'Completed early today', nextCheckpoint: { due_date: in1Hour }, isCompleted: true },
]

const { dueToday, dueThisWeek, dueLater } = groupTasks(mockTasks)

assert(dueToday.length === 2, '2 tasks should be due today')
assert(dueToday.some(t => t.id === '1'), 'Task 1 in dueToday')
assert(dueToday.some(t => t.id === '2'), 'Task 2 in dueToday')

assert(dueThisWeek.length === 1, '1 task should be due this week')
assert(dueThisWeek[0].id === '3', 'Task 3 in dueThisWeek')

assert(dueLater.length === 2, '2 tasks should be due later')
assert(dueLater.some(t => t.id === '4'), 'Task 4 in dueLater')
assert(dueLater.some(t => t.id === '5'), 'Task 5 (completed) always in dueLater')


// ── Source checks ───────────────
const tlpSource = readFileSync(path.join(root, 'src/pages/TaskListPage.jsx'), 'utf8')

assert(
  tlpSource.includes("import { groupTasks }"),
  'TaskListPage.jsx imports groupTasks'
)
assert(
  !tlpSource.includes("function groupTasks("),
  'TaskListPage.jsx no longer defines groupTasks locally'
)


// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\nResult: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
