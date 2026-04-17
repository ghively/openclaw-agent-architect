# Designing a Subagent

Subagents are NOT small agents. They're a different design problem, and treating them like miniature main agents is the most common mistake.

What they are: background agent runs spawned from an existing agent, running in their own session, reporting results back to the parent when done. They exist to parallelize work, isolate context, and let the main agent stay focused.

This reference is the design workflow for building one correctly. For the mechanics of spawning (tool params, CLI, lifecycle), see `references/multi-agent-routing.md` and `references/automation-and-hooks.md`.

## How to work through this with the user

**Plan mode applies.** Do not draft the task prompt, config, or AGENTS.md additions until the user has approved the complete subagent plan. See the Plan-Mode Contract in the main SKILL.md.

**Pace:** Faster than a full agent build (no persona, no channel binding). Realistic duration: 15-30 minutes of conversation.

**Sequence:** Challenge → choose depth → outline task prompt → decide tool scope → discuss cost → outline AGENTS.md additions → present complete plan → get approval → build.

**Don't:**
- Just draft a `sessions_spawn` command when asked. Walk through WHY this should be a subagent at all — that's frequently the wrong answer and a skill is better.
- Skip the premise challenge because the user seems confident.
- Draft the task prompt before the tool scope is decided (the scope influences what the task can ask for).
- **Build anything until the user has approved the plan.**

**Do:**
- Be opinionated. Subagents have real costs and pitfalls. Call them out.
- Sketch the task prompt structure during planning (Context/Task/Output/Constraints/Completion) without fully writing it — that's a plan deliverable.
- After approval, draft the task prompt, config block, and AGENTS.md additions in build mode.

## Step 0 — Challenge the premise

Before anything else, ask: **"Why a subagent here, instead of a skill, or just doing it inline in the main session?"**

Legitimate reasons for a subagent:
- **Parallel work** — you want to fire off 3-5 research tasks and synthesize results
- **Heavy lift that would blow main context** — "summarize 200 documents" inflates main session context unless isolated
- **Long-running task shouldn't block chat** — the main agent stays responsive while the subagent works
- **Sandbox isolation needed** — subagent touches untrusted content; main session should stay clean

Illegitimate reasons (push back):
- "I want a specialized persona for this task" → that's a second AGENT, not a subagent
- "I want to reuse these instructions across sessions" → that's a SKILL
- "I want this to happen on a schedule" → that's a CRON job (which CAN spawn subagents, but the cron is the design unit)
- "I want the agent to do one specific thing better" → that's a skill or AGENTS.md rule

**Test:** If the work is sequential, short (< 1 min), or uses the main agent's full personality, it's probably not a subagent. If it's parallelizable, context-heavy, or needs isolation, it is.

## Step 1 — Depth decision

```
agents.defaults.subagents.maxSpawnDepth: 1  # default — subagents are LEAVES
agents.defaults.subagents.maxSpawnDepth: 2  # subagents can spawn their own children
```

**Depth 1 (leaf):** The main agent spawns workers. Each worker does ONE task, announces, archives. The main agent synthesizes. Most use cases.

**Depth 2 (orchestrator pattern):** Main → orchestrator → workers. The orchestrator subagent can spawn depth-2 leaves. Use when you have genuinely fan-out work: "research 10 topics in parallel; synthesize" where the synthesis step ALSO benefits from being a subagent.

**Depth 2+ limits:**
- Orchestrator (depth 1) gets `sessions_spawn`, `subagents`, `sessions_list`, `sessions_history` added to its tool set
- Leaves (depth 2) are locked down; `sessions_spawn` always denied at depth 2
- `maxChildrenPerAgent: 5` caps fan-out per session
- `maxConcurrent: 8` is the global lane cap

**Default:** Depth 1. Don't enable depth 2 unless you've felt the specific need for orchestration. Depth 2 adds complexity and cost.

Ask the user: "What does this subagent need to do — one focused task, or coordinate multiple sub-tasks?"

## Step 2 — Task prompt design

This is the CRITICAL piece people miss. Subagents only inherit two files:
- `AGENTS.md`
- `TOOLS.md`

They do NOT see:
- `SOUL.md` — no voice, no persona
- `USER.md` — doesn't know who you are, your timezone, your preferences
- `IDENTITY.md` — doesn't have the agent name/vibe
- `HEARTBEAT.md` — irrelevant
- `MEMORY.md` — can call `memory_search` but doesn't get injection

**Implication:** Every piece of context the subagent needs must come from ONE of:
1. The task prompt you pass to `sessions_spawn`
2. AGENTS.md (which IS inherited)
3. A tool call the subagent makes (memory_search, read, etc.)

### A good task prompt

Structure:
1. **Context** — who's asking, what's the parent task, what's the scope
2. **Task** — specific, verifiable, bounded
3. **Output format** — exactly what to return (file path, markdown structure, etc.)
4. **Constraints** — what NOT to do; boundaries
5. **Completion signal** — when to announce and what to say

Example — research subagent:

```
Context: I'm drafting a proposal for CPI Card Group about Ansible adoption.
I need outside perspective on 5 recent Ansible migration case studies.

Task: Research public case studies / blog posts / conference talks about 
organizations that adopted Ansible for enterprise Windows patching in 
the last 3 years. Exclude RedHat-published material (biased).

For each case study found:
- Organization (name + industry)
- Migration scope (size, duration)
- Tooling before/after
- Key wins
- Key friction points
- Source URL

Output: Write results to memory/research/ansible-case-studies.md as 
a markdown table with the above columns. Target 5 studies minimum.

Constraints:
- No Reddit threads as primary sources
- No vendor-marketing fluff
- Cite publication date; skip anything older than 2023
- If you find fewer than 3 usable studies, say so explicitly

When done, announce with: a 1-paragraph summary + the file path + 
any notable themes across the studies.
```

### A bad task prompt

```
Research Ansible case studies and let me know what you find.
```

This fails because:
- No output format → subagent decides (badly)
- No constraints → may include fluff
- No completion signal → may babble in announce
- No scope bounds → may take all day
- No context → subagent doesn't know why this matters, which influences judgment

**Rule:** The task prompt IS the design. Short vague prompts produce short vague subagent output.

## Step 3 — Tool scope

Subagents get ALL tools except session control tools by default. Override based on task nature:

**Research subagent:** `web_search`, `web_fetch`, `read`, `memory_search`. Deny everything else.
```json5
{
  tools: {
    subagents: {
      tools: {
        allow: ["web_search", "web_fetch", "read", "memory_search", "memory_get"],
        deny: ["exec", "write", "edit", "apply_patch", "browser", "cron", "gateway", "message"]
      }
    }
  }
}
```

**Code-analyzing subagent:** `read`, `exec`, `memory_search`. Deny write + external.
```json5
{
  tools: {
    subagents: {
      tools: {
        allow: ["read", "exec", "memory_search", "memory_get"],
        deny: ["write", "edit", "apply_patch", "web_search", "web_fetch", "browser", "cron", "message"]
      }
    }
  }
}
```

**Heavy-processing subagent (CSV parse, data transform):** `read`, `exec`, `write`. Scope writes to specific subdirs.
```json5
{
  tools: {
    subagents: {
      tools: {
        allow: ["read", "exec", "write", "edit", "apply_patch"],
        fs: { workspaceOnly: true }
      }
    }
  }
}
```

**Rule:** Default deny, allow what's needed. Subagents processing untrusted content (web pages, emails, community files) should have NO message/send tools and NO outbound web/browser access beyond the specific read task.

## Step 4 — Sandbox decision

Subagents are the archetypal use case for `mode: "non-main"` sandboxing. Main chat stays on host; subagents isolated.

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",        // sandboxes subagents, leaves main on host
        scope: "session",        // each subagent = its own container
        workspaceAccess: "rw"    // can write results back
      }
    }
  }
}
```

Or stricter for adversarial content (scraping untrusted sites):
```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        scope: "session",
        workspaceAccess: "none"   // subagent workspace is isolated
      }
    }
  }
}
```

Sandbox-inheritance guard: if the parent session is sandboxed, `sessions_spawn` rejects targets that would run unsandboxed. You can't accidentally escape the sandbox via subagent.

## Step 5 — Cost awareness

Each subagent has:
- Its own context window
- Its own token bill
- Its own model call

A main agent on Opus that spawns 5 subagents also on Opus multiplies the cost. Almost always, subagents should be on a cheaper model:

```json5
{
  agents: {
    defaults: {
      subagents: {
        model: "anthropic/claude-sonnet-4-6",     // cheap worker
        thinking: "medium",                        // or "low" for pure mechanical tasks
        runTimeoutSeconds: 900,                    // bounded runtime
        archiveAfterMinutes: 60
      }
    },
    list: [
      {
        id: "main",
        model: "anthropic/claude-opus-4-6"         // premium for main judgment
      }
    ]
  }
}
```

Reasoning work that benefits from Opus can opt in per-spawn:
```
sessions_spawn({ task: "...", model: "anthropic/claude-opus-4-6", thinking: "high" })
```

**Concrete token shape for subagent spawns.** See the Cost Reference Table in `references/automation-and-hooks.md` for order-of-magnitude numbers. Rule of thumb: a chat-profile subagent inherits `AGENTS.md + TOOLS.md` (not `SOUL.md`, `USER.md`, `HEARTBEAT.md`, `MEMORY.md`), so bootstrap is roughly 60–70% of the parent's. A simple one-shot research subagent rarely comes in under 5–6K input tokens; a full-operator subagent doing a 3-step Execute-Verify-Report rarely under 15K total. Multiply by spawn rate when you quote a number to the user — "every 5 minutes" is 288 spawns/day.

## Step 6 — AGENTS.md additions for the parent

Since subagents inherit AGENTS.md, you use it to:
1. **Grant authority** — "when task X happens, spawn a subagent"
2. **Set conventions** — what output format subagents should use, where to write results
3. **Inherit context** — key facts the subagent needs (user name, timezone) if not put in task prompts

Example additions to the parent agent's AGENTS.md:

```markdown
## Subagent usage

### When to spawn
- Research across 3+ independent sources → spawn parallel workers, one per source
- Long document summarization (>50 pages) → spawn isolated summarizer
- Codebase exploration that would inflate our context → spawn explorer

### Task prompt requirements
Every spawn task prompt MUST include:
- Output file path in workspace/research/ or workspace/analysis/
- Markdown format specification
- Completion signal spec ("announce with: <format>")
- Hard constraints (no fluff, cite sources, max length)

### After spawn
- DO NOT wait blocking — return a brief "started N workers" update
- Check `/subagents list` if I ask for status
- When workers announce, synthesize their results into a single response for me
- Archive results: move from spawn output path to archive/YYYY-MM-DD/ after synthesis

### Tool scope for subagents
See config. In general:
- No message/send tools (subagents don't DM me directly)
- No cron/gateway control
- Read + search + bounded write only
```

## Step 7 — Thread-bound vs run-once

Two spawn modes:

**`mode: "run"` (default):** One-shot. Subagent does task, announces, archives. Can't be revisited.

**`mode: "session"` (Discord only, requires `thread: true`):** Thread-bound. Follow-up messages in the thread continue routing to the same subagent session. Useful for ongoing back-and-forth on a bounded topic.

Default to `run`. Use thread-bound session only when the subagent is genuinely a separate ongoing conversation (a research assistant you want to ask follow-up questions).

## Step 8 — Test and iterate

First test pass:

```bash
# From main chat, explicit spawn
/subagents spawn main "Your drafted task prompt here"

# Check progress
/subagents list

# Read result after announce
/subagents info <id>
/subagents log <id>
```

Or via code:
```
In main session, ask: "Use sessions_spawn to [task]"
```

What to look for in output:
- Did it match the format you specified?
- Did it stay in scope?
- Did it return the right completion signal?
- Did it try tools that were denied? (Tool policy working as expected?)

Common first-run issues:
- Subagent's output is too chatty → tighten task prompt constraints
- Subagent wandered off-task → task prompt wasn't specific enough
- Subagent used denied tools → tool policy edits
- Subagent took too long → `runTimeoutSeconds` cap

## The concrete workflow — five-step draft

When the user says "design a subagent for X":

1. **Challenge** — "Why a subagent? Would a skill or inline work be simpler?"
2. **Scope** — "Depth 1 (leaf worker) or depth 2 (orchestrator)? What does it produce?"
3. **Task prompt** — Draft the actual spawn prompt with Context/Task/Output/Constraints/Completion sections
4. **Tool scope** — Pick from the research / code / processing / strict profiles above
5. **Parent AGENTS.md additions** — Add the authority, output format, and post-spawn handling rules
6. **Config** — Provide the `agents.defaults.subagents.*` block tuned for the workload
7. **Test pattern** — Explicit first-run commands for verification

Output: a spawn-ready task prompt, config snippet, AGENTS.md patch, test checklist.

## Subagent design anti-patterns

**"Mini me" subagent** — subagent designed with full persona expectations that it can't inherit. Fails silently because SOUL/USER aren't injected.

**"Just a small task" subagent** — using subagent for a 2-second lookup that should've been inline. Adds latency (spawn overhead) and cost without isolation benefit.

**"All the tools" subagent** — subagent gets full tool set; becomes an attack vector when processing untrusted input.

**"Silent forever" subagent** — no completion signal in task prompt. Subagent babbles or never announces clearly, parent agent doesn't know when to synthesize.

**"Chain of subagents" (at depth 1)** — trying to pass work from one subagent to another without orchestrator pattern. Can't do it; you need `maxSpawnDepth: 2`.

**"Personality drift" subagent** — subagent produces output in a completely different voice from the main agent because it has no SOUL.md. Fix: put voice expectations in the task prompt or in AGENTS.md.

## What to surface at end of the workflow

When wrapping up a subagent design with the user:

1. **The drafted task prompt** — ready to paste into `sessions_spawn`
2. **The config block** — for `agents.defaults.subagents.*` and tool scope
3. **AGENTS.md additions** — what to paste into the parent agent's operating rules
4. **First-run test commands** — `/subagents spawn`, `/subagents list`, `/subagents log`
5. **Iteration prompts** — "If output is too chatty, tighten the constraints section", etc.

Don't end with "and you're ready to deploy" — end with specific verification steps.

## Architect integration — how the skill should use this doc

When the OpenClaw Agent Architect skill is asked to design a subagent, it should drive the work through this reference rather than improvise. Specifically:

1. **Run Step 0 first, visibly.** The premise challenge is not a rhetorical gesture — it's a real gate. If the work isn't parallelizable, isn't context-heavy, and doesn't benefit from isolation, the skill should propose an inline call, a skill, or a cron job instead, and stop.
2. **Enforce the task prompt structure.** Every subagent prompt the skill emits must contain the five sections in "A good task prompt": Context, Task, Output format, Constraints, Completion signal. If any section would be empty, that's a signal the subagent isn't well-scoped yet.
3. **Pick a tool profile by default, not the full tool set.** Start from the research / code / processing / strict profiles in Step 3 and only widen on request. Default to `mode: non-main`, `scope: session`, and a cheaper model via `agents.defaults.subagents.model`.
4. **Add parent-side rules to AGENTS.md.** The parent's AGENTS.md needs a "Subagent usage" section covering when to spawn, how to handle results, how to synthesize output, and — importantly — that subagents inherit only AGENTS.md and TOOLS.md, not SOUL/USER/IDENTITY/MEMORY. Without that reminder, every new agent relearns this the hard way.
5. **Surface verification, not deployment.** End the design with first-run test commands (from Step 8), not a "ready to ship" statement. Subagent issues are almost always observable on the first few runs if you look.
