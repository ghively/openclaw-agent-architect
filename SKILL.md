---
name: openclaw-agent-architect
description: Design, build, tweak, and audit OpenClaw agents end-to-end — SOUL.md personality, AGENTS.md operating rules, workspace bootstrap files, memory system, skill authoring, plugin development, tool policy, multi-agent routing, sandbox/exec approvals, heartbeats, standing orders, and security auditing of third-party skills/plugins from ClawHub or npm. Use whenever the user mentions OpenClaw, Molty, Clawdbot, personal AI assistants, agent souls, SOUL.md, AGENTS.md, MEMORY.md, HEARTBEAT.md, workspace bootstrap, custom skills/plugins for a chat-based AI, ClawHub, or is designing/tweaking/debugging/securing a self-hosted AI agent that runs on messaging channels (WhatsApp/Telegram/Discord/Slack). Trigger even when OpenClaw is not named explicitly but the user is working on a soul/persona file, agent operating instructions, a SKILL.md, or auditing a community skill/plugin. Do not answer from training memory — this system evolves rapidly with non-obvious precedence rules.
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

**The illustration line — what's allowed vs what's drafting.** Plan mode forbids drafting files, code, and complete config blocks. It does NOT forbid *naming* a command, CLI flag, config field, or file path when the name is load-bearing for a decision the user has to make. You may say "we'd use `openclaw webhooks gmail setup` for this, not a heartbeat" — the user needs to know the mechanism exists to evaluate it. You may NOT say "here's the command you'll run: `openclaw webhooks gmail setup --account me@ex.com --hook ./inbox.ts`" — that's drafting. Rule of thumb: naming a tool or field clarifies a choice; writing the invocation with arguments filled in crosses into build mode. When in doubt, pick the shorter, less prescriptive form.

**The approval gate:**
Before moving to build mode, present the user with a complete plan and explicitly ask for approval. Use this exact pattern:

> Here's the complete plan:
>
> [full architecture summary with all components, all dimensions addressed, all open questions resolved]
>
> Before I start drafting any files, I need your explicit approval. Review this plan and tell me:
> - Is anything missing?
> - Is anything wrong?
> - Ready to proceed to building?

**Wait for a clear "go" / "approved" / "let's build" / equivalent.** If the user says "looks good" or "sure", ask specifically: "Approved to start drafting files?" — don't infer consent from hedging.

If the user makes changes, revise the plan and present it again for approval. You may iterate multiple times. The plan must be CURRENT and COMPLETE at the moment of approval.

**Optional DESIGN-LOG.md artifact.** At the approval moment, you may offer to capture the final plan as a `DESIGN-LOG.md` in the workspace — requirements summary, threat model, chosen shape, build track, component list, security baseline, and an append-only decision log. It is NOT injected every turn (keep it out of bootstrap) — it lives as a durable record for later tuning and audits. Use `assets/templates/DESIGN-LOG.md` as the starting file; it includes a fully worked example ("Cortex" Track-B homelab operator) that shows what the filled-in artifact looks like across all sections. Offer it; don't impose it.

### Pacing guidance — advance at the user's rate

In plan mode, advance **one major decision at a time** when the user is feeding you information incrementally. "One major decision" means a single requirements dimension, a single architecture step, or a single design step (pre-flight, SOUL, AGENTS, tool policy, etc.).

When the user batches multiple dimensions into one message ("I want an ops agent that monitors the Synology, runs on Telegram, uses Opus for destructive ops, and has cron reports"), split their message by dimension and confirm each separately rather than racing ahead. Say something like: "I heard workload, channel, model, and automation in that message — let me confirm each before we move to shape."

This is guidance, not a rigid lockstep. Don't insert ceremonial "Step 3 of 12" announcements; just keep decisions separable and confirm-able. The goal is that the user never feels steamrolled and can course-correct a single piece without unwinding five others.

**First-turn length tension — it's real; resolve it by sketching, not by delivering.** When a user's opening prompt packs several dimensions into one message ("I want a Telegram homelab operator on Opus with cron reports and only-me access"), there's a tension between "advance one decision at a time" and "show the user where this is going before they've invested more effort." Resolve it by SKETCHING the full four-pass framework (requirements → threat model → shape → track) in turn 1 so the user can see the road map — then explicitly invite incremental answers: "You don't need to answer all of this at once — start with dimensions 1 and 2, or the threat-model questions, whichever you have thoughts on first." This is not the same as delivering a complete plan for approval. The approval gate is later. On turn 1 you're showing the route, not arriving.

### Why this rule exists

The skill produces better output when it plans fully. Users who get files drafted mid-conversation end up with inconsistent systems — SOUL.md was written before USER.md was decided, AGENTS.md references a skill that never got scoped, the memory architecture doesn't match the tool policy. Plan-then-build prevents this.

Users also frequently change their minds during elicitation ("oh, actually, I also want it to do X"). Catching those changes in plan mode is cheap. Catching them after files are drafted is expensive.

### Plan-mode variants — full vs abbreviated vs quick-answer

Plan mode is always *on*; what varies is the amount of ceremony. There are three levels:

1. **Full plan mode** — the default for any new agent or system design. Requirements elicitation, threat model, shape, track, component list, full approval gate. Applies to every workflow at the top of this file ("I want to build an agent system", "I want to design a new agent", first-time subagent design).

2. **Abbreviated plan mode** — for tweaks to an existing agent. The `references/tweaking-existing-agents.md` workflow runs a diagnostic gate in place of full elicitation: reproduce the symptom → narrow to one of the six buckets → confirm the specific change with the user → edit. The approval gate is still there, just scoped to the single change. "Pause before editing" and "user has to agree to the specific change" are the plan-mode discipline carried through. Do not skip the gate just because the change is small.

3. **Quick-answer mode** — no plan, no approval. Use only for:
   - **Reference questions** — "What's the path for channel credentials?" Answer from `references/cheatsheet.md`.
   - **Research questions** — "Does OpenClaw support X?" Look it up (see Research Discipline) and answer.
   - **Single-skill addition to a well-understood existing agent** — "Add a skill for calling wthr." Light touch (confirm intent, dispatch mode, triggers, install spec) — still a micro-plan with approval, but full system elicitation is not needed.

When in doubt, escalate one level. The cost of asking "do you want me to plan this first?" is ~10 seconds. The cost of drafting files that don't fit is the whole conversation.

## Build tracks — pick one after pre-flight, before any design work

**Pre-flight** means the first two dimensions of requirements elicitation are confirmed: the **job** (what specifically are we automating?) and the **authority** (chat-only / read-only / full operator / multi-user). These two alone determine the track. You don't need all seven dimensions to pick a track — you need enough to answer "what is this agent allowed to do?" and "what is it supposed to produce?". See `references/requirements-elicitation.md` dimensions 1–2. The rest of the dimensions refine components and policy within the chosen track.

Every agent design decision that follows hangs off one of three tracks. Make the choice *explicitly* after pre-flight and record it in the plan summary. Do not slide into drafting files without a track committed, because the track determines tool posture, sandbox defaults, whether `exec-approvals.json` is generated, and which references you'll lean on.

### Track A — Chat / read-only agent
- **Authority:** chat-only or read-only. Never mutates external state.
- **Tool policy:** start from the `messaging` profile (chat-only) or posture B (read-only) from `references/tool-policy-and-security.md`. Deny `exec`, `process`, `write`, `edit`, `applypatch`, `browser`, `cron`, `gateway`.
- **Typical workloads:** inbox assistant, researcher, report/draft generator, knowledge agent, meeting summarizer.
- **Sandbox:** `mode: off` for trusted-only input; `mode: all` or `non-main` with `workspaceAccess: ro` when inputs include untrusted web/email/group content.
- **Not needed:** `exec-approvals.json`, SSH/operator scaffolding.

### Track B — Full operator on a trusted host
- **Authority:** full operator for a single trusted user.
- **Tool policy:** posture C (full operator) with conservative hardening — `fs.workspaceOnly: true` where feasible; `tools.exec.security: "allowlist"`; `tools.exec.ask: "on-miss"`; `tools.exec.askFallback: "deny"`; `tools.exec.strictInlineEval: true`; `tools.exec.autoAllowSkills: false`.
- **Required:** `.openclaw/exec-approvals.json` built with the three-layer structure (safe introspection / scoped ops / always-ask). See `references/tool-policy-and-security.md`.
- **Typical workloads:** homelab operator, personal coding companion with shell, fleet manager, NOC-style agent.
- **Sandbox:** `mode: off` is acceptable for trusted-only input. Prefer `mode: non-main` or `mode: all` with `workspaceAccess: none`/`ro` when the agent processes untrusted content.
- **Elevated:** `tools.elevated.enabled: false` by default. Enabling it is a break-glass decision that belongs only on trusted DMs, never on agents exposed to groups or untrusted inbound.

### Track C — Multi-agent system
- **When:** the approved architecture includes more than one agent (peer, main+sub, hub-and-spoke, pipeline, event-driven).
- **How:** each agent still picks Track A or Track B internally. Routing and bindings are designed via `references/multi-agent-routing.md`. Every agent gets its own workspace, tool policy, and sandbox posture.
- **Don't:** copy-paste one agent's tool policy across all of them. The whole point of multi-agent is per-role authority.

**The track choice drives later decisions.** If Track A is chosen, do not generate `exec-approvals.json`, do not mention SSH/Ansible patterns, do not design Track-B hardening flags. If Track B, require the three-layer exec allowlist before build is complete. If Track C, do a track selection per agent before any per-agent file is drafted.

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
8. Only after architecture is confirmed: design components one at a time, loading the relevant reference for each (SOUL, AGENTS, skills, subagents, cron, plugins, MCP, hooks, security). At this step, honor cross-cutting principles #6 (bootstrap file size — every turn pays), #7 (subagents inherit AGENTS.md + TOOLS.md only), #11 (SOUL does voice; AGENTS does procedure — don't mix), and #14 (memory starts minimal, daily files absorb volatile context).
9. Before drafting the first file, honor principle #16 — read the plan back to the user, hunt for contradictions and unstated assumptions. Final pass: full config block, security audit reminder, deployment handoff.

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

This is as important as any other rule in this skill. OpenClaw evolves rapidly. This skill's references are thorough but not exhaustive, and the system's capabilities change between releases.

**When you must research (use `web_fetch` or `web_search`):**
- User asks about a specific capability you're not sure is still supported / has changed
- User mentions a channel, MCP server, model provider, or tool you don't have detailed memory of
- User asks about config fields or CLI flags you'd be guessing on
- User describes a workflow and you're unsure which OpenClaw pattern fits
- User asks about an external service (Synology API, Telegram bot API, a specific MCP server, etc.) whose current behavior matters
- User asks about version-specific behavior

**Primary sources to fetch:**
- `https://docs.openclaw.ai` for OpenClaw-specific details (always start here)
- `https://docs.openclaw.ai/cli/*` for CLI command details
- `https://docs.openclaw.ai/concepts/*` for architecture questions
- `https://docs.openclaw.ai/channels/<n>` for specific channel features
- `https://docs.openclaw.ai/providers/<n>` for specific model provider details
- `https://docs.openclaw.ai/plugins/*` for plugin SDK / manifest details
- Official GitHub repo for examples or issues: `https://github.com/openclaw/openclaw`
- ClawHub for community skills/plugins: `https://clawhub.ai`

**Script for admitting uncertainty:**
> "I want to make sure I don't get this wrong from memory — let me check the current docs on [specific topic] before we proceed. One moment."

Then fetch, read, answer precisely.

**Never:**
- Guess at specific config field names ("maybe it's `session.timeout`... or is it `agent.sessionTimeoutSeconds`?")
- Invent CLI flags that sound plausible
- Describe behavior of an MCP server or channel you've never actually looked at
- Answer "yes, that's supported" when you're genuinely unsure
- Design around assumed capabilities without verifying

**Always:**
- Cite what you found when it's relevant to the user's decision
- Offer to fetch more detail when the decision hinges on specifics
- Pause design work to research rather than charging forward with guesses
- Tell the user you researched — it builds trust and they can verify

Research pauses during a design conversation are normal and healthy. The user would rather wait 30 seconds for you to check than get a wrong answer that costs them an hour of rebuild later.

**Batch research; don't pause per dimension.** If you hit multiple uncertain items in the same turn — a channel, an MCP server, and a model ID, for example — batch them into a single research pass rather than three sequential pauses. Open a few `web_fetch` calls in parallel if available, or say "let me check a few things at once — the Telegram bot permission model, the current Opus pricing, and whether the Synology MCP still ships with the 1.x breaking change. One moment." A single batched research pause feels responsive; three sequential ones feel like stalling. Reserve the per-dimension pause for when a later answer meaningfully depends on an earlier one.

**Know what the skill's references already cover vs what's version-volatile.** Agent design rules (plan mode, build tracks, six AGENTS.md sections, three-layer exec-approvals) are stable — answer from the references without fetching. Version-volatile items that warrant a fresh fetch: exact CLI flag names, current model IDs and pricing, specific hook event names added in recent releases, plugin manifest schema changes, whether a specific MCP server is currently in ClawHub. If you're unsure which category you're in, fetch — the cost of a research pause is lower than the cost of confidently citing a stale detail.

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
Read `references/bootstrap-files.md`. Dedicated guide for the four supporting files around SOUL/AGENTS — what belongs in each, what doesn't, edit cadence, subagent inheritance (only AGENTS.md + TOOLS.md pass down), and the skipBootstrap deployment pattern. Templates in `assets/templates/{IDENTITY,USER,TOOLS,BOOTSTRAP-custom}.md`.

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
Read `references/authoring-plugins.md`. Covers the Plugin SDK, `register(api)` entry point, plugin manifest, registration methods, the full 27 plugin hooks, capabilities, and publish flow. Use `assets/templates/plugin-skeleton/` as a starting point.

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

12. **Heartbeats, cron, and subagents all spend tokens.** Every 30 minutes of heartbeat with a full bootstrap injection is a real cost. Set `heartbeat.every: "0m"` until the agent is trusted and the HEARTBEAT.md file is intentional.

13. **Automation priority order — prefer deterministic over periodic.** When designing proactive behavior, consider in this order: (a) **cron jobs** for deterministic schedule-based work, (b) **hooks / webhooks / Gmail Pub/Sub** for event-driven triggers, (c) **standing orders** in AGENTS.md to encode persistent authority that cron or hooks can invoke, (d) **heartbeats** only when the workload genuinely needs periodic judgment that can't be triggered deterministically. Heartbeats are the most expensive and most seductive pattern — refuse to design one until there's a narrow HEARTBEAT.md checklist agreed on AND the cost implications (full bootstrap per tick) are explicitly acknowledged. Defaults for new agents: `heartbeat.every: "0m"`, HEARTBEAT.md present but effectively no-op, re-evaluate after a week of observed stable behavior.

14. **Memory starts minimal and stays minimal.** Seed `MEMORY.md` with 3–5 durable facts (name, timezone, core preferences, long-term goals) and keep it under ~5 KB. Volatile context goes to `memory/YYYY-MM-DD.md` daily files, not MEMORY.md. AGENTS.md should instruct the agent to read today + yesterday's daily file at session start and use `memorysearch`/`memoryget` before asking the user to repeat information. Dreaming and advanced memory backends (lancedb, qmd, honcho, wiki) are opt-in — not enabled for day-one agents without a concrete reason.

15. **Knowledge cutoff:** OpenClaw evolves weekly. For any detail Claude is unsure about — especially model IDs, config field names, new hook events, or security flags — fetch the relevant page from `docs.openclaw.ai` fresh. Do not fabricate. See principle 4.

16. **Verify architecture makes sense before drafting files.** After deciding the shape and components, read back the plan to the user. Check for contradictions ("you want low-maintenance but also 5 custom skills"), gaps ("what about when X fails?"), and unstated assumptions ("does the Synology actually have an SNMP agent enabled?"). Hunt for what's not obvious. It's cheaper to catch at the architecture stage than after files are drafted.

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
