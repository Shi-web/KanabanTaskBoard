import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Task, TaskInsert, TaskStatus, TaskUpdate } from '../types/task'

type TasksState =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; tasks: Task[] }
  | { status: 'error'; message: string }

export function useTasks(userId: string | undefined) {
  const [state, setState] = useState<TasksState>({ status: 'idle' })

  const load = useCallback(async () => {
    if (!userId) return
    setState({ status: 'loading' })
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      setState({ status: 'error', message: error.message })
      return
    }
    setState({ status: 'ready', tasks: data as Task[] })
  }, [userId])

  useEffect(() => {
    if (!userId) return
    const t = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(t)
  }, [load, userId])

  const createTask = useCallback(
    async (row: Omit<TaskInsert, 'user_id'>) => {
      if (!userId) throw new Error('Not signed in')
      const { data, error } = await supabase
        .from('tasks')
        .insert({ ...row, user_id: userId })
        .select()
        .single()
      if (error) throw error
      const task = data as Task
      setState((s) => {
        if (s.status !== 'ready') return { status: 'ready', tasks: [task] }
        return { status: 'ready', tasks: [task, ...s.tasks] }
      })
      return task
    },
    [userId],
  )

  const updateTask = useCallback(
    async (id: string, patch: TaskUpdate) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      const updated = data as Task
      setState((s) => {
        if (s.status !== 'ready') return s
        return {
          status: 'ready',
          tasks: s.tasks.map((t) => (t.id === id ? updated : t)),
        }
      })
      return updated
    },
    [],
  )

  const updateTaskStatus = useCallback(
    async (id: string, status: TaskStatus) => updateTask(id, { status }),
    [updateTask],
  )

  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw error
    setState((s) => {
      if (s.status !== 'ready') return s
      return {
        status: 'ready',
        tasks: s.tasks.filter((t) => t.id !== id),
      }
    })
  }, [])

  const tasksByStatus = useMemo(() => {
    if (state.status !== 'ready') return null
    const map: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
    }
    for (const t of state.tasks) {
      map[t.status].push(t)
    }
    return map
  }, [state])

  const stats = useMemo(() => {
    if (state.status !== 'ready') return null
    const tasks = state.tasks
    const total = tasks.length
    const done = tasks.filter((t) => t.status === 'done').length
    const today = new Date().toISOString().slice(0, 10)
    const overdue = tasks.filter(
      (t) =>
        t.due_date &&
        t.due_date < today &&
        t.status !== 'done',
    ).length
    return { total, done, overdue }
  }, [state])

  const tasks = state.status === 'ready' ? state.tasks : []

  return {
    state,
    tasks,
    tasksByStatus,
    stats,
    reload: load,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
  }
}
