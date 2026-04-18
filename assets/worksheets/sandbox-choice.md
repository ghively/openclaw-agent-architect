# Sandbox Choice

Three knobs, read together: `sandbox.mode`, `sandbox.scope`, `fs.workspaceAccess`. Get them right and untrusted content can't touch your host. Get them wrong and a prompt injection reads `~/.ssh/id_rsa`.

Pair with: `references/tool-policy-and-security.md` (threat model), `assets/templates/openclaw.json.example` (complete config example).

---

## The three knobs

| Knob | Values | What it decides |
|------|--------|-----------------|
| `sandbox.mode` | `off` / `non-main` / `all` | Is exec inside a container, on the host, or a mix? |
| `sandbox.scope` | `agent` / `session` / `shared` | Are containers reused across sessions/agents, or fresh? |
| `fs.workspaceAccess` | `none` / `ro` / `rw` | Can the sandbox see the workspace at all? |

---

## Two questions, in this order

### Q1. Does this agent accept **untrusted inbound**?

Untrusted inbound = DMs from strangers, public channels, inbound webhook from anywhere you don't own, a calendar feed someone else controls, a mailbox anyone can mail.

- **Yes** → `sandbox.mode: "all"`. Every exec runs sandboxed. No exceptions.
- **No, trusted-only** (pairing-gated DMs from you, internal cron only, private channel with known roster) → `sandbox.mode: "non-main"` or `"off"` both live here; pick using Q2.

### Q2. Does the agent **need to write** to the workspace or host?

- **Workspace-only writes** (files inside `~/.openclaw/workspace/`, nothing outside) → `sandbox.mode: "non-main"` + `fs.workspaceAccess: "rw"`. Main agent runs on host; exec'd subprocesses run sandboxed.
- **Host writes** (touching dotfiles, editing system config, pulling into `/etc/`) → `sandbox.mode: "off"` + explicit `fs.workspaceOnly: true` for the main agent. This is the Track B operator shape. Pair with three-layer exec-approvals.
- **Read-only / no filesystem writes** (Track A inbox assistant) → `sandbox.mode: "non-main"` + `fs.workspaceAccess: "ro"` (or `"none"` if the agent truly never reads workspace files).

---

## Flowchart

```
┌─ Untrusted inbound?
│   ├─ YES → sandbox.mode: "all"       (every exec sandboxed)
│   │        scope: "session"          (fresh per session; no reuse)
│   │        workspaceAccess: "none" or "ro"
│   │        This is Track A territory.
│   │
│   └─ NO (trusted-only) → sandbox.mode: depends on writes
│       ├─ No writes       → "non-main" + workspaceAccess: "ro" or "none"
│       ├─ Workspace only  → "non-main" + workspaceAccess: "rw"
│       └─ Host writes     → "off" + fs.workspaceOnly: true
│                            Track B. Three-layer exec-approvals mandatory.
```

---

## Scope choice

Once `mode` is set, pick scope:

| Scope | When to use | Cost |
|-------|-------------|------|
| `agent` | Agent runs the same kind of task repeatedly; container reuse across sessions is fine. | Cheapest; longest-lived state drift. |
| `session` | Each user conversation gets a fresh container. | Slightly more spin-up cost; cleaner. **Default for untrusted inbound.** |
| `shared` | Multiple agents in the same gateway share a sandbox. | Only use if you've proved the agents don't interfere. Rare. |

Rule of thumb: if `mode: "all"`, default `scope: "session"`.

---

## Workspace access — granular

`fs.workspaceAccess` applies to whatever runs inside the sandbox:

- **`none`** — sandboxed exec sees an empty filesystem for the workspace path. Use for pure computation (running a script with inline inputs, calling an API).
- **`ro`** — sandboxed exec can read workspace files but cannot write. Use for code review, document summarization, read-only analysis.
- **`rw`** — sandboxed exec can read and write workspace files. Use when the agent genuinely produces artifacts (code generation, document drafting).

The **main agent** filesystem scope is governed by `fs.workspaceOnly`, a separate setting. `fs.workspaceOnly: true` confines the main agent to the workspace root. This is orthogonal to `sandbox.mode` — you want both, usually.

---

## Dangerous combinations — avoid

- `sandbox.mode: "off"` + untrusted inbound → **never**. A single prompt injection reads your home directory.
- `sandbox.mode: "off"` + `fs.workspaceOnly: false` → **never** without a one-paragraph DESIGN-LOG §6 justification.
- `sandbox.mode: "all"` + `workspaceAccess: "rw"` without `scope: "session"` → state carries across invocations; a malicious file planted in one session is visible to the next.
- Any agent with `dmPolicy: "open"` and `sandbox.mode: "off"` → inbound is effectively the internet with shell access.

---

## Verification

After config change:

```
openclaw security audit --deep
```

Anything under `sandbox` or `fs` flagged as critical blocks the change. Roll back, justify in `DESIGN-LOG.md` §6, re-audit.

---

## See also

- `references/tool-policy-and-security.md` — threat model and precedence
- `assets/templates/openclaw.json.example` — Track A + Track B shapes in one file
- `assets/worksheets/tool-posture-wizard.md` — which track am I building?
