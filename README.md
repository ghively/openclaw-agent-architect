# openclaw-agent-architect

A Claude skill for designing, building, tweaking, auditing, and operating OpenClaw agents end-to-end.

**Status:** v0.2 · Private · MIT

---

## What is this?

This is a [Claude skill](https://docs.claude.com/en/docs/build-with-claude/agent-sdk/skills) — a folder of procedural guidance and reference material that Claude loads progressively into its context when the skill is triggered. Drop it into any Claude environment that supports skills (Claude Code, Cowork, Agent SDK), and Claude becomes a subject-matter collaborator for OpenClaw architecture work: requirements elicitation, system design, SOUL/AGENTS/workspace authoring, memory system choices, skill and plugin development, tool policy, sandbox and exec approvals, multi-agent routing, heartbeats, standing orders, and security auditing of third-party code from ClawHub or npm.

**Why a skill and not trained knowledge?** OpenClaw evolves quickly, and a lot of the architecturally-important details are non-obvious precedence rules (which flag wins when two policies conflict, which automation primitive beats another, how memory backends coexist). Skills let those rules live in one authoritative place that loads exactly when needed, rather than being unreliably compressed into model weights.

---

## Repository contents

```
SKILL.md                                 skill entry point — workflow, build tracks, topic router (390 lines)
openclaw-agent-architect.skill           packaged build artifact (drop-in for Cowork / Agent SDK)
README.md                                this file
CHANGELOG.md                             release notes
LICENSE                                  MIT
.gitignore

references/                              detailed guidance loaded on-demand
├── requirements-elicitation.md          the seven discovery dimensions
├── system-architecture.md               five system patterns, when each fits, migrations
├── agent-design-workflow.md             plan-mode / build-mode contract in depth
├── bootstrap-files.md                   SOUL / AGENTS / USER / IDENTITY / TOOLS authoring
├── soul-writing.md                      personality file conventions
├── agents-md-patterns.md                the six mandatory sections with worked examples
├── memory-system.md                     backends, decision trees, MEMORY.md hygiene
├── automation-and-hooks.md              cron > hooks > standing orders > heartbeats, cost table
├── subagent-design.md                   when and how to spawn, token shapes
├── tool-policy-and-security.md          sandbox modes, three-layer exec-approvals
├── tool-creation.md                     custom tools, plugin tools, MCP integrations
├── authoring-skills.md                  how to write skills for OpenClaw agents
├── authoring-plugins.md                 packaging and distribution
├── plugin-ecosystem.md                  ClawHub, npm, integrity, updates
├── security-audit.md                    how to audit third-party code
├── multi-agent-routing.md               peer / hub+spoke / pipeline patterns
├── tweaking-existing-agents.md          six-bucket triage for live-agent issues
├── operating-live-agents.md             observability, diagnostics, migrations, re-architect criteria
├── when-to-build-what.md                triage for what a user actually needs
└── cheatsheet.md                        starting postures by track, dangerous flags, quick ref

assets/
├── audit-checklists/
│   └── pre-install.md                   security checklist before installing third-party skills/plugins
└── templates/
    ├── SOUL.md                          personality file skeleton
    ├── AGENTS.md                        operating rules skeleton (six mandatory sections)
    ├── USER.md                          durable facts about the user
    ├── IDENTITY.md                      agent self-description
    ├── TOOLS.md                         tool inventory
    ├── HEARTBEAT.md                     heartbeat standing orders
    ├── BOOTSTRAP-custom.md              optional custom bootstrap
    ├── skill-template.md                starter SKILL.md for agent-owned skills
    └── DESIGN-LOG.md                    blank template + full worked Cortex example
```

---

## Features

### Two-phase workflow: plan mode → approval gate → build mode

The skill enforces a hard separation between **designing** and **building**. In plan mode, Claude elicits requirements, proposes architecture, names components, and flags risks — but does not draft files. After explicit user approval of the plan, Claude switches to build mode and emits SOUL.md, AGENTS.md, workspace files, memory config, exec-approvals, skills, and plugins as scoped. This prevents the common failure where an architect starts writing code before anyone has agreed on what is being built.

Three plan-mode variants are supported:

- **Full** — for greenfield designs. Runs the seven-dimension elicitation and produces a complete plan.
- **Abbreviated** — for tweaks to live agents. Identifies the bucket (persona / procedure / memory / tool-pref / policy / context-bloat), proposes the minimal edit, gets approval, ships it.
- **Quick-answer** — for factual questions ("what flag does X?"). Answers inline, no plan.

### Build tracks A / B / C

Requirements elicitation dimensions 1 and 2 are enough to pick a build track:

- **Track A — chat / read-only.** Sandbox locked down, no elevated shell, `fs.workspaceOnly`, allow-listed tools only. For family/group assistants, FAQ bots, read-only research helpers.
- **Track B — full operator on a trusted host.** Three-layer exec-approvals (safe introspection / scoped ops / always-ask), workspace-scoped writes, optional elevated for specific commands. For single-user homelab/productivity agents.
- **Track C — multi-agent.** Separate agents per role with a routing layer. Rarely the right starting point; usually an evolution of a Track B that outgrew a single agent.

`references/cheatsheet.md` includes a default-posture table with recommended starting values for 19 flags per track (heartbeat, sandbox, workspaceAccess, exec-approval layers, elevated, memory backend, Wiki, Dreaming, dangerous-channel flag, models, channel audience).

### Seven-dimension requirements elicitation

Before proposing any architecture, Claude works through seven dimensions with the user:

1. **Purpose and users** — what is this FOR, who interacts, trust model
2. **Workloads and tasks** — concrete jobs, reactive/proactive, frequency, input volume
3. **Channels and surfaces** — WhatsApp/Telegram/Discord/Slack/iMessage/WebChat, DM vs group, non-messaging surfaces
4. **Data and context** — long-term memory, working memory, knowledge sources, external data
5. **Tools and capabilities** — read-only vs write vs sensitive, existing integrations, custom CLIs
6. **Automation and timing** — scheduled, event-driven, background monitoring, long-running jobs
7. **Constraints and non-functional** — hosting, budget, privacy, compliance, availability, maintenance budget

Dimensions 1-2 are "pre-flight" — enough alone to commit to a build track. Dimensions 3-7 refine components within the chosen track.

### Five system patterns

The skill teaches five canonical system shapes and explicitly covers migrations between them:

1. **Single agent** — one soul, one AGENTS.md, one workspace. Most homelab use.
2. **Peer agents** — multiple agents as equals, each with its own channel/audience. E.g., work-agent and home-agent on different Telegram chats.
3. **Hub + spoke (subagents)** — one parent agent that spawns task-scoped subagents (research, security audit, file conversion).
4. **Depth-2 pipeline** — parent → subagent → sub-subagent for long-running, multi-stage jobs.
5. **Event pipeline** — webhook/cron triggers that land in a stateful queue the agent drains.

Pattern 1 is the default. `references/operating-live-agents.md` covers how to migrate (1→2 split, 1→3 subagent addition, 2/3→1 consolidation).

### Six-bucket tweaking triage

When an existing agent misbehaves, symptoms fall into one of six buckets — each has a different fix path:

1. **Persona** — voice, length, emoji, formatting (SOUL.md edits)
2. **Procedure** — ordering, approval steps, output format (AGENTS.md edits)
3. **Memory** — stale facts, missing context, bloated MEMORY.md
4. **Tool-pref** — wrong tool chosen, missing tool, tool order
5. **Policy** — exec-approvals, sandbox, `fs.workspaceOnly`, dangerous flags
6. **Context-bloat** — prompt too heavy, too many references load, too many tools

Getting the bucket right before editing anything prevents the common failure of fixing the wrong file.

### Three-layer exec-approvals model

Exec approvals are layered:

- **Layer 1 — safe introspection.** Allow by default: `ls`, `cat`, `git status`, `df`, `uname`, etc.
- **Layer 2 — scoped ops.** Allow with path/arg constraints: `git commit -m`, `docker logs <container>`, `systemctl status <service>`.
- **Layer 3 — always-ask.** `rm -rf`, `curl | sh`, `sudo`, anything that writes outside workspace, anything that spends money.

`references/tool-policy-and-security.md` contains the full regex patterns and guidance on when to override the defaults.

### Memory system with decision trees

Four memory backends are supported, with an explicit decision tree for when to switch:

- **memory-core** (default) — `MEMORY.md` + dated daily files. Good for <5KB working memory.
- **memory-lancedb** — vector store when you need semantic recall over a year+ of context.
- **memory-qmd** — structured knowledge wiki (Obsidian-style) for agents that read/write a shared knowledge base.
- **memory-honcho** — multi-user memory server for team/family agents where per-user memory must stay isolated.

The tree gates switches on five questions and explicitly calls out the "audit `MEMORY.md` before swapping backends" anti-pattern.

### Automation priority order

`automation-and-hooks.md` makes the priority explicit: **cron > hooks/webhooks > standing orders > heartbeats**. The Cost Reference Table gives rough tokens/day for each pattern so plan mode can name costs before committing. Heartbeats at 30m silent-path are cheap; heartbeats at 5m active-path with a bigger model are not.

### Security audit workflow

For any third-party skill or plugin (from ClawHub, npm, or a friend's Gist), the skill drives a review pass covering manifest claims vs actual code, tool policy impact, network scope, secret handling, exec calls, and update/provenance. Output is a go/no-go with redline items. Pre-install checklist in `assets/audit-checklists/pre-install.md`.

### Operating live agents

`references/operating-live-agents.md` covers the "agent is live, now what" side: observability evidence types (session logs, exec audit, automation runs, memory state), a six-layer diagnostic loop (persona / operating rules / context / tool policy / sandbox / runtime), migrations between patterns, a 10-minute weekly checklist, and criteria for "tune vs re-architect".

### DESIGN-LOG template with worked example

`assets/templates/DESIGN-LOG.md` is the artifact Claude produces at the end of a full design session: provenance, requirements summary, threat model, chosen shape, 12-dimension component inventory, security baseline, append-only decision log, known-open risks. Comes with a fully filled-in example (Cortex — Track-B homelab operator over Telegram).

---

## Typical session shapes

### Designing a new agent

```
You: "I want to build an OpenClaw agent that..."

Claude: enters plan mode → runs dimensions 1-2 → names a tentative track →
        runs dimensions 3-7 → summarizes back to you → you confirm →
        Claude proposes architecture (pattern, components, memory, automation,
        exec posture) → you poke holes → iterate → you approve →
        Claude asks verbose/quiet → build mode: emits SOUL, AGENTS, workspace
        files, memory config, exec-approvals, skills → hand-off checklist
```

Expected session length: 45-120 minutes, depending on track and how much you push back.

### Tweaking a live agent

```
You: "My agent keeps doing X wrong"

Claude: abbreviated plan mode → triages into one of the six buckets →
        proposes the minimal edit (one file, one section) → you approve →
        emits the diff → suggests how to verify the fix
```

Expected session length: 5-15 minutes.

### Auditing a third-party skill or plugin

```
You: "Is this skill safe to install?" + path/URL

Claude: reads the manifest, the SKILL.md, every file in references/ and
        scripts/ → checks exec calls, network scope, secret handling,
        workspace-boundary claims → produces go/no-go with redline items
```

Expected session length: 10-30 minutes depending on skill size.

### Operating a live agent

```
You: "Help me understand why my agent is slow / expensive / confused"

Claude: asks which evidence you have (logs, exec audit, automation runs) →
        runs the six-layer diagnostic → narrows to the layer that's
        misbehaving → proposes a targeted edit OR a migration OR a
        re-architecture, depending on severity
```

Expected session length: 15-60 minutes.

---

## How progressive disclosure works here

The skill is structured so that Claude only loads what's needed for the work at hand:

- **Always in context (metadata, ~100 words):** the skill's name + description. Claude sees this in every conversation and uses it to decide whether to trigger.
- **Loaded when the skill triggers (SKILL.md, ~390 lines):** the topic router. Directs Claude to the right references based on what the user is doing.
- **Loaded on demand (references/):** only the references relevant to the current work. A Track-A chatbot design might touch 4-5 references; a full Track-B operator design might touch 10-12; a tweaking session might touch 2.
- **Assets:** templates and checklists copied/referenced during build mode, not necessarily read in full.

The practical effect: even though the source tree is ~260KB, a typical session loads 15-40% of it. The rest stays dormant until its topic comes up.

---

## Installation

### As a Claude Code skill

Drop the repo contents into your Claude Code skills directory:

```
~/.claude/skills/openclaw-agent-architect/
├── SKILL.md
├── references/
└── assets/
```

### As a Cowork plugin skill

Use the packaged `openclaw-agent-architect.skill` artifact (a zip of `SKILL.md` + `references/` + `assets/`). Place it where Cowork reads skills from, or bundle it inside a plugin.

### As an Agent SDK skill

Reference the folder path (or the `.skill` artifact) when constructing the agent.

The skill triggers on any mention of OpenClaw, Molty, Clawdbot, agent souls, SOUL.md, AGENTS.md, MEMORY.md, HEARTBEAT.md, workspace bootstrap, custom skills/plugins for a chat-based AI, ClawHub, or when the user is designing/tweaking/debugging/securing a self-hosted AI agent that runs on messaging channels.

---

## Building the `.skill` artifact

The `.skill` file is a zip of `SKILL.md`, `references/`, and `assets/`:

```bash
cd /path/to/this/repo
rm -f openclaw-agent-architect.skill
zip -r openclaw-agent-architect.skill SKILL.md references assets
```

The build must be run from the repo root so paths inside the zip are relative.

---

## Versioning and change history

See [CHANGELOG.md](CHANGELOG.md).

Current version **v0.2** includes the full plan-mode / build-mode contract, all five system patterns, four memory backends, operating-live-agents guidance, cost reference table, Architect default-posture table, and a worked DESIGN-LOG example.

---

## License

MIT — see [LICENSE](LICENSE).

## Author

Gene Hively — <genehively@gmail.com>
