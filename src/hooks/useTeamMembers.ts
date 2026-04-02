import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TeamMember, TeamMemberUpdate } from '../types/team'

type MembersState =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; members: TeamMember[] }
  | { status: 'error'; message: string }

export function useTeamMembers(userId: string | undefined) {
  const [state, setState] = useState<MembersState>({ status: 'idle' })

  const load = useCallback(async () => {
    if (!userId) return
    setState({ status: 'loading' })
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) {
      setState({ status: 'error', message: error.message })
      return
    }
    setState({ status: 'ready', members: data as TeamMember[] })
  }, [userId])

  useEffect(() => {
    if (!userId) return
    const t = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(t)
  }, [load, userId])

  const addMember = useCallback(
    async (name: string, color: string) => {
      if (!userId) throw new Error('Not signed in')
      const { data, error } = await supabase
        .from('team_members')
        .insert({ name, color, user_id: userId })
        .select()
        .single()
      if (error) throw error
      const member = data as TeamMember
      setState((s) => {
        if (s.status !== 'ready') return { status: 'ready', members: [member] }
        return { status: 'ready', members: [...s.members, member] }
      })
      return member
    },
    [userId],
  )

  const updateMember = useCallback(
    async (id: string, patch: TeamMemberUpdate) => {
      const { data, error } = await supabase
        .from('team_members')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      const updated = data as TeamMember
      setState((s) => {
        if (s.status !== 'ready') return s
        return {
          status: 'ready',
          members: s.members.map((m) => (m.id === id ? updated : m)),
        }
      })
      return updated
    },
    [],
  )

  const removeMember = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id)
    if (error) throw error
    setState((s) => {
      if (s.status !== 'ready') return s
      return {
        status: 'ready',
        members: s.members.filter((m) => m.id !== id),
      }
    })
  }, [])

  const members = state.status === 'ready' ? state.members : []

  return { state, members, reload: load, addMember, updateMember, removeMember }
}
