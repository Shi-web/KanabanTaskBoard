import type { Task } from '../types/task'
import type { TaskActivity } from '../types/activity'
import type { TeamMember } from '../types/team'

const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function describeActivity(a: TaskActivity, memberMap: Map<string, string>): string {
  const p = a.payload as Record<string, unknown>
  switch (a.kind) {
    case 'created':
      return 'Task created'
    case 'status_change': {
      const from = STATUS_LABELS[p.from as string] ?? (p.from as string)
      const to = STATUS_LABELS[p.to as string] ?? (p.to as string)
      return `Moved from ${from} \u2192 ${to}`
    }
    case 'fields_updated': {
      const fields = p.fields as string[]
      return `Updated ${fields.join(', ')}`
    }
    case 'assignees_updated': {
      const added = (p.added as string[]).map((id) => memberMap.get(id) ?? 'someone')
      const removed = (p.removed as string[]).map((id) => memberMap.get(id) ?? 'someone')
      const parts: string[] = []
      if (added.length) parts.push(`added ${added.join(', ')}`)
      if (removed.length) parts.push(`removed ${removed.join(', ')}`)
      return parts.length > 0
        ? parts.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' and ')
        : 'Assignees updated'
    }
    case 'deleted': {
      const title = (p.title as string) ?? 'Untitled'
      return `"${title}" deleted`
    }
    case 'comment_added': {
      const body = (p.body as string) ?? ''
      const preview = body.length > 60 ? body.slice(0, 60) + '...' : body
      return `Commented: "${preview}"`
    }
    default:
      return 'Activity recorded'
  }
}

const KIND_COLORS: Record<string, { bg: string; ring: string; text: string }> = {
  created: {
    bg: 'bg-emerald-50',
    ring: 'ring-emerald-200',
    text: 'text-emerald-600',
  },
  status_change: {
    bg: 'bg-sky-50',
    ring: 'ring-sky-200',
    text: 'text-sky-600',
  },
  fields_updated: {
    bg: 'bg-amber-50',
    ring: 'ring-amber-200',
    text: 'text-amber-600',
  },
  assignees_updated: {
    bg: 'bg-violet-50',
    ring: 'ring-violet-200',
    text: 'text-violet-600',
  },
  deleted: {
    bg: 'bg-red-50',
    ring: 'ring-red-200',
    text: 'text-red-600',
  },
  comment_added: {
    bg: 'bg-cyan-50',
    ring: 'ring-cyan-200',
    text: 'text-cyan-600',
  },
}

const KIND_ICONS: Record<string, React.ReactNode> = {
  created: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  status_change: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  fields_updated: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  ),
  assignees_updated: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  deleted: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  comment_added: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
}

type ActivityState =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; activities: TaskActivity[] }
  | { status: 'error'; message: string }

type Props = {
  open: boolean
  onClose: () => void
  activityState: ActivityState
  onReload: () => void
  tasks: Task[]
  members: TeamMember[]
}

export function ActivityPanel({ open, onClose, activityState, onReload, tasks, members }: Props) {
  const taskMap = new Map(tasks.map((t) => [t.id, t.title]))
  const memberMap = new Map(members.map((m) => [m.id, m.name]))
  const activities = activityState.status === 'ready' ? activityState.activities : []

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="activity-panel-title">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity"
        aria-label="Close activity panel"
        onClick={onClose}
      />

      <div className="panel-enter relative z-10 flex h-full w-full max-w-md flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-slate-900/10">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary-soft)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-primary)]" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h2 id="activity-panel-title" className="font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight text-[var(--color-text)]">
              Activity
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onReload}
              className="rounded-lg p-1.5 text-[var(--color-text-tertiary)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-secondary)]"
              aria-label="Refresh"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M21 21v-5h-5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--color-text-tertiary)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-secondary)]"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activityState.status === 'loading' || activityState.status === 'idle' ? (
            <div className="flex flex-col items-center justify-center py-16 text-sm text-[var(--color-text-tertiary)]">
              <div className="relative mb-3 h-8 w-8">
                <div className="absolute inset-0 rounded-full border-[3px] border-[var(--color-border)]" />
                <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-[var(--color-primary)]" />
              </div>
              Loading activity...
            </div>
          ) : activityState.status === 'error' ? (
            <div className="flex flex-col items-center justify-center py-16 text-sm text-[var(--color-danger)]">
              Could not load activity
              <button
                type="button"
                onClick={onReload}
                className="mt-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
              >
                Retry
              </button>
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface-muted)]">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-tertiary)]" aria-hidden>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <p className="mt-3 text-sm font-medium text-[var(--color-text-secondary)]">
                No activity yet
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">
                Changes to tasks will appear here
              </p>
            </div>
          ) : (
            <div className="relative px-6 py-4">
              <div className="absolute left-[31px] top-4 bottom-4 w-px bg-[var(--color-border)]" aria-hidden />
              <ul role="list" className="relative space-y-1">
                {activities.map((a) => {
                  const colors = KIND_COLORS[a.kind] ?? KIND_COLORS.created
                  const icon = KIND_ICONS[a.kind] ?? KIND_ICONS.created
                  const payloadTitle = (a.payload as Record<string, unknown>).task_title as string | undefined
                  const taskTitle = a.task_id
                    ? taskMap.get(a.task_id)
                    : payloadTitle
                  return (
                    <li key={a.id} className="group relative flex gap-3 rounded-xl px-1 py-2.5 transition hover:bg-[var(--color-surface-muted)]">
                      <span className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${colors.bg} ${colors.text} ring-1 ${colors.ring}`}>
                        {icon}
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        {taskTitle && (
                          <p className={`mb-0.5 truncate text-[11px] font-semibold text-[var(--color-text-secondary)] ${!a.task_id ? 'line-through opacity-60' : ''}`}>
                            {taskTitle}
                          </p>
                        )}
                        <p className="text-xs leading-relaxed text-[var(--color-text)]">
                          {describeActivity(a, memberMap)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[var(--color-text-tertiary)]">
                          {relativeTime(a.created_at)}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
