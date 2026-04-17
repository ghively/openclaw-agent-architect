# Multi-Agent Routing

Multiple agents in one gateway. Separate personalities, separate workspaces, separate auth, separate session stores — but one running process. Useful when:

- You want different personas for different contexts (personal vs family vs work)
- Multiple people share a gateway with isolated conversations
- You want different models for different jobs (Opus for deep work, Sonnet for chat)
- You want per-agent tool policy and sandboxing

OpenClaw routes inbound messages to agents via **bindings**. Bindings are deterministic, most-specific wins.

## How to work through this with the user

**Plan mode applies.** Do not draft agent config, bindings, or channel account config until the plan is approved. See the Plan-Mode Contract in the main SKILL.md.

**Pace:** 15-30 minutes for routing plan, plus the time for each agent's full design (each agent is its own design exercise).

**Sequence:** Validate that multi-agent is actually right (often it's not — see `when-to-build-what.md` and `system-architecture.md`) → enumerate distinct agents and their workspaces → sketch bindings (channel + account + peer/group matchers, precedence) → decide auth sharing / isolation → sketch per-agent config (model, tools, sandbox, skills) → present plan → get approval → build.

**Don't:**
- Propose two agents just because the user mentioned "work vs personal" — check if SOUL.md context-awareness + bindings is enough
- Share `agentDir` between agents — breaks auth and sessions
- Forget that each agent needs its own channel pairing (separate phone numbers, separate bot tokens)
- **Draft config blocks or run `openclaw agents add` before plan approval**

**Do:**
- Draw the binding precedence order explicitly — user needs to understand which agent routes what
- For each agent, confirm: workspace path, model, tool profile, sandbox mode, skills allowlist
- Verify the user has the channel resources (separate WhatsApp numbers, separate Discord bots) for the plan
- Discuss cross-agent memory/auth implications BEFORE building

## When NOT to add a second agent

Don't jump to multi-agent too early. The common case is solved with one well-designed agent. Add a second agent only when:
- You've been using the first for a month and have a clear second job that DOESN'T fit the first's persona
- Multiple people share your gateway and you want isolated context
- Your context window is actually hitting limits and splitting would help

Going multi-agent too early means maintaining N workspaces, N sets of auth, N SOUL/AGENTS/MEMORY files. That's real overhead.

## What "one agent" means

An agent has:
- **Workspace** — its own `AGENTS.md`, `SOUL.md`, `USER.md`, memory files, skills folder
- **State directory (`agentDir`)** — per-agent auth profiles, model registry, local config
- **Session store** — `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

**Do NOT reuse `agentDir` across agents.** It causes auth and session collisions.

Auth is per-agent. Model API keys, OAuth tokens, provider configs — all stored in `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`. Main agent credentials are NOT shared automatically. If you want to share, copy `auth-profiles.json` between agent dirs.

Skills: each agent reads from its own workspace `skills/` plus shared roots (`~/.openclaw/skills`, bundled), filtered by the per-agent allowlist. See `references/authoring-skills.md` for precedence.

## Paths and defaults

| Thing | Default | Override |
|-------|---------|----------|
| Config | `~/.openclaw/openclaw.json` | `OPENCLAW_CONFIG_PATH` |
| State dir | `~/.openclaw` | `OPENCLAW_STATE_DIR` |
| Workspace | `~/.openclaw/workspace` (or `workspace-<profile>` with `OPENCLAW_PROFILE`) | `agents.list[].workspace` |
| Agent dir | `~/.openclaw/agents/<agentId>/agent` | `agents.list[].agentDir` |
| Sessions | `~/.openclaw/agents/<agentId>/sessions/` | — |

Single-agent default:
- `agentId` = `main`
- Sessions keyed as `agent:main:<mainKey>`
- Workspace at `~/.openclaw/workspace`
- State at `~/.openclaw/agents/main/agent`

## Adding an agent

```bash
openclaw agents add coding
```

This creates:
- `~/.openclaw/workspace-coding/` with bootstrap files
- `~/.openclaw/agents/coding/agent/` (agentDir)
- `~/.openclaw/agents/coding/sessions/` (session store)
- Config entry under `agents.list[]`

You can also do it manually:
```json5
{
  agents: {
    list: [
      {
        id: "main",
        default: true,
        workspace: "~/.openclaw/workspace"
      },
      {
        id: "coding",
        workspace: "~/.openclaw/workspace-coding",
        agentDir: "~/.openclaw/agents/coding/agent",
        model: "anthropic/claude-opus-4-6"
      }
    ]
  }
}
```

## Bindings — how inbound picks an agent

Bindings live at `bindings[]` in config. They're deterministic and evaluated most-specific-wins:

```json5
{
  bindings: [
    {
      agentId: "home",
      match: { channel: "whatsapp", accountId: "personal" }
    },
    {
      agentId: "work",
      match: { channel: "whatsapp", accountId: "biz" }
    },
    // Peer override: one specific group routes to work even though it's on personal WhatsApp
    {
      agentId: "work",
      match: {
        channel: "whatsapp",
        accountId: "personal",
        peer: { kind: "group", id: "1203630...@g.us" }
      }
    }
  ]
}
```

### Precedence (strict order)

1. `peer` match (exact DM/group/channel id)
2. `parentPeer` match (thread inheritance)
3. `guildId + roles` (Discord role routing)
4. `guildId` (Discord)
5. `teamId` (Slack)
6. `accountId` for a channel
7. Channel-level match (`accountId: "*"`)
8. Fallback to default agent (`agents.list[].default: true`, else first entry, else `main`)

If multiple bindings match in the same tier, **first in config order wins**. If a binding has multiple fields (e.g., `peer` + `guildId`), ALL must match (AND).

### Account-scope detail

- Binding that omits `accountId` → matches default account only
- Use `accountId: "*"` for channel-wide fallback across all accounts
- Adding the same binding later with explicit `accountId` UPGRADES the existing channel-only binding instead of duplicating

## Common patterns

### One WhatsApp number, multiple people (DM split)

Route each sender to a different agent:

```json5
{
  agents: {
    list: [
      { id: "alex", workspace: "~/.openclaw/workspace-alex" },
      { id: "mia", workspace: "~/.openclaw/workspace-mia" }
    ]
  },
  bindings: [
    {
      agentId: "alex",
      match: { channel: "whatsapp", peer: { kind: "direct", id: "+15551230001" } }
    },
    {
      agentId: "mia",
      match: { channel: "whatsapp", peer: { kind: "direct", id: "+15551230002" } }
    }
  ],
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551230001", "+15551230002"]
    }
  }
}
```

Caveat: direct chats collapse to agent's main session key, so true isolation means one agent per person. DM access control is GLOBAL per WhatsApp account, not per agent.

### Different models per channel

Fast cheap model for WhatsApp chat, premium model for Telegram deep work:

```json5
{
  agents: {
    list: [
      {
        id: "chat",
        workspace: "~/.openclaw/workspace-chat",
        model: "anthropic/claude-sonnet-4-6"
      },
      {
        id: "opus",
        workspace: "~/.openclaw/workspace-opus",
        model: "anthropic/claude-opus-4-6"
      }
    ]
  },
  bindings: [
    { agentId: "chat", match: { channel: "whatsapp" } },
    { agentId: "opus", match: { channel: "telegram" } }
  ]
}
```

### Same channel, route ONE peer to a different agent

Keep WhatsApp on the fast agent normally, but route one specific DM to Opus:

```json5
{
  bindings: [
    // Peer match wins over channel match — put it ABOVE the channel rule
    {
      agentId: "opus",
      match: { channel: "whatsapp", peer: { kind: "direct", id: "+15551234567" } }
    },
    { agentId: "chat", match: { channel: "whatsapp" } }
  ]
}
```

Order matters when both could match. Peer bindings always beat channel-wide rules, but put them first for clarity anyway.

### Family agent bound to a WhatsApp group

```json5
{
  agents: {
    list: [
      {
        id: "family",
        workspace: "~/.openclaw/workspace-family",
        identity: { name: "Family Bot" },
        groupChat: {
          mentionPatterns: ["@family", "@familybot", "@Family Bot"]
        },
        sandbox: { mode: "all", scope: "agent" },
        tools: {
          allow: [
            "read",
            "sessions_list", "sessions_history", "sessions_send",
            "session_status"
          ],
          deny: ["write", "edit", "apply_patch", "exec", "process", "browser", "cron"]
        }
      }
    ]
  },
  bindings: [
    {
      agentId: "family",
      match: {
        channel: "whatsapp",
        peer: { kind: "group", id: "120363999999999999@g.us" }
      }
    }
  ]
}
```

### Multi-account channel (two WhatsApp numbers)

```bash
# Pair each account separately
openclaw channels login --channel whatsapp --account personal
openclaw channels login --channel whatsapp --account biz
```

Config:
```json5
{
  agents: {
    list: [
      { id: "home", workspace: "~/.openclaw/workspace-home" },
      { id: "work", workspace: "~/.openclaw/workspace-work" }
    ]
  },
  bindings: [
    { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
    { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } }
  ],
  channels: {
    whatsapp: {
      accounts: {
        personal: {},  // empty means default credentials location
        biz: {}
      }
    }
  }
}
```

### Discord bots per agent (each bot = one agent)

```json5
{
  agents: {
    list: [
      { id: "main", workspace: "~/.openclaw/workspace-main" },
      { id: "coding", workspace: "~/.openclaw/workspace-coding" }
    ]
  },
  bindings: [
    { agentId: "main", match: { channel: "discord", accountId: "default" } },
    { agentId: "coding", match: { channel: "discord", accountId: "coding" } }
  ],
  channels: {
    discord: {
      groupPolicy: "allowlist",
      accounts: {
        default: {
          token: "DISCORD_BOT_TOKEN_MAIN",
          guilds: {
            "123456789012345678": {
              channels: {
                "222222222222222222": { allow: true, requireMention: false }
              }
            }
          }
        },
        coding: {
          token: "DISCORD_BOT_TOKEN_CODING",
          guilds: {
            "123456789012345678": {
              channels: {
                "333333333333333333": { allow: true, requireMention: false }
              }
            }
          }
        }
      }
    }
  }
}
```

Each bot needs Message Content Intent enabled in Discord's developer portal.

## Per-agent overrides

Each agent can override:
- `workspace` — path to workspace
- `agentDir` — path to state dir
- `model` — primary model
- `thinking` / `fastMode` / `verbose` defaults
- `sandbox.*` — sandbox mode, scope, workspace access, Docker binds
- `tools.*` — profile, allow, deny, per-group settings
- `skills` — allowlist of skills available to this agent
- `groupChat.mentionPatterns` — mention triggers for group contexts
- `heartbeat.*` — per-agent heartbeat config
- `subagents.*` — per-agent subagent settings

Merge semantics:
- Most settings are per-agent only (no merge from defaults except where noted)
- `agents.defaults.*` provides baseline — `agents.list[]` entries can override
- `tools.allow`/`deny` PER-AGENT replace any defaults (no merge)
- `skills` PER-AGENT replaces defaults (no merge)
- `sandbox.docker.binds` MERGE between global and per-agent (unless scope is `"shared"`)

## Verifying routing

```bash
# Agents + their bindings
openclaw agents list --bindings

# Channel status
openclaw channels status --probe

# Which agent did a message route to?
# Check session path: ~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl
```

Session keys tell you:
- `agent:<id>:main` — agent's main DM session
- `agent:<id>:<channel>:direct:<peerId>` — per-peer DM (when `dmScope` is per-channel-peer)
- `agent:<id>:<channel>:group:<groupId>` — group session
- `cron:<jobId>` — isolated cron job session
- `hook:<uuid>` — webhook-triggered session

## Skills in multi-agent setups

Skill location precedence:
1. `<workspace>/skills` — per-agent workspace skills
2. `<workspace>/.agents/skills` — project-level agent skills
3. `~/.agents/skills` — personal agent skills across workspaces
4. `~/.openclaw/skills` — shared (managed) skills visible to all agents
5. Bundled
6. `skills.load.extraDirs`

For a multi-agent setup where some skills are shared and some are per-agent:
- Shared skills → `~/.openclaw/skills/<name>/`
- Agent-specific → `<workspace>/skills/<name>/`

Per-agent allowlists narrow further:
```json5
{
  agents: {
    defaults: {
      skills: ["weather_check", "memory_wiki"]  // baseline everyone gets
    },
    list: [
      { id: "main" },                                     // inherits
      { id: "ops", skills: ["synology_health", "docker_check"] },  // REPLACES
      { id: "locked-down", skills: [] }                   // none
    ]
  }
}
```

## Subagent auth inheritance

Subagents authenticate by agent id:
- Sub-agent session key: `agent:<agentId>:subagent:<uuid>`
- Auth loads from that agent's `agentDir`
- Main agent's auth profiles merged in as FALLBACK (agent profiles override main on conflicts)

Merge is ADDITIVE — main profiles always available as fallbacks. Fully isolated per-agent auth is not currently supported.

## Cross-agent memory search (QMD backend)

If one agent needs to search another agent's transcripts, use the QMD memory backend with `extraCollections`:

```json5
{
  agents: {
    list: [
      {
        id: "main",
        workspace: "~/workspaces/main",
        memorySearch: {
          qmd: {
            extraCollections: [
              { path: "notes" }  // inside agent's workspace
            ]
          }
        }
      },
      { id: "family", workspace: "~/workspaces/family" }
    ],
    defaults: {
      memorySearch: {
        qmd: {
          extraCollections: [
            { path: "~/agents/family/sessions", name: "family-sessions" }
          ]
        }
      }
    }
  },
  memory: {
    backend: "qmd",
    qmd: { includeDefaultMemory: false }
  }
}
```

Use `defaults.memorySearch.qmd.extraCollections` only when every agent should inherit the same shared collections.

## Agent-to-agent messaging

By default, agents cannot send messages to each other. To enable:

```json5
{
  tools: {
    agentToAgent: {
      enabled: true,
      allow: ["home", "work"]   // explicit allowlist
    }
  }
}
```

This is off by default for a reason — it opens a new attack surface where a compromised agent can pivot to another.

## Common patterns to avoid

1. **Too many agents on day one.** Start with one. Add a second when the pain of not having it is real.
2. **Sharing `agentDir` between agents.** Breaks auth, breaks sessions.
3. **Assuming DM isolation when you share a phone number.** WhatsApp account-level allowlist is global; agent split is session-level. True per-peer isolation needs one agent per person.
4. **Over-engineering precedence.** Start with simple channel-level bindings. Add peer-level overrides only when you have a specific reason.
5. **Forgetting to pair each channel account.** `openclaw channels login --channel X --account Y` for each.
6. **Bindings without matching accounts.** A binding with `accountId: "biz"` does nothing if you haven't paired `biz`. Verify with `openclaw channels status`.
