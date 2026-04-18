# Tool Policy, Sandbox, and Exec Approvals

Tool policy is the hardest security layer in OpenClaw — system prompt safety guidance is advisory, but `tools.allow`/`deny`, sandbox mode, and exec approvals are enforced in code. Design these intentionally. Getting them wrong is how prompt injection becomes actual damage.

This reference is the decision tree for: what tool policy, which sandbox, which exec approval posture, for which agent.

## How to work through this with the user

**Plan mode applies.** Do not draft config blocks for `tools.*`, `agents.defaults.sandbox.*`, or `~/.openclaw/exec-approvals.json` until the plan is approved. See the Plan-Mode Contract in the main SKILL.md.

**Pace:** 10-20 minutes for straightforward agents; 30+ minutes when the threat model is complex (multi-user, untrusted inbound, regulated environment).

**Sequence:** Assess trust model (single trusted user / shared / untrusted) → pick posture (A chat-only / B read-only / C full operator) → decide sandbox mode/scope/workspace access → decide exec approval policy (security + ask + strictInlineEval) → enumerate any dangerous-flag needs and justify each → present plan → get approval → draft config.

**Don't:**
- Propose posture C (full operator) for anything but a trusted single-user personal agent
- Enable `autoAllowSkills: true` without understanding the implication (implicit trust of every skill's bins)
- Add interpreters to `safeBins` — ever
- Set `strictInlineEval: false` unless the user explicitly accepts the `python -c` auto-approve risk
- **Draft config blocks before the plan is approved**

**Do:**
- Walk through the 3-enforcement-layer model (policy → sandbox → approvals) explicitly
- Justify every `dangerously*` flag in writing if any are needed
- Recommend running `openclaw security audit --deep` after build, before first real use
- Surface the specific audit-check IDs the agent's config would trip, so the user knows why

## The three enforcement layers

Think of these as concentric rings. An agent action has to pass all three:

```
┌─────────────────────────────────────────────────┐
│  1. Tool policy (allow/deny, profile)           │
│     ┌─────────────────────────────────────┐     │
│     │  2. Sandbox (Docker, SSH, OpenShell) │     │
│     │     ┌───────────────────────────┐    │     │
│     │     │  3. Exec approvals         │   │     │
│     │     │  (allowlist + ask policy) │   │     │
│     │     └───────────────────────────┘    │     │
│     └─────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
```

- **Tool policy** decides if the tool can be called at all
- **Sandbox** decides where it runs (host vs container)
- **Exec approvals** decides if a given command is allowed within exec

All three can be bypassed or tightened. Choose the ring set that matches your trust model.

## The mental model: `Sandbox vs Tool Policy vs Elevated`

From the docs — this is the single most important distinction:

- **Tool policy** = "can the agent call this tool?" (can it see it in its tool list?)
- **Sandbox** = "where does the tool run?" (host process vs isolated container)
- **Elevated mode** = "is this a break-glass bypass?" (runs exec on host even when sandbox is on)

They stack. Denying a tool in policy means sandbox and approvals never come into play — the tool isn't available. Sandboxing a tool means even successful calls can't break out of the container. Exec approvals run WHEN `exec` is called on a host target (`gateway` or `node`), inside or outside sandbox.

## Tool policy basics

Configure under `tools.*` in `~/.openclaw/openclaw.json`.

### Profile — the base allowlist

`tools.profile` sets the base set before `allow`/`deny` apply.

| Profile | Tools included |
|---------|----------------|
| `full` | No restriction (unset = same as full) |
| `coding` | `group:fs`, `group:runtime`, `group:web`, `group:sessions`, `group:memory`, `cron`, `image`, `image_generate`, `music_generate`, `video_generate` |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status` |
| `minimal` | `session_status` only |

### Allow / deny

```json5
{
  tools: {
    profile: "coding",
    allow: ["browser", "cron"],          // added to profile
    deny: ["exec", "sessions_spawn"]     // removed regardless
  }
}
```

**Rule:** deny always wins over allow.

### Groups (shorthand)

| Group | Tools |
|-------|-------|
| `group:runtime` | exec, process, code_execution (`bash` is alias for exec) |
| `group:fs` | read, write, edit, apply_patch |
| `group:sessions` | sessions_list, sessions_history, sessions_send, sessions_spawn, sessions_yield, subagents, session_status |
| `group:memory` | memory_search, memory_get |
| `group:web` | web_search, x_search, web_fetch |
| `group:ui` | browser, canvas |
| `group:automation` | cron, gateway |
| `group:messaging` | message |
| `group:nodes` | nodes |
| `group:agents` | agents_list |
| `group:media` | image, image_generate, music_generate, video_generate, tts |
| `group:openclaw` | ALL built-in tools (excludes plugin tools) |

### Per-provider restrictions

Useful when a specific model shouldn't have full access:
```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" }
    }
  }
}
```

### Per-agent overrides

When you run multi-agent, each agent can have its own policy:
```json5
{
  agents: {
    list: [
      {
        id: "public-chat",
        tools: { profile: "messaging", deny: ["sessions_spawn"] }
      },
      {
        id: "personal",
        tools: { profile: "full" }
      }
    ]
  }
}
```

## Three postures for a new agent

### Posture A — Chat-only (recommended default for new agents)

Safest. Agent can read its own session, check status, send messages. No exec, no fs, no browser, no subagent spawn.

```json5
{
  tools: {
    profile: "messaging",
    deny: [
      "group:automation",    // no cron, gateway
      "group:runtime",        // no exec, process
      "group:fs",             // no read, write, edit, apply_patch
      "sessions_spawn",
      "sessions_send"
    ]
  }
}
```

What the agent can still do:
- Reply to you in chat
- Look up its own session history via `sessions_history`
- Check session status
- Use memory tools (inherit from default profile... actually no — `messaging` excludes memory by default; add `group:memory` if you want memory search)

When to graduate: once you've used the agent for a few weeks and have a clear picture of what extra tools it needs. Add one at a time.

### Posture B — Read-only operator

The agent can read the filesystem, search the web, query memory, but can't change anything.

```json5
{
  tools: {
    allow: [
      "read",
      "group:web",
      "group:memory",
      "group:sessions",      // session tools (read-only view)
      "session_status"
    ],
    deny: [
      "write", "edit", "apply_patch",
      "exec", "process",
      "browser",              // browser can take actions (form fill, clicks)
      "gateway", "cron"
    ],
    fs: { workspaceOnly: true }
  }
}
```

Good for:
- Research agents
- Report generators
- Knowledge lookup

Note: `read` + `web_fetch` is still an exfiltration risk if the agent gets prompt-injected into reading secrets and posting them somewhere. Pair with sandbox `workspaceAccess: "ro"` or `"none"` for hardening.

### Posture C — Full operator (trusted single-user)

Your personal agent. All tools available, with sensible guardrails.

```json5
{
  tools: {
    profile: "full",
    fs: {
      workspaceOnly: true,       // tools stay inside the agent workspace unless explicitly not
      // (watch out: setting false exposes the whole host fs)
    },
    exec: {
      security: "allowlist",      // see exec approvals section below
      ask: "on-miss",
      strictInlineEval: true,     // python -c / node -e / etc. always need approval
    },
    elevated: {
      enabled: false,             // don't enable unless you know what elevated means
    }
  }
}
```

This is the "trusting operator" configuration. Suitable ONLY when you're the sole user.

## Sandbox decision

Sandbox runs tool execution in a Docker (or SSH, or OpenShell) container. The gateway stays on the host; the tools run isolated.

### Modes

- `off` — no sandboxing (everything runs on host)
- `non-main` — sandbox non-main sessions; main stays on host (useful when you want chat to feel native but subagents/ad-hoc work isolated)
- `all` — every session sandboxed

**Important:** `non-main` is based on `session.mainKey` (default `"main"`). Group/channel sessions use their own keys, so they count as non-main and WILL be sandboxed when mode is `non-main`.

### Scope

- `agent` (default) — one container per agent
- `session` — one container per session (strictest, cleanest)
- `shared` — one container shared across sandboxed sessions (cross-agent exposure; not recommended except for single-user)

### Workspace access

- `none` (default) — sandbox sees a sandbox workspace under `~/.openclaw/sandboxes/`, NOT your actual agent workspace
- `ro` — agent workspace mounted read-only at `/agent`; `write`/`edit`/`apply_patch` disabled
- `rw` — agent workspace mounted read-write at `/workspace`

### Decision table

| Scenario | Sandbox mode | Scope | Workspace access |
|----------|--------------|-------|------------------|
| Solo, trusted input, known-good skills | `off` | — | — |
| Solo, reads web/email/docs (untrusted content) | `non-main` | `session` | `rw` or `ro` |
| Family / team / shared agent | `all` | `agent` | `none` or `ro` |
| Adversarial / testing / evaluation of new skills | `all` | `session` | `none` |
| "I run `untrusted-community-skill.something`" | `all` | `session` | `none` + `deny` most tools |

### Setup

Build the default image once:
```bash
# Minimal bundled image
scripts/sandbox-setup.sh

# Or common image with curl, jq, nodejs, python3, git preloaded
scripts/sandbox-common-setup.sh
# Then:
# agents.defaults.sandbox.docker.image: "openclaw-sandbox-common:bookworm-slim"
```

Minimal enable:
```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        scope: "session",
        workspaceAccess: "none"
      }
    }
  }
}
```

### Network defaults in sandbox

By default, Docker sandbox containers run with NO network (`network: "none"`). That's a big deal:
- `curl`, `wget`, `web_fetch` won't work inside sandbox
- Package installs during `setupCommand` will fail
- Most "fetch X and process it" workflows break

When you need network:
```json5
{
  agents: {
    defaults: {
      sandbox: {
        docker: {
          network: "bridge",    // default Docker bridge
          // or:
          // network: "<custom-network-name>"
        }
      }
    }
  }
}
```

Blocked by design (don't try):
- `network: "host"` — bypasses container isolation
- `network: "container:<id>"` — namespace join bypass; requires `dangerouslyAllowContainerNamespaceJoin: true`

### Custom bind mounts

```json5
{
  agents: {
    defaults: {
      sandbox: {
        docker: {
          binds: [
            "/Users/gene/Projects/src:/source:ro",
            "/var/data/exports:/data:ro"
          ]
        }
      }
    }
  }
}
```

OpenClaw blocks dangerous bind sources automatically:
- `docker.sock`, `/etc`, `/proc`, `/sys`, `/dev`, parent mounts
- Home-directory credential paths: `~/.aws`, `~/.ssh`, `~/.gnupg`, `~/.npm`, `~/.config`, `~/.docker`, etc.

Sensitive mounts should be `:ro` unless absolutely required.

### Sandbox gotchas

- **`setupCommand` runs ONCE** after container creation. If it fails silently, skill binaries won't exist in sandbox and tools will fail mysteriously
- **Default image is minimal.** No Node, no Python, no curl. Either `setupCommand` adds them (with network enabled) or use `openclaw-sandbox-common`
- **Host `process.env` is NOT inherited.** Use `agents.defaults.sandbox.docker.env` for skill API keys in sandbox
- **Skills with `requires.bins` are host-checked at load time.** Binary must ALSO exist in sandbox for tool calls to succeed. Double-install when sandboxing

### Debugging sandbox policy

```bash
openclaw sandbox explain
# Shows effective mode, tool policy, and fix-it config keys
```

## Exec approvals — the companion app guardrail

Exec approvals are a separate, on-the-host-that-executes layer. They sit between tool policy (which allows `exec` at all) and actual command execution (which may or may not need your approval for each command).

### Location

`~/.openclaw/exec-approvals.json` on the execution host (gateway host OR each node host).

For macOS with the companion app, the app also manages this file and surfaces an approval UI.

### Three policy knobs

**`security` — what's allowed:**
- `deny` — block all host exec requests
- `allowlist` — allow only allowlisted commands
- `full` — allow everything (equivalent to elevated)

**`ask` — when to prompt:**
- `off` — never prompt
- `on-miss` — prompt only when allowlist doesn't match
- `always` — prompt on every command

**`askFallback` — what to do if no UI is reachable:**
- `deny` — block
- `allowlist` — allow only if allowlist matches
- `full` — allow

### Recommended posture for a trusted single-user

```json5
{
  "defaults": {
    "security": "allowlist",
    "ask": "on-miss",
    "askFallback": "deny",
    "autoAllowSkills": false
  },
  "agents": {
    "main": {
      "security": "allowlist",
      "allowlist": [
        { "pattern": "~/Projects/**/bin/rg" },
        { "pattern": "/opt/homebrew/bin/rg" },
        { "pattern": "/usr/local/bin/jq" }
      ]
    }
  }
}
```

This says: for the `main` agent, allow only specific binaries; for anything not on the list, prompt me; if I'm not there to approve, deny.

### Layered allowlist for full-operator agents (Track C)

When an agent is a real operator — provisioning, managing services, running playbooks — a flat allowlist either ends up too permissive (lots of wildcards) or too noisy (approval for every `uptime`). Structure the allowlist in **three layers** so the trust surface is explicit:

**Layer 1 — Safe introspection (auto-allowed).** Read-only commands that cannot change state and are tightly scoped:

- `uname -a`, `uptime`, `df -h`
- `ps aux | head` or similarly constrained process lists
- `journalctl` with bounded flags (`--since` / `--until`, `--lines` capped)
- Read-only Ansible facts, e.g. `ansible -m setup` under `check_mode`

Do not include interpreters (`python3`, `node`, `ruby`, …) or generic network clients (`curl`, `wget`) in this layer. Their inputs are too open-ended to classify as "safe introspection".

**Layer 2 — Scoped read/write operations (tightly allowed).** Commands that can affect state but are safe when the pattern nails them down:

- `systemctl status servicename` for a small, enumerated set of services
- `docker ps`, `docker logs servicename --tail N`
- Specific, read-only Ansible playbooks (e.g. a `gather-facts` playbook) with `check_mode`

Patterns in this layer should be tied to a specific user, a specific path subtree, or a fixed list of services. Broad wildcards that match arbitrary commands belong in Layer 3, not here.

**Layer 3 — Always-ask / never-auto.** Everything that mutates state in a way you'd want to see land:

- Package managers (`apt`, `yum`, `dnf`, `brew`, …)
- Service restarts / reloads
- Generic `ansible-playbook` runs without `--check`
- Any command that writes or deletes files outside a very narrow, explicit path

These never get an entry in the allowlist at all — the miss triggers `ask: on-miss`, and the operator approves each use explicitly.

### Hardening flags — pair with the layered allowlist

The layered allowlist is only as strong as the flags around it. Set all of these together:

- `tools.exec.security: "allowlist"` — no wide-open `full` mode
- `tools.exec.ask: "on-miss"` — Layer 3 commands prompt, they don't silently fail
- `tools.exec.askFallback: "deny"` — if no UI is reachable, deny the miss rather than fall through
- `tools.exec.strictInlineEval: true` — `python -c`, `node -e`, `ruby -e`, etc. are always approval-gated, even if the interpreter binary is in Layer 1 or 2
- `tools.exec.autoAllowSkills: false` — skills can't smuggle binaries into your allowlist by declaring `requires.bins`; you add them by hand

After any material change to Layer 2 or Layer 3, re-run:

```bash
openclaw security audit --deep
```

and actually read the exec-related findings before putting the agent back to work.

### `strictInlineEval` — the critical hardening flag

If you allowlist an interpreter (`python3`, `node`, `ruby`, `perl`, `php`, `lua`, `osascript`), inline eval forms (`python -c "malicious code"`) are normally auto-approved too. That's a massive backdoor.

ALWAYS set:
```json5
{
  tools: {
    exec: { strictInlineEval: true }
  }
}
```

With this on, `python -c`, `node -e`, `ruby -e`, etc. ALWAYS require explicit approval even if the interpreter binary is allowlisted. `allow-always` for those inline forms is also disabled.

### `autoAllowSkills` — convenience vs strictness trade-off

`autoAllowSkills: true` means binaries referenced in `metadata.openclaw.requires.bins` of loaded skills are implicitly allowlisted for exec approval.

Pros: skills "just work" without you approving each binary
Cons: malicious skill can smuggle binaries into the implicit allowlist

**For strict trust**, keep `autoAllowSkills: false` and manually allowlist skill binaries.

### `safeBins` — stdin-only fast path

A narrow list of genuinely-safe stdin filter binaries (cut, uniq, head, tail, tr, wc) that don't need individual approval entries. They have argv restrictions that prevent file operands and path-like tokens.

**NEVER add interpreters or runtime binaries to `safeBins`.** The audit flag `tools.exec.safe_bins_interpreter_unprofiled` catches this.

Do NOT add:
- `python3`, `node`, `ruby`, `bash`, `sh`, `zsh`, `perl`, `php`, `osascript`
- Anything that can evaluate code

DO add (if you actually use them that way):
- `cut`, `uniq`, `head`, `tail`, `tr`, `wc`
- With explicit profile: `grep` (pattern-via-`-e` only, no recursive flags), `sort` (no `-o` output)

### Approval flow in a chat UI

When the agent wants to run a command that needs approval:
1. Tool returns approval ID immediately (doesn't block)
2. Gateway broadcasts `exec.approval.requested` to operator clients
3. Control UI / macOS app / (chat channels if configured) show the prompt
4. You resolve via UI or `/approve <id> <allow-once|allow-always|deny>`
5. Gateway forwards the approved request to the execution host
6. Agent gets the result (or denial)

### Forwarding approvals to chat channels

If you don't always have the Control UI open, forward approvals to where you are:

```json5
{
  approvals: {
    exec: {
      enabled: true,
      mode: "targets",
      targets: [
        { channel: "telegram", to: "123456789" }
      ]
    }
  }
}
```

Telegram gets a button; Discord too. For other channels, you'll see a text prompt and reply with `/approve <id> allow-once` in the same chat.

## Elevated mode — the break-glass bypass

`tools.elevated` is an explicit escape hatch that runs `exec` OUTSIDE the sandbox on the gateway host (or node). Use it VERY sparingly.

```json5
{
  tools: {
    elevated: {
      enabled: false,           // DEFAULT — keep it off unless you have a specific need
      allowFrom: ["+15555550123"], // who can request elevated
      // Per-agent override: agents.list[].tools.elevated
    }
  }
}
```

When someone authorized sends `/elevated on`, subsequent exec calls in that session go through elevated and bypass sandbox and exec approvals. `/elevated off` returns to normal.

This is POWERFUL. Don't enable it for any agent that reads untrusted content. Don't share the allowlist with anyone you don't fully trust.

## The "why is this blocked?" flow

When a tool unexpectedly fails or doesn't appear:

1. Is it in the tool list? `/tools verbose` in chat.
2. If not, check `tools.profile`, `tools.allow`, `tools.deny`, and per-agent `tools.*`
3. If yes, but calls fail — is sandbox configured? Run `openclaw sandbox explain`
4. If sandbox is on and the tool is `exec`, check the sandbox container has the binary
5. If the tool is `exec` and it's prompting for approval you didn't expect — check `tools.exec.security` and approval allowlist
6. If you see "requires approval" but the UI never shows — check your `askFallback` setting; likely deny-by-fallback

## The dangerous-flag watchlist

Grep your entire config for these. If any are `true`, understand exactly why:

```
gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback
gateway.controlUi.dangerouslyDisableDeviceAuth
browser.ssrfPolicy.dangerouslyAllowPrivateNetwork
channels.*.dangerouslyAllowNameMatching
channels.*.accounts.*.dangerouslyAllowNameMatching
agents.*.sandbox.docker.dangerouslyAllowReservedContainerTargets
agents.*.sandbox.docker.dangerouslyAllowExternalBindSources
agents.*.sandbox.docker.dangerouslyAllowContainerNamespaceJoin
hooks.*.allowUnsafeExternalContent
hooks.gmail.allowUnsafeExternalContent
tools.exec.applyPatch.workspaceOnly: false
```

Run the audit to find all of them:
```bash
openclaw security audit --json | jq '.findings[] | select(.checkId == "config.insecure_or_dangerous_flags")'
```

## Per-agent policy examples

### Personal everyday assistant (you + trusted input)
```json5
{
  id: "personal",
  workspace: "~/.openclaw/workspace-personal",
  sandbox: { mode: "off" },
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

### Family / group chat agent
```json5
{
  id: "family",
  workspace: "~/.openclaw/workspace-family",
  sandbox: {
    mode: "all",
    scope: "agent",
    workspaceAccess: "ro"
  },
  tools: {
    allow: ["read", "memory_search", "memory_get", "web_search", "session_status"],
    deny: [
      "exec", "process", "write", "edit", "apply_patch",
      "browser", "canvas", "nodes",
      "cron", "gateway", "sessions_spawn", "sessions_send",
      "image_generate", "music_generate", "video_generate"
    ]
  }
}
```

### Read-only research/audit agent (for evaluating third-party content)
```json5
{
  id: "research",
  workspace: "~/.openclaw/workspace-research",
  sandbox: {
    mode: "all",
    scope: "session",      // each research run is isolated
    workspaceAccess: "none"
  },
  tools: {
    allow: ["web_search", "web_fetch", "memory_search", "memory_get", "read"],
    deny: [
      "exec", "process", "write", "edit", "apply_patch",
      "browser",             // browser is dangerous with untrusted pages
      "gateway", "cron",
      "sessions_spawn", "sessions_send",
      "image_generate", "music_generate", "video_generate"
    ],
    fs: { workspaceOnly: true }
  }
}
```

### Public / untrusted-sender agent (should not exist in personal assistant mode)
OpenClaw's own trust model says: don't put an untrusted-sender agent in a gateway that's meant to be a single-user personal assistant. If you genuinely need this:
- Separate OS user
- Separate gateway process
- Separate workspace + credentials
- Tool profile `minimal` + sandbox `all` + `workspaceAccess: none`
- `dmPolicy: "allowlist"` or `"pairing"` — never `"open"`

## Regular health check

Run this monthly (or whenever you change config):

```bash
openclaw security audit --deep
openclaw security audit --fix    # auto-fixes what can be auto-fixed

# Also:
openclaw doctor
openclaw sandbox explain
openclaw approvals list            # see current exec approval allowlists
```

If the audit surfaces `tools.exec.security_full_configured` and you're a single-user personal assistant, that's usually fine (it's the personal-assistant default posture). If your threat model needs tighter control — tighten.

## See also

- `references/build-tracks.md` — each track picks a default posture from the profiles here
- `references/security-audit.md` — the audit pass that validates the policy in place
- `references/subagent-design.md` — child tool-policy and sandbox scope decisions
- `references/failure-modes.md` — dangerous-flag symptoms and misconfiguration catalog
- `assets/worksheets/tool-posture-wizard.md` — four-question chooser for the right posture
- `assets/worksheets/sandbox-choice.md` — sandbox mode × scope × workspaceAccess decisions
- `assets/templates/openclaw.json.example` — includes the three-layer exec-approvals block inline
