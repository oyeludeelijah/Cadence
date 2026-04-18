/**
 * taskGrouping.js
 *
 * Pure function that groups an array of tasks into "dueToday", "dueThisWeek",
 * and "dueLater" buckets based on their next actionable date (either the next
 * pending checkpoint, or the final deadline if no checkpoints remain).
 * Completed tasks always fall into the "dueLater" bucket to keep them out of
 * the urgent views.
 */

export function groupTasks(tasks) {
  const now    = new Date()
  const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endDay = new Date(today)
  endDay.setDate(endDay.getDate() + 1)
  
  const endWk  = new Date(today)
  endWk.setDate(endWk.getDate() + 7)

  const dueToday = []
  const dueThisWeek = []
  const dueLater = []

  tasks.forEach(t => {
    // Completed tasks have no meaningful urgency date — always put them
    // in dueLater so they never appear under the 🔥 "Due Today" heading.
    if (t.isCompleted) {
      dueLater.push(t)
      return
    }

    const urgDate = t.nextCheckpoint
      ? new Date(t.nextCheckpoint.due_date)
      : new Date(t.final_deadline)
      
    if (urgDate < endDay)     dueToday.push(t)
    else if (urgDate < endWk) dueThisWeek.push(t)
    else                      dueLater.push(t)
  })
  
  return { dueToday, dueThisWeek, dueLater }
}
