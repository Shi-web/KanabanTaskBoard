export const ACTIVITY_KINDS = [
  'created',
  'status_change',
  'fields_updated',
  'assignees_updated',
  'deleted',
  'comment_added',
] as const

export type ActivityKind = (typeof ACTIVITY_KINDS)[number]

export type StatusChangePayload = { from: string; to: string }
export type FieldsUpdatedPayload = { fields: string[] }
export type AssigneesUpdatedPayload = { added: string[]; removed: string[] }
export type DeletedPayload = { title: string }
export type CommentAddedPayload = { body: string }

export type ActivityPayload =
  | Record<string, never>
  | StatusChangePayload
  | FieldsUpdatedPayload
  | AssigneesUpdatedPayload
  | DeletedPayload
  | CommentAddedPayload

export type TaskActivity = {
  id: string
  task_id: string | null
  user_id: string
  kind: ActivityKind
  payload: ActivityPayload
  created_at: string
}
