# Flowboard — Kanban task board

React + Vite + TypeScript + Tailwind CSS + Supabase. Guest users sign in anonymously; tasks are scoped with Row Level Security to `auth.uid()`.

## Prerequisites

- Node.js 18+ (20.19+ recommended for latest tooling)
- A [Supabase](https://supabase.com) project with:
  - **Authentication → Providers → Anonymous** enabled
  - A `tasks` table and RLS policies as in your assessment schema
  - A `team_members` table and a `task_assignees` table (see SQL below)

## Setup

1. Clone the repo and install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` in the project root (copy from `.env.example`):

   ```bash
   cp .env.example .env.local
   ```

3. Set variables from **Supabase → Project Settings → API**:

   - `VITE_SUPABASE_URL` — Project URL
   - `VITE_SUPABASE_ANON_KEY` — `anon` `public` key (never commit the **service role** key)

4. Run the app:

   ```bash
   npm run dev
   ```

5. Production build:

   ```bash
   npm run build
   npm run preview
   ```

## Supabase Tables

Run the following SQL in **Supabase → SQL Editor** to create the team and assignee tables:

```sql
-- Team members
create table team_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  color text not null default '#6366f1',
  created_at timestamptz not null default now()
);

alter table team_members enable row level security;
create policy "Users manage own members"
  on team_members for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Task assignees (many-to-many join table)
create table task_assignees (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  member_id uuid not null references team_members(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique(task_id, member_id)
);

alter table task_assignees enable row level security;
create policy "Users manage own assignees"
  on task_assignees for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Task activity log (task_id is nullable so deletion entries survive cascade)
create table task_activity (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  kind text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table task_activity enable row level security;
create policy "Users manage own activity"
  on task_activity for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index task_activity_task_time on task_activity (task_id, created_at desc);
```

## Deploy (e.g. Vercel)

- **Framework preset:** Vite  
- **Build command:** `npm run build`  
- **Output directory:** `dist`  
- Add the same `VITE_*` environment variables in the host’s project settings.

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Dev server               |
| `npm run build`| Typecheck + production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint                   |
