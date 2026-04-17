# Changelog

All notable changes to the `openclaw-agent-architect` skill are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [0.2.0] — 2026-04-17

Gap-closure pass on the v0.1 baseline. All fourteen identified gaps fixed across
four priority tiers (P0 × 4, P1 × 6, P2 × 4). Packaged `.skill` artifact now
included in the repository.

### Added

- `references/operating-live-agents.md` — new reference covering observability
  (four evidence types: session logs, exec audit, automation runs, memory state),
  a six-layer diagnostic loop, migrations between system patterns, a 10-minute
  weekly operating checklist, and criteria for when to re-architect vs tune.
- `assets/templates/DESIGN-LOG.md` — blank template plus a fully worked example
  ("Cortex," a Track-B homelab operator over Telegram) spanning all eight
  sections: provenance, requirements summary, threat model, chosen shape,
  12-dimension component inventory, security baseline, append-only decision log,
  known-open risks.
- **Cost Reference Table** in `references/automation-and-hooks.md` — rough
  order-of-magnitude tokens per invocation and per day for cron, hooks,
  heartbeats (silent-path and active-path at 30m and 5m), and subagent spawns
  (chat-profile and full-operator). Cross-linked from SKILL.md principles 4 and
  15 and from `references/subagent-design.md`.
- **Architect default-posture table** in `references/cheatsheet.md` — 19-row
  table of recommended starting values for Track A / B / C (heartbeat, sandbox,
  workspaceAccess, fs.workspaceOnly, exec-approvals layers, elevated, memory
  backend, Wiki, Dreaming, dangerous-channel flag, models, channel audience,
  exec-approvals.json generation).
- **Memory-system decision trees** in `references/memory-system.md` — five
  trees: when to switch backends off memory-core, when MEMORY.md exceeds 5KB,
  when to enable Dreaming, when to add Memory Wiki, when to swap embedding
  provider.
- **Migrations between shapes** pointer in `references/system-architecture.md`
  directing to the operating-live-agents migrations section.
- **Rationale and micro-examples** for the six AGENTS.md sections in
  `references/agents-md-patterns.md` — each section now explains the failure
  mode it prevents, with minimal "short but present" examples for the thin
  sections (Memory conventions, Tool preferences, Error handling, Output format
  defaults).
- **Concrete token shape for subagent spawns** in `references/subagent-design.md`
  — 60-70% bootstrap inheritance, 5-6K for simple subagents, 15K for 3-step
  E-V-R operators. Cross-linked to the Cost Reference Table.
- **Plan-mode illustration boundary** clarification in SKILL.md — explains that
  naming commands and field names in plan mode is allowed (clarifies a choice)
  but writing filled-in invocations crosses into build mode.
- **First-turn length tension** paragraph in SKILL.md pacing — resolves the
  tension between "go fast" and "elicit thoroughly" via sketching vs delivering.
- **Research-batching guidance** in SKILL.md — "Batch research; don't pause per
  dimension" + "Know what the skill's references already cover vs what's
  version-volatile" to prevent excessive mid-elicitation web fetches.
- **Pre-flight definition** — explicitly identified as dimensions 1 and 2 of
  requirements elicitation; named both in SKILL.md Build tracks intro and in
  `references/requirements-elicitation.md`.
- **Six-bucket triage** list enumerated in SKILL.md topic router Tweaking
  section (persona / procedure / memory / tool-pref / policy / context-bloat).
- **Operating-live-agents** section in SKILL.md topic router, below Tweaking.
- **Plan-mode variants** — renamed "Exceptions to plan mode" to
  "Plan-mode variants — full vs abbreviated vs quick-answer" with three tiers
  explicitly defined.
- **Cross-cutting principle citations** in SKILL.md workflow step 8 (principles
  6, 7, 11, 14) and step 9 (principle 16); subagent workflow now cites the Cost
  Reference Table and principle 7.
- Top-level `README.md`, `CHANGELOG.md`, `LICENSE` for the repository.
- `openclaw-agent-architect.skill` — packaged build artifact is now committed
  alongside source for drop-in use in Cowork / Agent SDK environments.

### Changed

- SKILL.md DESIGN-LOG reference updated to point to
  `assets/templates/DESIGN-LOG.md` (was previously a vague mention).
- `.gitignore` no longer excludes the `.skill` build artifact (now tracked).

### Fixed

- Removed circular dependency where the Tweaking section assumed the reader had
  already read `operating-live-agents.md`, which did not exist.

### Repository structure

- 39 source files tracked (SKILL.md, 20 references, 9 templates, 1 audit
  checklist, README, CHANGELOG, LICENSE, .gitignore) plus the packaged `.skill`
  artifact.
- ~10,800 lines of markdown guidance across SKILL.md, references, and
  templates.

---

## [0.1.0] — 2026-04-16 (baseline, not released)

Initial draft. Plan-mode / build-mode contract, build tracks A / B / C, seven
requirements-elicitation dimensions, five system patterns, four memory
backends, three-layer exec-approvals, security audit workflow, tweaking triage.

Superseded by v0.2 before first commit.
