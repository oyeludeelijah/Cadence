/**
 * test-duplicate-task-investigation.mjs
 *
 * Investigation test for Part 4:
 * Tests groupTasks with fixtures for:
 *   1. Task due today
 *   2. Task due tomorrow
 *   3. Task due in 7 days
 *   4. Task overdue
 *
 * Checks which bucket each task falls into and verifies whether any task
 * ever appears in both "Due Today" and "Due This Week".
 *
 * Run: node tests/test-duplicate-task-investigation.mjs
 */

import { groupTasks } from '../src/utils/taskGrouping.js'

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

console.log('\n── Part 4: Duplicate Task Investigation Test ───────────────────')

const now = new Date()
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

// 1. Overdue: due yesterday (24h in the past)
const overdueDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

// 2. Due today: due later today (if late at night, end of today)
const dueTodayDate = new Date(today.getTime() + 18 * 60 * 60 * 1000).toISOString()

// 3. Due tomorrow: 1 day from today at noon
const dueTomorrowDate = new Date(today.getTime() + (24 + 12) * 60 * 60 * 1000).toISOString()

// 4. Due in exactly 7 days: 7 days from today at noon
const dueIn7DaysDate = new Date(today.getTime() + (7 * 24 + 12) * 60 * 60 * 1000).toISOString()

const fixtureTasks = [
  { id: 'task-overdue', title: 'Overdue Task', final_deadline: overdueDate, isCompleted: false },
  { id: 'task-today', title: 'Due Today Task', final_deadline: dueTodayDate, isCompleted: false },
  { id: 'task-tomorrow', title: 'Due Tomorrow Task', final_deadline: dueTomorrowDate, isCompleted: false },
  { id: 'task-7days', title: 'Due in 7 Days Task', final_deadline: dueIn7DaysDate, isCompleted: false },
]

console.log('Fixtures:')
fixtureTasks.forEach(t => console.log(`  - [${t.id}] ${t.title}: ${t.final_deadline}`))

const { dueToday, dueThisWeek, dueLater } = groupTasks(fixtureTasks)

console.log('\nGrouping Results:')
console.log('  dueToday:', dueToday.map(t => t.id))
console.log('  dueThisWeek:', dueThisWeek.map(t => t.id))
console.log('  dueLater:', dueLater.map(t => t.id))

console.log('\nAssertions:')

// Check mutual exclusivity: No task appears in both dueToday and dueThisWeek
const inBoth = dueToday.filter(t1 => dueThisWeek.some(t2 => t2.id === t1.id))
assert(inBoth.length === 0, `No task appears in both dueToday and dueThisWeek (duplicates found: ${inBoth.length})`)

// Check overdue task location
assert(dueToday.some(t => t.id === 'task-overdue'), 'Overdue task lands in dueToday (urgDate < endDay)')

// Check task due today location
assert(dueToday.some(t => t.id === 'task-today'), 'Task due today lands in dueToday')

// Check task due tomorrow location
assert(dueThisWeek.some(t => t.id === 'task-tomorrow'), 'Task due tomorrow lands in dueThisWeek')

// Check task due in 7 days location
assert(dueLater.some(t => t.id === 'task-7days'), 'Task due in 7 days at noon lands in dueLater because urgDate >= endWk (endWk is start of day 7)')

console.log(`\nResult: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
