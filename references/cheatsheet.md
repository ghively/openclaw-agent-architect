# OpenClaw Cheatsheet

Flat reference. No narrative. Use for fast lookup.

## Critical paths

| Thing | Path |
|-------|------|
| Config file | `~/.openclaw/openclaw.json` |
| State dir root | `~/.openclaw/` |
| Workspace (default) | `~/.openclaw/workspace/` |
| Workspace (profile) | `~/.openclaw/workspace-<profile>/` (via `OPENCLAW_PROFILE`) |
| Agent state dir | `~/.openclaw/agents/<agentId>/agent/` |
| Agent sessions | `~/.openclaw/agents/<agentId>/sessions/` |
| Auth profiles (per agent) | `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` |
| Channel credentials | `~/.openclaw/credentials/` |
| Managed skills | `~/.openclaw/skills/` |
| Managed hooks | `~/.openclaw/hooks/` |
| Installed plugins | `~/.openclaw/plugins/` |
| Managed plugin registry | `~/.openclaw/plugin-registry.json` |
| Exec approvals | `~/.openclaw/exec-approvals.json` |
| Cron jobs | `~/.openclaw/cron/jobs.json` |
| Command log (when enabled) | `~/.openclaw/logs/commands.log` |
| Gateway log | `/tmp/openclaw/openclaw-YYYY-MM-DD.log` |
| ClawHub lockfile | `<workspace>/.clawhub/lock.json` |

## Workspace file roles

| File | Injected? | Purpose |
|------|-----------|---------|
| `AGENTS.md` | Every turn (DM + subagent) | Operating rules, standing orders |
| `SOUL.md` | Every turn (DM only) | Voice, persona, tone |
| `USER.md` | Every turn (DM only) | Who the user is |
| `IDENTITY.md` | Every turn (DM only) | Agent's name, emoji |
| `TOOLS.md` | Every turn (DM + subagent) | Tool conventions |
| `HEARTBEAT.md` | On heartbeat only | What to do on timer wake |
| `BOOTSTRAP.md` | First run only (delete after) | First-run Q&A |
| `MEMORY.md` | Every DM session start | Durable facts (keep ≤5KB) |
| `memory/YYYY-MM-DD.md` | On-demand via `memory_search`/`memory_get` | Daily working memory |
| `DREAMS.md` | On-demand (Dreaming plugin output) | Consolidation notes |
| `skills/<n>/SKILL.md` | Description in skill list; body on-demand | Custom skills |
| `BOOT.md` | On gateway startup (via `boot-md` hook) | Startup script |

Key injection caps:
- `bootstrapMaxChars: 20000` per file
- `bootstrapTotalMaxChars: 150000` total

## Skill precedence (highest wins)

1. `<workspace>/skills/<n>/`
2. `<workspace>/.agents/skills/<n>/`
3. `~/.agents/skills/<n>/`
4. `~/.openclaw/skills/<n>/`
5. Bundled (`<openclaw>/dist/skills/bundled/`)
6. `skills.load.extraDirs`

## Hook precedence (highest wins, same name)

1. Workspace `<workspace>/hooks/` (NEW names only; cannot override bundled/plugin)
2. Managed `~/.openclaw/hooks/` (can override bundled + plugin)
3. `hooks.internal.load.extraDirs` (same precedence as managed)
4. Plugin-bundled hooks
5. Bundled hooks

## Session key shapes

| Key pattern | Meaning |
|-------------|---------|
| `agent:<agentId>:main` | Agent's main DM session |
| `agent:<agentId>:<channel>:direct:<peerId>` | Per-peer DM (when `dmScope: "per-channel-peer"`) |
| `agent:<agentId>:<channel>:group:<groupId>` | Group chat session |
| `agent:<agentId>:subagent:<uuid>` | Subagent spawned from this agent |
| `agent:<agentId>:subagent:<uuid>:subagent:<uuid>` | Depth-2 subagent (orchestrator pattern) |
| `agent:<agentId>:discord:slash:<userId>` | Discord native slash command session |
| `agent:<agentId>:slack:slash:<userId>` | Slack native slash command session |
| `telegram:slash:<userId>` | Telegram native slash command (targets chat session) |
| `cron:<jobId>` | Isolated cron job session |
| `hook:<uuid>` | Webhook-triggered session |

## Essential CLI commands

### Status / diagnosis
```bash
openclaw status                      # overall
openclaw gateway status              # gateway only
openclaw doctor                      # detailed health check
openclaw doctor --fix                # auto-fix what can be
openclaw doctor --generate-gateway-token  # generate a gateway auth token
openclaw logs --follow               # tail logs
```

### Agent management
```bash
openclaw agents add <id>             # create agent
openclaw agents list                 # list all
openclaw agents list --bindings      # with routing rules
openclaw agents set-default <id>     # which agent is the default
```

### Channels
```bash
openclaw channels login --channel whatsapp
openclaw channels login --channel whatsapp --account biz
openclaw channels list
openclaw channels status --probe
```

### Skills
```bash
openclaw skills list
openclaw skills list --verbose        # show eligibility reasons
openclaw skills list --json
openclaw skills install <slug>        # ClawHub
openclaw skills info <n>
```

### Plugins
```bash
openclaw plugins list
openclaw plugins install <spec>       # npm name OR clawhub:<n> OR local path
openclaw plugins install -l <path>    # linked for local dev
openclaw plugins uninstall <id>
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

### Hooks
```bash
openclaw hooks list                   # all discovered
openclaw hooks list --verbose         # with eligibility info
openclaw hooks list --eligible        # only eligible
openclaw hooks list --json
openclaw hooks info <n>
openclaw hooks check                  # eligibility summary
openclaw hooks enable <n>
openclaw hooks disable <n>
```

### Cron
```bash
openclaw cron list
openclaw cron add --name X --cron "0 9 * * *" --session isolated --message "..."
openclaw cron add --name X --at "20m" --session main --system-event "..." --wake now
openclaw cron edit <id> --message "..."
openclaw cron run <id>                # force now
openclaw cron run <id> --due          # only if actually due
openclaw cron runs --id <id> --limit 20  # history
openclaw cron remove <id>
openclaw cron status
```

### Security / sandbox
```bash
openclaw security audit                   # default (warnings + critical)
openclaw security audit --deep            # thorough
openclaw security audit --json            # machine-readable
openclaw security audit --fix             # auto-fix what can be
openclaw sandbox list
openclaw sandbox explain                  # why is X blocked?
openclaw sandbox recreate                 # rebuild sandbox
```

### Exec approvals
```bash
openclaw approvals list                   # all allowlists across agents/nodes
openclaw approvals allowlist add --agent main --pattern "~/bin/my-tool"
openclaw approvals allowlist remove --agent main --pattern "~/bin/my-tool"
openclaw approvals set-defaults --security allowlist --ask on-miss
```

### Memory
```bash
openclaw memory status                    # index + embedding provider status
openclaw memory search "query"            # from CLI
openclaw memory index --force             # rebuild index
openclaw memory rem-backfill --path ./memory --stage-short-term
openclaw memory rem-backfill --rollback
```

### MCP servers (external tool sources)
```bash
openclaw mcp list                         # all configured MCP servers
openclaw mcp show <n>                  # config for one
openclaw mcp show <n> --json
openclaw mcp set <n> '{"command":"uvx","args":["pkg-mcp"]}'     # stdio
openclaw mcp set <n> '{"url":"https://mcp.example.com"}'        # remote
openclaw mcp unset <n>
openclaw mcp serve                        # expose OpenClaw AS an MCP server
openclaw mcp serve --url wss://host:18789 --token-file ~/.openclaw/gateway.token
openclaw mcp serve --claude-channel-mode off
```

### Webhooks / Gmail
```bash
openclaw webhooks gmail setup --account you@gmail.com
openclaw webhooks list
```

### ClawHub
```bash
clawhub search "query"
clawhub install <slug>
clawhub install <slug> --version 1.2.0
clawhub update <slug>
clawhub update --all
clawhub list                              # installed skills (reads .clawhub/lock.json)
clawhub publish ./my-skill --slug ... --version 1.0.0 --tags latest
clawhub sync --all                        # scan + publish everything
clawhub whoami
```

## Common in-chat commands (slash)

### Identity / status
```
/status              # session status
/tools verbose       # what tools this agent can use right now
/context list        # what's injected
/context detail      # per-file sizes
/whoami              # your sender id
/export-session      # save session as HTML
```

### Session control
```
/new [model]         # reset session (optional model hint)
/reset               # same as /new
/stop                # abort running agent
/compact [instr]     # force compaction
```

### Mode directives (persist in directive-only messages)
```
/model <n>           # switch model
/think high          # thinking level: off|minimal|low|medium|high|xhigh
/fast on             # turbo/priority mode
/verbose full        # debugging verbosity
/elevated on         # break-glass bypass (authorized only)
/exec security=allowlist ask=on-miss     # exec policy
/usage tokens        # per-response footer: off|tokens|full|cost
```

### Skills / memory
```
/skill <n> [input]   # run skill by name
/btw <question>      # ephemeral side question (no history)
```

### Subagents / threads
```
/subagents list
/subagents spawn <agentId> <task>
/subagents kill <id|#|all>
/subagents log <id|#>
/focus <target>      # thread binding (Discord)
/unfocus
/agents              # list active bound sessions
```

### Admin (owner-only, must be enabled)
```
/config set path=value    # requires commands.config: true
/mcp set <n>={"..."}   # requires commands.mcp: true
/plugins install <spec>   # requires commands.plugins: true
/debug set path=value     # requires commands.debug: true (memory only)
```

### Approvals
```
/approve <id> allow-once
/approve <id> allow-always
/approve <id> deny
```

### Heartbeat / cron side
```
HEARTBEAT_OK         # agent's magic reply to suppress delivery
NO_REPLY / no_reply  # cron isolated silent token
```

## Config blocks — quick copy-paste

### Gateway + agent basics

```json5
{
  gateway: {
    mode: "local",
    bind: "loopback",
    auth: { mode: "token", token: "GENERATED_TOKEN" }
  },
  agent: {
    workspace: "~/.openclaw/workspace",
    model: "anthropic/claude-opus-4-6",
    thinkingDefault: "high",
    timeoutSeconds: 1800,
    heartbeat: { every: "0m" }
  },
  session: {
    dmScope: "main",
    reset: { mode: "daily", atHour: 4, idleMinutes: 10080 }
  }
}
```

### Tool policy — chat-only

```json5
{
  tools: {
    profile: "messaging",
    deny: ["group:automation", "group:runtime", "group:fs", "sessions_spawn"]
  }
}
```

### Tool policy — full operator with hardening

```json5
{
  tools: {
    profile: "full",
    fs: { workspaceOnly: true },
    exec: {
      security: "allowlist",
      ask: "on-miss",
      strictInlineEval: true,
      autoAllowSkills: false
    }
  }
}
```

### Sandbox — typical hardening

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        scope: "session",
        workspaceAccess: "rw",
        docker: {
          image: "openclaw-sandbox-common:bookworm-slim",
          network: "bridge"
        }
      }
    }
  }
}
```

### Multi-agent with binding

```json5
{
  agents: {
    list: [
      { id: "main", default: true, workspace: "~/.openclaw/workspace" },
      { id: "family", workspace: "~/.openclaw/workspace-family" }
    ]
  },
  bindings: [
    {
      agentId: "family",
      match: { channel: "whatsapp", peer: { kind: "group", id: "...@g.us" } }
    }
  ]
}
```

### WhatsApp channel basics

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "pairing",
      allowFrom: ["+15555550123"],
      groups: { "*": { requireMention: true } }
    }
  }
}
```

### Hook-enable + command-logger

```json5
{
  hooks: {
    internal: {
      enabled: true,
      entries: {
        "command-logger": { enabled: true },
        "session-memory": { enabled: true }
      }
    }
  }
}
```

### Webhook endpoints

```json5
{
  hooks: {
    enabled: true,
    token: "DEDICATED_WEBHOOK_TOKEN",
    path: "/hooks",
    defaultSessionKey: "main",
    allowedAgentIds: ["main"],
    allowRequestSessionKey: false
  }
}
```

### MCP servers — config shape

```json5
{
  "mcp": {
    "servers": {
      // stdio — local subprocess
      "context7": {
        "command": "uvx",
        "args": ["context7-mcp"]
      },
      // stdio with env
      "github": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"],
        "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..." }
      },
      // remote SSE (default when `url` given)
      "docs": {
        "url": "https://mcp.example.com",
        "headers": { "Authorization": "Bearer <token>" },
        "connectionTimeoutMs": 10000
      },
      // remote streamable-http (explicit opt-in)
      "stream-tools": {
        "url": "https://mcp.example.com/stream",
        "transport": "streamable-http",
        "headers": { "Authorization": "Bearer <token>" }
      }
    }
  }
}
```

## Environment variables

| Variable | Effect |
|----------|--------|
| `OPENCLAW_CONFIG_PATH` | Override config location |
| `OPENCLAW_STATE_DIR` | Override state dir root |
| `OPENCLAW_PROFILE` | Switch between profile-scoped workspaces |
| `OPENCLAW_SKIP_BOOTSTRAP=1` | Skip workspace bootstrap file injection |
| `OPENCLAW_SKIP_CRON=1` | Disable cron entirely |
| `OPENCLAW_SKIP_GMAIL_WATCHER=1` | Disable Gmail PubSub watcher |
| `OPENCLAW_GATEWAY_PASSWORD` | Gateway auth (env-sourced alternative to config token) |
| `OPENCLAW_SANDBOX=1` | Enable sandbox during Docker setup scripts |
| `OPENCLAW_DOCKER_SOCKET` | Override Docker socket location |
| `CLAWHUB_WORKDIR` | Override clawhub CLI default workdir |
| `CLAWHUB_CONFIG_PATH` | Override clawhub CLI config file |
| `CLAWHUB_DISABLE_TELEMETRY=1` | Disable clawhub install-count telemetry |

## Architect's default posture — recommended starting values by track

Copy-paste baseline. Change only with reason recorded in DESIGN-LOG.md. All of these are defended in detail in the relevant reference — this is the quick table.

| Setting | Track A (chat / read-only) | Track B (full operator, trusted) | Track C (multi-agent) | Reference |
|---|---|---|---|---|
| `heartbeat.every` | `"0m"` | `"0m"` | per-agent; `"0m"` default | automation-and-hooks |
| `sandbox.mode` | `off` trusted input; `non-main` or `all` for untrusted | `off` for trusted-only; `non-main` / `all` with `workspaceAccess: ro` for untrusted | per-agent | tool-policy-and-security |
| `sandbox.workspaceAccess` | `ro` if sandbox on | `none` / `ro` under sandbox | per-agent | tool-policy-and-security |
| `fs.workspaceOnly` | n/a (no write) | `true` wherever feasible | per-agent | tool-policy-and-security |
| `tools.exec.security` | `deny` at group level | `"allowlist"` | per-agent | tool-policy-and-security |
| `tools.exec.ask` | n/a | `"on-miss"` | per-agent | tool-policy-and-security |
| `tools.exec.askFallback` | n/a | `"deny"` | per-agent | tool-policy-and-security |
| `tools.exec.strictInlineEval` | n/a | `true` | `true` | tool-policy-and-security |
| `tools.exec.autoAllowSkills` | n/a | `false` | `false` | tool-policy-and-security |
| `tools.elevated.enabled` | `false` | `false` (break-glass only on DM) | `false`; per-agent decision | tool-policy-and-security |
| Memory backend | `memory-core` | `memory-core` | per-agent; `memory-core` default | memory-system |
| Memory Wiki | off | off unless structured-knowledge use case | per-agent; off default | memory-system |
| Dreaming | off | off | off | memory-system |
| `channels.*.dangerouslyAllowNameMatching` | unset | unset | unset | cheatsheet (this file) |
| Model (main) | whatever fits the chat workload | Sonnet default; Opus for destructive ops only | per-agent | — |
| Model (subagents default) | n/a | n/a | Sonnet / Haiku; Opus only per-spawn opt-in | subagent-design |
| Channel audience | owner only unless requirements say otherwise | owner only; DM only | per-agent | requirements-elicitation |
| `exec-approvals.json` | not generated | generated with three-layer structure | per Track B agent | tool-policy-and-security |

When the Architect proposes something off this table, the plan summary should name the setting, the old default, the new value, and one sentence on why.

## Dangerous flags (grep your config for these)

```
gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback
gateway.controlUi.dangerouslyDisableDeviceAuth
browser.ssrfPolicy.dangerouslyAllowPrivateNetwork
channels.*.dangerouslyAllowNameMatching
agents.*.sandbox.docker.dangerouslyAllowReservedContainerTargets
agents.*.sandbox.docker.dangerouslyAllowExternalBindSources
agents.*.sandbox.docker.dangerouslyAllowContainerNamespaceJoin
hooks.*.allowUnsafeExternalContent
hooks.gmail.allowUnsafeExternalContent
tools.exec.applyPatch.workspaceOnly: false
```

Any of these set in an Architect-designed agent must be justified in writing in the architecture summary — what it unlocks, why the cheaper alternative doesn't work, and what the compensating control is. If the justification can't be written in two sentences, the flag shouldn't be on.

For layered exec-approvals patterns (safe introspection / scoped ops / always-ask) and the companion hardening flags (`tools.exec.security: "allowlist"`, `ask: "on-miss"`, `askFallback: "deny"`, `strictInlineEval: true`, `autoAllowSkills: false`), see the "Layered allowlist for full-operator agents" and "Hardening flags" sections of `tool-policy-and-security.md`. The Architect skill uses those as the default Track B posture.

## Audit check IDs worth knowing

Critical:
- `fs.state_dir.perms_world_writable`
- `fs.config.perms_writable`
- `gateway.bind_no_auth`
- `gateway.tailscale_funnel`
- `hooks.token_reuse_gateway_token`
- `security.exposure.open_channels_with_exec`
- `security.exposure.open_groups_with_elevated`

Warning:
- `tools.exec.security_full_configured`
- `tools.exec.auto_allow_skills_enabled`
- `tools.exec.allowlist_interpreter_without_strict_inline_eval`
- `tools.exec.safe_bins_interpreter_unprofiled`
- `logging.redact_off`
- `sandbox.docker_config_mode_off`

## Token cost approximations

| Thing | Tokens (rough) |
|-------|----------------|
| Skill list overhead | 195 chars (~50 tokens) base |
| Per skill in list | 97 chars + name/desc/loc lengths (~30-60 tokens each) |
| System prompt base | 3-5K tokens (depends on profile) |
| Tool schemas | ~100-500 tokens per tool |
| Bootstrap files typical | 3-8K tokens |
| Subagent bootstrap | AGENTS.md + TOOLS.md only (~1-3K tokens) |
| Heartbeat turn (full) | Same as normal turn |
| Cron isolated turn | Similar, unless `--light-context` |

## Install spec formats

```json
{ "id": "brew", "kind": "brew", "formula": "X", "bins": ["X"] }
{ "id": "npm", "kind": "node", "package": "@scope/X", "bins": ["X"] }
{ "id": "uv", "kind": "uv", "package": "X", "bins": ["X"] }
{ "id": "go", "kind": "go", "package": "github.com/org/X", "bins": ["X"] }
{ "id": "dl", "kind": "download", "url": "https://...", "archive": "tar.gz", "targetDir": "~/.openclaw/tools/<skillKey>" }
```

## Plugin SDK imports (always subpath)

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
import { delegateCompactionToRuntime } from "openclaw/plugin-sdk/core";
```

## 27 plugin hooks quick list

Model/prompt: `before_model_resolve`, `before_prompt_build`, `before_agent_start` (legacy), `llm_input`, `llm_output`
Agent lifecycle: `agent_end`, `before_reset`, `before_compaction`, `after_compaction`
Session lifecycle: `session_start`, `session_end`
Message flow: `inbound_claim`, `message_received`, `before_dispatch`, `message_sending`, `message_sent`, `before_message_write` ⚠️ sync
Tool execution: `before_tool_call`, `after_tool_call`, `tool_result_persist` ⚠️ sync
Subagent: `subagent_spawning`, `subagent_delivery_target`, `subagent_spawned`, `subagent_ended`
Gateway: `gateway_start`, `gateway_stop`
Install: `before_install`

Hook decision semantics:
- `before_tool_call: { block: true }` — terminal
- `before_tool_call: { block: false }` — no-op, doesn't clear earlier block
- `block` wins over `requireApproval`
- `tool_result_persist` and `before_message_write` MUST be synchronous

## Memory backends

| Backend | Use case |
|---------|----------|
| `memory-core` (default) | SQLite; keyword + vector + hybrid |
| `memory-lancedb` | LanceDB; auto-recall/capture |
| `memory-qmd` | Local-first, reranking, multi-collection (Obsidian etc.) |
| `memory-honcho` | AI-native cross-session, user modeling |
| `memory-wiki` (plugin) | Structured knowledge with provenance; runs ALONGSIDE |

## Useful one-liners

```bash
# Biggest workspace files (find bloat)
du -h ~/.openclaw/workspace/*.md ~/.openclaw/workspace/memory/*.md 2>/dev/null | sort -h | tail

# Count skills
openclaw skills list --json | jq '. | length'

# Find which sessions use a specific tool call recently
grep -lr "\"name\":\"exec\"" ~/.openclaw/agents/main/sessions/ | head

# Unresolved approvals
jq '.agents[] | .allowlist[]' ~/.openclaw/exec-approvals.json

# Config delta from defaults
openclaw status --json | jq '.config'

# Verify bootstrap file sizes
for f in AGENTS.md SOUL.md USER.md IDENTITY.md TOOLS.md MEMORY.md HEARTBEAT.md; do
  wc -c ~/.openclaw/workspace/$f 2>/dev/null | awk '{printf "%8d %s\n", $1, $2}'
done
```

## Essential docs URLs (when you need fresh detail)

- Root: https://docs.openclaw.ai
- Agent workspace: https://docs.openclaw.ai/concepts/agent-workspace
- Agent runtime + loop: https://docs.openclaw.ai/concepts/agent-loop
- System prompt structure: https://docs.openclaw.ai/concepts/system-prompt
- Skills: https://docs.openclaw.ai/tools/skills
- Creating skills: https://docs.openclaw.ai/tools/creating-skills
- Plugins: https://docs.openclaw.ai/tools/plugin
- Building plugins: https://docs.openclaw.ai/plugins/building-plugins
- Hooks: https://docs.openclaw.ai/automation/hooks
- Cron: https://docs.openclaw.ai/automation/cron-jobs
- Standing Orders: https://docs.openclaw.ai/automation/standing-orders
- Sandbox: https://docs.openclaw.ai/gateway/sandboxing
- Exec approvals: https://docs.openclaw.ai/tools/exec-approvals
- Security: https://docs.openclaw.ai/gateway/security
- ClawHub: https://docs.openclaw.ai/tools/clawhub
- Slash commands: https://docs.openclaw.ai/tools/slash-commands
- Multi-agent: https://docs.openclaw.ai/concepts/multi-agent
- Memory overview: https://docs.openclaw.ai/concepts/memory-overview
- Configuration reference: https://docs.openclaw.ai/gateway/configuration-reference

## See also

- `SKILL.md` — topic router mapping intents to references
- `references/failure-modes.md` — paired diagnostic pointers when a symptom surfaces
- `references/tool-policy-and-security.md` — the full posture profiles behind the cheatsheet snippets
- `references/research-discipline.md` — fetch docs.openclaw.ai rather than guessing flags
