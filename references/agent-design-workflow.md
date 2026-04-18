# Agent Design Workflow — From Zero to Running

This is the sequence for building an agent from nothing. Follow it in order. Skipping steps creates the most common class of problems: bloated context, leaky tool policy, wrong persona injection, and agents that forget what they were supposed to do between turns.

## How to work through this with the user

**Plan mode applies.** Do not draft any files until the user has approved the complete plan. See the Plan-Mode Contract in the main SKILL.md. In practice for this workflow: walk through all 12 steps as a planning exercise first — discuss what each file will contain, what the config will look like, what the tests will verify. Produce ONE cohesive plan. Get approval. Then build.

**Pace:** A real agent design takes 30-60 minutes of back-and-forth, NOT one giant prompt-and-draft. Work through the 12 steps as a conversation, not a dump.

**Sequence:** Pre-flight → step 1 → wait → step 2 → wait → etc. After each decision, summarize what you heard and move to the next. Don't rush.

**Don't:**
- Dump all 12 steps as a wall of text
- Draft files before the user has made the decisions those files depend on
- Skip pre-flight just because the user seems ready to build
- Write SOUL.md or AGENTS.md without loading `soul-writing.md` and `agents-md-patterns.md` first
- **Draft ANY file until the user has approved the complete plan (see plan-mode)**

**Do:**
- Push back on vague answers during pre-flight ("an assistant for stuff" is not a job)
- Ask concrete clarifying questions when scope is unclear
- Sketch what each file WILL contain in prose form during planning — this is the plan, not the file
- After planning is complete and approved, THEN draft files one at a time in build mode
- Deliver the config JSON as a single block the user can paste, not as running prose — but only during build mode

**What "done" looks like (plan mode):** You have a complete written plan covering all 12 steps' decisions. User has explicitly approved.

**What "done" looks like (build mode, after approval):** Drafted workspace files (IDENTITY, USER, SOUL, AGENTS, TOOLS, HEARTBEAT, MEMORY seed), a config JSON block, and a clear checklist of next steps (pair channels, start gateway, smoke test).

**Deployment is a separate conversation.** This skill designs agents. Where/how the Gateway runs on the user's hardware is deployment, not design. If the user asks about deployment mid-flow, answer briefly and return to design — or offer to finish the design first, then tackle deployment.

## Pre-flight — decide what this agent is FOR

Before touching any file, answer in one sentence:

> This agent's job is to _______ for _______ on _______.

Examples:
- "This agent's job is to manage my personal inbox and calendar for me on WhatsApp and WebChat."
- "This agent's job is to monitor my homelab Synology and alert me on Telegram."
- "This agent's job is to draft investor updates and review content for my team on Slack."

If you can't fill that sentence in, stop. An agent without a clear job becomes a general-purpose helper that does everything badly and hits its context window twice a day. You can always add agents later — start narrow.

Next, decide scope of authority:
- **Chat-only** — the agent answers messages, never runs commands or browses
- **Read-only tools** — can read files, search web, fetch URLs, but not modify anything
- **Full operator** — can exec shell, edit files, drive browser, send messages

Write this down. It's about to drive every other decision.

## Pre-flight follow-on — pick a build track

The authority scope maps directly onto one of three build tracks. Record the choice before you start Step 1 — it determines tool posture, sandbox defaults, whether `exec-approvals.json` is generated, and which operator scaffolding (if any) is in scope.

### Track A — Chat / read-only agent
- **Authority:** chat-only or read-only. Never mutates external state.
- **Tool policy:** posture A (chat-only) or posture B (read-only) from `tool-policy-and-security.md`. Deny `exec`, `process`, `write`, `edit`, `applypatch`, `browser`, `cron`, `gateway`.
- **Typical workloads:** inbox assistant, researcher, report/draft generator, knowledge agent. Anything that never changes something outside the conversation.
- **Do NOT generate:** `exec-approvals.json`, SSH/operator scaffolding, or any config block that implies mutation capability.

### Track B — Full operator on a trusted host
- **Authority:** full operator for a single, trusted user.
- **Tool policy:** posture C (full operator) with conservative defaults:
  - `fs.workspaceOnly: true` when possible.
  - `tools.exec.security: "allowlist"`.
  - `tools.exec.ask: "on-miss"`.
  - `tools.exec.askFallback: "deny"`.
  - `tools.exec.strictInlineEval: true`.
  - `tools.exec.autoAllowSkills: false` unless explicitly accepted.
- **Required:** `.openclaw/exec-approvals.json` using the three-layer structure described in `tool-policy-and-security.md` (safe introspection / scoped ops / always-ask).
- **Optional modules:** operator scaffolding (e.g., Ansible inventory + a read-only gather-facts playbook, SSH shims) only when the requirements specifically call for fleet management and the user has confirmed they want the agent to drive it — not just to run it manually. Do not produce this scaffolding speculatively.

### Track C — Multi-agent / system architecture
- Use when the approved architecture includes more than one agent.
- Each agent in the system still uses Track A or Track B internally.
- Multi-agent routing and `bindings` are handled by `multi-agent-routing.md` and the architecture summary in `system-architecture.md`.
- Don't duplicate tool policy across agents — differentiate them by role.

Document the selected track in the plan summary. Every downstream step should be conditioned on the track: a Track-A agent should never see exec-approvals content, and a Track-B agent should never ship without hardening flags set.

## Pre-flight follow-on — memory & heartbeat defaults for every new agent

Regardless of track, start conservative. These defaults prevent the two most common day-one problems (context bloat and expensive busy-loops):

- **MEMORY.md seed:** 3–5 durable facts only — name, timezone/location, core language or runtime preferences, long-term goals. Keep the file under ~5 KB. Volatile context goes in daily files, not here.
- **Daily memory:** use `memory/YYYY-MM-DD.md` for today's working context. In AGENTS.md, instruct the agent to read today's and yesterday's daily files at session start, surface active tasks, and use `memorysearch`/`memoryget` before asking the user to repeat anything.
- **Heartbeat:** set `heartbeat.every: "0m"` in `openclaw.json` at bootstrap. HEARTBEAT.md may exist but should be effectively no-op for the first week. Heartbeats only get enabled after the agent has been observably stable and you can describe — in writing — a narrow checklist of what it should actually do on a tick.

## Step 1 — Name, identity, persona

### Agent ID
The `agentId` is a short, stable, lowercase identifier. It becomes part of session keys, directory paths, and config lookups. **Choose it once and don't change it** — renaming mid-flight leaves orphaned session transcripts and auth profiles.

Good IDs: `main`, `ops`, `writer`, `inbox`, `family`, `homelab`
Bad IDs: `my-ai-assistant-v2`, `test`, `bot1`, `ClawBot`

Default is `main`. Use `main` for your primary personal assistant. Use additional IDs only when you've decided multi-agent is necessary (see `references/multi-agent-routing.md`).

### Display name and emoji
These go in `IDENTITY.md`. They're what the agent calls itself and the vibe it projects. Keep them short.

### Persona — what kind of entity is this?
The persona shows up in `SOUL.md`. Before writing the file, decide:
- Is it a character with a name (Molty, Claudia, Brosef, Amy) or just "your assistant"?
- Does it have opinions or does it defer?
- How casual? How blunt?
- Does it swear? Tell jokes? Push back?
- What's the one thing it absolutely won't do (refuse list)?

See `references/soul-writing.md` for the full SOUL.md craft guide.

## Step 2 — Workspace setup

### Create the workspace
```bash
# Standard location
~/.openclaw/workspace/

# Or use a profile-specific workspace
OPENCLAW_PROFILE=work openclaw setup
# → creates ~/.openclaw/workspace-work/
```

The first run of `openclaw setup` (or `openclaw onboard`) seeds these files:
- `AGENTS.md`, `SOUL.md`, `USER.md`, `IDENTITY.md`, `TOOLS.md`, `HEARTBEAT.md`
- `BOOTSTRAP.md` (only on brand-new workspaces; delete after first-run ritual)

### Make it a private git repo

Do this immediately. The workspace IS the agent's long-term memory. Losing it means starting over.

```bash
cd ~/.openclaw/workspace
git init
echo '.DS_Store
.env
**/*.key
**/*.pem
**/secrets*' > .gitignore
git add AGENTS.md SOUL.md TOOLS.md IDENTITY.md USER.md HEARTBEAT.md memory/
git commit -m "Initial workspace"

# Push to a PRIVATE remote
gh repo create openclaw-workspace --private --source . --remote origin --push
```

**Never commit these files** (they're not in the workspace but it's easy to accidentally add them):
- `~/.openclaw/openclaw.json` — config with tokens
- `~/.openclaw/credentials/` — channel creds
- `~/.openclaw/agents/<id>/agent/auth-profiles.json` — model/API keys
- Session transcripts

## Step 3 — Write the bootstrap files

Write in this order. Each file has a specific job and loading behavior.

### `IDENTITY.md` — the agent's nameplate

Short. Like, really short. 3-5 lines.

```markdown
# Identity

**Name:** Molty
**Vibe:** Sharp, concise, slightly irreverent. Space lobster energy.
**Emoji:** 🦞
```

Loaded every session. Don't turn this into a biography.

### `USER.md` — who the user is to the agent

Write this from the perspective of "what does the agent need to know about me to serve me well?" — not your LinkedIn.

```markdown
# User

**Name:** Gene. Call me Gene.
**Timezone:** America/Chicago
**Context:** DevOps Engineer at CPI Card Group. Mostly Windows server patching, 
vulnerability remediation via Rapid7 InsightVM, release deployments via Octopus 
Deploy and GitLab CI/CD. Automating with PowerShell, Python, Bash, Ansible.

**Communication style:** Direct. Don't pad replies. Skip the "Great question!" opener.
I prefer terse answers and will ask follow-ups if I need more.

**Technical level:** Senior engineer. You can use jargon freely. No need to 
explain Git, Docker, systemd, or anything below that bar.

**Boundaries:** Don't volunteer legal, financial, or medical advice unless asked.
```

Loaded every session. Injected into context on every turn. Keep it ≤ ~2 KB.

### `SOUL.md` — the voice

This is the one that changes the agent's feel most. See `references/soul-writing.md` for the full guide. Minimal example:

```markdown
# Soul

You have opinions. You commit to takes.
Never open with "Great question", "I'd be happy to help", or "Absolutely".
One-sentence answers when one sentence fits.
Call out dumb ideas early. Charm over cruelty.
Swearing is allowed when it lands. Don't force it.
Be the assistant I'd actually want to talk to at 2am. Not corporate. Not sycophantic.
```

### `AGENTS.md` — the operating rules

Procedural. See `references/agents-md-patterns.md` for patterns. Minimal example:

```markdown
# Agents.md

## Core behavior
- Execute-verify-report: do the thing, confirm it worked, then tell me
- Never say "I'll do that" — just do it and tell me the result
- When you fail: one retry with a different approach, then report

## Memory usage
- Read today's + yesterday's memory files at session start
- When I tell you something worth keeping, write it to MEMORY.md
- Use `memory_search` before asking me to repeat myself

## Tools
- Prefer read tools before exec
- For long-running work use `cron` or `sessions_spawn`, not blocking exec loops
- Never commit to git or push branches without explicit confirmation
```

### `TOOLS.md` — your tool conventions (guidance only)

This is notes about YOUR environment for the agent — not a policy enforcement file. Tool availability is controlled by config, not this file.

```markdown
# Tools

## Custom CLIs installed on this host
- `imsg` — send iMessage via CLI; use this instead of the built-in `message` tool 
  for Mac-originated texts
- `sag` — search across my Synapse notes; try this before web search for anything 
  work-related
- `wthr` — quick weather lookup, don't bother with web fetch for this

## Conventions
- When running shell commands, use `rg` not `grep`, `fd` not `find`
- For PDF extraction prefer `pdftotext -layout` over `pdftotext`
- Python 3.12 at `~/.pyenv/shims/python3`
```

### `HEARTBEAT.md` — what to do when you wake up on a timer

Only matters when `heartbeat.every` is set to a nonzero interval. **Keep it tiny** — heartbeats burn full agent turns, and short files = fewer tokens spent reminding the agent of its own schedule.

```markdown
# Heartbeat

Run every 30 min. Do this checklist:

1. Check `memory/today.md` for anything I promised to follow up on
2. If there's a pending task from me marked `[ ]`, do it now
3. If there's nothing actionable, reply `HEARTBEAT_OK` and stop

Do NOT proactively send messages unless memory explicitly tells you to.
Do NOT infer tasks from old chats.
Keep replies under 2 sentences.
```

If you're not using heartbeats, leave this file minimal or empty. OpenClaw skips heartbeats when the file has only headers/blank lines.

**Default recommendation:** start with `heartbeat.every: "0m"`. Only enable heartbeats once the agent has been running smoothly for a week and you've proven out what it should check.

### `MEMORY.md` — long-term facts, preferences, decisions

Don't write this yourself at bootstrap. Let it grow naturally as the agent learns about you. But DO seed it with 3-5 durable facts so the agent has something to work with:

```markdown
# Memory

## About Gene (durable)
- Lives in Hendersonville, TN
- Partner: Tori. Kids live with us.
- Works at CPI Card Group as DevOps Engineer (transitioned from eCard Systems)
- Target role: Solutions Architect, not management

## Technical environment
- Homelab: Synology DS1817+ NAS running Docker
- Primary lang preferences: PowerShell → Python → Bash → TypeScript

## Communication preferences
- Prefers terse replies
- Will ask follow-ups when needed
- Skips pleasantries
```

Keep this under 5 KB. It loads every main session. `memory/YYYY-MM-DD.md` is for daily working memory — that's where accumulated context goes.

### `BOOTSTRAP.md` — delete after first-run ritual

OpenClaw auto-creates this only on brand-new workspaces. It contains the Q&A ritual that builds `IDENTITY.md` / `USER.md` / `SOUL.md`. **Delete the file after the ritual completes.** OpenClaw checks for its absence and will not recreate it.

## Step 4 — Config basics (`~/.openclaw/openclaw.json`)

Start with the bare minimum:

```json5
{
  gateway: {
    mode: "local",
    bind: "loopback",
    auth: { mode: "token", token: "GENERATE_WITH_openclaw_doctor_--generate-gateway-token" }
  },
  agent: {
    workspace: "~/.openclaw/workspace",
    model: "anthropic/claude-opus-4-6",
    thinkingDefault: "high",
    timeoutSeconds: 1800,
    heartbeat: { every: "0m" },
    skipBootstrap: false
  },
  session: {
    dmScope: "main",          // single-user agent; switch to per-channel-peer if multiple senders
    reset: {
      mode: "daily",
      atHour: 4,
      idleMinutes: 10080      // 7 days; sliding idle cap
    },
    resetTriggers: ["/new", "/reset"]
  },
  channels: {
    // channel config goes here; leave empty until you're ready to wire one
  },
  routing: {
    groupChat: {
      mentionPatterns: ["@openclaw", "openclaw"]
    }
  }
}
```

Generate the token:
```bash
openclaw doctor --generate-gateway-token
```

## Step 5 — Model selection

Pick a model with the user's security posture in mind.

- **Tool-enabled agents → top-tier instruction-hardened models only.** Claude Opus 4.6/4.7, GPT-5.2/5.3 Codex, Gemini 3.x Pro. Small/older models get jailbroken easily and should not drive tools on untrusted input.
- **Chat-only personal agent with trusted input** — any decent model is fine; optimize for cost if you want.
- **Cost-sensitive heavy subagent work** — configure `agents.defaults.subagents.model` to a cheaper model and keep the main agent on the better one.

Model ref format: `provider/model-id`. Examples:
- `anthropic/claude-opus-4-6`
- `openai/gpt-5-3-codex`
- `openrouter/anthropic/claude-sonnet-4-6` (OpenRouter-style, 3 segments)
- `ollama/llama3.1:8b`

Config changes require gateway restart.

## Step 6 — Channel binding

Start with ONE channel. Don't wire up 5 messaging apps on day one. Get one working, then expand.

For a dedicated WhatsApp assistant (the canonical OpenClaw setup):

```bash
# Pair WhatsApp
openclaw channels login --channel whatsapp

# Your config snippet:
```
```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "pairing",       // safest default
      allowFrom: ["+15555550123"],  // your number (E.164)
      groups: { "*": { requireMention: true } }
    }
  }
}
```

For WebChat (browser-based, no phone number):
- WebChat is enabled when the Control UI is running; no separate config needed
- For remote use, access via SSH tunnel or Tailscale, never expose `0.0.0.0`

Critical rules across channels:
- Default `dmPolicy` to `"pairing"`. Never `"open"` unless you're intentional about it.
- Always set `allowFrom` for DM-capable channels.
- In groups, always require mention (`requireMention: true`) — keeps the bot quiet unless addressed.
- Use a SEPARATE phone number / account for the agent. Don't link your personal WhatsApp.

## Step 7 — Tool policy

See `references/tool-policy-and-security.md` for the full decision tree. For a first agent, pick one of three postures:

### Posture A — Chat-only (safest)
```json5
{
  tools: {
    profile: "messaging",  // session_status + messaging tools only
    deny: ["group:automation", "group:runtime", "group:fs", "sessions_spawn", "sessions_send"]
  }
}
```

### Posture B — Read-only operator
```json5
{
  tools: {
    allow: ["group:fs", "group:web", "group:memory", "session_status"],
    deny: ["write", "edit", "apply_patch", "exec", "process", "browser", "gateway", "cron"],
    fs: { workspaceOnly: true }
  }
}
```

### Posture C — Full operator (trusted single-user only)
```json5
{
  tools: {
    profile: "full",
    fs: { workspaceOnly: true },
    exec: {
      security: "allowlist",
      ask: "on-miss",
      strictInlineEval: true    // interpreter eval forms still need approval
    }
  }
}
```

## Step 8 — Sandbox decision

Sandboxing runs tool execution inside Docker (or SSH/OpenShell). Costs: small performance hit, more setup. Benefits: real isolation.

- **First agent, single-user, trusted** → sandbox off is fine (`sandbox.mode: "off"`)
- **Agent that reads untrusted input** (emails, web pages, multi-sender channels) → sandbox on (`mode: "non-main"` minimum)
- **Agent for family/team/anyone besides you** → sandbox on (`mode: "all"`), `workspaceAccess: "none"`

Sandbox setup:
```bash
scripts/sandbox-setup.sh      # bundled image (minimal)
# or
scripts/sandbox-common-setup.sh   # adds curl, jq, node, python3, git
```

Then:
```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        scope: "session",
        workspaceAccess: "rw"   // mounted at /workspace; non-sandboxed tools still reach agent workspace
      }
    }
  }
}
```

## Step 9 — Run the first-run ritual

```bash
openclaw gateway
```

Message the agent from your chosen channel. OpenClaw runs through `BOOTSTRAP.md` Q&A, populating the identity/user/soul files. Review the generated files — edit them to taste. Delete `BOOTSTRAP.md` when done.

## Step 10 — Smoke test the agent

Send these messages in order:

1. `/status` — confirms agent is reachable, shows session info
2. `/context list` — check what's injected (workspace files, skills, tools)
3. `hello` — basic turn, check voice matches SOUL.md
4. `what do you know about me?` — check USER.md / MEMORY.md injection
5. `what tools do you have?` — confirms tool policy is what you expect
6. `/tools verbose` — cross-check with the agent's own view
7. `remember that I prefer tabs over spaces` — write to memory
8. `/new` — reset session
9. `what do I prefer for indentation?` — check memory persisted across reset

If step 9 fails, something's wrong with memory — check the `memory-core` plugin is enabled via `openclaw plugins list`.

## Step 11 — Lock it down

```bash
# Audit everything
openclaw security audit --deep

# Permissions
chmod 700 ~/.openclaw
chmod 600 ~/.openclaw/openclaw.json

# Log hygiene
# Edit config:
# logging: { redactSensitive: "tools", level: "info" }

# Commit workspace changes to your private git remote
cd ~/.openclaw/workspace && git add . && git commit -m "Bootstrap complete" && git push
```

## Step 12 — Iterate

You're live. Now the real work:
- Watch behavior for a week. Note mismatches between intent and output.
- Refine SOUL.md when voice feels off.
- Refine AGENTS.md when procedure is wrong.
- Add skills for narrow repeatable workflows (see `references/authoring-skills.md`).
- Add standing orders when you find yourself asking the agent to do the same thing on a schedule (see `references/automation-and-hooks.md`).

Do NOT add five skills and three plugins in the first week. Build, observe, adjust. One skill at a time. Every addition is context cost and attack surface.

### One-week refinement checklist

After the agent has been live for roughly a week, walk through these four buckets explicitly. This is the point where most of the real tuning happens — raw-new agents always need it.

1. **Voice and behavior**
   - Read a handful of transcripts. If the tone is off, adjust SOUL.md (voice, boundaries, opinions).
   - If the procedure is inconsistent — wrong tool chosen, steps skipped, verification skipped — adjust AGENTS.md (execution discipline, memory conventions, tool preferences).
   - Keep changes small and keep them in git so you can diff the effect.

2. **Memory hygiene**
   - Prune outdated or trivial facts from MEMORY.md; keep it small (target <5 KB).
   - Move "today's context" and transient tasks into `memory/YYYY-MM-DD.md`.
   - Only consider enabling Dreaming or a Memory Wiki backend if you have a concrete need (scale, external notes, structured knowledge provenance).

3. **Capabilities & tools**
   - Note manual workflows you catch yourself repeating inside the agent.
   - Before building anything new, check `plugin-ecosystem.md` and ClawHub for something that already exists.
   - If you install community code, run `openclaw security audit --deep` and follow `security-audit.md` before enabling its tools.

4. **Automation**
   - Only after the agent is trusted: consider enabling a *narrow* heartbeat (one or two checklist items in HEARTBEAT.md) instead of a broad periodic job.
   - Consider adding a single standing order or cron job for a truly repetitive task. One at a time. Observe before adding the next.

## Common day-one mistakes

1. **Biography-stuffed SOUL.md** — SOUL is voice, not backstory. Backstory goes in IDENTITY or memory.
2. **Mixing AGENTS and SOUL** — procedural rules in SOUL or vibes in AGENTS. Keep them separate.
3. **Enabling heartbeats on day 1** — burns tokens before you know what the agent should do proactively.
4. **Skipping pairing on WhatsApp** — any stranger with your number becomes a tool user.
5. **Using your daily-driver phone number** — every DM you get becomes agent input.
6. **Turning on `commands.config: true`** — lets anyone with command access edit your config from chat. Keep off unless you really need remote config edits.
7. **Forgetting to git the workspace** — losing it means starting identity, memory, and personality from zero.

## See also

- `SKILL.md` — the plan-mode contract and cross-cutting principles this workflow enacts
- `references/plan-mode.md` — variants (full / abbreviated / quick-answer) and the approval gate
- `references/requirements-elicitation.md` — the seven-dimension discovery that precedes design
- `references/build-tracks.md` — A/B/C track selection after pre-flight
- `references/system-architecture.md` — the five architecture shapes you pick among
