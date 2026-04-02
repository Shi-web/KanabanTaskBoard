import { useDroppable } from '@dnd-kit/core'
import type { Task } from '../types/task'
import type { TeamMember } from '../types/team'
import { TaskCard } from './TaskCard'

export type ColumnConfig = {
  id: Task['status']
  title: string
  icon: string
  accent: string
  accentBg: string
}

type Props = {
  column: ColumnConfig
  tasks: Task[]
  members: TeamMember[]
  assigneeMap: Record<string, string[]>
  onOpenTask: (task: Task) => void
}

export function Column({ column, tasks, members, assigneeMap, onOpenTask }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  })

  return (
    <section className="flex min-h-[min(70vh,520px)] min-w-[280px] max-w-full flex-1 flex-col rounded-2xl bg-[var(--color-surface-muted)] ring-1 ring-[var(--color-border)]/60">
      <header className="flex items-center justify-between gap-3 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="text-lg" role="img" aria-hidden>
            {column.icon}
          </span>
          <h2 className="font-[family-name:var(--font-heading)] text-[13px] font-semibold uppercase tracking-wide text-[var(--color-text)]">
            {column.title}
          </h2>
        </div>
        <span
          key={tasks.length}
          className={`badge-pop inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums ${column.accentBg} ${column.accent}`}
        >
          {tasks.length}
        </span>
      </header>

      <div
        ref={setNodeRef}
        className={[
          'flex flex-1 flex-col gap-2 overflow-y-auto px-2.5 pb-3 transition-colors duration-150',
          isOver
            ? 'bg-[var(--color-primary-soft)] ring-2 ring-inset ring-[var(--color-primary-ring)] rounded-b-2xl'
            : '',
        ].join(' ')}
      >
        {tasks.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] px-4 py-10 text-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="text-[var(--color-text-tertiary)]"
              aria-hidden
            >
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M12 8v8M8 12h8" />
            </svg>
            <p className="mt-2 text-sm font-medium text-[var(--color-text-tertiary)]">
              No tasks yet
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">
              Drop a card here or create one
            </p>
          </div>
        ) : (
          tasks.map((task) => {
            const ids = assigneeMap[task.id] ?? []
            const taskAssignees = members.filter((m) => ids.includes(m.id))
            return (
              <TaskCard key={task.id} task={task} onOpen={onOpenTask} assignees={taskAssignees} />
            )
          })
        )}
      </div>
    </section>
  )
}
