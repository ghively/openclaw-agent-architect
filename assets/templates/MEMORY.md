# Memory
<!--
MEMORY.md — durable facts only. Injected at session start on every DM.

Rules:
  - Keep under ~5 KB. It TRUNCATES past `memoryMaxChars` (see cheatsheet).
  - Facts only, not procedure (→ AGENTS.md) and not voice (→ SOUL.md).
  - Volatile context (today's plans, in-flight work) → memory/YYYY-MM-DD.md instead.
  - When adding an entry, add a one-line "why this is durable" note — future-you will wonder.

Seed with 3–5 entries. Let the agent grow it during use. Prune quarterly.
Delete and recreate if it ever feels stale.
-->

## Who I am

- **Name:** <USER_NAME>
- **Location / timezone:** <CITY, TZ>
- **Role:** <ONE-LINE ROLE>

## Durable preferences

- **Communication style:** <"terse, opinionated" or "always explain reasoning" — pick one; agent follows>
- **Decision latitude:** <"propose and act" / "propose and wait for approval" / "ask before anything mutating">

## Long-term context

- **Primary project / focus right now:** <one sentence>

<!--
That's the minimum viable seed. Add more entries as they surface — but only if they're
genuinely durable (months+). If it might change within a week, it belongs in a daily file.

Good additions:
- Hardware the agent cares about ("homelab: 1x Synology DS1821+, 2-node Proxmox")
- Family/team members the agent might reference ("spouse: Jane; kids: Alex (10), Sam (7)")
- External accounts / identities ("GitHub: @myhandle; work email: me@corp.example")

Bad additions (these belong elsewhere):
- "Working on feature X" (→ daily file)
- "Don't use emojis" (→ SOUL.md)
- "Always run tests before committing" (→ AGENTS.md)
- "Current Jira ticket: PROJ-1234" (→ daily file)
-->
