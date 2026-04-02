import { useAuth } from './hooks/useAuth'
import { useTasks } from './hooks/useTasks'
import { useTeamMembers } from './hooks/useTeamMembers'
import { useTaskAssignees } from './hooks/useTaskAssignees'
import { useAllTaskActivity } from './hooks/useTaskActivity'
import { Board } from './components/Board'

function Spinner() {
  return (
    <div className="relative h-10 w-10">
      <div className="absolute inset-0 rounded-full border-[3px] border-[var(--color-border)]" />
      <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-[var(--color-primary)]" />
    </div>
  )
}

function AuthLoading() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6">
      <Spinner />
      <p className="text-sm font-medium text-[var(--color-text-secondary)]">
        Starting your session...
      </p>
    </div>
  )
}

function AuthError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-danger-soft)]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[var(--color-danger)]" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </div>
      <p className="max-w-md text-sm font-medium text-[var(--color-danger)]">
        {message}
      </p>
      <p className="max-w-md text-xs text-[var(--color-text-tertiary)]">
        Enable Anonymous sign-in in Supabase (Authentication &rarr; Providers
        &rarr; Anonymous) and ensure your URL and anon key in{' '}
        <code className="rounded-md bg-[var(--color-surface-muted)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-text)]">
          .env.local
        </code>{' '}
        match the project.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)]"
      >
        Try again
      </button>
    </div>
  )
}

function TasksLoading() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4">
      <Spinner />
      <p className="text-sm font-medium text-[var(--color-text-secondary)]">
        Loading your tasks...
      </p>
    </div>
  )
}

function TasksError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-danger-soft)]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[var(--color-danger)]" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </div>
      <p className="text-sm font-medium text-[var(--color-danger)]">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-surface-muted)]"
      >
        Retry
      </button>
    </div>
  )
}

export default function App() {
  const { state: authState, retry: retryAuth } = useAuth()
  const userId =
    authState.status === 'ready' ? authState.session.user.id : undefined
  const tasksApi = useTasks(userId)
  const teamMembersApi = useTeamMembers(userId)
  const taskAssigneesApi = useTaskAssignees(userId)
  const activityApi = useAllTaskActivity(userId)

  if (authState.status === 'loading') {
    return <AuthLoading />
  }
  if (authState.status === 'error') {
    return <AuthError message={authState.message} onRetry={retryAuth} />
  }

  if (
    tasksApi.state.status === 'loading' ||
    tasksApi.state.status === 'idle'
  ) {
    return <TasksLoading />
  }
  if (tasksApi.state.status === 'error') {
    return (
      <TasksError
        message={tasksApi.state.message}
        onRetry={() => void tasksApi.reload()}
      />
    )
  }

  return (
    <Board
      tasksApi={tasksApi}
      teamApi={{
        members: teamMembersApi.members,
        addMember: teamMembersApi.addMember,
        updateMember: teamMembersApi.updateMember,
        removeMember: teamMembersApi.removeMember,
      }}
      assigneeApi={{
        assigneeMap: taskAssigneesApi.assigneeMap,
        setAssignees: taskAssigneesApi.setAssignees,
      }}
      activityApi={activityApi}
    />
  )
}
