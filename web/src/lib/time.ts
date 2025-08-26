import { endOfDay, isAfter, isBefore, startOfDay } from 'date-fns'

export function classifyDueDate(dueAt?: Date, status: 'todo' | 'in_progress' | 'done' = 'todo') {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  if (status === 'done') return 'completed'
  if (!dueAt) return 'upcoming' // no due date -> upcoming bucket
  if (isBefore(dueAt, todayStart)) return 'overdue'
  if (!isAfter(dueAt, todayEnd)) return 'today'
  return 'upcoming'
}