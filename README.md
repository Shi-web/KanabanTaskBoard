# Flowboard — Kanban task board

React + Vite + TypeScript + Tailwind CSS + Supabase. Guest users sign in anonymously; tasks are scoped with Row Level Security to `auth.uid()`.

## Live Demo

- [Flowboard](https://kanaban-task-board-kappa.vercel.app/)

## Features

- Kanban board with four default columns: **To Do**, **In Progress**, **In Review**, **Done**
- Drag-and-drop task movement across columns with persisted status updates
- Task CRUD with title, description, priority, due date, and status
- Automatic guest authentication using Supabase anonymous sign-in
- Row Level Security (RLS) for per-user data isolation
- Team member management (name + color) and multi-assignee support per task
- Task comments in the task detail dialog with timestamps
- Global activity panel showing task events (create, updates, assignees, comments, delete)
- Search tasks by title/description
- Board summary stats (total, done, overdue) and due-date indicators on cards
- Loading, empty, and error states across key screens

## Architecture / Tech Decisions

### Stack choice

- **React + TypeScript + Vite** for fast iteration, strong type-safety, and quick production builds.
- **Supabase** for database, authentication, and security policies without running a custom backend service.
- **Tailwind CSS** for consistent styling primitives and a cleaner UI system.

### Data and auth model

- The app creates/recovers an **anonymous guest session** on startup using Supabase Auth.
- Every row is scoped by `user_id` and protected with **Row Level Security (RLS)** (`auth.uid()`), so each guest can only access their own data.
- This keeps the architecture simple while maintaining tenant-like data isolation.

### Feature decomposition

- `tasks` is the core entity (title, status, optional metadata like priority/due date).
- Team and assignment concerns are normalized through:
  - `team_members` (member profile data)
  - `task_assignees` (many-to-many task/member relationship)
- Collaboration history is modeled explicitly through:
  - `task_comments` for discussion threads
  - `task_activity` for timeline events (status changes, edits, assignment changes, comments, deletion records)

### UI and state strategy

- Data access is encapsulated in focused hooks (`useTasks`, `useTeamMembers`, `useTaskAssignees`, `useTaskComments`, `useTaskActivity`) to separate data concerns from presentation.
- Drag-and-drop behavior is handled with `@dnd-kit` for smooth interactions and clear status transitions.
- Components are split by responsibility (`Board`, `Column`, `TaskCard`, `TaskDialog`, `TeamPanel`, `ActivityPanel`) to keep UI modules maintainable.
- Explicit loading/ready/error state unions are used in hooks to make asynchronous flows predictable and type-safe.

### Deployment and operations

- The app is deployed as a **static frontend** (`vite build` -> `dist`) with runtime configuration via `VITE_*` environment variables.
- No server process is required for hosting, reducing operational complexity and cost.
- Secret handling follows least exposure: only Supabase public anon key is used client-side; service role keys are never shipped to the frontend.

### Tradeoffs

- Direct-to-Supabase frontend calls speed up development and reduce infrastructure overhead, but move more data-access logic into the client.
- Anonymous auth minimizes onboarding friction for reviewers/users, but does not represent full account lifecycle features (email identity, account recovery, role hierarchies).
- Activity and comments are persisted for auditability and UX context, with schema choices optimized for clarity over heavy analytics workloads.

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
