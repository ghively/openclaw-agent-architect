# Best Practices — When to Build What

You've decided to extend your agent. Good. The question is HOW — and the wrong answer is expensive.

- Wrong-path skills get rewritten into plugins after you hit their limits
- Wrong-path plugins cost 10x the build time of the skill that would have worked
- Wrong-path MCP servers get built when a local CLI would have been simpler
- Wrong-path tools sit unused because the agent can't figure out when to pick them

This reference is the opinionated decision framework. For the mechanical HOW of each path, see `references/tool-creation.md`. This file answers WHICH and WHEN.

## The core heuristic

**Build the simplest thing that could possibly work.** Upgrade only when the simple thing hits a real limit.

Progression of simplicity:
1. **Do nothing** — the agent's built-in tools (exec, read, write, web_fetch, memory, etc.) already cover it
2. **Tell the agent in chat** — one-off; not worth a persistent file
3. **Add to AGENTS.md** — recurring but general operating preference
4. **Write a skill** — recurring, specific, domain-bounded
5. **Write a CLI + skill** — the logic is script-worthy but not a native tool
6. **Connect an external MCP server** — someone already built this
7. **Write a plugin tool** — typed params, integration with lifecycle, distribution
8. **Build your own MCP server** — cross-client reuse, proprietary systems

Each step up is 5-10x more work than the one before it. Don't skip levels unless you have a specific reason.

## The decision framework — six questions, in order

Answer these for each new capability you want. The answers point at the right path.

### Q1: Does the built-in toolset already cover this?

The agent already has: `exec`, `read`/`write`/`edit`/`apply_patch`, `browser`, `web_search`/`web_fetch`, `memory_search`/`memory_get`, `message`, `sessions_*`, `cron`, `image_generate`, and more.

If yes → don't build anything. Tell the agent what to do in chat or add a preference to AGENTS.md.

**Test yourself:** If you asked the agent to do X right now, and it used `exec` or `web_fetch` or one of the other built-ins, would the result be good? If yes, you don't need a new tool — you need better instructions about WHEN to reach for the built-in.

**Common mistake:** building a "fetch weather" tool when `web_fetch` + a good skill instruction works fine.

### Q2: Is it one-off or recurring?

**One-off:** "Help me draft this email right now." → Don't persist anything. Handle in chat.

**Happens occasionally but varies:** "Help me think through problems like this." → AGENTS.md preference (general operating guidance, not task-specific).

**Same specific task repeats predictably:** "Every time I paste a Rapid7 CSV, rank by risk" → Now you want persistence. This is the threshold for a skill.

**Triggered by schedule or event:** "Every Sunday 8 PM, generate infrastructure report" → cron job + standing order in AGENTS.md. See `references/automation-and-hooks.md`.

**Test yourself:** How many times have you done or wished you'd done this in the last month? Under 3 → don't persist. 3+ → skill.

### Q3: Does existing code do the work, or do I need to write logic?

**Existing CLI on my host does the work** → markdown-only skill. The skill teaches the agent when and how to invoke the CLI via `exec`.

Examples: `rg` (ripgrep), `jq`, `ffmpeg`, `imagemagick`, `gh` (GitHub CLI), `kubectl`, your own existing scripts.

**Existing MCP server from the community does the work** → Connect it via `mcp.servers` config. No code.

Examples: GitHub MCP, Notion MCP, filesystem MCP, Context7, Brave search MCP, any of the dozens on the MCP registry.

**Need to write a small amount of domain-specific logic** → CLI + skill. Write a Python/bash/whatever script, drop it in `~/bin/`, reference from a skill.

Examples: "Parse MY company's CSV export format", "Call MY internal API with MY auth pattern", "Glue together 3 CLIs in a specific sequence."

**Need structured typed parameters the model fills in** → plugin tool.

Examples: `jira_create_issue(project_key, summary, issue_type)`, `slack_post_message(channel, text, thread_ts?)`, anything where the model needs to see "this tool wants these exact fields."

**Need to do any of these things**: intercept tool calls (`before_tool_call`), modify prompts (`before_prompt_build`), inject context, replace the memory backend, add a new model provider, register a new channel → **plugin, full stop.** Skills can't do these.

### Q4: Is a human going to copy this to other agents or clients?

**Just my one agent** → Skill, CLI+skill, or plugin depending on Q3. Skill is the default; skip to plugin only when Q3 demands typed params or lifecycle hooks.

**Multiple of MY agents** → skill in `~/.openclaw/skills/` (shared), or plugin. Either works.

**Publishable to other OpenClaw users** → skill published to ClawHub, or plugin published to npm/ClawHub. Plugins beat skills for non-trivial distribution because they version better and can register tools the model sees natively.

**Used by multiple MCP clients beyond OpenClaw (Claude Desktop, Cursor, Codex, Claude Code)** → build your own MCP server.

**Test yourself:** Could this capability live usefully inside Claude Desktop without OpenClaw at all? If yes → MCP server. If not → plugin or skill.

### Q5: What does the MODEL need to see for this to work well?

This is the question most people skip. The model's interface to tools is:
- Tool name
- Description
- Parameter schema (for plugin tools and MCP servers)
- Return content

If the model needs **free-form input** that varies every call (a search query, an email body, a prompt) → a skill with `exec` works. The agent constructs the command line.

If the model needs to fill in **specific named fields** (customer_id, priority, due_date) → plugin tool or MCP server with typed params. Free-form string construction gets sloppy.

If the agent should NEVER see this as a choice — you want it to happen deterministically — → skill with `command-dispatch: tool`. Bypasses the model entirely.

If the agent should have this available AND you want to watch, block, or require approval on its use → plugin (can register a `before_tool_call` hook on the same tool it provides).

### Q6: What's my threat tolerance?

Every path has a different risk profile:

**Skill (your own):** Lowest risk. It's markdown you wrote. Worst case you delete the file.

**Skill (from ClawHub):** Medium. Third-party markdown that tells the agent what to do. See `references/security-audit.md` — audit before install.

**CLI + skill (your own):** Low. It's your code.

**Plugin (your own):** Low. It's your code running in-process.

**Plugin (from ClawHub/npm):** HIGHEST risk. Third-party code running in-process with full gateway privileges. Can register hooks that see every message, tool call, and response. Audit hard.

**External MCP server (public):** Medium-high. Depends on the server operator. A malicious GitHub MCP server would see all your GitHub queries. Pin versions, prefer servers you can audit the source of.

**External MCP server (you wrote):** Low. Your code, isolated process.

If you're building something to install on a gateway that anyone else touches (family, team, shared resource) — default to the lower-risk path. Skills > Plugins when both would work.

## The "you think you need X but actually need Y" patterns

These are the miscategorizations that waste the most time.

### "I need a plugin" → No, you need a skill with `command-dispatch: tool`

**Symptom:** "I want a deterministic tool the model can invoke that calls a CLI with exact args."

**Reality:** That's exactly what `command-dispatch: tool` does. No TypeScript required.

```yaml
---
name: status
description: Show openclaw system status
user-invocable: true
disable-model-invocation: true
command-dispatch: tool
command-tool: exec
command-arg-mode: raw
metadata: { "openclaw": { "emoji": "📊" } }
---
```

User types `/status`, the CLI runs, no model in the loop. This is ~20 lines of YAML vs a full TypeScript plugin package.

### "I need a custom MCP server" → No, you need a plugin

**Symptom:** "I want to add some tools only my OpenClaw agent will use."

**Reality:** MCP is for cross-client reuse. If you'll never use the tools from Claude Desktop or Cursor, a plugin is strictly simpler. MCP servers are separate processes with their own lifecycle, transport concerns, and debugging overhead. Plugins run in-process, share gateway config, and get full Plugin SDK access (hooks, runtime API, service registration).

Build an MCP server ONLY when non-OpenClaw MCP clients need the same tools.

### "I need an MCP server for GitHub" → No, you need to connect to the existing one

**Symptom:** "I want my agent to create GitHub issues."

**Reality:** `@modelcontextprotocol/server-github` exists. Add it to `mcp.servers`, done. Writing your own is wasted effort unless the existing one doesn't cover your use case.

**The right sequence:** search https://github.com/modelcontextprotocol/servers first. Search the community list. Only build custom when nothing fits.

### "I need a skill" → No, it's one instruction

**Symptom:** "Every time I ask the agent to be concise, it's too verbose."

**Reality:** That's a SOUL.md rule, not a skill. Skills are for domain-specific task workflows. General behavioral preferences go in SOUL.md or AGENTS.md.

Test: does the solution name a specific task the agent does? "Rank Rapid7 CSV by risk" = task = skill. "Be concise" = behavior = SOUL.md.

### "I need a plugin to hook into tool calls" → Maybe, but start with AGENTS.md

**Symptom:** "I want to prevent the agent from running destructive commands."

**Reality:** The first layer is AGENTS.md rules ("never run rm -rf without confirmation"). The second layer is tool policy (`tools.deny`, exec approvals). A plugin with `before_tool_call` is the third layer, needed only when the first two don't give you what you want.

Enforcement layers stack. Don't jump to the most complex one.

### "I need a plugin for lifecycle hooks" → YES, that's the legitimate case

**Symptom:** "I want to log every tool call to a file for audit."

**Reality:** This is actually what plugins are for. Hooks are a plugin-only feature. BUT first check if a bundled hook covers it — `command-logger` already logs commands to `~/.openclaw/logs/commands.log`. Custom hook handlers are also simpler than full plugins if you just need event handling (see `references/automation-and-hooks.md`).

Hierarchy: bundled hook > custom hook handler (single file) > plugin with hook.

## When each path is definitively right

Clear-cut scenarios where there's no debate.

### Definitely a skill

- "Teach the agent to use `rg` instead of `grep`"
- "When user mentions Rapid7 CSV, rank by risk"
- "Use my voice-guide when drafting public content"
- "When user wants weather, call `wthr` CLI"
- "Domain knowledge about my specific codebase's conventions"
- "A slash command that's a deterministic pass-through to a CLI" (use `command-dispatch: tool`)

### Definitely a CLI + skill

- "Parse my company's proprietary CSV export format"
- "Call my internal HTTP API with our auth scheme"
- "Orchestrate 3 CLIs in a specific sequence"
- Anything where the logic is "Python script territory" but the agent needs to know it exists

### Definitely a plugin

- "I want a tool with 5 typed parameters the model fills in"
- "I want `before_tool_call` to block commands matching a pattern"
- "I want to inject context into the system prompt before model call"
- "I want a new memory backend"
- "I want a new model provider"
- "I want to register a new channel"
- "I want to publish this to ClawHub for other OpenClaw users"

### Definitely an external MCP server (connect, don't build)

- "I want GitHub / Notion / Slack / Linear / Filesystem / Context7 / Brave search / any well-known service"
- Check `references/plugin-ecosystem.md` FIRST for the scenario → server map
- Then https://github.com/modelcontextprotocol/servers for the reference server list
- Then vendor's own GitHub org (GitHub's is at `github/github-mcp-server`, Cloudflare's at `cloudflare/mcp`, etc.)

### Definitely build your own MCP server

- "My proprietary CRM has no public MCP server"
- "I want these tools available in OpenClaw AND Claude Desktop AND Cursor"
- "I'm building a product where MCP is the distribution mechanism"
- "The tool is genuinely useful to agents beyond my own"

### Definitely AGENTS.md

- "Always confirm before pushing to main"
- "Use memory_search before asking me to repeat"
- "Prefer apply_patch over multiple edit calls"
- "No pleasantries, answer first"
- General operating rules that apply across tasks

### Definitely SOUL.md

- "Be blunt, not corporate"
- "Never open with 'Great question'"
- "Have opinions, commit to takes"
- Voice / tone / attitude

## Token economics across paths

Each path has a different ongoing cost per turn. This matters over millions of turns.

| Path | Context cost per turn | Notes |
|------|----------------------|-------|
| Built-in tool | Already included in tool schemas | Free-ish |
| AGENTS.md rule | ~50-200 tokens (inside AGENTS.md) | Shared cost |
| SOUL.md rule | ~20-100 tokens (inside SOUL.md) | Shared cost |
| Skill (description only) | 97 chars + field lengths | Body loads only on-demand |
| Skill body (when loaded) | Full body tokens (one-time per session) | |
| Plugin tool schema | 100-500 tokens per tool | Every turn |
| External MCP tool | 100-500 tokens per tool | Every turn |
| Your own MCP tool | 100-500 tokens per tool | Every turn |

Implication: **many small plugin tools cost more context than a single skill with a long body.** The plugin tool schemas inject every turn; the skill body only loads when the agent thinks the skill is relevant.

For plugin authors: prefer fewer, higher-level tools over many fine-grained ones. `create_or_update_issue(id?, fields)` beats `create_issue(fields)` + `update_issue(id, fields)`.

For MCP server authors: don't overexpose. If your server has 50 tools, users pay 50x schema tokens every turn. Split into multiple servers users can enable selectively, or provide a minimal default tool surface.

## Trust and audit by path

When something goes wrong — or you're evaluating "should I install this?" — the trust story differs per path.

| Path | Trust boundary | Audit effort |
|------|---------------|--------------|
| Skill (yours) | You wrote the markdown | Self-review |
| Skill (community) | Third-party instructions with full agent tool access | Medium — read every line of SKILL.md |
| CLI + skill (yours) | Your code | Self-review |
| Plugin (yours) | Your code, in-process | Self-review + test |
| Plugin (community) | Third-party in-process code, gateway privileges, hooks on everything | HIGH — see `references/security-audit.md` |
| External MCP (public, reputable) | Third-party process, talks to your agent over MCP | Medium — check the server's source |
| External MCP (public, unknown) | Same as above but higher uncertainty | HIGH — pin version, sandbox if possible |
| External MCP (yours) | Your process | Self-review |

Default to skills for community code when possible. They're easier to audit (read markdown) than plugins (read TypeScript + understand SDK).

## The one-line decision

When stuck, say this out loud:

> "I want to give my agent the ability to [specific capability] for [specific purpose]."

Then match:
- Capability uses an existing CLI on my host → **skill**
- Capability uses an existing cloud service with a public MCP server → **connect external MCP**
- Capability uses my own internal system → **CLI + skill** (if simple) or **plugin** (if typed params needed)
- Capability needs to intercept or observe agent behavior → **plugin (with hooks)**
- Capability should be available to tools beyond OpenClaw → **your own MCP server**

If you can't fill in "specific capability for specific purpose" — you're not ready to build yet. Go back to the agent's current behavior and figure out what's actually missing.

## Anti-pattern router — the short list Architect uses

When someone shows up asking for a plugin, an MCP server, or a skill, most of the time what they actually want is one of these four flips. Architect runs through this list before approving any build plan:

- **"I need a plugin"** → start with a skill using `command-dispatch: tool`. If the intent is "run this CLI with these args and put the result into the conversation," that's a skill, not a plugin.
- **"I need my own MCP server"** → start with a plugin. MCP is for cross-client reuse (Claude Desktop, Cursor, etc.). If you'll only call the tools from an OpenClaw agent, a plugin is strictly simpler.
- **"I need an MCP server for GitHub / Notion / Slack / …"** → start with the existing MCP server. Connect it; don't rebuild it. Build your own only when nothing fits.
- **"I need a skill"** (for general behavior) → often that's a SOUL or AGENTS rule, not a skill at all. If the "skill" is just a paragraph of operating instructions, it belongs in AGENTS.md.

A fifth one worth naming: "I need a plugin to hook into tool calls" — sometimes yes (legitimate plugin hooks), often no. If the goal is policy enforcement, AGENTS.md guidance paired with `tools.*` policy is usually the right layer, with the plugin only added when you need *runtime enforcement* on top of both.

### Threat-tolerance decisions

The right path is also a function of how much trust you're willing to extend:

- **Low tolerance** (single-user trusted host, strict operator): prefer skills and CLI+skill patterns, and stick to vetted MCP servers. Plugins only after reading the source.
- **Medium tolerance**: plugins are fine *after audit* (review the TypeScript, check `manifest.permissions`, look for unusual `requires.bins`). External MCP servers stay limited to mainstream maintainers.
- **High tolerance** (throwaway host, disposable sandbox, you know what you're doing): third-party plugins and MCP servers are OK, but still isolate with sandbox + exec approvals so a surprise can't reach outside the agent.

If the user can't articulate which tier they're in, Architect should default to the lower-risk path. You can always loosen later.

## Avoiding over-building

The biggest trap in agent extension is building speculatively. "I might want this later, so I'll build it now." Don't.

Build when:
- You've seen the missing capability come up 3+ times
- You can name exactly when it should trigger
- You know the simplest path that solves it
- You're willing to maintain what you build

Delete when:
- A skill hasn't triggered in 3 months
- A plugin's tool has never been picked by the agent
- An MCP server connection is failing and nobody noticed
- The thing no longer matches how you actually work

Every installed capability is context cost, maintenance cost, and attack surface. Prune ruthlessly.

## Minimum viable version first

For any path you pick:

1. Build the absolute minimum
2. Test with 3 realistic prompts in fresh sessions
3. Note what the agent gets wrong
4. Fix the ONE worst thing
5. Repeat 2-4 until it's reliable

Don't try to cover edge cases upfront. Don't add 5 parameters when 2 work. Don't add fallback logic before you've seen the primary path fail. Every feature you add before you've validated the minimum is probably wrong.

This applies especially to plugin tools, where the temptation to add optional params is strong. Start with required params only. Add optional ones when you've seen the model struggle without them.
