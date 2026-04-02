import { useEffect, useRef, useState } from 'react'
import type { Task, TaskPriority, TaskStatus } from '../types/task'
import { PRIORITIES, TASK_STATUSES } from '../types/task'
import type { TeamMember } from '../types/team'
import { MemberAvatar } from './TeamPanel'
import { useTaskComments } from '../hooks/useTaskComments'
import { logActivity } from '../hooks/useTaskActivity'

type Mode = 'create' | 'edit'

type Props = {
  open: boolean
  mode: Mode
  task: Task | null
  members: TeamMember[]
  assignedMemberIds: string[]
  onClose: () => void
  onCreate: (input: {
    title: string
    description: string | null
    priority: TaskPriority | null
    due_date: string | null
    status: TaskStatus
    assigneeIds: string[]
  }) => Promise<void>
  onSave: (
    id: string,
    input: {
      title: string
      description: string | null
      priority: TaskPriority | null
      due_date: string | null
      assigneeIds: string[]
    },
  ) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const emptyForm = {
  title: '',
  description: '',
  priority: '' as '' | TaskPriority,
  due_date: '',
  status: 'todo' as TaskStatus,
  assigneeIds: [] as string[],
}

const inputClass =
  'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-ring)]'

export function TaskDialog({
  open,
  mode,
  task,
  members,
  assignedMemberIds,
  onClose,
  onCreate,
  onSave,
  onDelete,
}: Props) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { comments, state: commentsState, addComment } = useTaskComments(
    mode === 'edit' && open ? (task?.id ?? null) : null,
  )
  const [commentBody, setCommentBody] = useState('')
  const [commentPosting, setCommentPosting] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setCommentBody('')
    setCommentError(null)
  }, [open, task?.id])

  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [comments.length])

  useEffect(() => {
    if (!open) return
    setError(null)
    if (mode === 'edit' && task) {
      setForm({
        title: task.title,
        description: task.description ?? '',
        priority: task.priority ?? '',
        due_date: task.due_date ?? '',
        status: task.status,
        assigneeIds: assignedMemberIds,
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, mode, task, assignedMemberIds])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const title = form.title.trim()
    if (!title) {
      setError('Title is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const description = form.description.trim() || null
      const due_date = form.due_date.trim() || null
      const priority = form.priority === '' ? null : form.priority
      if (mode === 'create') {
        await onCreate({
          title,
          description,
          priority,
          due_date,
          status: form.status,
          assigneeIds: form.assigneeIds,
        })
      } else if (task) {
        await onSave(task.id, {
          title,
          description,
          priority,
          due_date,
          assigneeIds: form.assigneeIds,
        })
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!task || mode !== 'edit') return
    if (!window.confirm('Delete this task? This cannot be undone.')) return
    setDeleting(true)
    setError(null)
    try {
      await onDelete(task.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete')
    } finally {
      setDeleting(false)
    }
  }

  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault()
    setCommentError(null)
    setCommentPosting(true)
    try {
      await addComment(commentBody)
      if (task) {
        void logActivity(task.id, 'comment_added', { body: commentBody.trim() })
      }
      setCommentBody('')
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Could not post comment')
    } finally {
      setCommentPosting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-dialog-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl shadow-slate-900/10">
        <h2
          id="task-dialog-title"
          className="font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight text-[var(--color-text)]"
        >
          {mode === 'create' ? 'Create task' : 'Edit task'}
        </h2>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="task-title"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]"
            >
              Title
            </label>
            <input
              id="task-title"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              className={inputClass}
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>
          <div>
            <label
              htmlFor="task-desc"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]"
            >
              Description
            </label>
            <textarea
              id="task-desc"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={3}
              className={`${inputClass} resize-y`}
              placeholder="Add more details..."
            />
          </div>
          {mode === 'create' ? (
            <div>
              <label
                htmlFor="task-status"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]"
              >
                Column
              </label>
              <select
                id="task-status"
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as TaskStatus,
                  }))
                }
                className={inputClass}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {labelStatus(s)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="task-priority"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]"
              >
                Priority
              </label>
              <select
                id="task-priority"
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    priority: e.target.value as '' | TaskPriority,
                  }))
                }
                className={inputClass}
              >
                <option value="">None</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p === 'medium'
                      ? 'Medium'
                      : p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="task-due"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]"
              >
                Due date
              </label>
              <input
                id="task-due"
                type="date"
                value={form.due_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, due_date: e.target.value }))
                }
                className={inputClass}
              />
            </div>
          </div>
          {members.length > 0 && (
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                Assignees
              </span>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const selected = form.assigneeIds.includes(m.id)
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          assigneeIds: selected
                            ? f.assigneeIds.filter((id) => id !== m.id)
                            : [...f.assigneeIds, m.id],
                        }))
                      }
                      className={[
                        'inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-sm font-medium transition',
                        selected
                          ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] ring-2 ring-[var(--color-primary)]'
                          : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]/80',
                      ].join(' ')}
                    >
                      <MemberAvatar name={m.name} color={m.color} size="sm" />
                      {m.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {error ? (
            <p className="rounded-xl bg-[var(--color-danger-soft)] px-4 py-2.5 text-sm font-medium text-[var(--color-danger)]">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-5">
            {mode === 'edit' ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || saving}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--color-danger)] transition hover:bg-[var(--color-danger-soft)] disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl px-5 py-2 text-sm font-semibold shadow-sm transition disabled:opacity-50"
                style={{ backgroundColor: '#0ea5e9', color: '#ffffff' }}
              >
                {saving
                  ? 'Saving...'
                  : mode === 'create'
                    ? 'Create task'
                    : 'Save changes'}
              </button>
            </div>
          </div>
        </form>

        {mode === 'edit' ? (
          <section className="mt-6 border-t border-[var(--color-border)] pt-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Comments
            </h3>

            {commentsState.status === 'loading' ? (
              <p className="text-sm text-[var(--color-text-tertiary)]">Loading comments…</p>
            ) : commentsState.status === 'error' ? (
              <p className="text-sm text-[var(--color-danger)]">{commentsState.message}</p>
            ) : comments.length === 0 ? (
              <p className="text-sm text-[var(--color-text-tertiary)]">No comments yet. Be the first to add one.</p>
            ) : (
              <ul className="mb-4 max-h-48 space-y-3 overflow-y-auto pr-1">
                {comments.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3.5 py-2.5"
                  >
                    <p className="whitespace-pre-wrap text-sm text-[var(--color-text)]">{c.body}</p>
                    <time
                      dateTime={c.created_at}
                      className="mt-1 block text-[11px] text-[var(--color-text-tertiary)]"
                    >
                      {new Date(c.created_at).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </time>
                  </li>
                ))}
                <div ref={commentsEndRef} />
              </ul>
            )}

            <form onSubmit={handlePostComment} className="mt-2 space-y-2">
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                rows={2}
                placeholder="Write a comment…"
                disabled={commentPosting}
                className={`${inputClass} resize-none disabled:opacity-50`}
              />
              {commentError ? (
                <p className="text-sm text-[var(--color-danger)]">{commentError}</p>
              ) : null}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={commentPosting || !commentBody.trim()}
                  className="rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition disabled:opacity-50"
                  style={{ backgroundColor: '#0ea5e9', color: '#ffffff' }}
                >
                  {commentPosting ? 'Posting…' : 'Add comment'}
                </button>
              </div>
            </form>
          </section>
        ) : null}
      </div>
    </div>
  )
}

function labelStatus(s: TaskStatus): string {
  switch (s) {
    case 'todo':
      return 'To Do'
    case 'in_progress':
      return 'In Progress'
    case 'in_review':
      return 'In Review'
    case 'done':
      return 'Done'
    default:
      return s
  }
}
