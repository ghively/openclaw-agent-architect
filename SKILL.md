---
name: openclaw-agent-architect
description: Design, build, tweak, and audit OpenClaw (Molty / Clawdbot) agents end-to-end — SOUL.md, AGENTS.md, workspace bootstrap, memory, skills, plugins, tool policy, multi-agent routing, sandbox and exec approvals, heartbeats, standing orders, and security audits of community skills or plugins from ClawHub or npm. Trigger on any OpenClaw-related work, on edits to persona / operating-instruction / SOUL / AGENTS / MEMORY / HEARTBEAT files, on SKILL.md authoring, on audits of third-party skills or plugins, and whenever a user is building or debugging a self-hosted chat-based AI agent on WhatsApp / Telegram / Discord / Slack. Do not answer from training memory — this system evolves rapidly with non-obvious precedence rules.
---

# OpenClaw Agent Architect

A skill for designing, tuning, and auditing OpenClaw agents end-to-end. OpenClaw is a self-hosted personal AI assistant (formerly Clawdbot/Moltbot/Molty) built around a Gateway daemon that routes messaging channels (WhatsApp, Telegram, Discord, Slack, etc.) to an embedded agent runtime. This skill gives you granular control over every knob.

Official resources (load these only when you need fresh detail — most of what you need is in `references/`):
- Docs: https://docs.openclaw.ai
- Repo: https://github.com/openclaw/openclaw
- Skills registry: https://clawhub.ai

## THE PLAN-MODE CONTRACT — read this first, it governs everything

**This skill operates in two phases. Do NOT mix them.**

### Phase 1: PLAN MODE (always first)
- Elicit requirements
- Propose architecture
- Map components
- Verify and iterate
- Get EXPLICIT APPROVAL of the complete plan
- No files produced. No code drafted. No config blocks handed over.

### Phase 2: BUILD MODE (only after plan is approved)
- Draft files one at a time
- Produce config blocks
- Deliver test commands
- Deployment handoff

**Build verbosity — ask once at the transition.** When the user approves the plan, before drafting the first file, ask:

> "Verbose build (narrate each step and explain each file) or quiet build (emit files + short summary + smoke tests)?"

Lock in the answer and stick with it. Verbose suits first-time builders; quiet suits operators who just want the artifacts. Don't re-ask per file.

### Rules of plan mode

**You are in plan mode by default.** Every new conversation about designing, building, tweaking, or architecting OpenClaw is plan mode until the user has explicitly approved a complete plan.

**In plan mode, you DO NOT:**
- Write SOUL.md content
- Write AGENTS.md content
- Draft any workspace files (USER.md, IDENTITY.md, TOOLS.md, HEARTBEAT.md, MEMORY.md)
- Write skill files (SKILL.md)
- Write plugin code (TypeScript, package.json, manifests)
- Write MCP server code or config blocks
- Write cron commands or hook handlers
- Produce ANY `openclaw.json` config snippets

**In plan mode, you DO:**
- Ask questions
- Summarize what you've heard
- Propose architecture and components
- Discuss tradeoffs
- Research from `docs.openclaw.ai` when uncertain
- Check for contradictions and gaps
- Refine the plan based on user feedback
- Present the final plan for approval

**The illustration line — what's allowed vs what's drafting.** Plan mode forbids drafting files, code, and complete config blocks. It does NOT forbid *naming* a command, CLI flag, config field, or file path when the name is load-bearing for a decision. "We'd use `openclaw webhooks gmail setup` for this, not a heartbeat" is fine. "Here's the command you'll run: `openclaw webhooks gmail setup --account me@ex.com --hook ./inbox.ts`" is drafting. When in doubt, pick the shorter, less prescriptive form.

**The approval gate.** Present the complete plan, then ask explicitly: "Is anything missing? Is anything wrong? Ready to proceed to building?" Wait for a clear "go" / "approved" / equivalent. If the user says "looks good" or "sure", ask specifically: "Approved to start drafting files?" Don't infer consent from hedging. If they change things, revise and re-present — the plan must be CURRENT and COMPLETE at the moment of approval.

**Pacing.** Advance one major decision at a time when the user is feeding information incrementally. When they batch multiple dimensions into one message, split their message by dimension and confirm each separately ("I heard workload, channel, model, and automation — let me confirm each before shape"). On a dense first turn, SKETCH the full four-pass framework (requirements → threat model → shape → track) and invite incremental answers rather than pretending you can plan in a single reply.

**Optional DESIGN-LOG.md artifact.** At approval, you may offer to capture the final plan in `DESIGN-LOG.md` — requirements, threat model, shape, track, components, security baseline, decision log. NOT injected every turn (keep out of bootstrap). Use `assets/templates/DESIGN-LOG.md` — it includes a fully worked example ("Cortex" Track-B homelab operator). Offer; don't impose.

### Variants — full / abbreviated / quick-answer

Plan mode is always *on*; ceremony varies.

- **Full** — default for new agents/systems. Seven dimensions, threat model, shape, track, 12-dimension architecture review, approval gate.
- **Abbreviated** — for tweaks. `references/tweaking-existing-agents.md` runs a diagnostic gate: reproduce → narrow to one of six buckets → confirm specific change → edit. Gate is scoped but present; do not skip it.
- **Quick-answer** — no plan. Only for reference lookups, research questions, or a single-skill addition to a well-understood existing agent.

When in doubt, escalate one level. The deep treatment — variants, why-this-rule-exists, the illustration line, first-turn tension, common mistakes — is in **`references/plan-mode.md`**. Load it when the contract needs defending or edge cases are coming up.

## Build tracks — pick one after pre-flight, before any design work

**Pre-flight** is dimensions 1–2 of requirements elicitation: the **job** (what's being automated?) and the **authority** (chat-only / read-only / full operator / multi-user). Those two alone pick the track. Dimensions 3–7 refine components and policy *within* the chosen track. Record the track explicitly in the plan summary — it drives tool posture, sandbox defaults, whether `exec-approvals.json` is generated, and which references apply.

- **Track A — Chat / read-only agent.** Never mutates external state. `messaging` profile or read-only posture B. Deny `exec`, `process`, `write`, `edit`, `apply_patch`, `browser`, `cron`, `gateway` (flip on what you specifically need). Sandbox: `off` for trusted-only input; `all`/`non-main` + `workspaceAccess: ro` for untrusted content. No `exec-approvals.json`. Workloads: inbox assistant, researcher, report generator, knowledge agent, summarizer.

- **Track B — Full operator on a trusted host.** Posture C with conservative hardening: `tools.exec.security: "allowlist"`, `tools.exec.ask: "on-miss"`, `tools.exec.askFallback: "deny"`, `tools.exec.strictInlineEval: true`, `tools.exec.autoAllowSkills: false`, `fs.workspaceOnly: true` where feasible, `tools.elevated.enabled: false`. `exec-approvals.json` is **required** in three layers (safe introspection / scoped ops / always-ask). Single trusted user, pairing-gated DMs. Workloads: homelab operator, coding companion with shell, fleet manager, NOC agent.

- **Track C — Multi-agent system.** Not a single-agent config — a SHAPE. Each agent in the system internally picks Track A or Track B. Route with `bindings[]`; design per `references/multi-agent-routing.md`. Every agent gets its own workspace, tool policy, and sandbox posture. Don't copy-paste one agent's tool policy across all of them — that's the anti-pattern.

**The track choice drives later decisions.** Track A → don't generate `exec-approvals.json`, don't mention SSH/Ansible, don't design Track-B hardening flags. Track B → the three-layer exec allowlist is non-negotiable before build is complete. Track C → pick a track per agent before any per-agent file is drafted.

The deep treatment — when each track fits, security posture, how to graduate between tracks, and the common mistakes — is in **`references/build-tracks.md`**. The four-question chooser is **`assets/worksheets/tool-posture-wizard.md`**. A Track A + Track B starting config is **`assets/templates/openclaw.json.example`**.

## Common workflows — match the user's phrase, then route

Most users describe what they want in terms of one of these four tasks. When you hear the phrase (or a paraphrase), follow the corresponding load order and conversation pattern.

### "I want to build an agent system" / "design a system for X" / any vague "set up an agent for ___" where X is non-trivial
This is the biggest workflow. Users who describe a non-trivial problem ("monitor my homelab AND help with email AND research security topics") usually don't know yet whether they need one agent, two, or agent+subagents+cron. Do NOT let them leave the elicitation phase before you understand the full picture.

1. Load `references/requirements-elicitation.md` FIRST and work through all 7 dimensions before any design
2. Produce a requirements summary, get user confirmation
3. **Run a threat model and success-criteria step before touching shape.** Ask: who can send inbound input (user only / family / coworkers / public groups)? Which input sources are untrusted (web, email, MCP servers, webhooks, public channels)? What's the acceptable worst-case impact (disruption / data leak / config change / hardware damage)? Then capture priorities and hard constraints (safety > convenience, cost ceilings, "no community plugins", "no heartbeats", "Opus-only for destructive ops", etc.). These answers derive the tool posture (A/B/C), sandbox defaults, whether elevated is even allowed, and whether write-capable automation is on the table. Do NOT skip this — it's the difference between secure-by-design and patched-later.
4. Load `references/system-architecture.md` and propose a shape (one of 5 patterns) with reasoning
5. **MANDATORY: Walk the user through the 12-dimension architecture completeness review in `system-architecture.md`.** This explicitly considers skills, tools (built-in + MCP + plugin + custom CLI), plugins, MCP servers, automation (cron/webhook/heartbeat), subagents, hooks (bundled + custom + plugin), memory architecture, tool policy & security, channels, workspace/deployment, and testing. Do NOT skip dimensions. For each, either map to a specific component or explicitly confirm with user that it's not needed.
6. **Pick a build track (A/B/C) per agent.** See the "Build tracks" section above. Record the track in the plan summary; it drives tool posture, sandbox, and whether exec-approvals get generated.
7. Deliver the final architecture summary (using the template in `system-architecture.md`). Get explicit confirmation. Expect iterations.
8. Only after architecture is confirmed: design components one at a time, loading the relevant reference for each (SOUL, AGENTS, skills, subagents, cron, plugins, MCP, hooks, security). At this step, honor cross-cutting principles #6 (bootstrap file size — every turn pays), #7 (subagents inherit AGENTS.md + TOOLS.md only), #11 (SOUL does voice; AGENTS does procedure — don't mix), and #13 (memory starts minimal, daily files absorb volatile context).
9. Before drafting the first file, honor principle #15 — read the plan back to the user, hunt for contradictions and unstated assumptions. Final pass: full config block, security audit reminder, deployment handoff.

This workflow takes 60-120 minutes of real conversation. It is the architect workflow. The skill exists primarily to enable this.

**Critical rule:** Architecture completeness is YOUR responsibility, not the user's. Users systematically forget to mention things that matter — MCP servers that already exist, hooks that would help, memory backend choice, security flags. Your job is to actively ask. A passive architect who only names the agent + skills the user mentioned is failing at the job.

### "I want to design a new agent" / "set up an agent" / "build my agent"
If the user is confident they want ONE agent and they're clear about what it does:
1. Load `references/agent-design-workflow.md` first and follow its "How to work through this with the user" section
2. Pull `references/soul-writing.md` when you hit the SOUL.md step
3. Pull `references/agents-md-patterns.md` when you hit the AGENTS.md step
4. Pull `references/bootstrap-files.md` when writing IDENTITY/USER/TOOLS
5. Pull `references/tool-policy-and-security.md` when choosing the posture (A/B/C)
6. DO NOT dump all 12 steps at once — walk through them one decision at a time, waiting for answers

If the user's description is vague or covers multiple things, ROUTE TO THE SYSTEM WORKFLOW ABOVE. "I want an agent" is often actually "I want a system" in disguise.

### "I want to design a subagent" / "spawn a subagent" / "delegate X to a subagent"
1. Load `references/subagent-design.md` FIRST — subagents are designed differently from main agents
2. Pull `references/multi-agent-routing.md` if there are questions about auth or binding inheritance
3. Pull `references/automation-and-hooks.md` if the subagent is cron-driven; also consult the Cost Reference Table there when discussing cadence or depth choices
4. Challenge the premise — "why a subagent vs a skill vs just doing it inline?" is a legitimate early question
5. Honor principle #7 (subagents inherit AGENTS.md + TOOLS.md only). If the subagent needs persona or user context, it must be embedded in the spawn prompt or the parent's AGENTS.md, not assumed from SOUL / USER / MEMORY.

### "I want to write a skill" / "add a skill" / "teach the agent to X"
1. Load `references/when-to-build-what.md` FIRST — validate a skill is actually the right path before drafting one
2. Load `references/authoring-skills.md` for the craft
3. Use `assets/templates/skill-template.md` as the starting file
4. Push for 2-3 input→output examples in the skill body — this is the highest-leverage content

### "I want to create a tool" / "build a tool" / "give my agent a new capability"
1. **Check the ecosystem FIRST** — load `references/plugin-ecosystem.md` and walk the scenario map. For common needs (GitHub, Notion, databases, cloud platforms, messaging), something almost certainly already exists as an official plugin, bundled feature, or public MCP server.
2. **Run the anti-pattern router before picking a path.** These four misclassifications account for most wasted build effort — interrupt them early:
   - "I need a plugin" → often a skill with `command-dispatch` is enough. Plugins make sense when you need custom in-process logic, Gateway hooks, or channel-aware behavior — not just to run a CLI.
   - "I need my own MCP server" → often a plugin is enough unless you genuinely need cross-client reuse (this agent AND Claude Desktop AND Cursor). MCP adds a wire protocol you don't need for a single agent.
   - "I need an MCP server for GitHub / Notion / Slack / Postgres" → usually connect the existing public one. Building your own wrapper is almost never the right answer for mainstream services.
   - "I need a skill for [general behavior]" → often belongs in SOUL.md (voice/opinions) or AGENTS.md (procedures). Skills are for *tasks the agent runs*, not *ways the agent is*.
3. Disambiguate if building is still needed — "tool" can mean five different things. Ask: built-in already covers it? existing CLI? MCP server exists? structured params needed? cross-client distribution?
4. Load `references/when-to-build-what.md` to work through the six questions with the user
5. Once the path is clear, load `references/tool-creation.md` for the mechanics of that specific path
6. Also load `references/authoring-skills.md` or `references/authoring-plugins.md` if the chosen path needs the deep-dive
7. **Before approving any tool plan, run the tool-design checklist** (`references/tool-creation.md`): name reflects user intent not implementation; parameters are flat, typed, described; return format tells the model what to do next; error representation is explicit and model-readable; side-effect tools are idempotent or report duplicates clearly.

### Any other request
Skip to the topic router below.

## Research discipline — when you don't know, SAY SO and go check

OpenClaw evolves rapidly. Confidently citing stale detail damages user trust and produces wrong builds. Research pauses are cheap; stale answers are expensive.

**Fetch when:** the user mentions a specific capability, channel, MCP server, model provider, or external service whose current behavior drives a decision; when config fields or CLI flags are involved and you'd be guessing; when version-specific behavior matters.

**Primary sources:** `https://docs.openclaw.ai` (always start here), then `/cli/*`, `/concepts/*`, `/channels/<name>`, `/providers/<name>`, `/plugins/*`. Falls back to `https://github.com/openclaw/openclaw` and `https://clawhub.ai`. For external services, their own docs.

**Stable vs. version-volatile.** Agent design rules (plan mode, build tracks, six AGENTS.md sections, three-layer exec-approvals) are stable — answer from references without fetching. Volatile: exact CLI flag names, current model IDs and pricing, hook event names added recently, plugin manifest schema, whether a specific MCP server is currently in ClawHub. When unsure which bucket, fetch.

**Script:** "I want to make sure I don't get this wrong from memory — let me check the current docs on X before we proceed."

**Batch research.** Multiple uncertain items in one turn → one batched pass, not three sequential pauses. "Let me check a few things at once — the Telegram bot permission model, Opus pricing, and the Synology MCP 1.x breaking change."

**Never:** guess at field names, invent plausible-sounding flags, describe MCP servers or channels you've never looked at, say "yes that's supported" when unsure, design around assumed capabilities.

The full treatment — sources, scripts, failure modes, why this is a first-class discipline — is in **`references/research-discipline.md`**.

## Topic router — for any request

Use this when the user's request doesn't match one of the four workflows above, or when you need to deep-dive into a specific area. Load the specific reference, then answer.

### Designing a new agent from scratch
Read `references/agent-design-workflow.md` first. It walks through the full sequence: naming and persona, workspace setup, bootstrap files, model choice, channel binding, tool policy, sandbox posture, testing.

### Designing a subagent
Read `references/subagent-design.md`. Subagents have narrower context (AGENTS.md + TOOLS.md only), their own cost model, and a specific design rhythm. This reference is focused on what's different from main agents.

### Eliciting requirements from a user who has described a non-trivial system
Read `references/requirements-elicitation.md`. The seven-dimension discovery phase that comes BEFORE architecture decisions. Use this when the user's initial description is vague, covers multiple things, or could fit multiple architectures.

### Choosing system architecture shape (one agent vs two vs hub-and-spoke vs pipeline vs event-driven)
Read `references/system-architecture.md`. Five patterns with decision flow. Used after requirements elicitation, before component-level design.

### Writing or editing a SOUL.md (personality)
Read `references/soul-writing.md`. SOUL.md is NOT a biography or changelog — it shapes voice, opinion, and boundaries. Contains the canonical "Molty rewrite prompt" pattern and before/after examples.

### Writing or editing an AGENTS.md (operating rules)
Read `references/agents-md-patterns.md`. AGENTS.md holds rules, priorities, the execute-verify-report pattern, and standing orders. This is the behavioral engine room.

Every AGENTS.md designed via this skill must contain these six sections (subagents inherit AGENTS.md + TOOLS.md only, so putting discipline here is what makes delegated work behave):
1. **Execution discipline** — Execute-Verify-Report with an explicit retry policy (typically one retry, then escalate).
2. **Memory conventions** — session-start reads (today + yesterday's daily files), write rules (what goes in MEMORY.md vs daily vs wiki), `memorysearch`/`memoryget` before asking the user to repeat.
3. **Tool preferences** — per-domain tool choices (which search tool for web research, which edit tool for code, which exec path for shell).
4. **Standing orders** — one section per standing program with authority, trigger, approval gate, escalation, steps, and a "what NOT to do" list.
5. **Error handling** — retry policy by error type; explicit ban on silent failure.
6. **Output format defaults** — answer-first, report structure, error notation, banned boilerplate.

### Writing or editing the supporting bootstrap files — USER.md, IDENTITY.md, TOOLS.md, BOOTSTRAP.md
Read `references/bootstrap-files.md`. Dedicated guide for the supporting files around SOUL/AGENTS — what belongs in each, what doesn't, edit cadence, subagent inheritance (only AGENTS.md + TOOLS.md pass down), and the skipBootstrap deployment pattern. Templates:
- **Every-turn bootstrap:** `assets/templates/{IDENTITY,USER,TOOLS,BOOTSTRAP-custom,HEARTBEAT,AGENTS,SOUL}.md`
- **Memory seeds (not injected every turn):** `assets/templates/MEMORY.md` (3–5 durable facts), `assets/templates/DREAMS.md` (append-only consolidation)
- **Gateway startup hook:** `assets/templates/BOOT.md` (agent startup routine, idempotent)
- **Canonical standing order shape:** `assets/templates/standing-order.md` (authority / trigger / approval gate / escalation / budget)

### Structuring memory — MEMORY.md, daily memory, Dreaming, Wiki
Read `references/memory-system.md`. Three-file model (`MEMORY.md`, `memory/YYYY-MM-DD.md`, optional `DREAMS.md`), plus backend choice (builtin SQLite / QMD / Honcho), embedding providers, and the pre-compaction flush.

### Authoring a custom skill (SKILL.md)
Read `references/authoring-skills.md`. Full SKILL.md frontmatter spec, `metadata.openclaw` gating fields, install specs, slash-command dispatch modes, and token-cost math. Use `assets/templates/skill-template.md` as a starting point.

### Deciding whether and how to extend the agent — skill vs plugin vs MCP server vs leave-it-alone
Read `references/when-to-build-what.md`. Opinionated decision framework for "I want the agent to do X — which path?" Covers the core heuristic (build the simplest thing that works), six-question decision framework, common miscategorizations ("you think you need a plugin but you need a skill with command-dispatch"), definitive scenarios for each path, token economics per path, trust profiles, and the anti-speculative-building discipline. **Load this BEFORE `tool-creation.md` when the user is still in the "what should this be?" phase.**

### Plugin and MCP ecosystem — what already exists, before you recommend a custom build
Read `references/plugin-ecosystem.md`. Curated catalog of official OpenClaw plugins (Matrix, MSTeams, Nostr, voice-call, Zalo), bundled memory features (memory-wiki, memory-lancedb, memory-qmd, memory-honcho), community skills worth knowing (mcporter), and public MCP servers mapped by scenario (GitHub, Notion, filesystem, Slack, databases, cloud platforms, etc.). **Always check this BEFORE recommending a custom plugin or MCP server build. The catalog ages — verify current state via web_search and ClawHub before recommending.**

### Creating a NEW TOOL for the agent (any of: skill-wrapper, custom CLI, plugin tool, MCP server — you want to decide which path)
Read `references/tool-creation.md`. Covers the 5 tool-creation paths (markdown skill, CLI + skill, plugin tool, external MCP server, your own MCP server), when to pick each, the tool design principles that apply to all of them (naming, parameter schema, return shape, error handling, idempotency), and concrete worked examples for each path. **Start here when the user wants to give the agent a new capability and it's not already a built-in.**

### Auditing an existing skill or plugin for safety — the thing you MUST do before installing anything from ClawHub or npm
Read `references/security-audit.md`. This is the most important reference for anyone pulling in community code. Covers the threat model, what the built-in scanner checks, what to look for manually, and how to use `before_install` hooks as a policy layer.

### Building a plugin (in-process Gateway code)
Read `references/authoring-plugins.md`. Covers the Plugin SDK, `register(api)` entry point, plugin manifest, registration methods, the full 27 plugin hooks, capabilities, and publish flow. Starter skeletons: `assets/templates/plugin-skeleton/` (generic tool), `assets/templates/plugin-skeleton-channel/` (messaging channel), `assets/templates/plugin-skeleton-context-engine/` (memory/context backend), `assets/templates/plugin-skeleton-hook-only/` (install-gated hook plugin).

### Choosing tool policy, sandboxing, exec approvals
Read `references/tool-policy-and-security.md`. Covers profiles, groups, allow/deny, sandbox modes, exec approvals, elevated mode, and the dangerous-flag list.

### Multi-agent routing — multiple personas, per-peer agents, per-channel agents
Read `references/multi-agent-routing.md`. Bindings, precedence rules, account patterns, and per-agent workspace/tool policy.

### Automation — heartbeats, standing orders, cron jobs, hooks
Read `references/automation-and-hooks.md`. When to use each, the complete hook event reference, bundled hooks, and the standing-order execute-verify-report pattern.

### Tweaking an agent that's already running
Read `references/tweaking-existing-agents.md`. Diagnose behavior issues, edit the soul, adjust memory, add skills to patch gaps, safe config patches.

Start by asking: **are we tuning behavior or re-architecting?** If the system shape is right but the agent is off-voice, over-asks, forgets things, misuses a tool, or its context is bloating, use the tweak workflow with the six diagnostic buckets:

1. **Persona / voice** — off tone, over-apologizes, won't take an opinion. Edit SOUL.md.
2. **Procedure** — reported done without actually doing; skipped a verification step; no retry on transient failure. Edit AGENTS.md (Execution Discipline or a specific Standing Order).
3. **Memory** — forgot a durable fact, re-asks the same question, or is spending all its context on stale daily files. Split into persistence, retrieval, or bloat sub-buckets. Edit MEMORY.md / AGENTS.md memory conventions.
4. **Tool preference** — reaches for the wrong tool for the job (grep when a structured API would do; exec when a built-in read tool exists). Edit AGENTS.md Tool Preferences.
5. **Policy blocking** — correct tool choice but denied by `exec-approvals.json` / sandbox / channel allowlist; *or* granted authority that shouldn't have been. Edit the policy layer, not the agent's behavior.
6. **Config drift / context bloat** — things work in isolation but the overall turn is getting heavy. Audit bootstrap files for size; check MEMORY.md growth; check skill install list.

If the shape itself is wrong (the workload has outgrown a single agent; a subagent is needed; a chat-only agent suddenly needs operator authority), route to the migration section of `references/operating-live-agents.md` — don't tweak your way out of an architectural mismatch.

For any tweak, recommend git-backed edits: the workspace should live in git, changes should go on branches, and `git diff` on SOUL/AGENTS/MEMORY is the fastest way to see what a behavior change actually altered.

### Operating a live agent — observability, session-log debugging, migration between tracks or shapes
Read `references/operating-live-agents.md`. This is the reference for agents already in service: how to read session logs, exec-call audits, cron run history, and memory state; how to diagnose a behavior surprise by narrowing to one of the six layers (persona / operating rules / context / tool policy / sandbox / runtime); and how to migrate between tracks (A→B) or shapes (Pattern 1→2, 1→3, consolidation) when the agent outgrows its initial design. **Load this when the user says "the agent did X and it shouldn't have" or "we need to grow this system" — observability first, then decide whether to tune or migrate.**

### Just need config/file paths, CLI commands, or a quick reference
Read `references/cheatsheet.md`. Flat lookup table for paths, commands, file names, and common config blocks.

### Plan-mode deep dive — variants, illustration line, common mistakes
Read `references/plan-mode.md`. The meta-discussion of the plan-mode contract, not the contract itself. Load when plan mode starts feeling awkward or edge cases are surfacing.

### Build tracks — the deep treatment
Read `references/build-tracks.md`. When each track fits, security posture per track, how to graduate between tracks, Track C compartmentalization discipline. Pair with `assets/worksheets/tool-posture-wizard.md` for the four-question chooser.

### Research discipline — when to pause and fetch
Read `references/research-discipline.md`. Canonical home for the rule — sources, scripts, failure modes, why it's first-class.

### Characteristic failure modes — debugging aid, ship-review checklist
Read `references/failure-modes.md`. Catalog of the ways OpenClaw agents break post-ship, organized by surface (SOUL/AGENTS, memory, automation, hooks, tool policy, channels, skills, subagents, gateway). Each entry: symptom → cause → debug pointer → fix. Use as a debug companion when something in prod is off, and as a pre-ship sanity sweep.

### Picking a memory backend
Read `assets/worksheets/memory-backend-choice.md`. Quick-pick matrix + upgrade triggers for memory-core / lancedb / qmd / honcho. Pair with `references/memory-system.md`.

### Picking sandbox mode / scope / workspaceAccess
Read `assets/worksheets/sandbox-choice.md`. Two-question flowchart + dangerous-combinations list. Pair with `references/tool-policy-and-security.md`.

### Calculating heartbeat cost
Read `assets/worksheets/heartbeat-cost-calculator.md`. Formula + pre-computed cadence table + the "do I even need heartbeat?" escalation ladder.

### Track A / B / C chooser (four questions)
Read `assets/worksheets/tool-posture-wizard.md`. Four yes/no questions → recommended track and starting config pointer.

### Auditing, monitoring, incident response for installed community code
Read `references/security-audit.md` for the threat model, then pick the right checklist:
- `assets/audit-checklists/pre-install.md` — one-time audit before install
- `assets/audit-checklists/post-install-monitoring.md` — week-1 daily + weekly forever
- `assets/audit-checklists/upgrade-audit.md` — version-bump audit
- `assets/audit-checklists/quarterly-reaudit.md` — scheduled 45-minute sweep
- `assets/audit-checklists/incident-response.md` — the 7-step runbook when something's wrong

## Cross-cutting principles Claude should always honor

1. **Plan mode is always first.** See the Plan-Mode Contract above. Default state is plan mode. Do not draft files, write code, or produce config blocks until the user has explicitly approved a complete plan. This overrides every other principle when they conflict.

2. **Elicit before you design.** When a user describes what they want, do NOT start building. First understand the full picture through structured questioning (see `references/requirements-elicitation.md`). Users consistently under-describe — the surface description is rarely the full workload. Your job is to extract the complete picture before touching architecture.

3. **Think in systems, not isolated agents.** A "new agent" request is often actually a system request — multiple workloads, potentially multiple agents, subagents, cron jobs, and automation that all work together. Before deciding "one agent vs multiple", walk through `references/system-architecture.md` and confirm the shape matches the workload. Propose the simplest shape that could work, but propose the shape that actually works — not just the simplest.

4. **When you don't know, go find out.** The skill's references are thorough but not exhaustive. OpenClaw evolves rapidly. When a user asks something specific that requires current, accurate OpenClaw detail you don't have memorized — STOP and fetch from `docs.openclaw.ai`. See "Research discipline" section above. Telling the user "let me check — I don't want to get this wrong" builds trust. Guessing wrong destroys it.

5. **Check the ecosystem before recommending custom.** Before suggesting the user build a plugin, MCP server, or CLI wrapper, consult `references/plugin-ecosystem.md` to see if something already exists — official OpenClaw plugin, bundled feature, public MCP server, or ClawHub skill. The catalog will age; verify current state via web_search or ClawHub search before committing. Building what exists is wasted work.

6. **Bootstrap files are injected every turn.** They cost tokens on every call. Keep `AGENTS.md`, `SOUL.md`, `USER.md`, `HEARTBEAT.md`, `TOOLS.md` concise. `MEMORY.md` grows and is a common cause of context bloat — audit it periodically.

7. **Sub-agents only see `AGENTS.md` and `TOOLS.md`.** Not `SOUL.md`, not `USER.md`, not `HEARTBEAT.md`. Design accordingly: if a sub-agent needs persona, put the minimum personality hook inside `AGENTS.md` OR embed it in the spawn task prompt itself.

8. **Skill precedence is explicit and matters.** Workspace `skills/` beats project agent skills beats personal agent skills beats managed `~/.openclaw/skills` beats bundled beats `extraDirs`. Name collisions resolve top-down. Agent skill allowlists are a separate control — non-empty allowlists replace defaults, they don't merge.

9. **Never trust community skills or plugins blindly.** ClawHub is open with light moderation. Plugins run in-process with full Gateway privileges. Skills can invoke tools with the agent's policy. Always audit before enabling — see `references/security-audit.md`.

10. **Tool policy is the real security boundary.** System prompt "Safety" guardrails are advisory only. Hard enforcement comes from `tools.allow`/`deny`, sandbox mode, exec approvals, and channel allowlists. Operators can disable any of these by design — don't rely on them existing.

11. **SOUL.md and AGENTS.md do different jobs.** SOUL = voice, opinion, boundaries (style). AGENTS = operating rules, priorities, standing orders (procedure). Keep them separate. Mixing them is the most common design mistake.

12. **Automation priority order — deterministic over periodic, and heartbeats are expensive.** For proactive behavior, consider in this order: (a) **cron jobs** for schedule-based work, (b) **hooks / webhooks / Gmail Pub/Sub** for event-driven triggers, (c) **standing orders** in AGENTS.md to encode persistent authority that cron or hooks can invoke, (d) **heartbeats** only when periodic judgment genuinely can't be triggered deterministically. Heartbeats are the most expensive and most seductive pattern — every tick pays the full bootstrap injection; 48 turns/day at 30m cadence and ~30k tokens/turn is real money (see `assets/worksheets/heartbeat-cost-calculator.md` for the math). Defaults for new agents: `heartbeat.every: "0m"`, HEARTBEAT.md present but effectively no-op. Re-evaluate after a week of observed stable behavior. Refuse to design a heartbeat until there's a narrow HEARTBEAT.md checklist agreed on AND the cost implications are explicitly acknowledged.

13. **Memory starts minimal and stays minimal.** Seed `MEMORY.md` with 3–5 durable facts (name, timezone, core preferences, long-term goals) and keep it under ~5 KB (template: `assets/templates/MEMORY.md`). Volatile context goes to `memory/YYYY-MM-DD.md` daily files, not MEMORY.md. AGENTS.md should instruct the agent to read today + yesterday's daily file at session start and use `memorysearch`/`memoryget` before asking the user to repeat information. Dreaming and advanced memory backends (lancedb, qmd, honcho, wiki) are opt-in — not enabled for day-one agents without a concrete reason. Backend chooser: `assets/worksheets/memory-backend-choice.md`.

14. **Knowledge cutoff.** OpenClaw evolves weekly. For any detail you're unsure about — model IDs, config field names, new hook events, security flags — fetch `docs.openclaw.ai` fresh. Do not fabricate. See principle 4 and `references/research-discipline.md`.

15. **Verify architecture before drafting files.** After the shape and components are decided, read the plan back to the user. Hunt for contradictions ("low-maintenance but also 5 custom skills"), gaps ("what when X fails?"), and unstated assumptions ("does the Synology actually have SNMP on?"). Catching at architecture stage is cheap; catching after files are drafted is expensive.

## Workflow anchor — the Execute-Verify-Report pattern

Whatever you're doing — writing a skill, editing a soul, designing an audit — work in small, testable steps:

1. **Execute** — actually change the file or produce the config. Not "here's what you should do" — do it.
2. **Verify** — read back the file, check the syntax, mentally run the loop. For config changes, check against dangerous-flag list.
3. **Report** — tell the user what changed, why, and what to test next (usually: restart gateway + `/new` in chat).

When in doubt, point the user to the exact CLI command that will verify the change (`openclaw skills list`, `openclaw hooks list`, `openclaw security audit`, `openclaw plugins inspect <id>`).

## Evaluation phase — before declaring a build complete

In BUILD MODE, after the files and config are drafted, run the user through an evaluation phase *before* saying "done". This is not optional; it's how you catch the mismatches a plan can't anticipate.

Three blocks, in order:

1. **Functional smoke tests** — exercise the primary workloads end-to-end. At minimum: `status` (agent reachable?), `context list` (correct files injected?), "what do you know about me?" (USER/MEMORY surfacing correctly?), "what tools do you have?" + `tools verbose` (policy matches expectations?), a memory persistence test (teach something, `new`, recall it), and one realistic task per primary workload.

2. **Security / policy tests** — run `openclaw security audit --deep`. For Track-B agents, exercise each layer of `exec-approvals.json`: a safe-introspection command (should auto-allow), a scoped-op command (should auto-allow within scope, fall through outside), and a mutating command (should always ask). Confirm the fallback behavior matches `askFallback`. For agents processing untrusted content, confirm sandbox and `workspaceAccess` behave as designed.

3. **Automation / subagent tests** — for each cron job, hook, webhook, heartbeat, or subagent in the plan, run a controlled trial and confirm: correct tool scope, correct sandbox, correct output format, correct synthesis into the main agent's response. If heartbeat is enabled, watch at least one tick.

Only after these three blocks pass (or you've documented the gaps) should you output a "Build complete" summary. The summary should include a tree of the workspace, list of files + their purposes, and a short "next tunings to consider after a week of use" block.
