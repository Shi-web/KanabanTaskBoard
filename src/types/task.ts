export const TASK_STATUSES = [
  'todo',
  'in_progress',
  'in_review',
  'done',
] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]

export const PRIORITIES = ['low', 'medium', 'high'] as const
export type TaskPriority = (typeof PRIORITIES)[number]

export type Task = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority | null
  due_date: string | null
  assignee_id: string | null
  user_id: string
  created_at: string
}

export type TaskInsert = {
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority | null
  due_date?: string | null
  assignee_id?: string | null
  user_id: string
}

export type TaskUpdate = Partial<
  Pick<
    Task,
    'title' | 'description' | 'status' | 'priority' | 'due_date' | 'assignee_id'
  >
>
