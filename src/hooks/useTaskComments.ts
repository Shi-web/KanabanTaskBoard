import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TaskComment } from '../types/comment'

type State =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; comments: TaskComment[] }
  | { status: 'error'; message: string }

export function useTaskComments(taskId: string | null) {
  const [state, setState] = useState<State>({ status: 'idle' })

  const load = useCallback(async () => {
    if (!taskId) {
      setState({ status: 'idle' })
      return
    }
    setState({ status: 'loading' })
    const { data, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
    if (error) {
      setState({ status: 'error', message: error.message })
      return
    }
    setState({ status: 'ready', comments: data as TaskComment[] })
  }, [taskId])

  useEffect(() => {
    void load()
  }, [load])

  const addComment = useCallback(
    async (body: string) => {
      if (!taskId) throw new Error('No task selected')
      const trimmed = body.trim()
      if (!trimmed) throw new Error('Comment cannot be empty')
      const { data, error } = await supabase
        .from('task_comments')
        .insert({ task_id: taskId, body: trimmed })
        .select()
        .single()
      if (error) throw error
      const comment = data as TaskComment
      setState((s) => {
        if (s.status !== 'ready') return { status: 'ready', comments: [comment] }
        return { status: 'ready', comments: [...s.comments, comment] }
      })
    },
    [taskId],
  )

  const comments = state.status === 'ready' ? state.comments : []

  return { state, comments, addComment, reload: load }
}
