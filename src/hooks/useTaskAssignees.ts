import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TaskAssignee } from '../types/team'

type AssigneesState =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; assignees: TaskAssignee[] }
  | { status: 'error'; message: string }

export function useTaskAssignees(userId: string | undefined) {
  const [state, setState] = useState<AssigneesState>({ status: 'idle' })

  const load = useCallback(async () => {
    if (!userId) return
    setState({ status: 'loading' })
    const { data, error } = await supabase
      .from('task_assignees')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) {
      setState({ status: 'error', message: error.message })
      return
    }
    setState({ status: 'ready', assignees: data as TaskAssignee[] })
  }, [userId])

  useEffect(() => {
    if (!userId) return
    const t = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(t)
  }, [load, userId])

  const assigneeMap = useMemo(() => {
    const map: Record<string, string[]> = {}
    if (state.status !== 'ready') return map
    for (const a of state.assignees) {
      if (!map[a.task_id]) map[a.task_id] = []
      map[a.task_id].push(a.member_id)
    }
    return map
  }, [state])

  const setAssignees = useCallback(
    async (taskId: string, memberIds: string[]) => {
      if (!userId) throw new Error('Not signed in')

      const { error: delError } = await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', taskId)
      if (delError) throw delError

      if (memberIds.length > 0) {
        const rows = memberIds.map((mid) => ({
          task_id: taskId,
          member_id: mid,
          user_id: userId,
        }))
        const { error: insError } = await supabase
          .from('task_assignees')
          .insert(rows)
        if (insError) throw insError
      }

      setState((s) => {
        if (s.status !== 'ready') return s
        const kept = s.assignees.filter((a) => a.task_id !== taskId)
        const added: TaskAssignee[] = memberIds.map((mid) => ({
          id: crypto.randomUUID(),
          task_id: taskId,
          member_id: mid,
          user_id: userId,
          created_at: new Date().toISOString(),
        }))
        return { status: 'ready', assignees: [...kept, ...added] }
      })
    },
    [userId],
  )

  return { state, assigneeMap, reload: load, setAssignees }
}
