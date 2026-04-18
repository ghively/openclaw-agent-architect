# Tool Posture Wizard

Answer four yes/no questions. The answers point you at a build track and a starting config. Don't skip ahead.

Pair with: SKILL.md "Build tracks" section, `references/tool-policy-and-security.md`, `assets/worksheets/sandbox-choice.md`.

---

## The four questions

Answer each YES / NO. Don't hedge — a maybe is a yes.

1. **Does the agent need to WRITE files** (workspace, dotfiles, anywhere on the host)?
2. **Will the agent receive DMs or messages from strangers** (people you haven't individually paired)?
3. **Does the agent need to RUN SHELL COMMANDS** (`git`, `ssh`, `kubectl`, `docker`, scripts)?
4. **Does the agent need a BROWSER** (navigate arbitrary pages, scrape, log into a site)?

---

## Result table

Find the row matching your four answers:

| Writes? | Strangers? | Shell? | Browser? | Recommendation | Starting config |
|---------|------------|--------|----------|----------------|-----------------|
| No | No | No | No | **Track A minimal** — read-only assistant | `profile: "messaging"`, `deny: ["exec", "process", "write", "edit", "apply_patch", "browser"]` |
| No | Yes | No | No | **Track A multi-user** — inbox assistant / triager | Add `sandbox.mode: "all"`, `workspaceAccess: "none"` |
| No | No | No | Yes | **Track A + browser** — research helper | Enable `browser` tool only; keep `deny: ["exec", "process", "write"]` |
| No | Yes | No | Yes | **Track A + browser, hardened** | `sandbox.mode: "all"`, scope session, browser enabled |
| Yes | No | No | No | **Track A-write** — scoped document drafter | `profile: "messaging"` + `write`/`edit` enabled, `fs.workspaceOnly: true`, `dmPolicy: "pairing"` |
| Yes | No | Yes | No | **Track B** — homelab operator (most common) | Full operator, three-layer `exec-approvals`, `strictInlineEval: true`, `autoAllowSkills: false` |
| Yes | No | Yes | Yes | **Track B + browser** — research → execute | Track B baseline, browser sandboxed, audit browser sessions weekly |
| Yes | Yes | Any | Any | **Track C (multi-agent)** — split it | Front-of-house Track A takes strangers, back-of-house Track B does the writing/shell. Never let one agent do both. |

---

## Why the split matters

**Untrusted inbound + exec on the same agent** is the single highest-risk shape in OpenClaw. A prompt injection from a DM becomes a `rm -rf` if the same agent holds both doors open.

Track A and Track B are a *security boundary*, not a stylistic choice. If the final row of the table is your situation, don't try to squeeze it into a single agent with clever rules — stand up two agents (Track C), route inbound to the Track A front, and have it hand structured requests to the Track B back via an internal queue. See `references/multi-agent-routing.md`.

---

## Starting config pointer

Once you have a track:

- **Track A** → copy the `inbox-assistant` block from `assets/templates/openclaw.json.example`.
- **Track B** → copy the `homelab-operator` block.
- **Track C** → copy both, then use the `bindings` array to route channels to the right front-of-house.

Every starting config needs:

- [ ] `command-logger` hook enabled
- [ ] `sandbox.mode` matching `assets/worksheets/sandbox-choice.md`
- [ ] `exec-approvals.json` in three layers if Track B
- [ ] A DESIGN-LOG.md §6 entry documenting every dangerous flag you turned on

Then run `openclaw security audit --deep` and fix every critical finding before going live.

---

## Common "wait, my situation doesn't fit" cases

- **"I want exec but only for safe commands."** → Track B with `exec.security: "allowlist"` + `ask: "on-miss"` + `askFallback: "deny"`. That IS the safe-exec shape.
- **"I want the agent to read my calendar and nothing else."** → Track A, enable only the calendar tool, `deny` everything else explicitly.
- **"I want untrusted inbound but the agent needs to remember users."** → Fine — Track A can have memory. The constraint is exec + writes, not memory.
- **"I'm the only one messaging, but through a public Telegram bot."** → Public bot ≠ only you. Set `dmPolicy: "pairing"` so strangers can't DM. Then you're single-user, Track B eligible.

---

## See also

- `references/tool-policy-and-security.md` — what each denied tool actually does
- `references/multi-agent-routing.md` — Track C shapes
- `assets/worksheets/sandbox-choice.md` — picking sandbox mode/scope after the track
- `assets/audit-checklists/pre-install.md` — before adding any community tool to this posture
