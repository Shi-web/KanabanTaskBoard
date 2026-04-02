import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { TeamMember, TeamMemberUpdate } from '../types/team'

const PRESET_COLORS = [
  '#6366f1',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ef4444',
  '#06b6d4',
  '#f43f5e',
  '#14b8a6',
]

function randomColor() {
  return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]
}

type Props = {
  open: boolean
  members: TeamMember[]
  onClose: () => void
  onAdd: (name: string, color: string) => Promise<TeamMember>
  onUpdate: (id: string, patch: TeamMemberUpdate) => Promise<TeamMember>
  onRemove: (id: string) => Promise<void>
}

/* ------------------------------------------------------------------ */
/*  Color Picker with Portal Popover                                   */
/* ------------------------------------------------------------------ */

function ColorPicker({
  value,
  onChange,
  size = 'md',
}: {
  value: string
  onChange: (c: string) => void
  size?: 'sm' | 'md'
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const popoverWidth = 196
    let left = rect.left + rect.width / 2 - popoverWidth / 2
    left = Math.max(8, Math.min(left, window.innerWidth - popoverWidth - 8))
    setPos({ top: rect.bottom + 8, left })
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      )
        return
      setOpen(false)
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [open])

  const dot = size === 'sm' ? 24 : 32

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex-none rounded-full transition focus-visible:outline-none"
        style={{
          width: dot,
          height: dot,
          backgroundColor: value,
          boxShadow: `0 0 0 2px var(--color-border)`,
        }}
        aria-label="Pick color"
        aria-expanded={open}
      />
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="color-picker-pop fixed z-[100] rounded-xl border bg-white p-2.5 shadow-lg"
            style={{
              top: pos.top,
              left: pos.left,
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="grid grid-cols-5 gap-2">
              {PRESET_COLORS.map((c) => {
                const selected = value === c
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      onChange(c)
                      setOpen(false)
                    }}
                    className="relative flex items-center justify-center rounded-full transition hover:scale-110 focus-visible:outline-none"
                    style={{
                      width: 32,
                      height: 32,
                      backgroundColor: c,
                      boxShadow: selected
                        ? '0 0 0 2.5px white, 0 0 0 4.5px var(--color-primary)'
                        : 'none',
                    }}
                    aria-label={c}
                  >
                    {selected && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Team Panel                                                         */
/* ------------------------------------------------------------------ */

export function TeamPanel({
  open,
  members,
  onClose,
  onAdd,
  onUpdate,
  onRemove,
}: Props) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(randomColor)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (newlyAddedId) {
      const t = setTimeout(() => setNewlyAddedId(null), 400)
      return () => clearTimeout(t)
    }
  }, [newlyAddedId])

  if (!open) return null

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    setError(null)
    try {
      const member = await onAdd(trimmed, color)
      setNewlyAddedId(member.id)
      setName('')
      setColor(randomColor())
      inputRef.current?.focus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add member')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(member: TeamMember) {
    setEditingId(member.id)
    setEditName(member.name)
    setEditColor(member.color)
  }

  async function saveEdit() {
    if (!editingId) return
    const trimmed = editName.trim()
    if (!trimmed) return
    try {
      await onUpdate(editingId, { name: trimmed, color: editColor })
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update member')
    }
  }

  async function handleRemove(id: string) {
    try {
      await onRemove(id)
      if (editingId === id) setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove member')
    }
  }

  const canAdd = name.trim().length > 0 && !saving

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-panel-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        aria-label="Close panel"
        onClick={onClose}
      />

      <div className="panel-enter relative z-10 w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-slate-900/10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary-soft)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-primary)]" aria-hidden>
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h2
              id="team-panel-title"
              className="font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight text-[var(--color-text)]"
            >
              Team Members
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-text-tertiary)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-ring)]"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Add member row */}
        <form onSubmit={handleAdd} className="flex items-center gap-2.5 px-6 pt-5 pb-4">
          <ColorPicker value={color} onChange={setColor} />
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name..."
            className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-ring)]"
          />
          <button
            type="submit"
            disabled={!canAdd}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed"
            style={{
              backgroundColor: canAdd ? '#0ea5e9' : 'var(--color-surface-muted)',
              color: canAdd ? '#ffffff' : 'var(--color-text-tertiary)',
            }}
          >
            {saving ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              'Add'
            )}
          </button>
        </form>

        {error && (
          <div className="mx-6 mb-3 rounded-xl bg-[var(--color-danger-soft)] px-4 py-2.5 text-sm font-medium text-[var(--color-danger)]">
            {error}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-[var(--color-border)]" />

        {/* Member list */}
        <div className="max-h-72 overflow-y-auto px-3 py-3">
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface-muted)]">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-tertiary)]" aria-hidden>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <p className="mt-3 text-sm font-medium text-[var(--color-text-secondary)]">
                No team members yet
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">
                Add your first team member above
              </p>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {members.map((m) => (
                <li
                  key={m.id}
                  className={`group rounded-xl transition-all ${newlyAddedId === m.id ? 'member-slide-in' : ''}`}
                >
                  {editingId === m.id ? (
                    <div className="flex items-center gap-2.5 px-3 py-2.5">
                      <ColorPicker value={editColor} onChange={setEditColor} size="sm" />
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-ring)]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void saveEdit()
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => void saveEdit()}
                        className="rounded-lg p-1.5 text-[var(--color-success)] transition hover:bg-[var(--color-success-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-ring)]"
                        aria-label="Save"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg p-1.5 text-[var(--color-text-tertiary)] transition hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-ring)]"
                        aria-label="Cancel"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[var(--color-surface-muted)]">
                      <MemberAvatar name={m.name} color={m.color} size="md" />
                      <span className="flex-1 truncate text-sm font-medium text-[var(--color-text)]">
                        {m.name}
                      </span>
                      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => startEdit(m)}
                          className="rounded-lg p-1.5 text-[var(--color-text-tertiary)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-ring)]"
                          aria-label={`Edit ${m.name}`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            <path d="m15 5 4 4" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRemove(m.id)}
                          className="rounded-lg p-1.5 text-[var(--color-text-tertiary)] transition hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-ring)]"
                          aria-label={`Remove ${m.name}`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Shared avatar component                                            */
/* ------------------------------------------------------------------ */

export function MemberAvatar({
  name,
  color,
  size = 'sm',
}: {
  name: string
  color: string
  size?: 'sm' | 'md'
}) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const dim = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs'

  return (
    <span
      className={`inline-flex flex-none items-center justify-center rounded-full font-semibold text-white shadow-sm ${dim}`}
      style={{ backgroundColor: color }}
      title={name}
    >
      {initials}
    </span>
  )
}
