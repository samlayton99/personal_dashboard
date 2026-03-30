# First Principles Dashboard

Personal productivity system for tracking life objectives, daily actions, and automated workflows.
Single-user application. Desktop-only.

## Purpose of Project:
- I want better direct clarity on my goals, plans, progress, and ways to make them actionable. These are life long goals like: Fix partisan politics in america, solve global warming, solve hunger in africa, make the family unit more celebrated and culturally strong (decreasing divorce rates), eliminating the pornography industry, etc. (These are the big problems in the world that I want to solve)
- I want accountability that the actions I am taking today are directly in service of these things
- I want to be able to better organize and prioritize my actions.
- I want to be more efficient in my workflows (automate the things I can and need to automate, this will heavily rely on openclaw, and also I should have a place to monitor what my agents are doing)
- I want low friction updates on my news, worldview, etc.

## Tech Stack

- **Framework**: Next.js 14+ (App Router) on Vercel
- **Database**: Supabase (Postgres + Auth + Realtime + Edge Functions + pgvector)
- **Auth**: Supabase Auth with Google OAuth (single user)
- **Agent Execution**: OpenClaw (local agent running on user's machine, talks to dashboard via API)
- **Styling**: Tailwind CSS + shadcn/ui
- **Language**: TypeScript (strict mode)
- **Theme**: Light mode only. Sleek, minimal, professional.

## Architecture

The dashboard has two layers:
- **Data + Display layer**: Next.js app + Supabase. Stores all data, renders all UI, runs scheduled crons via edge functions.
- **Execution layer**: OpenClaw running locally. Executes agent skills (email triage, todo capture, morning briefs, etc.) and writes results to Supabase via authenticated API routes. The Automations page is a real-time view over all agent activity.

Both layers write to the same `events` table. The dashboard never depends on OpenClaw being online — it degrades gracefully. Cron-based agents (summaries, lock trigger) run as Supabase edge functions, not OpenClaw.

## Project Structure

```
/
├── CLAUDE.md              # This file
├── docs/
│   ├── plan.md            # Full spec: data model, UI layouts, agent behavior, prompts
│   ├── implementation.md  # Phased build plan
│   └── future_automations.md  # OpenClaw skill specs and future workflow designs
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── first-principles/
│   │   │   ├── automations/
│   │   │   ├── world/
│   │   │   ├── inbox/
│   │   │   └── network/
│   │   ├── api/
│   │   │   └── agents/    # API routes that OpenClaw and edge functions call
│   │   └── login/
│   ├── components/
│   │   ├── ui/            # shadcn/ui primitives
│   │   ├── objectives/
│   │   ├── pushes/
│   │   ├── todos/
│   │   ├── actions/
│   │   ├── automations/
│   │   └── layout/
│   ├── lib/
│   │   ├── constants.ts   # All magic numbers and thresholds
│   │   ├── supabase/      # Client, server, admin, middleware
│   │   ├── hooks/         # Shared React hooks (useDndSensors, etc.)
│   │   ├── agents/        # Agent prompt templates and logic
│   │   ├── utils/         # Pure utilities (dates, lock, temp-id, scoring)
│   │   └── __tests__/     # Vitest unit tests
│   └── types/
├── supabase/
│   ├── migrations/
│   └── functions/         # Edge functions (crons for lock, summaries)
└── public/
```

## Key Commands

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run lint         # ESLint
npm test             # Run vitest tests
npm run test:watch   # Run vitest in watch mode
npx supabase start   # Local Supabase
npx supabase db push # Apply migrations
npx supabase gen types typescript --local > src/types/database.ts
```

## Coding Rules

- Functional React components with hooks. No class components.
- Server components by default; `"use client"` only when needed.
- Database types generated from Supabase schema — never hand-write DB types.
- Tailwind utility classes only. No custom CSS files.
- Components: PascalCase. Files: kebab-case.
- Agent prompt templates live in `src/lib/agents/`. Never inline prompts.
- Agent API routes: `/api/agents/[agent-name]`
- Edge functions for scheduled crons: `supabase/functions/`
- Dates stored as UTC. Displayed in user's local timezone.

## Shared Utilities & Patterns

- **Constants**: All magic numbers live in `src/lib/constants.ts`. Never inline numeric thresholds.
- **Temp IDs**: Use `createTempId(prefix)` and `isTempId(id)` from `src/lib/utils/temp-id.ts`. All temp IDs start with `temp_`.
- **DnD sensors**: Use `useDndSensors()` from `src/lib/hooks/use-dnd-sensors.ts` instead of inline sensor setup. Pass `{ distance: N }` to customize activation distance.
- **Date utilities**: `src/lib/utils/dates.ts` for display formatting. `src/lib/utils/lock.ts` for lock-system dates. No duplicate date functions.
- **Supabase clients**: `src/lib/supabase/client.ts` (browser), `src/lib/supabase/server.ts` (server components/actions), `src/lib/supabase/admin.ts` (service role, server-only).
- **Error handling in server actions**: Always throw on error. Never return `{ error: string }` -- callers use try/catch.
- **Tests**: `vitest` for pure utility tests. Test files at `src/lib/__tests__/*.test.ts`.

## Database Tables (Summary)

Core: `objectives`, `pushes`, `todos`, `daily_reflections`, `actions`
Linking: `push_objective_links`, `action_push_links`, `action_objective_links`
System: `events`, `summaries`, `system_state`, `tags`, `objective_tags`
World: `source_registry`, `world_digests`
Inbox: `email_digests`

Read `docs/plan.md` for complete field definitions, relationships, and constraints.

## Design Principles

- Light mode only. Clean whites, subtle grays, one accent color.
- Content-dense but not cluttered. Minimal chrome.
- Drag-and-drop for todos and objective tile ordering.
- Modals and drawers slide from the right, never overlap primary content panels.
- Subtle animations (150-200ms). Optimistic updates — no spinners over 300ms.

## Performance Rules

- **Never await in a loop.** If operations are independent, use `Promise.all()`. This is the single most impactful performance rule for this codebase.
  ```typescript
  // BAD: N sequential round-trips
  for (const item of items) {
    await supabase.from("table").update(data).eq("id", item.id);
  }

  // GOOD: 1 parallel batch
  await Promise.all(items.map((item) =>
    supabase.from("table").update(data).eq("id", item.id)
  ));
  ```
- **Cascade deletes: parallelize link deletions, then delete the entity.** Links are independent of each other but the entity delete must come last.
- **Page-level data fetches must use `Promise.all()`.** See `first-principles/page.tsx` for the pattern (12 queries in parallel).
- **Realtime subscriptions**: Subscribe at the highest common ancestor, not per-tile. One channel per table is better than N channels for N tiles.
- **Middleware**: The `system_state` lock check runs on every navigation. Keep it as a single lightweight query. Don't add more middleware DB queries without caching.

## Do Not

- Do NOT add or rename database tables without confirming with the user.
- Do NOT modify agent prompt templates without confirming with the user.
- Do NOT add dark mode or theme toggles.
- Do NOT install UI libraries beyond shadcn/ui.
- Do NOT use localStorage for persistent state — use Supabase.
- Do NOT auto-move todos between columns without user action.
- Do NOT use `any` in TypeScript.

## Before Starting Work

Read `docs/plan.md` for the full specification before implementing any feature.
Read `docs/implementation.md` for the phased build order.
Read `docs/future_automations.md` for OpenClaw skill designs and future workflow plans.
