# Failure Modes Catalog

A catalog of the characteristic ways OpenClaw agents break — organized by surface. These aren't "things you might get wrong at design time"; they're failures that show up *after* the thing is running, often long after, and the cause is never the obvious one.

Use this as a debugging aid, as a pre-ship review checklist, and as inspiration for monitoring (`assets/audit-checklists/post-install-monitoring.md` red flags were drawn from here).

Each entry: **Symptom** → **Common cause** → **Debug pointer** → **Fix pattern**.

---

## SOUL.md / IDENTITY.md

### The agent "drifts" — answers change personality across sessions

- **Symptom:** Tone or values shift unexpectedly between sessions. User says "you used to…".
- **Common cause:** SOUL.md is too long (> 3 KB of guidance) and gets truncated or de-prioritized relative to session context as conversations grow.
- **Debug pointer:** Check SOUL.md size. Look at recent session transcripts for evidence of the agent parroting late-session user framing rather than its stated values.
- **Fix pattern:** Compress SOUL.md to 8–15 lines of durable values. Move examples and edge-case reasoning into AGENTS.md or a reference. If SOUL.md must be longer, flag the most-important lines with explicit anchors (e.g., `--- non-negotiable ---`).

### The agent becomes sycophantic after 50+ turns

- **Symptom:** Agreeable, hedging, flattering. Stops pushing back.
- **Common cause:** Session history drift + no explicit "push back" instruction in SOUL.md.
- **Debug pointer:** Grep SOUL.md for "disagree", "push back", "challenge". Absent? That's your cause.
- **Fix pattern:** Add one sentence to SOUL.md: "I push back when I disagree; I don't flatter." Re-seed MEMORY.md if needed.

---

## AGENTS.md / standing orders

### A standing order never fires

- **Symptom:** You wrote a program in AGENTS.md for "when X happens, do Y". It never runs.
- **Common cause:** (a) The trigger is phrased too specifically for the user's actual language, (b) the trigger overlaps with a tool name and the router picks tool-first, (c) the trigger fires but the approval gate is never reached because the user hasn't paired.
- **Debug pointer:** `grep -r '<trigger>' ~/.openclaw/agents/*/sessions/*.jsonl` — is the phrase even in any session? If yes but no action fired, it's the router. If no, rephrase the trigger.
- **Fix pattern:** Standing order triggers should be *patterns* ("when a user mentions backups failing"), not exact strings ("when user types 'backup failed'"). See `assets/templates/standing-order.md`.

### A standing order fires too often

- **Symptom:** Standing order catches unrelated messages. Approval prompts flood you.
- **Common cause:** Trigger phrased too broadly ("anything about files" → fires on every file mention).
- **Debug pointer:** Count triggers per day. More than a few per day for a rare event = too broad.
- **Fix pattern:** Tighten the trigger. Add a guard ("when user mentions X AND is asking a question"). Move high-volume patterns into cron + internal logic instead of standing orders.

---

## Memory system

### The agent forgets the same fact every week

- **Symptom:** "My wife's name is Ada" — re-told every seven days.
- **Common cause:** The fact lives only in session memory, not `MEMORY.md`. Sessions rotate.
- **Debug pointer:** `cat ~/.openclaw/workspace/MEMORY.md` — is the fact there? If not, that's the cause.
- **Fix pattern:** Seed durable facts into `MEMORY.md`. Keep it < 5 KB. Use `DREAMS.md` for consolidation of > 90-day-old daily files.

### MEMORY.md has grown to 50 KB and the agent is slower every turn

- **Symptom:** Latency climbs; token usage per turn drifts up.
- **Common cause:** Users added "helpful context" over time; nobody ran consolidation.
- **Debug pointer:** `wc -c ~/.openclaw/workspace/MEMORY.md`.
- **Fix pattern:** Trim to 3–5 durable facts. Move everything else to daily files or `DREAMS.md`. See `assets/templates/MEMORY.md` for the target shape and `assets/audit-checklists/quarterly-reaudit.md` § "Memory hygiene".

### Two agents give contradictory answers about the same user

- **Symptom:** Agent A says "you prefer X"; Agent B says "you prefer Y".
- **Common cause:** Memory is per-agent (memory-core default), facts got out of sync.
- **Debug pointer:** Diff each agent's `MEMORY.md`.
- **Fix pattern:** Move to a shared backend (qmd or honcho — see `assets/worksheets/memory-backend-choice.md`) or designate one agent as the authoritative writer and have others read from its memory directory.

---

## Automation (heartbeat / cron / alarms)

### Weekly token bill doubled without any code changes

- **Symptom:** Bill climbs over weeks even though config hasn't changed.
- **Common cause:** Heartbeat was enabled months ago, context-per-turn has grown with memory, cost-per-turn has silently doubled.
- **Debug pointer:** `assets/worksheets/heartbeat-cost-calculator.md` — recompute with current token counts. `openclaw cron runs --limit 50` — how many heartbeats fired this week?
- **Fix pattern:** Trim memory; lengthen cadence; or replace heartbeat with cron + alarms (principle #13 order).

### A cron job started succeeding after failing for weeks

- **Symptom:** `openclaw cron runs` shows the job failing, then suddenly all green.
- **Common cause:** Upstream target became reachable, OR the agent learned to "succeed" by changing what success means (e.g., swallowed the error). The latter is often abuse or a loose `on_error: ignore`.
- **Debug pointer:** Diff the most recent successful run's transcript against a recent failing one.
- **Fix pattern:** If the job's output stopped matching what you expect, pin a stricter success condition. Treat this pattern as a red flag in `assets/audit-checklists/post-install-monitoring.md`.

### Heartbeat fires but agent produces nothing useful

- **Symptom:** Daily turns, zero actions, just "nothing to do right now".
- **Common cause:** Heartbeat cadence is faster than events arrive. Classic 5m heartbeat in an environment where things change hourly.
- **Fix pattern:** Lengthen cadence or kill heartbeat; use alarms for the actual events.

---

## Hooks

### A plugin's `before_tool_call` block "stopped working"

- **Symptom:** Block that used to catch a pattern no longer fires.
- **Common cause:** Another plugin installed later at higher priority returned `{ block: false }` — which is a **no-op**, not a reset. But the root issue is usually that the later plugin's priority was wrong, or the user installed a plugin whose hook's semantics they didn't understand.
- **Debug pointer:** `openclaw hooks list --by-priority` and `openclaw plugins inspect <id>` to see registered hooks per plugin. Run a test tool invocation with `OPENCLAW_LOG_HOOKS=1`.
- **Fix pattern:** Re-read `references/authoring-plugins.md` § "Decision semantics". Assign explicit priorities rather than relying on install order.

### `ownsCompaction: true` plugin's `compact()` is a no-op

- **Symptom:** Agent fails in weird ways on long sessions. Overflow recovery never kicks in.
- **Common cause:** Classic. `ownsCompaction: true` with a stub `compact()` that returns `{ ok: true }` without actually compacting disables runtime compaction entirely.
- **Debug pointer:** `openclaw plugins inspect <engine-id>` — check `ownsCompaction`. Read the plugin's `compact()` implementation.
- **Fix pattern:** Either implement real compaction or set `ownsCompaction: false` and delegate to the runtime. See `assets/templates/plugin-skeleton-context-engine/` for the right shape.

### Two plugins' hooks create a visible-to-the-user race

- **Symptom:** Outbound messages occasionally arrive truncated or double-sent.
- **Common cause:** Two plugins both registered on `message_sending`, and one of them returns a modified `content` while the other mutates the event synchronously.
- **Debug pointer:** Grep session transcripts for duplicated message text; grep for abruptly cut messages.
- **Fix pattern:** Message-sending modifications MUST be in sequential hooks with explicit priority. Parallel hooks can't mutate.

---

## Tool policy / exec-approvals

### Every single command asks for approval (too noisy)

- **Symptom:** User frustrated, approving routine `ls` and `git status`.
- **Common cause:** `exec.security: "ask-all"` or a badly-written Layer 2 that doesn't cover the common case.
- **Debug pointer:** `jq '.[].command' ~/.openclaw/exec-approvals.json | sort | uniq -c | head -20` — what actually gets asked for?
- **Fix pattern:** Move the noisy-but-safe commands to Layer 1 (built-in safe-introspection). See `references/tool-policy-and-security.md` for the three-layer structure.

### A clearly dangerous command *didn't* ask for approval

- **Symptom:** Agent ran `rm -rf` or `scp` without prompting.
- **Common cause:** (a) Layer 3 auto-allow was widened with `--add` and forgot to scope, (b) `autoAllowSkills: true` is on and a skill's `command-dispatch: tool` expanded into the dangerous command, (c) `strictInlineEval: false`.
- **Debug pointer:** Look at the last successful auto-allow entries. Check `openclaw security audit --deep` for the three dangerous flags.
- **Fix pattern:** Tighten Layer 3. `autoAllowSkills: false` unless you trust every skill. `strictInlineEval: true` always.

---

## Channels

### Random strangers DM the agent successfully

- **Symptom:** You find messages in transcripts from IDs you don't recognize.
- **Common cause:** `dmPolicy: "open"` or missing, plus an `accountId` binding that defaulted to "any".
- **Debug pointer:** `openclaw bindings list` and `openclaw channels config <channel>` — what is `dmPolicy`?
- **Fix pattern:** Flip to `dmPolicy: "pairing"`. Audit paired peer list. Remove stale pairings.

### A message with attached image hangs the gateway

- **Symptom:** Inbound with large attachment → gateway locks up or OOMs.
- **Common cause:** Channel plugin doesn't enforce a size limit before handing off to the agent.
- **Debug pointer:** Reproduce with an 8 MB image.
- **Fix pattern:** Size-check in channel's `listen()` BEFORE calling `onInbound()`. See `assets/templates/plugin-skeleton-channel/index.ts`.

### Outbound messages are queued but never delivered

- **Symptom:** Agent says it replied, user never sees it.
- **Common cause:** Channel's `send()` swallowed a 5xx without throwing, OR the platform silently rate-limited your bot.
- **Debug pointer:** Tail `~/.openclaw/logs/commands.log` for outbound attempts. Check platform-side delivery dashboard if available.
- **Fix pattern:** `send()` must throw on non-2xx. Add structured delivery logging in `message_sent`/failure paths.

---

## Skills

### A skill never triggers despite being installed

- **Symptom:** `openclaw skills list` shows it; user's prompt matches the description; nothing happens.
- **Common cause:** (a) `description` field too long or vague — model didn't pick it, (b) skill's prerequisites aren't met, (c) `autoAllowSkills: false` (correct) and user hasn't allowlisted it.
- **Debug pointer:** `openclaw skills inspect <slug>` — check `description` length and prereqs. Session transcript — did the model consider it?
- **Fix pattern:** Tighten the description. Add 2–3 concrete trigger phrases. Allowlist explicitly if needed.

### A skill triggers for the wrong situations

- **Symptom:** `/summarize-slack` fires when user asks about email.
- **Common cause:** Description too broad ("summarize anything") — matches too many prompts.
- **Fix pattern:** Narrow the description. Mention the specific sources/contexts. Add a "Do NOT use this for X, Y, Z" section.

### A skill modifies files and leaves them in a broken state on error

- **Symptom:** Partial edits, half-applied migrations.
- **Common cause:** Skill's instructions don't specify atomicity / rollback behavior. The model bailed out mid-operation.
- **Fix pattern:** Write "atomicity: all-or-nothing" into the skill. Prefer staging changes and swapping atomically. See `references/authoring-skills.md`.

---

## Subagents / multi-agent

### Front-of-house agent passes through user input to back-of-house verbatim

- **Symptom:** Back-of-house (Track B with exec) receives raw untrusted content.
- **Common cause:** The front-of-house wasn't designed as an interpreter. It just forwarded.
- **Debug pointer:** Read the front-of-house's SOUL.md and AGENTS.md — does it say "transform into a structured request"?
- **Fix pattern:** Front-of-house MUST transform. Use `subagent_spawning` hook on the back to enforce a structured input schema. See `references/multi-agent-routing.md`.

### Subagent gets orphaned — session never ends

- **Symptom:** `openclaw sessions list` shows subagents from hours ago.
- **Common cause:** Parent crashed or disconnected; `subagent_ended` never fired cleanly.
- **Fix pattern:** Register a `subagent_spawned` + matching timeout. Consider a janitor cron that kills subagents older than N minutes.

---

## Gateway / config

### Config change "didn't take effect"

- **Symptom:** You edited `openclaw.json`, user still sees old behavior.
- **Common cause:** Gateway needs restart (or config watcher is off and you didn't know).
- **Debug pointer:** `openclaw config show --resolved` — does the resolved config match what you wrote?
- **Fix pattern:** `openclaw gateway restart` (or enable config watcher). Always re-resolve after edits.

### `openclaw security audit --deep` suddenly shows new critical findings

- **Symptom:** Yesterday clean; today critical.
- **Common cause:** Plugin auto-updated (unpinned dependency), a skill got pulled in with a postinstall, or a config was edited by another tool / synced from a repo.
- **Debug pointer:** `git -C ~/.openclaw/workspace log --since yesterday`. `npm ls` for any plugin that unexpectedly bumped.
- **Fix pattern:** `assets/audit-checklists/incident-response.md` — run the 7-step runbook.

---

## How to extend this catalog

When you hit a new failure mode:

1. Capture it here with the four-line structure above
2. Add a red-flag entry to `assets/audit-checklists/post-install-monitoring.md` if it was detectable in logs
3. If it could have been prevented by a policy rule, add that rule to `before_install`

Periodic review: quarterly (link from `assets/audit-checklists/quarterly-reaudit.md`).

---

## See also

- `references/operating-live-agents.md` — day-to-day monitoring
- `references/tweaking-existing-agents.md` — how to adjust without breaking things
- `assets/audit-checklists/incident-response.md` — when failure becomes incident
- `assets/audit-checklists/post-install-monitoring.md` — early-warning red flags
