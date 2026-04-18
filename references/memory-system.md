# Memory System — How OpenClaw Remembers

OpenClaw's memory is conceptually simple: the agent writes markdown files to the workspace, and reads them back later. There are no hidden embeddings, no cloud state, no opaque databases. What's on disk is what the agent knows.

Around that simple core there are four concerns to understand:
1. **Which files do what** (MEMORY.md vs daily vs Wiki vs Dreams)
2. **When memory loads automatically vs on-demand**
3. **Which backend handles search** (builtin / QMD / Honcho / Wiki)
4. **How memory survives compaction**

## How to work through this with the user

**Plan mode applies.** Do not draft MEMORY.md seed content or commit to a backend until the user has confirmed the memory architecture. See the Plan-Mode Contract in the main SKILL.md.

**Pace:** 10-20 minutes for basic MEMORY.md planning. Longer if evaluating backend switch or Memory Wiki plugin.

**Sequence:** Decide backend (default memory-core is usually right) → decide scope (basic memory only, or memory + Wiki) → sketch MEMORY.md seed content (3-5 durable facts) → decide on daily-memory conventions to put in AGENTS.md → present plan → get approval → draft.

**Don't:**
- Over-seed MEMORY.md at bootstrap — start with 3-5 facts, let it grow
- Propose Memory Wiki / QMD / Honcho unless there's a specific reason the default backend won't work
- Put session-scoped context into MEMORY.md (that's what daily files are for)
- Mix memory *policy* (what to remember) into the memory seed — policy goes in AGENTS.md
- **Seed MEMORY.md before the user has confirmed what belongs there**

**Do:**
- Ask the user what durable facts the agent should know on day one — name, timezone, core context
- Recommend default backend (memory-core) unless the user has a specific Obsidian/Honcho case
- If memory needs to span external sources (notes, vault, multiple collections), discuss QMD or Wiki
- Plan the memory conventions for AGENTS.md (when to read, when to write) during this phase

Get these right and memory just works. Get them wrong and you'll see the agent forgetting things it was told five minutes ago, or burning context re-loading everything you've ever told it on every turn.

## The three-file model

### `MEMORY.md` — long-term durable facts

- **One file, at the workspace root**
- **Loaded every DM session** directly into the context window
- For preferences, durable facts, commitments, decisions
- Keep it SMALL — every turn pays the token cost
- Recommended cap: **5 KB** (≈ 1250 tokens)
- Over 10 KB and you'll see context-window pressure and more frequent compaction

What belongs:
- "User's partner is Tori, kids live with us"
- "User's timezone is America/Chicago"
- "User prefers tabs over spaces in Python"
- "User works at CPI Card Group as DevOps Engineer; target role is Solutions Architect"

What does NOT belong:
- Today's context ("we're working on the auth refactor right now")
- Chat scrollback ("Gene sent a message at 3 PM")
- Reference material ("here's the full syntax for cron expressions")
- Project state ("the deploy failed because...")

### `memory/YYYY-MM-DD.md` — daily working memory

- **One file per day, in `memory/` subdirectory**
- **NOT auto-injected into context** — the agent accesses these via `memory_search` and `memory_get` tools on demand
- Good place for: today's context, active tasks, decisions made today, ad-hoc notes
- These can grow larger since they don't cost tokens per turn — only when the agent reads them
- AGENTS.md should instruct the agent to read today's + yesterday's files at session start

Filename format: UTC date by default. `memory/2026-04-16.md`.

What belongs in daily notes:
- "Started CPI benefits enrollment today. 3% 401k + Max HSA strategy"
- "Deploy failed: RDS connection timeout; rolling back"
- "Gene mentioned wanting to draft investor update tomorrow morning"
- "[ ] Call lawyer about CPI non-compete"

### `DREAMS.md` — experimental consolidation output

- **Optional file, written by the Dreaming system (experimental, opt-in)**
- Not user-written; contains phase summaries and promotion candidates from the memory consolidation background process
- If you're using it, review it weekly as a "what does the agent think is durable?" audit surface

## How memory loads — three paths

1. **Bootstrap injection** — `MEMORY.md` loads at the start of every session, part of the workspace bootstrap. Costs tokens every turn.
2. **Agent-triggered reads** — `memory_search` and `memory_get` tools retrieve daily notes or specific files on demand. Costs tokens only for what's retrieved.
3. **Pre-compaction flush** — before compaction summarizes context, OpenClaw runs a silent turn reminding the agent to save important context to memory files. Keeps durable context from being lost.

Design memory to minimize path 1 (injection) and maximize path 2 (on-demand). A big `MEMORY.md` full of daily minutiae wastes tokens. A big `memory/YYYY-MM-DD.md` with searchable detail works fine because the agent only pulls what it needs.

## Memory tools

The agent uses two tools (provided by the active memory plugin, default `memory-core`):

### `memory_search`
Semantic + keyword hybrid search across memory files. Use when looking for information by meaning, not exact file.

```
# Agent-side usage (natural language)
memory_search("what did we decide about the auth refactor")
# Returns ranked snippets with file paths
```

### `memory_get`
Direct file or line-range read. Use when the agent knows exactly which file/section it wants.

```
memory_get("memory/2026-04-10.md")
memory_get("memory/2026-04-10.md", { lines: [20, 40] })
```

Instruct the agent in AGENTS.md to try `memory_search` before asking you to repeat yourself.

## Memory backends

Three backends compete for the `memory` plugin slot. All provide the same tools (`memory_search`, `memory_get`) but with different backends.

### `memory-core` (builtin, default)
- SQLite-based
- Works out of the box
- Keyword + vector + hybrid search
- No external dependencies
- **Use this unless you have a specific reason to switch**

### `memory-lancedb` (install-on-demand)
- LanceDB vector store, bundled with OpenClaw
- Auto-recall/auto-capture behavior
- Larger scale, more aggressive memory management

```json5
{ plugins: { slots: { memory: "memory-lancedb" } } }
```

### `memory-qmd` (sidecar)
- Local-first, advanced
- Reranking, query expansion
- Can index directories OUTSIDE the workspace (your Obsidian vault, project notes, etc.)
- Useful when memory needs to span multiple stores

### `memory-honcho` (plugin)
- AI-native cross-session memory
- User modeling, multi-agent awareness
- Requires the plugin install

## Embedding providers

For semantic search, the backend needs an embedding provider. Memory-core auto-detects from available API keys:
- OpenAI
- Gemini
- Voyage
- Mistral

No config needed if you already have any of those keys. Without an embedding provider, `memory_search` falls back to keyword-only matching — still works, just less semantic.

## Pre-compaction memory flush

This is an important behavior to understand because it shapes what the agent remembers across long sessions.

Before the conversation context gets auto-compacted (summarized to fit the window), OpenClaw runs a **silent agent turn** that reminds the model: "save anything important from this conversation to memory files before it gets summarized."

This prevents the most common "why did it forget?" failure: you tell the agent something mid-conversation, conversation runs long, auto-compaction happens, the summary drops the detail, and the agent no longer has it.

The flush is **on by default**. You don't need to configure it. But you should:
- In `AGENTS.md`, tell the agent to actively save to MEMORY.md / daily files as soon as it learns something durable — don't wait for the flush
- Watch for the `🧹 Auto-compaction complete` indicator in verbose mode to know when it happens

## Memory Wiki — bundled plugin for structured knowledge

If raw memory notes aren't enough — you want more structured, provenance-tracked knowledge — the `memory-wiki` plugin is the next step up.

```bash
openclaw plugins enable memory-wiki
```

Provides:
- Wiki-native tools: `wiki_search`, `wiki_get`, `wiki_apply`, `wiki_lint`
- Deterministic page structure
- Structured claims with evidence
- Contradiction and freshness tracking
- Generated dashboards
- Obsidian-friendly workflows

Does NOT replace the active memory plugin. Wiki runs ALONGSIDE `memory-core`. Memory plugin still owns recall/promotion/dreaming; wiki adds a separate provenance-rich knowledge layer.

When to use it:
- You already take structured notes (Obsidian, etc.) and want the agent to reason over them
- You want to track facts with evidence and contradictions, not just raw notes
- You're building a research agent where "where did this claim come from?" matters

When NOT to use it:
- Early in your agent's life — start with plain memory notes
- For personal assistants where the vibe is "just remember what I said"

## Dreaming — experimental memory consolidation

Dreaming is OpenClaw's answer to "MEMORY.md grows too fast." It runs a background consolidation pass that:
- Collects short-term signals from recent conversations
- Scores candidates for "is this durable?"
- Only promotes items that pass score + recall frequency + query diversity gates
- Writes phase summaries and a Dream Diary to `DREAMS.md` for your review

**Disabled by default.** Opt in via config when you want it:
```json5
{
  // Specifics vary by backend; check docs.openclaw.ai/concepts/dreaming for current config schema
}
```

When enabled, `memory-core` auto-manages a recurring cron job for the dreaming sweep.

Dreaming has two review lanes:
- **Live dreaming** — normal deep phase, works from short-term store at `memory/.dreams/`, decides what graduates to `MEMORY.md`
- **Grounded backfill** — retrospectively reviews your `memory/YYYY-MM-DD.md` files, writes structured review output to `DREAMS.md`

Backfill is useful to audit old notes without touching the live system:
```bash
openclaw memory rem-backfill --path ./memory --stage-short-term

# If the replay is useful → leave staged; if not → rollback
openclaw memory rem-backfill --rollback
openclaw memory rem-backfill --rollback-short-term
```

Design principle: `DREAMS.md` is for HUMAN review, short-term store is for MACHINE ranking, `MEMORY.md` is ONLY written by deep promotion. Don't let the agent edit `DREAMS.md` directly.

## Decision trees — when to turn which knob

Memory is one of the areas where architects over-engineer the easiest. These decision trees steer you to the simplest answer that works.

### When to switch backends (off default `memory-core`)

Use this decision tree before proposing a non-default backend:

1. **Is the agent forgetting things the plain MEMORY.md + daily files would have caught?**
   - If yes → the problem is almost certainly AGENTS.md memory conventions (session-start read missing, no pre-ask `memorysearch` rule) or USER.md not surfacing key facts. **Fix the conventions first.** Backend swaps almost never fix "the agent doesn't look things up."
   - If no → continue.
2. **Is semantic recall quality the problem?** (Agent recalls the wrong entries, or misses obvious matches.)
   - If yes → add or change the embedding provider (OpenAI / Voyage / Gemini / Mistral) before swapping backends. Embedding quality dominates recall far more than backend architecture.
   - If no → continue.
3. **Does the agent need to index content OUTSIDE the workspace?** (Obsidian vault, project notes across multiple repos, a shared-team knowledge base.)
   - If yes → `memory-qmd` is the right answer. Nothing else spans multiple stores natively.
   - If no → continue.
4. **Is the agent running at a scale where auto-capture/auto-recall semantics would meaningfully help?** (High-throughput, many users, or explicitly aggressive memory management desired.)
   - If yes → `memory-lancedb` is appropriate. Its auto-management is the thing you're paying for.
   - If no → continue.
5. **Do you need AI-native cross-session user modeling or multi-agent awareness?**
   - If yes → `memory-honcho`, and plan for the install + plugin trust review.
   - If no → **stay on `memory-core`. It is the right answer for 80–90% of agents.**

If you went through all five and still picked `memory-core`, that's not a failure — that's the expected outcome for most agents.

### When MEMORY.md has grown past ~5 KB

This is the single most common memory failure mode. The fix path:

1. **Audit first.** Read MEMORY.md front-to-back. Tag each bullet: durable (name, canonical preferences, long-term goals) vs session-relevant (last week's project, a one-time meeting context) vs stale (facts that aren't true anymore).
2. **Move session-relevant bullets** into the current `memory/YYYY-MM-DD.md` daily file. That's where volatile context is supposed to live.
3. **Delete stale bullets.** Don't be precious — if the user's "current project" from 6 months ago is still listed, it's drag, not memory.
4. **Keep durable bullets in MEMORY.md.** Target: back under ~5 KB.
5. **Then** consider whether the root cause was missing convention ("the agent writes durable facts to MEMORY.md but never cleans it up" — add a weekly or monthly housekeeping prompt) or a backend choice (if the user has hundreds of legit durable facts, Dreaming + memory-lancedb may be warranted).

Backend change is step 5. Audit + split + delete is steps 1-4. Don't skip straight to backend.

### When to enable Dreaming

Dreaming is powerful and opt-in for a reason. Use it when:

1. The agent has been in daily use for at least 2–4 weeks, AND
2. MEMORY.md has been audited (per above) at least once, AND
3. The user genuinely wants the agent to *promote durable facts on its own* rather than editing MEMORY.md manually, AND
4. The user is willing to review `DREAMS.md` on some cadence (weekly is typical) to approve/reject promotions.

Do NOT enable Dreaming when:
- The agent is brand new — give the simple system a chance to work.
- The user is cost-sensitive — the dreaming sweep runs as a cron job and burns tokens on every pass. The cost profile is similar to a medium-cadence heartbeat (see the Cost Reference Table in `references/automation-and-hooks.md`).
- The user is not willing to review `DREAMS.md` periodically. Dreaming without review produces silently drifting memory, which is worse than no consolidation.

### When to add the Memory Wiki

Different axis from Dreaming — wiki is for *structured* knowledge with provenance, not consolidation. Add it when:

1. The user already has structured notes (Obsidian, personal knowledge graph) and wants the agent to reason over them, OR
2. The agent is doing research where "where did this claim come from?" matters and you need contradiction/freshness tracking, OR
3. The agent needs to produce dashboards or linted knowledge pages.

Stay off wiki when:
- Memory is working fine in the plain three-file model — adding wiki is a real surface-area increase.
- The user's request is "just remember what I said" — wiki is too structured for that use case.

### When to add a custom embedding provider vs use defaults

Defaults (auto-detected from API keys): usually fine. Swap when:
- You're getting poor semantic recall and you're already on a default — try Voyage or Mistral before touching backends.
- You're in a regulated environment where only one provider is permitted — configure explicitly rather than letting auto-detect pick.
- Cost matters and one provider is dramatically cheaper at acceptable quality for your domain.

Don't swap just because a new embedding model is available. Test recall on 10–20 representative queries before migrating — embedding changes can silently hurt recall patterns the user already relied on.

## Memory CLI

```bash
# Check index status and embedding provider
openclaw memory status

# Search from the command line (useful for debugging what the agent sees)
openclaw memory search "the thing about auth"

# Rebuild the search index (after manual edits or file moves)
openclaw memory index --force
```

## Designing memory for a new agent

Start minimal:
1. Seed `MEMORY.md` with 3-5 durable facts (name, location, top-line preferences)
2. Leave `memory/` empty at first
3. Let the agent write daily notes as sessions happen
4. After a week: review MEMORY.md, prune anything that became irrelevant

Starter `MEMORY.md`:
```markdown
# Memory

## About the user (durable facts)
- Name: Gene
- Timezone: America/Chicago (Hendersonville, TN)
- Partner: Tori. Kids at home.
- Work: DevOps Engineer at CPI Card Group

## Technical environment
- Homelab: Synology DS1817+ NAS, Docker
- Shell: zsh on macOS; bash on Linux servers
- Prefers: PowerShell → Python → Bash → TypeScript

## Long-term goals
- Target role: Solutions Architect (not management)
- Currently evaluating CPI non-compete terms before signing
```

That's it. The agent will fill in more as it learns. Don't pre-bloat the file.

## Memory anti-patterns

- **Dumping chat scrollback into MEMORY.md** — this is what daily notes are for, and `sessions_history` for recall
- **Using MEMORY.md as a scratchpad** — kills your context budget; use daily notes
- **Writing third-person summaries** ("Gene is a DevOps engineer who...") vs first-person facts ("I'm a DevOps engineer" / "User is a DevOps engineer") — be consistent with your AGENTS.md conventions
- **Never pruning** — MEMORY.md should shrink sometimes, not only grow
- **Duplicate facts across files** — a fact should live in exactly one place
- **Forgetting to commit memory changes to git** — you'll lose the agent's memory if the workspace dies

## Inspecting memory load

When in doubt about what's actually in context:

```
# Send in chat:
/context list
# Shows every injected file, size per file, truncation status
```

If MEMORY.md shows `TRUNCATED`, you're over budget (`agents.defaults.bootstrapMaxChars`, default 20000). Time to prune or move content to daily notes.

## A full session flow, end-to-end

Here's what happens when you send a message, from memory's perspective:

1. **Session start or turn start**
   - OpenClaw builds the system prompt
   - Injects `MEMORY.md` under Project Context (if present)
   - Daily memory files are NOT injected — they're available via tool
2. **During the turn**
   - If the agent needs past context, it calls `memory_search` or `memory_get`
   - Retrieved snippets get added to context for this turn only
3. **Turn ends**
   - If the agent wrote to a memory file, the write is committed to disk
   - Writes do NOT automatically update the injected `MEMORY.md` in this same turn — next session start will see the new content
4. **Conversation grows → approaches context limit**
   - Pre-compaction memory flush: silent turn reminds agent to save important context
   - Auto-compaction: older turns get summarized in place
5. **Next session (`/new` or time-based reset)**
   - Fresh read of `MEMORY.md` into context
   - Agent can call `memory_search` to find anything from prior sessions

## See also

- `references/bootstrap-files.md` — IDENTITY/USER/TOOLS context files read alongside memory
- `references/soul-writing.md` — SOUL.md is voice; memory is facts (distinct surfaces)
- `references/failure-modes.md` — memory failure modes (weekly forgetting, bloat, two-agent contradiction)
- `assets/worksheets/memory-backend-choice.md` — decide memory-core vs lancedb vs qmd vs honcho
- `assets/templates/MEMORY.md`, `DREAMS.md` — durable seed files
- `assets/audit-checklists/quarterly-reaudit.md` — includes the memory-health pass alongside security
