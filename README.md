# openclaw-agent-architect

A Claude skill for designing, building, tweaking, auditing, and operating OpenClaw agents end-to-end.

## What this is

This is a [Claude skill](https://docs.claude.com/en/docs/build-with-claude/agent-sdk/skills) — a folder of procedural guidance and reference material that loads progressively into Claude's context when the skill is triggered.

It's designed for users working on self-hosted AI assistants built on OpenClaw: SOUL.md personality files, AGENTS.md operating rules, workspace bootstrap, memory systems, skill and plugin authoring, tool policy, multi-agent routing, sandbox and exec approvals, heartbeats, standing orders, and security auditing of third-party skills and plugins from ClawHub or npm.

## Structure

```
SKILL.md                     entry point — workflow, build tracks, topic router
references/                  detailed guidance loaded on-demand
├── requirements-elicitation.md   the seven discovery dimensions
├── system-architecture.md        five system patterns, when each fits
├── agent-design-workflow.md      plan-mode / build-mode contract
├── bootstrap-files.md            SOUL / AGENTS / MEMORY / HEARTBEAT authoring
├── soul-writing.md               personality file conventions
├── agents-md-patterns.md         the six mandatory sections
├── memory-system.md              backends, decision trees
├── automation-and-hooks.md       cron > hooks > standing orders > heartbeats, cost table
├── subagent-design.md            when and how, token shapes
├── tool-policy-and-security.md   sandbox modes, exec-approvals layering
├── tool-creation.md              custom tools, plugin tools, MCP
├── authoring-skills.md           how to write skills for OpenClaw agents
├── authoring-plugins.md          packaging and distribution
├── plugin-ecosystem.md           ClawHub, npm, integrity
├── security-audit.md             how to audit third-party code
├── multi-agent-routing.md        peer / hub+spoke / pipeline patterns
├── tweaking-existing-agents.md   six-bucket triage for live-agent issues
├── operating-live-agents.md      observability, diagnostics, migrations
├── when-to-build-what.md         triage for what a user actually needs
└── cheatsheet.md                 starting postures by track, dangerous flags
assets/
├── audit-checklists/             security-audit worksheets
└── templates/
    └── DESIGN-LOG.md             blank template + full worked Cortex example
```

## How to use

Drop the skill folder (or the packaged `.skill` artifact) into a Claude environment that supports skills — Claude Code, Cowork, or an Agent SDK project. Claude will load `SKILL.md` when a user request matches the skill's description, then selectively read references based on where the work is in the workflow.

Typical session shape:

1. Requirements elicitation (dimensions 1–2 are enough to pick a build track)
2. Plan mode — architecture shape, components, security posture, questions back to user
3. Approval gate
4. Build mode — write SOUL / AGENTS / workspace files, memory, exec-approvals, skills, plugins as scoped
5. Hand-off or iterate

## License

MIT — see LICENSE.

## Author

Gene Hively — <genehively@gmail.com>
