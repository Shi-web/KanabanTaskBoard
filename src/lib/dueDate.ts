export type DueDateUrgency = 'overdue' | 'today' | 'soon' | 'ok' | null

/** YYYY-MM-DD → urgency level */
export function dueDateLabel(due: string): DueDateUrgency {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(due + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return null
  const diffDays = Math.ceil((d.getTime() - today.getTime()) / 86400000)
  if (diffDays < 0) return 'overdue'
  if (diffDays === 0) return 'today'
  if (diffDays <= 3) return 'soon'
  return 'ok'
}

/** YYYY-MM-DD → human-readable display string */
export function formatDueDateDisplay(due: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(due + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return due
  const diffDays = Math.ceil((d.getTime() - today.getTime()) / 86400000)
  const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (diffDays < 0) return `Overdue · ${formatted}`
  if (diffDays === 0) return 'Due today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays <= 3) return `In ${diffDays} days`
  return formatted
}
