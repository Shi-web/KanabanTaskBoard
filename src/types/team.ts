export type TeamMember = {
  id: string
  name: string
  color: string
  user_id: string
  created_at: string
}

export type TeamMemberInsert = {
  name: string
  color?: string
  user_id: string
}

export type TeamMemberUpdate = Partial<Pick<TeamMember, 'name' | 'color'>>

export type TaskAssignee = {
  id: string
  task_id: string
  member_id: string
  user_id: string
  created_at: string
}
