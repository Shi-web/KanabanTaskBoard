export type TaskComment = {
  id: string
  task_id: string
  user_id: string
  body: string
  created_at: string
}

export type TaskCommentInsert = {
  task_id: string
  body: string
}
