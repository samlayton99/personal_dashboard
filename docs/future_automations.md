# Future Automations — OpenClaw Skill Catalog

This document specifies every planned OpenClaw skill and automation workflow. Each skill follows the same contract: OpenClaw executes the work locally, then writes results to the dashboard via authenticated API routes (`/api/agents/*`). Every skill writes at least one event to the `events` table.

Skills are grouped into tiers by priority and implementation order.

---

## Architecture Recap

```
User ←→ WhatsApp/iMessage ←→ OpenClaw (local)
                                    │
                                    ▼
                          Dashboard API Routes
                          (/api/agents/*)
                                    │
                                    ▼
                              Supabase DB
                          (events, todos, etc.)
                                    │
                                    ▼
                          Dashboard UI (Realtime)
                          (Automations page, etc.)
```

Every OpenClaw skill includes the `AGENT_API_KEY` in its requests. Dashboard API routes validate the key before processing. OpenClaw reads dashboard state via `/api/agents/get-context`.

---

## Tier 1 — Core Daily Loop (Build First)

### Skill 1: Quick-Capture Todo

**Purpose**: Capture to-dos from your phone without opening the dashboard.

**Trigger**: User texts OpenClaw a message starting with "todo:" or "t:".

**Input parsing**: Extract description, optionally infer push from context keywords (e.g., "church" → church-related push, "prod" → PROD push). Default priority = 5, panel = "now".

**API call**: `POST /api/agents/add-todo`
```json
{
  "description": "Call Bishop Johnson about youth activity",
  "push_id": "push_...",  // nullable, inferred or omitted
  "priority": 5,
  "panel": "now",
  "due_date": null
}
```

**Event written**: `{ agent_name: "openclaw_todo", event_type: "todo_added", payload: { summary: "Todo added: Call Bishop Johnson about youth activity" } }`

**Reply to user**: "Added: Call Bishop Johnson about youth activity"

**ADHD note**: This must be the lowest-friction possible. One text, one action, done. No confirmation prompts, no follow-up questions.

---

### Skill 2: Email Triage

**Purpose**: Scan email, score by urgency/importance, deliver a prioritized summary so you never have to open your inbox to know what's urgent.

**Trigger**: Cron — runs 3x daily (7am, 12pm, 5pm).

**Steps**:
1. Read all unread emails from Gmail API.
2. For each email, use Claude to determine: life context (church / prod / research / stanford / family / other), urgency score (1-10), importance score (1-10), one-line summary.
3. Write results to `email_digests` table via `POST /api/agents/email-digest`.
4. Write `email_digest_created` event.
5. Send top 5 most urgent items to user via WhatsApp with numbered list.

**User interaction**: User can reply inline, e.g.:
- "reply to #3: Tell them I'll be there at 5pm" → OpenClaw drafts and sends Gmail reply.
- "archive #1 #2 #5" → OpenClaw archives those emails.
- "star #4" → OpenClaw stars that email for later.

**Context for Claude**: Include user's active pushes and objectives so the triage agent understands what's currently important. An email from a PROD founder should score higher on importance when there's an active push related to PROD.

---

### Skill 3: Morning Brief

**Purpose**: Wake up to a clear picture of the day. Eliminates the "where do I start?" paralysis.

**Trigger**: Cron — runs daily at 7:00 AM.

**Steps**:
1. Call `GET /api/agents/get-context` to get: active pushes, today's todos (sorted by priority), system state.
2. Pull today's Google Calendar events via Google Calendar API.
3. Check for any pending approval items in events table.
4. Check most recent email triage results.
5. Assemble the brief.

**Message format** (sent via WhatsApp):
```
Good morning. Here's your day:

📅 Calendar: [list of events with times]
✅ Top todos: [top 5 by priority]
📧 Urgent email: [count] items need attention
🔔 Pending approvals: [count] items on your automations page
🎯 Pushes: Day [N] of [push name] | Day [N] of [push name] | ...

[Optional: motivational nudge if reflection streak is strong]
```

**Event written**: `morning_brief_sent`

---

### Skill 4: Reflection Nudge

**Purpose**: Gentle reminder before the dashboard locks.

**Trigger**: Cron — runs daily at 9:45 PM.

**Steps**:
1. Check `system_state` — if already locked or today's reflection already exists, skip.
2. Send WhatsApp message: "Reflection time in 15 minutes. Ready to wrap up the day?"

**Event written**: `reflection_nudge_sent`

**ADHD note**: This is intentionally 15 minutes before the lock, not at the lock time. Gives a transition window instead of a surprise wall.

---

## Tier 2 — Build After Core Loop is Stable

### Skill 5: Meeting Follow-Up

**Purpose**: After a meeting, text OpenClaw a quick summary and it creates downstream artifacts (follow-up emails, to-dos, notes).

**Trigger**: User texts OpenClaw with "meeting:" or "m:" prefix.

**Input**: Free-text summary of what happened. E.g.:
"m: Met with founder Jane Doe from Acme AI. They're raising a $5M seed. Product is a code review agent. Impressive team. Need to connect them with Michael at Sequoia. Follow up in 2 weeks."

**Steps**:
1. Parse with Claude to extract: people mentioned, action items, follow-up timeline, meeting type (prod / church / research / other).
2. Create to-dos for each action item via `/api/agents/add-todo`.
3. If PROD meeting: optionally update network sheet or future contacts table.
4. Write `meeting_followup_created` event with parsed details in payload.

**Reply to user**: "Created 2 todos: (1) Connect Jane Doe with Michael at Sequoia (2) Follow up with Jane Doe re: Acme AI seed round — due [date]. Event logged."

---

### Skill 6: Church Executive Secretary Agent

**Purpose**: Automate the recurring administrative work of the executive secretary calling.

**Trigger**: Mix of crons and text commands.

**Scheduled tasks (crons)**:
- **Sunday 6pm**: Generate next week's sacrament meeting agenda from a template. Send draft to user via WhatsApp for review.
- **Wednesday 9am**: Send reminder messages to Sunday's speakers/participants (if user has confirmed the agenda).
- **Saturday 8am**: Generate ward council agenda from flagged items. Send draft.

**Text commands**:
- "agenda add: [item]" → Adds item to next ward council agenda.
- "visit: [name] [reason]" → Adds person to bishop's visit list with reason.
- "reminder: [name] [message]" → Sends a reminder to a ward member (via email or text, depending on available contact info).

**Data storage**: Uses a simple `church_items` table (or jsonb entries in events) for agenda items, visit lists, etc. This table can be added when this skill is built.

**Event types**: `agenda_draft_created`, `reminder_sent`, `visit_list_updated`

---

### Skill 7: Cascading Summary Notifications

**Purpose**: When dashboard-native summary agents (weekly/monthly/quarterly/yearly) generate summaries, OpenClaw delivers a WhatsApp notification with a brief excerpt.

**Trigger**: Watches the `events` table for `summary_generated` events (via webhook or polling).

**Steps**:
1. Detect new summary event.
2. Read the summary content from `summaries` table.
3. Extract the first 2-3 sentences as a preview.
4. Send via WhatsApp: "Your weekly summary is ready. Preview: [excerpt]. View full summary on your dashboard."

**Note**: This skill doesn't generate summaries — the Supabase edge functions do that. This skill only handles the notification.

---

## Tier 3 — Build When You Have Bandwidth

### Skill 8: Network Maintenance

**Purpose**: Surface relationships that need attention before they go stale.

**Trigger**: Cron — runs weekly (Mondays at 8am).

**Steps**:
1. Read the network Google Sheet (or future `contacts` table).
2. For each important contact: check Gmail API for last email exchange date, check Google Calendar API for last meeting.
3. Flag anyone with >30 days since last contact.
4. Send WhatsApp digest: "[N] people you haven't contacted in 30+ days: [list with names, context, last contact date]"
5. User can reply: "draft check-in for #2" → OpenClaw drafts a contextual check-in email based on their relationship history.

**Event written**: `network_check_completed`

**Future evolution**: When the Network page migrates from Google Sheets to a `contacts` table, this skill writes last-contact dates and relationship scores directly to the dashboard.

---

### Skill 9: Research Paper Scout

**Purpose**: Daily curated research digest so you stay current without scrolling arXiv.

**Trigger**: Cron — runs daily at 6:30 AM (before morning brief).

**Steps**:
1. Query arXiv API for recent papers matching keywords: LLMs, reasoning, reinforcement learning, sparse methods, low-rank methods, inference efficiency, token compression, latent variable models.
2. Also check Semantic Scholar for highly-cited recent papers in adjacent areas.
3. Feed candidates to Claude with context: user's research focus areas, current pushes, recent actions. Ask: "Which 3 papers are most relevant to this researcher's current work?"
4. Generate one-paragraph summary per paper explaining why it matters for the user's specific research.
5. Send via WhatsApp: "3 papers today: [titles with one-line hooks]"
6. Store in an `events` payload for now. Future: dedicated `research_papers` table.

**Event written**: `research_digest_sent`

---

### Skill 10: PROD Deal Flow Tracker

**Purpose**: Turn quick meeting notes into structured founder/company records.

**Trigger**: User texts "deal:" or "d:" prefix. E.g.:
"d: Jane Doe, Acme AI, seed stage, code review agent, strong team, follow up 2 weeks"

**Steps**:
1. Parse with Claude: extract founder name, company name, stage, product description, notes, follow-up date.
2. Write to a `founders` table (to be created when this skill is built): name, company, stage, notes, date_met, follow_up_date, status.
3. Create a follow-up to-do via `/api/agents/add-todo`.
4. Write `deal_logged` event.

**Future**: The Network page could include a "deal flow" view that renders this table.

---

### Skill 11: Focus Guardian

**Purpose**: Awareness feedback loop for YouTube/chess escape behavior.

**Trigger**: Browser extension or DNS-level blocker sends a webhook to OpenClaw when a blocked site is accessed.

**Steps**:
1. Receive override notification.
2. Log the timestamp and duration (start tracking, stop when user leaves the site or after a timeout).
3. Write `focus_override` event with payload: `{ site, duration_minutes, time_of_day }`.
4. At end of day, include focus override data in the nightly reflection context so the action generation agent can factor it in.

**No blocking**: This skill doesn't block anything. It creates awareness through data. The nightly reflection feedback loop ("you overrode focus mode 3 times today for 47 minutes") is what changes behavior over time.

**Implementation note**: The browser extension can be a simple Chrome extension that calls a webhook. OpenClaw can expose a webhook endpoint for this.

---

### Skill 12: Weekly Review Prep

**Purpose**: Every Sunday before you sit down to do a weekly review, OpenClaw prepares a structured review document.

**Trigger**: Cron — runs Sundays at 4pm (after weekly summary is generated at 3am).

**Steps**:
1. Pull the most recent weekly summary.
2. Pull all actions from the past week with their push/objective mappings and needle scores.
3. Pull current pushes and their progress summaries.
4. Pull any to-dos that are overdue or have been in "now" for >3 days.
5. Assemble a review document with sections: "What went well", "What was neglected", "Stale to-dos", "Push health check", "Suggested focus for next week".
6. Send via WhatsApp as a structured message.

**Event written**: `weekly_review_prep_sent`

**ADHD note**: The review should be structured so it can be read in 5 minutes. The goal is to make the weekly review feel like reading a report, not creating one.

---

## API Endpoints Summary

All OpenClaw skills interact with the dashboard through these endpoints:

| Endpoint | Method | Purpose | Used By |
|----------|--------|---------|---------|
| `/api/agents/add-todo` | POST | Create a to-do | Quick-capture, meeting follow-up, deal tracker |
| `/api/agents/write-event` | POST | Log any agent event | All skills |
| `/api/agents/get-context` | GET | Read dashboard state | Morning brief, email triage, any context-aware skill |
| `/api/agents/email-digest` | POST | Write email triage results | Email triage |
| `/api/agents/nightly-reflection` | POST | Generate actions from reflection | Dashboard (not OpenClaw) |

All endpoints require `AGENT_API_KEY` in the request headers.

---

## Skill Development Principles

1. **Every skill writes an event.** No silent actions. If it didn't write an event, it didn't happen.
2. **Skills should degrade gracefully.** If Gmail API is down, the email triage skill logs an error event and skips. It doesn't crash OpenClaw.
3. **Prefer text commands over complex parsing.** "todo: call bishop" is better than trying to infer intent from "I need to remember to call the bishop."
4. **Never auto-send on behalf of the user without approval.** Drafting an email is fine. Sending it requires explicit confirmation.
5. **Keep WhatsApp messages short.** Summaries, not essays. Link to the dashboard for details.
6. **Log everything.** Future Sam will want to look at patterns in the events table. The more structured the payloads, the more useful they'll be.
