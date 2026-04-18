# Build Tracks — Deep Reference

Every OpenClaw agent fits into one of three tracks. The choice is early — made right after pre-flight (dimensions 1–2 of requirements elicitation: job and authority) — and it drives almost everything downstream: tool posture, sandbox defaults, whether `exec-approvals.json` is generated, which references you lean on, and what kind of security review the agent needs.

Pair with: SKILL.md "Build tracks" section (brief overview), `references/tool-policy-and-security.md` (the profiles each track starts from), `assets/worksheets/tool-posture-wizard.md` (a four-question chooser), `assets/templates/openclaw.json.example` (Track A + Track B shapes in one file).

---

## Pre-flight — what you must know before picking

You don't need all seven requirements dimensions to pick a track. You need enough to answer:

1. **What is this agent supposed to produce?** (the job)
2. **What is it allowed to do?** (the authority)

That's it. Everything else — channel, model, automation, memory — refines components and policy *within* the chosen track. Pick the track first; fill in the rest afterwards.

If you can't answer those two questions, you aren't ready to pick. Go back to requirements elicitation.

---

## Track A — Chat / read-only agent

### When to pick

- **Authority:** chat-only or read-only. Never mutates external state.
- **Workloads:** inbox assistant, researcher, report or draft generator, knowledge agent, meeting summarizer, triager, customer-support-style helper, anything that responds but doesn't act.
- **Typical users:** multiple (family, team, or public) OR a single user where all you want is clean read-heavy help.

### Shape

- Tool policy starts from the `messaging` profile (chat-only) or posture B (read-only) from `references/tool-policy-and-security.md`.
- Deny list: `exec`, `process`, `write`, `edit`, `apply_patch`, `browser`, `cron`, `gateway`. Turn on specifically what you need (e.g., `browser` for a research agent).
- Sandbox: `mode: off` for trusted-only input; `mode: all` or `non-main` with `workspaceAccess: ro` when inputs include untrusted web/email/group content.
- No `exec-approvals.json` needed — no exec to approve.
- No SSH, no Ansible, no fleet management patterns. If those start coming up, you've crossed into Track B.

### Security posture

Track A's defense is *absence*. The agent can't do damaging things because its tools deny the damaging classes. Your job:

- Audit the deny list. Every `allow` is a doorway that must be justified.
- Audit inbound. `dmPolicy: "pairing"` for private bots; careful review before `dmPolicy: "open"`.
- If untrusted content flows in (web pages, scraped content, forwarded emails, group messages), `sandbox.mode: "all"`.
- Watch for prompt-injection content stealing back a dangerous tool via suggestion. Even without exec, a write or edit tool can be weaponized.

### What "graduating" looks like

You started Track A and now you want shell access? That's not a tweak — that's re-architecture.

- If it's a single-user trusted agent and the need is real, **migrate to Track B** (see `references/operating-live-agents.md` migration patterns).
- If the agent accepts untrusted inbound, **never** give it exec. Split to Track C instead: a Track A front-of-house + a Track B back-of-house that only receives structured requests from its trusted sibling.

---

## Track B — Full operator on a trusted host

### When to pick

- **Authority:** full operator for a **single trusted user**.
- **Workloads:** homelab operator, personal coding companion with shell, fleet manager, NOC-style agent, anything that needs to *execute* and *write*.
- **Typical users:** you, alone. Pairing-gated DMs only. Public channels disqualify.

### Shape

- Tool policy: posture C (full operator) with conservative hardening.
- Required flags on `tools.exec`:
  - `security: "allowlist"`
  - `ask: "on-miss"`
  - `askFallback: "deny"`
  - `strictInlineEval: true`
  - `autoAllowSkills: false`
- `fs.workspaceOnly: true` where feasible.
- **`exec-approvals.json` is required** and built in three layers:
  1. Layer 1 — safe introspection (read-only commands auto-allowed).
  2. Layer 2 — scoped ops (allowed within specific scopes — e.g., `git` inside the workspace).
  3. Layer 3 — always-ask (every mutating operation prompts).
- `tools.elevated.enabled: false` by default. Enabling it is a break-glass decision that belongs only on trusted DMs, never on agents exposed to groups or untrusted inbound.
- Sandbox: `mode: off` is acceptable for trusted-only input. Prefer `mode: non-main` or `mode: all` with `workspaceAccess: none/ro` when the agent processes untrusted content.

### Security posture

Track B's defense is *layered approval*. The agent can do damaging things — you've decided that's ok for this role — but every damaging thing passes through a review gate.

Your job:

- Three-layer `exec-approvals.json` with explicit justification for every Layer-1 entry.
- Quarterly re-audit (`assets/audit-checklists/quarterly-reaudit.md`) — Layer-3 auto-allows that crept in via `--add`, stale Layer-1 entries.
- Log everything. `command-logger` hook is non-optional for Track B.
- Never cross-pollinate inbound. If anything untrusted ever touches this agent, you've broken the invariant. Track B assumes trusted-only inbound.

### What "graduating" looks like

Adding a second user to Track B is not adding a user — it's creating a new kind of threat. Options:

- If the second user is equally trusted (spouse, team member), add them as a paired peer. Same track, two peers.
- If the second user's trust is different, **you need Track C**. Front-of-house Track A takes their messages, transforms them into structured requests, hands off to Track B. Never let an untrusted user's raw input reach a Track B agent.

---

## Track C — Multi-agent system

### When to pick

The approved architecture includes more than one agent. Five patterns that fit here (from `references/system-architecture.md`):

- **Peer agents** — each user gets their own, side-by-side.
- **Main + subagents** — a primary agent spawns helpers for scoped tasks.
- **Hub-and-spoke** — a coordinator routes to specialists.
- **Pipeline** — input flows through a chain of transformations.
- **Event-driven** — agents listen to a queue, act on matching events.

### Shape — Track C is a SHAPE, not a single-agent config

Each agent in a Track C system **picks Track A or Track B internally**.

Routing and bindings are designed via `references/multi-agent-routing.md`. Every agent gets its own workspace, tool policy, and sandbox posture. `openclaw.json` `bindings[]` routes channels/peers/roles to the right agent.

### Security posture

Track C's defense is *compartmentalization*. The front-of-house accepts untrusted input; the back-of-house holds dangerous capability. They communicate through a narrow, structured channel.

Your job:

- Define the front-to-back contract explicitly. Back-of-house should NOT accept freeform input from its sibling — it should accept only a structured request schema validated at the boundary.
- Use `subagent_spawning` or a custom hook to enforce schema at the transition.
- Separate workspaces. Separate memory. Separate exec-approvals. Do NOT share configuration across agents in the same system; the point is per-role authority.
- Audit routing with `openclaw bindings list` after every change. Misrouting is the #1 Track C failure mode.

### Common mistakes

- **Copy-pasting one agent's tool policy to all of them.** Defeats the purpose of multi-agent.
- **Front-of-house forwards raw user input verbatim.** Back-of-house receives untrusted content. Injection attack surface is now the same as a single-agent Track B — but with more code.
- **One workspace shared across agents.** Each agent's writes contaminate the others' memory. Separate workspaces.

---

## The commitment rule

> The track choice drives later decisions. If Track A is chosen, do not generate `exec-approvals.json`, do not mention SSH/Ansible patterns, do not design Track-B hardening flags. If Track B, require the three-layer exec allowlist before build is complete. If Track C, do a track selection per agent before any per-agent file is drafted.

**Record the track in the plan summary explicitly.** "Track B — homelab operator, single trusted user, pairing-gated Telegram." One line. That line is the contract for every later decision.

---

## Decision shortcut — when Track B *feels* right but probably isn't

People new to OpenClaw default-pick Track B. "I want the agent to do things." Before you commit:

- Is the "thing" shell-level, or is it a tool call to an existing API? (API → Track A with the right tool enabled.)
- Is there any untrusted inbound? (Yes → Track A front, Track B back. Track C.)
- Are you the only user? (No → Track A, or Track C.)
- Does the agent actually need to *write*, or does it just need to *read and report*? (Report-only → Track A.)

If after those four questions Track B is still the answer, it's the right answer. If any of them pushes back, Track B is the wrong starting point.

---

## See also

- SKILL.md "Build tracks" — the concise normative version
- `references/tool-policy-and-security.md` — the profiles and hardening flags behind each track
- `references/multi-agent-routing.md` — Track C bindings and routing
- `references/system-architecture.md` — the five shapes that imply Track C
- `assets/worksheets/tool-posture-wizard.md` — four questions that pick your track
- `assets/templates/openclaw.json.example` — annotated Track A + Track B shapes
