import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthState =
  | { status: 'loading' }
  | { status: 'ready'; session: Session }
  | { status: 'error'; message: string }

export function useAuth() {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  const bootstrap = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession()
      if (sessionError) throw sessionError
      let session = sessionData.session
      if (!session) {
        const { data, error } = await supabase.auth.signInAnonymously()
        if (error) throw error
        session = data.session
      }
      if (!session) throw new Error('No session after anonymous sign-in')
      setState({ status: 'ready', session })
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Could not start guest session'
      setState({ status: 'error', message })
    }
  }, [])

  useEffect(() => {
    void bootstrap()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setState({ status: 'ready', session })
    })
    return () => subscription.unsubscribe()
  }, [bootstrap])

  return { state, retry: bootstrap }
}
