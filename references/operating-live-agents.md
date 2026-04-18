# Operating live agents — observability, debugging, and migration

Everything else in this skill is about designing or tweaking an agent. This file is about keeping one alive after it's in service: watching what it does, diagnosing surprises, and knowing when it's time to grow into a bigger shape.

Plan mode applies more loosely here than in design work. Diagnostic commands are fine to run (they're read-only); config patches and file edits still require the user's go-ahead. When an investigation reveals a change is needed, pause, name the change, get approval, then edit — same pattern as `tweaking-existing-agents.md`.

## Part 1 — Observability: what's the agent actually doing?

A running agent produces four kinds of evidence. Know where each lives and you can answer almost any behavior question without guessing.

### 1. Session and turn logs

Every turn is a first-class record. The agent's session log captures the user message, the injected bootstrap, tool calls with arguments, tool results, and the final reply. This is the ground truth for "what did the agent actually see?" and "what did it actually do?".

Useful CLI patterns (verify current flags against `docs.openclaw.ai/cli`):
- `openclaw sessions list` — recent sessions for the default agent.
- `openclaw sessions show <id>` — full turn-by-turn replay of one session.
- `openclaw sessions tail` — follow live turns. Good for catching a heartbeat tick or a cron job firing.
- `openclaw sessions show <id> --tools` — filter to tool calls only, useful when a user reports "the agent said it did X but didn't."

When a user says "the agent forgot that I told it Y", the session log is where you confirm or refute. Look for the teaching turn ("I always want Monday emails summarized on Sunday"), then check whether it landed in `MEMORY.md` or a daily file via a subsequent write. If there's no write tool call, the agent heard the fact but didn't persist it — that's a Memory / Execution-Discipline bucket issue per `tweaking-existing-agents.md`.

### 2. Tool-call audit

For any allowlisted-exec agent (Track B), the shell layer logs every command attempted, whether it matched the allowlist, and whether the user was asked. This is separate from the session log — it persists across sessions and is searchable.

- `openclaw exec log --since "24h"` — commands attempted in the last 24 hours.
- `openclaw exec log --denied` — commands that fell through to `askFallback: deny`. Spike here = either agent is trying to do more than the allowlist permits (policy is too tight) or agent has drifted into attempting things outside its remit (policy working as intended; investigate the drift).
- `openclaw exec log --asked` — commands that prompted the user. Pattern here tells you which layer-2 entries should be promoted to layer-1 (safe introspection) or removed if they're not getting used.

The tool-call audit is also how you verify that a security or policy tweak actually took effect. After tightening `exec-approvals.json`, run the agent through a known command and confirm the log shows the expected outcome.

### 3. Automation run history

Cron jobs, hooks, webhooks, and heartbeat ticks all leave records. These are the only way to answer "did my Sunday email summary actually run last week?"

- `openclaw cron list` — configured cron jobs with schedule.
- `openclaw cron runs --since "7d"` — last week's invocations with exit status.
- `openclaw hooks list` — registered hooks by event type.
- `openclaw hooks runs --event gmail.message.received --since "24h"` — event-triggered runs for one hook binding.
- `openclaw heartbeat status` — recent ticks, how many went to `HEARTBEAT_OK` (silent) vs active-path, average turn cost.

A cron job that's been silently failing for a week will show up here as a stack of non-zero exits. A hook that fires too often will show up as an unexpectedly dense run history. Both are easy to miss by looking only at chat output.

### 4. Memory state

`MEMORY.md` and the `memory/YYYY-MM-DD.md` daily files are human-readable. Read them directly when diagnosing:
- `MEMORY.md` growing past ~5 KB is a context-bloat smell — audit and split out non-durable facts into daily files. See `references/memory-system.md`.
- Daily files older than ~2 weeks should usually have been compacted into `MEMORY.md` (if durable) or dropped (if not). Stale daily buildup is a common cause of session-start cost creep.
- `memorysearch` and `memoryget` (if the agent uses them in AGENTS.md) should show traffic in the session log when the agent is asked about prior context. If it's not using them, that's a tune — probably a missing instruction in AGENTS.md.

If the memory backend is non-default (lancedb, qmd, honcho), verify its own health via whatever native tooling the backend offers — the builtin SQLite store rarely needs inspection; the alternatives sometimes do.

## Part 2 — Diagnosing behavior surprises

When a user says "the agent did X and it shouldn't have" or "the agent didn't do X and it should have", run this diagnostic loop before any edits.

### Step 1: Reproduce or confirm

Ask the user to paste the exact session ID or chat timestamp. Then:
1. Pull the session log (`openclaw sessions show <id>`).
2. Read the user's message, the agent's response, and every tool call in between.
3. Decide: is this a one-off surprise or a pattern? If one-off, note it and move on unless the impact is high. If a pattern, continue.

### Step 2: Narrow to a layer

Agent behavior is the product of six layers. The question is which one failed:

| Layer | Artifacts | "What it controls" |
|---|---|---|
| Persona / voice | `SOUL.md` | Tone, opinion, what the agent refuses or reframes |
| Operating rules | `AGENTS.md` | Procedures, standing orders, Execute-Verify-Report, tool preferences |
| Context / knowledge | `USER.md`, `MEMORY.md`, daily files, `TOOLS.md` | What the agent knows about the user, environment, available tools |
| Tool policy | `openclaw.json` tool sections, `exec-approvals.json` | What the agent is *allowed* to do regardless of what it wants |
| Sandbox | `sandbox.*` config | What the agent is *physically* constrained by |
| Runtime / provider | Model ID, thinking level, temperature | Raw judgment and reliability |

A surprise lives in exactly one of these layers (occasionally two). Finding the right layer short-circuits most of the debugging.

Pattern-matching shortcuts:
- **"Off voice"** (too formal, too cheerful, over-apologizes) → Persona. Edit `SOUL.md`.
- **"Didn't do the step"** (reported done without running; skipped a check; didn't retry) → Operating rules. `AGENTS.md` Execution Discipline or Standing Order.
- **"Forgot a fact"** → Context. Probably `MEMORY.md` didn't get the fact, OR `AGENTS.md` isn't telling the agent to search memory before asking.
- **"Refused to run a command I expected it to"** → Tool policy. Check `exec-approvals.json` layers; also check agent-skill allowlists.
- **"Couldn't read a file in the workspace" / "unexpected filesystem errors"** → Sandbox. Check `workspaceAccess` and mode.
- **"Made a dumb judgment call"** (wrong tool for the job; bad synthesis; hallucinated detail) → Runtime. Consider model bump or thinking level.

### Step 3: Confirm with evidence before editing

Show the user the specific evidence:
- "Session 0x12ab showed the agent didn't call `memorysearch` before answering 'what did I tell you about X' — that's an AGENTS.md bucket, and the specific rule missing is the session-start memory read."
- "The exec log shows the command fell through because layer-2 doesn't include `/opt/homebrew/bin` — that's a tool-policy bucket."

Don't edit until the user agrees which bucket. Matches the diagnostic gate in `references/tweaking-existing-agents.md`.

### Step 4: Make the change, verify with the same evidence

After editing, reproduce the original failing case and confirm the session log or tool-call log now shows the corrected behavior. A change that isn't verified against the same evidence that exposed the problem is a guess.

## Part 3 — Migration: growing into a bigger shape

Agents outgrow their initial shape. Don't treat this as a failure of the original design — the cheapest shape for v1 is almost never the shape for v3. The migrations below are the common trajectories.

**Plan mode applies to every migration.** These are architectural changes, not tweaks. Treat a migration request the same as a new-system request: elicit what's changed, propose the new shape, get explicit approval, then build.

### Migration A → B: Chat/read-only → full operator

**Trigger:** the user wants the agent to start mutating external state — running shell commands, editing config, restarting services.

**Order of operations:**
1. **Re-run threat model.** The old posture assumed read-only; the new one assumes destructive authority. Walk through who can send inbound input and what the worst case is per `requirements-elicitation.md`.
2. **Generate `exec-approvals.json` from scratch** with the three-layer structure. Don't try to port anything — Track A agents don't have exec approvals. See `references/tool-policy-and-security.md`.
3. **Flip hardening flags** to Track-B defaults: `tools.exec.security: "allowlist"`, `ask: "on-miss"`, `askFallback: "deny"`, `strictInlineEval: true`, `autoAllowSkills: false`, `fs.workspaceOnly: true`.
4. **Audit SOUL.md and AGENTS.md for language that no longer fits.** "I only read things" or "I never change state" in SOUL.md needs to go. AGENTS.md needs Execute-Verify-Report tightened if the old version was lax.
5. **Re-run `openclaw security audit --deep`** and exercise each allowlist layer before declaring the migration done.
6. **Channel review.** A Track-A agent on a group chat is fine; a Track-B agent on a group chat is almost never fine. Often the right move is to split: the chat-facing agent stays Track A, and operator authority lives in a separate DM-only agent (that's a B → Track C multi-agent migration, next section).

**Rollback safety:** commit the new `openclaw.json` on a branch, run for at least a day on a low-stakes channel, then cut over. `exec-approvals.json` should also be versioned.

### Migration Pattern 1 → Pattern 2 (single agent → peer agents)

**Trigger:** the single agent has grown two distinct jobs that want different SOULs, different model tiers, different channels, or different tool postures. Telltale sign: AGENTS.md has developed conditional prose ("when the user asks about servers … ; when the user asks about writing …") that really means "this is two agents in a trench coat."

**Order of operations:**
1. **Identify the split point.** Usually a workload boundary (ops vs creative; family chat vs personal ops).
2. **Pick tracks per agent.** They don't have to match. A common pattern: peer A stays Track A on a group channel, peer B becomes Track B on DM only.
3. **Fork the workspace.** Each agent gets its own directory. `MEMORY.md` is usually split by relevance — some memories go to A, some to B, some are duplicated for now and pruned later. Consent of the user on what's duplicated matters.
4. **Per-agent channel bindings.** See `references/multi-agent-routing.md`. Don't let both agents answer on the same channel without explicit routing rules.
5. **Keep for a week, then prune.** Expect over-duplication initially. After a week, check what each agent has actually needed and trim.

**Rollback safety:** the old workspace isn't deleted; it's parked. If the split doesn't pan out, you can re-merge by copying back and disabling the new bindings.

### Migration Pattern 1 → Pattern 3 (single agent → main + subagents)

**Trigger:** the main agent is hitting context ceilings on specific tasks (big doc summaries, multi-file refactors), or cost is spiking because Opus judgment is being used for mechanical work.

**Order of operations:**
1. **Inventory the tasks** that would benefit from subagent isolation. Usually 1–3.
2. **Design one subagent per task**, not a general-purpose subagent. See `references/subagent-design.md`.
3. **Add the authority in AGENTS.md** — the main agent needs to be told when to spawn. Without this, authority-gated main agents won't self-start the delegation even when it would help.
4. **Pick subagent model tier.** Default to Sonnet/Haiku for subagents; reserve Opus for the main agent's judgment pass. See the Cost Reference Table in `automation-and-hooks.md`.
5. **Start with depth 1.** Don't enable depth 2 (subagents spawning subagents) until there's a proven orchestration need.

**Rollback safety:** subagents are additive. If they're not helping, remove the spawn authority from AGENTS.md and stop using them. No destructive migration.

### Migration Pattern 2/3 → Pattern 1 (consolidation)

**Trigger:** you over-split. Two peer agents are doing 80% the same thing; or subagents are costing more than their isolation is worth.

**Order of operations:**
1. **Merge AGENTS.md carefully.** Conditionals come back — but now you have evidence for which conditions matter.
2. **Merge memory.** Dedupe durable facts; keep daily files intact as historical record.
3. **Deprecate the channel bindings** of the losing agent gracefully. Users who were chatting with agent B should be notified that agent A now handles their requests.

Consolidation is rarer than expansion but valid when a split stopped earning its keep.

### Migration: Pattern 4 (hub-and-spoke) / Pattern 5 (event-driven)

These are higher-ceremony and come up less often. Re-do the full system workflow (`references/system-architecture.md`) rather than trying to incrementally morph from Pattern 3. The routing and binding design is different enough that a fresh architecture pass is cheaper than a migration.

## Part 4 — Weekly operating checklist (low-cost, high-value)

For agents in regular use, a 10-minute weekly pass catches drift before it becomes a problem. Offer this to the user as a standing practice, not a mandatory one.

1. **`openclaw security audit --deep`** — confirms no config drift has opened a hole.
2. **Scan the exec log's denied and asked counts** — if numbers are rising, the policy may be too tight or behavior may be drifting.
3. **Check cron run history for non-zero exits** — catch silent failures early.
4. **Check `MEMORY.md` size** — if it's crept past ~5 KB, schedule a memory audit.
5. **Spot-read one random session** from the week — does the agent sound right? Is it using tools the way you'd expect? This is the qualitative check that numbers alone miss.
6. **Note any "new" tool or skill installs** from the week — anything from ClawHub or npm should have been audited at install time, but a weekly re-check is cheap insurance. See `references/security-audit.md`.

A user who runs this checklist weekly will catch 80% of production problems in the first session they surface, rather than three weeks later when the pattern is baked in.

## Part 5 — When to escalate from operating to re-architecting

Migration is the answer when the shape is wrong. Operating is the answer when the shape is right but something inside it is off. The judgment call is which one you're facing.

Re-architect (migrate) when:
- The same diagnostic bucket keeps recurring no matter how you tune AGENTS.md. The bucket isn't the disease; the shape is.
- Two workloads have genuinely divergent needs (model tier, channel, track) and the conditionals in AGENTS.md are getting longer every month.
- Cost is spiraling because premium judgment is being used for mechanical work (solution: subagents on cheaper models).
- Threat posture has changed (Track A agent now needs destructive authority — migrate to Track B, possibly split channels).

Operate (tune) when:
- A single bucket explains the surprise and a targeted edit has fixed similar cases before.
- The user's complaint is about voice or phrasing (persona layer).
- Memory or procedure gaps that can be closed with a rule change.
- Tool-policy tweaks that don't change the agent's fundamental authority.

When in doubt, default to operating first. Migrations are expensive; tunes are cheap. But don't tune endlessly around a shape mismatch — that's how agents become brittle.

## See also

- `references/tweaking-existing-agents.md` — the six diagnostic buckets for complaint-to-surface mapping
- `references/failure-modes.md` — symptom → cause → fix catalog across all surfaces
- `references/security-audit.md` — what to re-verify when migrating tracks
- `references/plan-mode.md` — abbreviated plan-mode still applies to tweaks
- `assets/audit-checklists/quarterly-reaudit.md` — operating cadence for ongoing health
