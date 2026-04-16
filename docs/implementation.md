# Implementation Plan

High-level phased build order. Each phase produces a usable increment. Do not skip phases or reorder steps within a phase without confirming with the user.

---

## Phase 0 — Project Scaffolding

**Goal**: Empty shell with auth and database ready.

1. Initialize Next.js 14+ project with App Router, TypeScript (strict), Tailwind CSS.
2. Install and configure shadcn/ui (light mode only).
3. Set up Supabase project. Configure Google OAuth provider.
4. Create Supabase migration for all core tables from `docs/plan.md` §2:
   - `objectives`, `tags`, `objective_tags`
   - `pushes`, `push_objective_links`
   - `todos`
   - `daily_reflections`, `actions`, `action_push_links`, `action_objective_links`
   - `events`, `summaries`, `system_state`
   - `source_registry`, `world_digests` (empty for now, schema ready)
   - `email_digests` (empty for now, schema ready for OpenClaw)
   - Seed `system_state` with initial singleton row (`id=1, is_locked=false`).
5. Generate TypeScript types from Supabase schema.
6. Create Supabase client utilities (browser client, server client, middleware for auth).
7. Build login page with Google OAuth.
8. Create authenticated layout shell with top tab bar (First Principles, Automations, World, Inbox, Network). Only First Principles and Automations need functional routes initially; others show "Coming Soon" placeholder.
9. Deploy to Vercel. Verify auth flow works end to end.

**Deliverable**: Authenticated dashboard shell with empty pages and full database schema in place.

---

## Phase 1 — First Principles Page (Static)

**Goal**: The main dashboard with manual CRUD, no agents yet.

### Step 1.1 — Objectives Panel
1. Build the left-side objectives panel. Vertical scrollable list of tiles.
2. Each tile: name, current_priority (show 0% initially), needle_movement (show 0% initially).
3. Manual drag-and-drop reordering (update `sort_order` on drop).
4. Sort toggle: manual (default), by priority %, by days since last action.
5. Click tile → right-side modal/panel with all editable fields (name, description, ideas, hypothesis, other_notes, tags dropdown with create-new). Save on blur or explicit save button.
6. Tags: dropdown with existing tags, option to create new tag inline.
7. Status toggle (active/inactive) in the detail panel.

### Step 1.2 — To-Dos Panel
1. Build the three-column layout: NOW (left half), IN PROGRESS (top-right quarter), FUTURE (bottom-right quarter).
2. Each column: scrollable list of to-do items with circle checkboxes.
3. Circle click: toggles `is_completed`. Completed items get strikethrough and sink to bottom. Re-click to uncomplete.
4. Drag-and-drop between all three columns (updates `panel` field).
5. Inline text input at bottom of each column. Type + Enter = create to-do in that panel. Minimal friction — just description required.
6. Due date auto-routing: if a to-do is added with a due date > 4 days out, it goes to `future` regardless of which input it was typed into.
7. End-of-day cleanup: scheduled function (or client-side check on load) clears completed items.
8. To-dos created by OpenClaw (source = `openclaw`) should show a subtle visual indicator.

### Step 1.3 — Pushes Panel
1. Build 6-tile grid at the bottom. Top-left tile is the Scoreboard.
2. Scoreboard: show placeholder metrics (streak: 0, actions this week: 0, actions this month: 0).
3. Each push tile: name, linked objectives (as small tags), short description.
4. Retire button (top-right "×" on each tile). Click opens inline expansion: three radio options (Completed / Failed / N/A) + text area for retirement note. Confirm sets push to inactive.
5. Click push tile → right-side detail panel with editable fields (name, description, to-do notes, notes, objectives dropdown multi-select).
6. Creating new pushes: button or empty tile slot. Enforce max 5 active.

### Step 1.4 — History Drawer
1. History button/icon on the First Principles page.
2. Opens right-side drawer overlay.
3. Three tabs inside drawer: Retired Objectives, Retired Pushes, Past Actions.
4. Each tab: scrollable, searchable list. Shows name, dates, retirement info.

**Deliverable**: Fully interactive First Principles page with manual data entry and editing. No AI features yet.

---

## Phase 2 — Nightly Reflection + Actions

**Goal**: The core daily loop — lock, reflect, generate actions, review, unlock.

### Step 2.1 — Lock System
1. Set up Supabase Realtime subscription on `system_state` table in the dashboard layout (`LockWatcher` component).
2. When `is_locked = true`: render blur overlay + reflection input on `/first-principles`. No other interaction possible.
3. `LockWatcher` triggers the lock client-side: one-shot `setTimeout` at 10 PM writes `is_locked = true`. On mount, `shouldTriggerLock()` handles catch-up for missed nights (triggers immediately if >1 day stale, regardless of hour).
4. Middleware enforces the lock server-side: redirects any non-`/first-principles` navigation to `/first-principles` when locked. Middleware never writes `is_locked` — it only reads and redirects.

### Step 2.2 — Reflection Submission
1. Reflection overlay shows: "What did you do today?" (or "What have you been up to since [date]?" if multi-day gap).
2. Text area input. Submit button.
3. On submit: write `daily_reflections` row. Set `covers_since` appropriately.
4. Show "Generating actions..." loading state.

### Step 2.3 — Action Generation Agent
1. Create API route: `/api/agents/nightly-reflection`.
2. This route: pulls context (completed todos from today, last 7 days of actions, active pushes with linked objectives, all active objectives, 4 most recent summaries), constructs the prompt from `src/lib/agents/nightly-reflection.ts`, calls Claude API, parses response.
3. Write 1-5 `actions` rows with `status = 'pending'`.
4. Write corresponding `events` rows with `requires_approval = true`.
5. Return proposed actions to the client.

### Step 2.4 — Action Review UI
1. After generation, the overlay transitions to show proposed actions.
2. Each action card: description (editable), push mappings (editable dropdown), objective mappings (editable dropdown), needle_score (editable slider 0-100).
3. Per-action buttons: Accept, Edit (enables editing), Reject.
4. Users can add custom actions via an inline text input (no limit).
5. Users can reject all proposed actions and submit with zero accepted actions.
6. "Confirm" button at the bottom. On confirm: calls `/api/finalize-actions` via `fetch()` (NOT a server action — server actions block the Next.js router). The API route processes actions, unlocks the dashboard, and returns fresh objectives + todos. The client updates state synchronously from the response.

### Step 2.5 — Computed Fields
1. After actions are confirmed, the `/api/finalize-actions` route fires `recomputeObjectiveMetrics()` in the background (not awaited — it also runs on every page load).
2. Metrics recomputed: `current_priority` and `needle_movement` for all active objectives.
3. Scoreboard metrics (streak, actions this week, actions this month) are computed on page render.

**Deliverable**: Complete daily loop working. Lock → reflect → review actions → unlock. Scoreboard shows real data.

---

## Phase 3 — Automations Page + Cascading Summaries + Agent API

**Goal**: Event stream dashboard, automated summary generation, and API endpoints for OpenClaw.

### Step 3.1 — Automations Page UI
1. Build the automations page layout: Approval Queue (top, collapsible) + Event Feed (main).
2. Approval Queue: shows all events where `requires_approval = true AND status = 'pending_approval'`. Approve/Reject buttons per item.
3. Event Feed: reverse chronological list of all events. Each card shows timestamp, agent badge (colored by agent_name), event type, summary from payload, status.
4. Filters: by agent_name, event_type, date range.
5. Real-time: subscribe to `events` table inserts. New events appear at top of feed with subtle animation.

### Step 3.2 — Weekly Summary Agent
1. Create Supabase edge function scheduled for Sundays at 3:00 AM.
2. Pulls context per `docs/plan.md` §5.1.
3. Calls Claude API with summary prompt.
4. Writes `summaries` row. Deletes oldest weekly if > 4 exist.
5. Writes `summary_generated` event.

### Step 3.3 — Monthly, Quarterly, Yearly Summary Agents
1. Same pattern as weekly but with different schedules, context payloads, and retention rules per `docs/plan.md` §5.2–5.4.
2. Monthly: 1st of each month.
3. Quarterly: 1st of Jan/Apr/Jul/Oct.
4. Yearly: January 1st.
5. Each writes appropriate events.

### Step 3.4 — Progress Summary Agents
1. After weekly summary is generated, trigger objective and push progress summary regeneration.
2. For each active objective: pull its full fields + 90 days of linked actions + recent summaries → generate 2-3 paragraph progress summary → update the objective row.
3. For each active push: similar process → generate 2 paragraph progress summary.

### Step 3.5 — OpenClaw API Endpoints
1. Create `/api/agents/add-todo` — accepts: `{ description, push_id?, priority?, panel?, due_date?, api_key }`. Validates key, writes todo with `source = 'openclaw'`, writes `todo_added` event. This is what OpenClaw's quick-capture skill calls.
2. Create `/api/agents/write-event` — generic event writer. Accepts: `{ agent_name, event_type, payload, requires_approval?, api_key }`. Validates key, writes event. This is the catch-all endpoint for any OpenClaw skill that needs to log activity.
3. Create `/api/agents/get-context` — returns current active pushes, active objectives, recent actions, recent todos, system state. Protected by API key. This lets OpenClaw skills read dashboard state for context-aware behavior.
4. Create `/api/agents/email-digest` — accepts triage results, writes to `email_digests` table, writes event.
5. Add `AGENT_API_KEY` to Vercel environment variables. Document in `.env.example`.

**Deliverable**: Full automation visibility. Summaries generate on schedule. Event feed shows all system activity in real-time. OpenClaw can write to and read from the dashboard.

---

## Phase 4 — World Page

**Goal**: Curated daily digest replacing social media/news consumption.

1. Build source registry UI (bottom collapsible section): list of sources with name, type, URL, active toggle, add-new button.
2. Build directions editor (top text area): user writes what to prioritize and look for.
3. Create daily digest agent (edge function, runs once at a chosen morning time):
   - Pull content from active sources (RSS parsing, X API for X accounts, news APIs).
   - Feed content + directions to Claude API.
   - Generate markdown digest capped at 15 minutes estimated read time.
   - Write `world_digests` row. Write `digest_generated` event.
4. Render today's digest as formatted markdown in the main content area.
5. Show estimated read time.

**Deliverable**: Daily curated 15-minute news/information digest.

---

## Phase 5 — OpenClaw Skills + Inbox Page

**Goal**: First wave of OpenClaw automations live, inbox page functional.

### Step 5.1 — OpenClaw Setup
1. Install and configure OpenClaw locally.
2. Connect WhatsApp or iMessage as the messaging channel.
3. Configure OpenClaw with the dashboard's API key and endpoint URLs.

### Step 5.2 — Quick-Capture Todo Skill
1. Build OpenClaw skill: user texts "todo: [description]" → skill parses description, calls `/api/agents/add-todo`, confirms via message reply.
2. Optionally parse push context from message (e.g., "todo: call bishop, church").

### Step 5.3 — Email Triage Skill
1. Build OpenClaw skill: runs 3x daily on cron, reads Gmail via API, triages emails, calls `/api/agents/email-digest`, sends top 5 urgent items via WhatsApp.
2. Support inline replies: user texts "reply to #3: [message]" → skill drafts and sends via Gmail.

### Step 5.4 — Morning Brief Skill
1. Build OpenClaw skill: runs at 7am, calls `/api/agents/get-context` for today's data, pulls Google Calendar, assembles brief, sends via WhatsApp.

### Step 5.5 — Reflection Nudge Skill
1. Build OpenClaw skill: runs at 9:45pm, sends WhatsApp reminder about upcoming reflection time.

### Step 5.6 — Inbox Page UI
1. Build inbox page as a view over `email_digests` table.
2. Context filter tabs (church, PROD, research, Stanford, family, other).
3. Two sorted lists per view: by urgency, by importance.
4. Each entry links to Gmail thread.

**Deliverable**: Core OpenClaw automations running. Todo capture from phone, email triage, morning briefs, and inbox page all functional.

---

## Phase 6+ — Future

See `docs/future_automations.md` for the full automation roadmap including:
- Meeting follow-up agent
- Church executive secretary agent
- Network maintenance agent
- Research paper scout
- PROD deal flow tracker
- Focus guardian

---

## Verification Checklist

Before marking any phase complete, verify:

- [ ] All database tables referenced in that phase have migrations applied.
- [ ] TypeScript types are regenerated from schema.
- [ ] All new UI components follow the design principles in CLAUDE.md (light mode, Tailwind only, shadcn/ui).
- [ ] All agent interactions write events to the `events` table.
- [ ] No `any` types in TypeScript.
- [ ] Real-time subscriptions work (test by opening two browser tabs).
- [ ] Auth is enforced on all routes and API endpoints.
- [ ] Agent API routes validate `AGENT_API_KEY` before processing.
- [ ] Deploy to Vercel and verify production build succeeds.
