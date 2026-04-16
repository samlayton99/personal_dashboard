# First Principles Dashboard — Complete Specification

This document is the single source of truth for all features, data models, UI layouts, agent behaviors, and system rules. Read this fully before implementing any feature.

---

## 1. Core Concepts

The system is built on four cascading data types:

| Type | Volume | Lifecycle | Who Creates |
|------|--------|-----------|-------------|
| **Objectives** | ~30 lifetime | Years | User (manual) |
| **Pushes** | ~20/year, 5 active | Weeks–months | User (manual) |
| **Actions** | 1–5/day | Daily | Agent (from nightly reflection) |
| **To-dos** | 5–10/day | Hours–days | User (manual or via text/agent) |

Everything maps upward: to-dos can optionally link to pushes; actions link to pushes and objectives; pushes link to objectives.

### 1.1 Two-Layer Architecture

The system has two execution layers:

**Dashboard layer** (Next.js + Supabase): Stores all data, renders all UI, runs cascading summary crons via Supabase edge functions. The nightly lock trigger runs client-side (`LockWatcher` component: realtime subscription + one-shot `setTimeout` at 10 PM, with catch-up logic for missed nights). This layer is always available even if OpenClaw is offline.

**OpenClaw layer** (local agent): Executes task-oriented skills — email triage, todo capture via text, morning briefs, meeting follow-ups, etc. OpenClaw reads from and writes to Supabase via authenticated API routes (`/api/agents/*`). Every action OpenClaw takes writes an event to the `events` table, making all agent activity visible on the Automations page.

The contract: OpenClaw skills call dashboard API routes. Dashboard API routes validate input, write to Supabase, and return results. The dashboard never calls OpenClaw directly — it only reads what OpenClaw has written. This means OpenClaw can be offline, restarted, or replaced without breaking anything.

See `docs/future_automations.md` for the full catalog of planned OpenClaw skills.

---

## 2. Database Schema

### 2.1 `objectives`

| Column | Type | Notes |
|--------|------|-------|
| id | text | Format: `objective_<unix_timestamp_ms>`. Generated on creation. |
| name | text | Short title |
| description | text | Long text |
| ideas | text | Long text |
| hypothesis | text | Long text |
| other_notes | text | Long text |
| status | enum: `active`, `inactive` | Default: `active` |
| retirement_note | text | Nullable. Filled when retired. |
| progress_summary | text | Agent-generated. 2–3 paragraphs max. Regenerated periodically for active objectives. |
| current_priority | float | Computed: % of actions in past 3 months attributed to this objective |
| needle_movement | float | Computed: median "move the needle" score of actions in past 3 months |
| sort_order | integer | For manual drag-and-drop ordering |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

### 2.2 `tags`

| Column | Type | Notes |
|--------|------|-------|
| id | serial | Primary key |
| name | text | Unique. Short text. |

### 2.3 `objective_tags`

| Column | Type | Notes |
|--------|------|-------|
| objective_id | text | FK → objectives.id |
| tag_id | integer | FK → tags.id |
| | | Composite primary key |

### 2.4 `pushes`

| Column | Type | Notes |
|--------|------|-------|
| id | text | Format: `push_<unix_timestamp_ms>` |
| name | text | Short title |
| description | text | Long text |
| todos_notes | text | Long text — general push-level to-do notes |
| notes | text | Long text |
| status | enum: `active`, `inactive` | Default: `active`. Max 5 active at any time. |
| retirement_reason | enum: `completed`, `failed`, `na` | Nullable. Set when retiring. |
| retirement_note | text | Nullable. Explanation. |
| progress_summary | text | Agent-generated. 2 paragraphs max. |
| sort_order | integer | For ordering in push tiles |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

**Constraint**: Application-level enforcement that no more than 5 pushes have `status = 'active'` at once.

### 2.5 `push_objective_links`

| Column | Type | Notes |
|--------|------|-------|
| push_id | text | FK → pushes.id |
| objective_id | text | FK → objectives.id |
| | | Composite primary key |

### 2.6 `todos`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Default: gen_random_uuid() |
| description | text | Short text |
| push_id | text | Nullable. FK → pushes.id. Optional link. |
| source | enum: `manual`, `agent`, `openclaw` | Default: `manual`. Tracks how the to-do was created. |
| priority | float | 1.0–10.0 scale |
| panel | enum: `now`, `in_progress`, `future` | Determines column placement |
| is_completed | boolean | Default: false |
| due_date | date | Nullable. Defaults to current date if not specified. |
| sort_order | integer | Within its panel |
| date_added | timestamptz | Auto |
| date_completed | timestamptz | Nullable. Set when checked off. |

**Rules**:
- Items with `due_date` > 4 days from now automatically go to `future` panel.
- Completed items sink to bottom of their panel list.
- Completed items are visible until the next reflection unlock, at which point they are flushed from the board (the post-unlock API response returns only incomplete todos). The page query also filters: completed items are only shown if `date_completed >= getLastLockBoundary()` (the most recent 10 PM).
- Users can drag-and-drop between panels, overriding automatic placement.
- Each panel has an inline text input at the bottom for quick-adding new to-dos.

### 2.7 `daily_reflections`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Default: gen_random_uuid() |
| date | date | Unique. The date being reflected on. |
| raw_text | text | User's written summary |
| is_escape_hatch | boolean | True if text is very brief (< 50 chars or 1 sentence) |
| covers_since | date | The earliest unrecorded date this reflection covers (for multi-day catch-ups) |
| created_at | timestamptz | Auto |

### 2.8 `actions`

| Column | Type | Notes |
|--------|------|-------|
| id | text | Format: `action_<unix_timestamp_ms>` |
| reflection_id | uuid | FK → daily_reflections.id |
| date | date | The date the action occurred |
| description | text | Short description of what was done |
| needle_score | integer | 0–100. Agent-generated, user-editable. How much this moved the needle. |
| status | enum: `pending`, `accepted`, `edited` | Agent proposes as `pending`. User reviews. |
| created_at | timestamptz | Auto |

### 2.9 `action_push_links`

| Column | Type | Notes |
|--------|------|-------|
| action_id | text | FK → actions.id |
| push_id | text | FK → pushes.id |
| | | Composite primary key |

### 2.10 `action_objective_links`

| Column | Type | Notes |
|--------|------|-------|
| action_id | text | FK → actions.id |
| objective_id | text | FK → objectives.id |
| | | Composite primary key |

### 2.11 `events`

The backbone of the automation system. Every agent action is an event.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Default: gen_random_uuid() |
| agent_name | text | e.g., `nightly_reflection`, `weekly_summary`, `email_triage`, `morning_brief`, `openclaw_todo` |
| event_type | text | e.g., `action_proposed`, `summary_generated`, `todo_added`, `email_digest_created`, `morning_brief_sent` |
| payload | jsonb | Flexible. Contains event-specific data. |
| status | enum: `executed`, `pending_approval`, `approved`, `rejected` | |
| requires_approval | boolean | If true, shows in approval queue on automations page |
| created_at | timestamptz | Auto |

### 2.12 `summaries`

Cascading summary documents generated by agents.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Default: gen_random_uuid() |
| type | enum: `weekly`, `monthly`, `quarterly`, `yearly` | |
| period_start | date | First day of the period |
| period_end | date | Last day of the period |
| content | text | Full markdown content |
| created_at | timestamptz | Auto |

**Retention rules** (enforced by the agent that creates them):
- Weekly: keep 4 most recent. Delete oldest when 5th is created.
- Monthly: keep 3 most recent. Delete oldest when 4th is created.
- Quarterly: keep 4 most recent. Delete oldest when 5th is created.
- Yearly: keep all. Never delete.

Total maintained summary documents: up to 13 at any time (4 + 3 + 4 + 2+).

### 2.13 `system_state`

Singleton row. Controls global dashboard state.

| Column | Type | Notes |
|--------|------|-------|
| id | integer | Always 1. Primary key. |
| is_locked | boolean | True when nightly reflection is required |
| locked_at | timestamptz | When the lock was triggered |
| last_reflection_date | date | Date of most recent completed reflection |

### 2.14 `source_registry` (World page — Phase 4)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Default: gen_random_uuid() |
| name | text | Display name of source |
| source_type | enum: `x_account`, `rss`, `news_site`, `substack` | |
| url | text | Feed URL, profile URL, etc. |
| is_active | boolean | Default: true |
| created_at | timestamptz | Auto |

### 2.15 `world_digests` (World page — Phase 4)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Default: gen_random_uuid() |
| date | date | Unique. One digest per day. |
| directions | text | User's current "what to look for" instructions |
| content | text | Markdown. The generated digest. |
| estimated_read_minutes | integer | Must be ≤ 15 |
| created_at | timestamptz | Auto |

### 2.16 `email_digests` (Inbox page — powered by OpenClaw email triage agent)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Default: gen_random_uuid() |
| created_at | timestamptz | Auto |
| context | enum: `church`, `prod`, `research`, `stanford`, `family`, `other` | Life context bucket |
| entries | jsonb | Array of `{ subject, sender, snippet, urgency (1-10), importance (1-10), gmail_id, gmail_thread_id }` |

One row per triage run. The Inbox page renders the most recent entries, filterable by context.

---

## 3. Page Layouts

### 3.1 Navigation

Top-level horizontal tab bar: **First Principles** | **Automations** | **World** | **Inbox** | **Network**

Plus a "History" button (not a tab) accessible from the First Principles page that opens a right-side drawer showing retired objectives, pushes, and past actions.

### 3.2 First Principles Page

This is the main dashboard. Layout is a fixed grid (not scrollable page — panels scroll internally).

```
┌──────────────────────────────────────────────────────────┐
│  Tab Bar                                                 │
├────────────┬─────────────────────────────────────────────┤
│            │                                             │
│ Objectives │         To-Dos Panel (40% width)            │
│  Panel     │  ┌──────────────┬────────────────────┐      │
│  (left)    │  │              │                    │      │
│            │  │    NOW       │    IN PROGRESS     │      │
│  Scrollable│  │              │                    │      │
│  tile list │  │  (left half) │   (top-right       │      │
│            │  │              │    quarter)        │      │
│  Each tile │  │              ├────────────────────┤      │
│  shows:    │  │              │                    │      │
│  - Name    │  │              │    FUTURE          │      │
│  - Priority│  │              │                    │      │
│  - Needle  │  │              │   (bottom-right    │      │
│  movement  │  │              │    quarter)        │      │
│            │  └──────────────┴────────────────────┘      │
├────────────┴─────────────────────────────────────────────┤
│  Pushes Panel (bottom, full width)                       │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐│
│  │Scoreboard│ Push 1   │ Push 2   │ Push 3   │ Push 4   ││
│  │  Tile    │          │          │          │          ││
│  │          │          │          │          │          ││
│  ├──────────┤          │          │          ├──────────┤│
│  │          │          │          │          │ Push 5   ││
│  │          │          │          │          │          ││
│  └──────────┴──────────┴──────────┴──────────┴──────────┘│
└──────────────────────────────────────────────────────────┘
```

**Approximate proportions**:
- Objectives panel: left ~25% of screen width, full height minus pushes
- To-dos panel: right ~75% of remaining width, full height minus pushes
- Pushes panel: bottom ~30% of screen height, full width
- Pushes grid: 6 tiles. Top-left is the scoreboard. Remaining 5 are active pushes.

**Objectives panel details**:
- Vertically scrollable stack of tiles.
- Each tile shows: name, current_priority (%), needle_movement (%).
- Tiles are manually sortable via drag-and-drop.
- Sort toggle options available: manual (default), by priority % descending, by days since last action ascending (most neglected first).
- Clicking a tile opens a **right-side modal/panel** (not overlapping other panels) with full editable fields: name, description, ideas, hypothesis, other_notes, tags (dropdown with create-new option), progress_summary (read-only), most recent actions (read-only), status toggle.

**To-dos panel details**:
- Three sub-panels: NOW (left half), IN PROGRESS (top-right quarter), FUTURE (bottom-right quarter).
- Each sub-panel has its own scrollable list of to-do items.
- Each to-do item has: a circle checkbox on the left, description text, optional push link shown as a small tag.
- Items added by OpenClaw show a small indicator (e.g., a subtle icon or different-colored dot) so user knows the source.
- Clicking the circle crosses off the item (strikethrough + moves to bottom of list). Clicking again un-crosses.
- Drag-and-drop between all three panels.
- Each panel has a small text input at the bottom for inline quick-add. Just type and hit enter — defaults: panel = the panel it's in, due_date = today (or 5+ days out for future), priority = 5.
- Completed items are flushed after the nightly reflection unlock (post-unlock API returns only incomplete todos).

**Pushes panel details**:
- 6-tile grid. Top-left tile is the **Scoreboard** (reserved slot).
- Scoreboard initially shows: reflection streak (consecutive days), actions this week, total actions this month.
- Each push tile shows: name, linked objectives (as small tags), brief description.
- Each push tile has a small "×" or retire button in the top-right corner.
- Clicking retire opens a smooth inline expansion with three options: "Successfully Completed", "Failed", "N/A" — plus a text area for the retirement note. Confirming sets the push to inactive.
- Clicking a push tile (not the retire button) opens the push detail view (right-side panel, same pattern as objectives) with editable fields: name, description, to-do notes, notes, objective links (dropdown).

**History drawer**:
- Accessible via a button/link on the First Principles page (e.g., a clock/history icon).
- Opens a right-side drawer (overlays content, full height).
- Shows tabs within the drawer: Retired Objectives, Retired Pushes, Past Actions.
- Each list is scrollable and searchable. Items show name, dates, retirement reason/note where applicable.

### 3.3 Automations Page

Mission control for all agent activity — both dashboard-native agents (summaries, lock, computed fields) and OpenClaw skills (email triage, todo capture, morning briefs, etc.).

**Layout**:
```
┌──────────────────────────────────────────────┐
│  Approval Queue (top, collapsible)           │
│  Shows events with requires_approval=true    │
│  and status='pending_approval'               │
│  Each item: approve / reject buttons         │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│  Event Feed (main area, scrollable)          │
│  Reverse chronological.                      │
│  Filterable by: agent_name, event_type, date │
│  Real-time updates via Supabase Realtime     │
└──────────────────────────────────────────────┘
```

Each event card shows: timestamp, agent name (with a colored badge), event type, a human-readable summary extracted from payload, and status. Agent badges should use consistent colors so you can visually scan which agents are active (e.g., `email_triage` = blue, `nightly_reflection` = purple, `weekly_summary` = green, `openclaw_todo` = orange).

### 3.4 World Page (Phase 4)

```
┌──────────────────────────────────────────────┐
│  Directions (editable text area at top)       │
│  "What to prioritize, look for, sort by"     │
├──────────────────────────────────────────────┤
│  Today's Digest (generated once daily)       │
│  Markdown rendered content                   │
│  Estimated read time shown                   │
│  Max 15 minutes of material                  │
├──────────────────────────────────────────────┤
│  Source Registry (collapsible bottom section) │
│  List of sources with on/off toggles         │
│  Add new source button                       │
└──────────────────────────────────────────────┘
```

### 3.5 Inbox Page (Phase 5+)

Not a rebuilt email client. A priority-sorted dashboard view over the `email_digests` table, populated by the OpenClaw email triage agent.

Shows the most recent triage results, with view filters for life contexts (church, PROD, research, Stanford, family, other). Within each view, emails are sorted into two lists: by urgency and by importance. Each entry shows: sender, subject, one-line summary, urgency score, importance score.

Clicking an email entry could link directly to the Gmail thread (via `gmail_thread_id` URL).

### 3.6 Network Page (Phase 5+)

Initially: embedded Google Sheet via iframe.

Future evolution: a relationship tracker backed by a `contacts` table, populated by OpenClaw's network maintenance agent. Shows last contact date, relationship context, and surfaces people who need follow-up.

---

## 4. Nightly Reflection System

### 4.1 Lock Mechanism

1. **Trigger**: `LockWatcher` (client-side, in dashboard layout) sets `system_state.is_locked = true` via:
   - One-shot `setTimeout` at 10 PM local time (normal nightly trigger).
   - Mount-time check using `shouldTriggerLock()` (catch-up: if `last_reflection_date` is >1 day stale, triggers immediately regardless of hour).
2. **Enforcement**: Middleware redirects all non-`/first-principles` navigation when locked. `LockWatcher` reacts to realtime `system_state` changes for instant UI response. The lock overlay covers the entire page — zero functionality until unlocked.
3. **Effect**: An overlay appears with a text input area and the prompt: "What did you do today?" (or "What have you been up to since [last_reflection_date]?" if multiple days missed).
4. **Escape hatch**: User can write as little as one sentence. The system still processes it.
5. **Multi-day gaps**: One reflection covers all missed days. The reflection's `covers_since` field is set to the day after `last_reflection_date`. Missed days are not individually backfilled.
6. **Unlock**: After the user submits and reviews generated actions, `/api/finalize-actions` sets `system_state.is_locked = false`, updates `last_reflection_date` via `getEffectiveReflectionDate()` (before 10 PM = yesterday so tonight's lock still fires; at/after 10 PM = today), and returns fresh objectives + todos in the response.

### 4.2 Action Generation Flow

1. User submits reflection text.
2. System writes a `daily_reflections` row.
3. System calls the action generation agent (Claude API via `/api/agents/nightly-reflection`).
4. Agent returns 1-5 proposed actions, each with:
   - description (short text)
   - push mappings (push IDs)
   - objective mappings (objective IDs)
   - needle_score (0-100)
5. Each action is written as an `actions` row with `status = 'pending'`.
6. Each action also generates an `events` row with `event_type = 'action_proposed'`, `requires_approval = true`.
7. The overlay transitions to a review screen showing the proposed actions.
8. User can: accept each action as-is, edit the description/mappings/score, reject an action, or add custom actions via inline text input.
9. User can submit with zero accepted actions (all rejected) — the button shows "Unlock".
10. On confirmation, the client calls `/api/finalize-actions` via `fetch()` (NOT a server action — React transitions from server actions block navigation). The API route processes actions, unlocks, and returns fresh data. `handleUnlock` updates state synchronously — completed todos are flushed, objectives refresh.

### 4.3 Action Generation Agent — Context Payload

```
System: You are an action tracking agent for a personal productivity system.
Given the user's daily reflection, their completed to-dos, and their current
objectives and pushes, generate 1-5 discrete actions that summarize what
the user accomplished. Each action maps to relevant pushes and objectives.
Rate each action 0-100 on how much it moved the needle toward its linked objectives.

Output format: JSON array of actions.
[{
  "description": "...",
  "push_ids": ["push_..."],
  "objective_ids": ["objective_..."],
  "needle_score": 0-100
}]

Context provided:
- User's reflection text
- Today's completed to-dos (crossed off items)
- Last 7 days of actions (descriptions, scores, mappings)
- Current 5 active pushes (id, name, description, linked objective IDs)
- All active objectives (id, name, description)
- Most recent weekly summary
- Most recent monthly summary
- Most recent quarterly summary
- Most recent yearly summary
```

This totals ~4 summary documents + structured data. Well within token limits.

---

## 5. Cascading Summary System

There are up to 13 maintained summary documents at any time. Agents generate them on schedule and enforce retention via round-robin deletion.

### 5.1 Weekly Summary

**Schedule**: Sundays at 3:00 AM.
**Context payload**:
- Past week's actions (all actions since previous Sunday)
- Previous 4 weekly summaries
- Most recent monthly summary
- Current active pushes (names, descriptions, linked objectives)
- Current active objectives (names, descriptions)

**Output**: Markdown summary of the week. What was accomplished, which objectives saw movement, which pushes were active, patterns.
**Retention**: Keep 4 most recent. On creation of the 5th, delete the oldest.

### 5.2 Monthly Summary

**Schedule**: 1st of each month at 3:00 AM.
**Context payload**:
- Most recent 4 weekly summaries
- Previous 3 monthly summaries
- Most recent quarterly summary
- Current active pushes and objectives

**Output**: Markdown summary of the month.
**Retention**: Keep 3 most recent. Delete oldest on 4th creation.

### 5.3 Quarterly Summary

**Schedule**: 1st of Jan, Apr, Jul, Oct at 3:00 AM.
**Context payload**:
- Most recent 3 monthly summaries
- Previous 4 quarterly summaries
- Most recent yearly summary
- Current active pushes and objectives

**Output**: Markdown summary of the quarter.
**Retention**: Keep 4 most recent. Delete oldest on 5th creation.

### 5.4 Yearly Summary

**Schedule**: January 1st at 3:00 AM.
**Context payload**:
- Most recent 4 quarterly summaries
- Previous yearly summary (most recent)
- All active objectives (full detail)
- Current active pushes

**Output**: Markdown summary of the year.
**Retention**: Keep all. Never delete.

### 5.5 Summary Agent Prompt Template

```
System: You are a reflective summary agent for a personal productivity system.
Given the context below, generate a [PERIOD] summary in markdown format.
Cover: key accomplishments, objective progress, push activity, patterns,
areas that were neglected, and forward-looking observations.
Keep it concise but substantive. [WEEKLY: 1-2 pages. MONTHLY: 2-3 pages.
QUARTERLY: 3-4 pages. YEARLY: 4-5 pages.]

[Insert context payload here based on period type]
```

---

## 6. Computed Fields

These fields are recalculated periodically (after each nightly reflection, or on a daily schedule):

**Objective `current_priority`**: Count of actions in the past 90 days linked to this objective, divided by total actions in the past 90 days. Expressed as a percentage.

**Objective `needle_movement`**: Median `needle_score` of all actions linked to this objective in the past 90 days.

**Objective `progress_summary`**: Agent-generated 2-3 paragraph summary. Regenerated weekly (after weekly summary is generated). Context: the objective's full fields + most recent 90 days of actions linked to it + most recent weekly and monthly summaries.

**Push `progress_summary`**: Agent-generated 2 paragraph summary. Same schedule and similar context scoped to the push.

**Scoreboard tile metrics**:
- Reflection streak: consecutive days with a reflection (count from today backwards where `daily_reflections` rows exist without gaps).
- Actions this week: count of actions with `date` in current week.
- Actions this month: count of actions with `date` in current month.

---

## 7. Event System Design

### 7.1 Event Types

| Event Type | Agent | Requires Approval | Description |
|------------|-------|--------------------|-------------|
| `lock_triggered` | `system` | No | Dashboard locked at 10pm |
| `lock_released` | `system` | No | Dashboard unlocked after reflection |
| `action_proposed` | `nightly_reflection` | Yes | Action generated from reflection |
| `action_accepted` | `nightly_reflection` | No | User accepted proposed action |
| `action_edited` | `nightly_reflection` | No | User edited proposed action |
| `action_rejected` | `nightly_reflection` | No | User rejected proposed action |
| `summary_generated` | `weekly_summary` / `monthly_summary` / etc. | No | Summary document created |
| `computed_fields_updated` | `system` | No | Priority, needle scores recalculated |
| `todo_added` | `openclaw_todo` | No | To-do added via OpenClaw text |
| `email_digest_created` | `email_triage` | No | Email triage run completed |
| `morning_brief_sent` | `morning_brief` | No | Morning brief delivered via WhatsApp |
| `reflection_nudge_sent` | `reflection_nudge` | No | 9:45pm WhatsApp reminder |
| `digest_generated` | `world_feed` | No | Daily world digest created |
| `meeting_followup_created` | `meeting_followup` | No | Post-meeting artifacts generated |
| `push_retired` | `system` | No | User retired a push |
| `objective_retired` | `system` | No | User retired an objective |

### 7.2 Payload Convention

All event payloads are JSON objects. They must always include:
```json
{
  "summary": "Human-readable one-line description of what happened",
  ...event-specific fields
}
```

The `summary` field is what the automation page displays. Additional fields carry structured data relevant to the event type (e.g., action IDs, summary content, etc.).

---

## 8. Authentication & Security

- Supabase Auth with Google OAuth provider.
- Single user. After initial setup, restrict sign-up (disable new user registration in Supabase dashboard).
- Row-level security (RLS) on all tables scoped to the authenticated user's ID.
- **Dashboard API routes** (`/api/agents/*`) are protected via a shared API key stored as an environment variable (`AGENT_API_KEY`). OpenClaw includes this key in its requests. Edge functions use the Supabase service role key.
- This API key approach is simple and appropriate for a single-user system. The key is stored in OpenClaw's local config and in Vercel's environment variables.
- API routes validate the key before processing. No other authentication is required for agent-to-dashboard communication.

---

## 9. Real-Time Behavior

Supabase Realtime subscriptions are used for:
- `system_state` changes (lock/unlock propagation — immediate UI update)
- `events` table inserts (automation page live feed)
- `todos` changes (if editing from another device or agent-added via OpenClaw)
- `actions` status changes (during reflection review flow)
- `email_digests` inserts (inbox page updates when new triage completes)

---

## 10. Future Considerations

- **pgvector**: Embed objectives, notes, and actions for semantic search. Enables smarter agent context selection as data grows.
- **MCP servers**: Wrap the Supabase API in MCP servers so any agent framework can interact via standardized protocol.
- **Network evolution**: Migrate from Google Sheets embed to a `contacts` table powered by OpenClaw's network maintenance agent.
- **Mobile**: Not planned. Desktop only. OpenClaw's WhatsApp/iMessage interface is the mobile interaction point.

See `docs/future_automations.md` for detailed OpenClaw skill designs and the full automation roadmap.
