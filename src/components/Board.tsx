import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import type { Task, TaskStatus } from '../types/task'
import { TASK_STATUSES } from '../types/task'
import type { TeamMember, TeamMemberUpdate } from '../types/team'
import { useTasks } from '../hooks/useTasks'
import { logActivity, detachTaskActivities, useAllTaskActivity } from '../hooks/useTaskActivity'
import { Column, type ColumnConfig } from './Column'
import { TaskCardBody } from './TaskCard'
import { TaskDialog } from './TaskDialog'
import { TeamPanel } from './TeamPanel'
import { ActivityPanel } from './ActivityPanel'

const COLUMNS: ColumnConfig[] = [
  {
    id: 'todo',
    title: 'To Do',
    icon: '\u{1F4CB}',
    accent: 'text-slate-600',
    accentBg: 'bg-slate-200/80',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    icon: '\u{1F528}',
    accent: 'text-sky-700',
    accentBg: 'bg-sky-100',
  },
  {
    id: 'in_review',
    title: 'In Review',
    icon: '\u{1F50D}',
    accent: 'text-amber-700',
    accentBg: 'bg-amber-100',
  },
  {
    id: 'done',
    title: 'Done',
    icon: '\u{2705}',
    accent: 'text-emerald-700',
    accentBg: 'bg-emerald-100',
  },
]

type TasksApi = Pick<
  ReturnType<typeof useTasks>,
  | 'tasks'
  | 'createTask'
  | 'updateTask'
  | 'updateTaskStatus'
  | 'deleteTask'
  | 'stats'
>

type TeamApi = {
  members: TeamMember[]
  addMember: (name: string, color: string) => Promise<TeamMember>
  updateMember: (id: string, patch: TeamMemberUpdate) => Promise<TeamMember>
  removeMember: (id: string) => Promise<void>
}

type AssigneeApi = {
  assigneeMap: Record<string, string[]>
  setAssignees: (taskId: string, memberIds: string[]) => Promise<void>
}

type ActivityApi = ReturnType<typeof useAllTaskActivity>

type Props = {
  tasksApi: TasksApi
  teamApi: TeamApi
  assigneeApi: AssigneeApi
  activityApi: ActivityApi
}

export function Board({ tasksApi, teamApi, assigneeApi, activityApi }: Props) {
  const {
    tasks,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    stats,
  } = tasksApi
  const { members, addMember, updateMember, removeMember } = teamApi
  const { assigneeMap, setAssignees } = assigneeApi
  const [search, setSearch] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [selected, setSelected] = useState<Task | null>(null)
  const [activeDrag, setActiveDrag] = useState<Task | null>(null)
  const [teamPanelOpen, setTeamPanelOpen] = useState(false)
  const [activityPanelOpen, setActivityPanelOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  )

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return tasks
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false),
    )
  }, [tasks, search])

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
    }
    for (const t of filteredTasks) {
      map[t.status].push(t)
    }
    return map
  }, [filteredTasks])

  function resolveTargetStatus(overId: string): TaskStatus | null {
    if (TASK_STATUSES.includes(overId as TaskStatus)) {
      return overId as TaskStatus
    }
    const overTask = tasks.find((t) => t.id === overId)
    return overTask ? overTask.status : null
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id)
    const task = tasks.find((t) => t.id === id) ?? null
    setActiveDrag(task)
    setActionError(null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null)
    const { active, over } = event
    if (!over) return
    const taskId = String(active.id)
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    const newStatus = resolveTargetStatus(String(over.id))
    if (!newStatus || newStatus === task.status) return
    const prevStatus = task.status
    void (async () => {
      try {
        await updateTaskStatus(taskId, newStatus)
        void logActivity(taskId, 'status_change', { from: prevStatus, to: newStatus })
      } catch (e) {
        setActionError(
          e instanceof Error ? e.message : 'Could not move task',
        )
      }
    })()
  }

  function handleDragCancel() {
    setActiveDrag(null)
  }

  return (
    <div className="flex min-h-svh flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-white/80 px-5 py-5 backdrop-blur-lg sm:px-8">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </div>
              <span className="font-[family-name:var(--font-heading)] text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-primary)]">
                Flowboard
              </span>
            </div>
            <h1 className="mt-1.5 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-[var(--color-text)] sm:text-3xl">
              Task Board
            </h1>
            <p className="mt-1 max-w-md text-sm text-[var(--color-text-secondary)]">
              Drag cards between columns to update status. Your tasks stay
              private to this browser session.
            </p>
          </div>
          {stats ? (
            <dl className="flex flex-wrap gap-3">
              <StatCard label="Total" value={stats.total} />
              <StatCard label="Done" value={stats.done} valueClass="text-[var(--color-success)]" />
              <StatCard
                label="Overdue"
                value={stats.overdue}
                valueClass={
                  stats.overdue > 0
                    ? 'text-[var(--color-danger)]'
                    : 'text-[var(--color-text)]'
                }
              />
            </dl>
          ) : null}
        </div>
        <div className="mx-auto mt-5 flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-ring)]"
              aria-label="Search tasks"
            />
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setTeamPanelOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface-muted)] active:scale-[0.97]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Team
              {members.length > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-primary-soft)] px-1 text-[11px] font-semibold text-[var(--color-primary)]">
                  {members.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setDialogMode('create')
                setSelected(null)
                setDialogOpen(true)
                setActionError(null)
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-sky-500/20 transition hover:bg-[var(--color-primary-hover)] hover:shadow-md hover:shadow-sky-500/25 active:scale-[0.97]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
              New task
            </button>
            <button
              type="button"
              onClick={() => {
                setActivityPanelOpen(true)
                void activityApi.reload()
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface-muted)] active:scale-[0.97]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Activity
            </button>
          </div>
        </div>
        {actionError ? (
          <div className="mx-auto mt-3 max-w-[1600px] rounded-xl bg-[var(--color-danger-soft)] px-4 py-2.5 text-sm font-medium text-[var(--color-danger)]">
            {actionError}
          </div>
        ) : null}
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 overflow-x-auto p-5 sm:p-6 lg:flex-row lg:items-start">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              column={col}
              tasks={tasksByStatus[col.id]}
              members={members}
              assigneeMap={assigneeMap}
              onOpenTask={(task) => {
                setDialogMode('edit')
                setSelected(task)
                setDialogOpen(true)
                setActionError(null)
              }}
            />
          ))}
        </main>
        <DragOverlay dropAnimation={null}>
          {activeDrag ? (
            <div className="w-[290px] cursor-grabbing">
              <TaskCardBody
                task={activeDrag}
                variant="overlay"
                onOpen={() => {}}
                assignees={members.filter((m) => (assigneeMap[activeDrag.id] ?? []).includes(m.id))}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskDialog
        open={dialogOpen}
        mode={dialogMode}
        task={selected}
        members={members}
        assignedMemberIds={selected ? (assigneeMap[selected.id] ?? []) : []}
        onClose={() => {
          setDialogOpen(false)
          setSelected(null)
        }}
        onCreate={async (input) => {
          const task = await createTask({
            title: input.title,
            description: input.description,
            priority: input.priority,
            due_date: input.due_date,
            status: input.status,
          })
          if (task) {
            void logActivity(task.id, 'created')
            if (input.assigneeIds.length > 0) {
              await setAssignees(task.id, input.assigneeIds)
              void logActivity(task.id, 'assignees_updated', {
                added: input.assigneeIds,
                removed: [],
              })
            }
          }
        }}
        onSave={async (id, input) => {
          const prev = selected
          await updateTask(id, {
            title: input.title,
            description: input.description,
            priority: input.priority,
            due_date: input.due_date,
          })
          if (prev) {
            const changed: string[] = []
            if (input.title !== prev.title) changed.push('title')
            if ((input.description ?? null) !== (prev.description ?? null)) changed.push('description')
            if ((input.priority ?? null) !== (prev.priority ?? null)) changed.push('priority')
            if ((input.due_date ?? null) !== (prev.due_date ?? null)) changed.push('due date')
            if (changed.length > 0) {
              void logActivity(id, 'fields_updated', { fields: changed })
            }
          }
          const prevIds = selected ? (assigneeMap[selected.id] ?? []) : []
          const added = input.assigneeIds.filter((mid) => !prevIds.includes(mid))
          const removed = prevIds.filter((mid) => !input.assigneeIds.includes(mid))
          await setAssignees(id, input.assigneeIds)
          if (added.length > 0 || removed.length > 0) {
            void logActivity(id, 'assignees_updated', { added, removed })
          }
        }}
        onDelete={async (id) => {
          const task = tasks.find((t) => t.id === id)
          const title = task?.title ?? 'Untitled'
          await detachTaskActivities(id, title)
          await deleteTask(id)
          void logActivity(null, 'deleted', { title })
        }}
      />

      <TeamPanel
        open={teamPanelOpen}
        members={members}
        onClose={() => setTeamPanelOpen(false)}
        onAdd={addMember}
        onUpdate={updateMember}
        onRemove={removeMember}
      />

      <ActivityPanel
        open={activityPanelOpen}
        onClose={() => setActivityPanelOpen(false)}
        activityState={activityApi.state}
        onReload={activityApi.reload}
        tasks={tasks}
        members={members}
      />

      <StatusBarChart tasksByStatus={tasksByStatus} />
    </div>
  )
}

function StatCard({
  label,
  value,
  valueClass = 'text-[var(--color-text)]',
}: {
  label: string
  value: number
  valueClass?: string
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 shadow-sm">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
        {label}
      </dt>
      <dd
        key={value}
        className={`badge-pop font-[family-name:var(--font-heading)] text-xl font-bold tabular-nums ${valueClass}`}
      >
        {value}
      </dd>
    </div>
  )
}

const BAR_COLORS: Record<TaskStatus, string> = {
  todo: '#64748b',
  in_progress: '#0284c7',
  in_review: '#d97706',
  done: '#059669',
}

function StatusBarChart({
  tasksByStatus,
}: {
  tasksByStatus: Record<TaskStatus, Task[]>
}) {
  const maxCount = Math.max(
    1,
    ...COLUMNS.map((col) => tasksByStatus[col.id].length),
  )

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-6 sm:px-8">
      <div className="mx-auto max-w-md">
        <h2 className="mb-4 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
          Task Distribution
        </h2>
        <div className="flex items-end justify-center gap-6">
          {COLUMNS.map((col) => {
            const count = tasksByStatus[col.id].length
            const pct = (count / maxCount) * 100
            return (
              <div key={col.id} className="flex flex-col items-center gap-1.5" style={{ width: 56 }}>
                <span
                  className="badge-pop font-[family-name:var(--font-heading)] text-xs font-bold tabular-nums"
                  style={{ color: BAR_COLORS[col.id] }}
                >
                  {count}
                </span>
                <div className="relative w-full" style={{ height: 96 }}>
                  <div
                    className="absolute bottom-0 w-full rounded-t-md transition-all duration-500 ease-out"
                    style={{
                      height: `${Math.max(pct, 4)}%`,
                      backgroundColor: BAR_COLORS[col.id],
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-2 flex justify-center gap-6">
          {COLUMNS.map((col) => (
            <span
              key={col.id}
              className="w-14 text-center text-[10px] font-medium leading-tight text-[var(--color-text-tertiary)]"
            >
              {col.title}
            </span>
          ))}
        </div>
      </div>
    </footer>
  )
}
