/**
 * test-step1-task-types.mjs
 *
 * Step 1 test: verifies TASK_TYPE_OPTIONS exists, has the correct shape,
 * and matches what CreateTask / EditTask previously defined locally.
 *
 * Run: node test-step1-task-types.mjs
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../')

// ── Test 1: constants file can be read and has correct structure ─────────────
const constantsPath = path.join(root, 'src/constants/taskTypes.js')
const constantsSource = readFileSync(constantsPath, 'utf8')

const expectedValues = ['essay', 'problem_set', 'exam_prep']
const expectedLabels = ['Essay', 'Problem Set', 'Exam Prep']

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

console.log('\n── Step 1: TASK_TYPE_OPTIONS extraction ──────────────────────')

// File existence
assert(constantsSource.length > 0, 'constants/taskTypes.js exists and is non-empty')

// All values present
for (const v of expectedValues) {
  assert(constantsSource.includes(`'${v}'`), `Contains value '${v}'`)
}
// All labels present
for (const l of expectedLabels) {
  assert(constantsSource.includes(`'${l}'`), `Contains label '${l}'`)
}
// Exports the constant
assert(constantsSource.includes('export const TASK_TYPE_OPTIONS'), 'Exports TASK_TYPE_OPTIONS')
// Exports VALID_TASK_TYPES bonus
assert(constantsSource.includes('export const VALID_TASK_TYPES'), 'Exports VALID_TASK_TYPES')

// ── Test 2: CreateTask.jsx no longer defines the constant locally ────────────
const createTaskPath = path.join(root, 'src/components/CreateTask.jsx')
const createTaskSource = readFileSync(createTaskPath, 'utf8')

assert(
  !createTaskSource.includes("const TASK_TYPE_OPTIONS"),
  'CreateTask.jsx has no local TASK_TYPE_OPTIONS definition'
)
assert(
  createTaskSource.includes("from '../constants/taskTypes'"),
  'CreateTask.jsx imports from constants/taskTypes'
)

// ── Test 3: EditTask.jsx no longer defines the constant locally ──────────────
const editTaskPath = path.join(root, 'src/components/EditTask.jsx')
const editTaskSource = readFileSync(editTaskPath, 'utf8')

assert(
  !editTaskSource.includes("const TASK_TYPE_OPTIONS"),
  'EditTask.jsx has no local TASK_TYPE_OPTIONS definition'
)
assert(
  editTaskSource.includes("from '../constants/taskTypes'"),
  'EditTask.jsx imports from constants/taskTypes'
)

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\nResult: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
