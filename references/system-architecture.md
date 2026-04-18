# System Architecture — Choosing the Shape

You've done requirements elicitation. You know what the system needs to do, for whom, via which channels, with what automation. Now decide the SHAPE.

Wrong shape is the most expensive mistake in OpenClaw design. A single agent doing four unrelated jobs gets rebuilt as a multi-agent system later. A multi-agent system built too early creates maintenance burden for workloads that should have been skills in one agent. Subagents fired inline where cron was needed produce flaky results.

Your job in this phase is to match the requirements to the right system shape, justify the choice, and then walk the user through the component designs that make that shape work.

## How to work through this with the user

**Pace:** 10-20 minutes. This phase is about deciding; the detailed drafting happens after.

**Sequence:** Review requirements → propose shape with reasoning → discuss alternatives → confirm → enumerate components to design.

**Don't:**
- Propose the most complex shape because it sounds sophisticated
- Default to "one agent" because it's simple — some requirements genuinely need more
- Split into multiple agents because the user mentioned "different contexts" — that's often a soul/binding/skill answer, not a multi-agent answer
- Skip the reasoning — always explain WHY the proposed shape fits the requirements

**Do:**
- Start with the simplest shape that could possibly work
- Call out explicitly when you're over-engineering and offer the simpler path
- Discuss tradeoffs — every shape has costs
- Map each workload from requirements to a specific component in the chosen shape

**What "done" looks like:** The user has confirmed a shape (one of the patterns below) and you've listed the specific components to be designed (e.g., "one main agent with persona X, three skills Y/Z/W, two cron jobs A/B, one subagent pattern for C").

## The system shapes — five patterns

### Pattern 1 — Single agent (the default)

```
[User] <--> [Agent] <--> [Model API]
              |
         [Workspace]
         [Tools: skills, built-ins]
         [Optional: cron jobs, heartbeat]
```

**When this fits:**
- Single user
- 1-3 distinct job categories that share personality and context
- All channels can use the same voice
- No workload is heavy enough to blow context alone

**Example:** "Personal assistant for inbox, calendar, and homelab on WhatsApp + Telegram." One agent, one workspace, one personality. Skills for specific domains (inbox triage, calendar operations, homelab health). Cron for scheduled work (morning brief). Optional subagents for research.

**Why this is the default:** Lower maintenance, one workspace to git, one identity to iterate on, one set of auth credentials. Most requirements fit here.

**Signs you should STAY with single-agent even when tempted to split:**
- "I want different personas for different channels" → one agent, SOUL.md with context-awareness rules, channel-aware behavior in AGENTS.md
- "I want a serious one and a casual one" → same agent, soul handles context
- "I want work stuff separate from personal" → maybe, maybe not — see Pattern 2

### Pattern 2 — Peer agents (independent specialists)

```
[User] <--> [Agent A: personal] <--> [Model]
[User] <--> [Agent B: work]     <--> [Model]
[User] <--> [Agent C: family]   <--> [Model]

Separate workspaces, separate auth, separate session stores.
```

**When this fits:**
- Genuinely different personas that would contradict each other in one agent (blunt personal vs professional work)
- Different trust models (personal agent has full tool access; work agent read-only)
- Different model/cost preferences (Opus for one, Sonnet for another)
- Per-user isolation within a household (everyone in the family gets their own agent with separate memory)

**Example:** "My personal assistant is blunt and has full tool access to my homelab. My work agent is professional-toned, read-only, and only sees work channels." Two agents, two workspaces, bindings route per-channel.

**Cost:**
- Two workspaces to maintain, git, update
- Two sets of auth (unless explicitly sharing via copied profiles)
- Context does NOT share between them — agent A doesn't know what agent B discussed

**When to push back on this pattern:**
- User wants two agents because "one gets confused about context" → that's a memory design problem, not a multi-agent problem
- User wants two agents to split cost → cheaper subagents inside one agent may solve this better

### Pattern 3 — Hub and spoke (one main, multiple subagents)

```
[User] <--> [Main Agent]
                |
           spawns subagents
                |
    [Subagent A]  [Subagent B]  [Subagent C]
    (research)    (data crunch) (content draft)
```

**When this fits:**
- Main agent handles the user-facing conversation and synthesis
- Discrete workloads are parallelizable or context-heavy and benefit from isolation
- Work fans out, then results synthesize back in main

**Example:** "Research assistant that spawns workers to investigate 5 topics in parallel, then synthesizes." One main agent, ephemeral subagents spawned per task, `maxSpawnDepth: 1`.

**Cost:**
- Subagents run on their own model + token budget (mitigate with `agents.defaults.subagents.model: cheap-model`)
- Subagents don't inherit SOUL/USER/IDENTITY — task prompts must carry context
- Announce-back is best-effort; if gateway restarts mid-run, results lost

**When this is overkill:**
- Task is sequential, not parallel → main agent handles it directly
- Task is short (<30 sec) → subagent overhead > benefit
- Task needs the user's tone/context → subagent can't easily inherit it

### Pattern 4 — Pipeline (orchestrator + workers, depth 2)

```
[User] <--> [Main Agent]
                |
           spawns orchestrator
                |
           [Orchestrator]
                |
           spawns workers
                |
   [Worker A]  [Worker B]  [Worker C]
```

**When this fits:**
- Workload is genuinely multi-stage: fan out to workers, synthesize in orchestrator, deliver to user via main
- Main agent should NOT be tied up in the fan-out/synthesis work
- The orchestration itself is substantial (not just a for-loop)

**Example:** "Weekly research report: gather from 10 sources, synthesize into 3 themes, package as final report." Main agent takes the ask, spawns orchestrator, orchestrator spawns 10 workers, collects results, produces themed synthesis, reports back to main.

**Cost:**
- `maxSpawnDepth: 2` required
- Complexity explodes — debugging a depth-2 problem is 2x harder than depth-1
- Cost x3 baseline (main + orchestrator + workers) if all on premium models

**Default recommendation:** Don't go to depth 2 unless you've tried depth 1 and specifically hit the "orchestration should be its own subagent" need. Most users never need this.

### Pattern 5 — Event pipeline (external triggers + cron + agents)

```
[External event: email, webhook, file, schedule]
                |
           [Webhook/Cron]
                |
       [Isolated agent session]
                |
   (optional: spawns subagents)
                |
           [Deliver result]
```

**When this fits:**
- Most work is AUTOMATED, not interactive
- External events drive the agent (Gmail PubSub, webhooks, file watchers)
- Results are delivered to user via notifications, not via conversation
- The main agent is mostly asleep; cron/webhook wakes it for specific jobs

**Example:** "Monitor my servers and alert me. Watch for email from investors and draft replies. Weekly report on metrics." This is NOT a conversational agent — it's a set of automated pipelines that occasionally deliver to the user.

**Design notes:**
- Cron jobs are first-class; they're not afterthoughts
- Heartbeat is disabled; deterministic triggers only
- `--light-context` often appropriate for narrow triggered tasks
- Main agent's AGENTS.md is heavy on standing orders
- User-facing mode uses the same agent but for manual check-ins

## How to pick a shape — the decision flow

Given the requirements elicitation output, apply in order:

1. **Multiple users with different trust levels?** → Pattern 2 (peer agents)
2. **Genuinely contradicting personas across contexts?** → Pattern 2 (peer agents)
3. **Most work is automated (cron/webhook/events)?** → Pattern 5 (event pipeline)
4. **One workload has genuine fan-out parallelism?** → Pattern 3 (hub + subagents) for that workload; Pattern 1 for the rest
5. **The orchestration itself is substantial?** → Pattern 4 (depth-2 pipeline), but only after proving Pattern 3 isn't enough
6. **None of the above?** → Pattern 1 (single agent)

Most systems land on Pattern 1 with some Pattern 3 elements for specific workloads. That's healthy. Resist the urge to show sophistication by proposing Pattern 2 or Pattern 4 when simpler works.

**Migrations between shapes.** When a deployed system outgrows its starting shape — Pattern 1 splitting into Pattern 2, a single agent gaining subagents (Pattern 3), or an over-split system consolidating back to Pattern 1 — the migration workflows live in `references/operating-live-agents.md` (Part 3). This includes memory preservation, per-agent workspace forking, channel re-binding, and rollback safety. **Do not** treat a migration as tweaks: migrations are architectural and require a fresh plan-mode pass, not piecemeal edits.

The same reference also covers Track migrations (e.g., a read-only Track A agent gaining destructive authority and becoming Track B) — those usually involve a security re-baseline and an `exec-approvals.json` bootstrap, not just a policy delta.

## The architecture summary

After picking a shape, write this back to the user:

```
SHAPE: [Pattern 1-5 name]
WHY THIS FITS: [2-3 sentence reasoning from requirements]

COMPONENTS TO DESIGN:
- [Component 1: type + purpose]
- [Component 2: type + purpose]
- ...

OPEN QUESTIONS:
- [Anything I couldn't determine from requirements — needs the user to decide]

NEXT STEPS:
- [The order we'll design the components]
```

Example:

```
SHAPE: Pattern 1 (single agent) with Pattern 3 subagent pattern for research

WHY THIS FITS:
You described a single personal assistant for homelab + inbox + calendar. 
These jobs share a personality and context, so one agent is correct.
However, the weekly security research workload is context-heavy and 
parallelizable — that's a natural subagent job.

COMPONENTS TO DESIGN:
- Main agent "homelab" on Telegram (primary) + WebChat (secondary)
  - SOUL: direct, terse, opinionated DevOps peer
  - AGENTS: execute-verify-report, memory conventions, 3 standing orders
  - Model: Opus for main, Sonnet for subagents
  - Sandbox: non-main, scope session, workspaceAccess rw
- Skills:
  - rapid7_risk_report (parse InsightVM CSVs — you already have this script)
  - synology_health_check (query your NAS, report status)
  - weekly_infra_brief (generate the weekly doc)
- Cron jobs:
  - weekly-security-research (Sunday 10 AM, spawns subagent)
  - daily-morning-brief (weekdays 7:30 AM, main session)
- Subagent pattern: research worker, task-prompted per invocation

OPEN QUESTIONS:
- Do you want BOTH Telegram and WebChat, or is one primary and other fallback?
- Does the morning brief include inbox triage, or just infrastructure?

NEXT STEPS:
1. Identity + persona (SOUL.md)
2. Operating rules + standing orders (AGENTS.md)
3. User context + tools (USER.md, TOOLS.md)
4. Memory seed (MEMORY.md)
5. Skills (three of them, in order of complexity)
6. Subagent task prompt and config
7. Cron jobs
8. Config (channels, tool policy, sandbox)
9. Smoke test
```

Get explicit confirmation of this summary before moving to design. Iterate as needed.

## Mapping workloads to components

When producing the "COMPONENTS TO DESIGN" list, use this mapping from requirements to component type:

| Workload characteristic | Component type |
|------------------------|----------------|
| Persistent behavior rule | Add to AGENTS.md |
| User-interactive, bounded task type | Skill |
| Deterministic scripted work | Skill + custom CLI |
| Structured typed function call | Plugin tool |
| Third-party API integration (existing) | MCP server (connect) |
| Third-party API integration (novel) | Plugin or your own MCP server |
| Scheduled recurring work | Cron job |
| Event-triggered work | Webhook + mapped hook OR Gmail PubSub |
| Parallelizable heavy work | Subagent (Pattern 3) |
| Multi-stage orchestration | Depth-2 subagent pipeline (Pattern 4) |
| Proactive check-in / monitoring | Heartbeat (with care) OR cron with `--session main` |
| Tool call interception / policy | Internal hook OR plugin hook |
| Command audit trail | Enable `command-logger` bundled hook |
| Custom model provider | Plugin |

Walk through each workload from requirements and assign a component. This is your design checklist.

**Before you commit to "plugin" or "your own MCP server" for any component: check `references/plugin-ecosystem.md`.** Most third-party integrations (GitHub, Notion, Slack, Linear, databases, cloud platforms, messaging beyond the built-in set) are already covered by official plugins, bundled features, or public MCP servers. Custom-building what exists is wasted effort and unneeded maintenance burden. The catalog's "check before you build" protocol is: built-in → official plugin → bundled feature → public MCP server → ClawHub community → only THEN custom.

## Architecture completeness review — MANDATORY before finalizing

Passive workload-mapping is not enough. Users frequently under-describe requirements, meaning workloads that SHOULD exist get omitted. Your job is to proactively ask about every capability dimension before finalizing architecture — NOT wait for the user to bring them up.

Before delivering the final architecture summary, walk through this review out loud with the user. For each dimension, either (a) map it to a specific component you're including, or (b) explicitly confirm with the user that it's not needed. DO NOT leave a dimension unanswered by assuming silence means "not needed."

### Dimension 1 — Skills

For each distinct task-domain the system will handle:
- Does it need its own skill? (specific, repeatable, bounded task)
- Is it really an AGENTS.md preference instead? (general behavior rule)
- Are there existing ClawHub skills that would fit?

Ask the user: "For each of these workloads, do you want a dedicated skill or is this general enough to live as an AGENTS.md rule?"

### Dimension 2 — Tools (built-ins, extended)

For every capability the system needs:
- Do built-in tools (exec, read, write, web_fetch, browser, memory_*, message, etc.) cover it? → no build needed
- Does an existing MCP server cover it? → connect external MCP
- Does it need a custom CLI the agent wraps via exec? → CLI + skill
- Does it need typed parameters the model sees as structured fields? → plugin tool
- Needed by multiple MCP clients beyond OpenClaw? → your own MCP server

Ask explicitly: "What external services / APIs / tools does this system need to integrate with? For each: is there an existing MCP server, or do we need to build something?"

### Dimension 3 — Plugins

Beyond tool registration, do any of these apply?
- **Lifecycle hooks** — intercept tool calls, modify prompts, log events → plugin or internal hook
- **Memory backend swap** — replace default memory-core with LanceDB / QMD / Honcho / Wiki → plugin
- **Context engine** — custom context assembly / compaction → plugin
- **Custom model provider** — non-standard LLM endpoint → plugin
- **New channel** — messaging platform OpenClaw doesn't already support → plugin
- **HTTP endpoints** — gateway exposes custom routes → plugin

Ask: "Do you need anything to observe, block, or modify agent behavior across tools? Replace memory or context behavior? Support a model or channel that isn't built-in?"

### Dimension 4 — MCP servers

Check these possibilities:
- **External (connect only)** — existing servers for GitHub, Notion, Slack, Filesystem, Context7, Brave, Linear, Stripe, etc.
- **`mcporter` community skill** — natural-language config management instead of hand-editing JSON
- **Your own MCP server** — proprietary integration or cross-client reuse
- **OpenClaw AS an MCP server (`openclaw mcp serve`)** — expose this Gateway to Claude Desktop, Cursor, or Codex as an MCP tool source

Ask: "Any third-party services the agent should interact with? I'll check if there's an existing MCP server before we build anything."

When a candidate MCP server comes up and you don't have current detail on it, STOP AND RESEARCH per the main skill's research discipline rules.

### Dimension 5 — Automation (cron, webhooks, heartbeat, standing orders)

For each proactive or scheduled behavior:
- **Cron job** — scheduled (daily/weekly/cron expression)
  - Session mode: main / isolated / custom
  - Model: override to cheaper tier?
  - Delivery: announce to channel / webhook / internal-only
  - Failure destination: where do failure notifications go?
- **Heartbeat** — periodic wake, reads HEARTBEAT.md
  - Should this exist? Default recommendation is `every: "0m"` until proven
- **Webhooks** — external HTTP triggers
  - `/hooks/wake` for system events
  - `/hooks/agent` for isolated runs
  - Mapped hooks for custom payloads
  - Gmail PubSub if email-triggered
- **Standing orders** — persistent authority in AGENTS.md
  - What's the authority? What's the approval gate? What's the escalation?

Ask: "What should happen automatically without the user being present? Scheduled reports? Email monitoring? Webhook triggers? Periodic health checks?"

### Dimension 6 — Subagents

Revisit subagent need based on the full workload:
- Any workload that's parallelizable? (research across N sources, process N files)
- Any workload heavy enough to blow main context? (summarize long docs)
- Any workload needing isolation from main session? (untrusted content)
- Depth 1 (leaf workers) or depth 2 (orchestrator pattern)?

Decide per subagent:
- Task prompt structure
- Tool scope (default deny, allow narrowly)
- Sandbox posture
- Model tier (cheaper than main)
- Announce/delivery pattern

Ask: "Are there any tasks in here that should run in parallel or in isolation from the main conversation?"

### Dimension 7 — Hooks (internal + plugin)

Beyond plugin hooks from Dimension 3:
- **`command-logger`** bundled hook — enable for audit trail. Recommended for any gateway with community code.
- **`session-memory`** bundled hook — saves session to memory on `/new` or `/reset`
- **`bootstrap-extra-files`** bundled hook — inject additional workspace files
- **`boot-md`** bundled hook — run BOOT.md on gateway startup
- **Custom internal hooks** — workspace-local or managed, triggered on command events, session events, message events
- **`before_install` hook (from plugin)** — policy gate for skill/plugin installs, strongly recommended when a gateway will have any community code installed

Ask: "Should we enable command logging for audit? Do you want a pre-install security gate for third-party skills?"

### Dimension 8 — Memory architecture

For the system as a whole:
- **Memory backend:** memory-core (default SQLite) / memory-lancedb / memory-qmd / memory-honcho
- **Memory Wiki plugin?** — structured knowledge with provenance tracking
- **Dreaming?** — consolidation + promotion (opt-in, usually later)
- **External collections?** — Obsidian vault, project notes, other directories indexed via QMD
- **Cross-agent memory search?** — only if multi-agent (Pattern 2)
- **Embedding provider** — auto-detected from OpenAI/Gemini/Voyage/Mistral keys, confirm one is available

Ask: "Besides conversational memory, does the agent need structured knowledge — like an Obsidian vault, internal docs, or a wiki?"

### Dimension 9 — Tool policy & security

For each agent in the system:
- **Posture:** A (chat-only) / B (read-only operator) / C (full operator)?
- **Sandbox:** off / non-main / all? scope agent/session/shared? workspaceAccess none/ro/rw?
- **Exec approvals:** security deny/allowlist/full? ask off/on-miss/always? `strictInlineEval: true`?
- **Elevated mode:** enabled? allowlist?
- **Channel DM policies:** pairing / allowlist / open? (never `open` on a personal assistant)
- **Approval forwarding:** where do approval prompts go when Control UI isn't open?
- **Any `dangerously*` flags needed?** (almost always NO — flag for serious review if any yes)

Ask: "What's the trust model? Who can talk to this agent, and what should it be allowed to do on their behalf?"

### Dimension 10 — Channels and surfaces

Confirm from requirements:
- Which channels are paired? Account names?
- Primary vs secondary channels?
- DM policy per channel
- Group chat behavior (mention required? activation?)
- Native slash commands vs text commands?
- Control UI access? Tailscale / Cloudflare tunnel / loopback only?
- WebChat access pattern?
- Approval delivery per channel (Telegram DMs, Discord buttons, etc.)?

Ask: "Confirmed channel list — anything else?"

### Dimension 11 — Workspace & deployment (design-side only)

For each agent in the system:
- Workspace path (`~/.openclaw/workspace` / `~/.openclaw/workspace-<name>`)
- Git backing for the workspace (strongly recommended)
- `skipBootstrap` vs interactive bootstrap ritual?
- Per-agent `agentDir` isolation
- Pre-filled files from a template repo vs generated fresh?

Ask: "Do you want these workspaces git-tracked from the start? Pre-filled from a template or generated via bootstrap Q&A?"

### Dimension 12 — Testing and iteration

Before finalizing, confirm the testing/iteration plan:
- Smoke test checklist for each agent
- How to iterate on SOUL.md when voice drifts
- How to iterate on AGENTS.md when procedure fails
- How to monitor cron job reliability
- How to audit what's installed over time (`openclaw security audit --deep`)

Ask: "Are you comfortable with the feedback loop for iterating on this after launch?"

## Final architecture summary template

After walking the user through all 12 dimensions, produce the final architecture document:

```
SYSTEM ARCHITECTURE: [name]

SHAPE: Pattern [N] — [pattern name]
REASONING: [2-3 sentences from requirements]

AGENTS:
- [agent-id-1]
  - Purpose: [one sentence]
  - Channels: [list]
  - Model: [provider/model]
  - Sandbox: [mode, scope, workspaceAccess]
  - Tool posture: [A/B/C] with [specific allow/deny]
  - Exec approvals: [policy]
  - Workspace: [path]

SKILLS:
- [skill_name_1]: [purpose + dispatch mode]
- [skill_name_2]: [purpose + dispatch mode]
- [from ClawHub: `mcporter`, etc. if any]

TOOLS (plugin-registered):
- [tool_1]: [from which plugin]
- [tool_2]: [from which plugin]
OR: None — built-ins cover everything

MCP SERVERS:
- External: [server_name] ([stdio/sse/streamable-http]) — [purpose]
- Your own: [name if building one] — [purpose]
OR: None

PLUGINS:
- [plugin_id_1]: [capabilities — tools/hooks/providers/channels]
- [plugin_id_2]: ...
OR: None — core + skills + external MCP cover the needs

HOOKS:
- Bundled: [command-logger / session-memory / bootstrap-extra-files / boot-md — which enabled]
- Plugin hooks: [from which plugins, what they do]
- Custom internal hooks: [if any]

AUTOMATION:
- Cron jobs:
  - [name] — [schedule + session mode + message + delivery]
  - ...
- Webhooks: [paths + auth + what they trigger]
- Heartbeat: [every: "Xm" or disabled]
- Standing orders (in AGENTS.md): [list program names]

SUBAGENT PATTERNS:
- [pattern name] — depth [1/2], task prompt pattern, tool scope, model tier
- ...
OR: None — no workloads justify subagents

MEMORY:
- Backend: [memory-core / memory-qmd / etc.]
- Wiki: [enabled/disabled]
- External collections: [paths if any]
- Embedding provider: [detected one]

SECURITY BASELINE:
- command-logger: [enabled]
- before_install policy: [enabled/not]
- Workspace permissions: 700
- Config permissions: 600
- Dangerous flags: [none / list any needed with justification]

DEPLOYMENT TARGET:
- Host: [Synology / VPS / Mac / etc.]
- Network access: [loopback / Tailscale / Cloudflare tunnel]
- Workspace git backup: [yes/no]

OPEN QUESTIONS:
- [any decisions deferred — needs user to make]

NEXT STEPS (design order):
1. [Component A] — using references/[X].md
2. [Component B] — using references/[Y].md
3. ...
```

Deliver this summary. Get EXPLICIT approval before moving to component design. Use the main SKILL.md contract's approval-gate script:

> Here's the complete plan.
>
> [full architecture summary as above]
>
> Before I start drafting any files, I need your explicit approval. Review this plan and tell me:
> - Is anything missing?
> - Is anything wrong?
> - Ready to proceed to building?

Wait for a clear "go" / "approved" / "let's build" / equivalent. Do NOT infer consent from hedging language ("looks good", "sure") — follow up with "Approved to start drafting files?" if the response is ambiguous.

If the user catches something missed (and they often will), revise and re-present. You may iterate multiple times — that's healthy. The plan must be CURRENT and COMPLETE at the moment of approval.

Only AFTER explicit approval, move to component-level design, one component at a time.

## Why every dimension matters

Users often try to skip dimensions because they haven't thought about them. That's exactly why you must ask. The most expensive architecture mistakes are things the user didn't realize they needed to consider:

- **Forgot about MCP servers** — system gets built with custom plugins for things existing MCP servers cover
- **Forgot about hooks** — no audit trail, no pre-install gate, can't trace behavior later
- **Forgot about memory backend** — default works but user hits scaling issues at 20k memory entries that QMD would have solved
- **Forgot about security posture** — agent deployed with `security: "full"` and `autoAllowSkills: true` because defaults sounded reasonable
- **Forgot about subagent cost** — subagents running on premium model, user gets sticker shock
- **Forgot about channel approval forwarding** — approval prompts never delivered because Control UI isn't open
- **Forgot about workspace git backing** — disaster on first hardware failure
- **Forgot about `strictInlineEval`** — inline `python -c` becomes a backdoor

None of these show up in basic requirements elicitation. They surface only when you actively walk through capability dimensions during architecture.

## Common architecture mistakes

### Over-splitting into agents
User mentions "work vs personal" and you propose two agents. Often one agent with SOUL.md context-awareness is enough. Only split when the agents would genuinely contradict each other's operating rules.

### Under-using subagents
User describes "research 5 things in parallel and synthesize" and you propose doing it inline. Main agent will blow context. This is a subagent job.

### Skill for what should be AGENTS.md
User wants "always confirm before destructive operations." That's not a skill (no specific task it wraps) — it's an AGENTS.md rule.

### Plugin for what should be a skill
User wants "agent knows to use `jq` for JSON." That's a TOOLS.md line + maybe a skill. Not a plugin.

### Cron for what should be user-driven
User wants "daily brief of my infrastructure." Cron — yes. But also: what if user wants to manually trigger it? Skill + cron, not cron alone.

### Subagent for what should be inline
User wants "summarize this file I just uploaded." Main agent does this directly; no need to spawn.

### Event pipeline built when interactive is fine
User talks to their agent 10 times a day. They don't need a full event pipeline — they need a good interactive agent with a few cron jobs on the side.

### Missing a capability dimension entirely
This is worst. User gets through design thinking everything is covered, but no one asked about (pick any): hook-based audit trails, MCP servers that would have replaced a custom plugin, memory backend choice, exec approval forwarding, workspace git backup, `strictInlineEval`. These gaps compound over time. The 12-dimension review exists specifically to prevent this.

## When architecture needs research

If during shape selection or the 12-dimension review you need specific OpenClaw capability detail (can I do X? how does Y work? does MCP server Z exist?), stop and fetch from docs. Don't commit to a shape or component based on guessed capabilities.

Common questions that need research:
- Does channel X support thread bindings / voice messages / native slash commands?
- Can Gmail PubSub be self-hosted or does it require cloud?
- What's the current concurrency limit for subagents?
- Does MCP server Y have authentication support? What's its current tool surface?
- How does tool approval forward to channel Z?
- Is there an MCP server for service W? (search modelcontextprotocol/servers on GitHub)
- What transport does MCP server V use?
- What's the current behavior of hook N when condition M applies?

When in doubt:
- `web_fetch` the relevant `docs.openclaw.ai` page
- `web_search` for MCP servers by the service name
- Fetch the target MCP server's README from GitHub to verify current tool surface
- Don't design around assumptions

Research pauses during architecture are healthy. The user would rather wait 30 seconds for you to verify than get a committed architecture based on incorrect assumptions.

## After architecture is confirmed

Output of this phase is the confirmed shape + the components-to-design list. Next phase: walk through each component using the existing references:

- Main agent persona: `soul-writing.md` + `agents-md-patterns.md` + `bootstrap-files.md`
- Skills: `authoring-skills.md`
- Tool decisions (plugin/MCP/etc.): `when-to-build-what.md` + `tool-creation.md`
- Subagents: `subagent-design.md`
- Cron/hooks/heartbeats: `automation-and-hooks.md`
- Multi-agent setups: `multi-agent-routing.md`
- Security posture: `tool-policy-and-security.md` + `security-audit.md`
- Config: `cheatsheet.md` for paste-ready blocks

Don't try to design everything at once. Design one component, verify with user, move to next.

## See also

- `references/requirements-elicitation.md` — inputs to the shape decision
- `references/build-tracks.md` — after shape, pick A/B/C authority track
- `references/multi-agent-routing.md` — the bindings layer for Track-C shapes
- `references/subagent-design.md` — "main + subagents" is one of the five shapes
- `SKILL.md` — the five shapes are listed in the plan-mode workflow step 3
