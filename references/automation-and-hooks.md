# Automation and Hooks

OpenClaw has four overlapping mechanisms for getting the agent to do things WITHOUT you messaging it:

1. **Heartbeats** — periodic wake-up turns (every N minutes, runs `HEARTBEAT.md` contents)
2. **Cron jobs** — scheduled tasks at specific times, with flexible session models
3. **Standing orders** — persistent authority declarations in `AGENTS.md` paired with cron triggers
4. **Hooks** — event-driven scripts triggered by agent lifecycle events (internal hooks and plugin hooks)

These solve different problems. Pick the right tool.

## How to work through this with the user

**Plan mode applies.** Do not draft cron commands, HEARTBEAT.md content, hook handlers, or webhook config until the user has approved the automation plan. See the Plan-Mode Contract in the main SKILL.md.

**Pace:** 15-45 minutes depending on number of automations.

**Sequence:** Map each proactive workload to the right mechanism (using the decision table below) → for each, specify trigger / session model / delivery / failure handling → sketch the cron commands / hook handlers / webhook config in prose → present complete automation plan → get approval → draft.

**Don't:**
- Propose heartbeats for a new agent on day one (default `"0m"` until the user has proven the HEARTBEAT.md content)
- Mix standing orders (authority declarations in AGENTS.md) with cron commands (schedule triggers) — they work together but are separate files
- Draft a hook handler without confirming what event it listens for and what it does
- **Produce any cron commands, HEARTBEAT.md content, or hook code before plan approval**

**Do:**
- Use the decision table (heartbeat vs cron vs hook) during planning
- For each cron job, confirm: schedule, timezone, session model (main/isolated/custom), delivery (announce/webhook/none), model override, retry policy
- For each hook, confirm: event key, expected behavior, whether it's bundled / managed / workspace
- For each heartbeat, confirm that `HEARTBEAT.md` will have specific checks — vague heartbeat = wasted tokens every 30 min
- Suggest enabling `command-logger` bundled hook for audit trail on any agent running community code

## Choosing the right mechanism

| You want... | Use |
|-------------|-----|
| The agent to check X every 30 min in background | Heartbeat |
| A report every Monday at 9 AM | Cron (recurring, isolated session) |
| Persistent authority for recurring work | Standing order in AGENTS.md + cron trigger |
| To run code when `/new` is typed | Internal hook (HOOK.md) |
| To block dangerous tool calls | Plugin hook (`before_tool_call`) |
| To log every command for audit | Internal hook (`command-logger` bundled hook) |
| To audit what gets installed | Plugin hook (`before_install`) |
| To react to incoming email | Gmail webhook + hook mappings |
| To act on external events (API calls, webhooks) | Webhook + cron (or plugin HTTP route) |

### Priority order — prefer deterministic over speculative

The table above lists what maps to what. When you have a choice, prefer the cheaper, more deterministic mechanism. In order of preference:

1. **Cron** for anything that can be described by a schedule. Cron fires once, runs isolated, and costs exactly one bootstrap per run. If the question is "at 7 AM read today's calendar and send a brief," that's cron.
2. **Hooks / webhooks / Gmail Pub/Sub** for event-driven work. These cost zero when nothing happens, and the event gives you the trigger data directly instead of making the agent hunt for it.
3. **Standing orders** (authority + rules in AGENTS.md) paired with a cron or hook trigger. The standing order tells the agent how to behave when the trigger fires; the trigger itself is still cron/hook, not a wake-up.
4. **Heartbeats**, and only heartbeats, when the workload genuinely requires periodic *judgment* (not periodic action) and cannot be expressed as a schedule or an event.

The reason for this order is cost and determinism. A heartbeat is a full agent turn with the complete bootstrap loaded, whether or not there's anything to do. A cron with `--light-context` can be 10× cheaper and won't drift on whether to do the work.

When the Architect skill is asked to set up automation, it works down this list. If it reaches heartbeats, it stops and asks: "What specific conditions will you check each cycle? If you can enumerate them now, let's try to drive them from cron or hooks first."

## Heartbeats — keeping the agent alive between messages

Heartbeats are wake-up turns on a fixed interval. The agent reads `HEARTBEAT.md` and acts on it.

### Config

```json5
{
  agent: {
    heartbeat: { every: "30m" }   // default: 30m when enabled. "0m" = disabled.
  },
  // Or per-agent:
  agents: {
    list: [
      { id: "main", heartbeat: { every: "0m" } },    // chat-only
      { id: "ops", heartbeat: { every: "15m" } }     // active monitoring
    ]
  }
}
```

### Default behavior

When `HEARTBEAT.md` exists:
- Agent runs a full turn with this prompt:
  `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- If agent replies `HEARTBEAT_OK` (alone or with short padding), outbound delivery is SUPPRESSED
- If file is empty (just headers or blank lines), heartbeat is SKIPPED entirely (saves tokens)
- If file is missing, heartbeat still runs — model decides what to do

### Cost

Heartbeats are FULL AGENT TURNS. They burn:
- Full system prompt (bootstrap files, tool schemas, skills)
- Model call with `HEARTBEAT.md` contents
- Any tool calls the agent decides to make
- Announce-back delivery unless `HEARTBEAT_OK` suppresses

At 30-min cadence, that's 48 agent turns per day. At typical Opus pricing with a 5KB bootstrap, that's a measurable bill. Don't enable unless the agent genuinely has proactive work to do.

**Default recommendation: `every: "0m"` for new agents.** Enable heartbeats only after a week of use, when you have a clear `HEARTBEAT.md` with specific checks.

### Cost reference table — rough order-of-magnitude numbers

These are engineer-quality estimates (good enough for architecture decisions, not for finance). Pricing moves; treat the dollars as a shape, not a quote. Re-verify current rates at `https://docs.anthropic.com/claude/docs/models-overview` or your chosen provider's pricing page before you cite them to the user.

Assumptions used for the table: a Track-B agent with ~5 KB bootstrap (SOUL + AGENTS + USER + TOOLS + HEARTBEAT + MEMORY) ≈ **~3,500 input tokens of bootstrap per turn** before any tool schemas or skill bodies load. Tool schemas add roughly 2–6K more input tokens depending on plugin count. A quiet `HEARTBEAT_OK` reply is ~10 output tokens; a "I inspected X and found nothing" reply is ~150–400 output tokens.

| Pattern | Per-invocation cost (input/output tokens) | Per day | Notes |
|---|---|---|---|
| Cron job, chat channel notify only | ~3.5K in / ~100 out | ~3.5K × runs/day | Cheapest proactive pattern. No tool calls in the common case. |
| Cron job, 2–3 tool calls + report | ~5–8K in / ~300–600 out | Depends on schedule | Most real cron jobs land here once you include tool schemas + one round of tool results. |
| Hook / webhook trigger | ~3.5K + payload in / ~200–500 out | ∝ event rate | Zero idle cost — pay only when the event fires. Prefer this over heartbeat whenever the trigger is enumerable. |
| Standing order fired from cron/hook | Same as cron/hook invoker | — | Cost is in the *caller*, not the standing-order authority text (which is bootstrap-resident already). |
| Heartbeat, every 30m, `HEARTBEAT_OK` path | ~3.5K in / ~10 out | ~48 × that = ~170K in / ~500 out | This is the "cheap" heartbeat — silent-path only. Still pays the bootstrap tax 48 times. |
| Heartbeat, every 30m, active-path (1 tool + 200-tok reply) | ~5–8K in / ~300 out | ~48 × that = ~250–400K in / ~14K out | A heartbeat that actually *does* something is noticeably more expensive than the silent baseline. |
| Heartbeat, every 5m, active-path | Same per-tick | ~288 × that ≈ ~1.5–2.3M in / ~85K out | This is the pattern to reject outright unless there's a strict, enumerable reason cron or hooks can't do it. |
| Subagent spawn, chat profile, single task | ~4–6K in (inherited AGENTS+TOOLS only) / ~200–800 out | ∝ spawn rate | Subagents inherit `AGENTS.md + TOOLS.md` only — roughly 60–70% of the parent's bootstrap. Cheaper than a full re-turn of the parent, but not free. |
| Subagent spawn, full-operator profile with 3-step E-V-R | ~6–10K in / ~600–1500 out | ∝ spawn rate | Add tool-result tokens for each step. A single coding-companion subagent finishing one real task rarely comes in under 15K total tokens. |

**How to use this table in plan mode:** when the user proposes a proactive pattern, name the rough cost alongside the architectural argument. "Heartbeat every 30m with the silent path costs roughly 170K input tokens/day; at current Opus input rates (~$15 per million input) that's ~$2.50/day of idle cost. Cron + Gmail Pub/Sub costs $0 until an event arrives." Concrete numbers — even approximate ones — kill speculative automation more reliably than qualitative warnings.

**When numbers are load-bearing, fetch current pricing.** If the user is making a real budget decision (picking cadence, deciding whether to enable Dreaming, choosing Opus vs Sonnet for cron reports), fetch the active price card from the provider before committing to a figure. Say so: "Quoted pricing from memory — one sec, let me verify current rates." This is covered under SKILL.md principle 4 (Research Discipline) and #15 (Knowledge Cutoff).

See also: SKILL.md cross-cutting principle #12 (bootstrap cost on every turn) and principle #13 (automation priority order). Both of those rules are the *why*; this table is the *how much*.

### HEARTBEAT.md template

```markdown
# Heartbeat — runs every 30 min

Strict rules for heartbeat turns:
- Read this file only. Do not infer tasks from prior chat history.
- If there's nothing actionable below, reply `HEARTBEAT_OK` (alone) and stop.
- Keep outbound messages under 2 sentences unless there's a genuine emergency.

## Active checks

1. Check `memory/today.md` for `[ ] pending` items with dates passed — remind if overdue
2. Check whether today's morning brief has been delivered (look in `memory/delivery-log.md`) — 
   if not and it's past 9 AM, run the brief
3. Check `~/.openclaw/cron/jobs.json` for any cron jobs that failed in the last hour — 
   alert if any

## Silent conditions (don't message)
- Normal system health
- Morning brief already delivered today
- No overdue reminders
- No cron failures

## Escalation conditions (always message immediately)
- Critical cron failure (any job with retry count >= 3)
- Overdue reminder > 4 hours
- Any check throws an error
```

### Heartbeat delivery policy

If you want heartbeats to RUN but not auto-message you:
```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        directPolicy: "block"  // suppresses direct DM delivery; still runs + logs
      }
    }
  }
}
```

This is useful when the agent should do work silently unless there's an emergency, and you'll check logs/memory yourself.

## Cron jobs — scheduled one-shot or recurring tasks

Cron runs INSIDE the gateway (not in a separate cron daemon). Jobs persist at `~/.openclaw/cron/jobs.json` — restarts don't lose schedules.

### Schedule types

| Kind | Flag | Example |
|------|------|---------|
| `at` | `--at` | `--at "2026-02-01T16:00:00Z"` or relative `--at "20m"` |
| `every` | `--every` | `--every "1h"` |
| `cron` | `--cron` | `--cron "0 9 * * 1"` (Mon 9 AM) |

Without `--tz`, timestamps are UTC. Local wall-clock scheduling needs `--tz America/Chicago`.

### Execution styles

| `--session` | Runs in | Best for |
|-------------|---------|----------|
| `main` | Next heartbeat turn | Reminders, system events, things the main agent should see |
| `isolated` | Fresh `cron:<jobId>` session | Reports, background chores, parallel work |
| `current` | Whatever session was active at creation time | Context-aware recurring work |
| `session:custom-id` | Persistent named session | Workflows that build on prior runs (daily standups, ongoing projects) |

**Main session** jobs enqueue a system event and optionally wake the heartbeat. **Isolated** jobs run a dedicated agent turn with a fresh session. **Custom sessions** persist context across runs.

### One-shot reminder (simple)

```bash
openclaw cron add \
  --name "call-lawyer-followup" \
  --at "2026-04-18T14:00:00" \
  --tz America/Chicago \
  --session main \
  --system-event "Reminder: follow up with Tennessee employment lawyer about CPI non-compete review" \
  --wake now \
  --delete-after-run
```

### Recurring isolated report

```bash
openclaw cron add \
  --name "weekly-infra-report" \
  --cron "0 20 * * 0" \
  --tz America/Chicago \
  --session isolated \
  --message "Execute weekly infrastructure report per standing orders. Deliver summary to Telegram when done." \
  --announce \
  --channel telegram \
  --to "123456789"
```

Options for isolated jobs:
- `--message` — prompt text (required)
- `--model` / `--thinking` — override defaults
- `--light-context` — skip workspace bootstrap injection (saves tokens for narrow jobs)
- `--tools exec,read` — restrict tools available to this job

### Delivery modes

- `announce` — deliver summary to target channel (default for isolated)
- `webhook` — POST finished event to URL
- `none` — internal only

For Telegram forum topics: `--to "-1001234567890:topic:123"`.

### Recurring vs one-shot

- One-shot (`--at`) jobs auto-delete after success by default
- Recurring (`--cron`/`--every`) jobs persist until you remove them
- Disable temporarily: `openclaw cron edit <id> --disabled`

### Day-of-month and day-of-week gotcha

Cron expressions use OR logic for DoM + DoW when both are non-wildcard. `0 9 15 * 1` does NOT mean "9 AM on the 15th if it's Monday" — it means "9 AM on the 15th OR 9 AM on Mondays." Use the `+` modifier for AND (`0 9 15 * +1`) or guard in the prompt.

### Managing jobs

```bash
openclaw cron list
openclaw cron edit <id> --message "new prompt"
openclaw cron run <id>                # force now
openclaw cron run <id> --due           # only if actually due
openclaw cron runs --id <id> --limit 50    # history
openclaw cron remove <id>
openclaw cron status
```

### Retry policy

```json5
{
  cron: {
    retry: {
      maxAttempts: 3,
      backoffMs: [60000, 120000, 300000],
      retryOn: ["rate_limit", "overloaded", "network", "server_error"]
    }
  }
}
```

One-shot jobs: transient errors retry up to 3 times; permanent errors disable immediately. Recurring: exponential backoff between retries, resets after next success.

## Standing orders — persistent authority

Standing orders go in `AGENTS.md`. See `references/agents-md-patterns.md` for the full pattern. The short version:

```markdown
## Program: Weekly Infrastructure Report

**Authority:** Compile homelab metrics and generate a weekly report
**Trigger:** Every Sunday 8 PM (enforced via cron)
**Approval gate:** None for normal reports. Flag anomalies.
**Escalation:** Critical service down → alert immediately

### Steps
1. Query Synology NAS metrics
2. Check Docker container status
3. Generate report at reports/weekly/YYYY-MM-DD.md
4. Deliver summary via Telegram

### Never
- Restart services without confirmation
- Share internal IPs in messages
```

The cron prompt REFERENCES the standing order, doesn't duplicate:
```bash
openclaw cron add \
  --name weekly-infra \
  --cron "0 20 * * 0" \
  --session isolated \
  --message "Execute weekly infrastructure report per standing orders."
```

## Internal hooks — event-driven scripts

Internal hooks are TypeScript handlers that fire on gateway events. Discovered from directories; configured via `hooks.internal`.

### Discovery precedence

1. Bundled hooks (shipped with OpenClaw, in `<openclaw>/dist/hooks/bundled/`)
2. Plugin hooks (bundled inside installed plugins)
3. Managed hooks (`~/.openclaw/hooks/`) — can override bundled and plugin
4. Workspace hooks (`<workspace>/hooks/`) — disabled by default; explicit enable required; CANNOT override same-named hooks from other sources

### Bundled hooks (shipped with OpenClaw)

| Hook | Purpose | Enable |
|------|---------|--------|
| `session-memory` | Saves session context to `<workspace>/memory/YYYY-MM-DD-slug.md` on `/new` or `/reset` | `openclaw hooks enable session-memory` |
| `bootstrap-extra-files` | Inject extra bootstrap files via glob/path patterns | `openclaw hooks enable bootstrap-extra-files` |
| `command-logger` | Log all command events to `~/.openclaw/logs/commands.log` (JSONL) | `openclaw hooks enable command-logger` |
| `boot-md` | Run `BOOT.md` when gateway starts | `openclaw hooks enable boot-md` |

**Strong recommendation:** enable `command-logger` on any gateway for audit trail.

### Hook structure

A hook is a directory with `HOOK.md` + handler file:

```
~/.openclaw/hooks/my-hook/
├── HOOK.md
└── handler.ts
```

### `HOOK.md`

```markdown
---
name: my-hook
description: "What this hook does"
homepage: https://my-docs-url.example
metadata: { "openclaw": {
  "emoji": "🔗",
  "events": ["command:new", "command:reset"],
  "requires": { "bins": ["node"] }
} }
---

# My Hook

Detailed docs here — what it does, why, what it requires.
```

Metadata fields:
- `emoji` — display emoji in CLI
- `events` — event keys to listen for
- `export` — named export to use (default `"default"`)
- `os` — platform filter (`["darwin", "linux"]`)
- `requires.bins` — bins that must exist on PATH
- `requires.anyBins` — at least one must exist
- `requires.env` — required env vars
- `requires.config` — required config paths
- `always: true` — bypass eligibility checks
- `install` — install methods

### `handler.ts`

```typescript
const handler = async (event) => {
  if (event.type !== "command" || event.action !== "new") {
    return;  // filter early
  }

  console.log(`[my-hook] /new triggered for session ${event.sessionKey}`);

  // Do work, keep it fast (this runs during command processing)
  event.messages.push("✨ Session reset complete");
};

export default handler;
```

Event context shape:
```typescript
{
  type: "command" | "session" | "agent" | "gateway" | "message",
  action: string,
  sessionKey: string,
  timestamp: Date,
  messages: string[],        // push to send to user
  context: { /* event-specific fields */ }
}
```

### Internal hook event types

**Command events:** `command`, `command:new`, `command:reset`, `command:stop`

**Session events:**
- `session:compact:before` — right before compaction
- `session:compact:after` — after, with metadata
- `session:patch` — session properties modified (only fires from privileged clients)

**Agent events:**
- `agent:bootstrap` — before workspace bootstrap files injected (hook can mutate `context.bootstrapFiles`)

**Gateway events:**
- `gateway:startup` — after channels start and hooks load

**Message events:**
- `message:received` — inbound received (raw)
- `message:transcribed` — after audio transcription
- `message:preprocessed` — after all media + link understanding
- `message:sent` — outbound delivered

### Custom hook example — log all commands to a file

`~/.openclaw/hooks/custom-audit/HOOK.md`:
```markdown
---
name: custom-audit
description: Audit log with timestamp and context
metadata: { "openclaw": { "emoji": "📜", "events": ["command"] } }
---
# Custom Audit
Writes JSONL entries to ~/.openclaw/logs/audit.log
```

`handler.ts`:
```typescript
import { writeFileSync, appendFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const LOG_PATH = join(homedir(), ".openclaw", "logs", "audit.log");

const handler = async (event) => {
  const entry = {
    timestamp: event.timestamp.toISOString(),
    type: event.type,
    action: event.action,
    sessionKey: event.sessionKey,
    senderId: event.context?.senderId,
    source: event.context?.commandSource
  };
  try {
    appendFileSync(LOG_PATH, JSON.stringify(entry) + "\n");
  } catch (err) {
    console.error("[custom-audit] Failed to append:", err instanceof Error ? err.message : err);
  }
};

export default handler;
```

Enable:
```bash
openclaw hooks enable custom-audit
# Restart gateway to load
```

## Plugin hooks — tighter integration

Plugin hooks run inside the plugin runtime. They're registered via `api.registerHook(...)` or `api.on(...)`. Full list and semantics in `references/authoring-plugins.md` under "The 27 plugin hooks."

Critical plugin hooks to know about:
- `before_tool_call` — intercept/modify/block/require-approval for tool calls
- `before_install` — veto skill/plugin installs (security gate)
- `before_prompt_build` — inject text into the system prompt
- `tool_result_persist` — transform tool results before they're persisted (SYNC ONLY)
- `message_sending` — cancel or modify outbound messages

Example — block `exec` commands containing "rm -rf" with approval UI:

```typescript
api.registerHook("before_tool_call", async (event) => {
  if (event.toolName === "exec" && event.params.command?.includes("rm -rf")) {
    return {
      requireApproval: {
        title: "Destructive command",
        description: `Agent wants to run: ${event.params.command}`,
        severity: "critical",
        timeoutMs: 120000,
        timeoutBehavior: "deny"
      }
    };
  }
  return { block: false };
});
```

## Webhooks — external HTTP triggers

The gateway can expose HTTP endpoints for external services to trigger the agent.

### Config

```json5
{
  hooks: {
    enabled: true,
    token: "dedicated-webhook-token-not-reused",
    path: "/hooks",
    defaultSessionKey: "main",           // safer than per-request session keys
    allowedAgentIds: ["main"],            // limit which agents can be routed to
    allowRequestSessionKey: false         // don't let callers choose session
  }
}
```

### Built-in endpoints

**`POST /hooks/wake`** — enqueue a system event for the main session:
```bash
curl -X POST http://127.0.0.1:18789/hooks/wake \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"text":"New email received","mode":"now"}'
```

**`POST /hooks/agent`** — run an isolated agent turn:
```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email"}'
```

**`POST /hooks/<name>`** — custom mapped hooks via `hooks.mappings` config that transform payloads into `wake` or `agent` actions.

### Security for webhooks

- Use a DEDICATED webhook token, not the gateway auth token
- `hooks.path` must be a subpath (`/hooks`) — `/` is rejected
- Keep endpoints behind loopback, Tailscale, or trusted reverse proxy
- Keep `hooks.allowRequestSessionKey: false` unless needed
- If you allow it, bound with `hooks.allowedSessionKeyPrefixes`
- Hook payloads are wrapped with safety boundaries by default — don't enable `allowUnsafeExternalContent` without understanding the risk

### Gmail PubSub integration

OpenClaw can listen to Gmail inbox events via Google PubSub.

```bash
openclaw webhooks gmail setup --account you@gmail.com
```

Writes `hooks.gmail` config, enables the Gmail preset, uses Tailscale Funnel for the push endpoint. Gateway starts `gog gmail watch serve` on boot and auto-renews.

Disable: `OPENCLAW_SKIP_GMAIL_WATCHER=1`

## Decision tree — which mechanism when?

**Scheduled (daily brief, weekly report):**
- Simple, isolated → cron with `--session isolated`
- Context-aware (builds on prior) → cron with `--session session:<custom>`
- Reminds main agent to do work → cron with `--session main --system-event "..."`

**Event-driven (email arrives, webhook, file appears):**
- External → webhook with `POST /hooks/wake` or mapped hook
- Internal → file-watcher hook + `POST /hooks/agent`
- Very frequent → plugin with `registerService`

**Every N minutes (always-on watching):**
- Heartbeat if the work is agent-judgment-heavy
- Cron with `--every Nm` if it's deterministic

**React to agent lifecycle:**
- Internal hook (`command:new`, `session:compact:after`)
- Plugin hook (`agent_end`, `session_start`)

**Intercept tool calls or messages:**
- Plugin hook (`before_tool_call`, `message_sending`, `tool_result_persist`)

## Patterns for reliable automation

### Always include escalation

Every automated job should have a "when to escalate to human" condition. Silent failures are the most common issue:

```bash
openclaw cron add \
  --name nightly-backup \
  --cron "0 3 * * *" \
  --session isolated \
  --message "Run nightly backup. If it fails, alert me on Telegram with the exact error."
```

### Prefer `--announce` over model-decided delivery

When you want output delivered, use `--announce --channel X --to Y`. Don't expect the agent to remember to use `message` at the end of cron work.

### Use idempotency keys

Cron jobs automatically retry on failure. If the work has side effects (sending email, writing to external APIs), include idempotency — e.g., "if we already sent today's brief, don't send again."

Pattern in the message prompt:
```
Check memory/delivery-log.md for today's date. If already delivered, reply 'NO_REPLY' and stop.
Otherwise, run the brief and log to memory/delivery-log.md with today's date.
```

### Monitor the automation itself

Add a cron job that checks for failed cron jobs:
```bash
openclaw cron add \
  --name cron-health-check \
  --cron "0 8 * * *" \
  --session main \
  --system-event "Check cron job history for failures in the last 24h. If any job has failed 3+ times, alert me."
```

## Common pitfalls

- **Heartbeats enabled before writing HEARTBEAT.md** → agent burns tokens inferring what to do every 30 min
- **Cron without `--tz`** → schedules run on gateway's local/UTC clock, not yours
- **Mixing schedule with standing order in one place** → keep authority in AGENTS.md, scheduling in cron
- **Using `session:<custom>` without maintenance** → cron sessions can accumulate context until compaction; prune or reset periodically
- **Hooks that block the gateway** → hooks run during event processing; slow hooks slow your agent. Fire-and-forget async work.
- **Webhook token reused as gateway auth token** → audit flags `hooks.token_reuse_gateway_token` as critical; rotate both
- **Heartbeat delivering "all is well" messages** → suppress with `HEARTBEAT_OK` in the silent path
- **Adding one big "check everything" standing order** → split into multiple programs with distinct triggers and escalation

## Inspection CLI

```bash
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw hooks list
openclaw hooks list --verbose
openclaw hooks check             # eligibility summary
openclaw hooks info <n>       # details for one hook
openclaw system heartbeat last    # when did heartbeat last run?
openclaw system heartbeat status
```

Monitor the gateway log:
```bash
tail -f /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log
# or
openclaw logs --follow
```
