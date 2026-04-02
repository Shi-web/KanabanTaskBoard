import type { CSSProperties, Ref } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '../types/task'
import type { TeamMember } from '../types/team'
import { dueDateLabel, formatDueDateDisplay } from '../lib/dueDate'
import { MemberAvatar } from './TeamPanel'

const priorityConfig: Record<
  NonNullable<Task['priority']>,
  { label: string; dot: string; text: string }
> = {
  low: {
    label: 'Low',
    dot: 'bg-slate-400',
    text: 'text-slate-500',
  },
  medium: {
    label: 'Medium',
    dot: 'bg-[var(--color-warning)]',
    text: 'text-amber-600',
  },
  high: {
    label: 'High',
    dot: 'bg-[var(--color-danger)]',
    text: 'text-red-600',
  },
}

const statusStrip: Record<Task['status'], string> = {
  todo: 'bg-slate-300',
  in_progress: 'bg-[var(--color-primary)]',
  in_review: 'bg-amber-400',
  done: 'bg-[var(--color-success)]',
}

export type TaskCardBodyProps = {
  task: Task
  onOpen: (task: Task) => void
  assignees?: TeamMember[]
  variant?: 'default' | 'overlay'
  className?: string
  style?: CSSProperties
  cardRef?: Ref<HTMLDivElement>
}

export function TaskCardBody({
  task,
  onOpen,
  assignees = [],
  variant = 'default',
  className = '',
  style,
  cardRef,
}: TaskCardBodyProps) {
  const due = task.due_date ? dueDateLabel(task.due_date) : null
  const done = task.status === 'done'
  const overlay = variant === 'overlay'

  return (
    <div
      ref={cardRef}
      style={style}
      className={[
        'group relative flex overflow-hidden rounded-xl bg-[var(--color-surface)]',
        !overlay && due === 'overdue' && !done
          ? 'ring-1 ring-[var(--color-danger)]/40 card-lift due-overdue-glow cursor-grab active:cursor-grabbing'
          : !overlay
            ? 'ring-1 ring-[var(--color-border)] card-lift cursor-grab active:cursor-grabbing'
            : 'ring-1 ring-[var(--color-primary)]/40 shadow-xl cursor-grabbing',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Left color strip */}
      <div
        className={`w-1 flex-none ${task.priority === 'high' ? 'bg-[var(--color-danger)]' : task.priority === 'medium' ? 'bg-[var(--color-warning)]' : statusStrip[task.status]}`}
      />

      <div className="flex min-w-0 flex-1 gap-2 p-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span
              className={[
                'text-sm font-medium leading-snug',
                done
                  ? 'text-[var(--color-text-tertiary)] line-through'
                  : 'text-[var(--color-text)]',
              ].join(' ')}
            >
              {done && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1.5 -mt-0.5 inline text-[var(--color-success)]"
                  aria-hidden
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
              {task.title}
            </span>

            {/* Edit button -- stops drag propagation so click opens the dialog */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onOpen(task)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex-none rounded-md p-1 text-[var(--color-text-tertiary)] opacity-0 transition-opacity hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-secondary)] group-hover:opacity-100"
              aria-label="Edit task"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </button>
          </div>

          {task.description && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
              {task.description}
            </p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {task.priority && (
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${priorityConfig[task.priority].text}`}>
                <span className={`inline-block h-2 w-2 rounded-full ${priorityConfig[task.priority].dot}`} />
                {priorityConfig[task.priority].label}
              </span>
            )}

            {task.due_date && (
              <span className="relative inline-flex items-center">
                {due === 'overdue' && !done && (
                  <span
                    className="absolute -right-1 -top-1 flex h-2.5 w-2.5"
                    aria-hidden
                  >
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-danger)] opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-danger)]" />
                  </span>
                )}
                <span
                  className={[
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                    done
                      ? 'bg-[var(--color-surface-muted)] text-[var(--color-text-tertiary)] line-through'
                      : due === 'overdue'
                        ? 'bg-[var(--color-danger-soft)] text-[var(--color-danger)] font-semibold'
                        : due === 'today'
                          ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-semibold'
                          : due === 'soon'
                            ? 'bg-[var(--color-warning-soft)] text-amber-600'
                            : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]',
                  ].join(' ')}
                >
                  {due === 'overdue' && !done && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4M12 16h.01" />
                    </svg>
                  )}
                  {due === 'today' && !done && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  )}
                  {due === 'soon' && !done && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  )}
                  {due === 'ok' && !done && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                  )}
                  {done
                    ? task.due_date
                    : formatDueDateDisplay(task.due_date)}
                </span>
              </span>
            )}

            {assignees.length > 0 && (
              <div className="ml-auto flex items-center -space-x-1.5">
                {assignees.slice(0, 3).map((m) => (
                  <MemberAvatar key={m.id} name={m.name} color={m.color} size="sm" />
                ))}
                {assignees.length > 3 && (
                  <span className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-[10px] font-semibold text-[var(--color-text-secondary)] ring-2 ring-[var(--color-surface)]">
                    +{assignees.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

type Props = {
  task: Task
  onOpen: (task: Task) => void
  assignees?: TeamMember[]
}

export function TaskCard({ task, onOpen, assignees }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      data: { task },
    })

  const style: CSSProperties = {
    ...(transform
      ? { transform: CSS.Translate.toString(transform) }
      : undefined),
    touchAction: 'none',
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <TaskCardBody
        task={task}
        onOpen={onOpen}
        assignees={assignees}
        variant="default"
        className={isDragging ? 'opacity-30 scale-[0.97]' : ''}
      />
    </div>
  )
}
