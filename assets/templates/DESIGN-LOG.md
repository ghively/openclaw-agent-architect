# DESIGN-LOG.md — <agent or system name>

> This file is a durable record of how this agent was designed. It is NOT injected into the agent's bootstrap. It lives in the workspace as the audit trail and the memory for the human owner — why Pattern 1 not 2, why Sonnet not Opus, why no heartbeat, why Layer-2 exec-approvals include these entries and not those. Keep it close to the agent and update it on material changes.

---

## 1. Provenance

- **Created:** YYYY-MM-DD by <owner>
- **Architect skill version used:** <version / commit / "live iteration ${date}">
- **Conversation reference:** <link to chat transcript if the plan was designed in-conversation, or paste a summary here>
- **First deploy:** YYYY-MM-DD
- **Last material change:** YYYY-MM-DD — <short note>

## 2. Requirements summary

Distilled from the 7-dimension elicitation pass (see `references/requirements-elicitation.md`).

| Dim | Answer | Notes / "why" |
|-----|--------|----------------|
| 1. Job | <one-sentence job description> | What specifically are we automating? |
| 2. Authority | chat-only / read-only / full operator / multi-user | Maps directly to Track A/B/C. |
| 3. Channels | Telegram DM / Slack #team-ops / web / etc. | Any channel with untrusted input demands sandboxing — call it out here. |
| 4. Capabilities | <list of workloads: research / shell / email / cron reports / ...> | |
| 5. Audience | only-owner / household / colleagues / public | Gates who can send inbound. |
| 6. Cost ceiling | e.g. "under $30/mo in inference" or "no ceiling" | Drives model choice and heartbeat/cron cadence. |
| 7. Hard constraints | e.g. "no community plugins", "Opus for destructive ops only", "no heartbeats" | The non-negotiables. |

## 3. Threat model

Captured before shape decisions, per SKILL.md workflow step 3.

- **Who can send inbound:** <answer>
- **Untrusted input sources:** <web content the agent fetches, email it processes, MCP servers it queries, group channels it reads>
- **Worst-case impact tolerated:** <disruption / data leak / config change / hardware damage>
- **Derived posture implications:** e.g. "Track B is required because the agent runs `systemctl`; sandbox mode: non-main because the agent reads web content from RSS"

## 4. Chosen shape

- **Pattern:** <1 / 2 / 3 / 4 / 5> — see `references/system-architecture.md`
- **Build track per agent:** <A / B / C>
- **Rejected alternatives:**
  - <pattern X> — rejected because <specific reason>
  - <pattern Y> — rejected because <specific reason>
- **Growth path:** <if the workload grows in direction D, the next migration is to shape S; see `references/operating-live-agents.md` Part 3>

## 5. Component inventory

Keep this aligned with the 12-dimension review in `references/system-architecture.md`.

| Dim | Dimension | Choice | Rationale |
|-----|-----------|--------|-----------|
| 1 | Skills | <list or "none beyond bundled"> | |
| 2 | Tools (built-in / extended) | <list> | |
| 3 | Plugins | <list or "none"> | |
| 4 | MCP servers | <list or "none"> | |
| 5 | Automation (cron / webhook / heartbeat / standing orders) | <list> | Cite Cost Reference Table numbers if cadence was a decision. |
| 6 | Subagents | <list or "none at launch"> | |
| 7 | Hooks | <list or "none beyond bundled"> | |
| 8 | Memory architecture | <backend + file layout> | |
| 9 | Tool policy & security | <track, posture, layer-2 entries for Track B> | |
| 10 | Channels and surfaces | <channels + bindings> | |
| 11 | Workspace & deployment | <path, git, deploy trigger> | |
| 12 | Testing and iteration | <smoke tests, security audit, eval plan> | |

## 6. Security baseline

For Track B / C only. Track A agents can condense or skip.

- **Three-layer `exec-approvals.json` entries:**
  - Layer 1 (safe introspection, auto-allow): <enumerate>
  - Layer 2 (scoped read/write, auto-allow within scope): <enumerate>
  - Layer 3 (always-ask): <enumerate anything explicitly excluded>
- **Hardening flags set:**
  - `tools.exec.security: "allowlist"` — <reason>
  - `tools.exec.ask: "on-miss"` — <reason>
  - `tools.exec.askFallback: "deny"` — <reason>
  - `tools.exec.strictInlineEval: true` — <reason>
  - `tools.exec.autoAllowSkills: false` — <reason>
  - `fs.workspaceOnly: true` — <reason or "not set because ...">
- **Sandbox posture:** `sandbox.mode: <off / non-main / all>`, `workspaceAccess: <none / ro / rw>` — <reason>
- **Elevated mode:** `tools.elevated.enabled: <true/false>` — <reason; enabling requires a break-glass justification>
- **Any dangerous flag used (see `references/cheatsheet.md`):** <list + 2-sentence written justification per flag, per the cheatsheet rule>

## 7. Decision log (append-only)

The why-we-changed-it history. Every material change to the agent gets a new block here. Never delete old entries — they're the audit trail.

### YYYY-MM-DD — <short label, e.g. "initial design">
- **What changed:** <description>
- **Why:** <reasoning>
- **Principles cited:** <e.g. #12 bootstrap cost, #13 automation priority>
- **Evidence / session references:** <session IDs, metrics, quotes from the user>
- **Rollback plan:** <how to undo if this doesn't work>

### YYYY-MM-DD — <next change>
- ...

## 8. Known-open risks / "next tunings to consider"

Things the plan deliberately punted on. Revisit after a week of observed behavior.

- <risk or tuning idea>
- <risk or tuning idea>

---

# Worked example — "Cortex" homelab-over-Telegram operator (Track B, Pattern 1)

This is a filled-out DESIGN-LOG.md showing what the real artifact looks like for a concrete system. The names and specifics are illustrative; substitute your own.

## 1. Provenance

- **Created:** 2026-04-17 by <owner>
- **Architect skill version used:** openclaw-agent-architect @ iteration-2 (post-gap-analysis)
- **Conversation reference:** eval-0-track-b-telegram-homelab response
- **First deploy:** 2026-04-24 (planned)
- **Last material change:** 2026-04-17 — initial plan

## 2. Requirements summary

| Dim | Answer | Notes / "why" |
|-----|--------|----------------|
| 1. Job | Homelab operator — monitor, diagnose, and operate a single Synology + 2-node Proxmox cluster; be a pair-programming companion for side projects. | Two workloads, one trusted user. |
| 2. Authority | Full operator (shell + config changes on trusted hosts) | Maps to Track B. |
| 3. Channels | Telegram DM only | No groups. Inbound restricted to one Telegram user ID. |
| 4. Capabilities | `systemctl` status + restart on a small service list; `docker ps/logs`; read Ansible facts; Opus-only for destructive ops; cron weekly report | |
| 5. Audience | Owner only — Telegram user ID allowlist enforced at channel level | |
| 6. Cost ceiling | Under $40/mo inference; prefer Sonnet for chat, Opus for approvals-required ops | |
| 7. Hard constraints | No heartbeats; no community plugins without audit; no Ansible playbook execution without explicit per-run approval | |

## 3. Threat model

- **Who can send inbound:** owner only (Telegram user-ID allowlist at channel level + Gateway)
- **Untrusted input sources:** none direct. Agent does read `journalctl` output, which could theoretically contain attacker-controlled strings; mitigated by `strictInlineEval: true`.
- **Worst-case impact tolerated:** single-service restart, single-container restart. Explicit NO to: package installs, kernel changes, storage reconfiguration, user/group changes, firewall rules. Those are Layer 3 (always-ask) at best.
- **Derived posture implications:** Track B with conservative layer-2; `sandbox.mode: off` accepted because inbound is trusted; `workspaceAccess: rw` in the agent's own workspace only.

## 4. Chosen shape

- **Pattern:** 1 (single agent)
- **Build track:** B
- **Rejected alternatives:**
  - Pattern 2 (peer agents) — rejected because the two workloads (homelab + coding companion) have the same user, same trust level, same channel; no benefit to splitting until/unless the agents diverge in tooling.
  - Pattern 3 (main + subagents) — rejected at launch; revisit if the coding-companion task starts hitting context ceilings (e.g., multi-file refactors).
- **Growth path:** if homelab ops grow to multi-site, migrate to Pattern 2 with one operator per site. Plan in `references/operating-live-agents.md` Part 3.

## 5. Component inventory

| Dim | Dimension | Choice | Rationale |
|-----|-----------|--------|-----------|
| 1 | Skills | `homelab-triage` (custom), `commit-message-critic` (custom) | Both narrow; no ClawHub imports at launch. |
| 2 | Tools | `exec`, `edit`, `read`, `grep`, `sessions_spawn` | `sessions_spawn` reserved for future Pattern-3 migration; not used at launch. |
| 3 | Plugins | none | Telegram is bundled; no custom plugin needed. |
| 4 | MCP servers | Synology MCP (official, audited); GitHub MCP (official) | Audited per `references/security-audit.md` pre-install. |
| 5 | Automation | Weekly Sunday 09:00 infrastructure report via cron. No heartbeat. | Weekly cron is deterministic; heartbeat rejected per principle #13 and Cost Reference Table — would cost ~$2.50/day idle for no new capability. |
| 6 | Subagents | none at launch | |
| 7 | Hooks | Gateway bundled only (session-start memory read) | |
| 8 | Memory architecture | memory-core (SQLite) + three-file model. MEMORY.md seeded with 5 durable facts. Daily files. No Dreaming. | Default backend is right for a single agent; Dreaming not justified. |
| 9 | Tool policy & security | Track B; three-layer `exec-approvals.json` detailed in §6. | |
| 10 | Channels and surfaces | Telegram DM only; user-ID allowlist | |
| 11 | Workspace & deployment | `~/.openclaw/cortex/`, git-tracked, deploy via `openclaw agents deploy cortex` | |
| 12 | Testing and iteration | Smoke-test checklist per SKILL.md Evaluation Phase; `openclaw security audit --deep`; exercise each exec layer before first live use | |

## 6. Security baseline

- **Three-layer `exec-approvals.json` entries:**
  - **Layer 1 (safe introspection):** `uname -a`, `uptime`, `df -h`, `free -m`, `systemctl status <service>` for {homeassistant, pihole, jellyfin}, `docker ps`, `docker logs --tail 200 <container>` for known containers, `journalctl --since 10m -u <service>` for the same service allowlist.
  - **Layer 2 (scoped):** `systemctl restart <service>` for the same three services; `docker restart <container>` for enumerated container IDs; `git status` / `git diff` in specific project directories.
  - **Layer 3 (always-ask, effectively never-auto):** package managers (`apt`, `pacman`, `brew`), kernel module operations, firewall changes, `ansible-playbook <anything>`, arbitrary `sudo <anything>`, any file write outside the agent workspace, any `rm -r` anywhere.
- **Hardening flags:** all five set per Track B defaults. `autoAllowSkills: false` because even vetted skills should not auto-approve when they call `exec`; the agent should prompt on a per-exec basis.
- **Sandbox posture:** `sandbox.mode: off`, `workspaceAccess: rw` within the Cortex workspace — reasoned: trusted-only inbound, and the agent needs to edit its own memory files.
- **Elevated:** `false`. Enabling would require a break-glass justification recorded in the decision log.
- **Dangerous flags used:** none.

## 7. Decision log

### 2026-04-17 — initial design
- **What changed:** initial plan approved.
- **Why:** workloads fit Pattern 1; authority fits Track B; threat model is benign (trusted-only inbound, enumerated mutations only).
- **Principles cited:** #1 plan mode; #11 SOUL vs AGENTS separation; #12 bootstrap cost (kept AGENTS+SOUL+USER+TOOLS under 4 KB); #13 automation priority (no heartbeat; weekly cron only); #16 verify before drafting.
- **Evidence / session references:** architect-skill eval-0 response + notes.
- **Rollback plan:** keep old workspace tarball on NAS for 30 days; revert by disabling the Telegram binding.

## 8. Known-open risks / next tunings

- MEMORY.md is seeded with 5 facts; expect growth. Revisit in one week.
- The three-service layer-1 allowlist may be too narrow; log `exec --denied` after week 1 to see if the owner is over-hitting `askFallback`.
- Consider adding `commit-message-critic` skill only after 2 weeks of actual coding-companion use to confirm the capability is load-bearing, not speculative.
- If Opus weekly-report cost exceeds 20% of budget, consider downgrading the cron report to Sonnet.
