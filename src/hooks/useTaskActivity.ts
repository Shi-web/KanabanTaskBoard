import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ActivityKind, ActivityPayload, TaskActivity } from '../types/activity'

type State =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; activities: TaskActivity[] }
  | { status: 'error'; message: string }

export function useAllTaskActivity(userId: string | undefined) {
  const [state, setState] = useState<State>({ status: 'idle' })

  const load = useCallback(async () => {
    if (!userId) return
    setState({ status: 'loading' })
    const { data, error } = await supabase
      .from('task_activity')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) {
      setState({ status: 'error', message: error.message })
      return
    }
    setState({ status: 'ready', activities: data as TaskActivity[] })
  }, [userId])

  useEffect(() => {
    if (!userId) return
    void load()
  }, [load, userId])

  return { state, reload: load }
}

export async function logActivity(
  taskId: string | null,
  kind: ActivityKind,
  payload: ActivityPayload = {},
) {
  await supabase.from('task_activity').insert({
    task_id: taskId,
    kind,
    payload,
  })
}

/**
 * Detach all activity rows for a task before deleting it.
 * Sets task_id to null and stores the task title in each row's payload
 * so the entries survive the ON DELETE CASCADE.
 */
export async function detachTaskActivities(taskId: string, taskTitle: string) {
  const { data } = await supabase
    .from('task_activity')
    .select('id, payload')
    .eq('task_id', taskId)

  if (!data?.length) return

  await Promise.all(
    data.map((row) =>
      supabase
        .from('task_activity')
        .update({
          task_id: null,
          payload: { ...(row.payload as Record<string, unknown>), task_title: taskTitle },
        })
        .eq('id', row.id),
    ),
  )
}
