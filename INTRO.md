# Claude Code Introduction

## Starting Claude

Always `cd` into your project directory first, then run `claude`. The directory you're in determines which CLAUDE.md and memory files load. Wrong directory = wrong context.

```bash
cd ~/Desktop/Work/Github/dashboard
claude
```

To resume where you left off: `claude --continue` (most recent session) or `claude --resume` (pick from a list).

---

## Core Mental Model

There are three layers of what Claude "knows":

| Layer | What it is | Survives `/clear`? | Survives session end? |
|---|---|---|---|
| **Context** | The current conversation | No — `/clear` wipes it | No |
| **Auto-memory** | Files Claude writes to remember things | Yes | Yes |
| **CLAUDE.md** | Instructions you write | Yes | Yes |

`/clear` only resets the conversation. Claude still remembers everything in memory and CLAUDE.md when you start the next session.

Context is your most valuable resource within a session. Every file Claude reads, every command output fills it. As it fills, quality degrades. Manage it deliberately.

---

## Essential Slash Commands

| Command | What it does |
|---|---|
| `/clear` | Wipe context, start fresh. Use between unrelated tasks. |
| `/compact` | Summarize the conversation to free context space. Use before it auto-triggers. |
| `/cost` | Show token usage and cost so far. |
| `/memory` | View all loaded CLAUDE.md files and auto-memory. |
| `/init` | Auto-generate a starter CLAUDE.md for the project. |
| `/resume` | Pick a past session from a list and resume it. |
| `/rename` | Give the current session a descriptive name (makes it findable later). |
| `/config` | Change settings (theme, model, etc.). |
| `/insights` | Gives insights on how you are using Claude Code |
| `/help` | List all available commands and skills. |

---

## Running Shell Commands

Prefix any shell command with `!` to run it directly:

```
! git status
! npm test
! ls -la
```

The output is added to the conversation so Claude can see it.

---
## Usage
To see how much you have used, run
```
/context # for context window usage
/usage # for weekly usage limits
/stats # for longer usage patterns
```



## Key Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Esc` | Stop Claude mid-response (context preserved) |
| `Esc` `Esc` | Open rewind menu — undo code/conversation changes |
| `Shift+Tab` | Cycle permission modes: Normal → Auto-Accept → Plan |
| `Ctrl+C` | Cancel current input |
| `Ctrl+D` | Exit |
| `Option+Enter` (Mac) | New line in your message (multiline input) |

---

## CLAUDE.md: Persistent Instructions

**You create this once per project. It is not per-session.** It lives in the project root and loads automatically every time you run `claude` in that directory. Never recreate it — just edit it.

Claude does NOT automatically read your code on startup. It only knows what's in CLAUDE.md, auto-memory, and what you tell it in the conversation. If you want Claude to understand your project structure, either put it in CLAUDE.md or tell it during the session.

Run `/init` once to generate a starter file, then trim it down. Run `/memory` at any time to see what's currently loaded.

**What to put in it:**
- Build/test commands Claude can't guess (`npm run lint`, `make test`)
- Style rules that differ from defaults
- Architecture notes (where things live, how they're organized)

**What NOT to put in it:**
- Things Claude can figure out from reading the code
- Standard conventions ("write clean code")
- Long explanations

Keep it under ~150 lines. The longer it is, the more Claude ignores it.

---

## Plan Mode

Plan Mode makes Claude read-only — it explores and thinks without touching files.

**Activate:** Press `Shift+Tab` until you see `Plan` in the prompt, or ask: *"plan this out before doing anything."*

**When to use it:**
- Multi-file changes where you need to agree on approach first
- When you're unsure about scope and want Claude to map it before touching anything

**Workflow:**
1. Enter Plan Mode, ask Claude to explore and propose a plan
2. Review it, correct it
3. Switch back to Normal Mode and say "implement the plan"

For small, obvious changes — skip it. Just ask directly.

---

## Strategies That Actually Matter

### Give Claude a way to verify itself
The single highest-leverage habit. Include test cases, expected output, or a command to run. Claude will check its own work.

*Weak:* "write a function that validates email"
*Strong:* "write validateEmail. It should return true for `user@example.com`, false for `invalid` and `user@.com`. Run the tests after."

### Correct early, not late
The moment Claude goes off track, hit `Esc` and redirect. Don't let it finish going in the wrong direction — it compounds.

If you've corrected the same mistake twice and it keeps happening: `/clear` and restart with a better prompt.

### Keep unrelated work separate
Finish task A, then `/clear` before starting task B. Leftover context from task A actively degrades quality on task B.

### Reference files explicitly
Use `@path/to/file` in your message to attach a file directly to the prompt — Claude reads it before responding. More reliable than describing what you think is in it.

```
look at @src/auth/token.js and tell me why login is failing
```

You can also use `@` in CLAUDE.md to import other files:
```markdown
See @README.md for project overview.
```

### Use subagents for deep exploration
When you need Claude to explore a large codebase or read many files, say: *"use a subagent to investigate X."* The exploration happens in a separate context, keeping your main conversation clean.

---

## Context Management (Critical)

| Situation | Action |
|---|---|
| Starting a new, unrelated task | `/clear` |
| Context getting large mid-task | `/compact` |
| Went down a wrong path | `Esc` `Esc` to rewind |
| Session is a mess, starting over | `/clear` |

**Rule of thumb:** If Claude starts giving worse answers or forgetting things you told it, your context is too full. Compact or clear.

---

## Rewinding and Checkpointing

### Within a session: `Esc` `Esc`

Press `Esc` twice to open the rewind menu. You pick a message to rewind to, then choose what to undo:

| Option | What it does | When to use it |
|---|---|---|
| **Rewind code only** | Reverts all file changes back to that point. Conversation stays. | Claude broke the code but the conversation is still useful. |
| **Rewind conversation only** | Erases messages back to that point. File changes stay. | Claude went on a tangent but the code it wrote is fine. |
| **Rewind both** | Reverts files AND erases messages back to that point. | Everything went wrong. Full reset to that checkpoint. |

### Across sessions: Git

Git is the real checkpoint system. Commit before any risky change.

```bash
# Create a checkpoint
git add -A && git commit -m "checkpoint: before refactor"

# See what Claude changed since last commit
git diff

# Discard all uncommitted changes (nuclear option)
git checkout -- .

# Undo last commit but keep the changes as unstaged files
git reset --soft HEAD~1

# See commit history
git log --oneline
```

**Rule of thumb:** If the task is risky or large, commit first. If Claude messes up within a session, `Esc` `Esc` to rewind. If you already committed the mess, use `git revert`.

---

## Sessions

A session is a named conversation. Sessions persist — you can leave and come back.

```bash
claude                  # start a new session
claude --continue       # resume the most recent session
claude --resume         # pick from a list of past sessions
```

From inside a session: `/rename` to name it, `/resume` to switch to another one.

Sessions store the conversation history but NOT the context window state. When you resume a session, Claude reloads CLAUDE.md and memory, but doesn't automatically re-read files from last time. You may need to re-orient it briefly.

### Where sessions are stored

Sessions live as `.jsonl` files in:
```
~/.claude/projects/<project-path>/
```

Where `<project-path>` is your working directory path with `/` replaced by `-`. For example, `/Users/sam/dashboard` → `-Users-sam-dashboard`.

Each `.jsonl` file is one session. Named sessions have their name in the first line of the file.

### Managing sessions: list, search, and delete

Install the `/sessions` skill (a custom tool for managing sessions from within Claude Code):

```bash
curl -fsSL https://raw.githubusercontent.com/samlayton99/claude-sessions/main/install.sh | bash
```

Then use it inside any Claude session:

```
/sessions                           # list all sessions
/sessions --find "Dashboard"        # search by name
/sessions --delete                  # delete all unnamed sessions (confirms first)
/sessions --delete "Build Dashboard"  # delete a specific named session (confirms first)
/sessions --new "Feature Work"      # create a new named session
```

### Forking a session

`--fork-session` creates a branch off an existing session — the history is copied but changes go into a new session, leaving the original untouched.

```bash
claude --continue --fork-session        # fork from most recent session
claude --resume "Session Name" --fork-session  # fork from a named session
```

**When to use it:**
- You want to try a different approach without losing what you already have
- You're opening the same session in two terminals — without forking, both terminals write to the same file and messages interleave. Fork one of them to give it its own session.

---

## Auto Memory

Claude automatically saves things it learns about your project to `~/.claude/projects/<project>/memory/`. These load at the start of every session.

You can ask Claude to remember anything: *"remember that we're using Postgres not SQLite."*

You can ask it to forget: *"forget what you saved about the database."*

Run `/memory` to see exactly what's loaded in the current session.

---

## Configurations Worth Knowing

### Permission Modes
`Shift+Tab` cycles through three modes:
- **Normal** — Claude asks before writing files or running commands (default, recommended while learning)
- **Auto-Accept** — Claude acts without asking. Faster, but review changes carefully.
- **Plan** — Read-only. Claude can explore but can't touch anything.

You can set a default mode in `.claude/settings.json`:
```json
{ "permissions": { "defaultMode": "plan" } }
```

### Model Selection
The models, ranked by capability vs. speed:
- **Opus 4.6** — most capable, slower, higher cost
- **Sonnet 4.6** — best balance, the default
- **Haiku 4.5** — fastest, cheapest, good for simple tasks

Switch with `/config` (most reliable) or `Option+P` if your terminal supports it. **Note:** shortcuts like `Option+P` and `Option+T` do not work inside Cursor's built-in terminal — Cursor intercepts them. Use a native terminal (Terminal.app or iTerm2) if you want keyboard shortcuts to work fully, or just use `/config`.

### Extended Thinking
Press `Option+T` to toggle deeper reasoning for hard problems. Costs more tokens but produces better plans and catches more edge cases. Turn it on for architecture decisions, off for routine edits.

Add `ultrathink` to any single prompt to max out thinking on just that turn.

### settings.json
Two locations:
- `~/.claude/settings.json` — applies to all your projects
- `.claude/settings.json` — applies to this project only (commit this)
- `.claude/settings.local.json` — project-local but gitignored (personal overrides)

Common things to set there: default permission mode, hooks, allowed/disallowed shell commands.

### Hooks: Automated Behaviors
Hooks run shell commands automatically at lifecycle events. The rule: if you'd otherwise have to say "and then run X" at the end of every prompt, make it a hook instead.

Configure in `.claude/settings.json` under a `"hooks"` key. Use `/hooks` to inspect what's active.

**Most useful hooks:**

Auto-format every file Claude edits:
```json
"PostToolUse": [{
  "matcher": "Edit|Write",
  "hooks": [{ "type": "command", "command": "npx prettier --write $(jq -r '.tool_input.file_path')" }]
}]
```

Desktop notification when Claude is waiting on you:
```json
"Notification": [{
  "hooks": [{ "type": "command", "command": "osascript -e 'display notification \"Claude needs input\" with title \"Claude Code\"'" }]
}]
```

Block Claude from editing a specific file:
```json
"PreToolUse": [{
  "matcher": "Edit|Write",
  "hooks": [{ "type": "command", "command": "jq -e '.tool_input.file_path | test(\"prod.config.js\") | not'" }]
}]
```

You don't need hooks until you have a formatter or build system. Come back to this once the project has more structure.

---

## Skills

Skills are reusable slash commands — you invoke them with `/skill-name` and they inject a set of instructions into that prompt. Think of them as saved workflows.

**Built-in skills worth knowing:**

| Skill | What it does |
|---|---|
| `/batch <instruction>` | Runs a change across many files in parallel using multiple worktrees |
| `/simplify` | Reviews changed files for quality and efficiency using parallel agents |
| `/loop 5m <prompt>` | Repeats a prompt on an interval (e.g., check if a deploy finished) |
| `/claude-api` | Loads Claude API reference docs into context |

**Creating a custom skill:**

```bash
mkdir -p ~/.claude/skills/my-skill
```

Then create `~/.claude/skills/my-skill/SKILL.md`:

```markdown
---
name: my-skill
description: What this does (Claude uses this to decide when to auto-invoke it)
---

Instructions for Claude to follow when this skill is invoked...
```

Claude discovers it automatically. Invoke it with `/my-skill`.

**Skills vs hooks:**

| | Skills | Hooks |
|---|---|---|
| Invoked | Manually (`/skill`) or automatically by Claude | Automatically on events |
| Good for | Saved workflows you run deliberately | "Always do X after Y" automation |

**Skill locations:**
- `~/.claude/skills/` — personal, available in all projects
- `.claude/skills/` — this project only

---

## Multiple Agents

### Subagents (within a session)
Ask Claude to delegate: *"use a subagent to research X."* It spins up a separate agent, does the exploration in an isolated context, and reports back. Your main conversation stays clean.

Good for: reading many files, running searches, tasks where you don't want to pollute context.

### Worktrees (parallel sessions)
A worktree gives Claude its own isolated copy of the repo on a new branch, so two sessions can work simultaneously without conflicting.

```bash
# Start a session with its own worktree
claude --worktree feature-name
```

Good for: working on two features at once, testing a risky change without touching main.

### Parallel Sessions Without Worktrees
You can just open two terminal windows and run `claude` in each. They're independent. Use `/rename` to give each a descriptive name, and `/resume` to pick back up where you left off.

---

## MCP Servers: Connecting Claude to External Tools

MCP (Model Context Protocol) is how you give Claude access to things outside your codebase — databases, GitHub, Slack, Sentry, etc. An MCP server is a small process that bridges Claude to an external API.

**Without MCP:** You copy-paste error logs from Sentry, manually describe GitHub issues, run SQL yourself and paste results.
**With MCP:** Claude queries Sentry, reads GitHub issues, and runs SQL directly.

### How to add a server

```bash
# Remote HTTP server (most common)
claude mcp add --transport http github https://api.githubcopilot.com/mcp/

# Local process (stdio)
claude mcp add --transport stdio db -- npx -y @bytebase/dbhub --dsn "postgresql://localhost/mydb"

# With authentication
claude mcp add --transport http sentry --header "Authorization:Bearer YOUR_TOKEN" https://mcp.sentry.dev/mcp
```

### Managing servers

```bash
claude mcp list              # see all configured servers
claude mcp get github        # details on one server
claude mcp remove github     # remove a server
```

Inside a session, run `/mcp` to see connected servers and complete any authentication flows.

### Configuration files

Servers are stored in dedicated config files, not `settings.json`:

| File | Scope | Share with team? |
|---|---|---|
| `.mcp.json` (project root) | This project | Yes — commit it |
| `~/.claude.json` | All your projects | No — personal |

`.mcp.json` supports environment variable expansion so you don't hardcode secrets:
```json
{
  "mcpServers": {
    "db": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@bytebase/dbhub", "--dsn", "${DATABASE_URL}"],
      "env": { "DATABASE_URL": "${DATABASE_URL}" }
    }
  }
}
```

### How Claude uses MCP tools

Once configured, MCP tools are just available — Claude calls them automatically when relevant to your request. You don't need special syntax. Just ask naturally:

*"What errors are spiking in Sentry right now?"*
*"Create a GitHub issue for this bug."*
*"Run this query against the staging database."*

### Common MCP servers

| Server | What it connects to |
|---|---|
| GitHub | PRs, issues, code reviews |
| Sentry | Error monitoring, stack traces |
| dbhub / ByteBase | PostgreSQL, MySQL, SQLite |
| Notion | Pages, databases |
| Slack | Messages, channels |
| Stripe | Payment data |

Find more at the MCP registry: search for `modelcontextprotocol/servers` on GitHub.

### Security notes

- Store credentials in environment variables, not in config files
- Be cautious with third-party MCP servers — Anthropic hasn't verified them all
- Claude Code prompts for approval before using project-scoped servers for the first time

---

## Managing Memory Well

**Short version:** Claude.md is for standing rules. Auto-memory is for things Claude learns. Keep both lean.

**CLAUDE.md hygiene:**
- Under 150 lines. Every line competes for attention.
- Run `/init` once to generate it, then trim aggressively.
- Audit it periodically — remove rules that are no longer relevant.

**Auto-memory hygiene:**
- Run `/memory` to see what Claude has saved.
- Ask Claude to forget outdated things: *"forget what you saved about X."*
- If memory is wrong, correct Claude and ask it to update its memory.

**When memory isn't enough:**
For project context that matters a lot (architecture decisions, active bugs, important constraints), put it in CLAUDE.md directly. Memory files can drift; CLAUDE.md is what you control.

---

## Workflow Template (for any non-trivial task)

1. **Orient** — tell Claude what you're trying to do and point it at the relevant files
2. **Plan** — enter Plan Mode for anything touching multiple files; agree on the approach
3. **Implement** — switch to Normal Mode; let Claude execute
4. **Verify** — run tests or check output; correct immediately if anything's off
5. **Commit** — clean commit before moving on
6. **Clear** — `/clear` before starting the next unrelated thing
