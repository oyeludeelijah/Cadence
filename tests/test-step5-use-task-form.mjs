/**
 * test-step5-use-task-form.mjs
 *
 * Step 5 test: verifies useTaskForm hook was correctly extracted from CreateTask.
 *
 * Tests:
 *   1. The hook module exports useTaskForm as a function
 *   2. The hook contains the dirty-check logic
 *   3. The hook contains resetForm with the correct default values
 *   4. The hook contains form validation logic
 *   5. CreateTask.jsx no longer defines its own form state or useEffect dirty-check
 *   6. CreateTask.jsx imports and calls useTaskForm
 *   7. CreateTask.jsx calls resetForm() instead of setForm({...})
 *
 * Run: node tests/test-step5-use-task-form.mjs
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

console.log('\n── Step 5: useTaskForm hook extraction ───────────────────────')

// ── Hook module structure ─────────────────────────────────────────────────────
const hookPath = path.join(root, 'src/hooks/useTaskForm.js')
const hookSource = readFileSync(hookPath, 'utf8')

assert(hookSource.includes('export function useTaskForm'), 'useTaskForm is exported')
assert(hookSource.includes('DEFAULT_FORM'), 'Default form values are defined as a constant')
assert(hookSource.includes("taskType: 'essay'"), 'Default taskType is essay')
assert(hookSource.includes('title'), 'Default form has title field')
assert(hookSource.includes('dueDate'), 'Default form has dueDate field')
assert(hookSource.includes('notes'), 'Default form has notes field')
assert(hookSource.includes('onIsDirtyChange'), 'Dirty-check callback is supported')
assert(hookSource.includes("form.title.trim() !== ''"), 'Dirty-check watches title')
assert(hookSource.includes("form.dueDate"), 'Dirty-check watches dueDate')
assert(hookSource.includes('function resetForm'), 'resetForm is defined')
assert(hookSource.includes('{ ...DEFAULT_FORM }'), 'resetForm uses the DEFAULT_FORM constant')
assert(hookSource.includes('function handleChange'), 'handleChange is defined')
assert(hookSource.includes('validationError'), 'Validation error is returned')
assert(hookSource.includes('isValid'), 'isValid boolean is returned')

// ── CreateTask.jsx integration ────────────────────────────────────────────────
const ctPath = path.join(root, 'src/components/CreateTask.jsx')
const ctSource = readFileSync(ctPath, 'utf8')

assert(
  ctSource.includes("import { useTaskForm }"),
  'CreateTask.jsx imports useTaskForm'
)
assert(
  ctSource.includes("useTaskForm({ onIsDirtyChange })"),
  'CreateTask.jsx calls useTaskForm with onIsDirtyChange'
)
assert(
  ctSource.includes('resetForm()'),
  'CreateTask.jsx calls resetForm() on success'
)

// These should be gone from CreateTask — the hook owns them now
assert(
  !ctSource.includes("const [form, setForm] = useState"),
  'CreateTask.jsx no longer defines its own form useState'
)
assert(
  !ctSource.includes("const isDirty ="),
  'CreateTask.jsx no longer contains the dirty-check useEffect'
)
assert(
  !ctSource.includes("setForm({ title: '',"),
  "CreateTask.jsx no longer resets form by calling setForm({...}) directly"
)

// useEffect is no longer needed in CreateTask for dirty-check
// (it may still be used for other things, so we check the specific dirty-check line)
assert(
  !ctSource.includes("form.title.trim() !== '' || form.notes"),
  'The dirty-check logic has moved out of CreateTask.jsx'
)

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\nResult: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
