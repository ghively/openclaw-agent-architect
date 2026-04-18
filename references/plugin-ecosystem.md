# Plugin and MCP Ecosystem — Check Before You Build

Before you recommend building a custom plugin, MCP server, or CLI-wrapping skill, check whether something already exists that solves the problem. Building the 47th Jira integration when three well-maintained ones exist is wasted effort.

This reference is a curated catalog of known-good options across the OpenClaw and MCP ecosystems, organized by scenario. Use it as the first stop when a user describes a capability they want — before drafting any custom code.

## CRITICAL: this catalog will age

**Verify current state before recommending anything specific.** This catalog was written in April 2026. Plugins get abandoned, MCP servers get deprecated, new ones appear weekly. Rules:

1. **Before suggesting a specific plugin from ClawHub:** run `clawhub search <topic>` or check https://clawhub.ai — the list below may be stale
2. **Before suggesting a specific MCP server:** check https://github.com/modelcontextprotocol/servers AND the specific server's repo for active maintenance (last commit date, issue responsiveness)
3. **For any recommendation older than 6 months without confirmation:** say "This was current as of my knowledge — let me verify it's still maintained" and use `web_fetch`

If the user asks about a specific service this catalog doesn't list, SEARCH don't guess. `web_search` for `<service> MCP server` is usually productive.

## The three tiers of trust

### Tier 1 — Official OpenClaw plugins (shipped by the OpenClaw team)

Published under `@openclaw/plugin-*`. These have been through OpenClaw maintainers' review. Still pin versions and read release notes, but baseline trust is higher than community code.

### Tier 2 — Bundled features in OpenClaw core

Already inside the main OpenClaw install; no separate installation needed, just `openclaw plugins enable <n>`. Zero distribution trust concerns (you trust OpenClaw's own bundle).

### Tier 3 — Community from ClawHub or npm

Third-party code. Audit required per `references/security-audit.md`. No exceptions — even plugins with thousands of installs can hide malicious updates. The rule: **never install community plugins without reading the source first.**

### Tier 4 — Public MCP servers

Separate category — not OpenClaw plugins. You connect to them via `mcp.servers` config. Trust varies:
- **Vendor-official** (GitHub's own MCP server, Cloudflare's, Notion's, Stripe's, etc.): higher trust — the vendor runs them
- **Official Anthropic MCP examples** (filesystem, git, memory, fetch, sequential-thinking): trusted reference implementations but positioned as educational, not production-hardened
- **Community MCP servers**: wildly variable. Pin version, read source, prefer well-starred and actively maintained

## Scenario → recommendation map

### Messaging channels beyond the built-in set

OpenClaw ships with WhatsApp, Telegram, Discord, Slack, iMessage, WebChat built in. For everything else:

| Need | Recommendation | Tier | Notes |
|------|----------------|------|-------|
| Matrix rooms | `@openclaw/plugin-matrix` | 1 | Official; supports rooms + DMs |
| Microsoft Teams | `@openclaw/plugin-msteams` | 1 | Official; requires bot registration |
| Nostr (decentralized) | `@openclaw/plugin-nostr` | 1 | Official; specialized use case |
| WhatsApp voice calls | `@openclaw/plugin-voice-call` | 1 | Adds voice I/O to WhatsApp channel |
| Zalo (Vietnamese messenger) | `@openclaw/plugin-zalo` + `@openclaw/plugin-zalouser` | 1 | Two plugins: bot + user account |
| Signal | check ClawHub | 3 | Community implementations exist; audit heavily |
| Email-as-channel | hybrid: Gmail PubSub + OpenClaw hooks | — | See `references/automation-and-hooks.md`; not a plugin |

Before building a custom channel plugin: check ClawHub first. If nothing exists, the full plugin authoring path applies — `references/authoring-plugins.md`.

### Memory and knowledge

| Need | Recommendation | Tier | Notes |
|------|----------------|------|-------|
| Default memory (most cases) | `memory-core` | 2 | Bundled; SQLite-backed; "just works" |
| Structured knowledge base with provenance | `memory-wiki` plugin | 2 | Runs ALONGSIDE `memory-core`, not instead |
| Vector search at scale (>20k entries) | `memory-lancedb` | 2 | LanceDB backend; fast vector search |
| Markdown-first external collections | `memory-qmd` | 2 | Obsidian vault integration, file-watched |
| Honcho-hosted memory | `memory-honcho` | 2 | Cloud-hosted; requires Honcho account |

Default pick: `memory-core` + optional `memory-wiki` for structured knowledge. Upgrade backends only when you've hit a specific limit.

### Development workflow

| Need | Recommendation | Tier | Notes |
|------|----------------|------|-------|
| GitHub issues, PRs, repos | `github/github-mcp-server` (official GitHub) | 4 | GitHub's own MCP server; supports read-only mode + dynamic toolsets |
| GitLab | community MCP (search) | 4 | Multiple implementations; check wong2/awesome-mcp-servers |
| Git repo operations (local) | `@modelcontextprotocol/server-git` | 4 | Official Anthropic reference; read/search/manipulate local Git |
| Filesystem access | `@modelcontextprotocol/server-filesystem` | 4 | Official; configurable access controls |
| npm package lookup | `npm-search` MCP server | 4 | Community; search npm registry |
| Docker / containers | check awesome-mcp-servers list | 4 | Multiple options |
| Code docs / library API reference | `Context7` MCP server | 4 | Popular for "look up library X's API" |
| Kubernetes | `MKP3` MCP (search) | 4 | Native Go implementation |

### Documentation and knowledge tools

| Need | Recommendation | Tier | Notes |
|------|----------------|------|-------|
| Notion | `@notionhq/notion-mcp-server` | 4 | Official Notion |
| Confluence/Jira | Atlassian-provided or community | 4 | Check https://github.com/atlassian for official |
| Obsidian | `memory-qmd` OR community Obsidian MCP | 2 or 4 | Memory-qmd is OpenClaw-native; MCP options exist too |
| Markdown processing | `mcp-markdown` (Microsoft) | 4 | Read/write/transform Markdown |
| AWS documentation | `AWS Documentation` MCP | 4 | Fetch + search AWS docs |
| Microsoft docs | `Microsoft Learn` MCP | 4 | Real-time MS docs |
| Research papers (academic) | various citation-verify MCPs | 4 | e.g., `academic-refchecker` |

### Web and search

| Need | Recommendation | Tier | Notes |
|------|----------------|------|-------|
| Web content fetch | `@modelcontextprotocol/server-fetch` | 4 | Official Anthropic; fetch + convert to LLM-friendly |
| Web search | Brave Search MCP (vendor-official) | 4 | Requires Brave Search API key |
| Web search (alternative) | `Exa` MCP server | 4 | Search engine designed for AI |
| Browser automation | `Browserbase` or `@modelcontextprotocol/server-puppeteer` | 4 | Browserbase is cloud-hosted; puppeteer is local |
| Chrome DevTools integration | `chrome-devtools-mcp` | 4 | Control + inspect live Chrome |
| Scraping at scale | `Firecrawl` MCP (official) | 4 | Commercial scraping service |
| URL screenshots | `ScreenshotOne` MCP | 4 | Screenshot service |

### Data stores

| Need | Recommendation | Tier | Notes |
|------|----------------|------|-------|
| PostgreSQL | search awesome-mcp-servers "postgres" | 4 | Multiple options; pick actively maintained |
| SQLite | `SQLite Explorer MCP` | 4 | Community; safe read-only by default |
| Redis | `@modelcontextprotocol/server-redis` | 4 | Official-ish; in servers repo |
| ClickHouse | `ClickHouse MCP` | 4 | Official ClickHouse |
| Chroma (vector DB) | `Chroma` MCP | 4 | Official; embeddings + full-text |
| Neon (serverless Postgres) | `Neon MCP Server` | 4 | Official Neon |
| Snowflake | `Snowflake MCP Server` | 4 | Community; SQL + schema |
| Any database via SQL | search for the specific database | 4 | Most major databases have MCP servers |

### Cloud platforms

| Need | Recommendation | Tier | Notes |
|------|----------------|------|-------|
| Cloudflare (Workers, KV, R2, D1) | Cloudflare official MCP | 4 | Deploy + configure + query |
| AWS (Bedrock KB, CDK, docs, etc.) | multiple AWS-official MCPs | 4 | Several under microsoft/mcp and aws repos |
| Azure (all services) | Azure MCP Server (Microsoft-official) | 4 | Unified Azure tools |
| Azure DevOps | Azure DevOps MCP | 4 | Microsoft-official |
| Google Cloud | search for specific service | 4 | Varies by service |

### Productivity and communication

| Need | Recommendation | Tier | Notes |
|------|----------------|------|-------|
| Slack | `@modelcontextprotocol/server-slack` | 4 | Community/official reference |
| Linear | Linear MCP (official) | 4 | Official Linear |
| Airtable | community MCP | 4 | Multiple options |
| Google Drive | Google MCP Servers | 4 | Google-official collection |
| Gmail | Google MCP Servers | 4 | Part of Google official |
| Google Calendar | Google MCP Servers | 4 | Part of Google official |
| Microsoft 365 | Microsoft 365 Agents Toolkit MCP | 4 | Microsoft-official |

### E-commerce and payments

| Need | Recommendation | Tier | Notes |
|------|----------------|------|-------|
| Stripe | Stripe MCP (official) | 4 | Official Stripe |
| PayPal | PayPal Agent Toolkit | 4 | Official PayPal |
| Chargebee | Chargebee MCP | 4 | Official |
| Shopify | search for current state | 4 | Ecosystem shifts; verify before recommending |

### Audio, image, video

| Need | Recommendation | Tier | Notes |
|------|----------------|------|-------|
| Text-to-speech / voice | MiniMax MCP (official) | 4 | Commercial |
| Image generation | multiple MCP servers exist | 4 | Search for current best |
| Video generation | multiple MCP servers exist | 4 | Search for current best |
| Audio analysis | AudioScrape (remote MCP) | 4 | Commercial |

### Utility / meta

| Need | Recommendation | Tier | Notes |
|------|----------------|------|-------|
| Search across installed MCP servers | `MCP Servers Search` | 4 | Query-and-discover |
| Natural-language MCP config management | `mcporter` (OpenClaw community skill) | 3 | Instead of editing JSON by hand |
| Knowledge graph memory | `@modelcontextprotocol/server-memory` | 4 | Official Anthropic; knowledge graph-based |
| Sequential problem-solving helper | `sequential-thinking` MCP | 4 | Official Anthropic reference |
| Command logging / audit trail | `command-logger` bundled hook | 2 | Already in core |

### Specialty

| Need | Recommendation | Tier | Notes |
|------|----------------|------|-------|
| Bitcoin / Lightning | `Alby NWC MCP` + others | 4 | Nostr Wallet Connect integration |
| Web3 / blockchain | `Thirdweb MCP` + crypto-specific ones | 4 | See Awesome Crypto MCP Servers |
| IoT / home automation | check homelab ClawHub skills | 3 | Growing category; audit heavily |
| Anki flashcards | `Anki MCP` | 4 | Community |
| 3D printing / slicers | check ClawHub | 3 | Niche; community only |

## The "check before you build" protocol

When the user describes a new capability, walk this check in order. Don't skip steps.

### Step 1: Is it already a built-in OpenClaw tool?
Does `exec`, `read`/`write`, `browser`, `web_search`, `web_fetch`, `memory_*`, `message`, etc. already cover this? If yes — stop. Use the built-in.

### Step 2: Is there an official OpenClaw plugin for it?
Check this catalog's Tier 1 list. Matrix, Teams, Nostr, voice-call, Zalo — these are the current officials. If the user wants one of these, install the official plugin.

### Step 3: Is there a bundled feature already in OpenClaw?
Check Tier 2. Memory backends, memory-wiki, command-logger, session-memory, bootstrap-extra-files, boot-md — these are `openclaw plugins enable <n>` away.

### Step 4: Is there a public MCP server?
For anything involving external services (GitHub, databases, APIs, cloud platforms, messaging, productivity tools) — check https://github.com/modelcontextprotocol/servers AND the wong2/awesome-mcp-servers list AND mcpservers.org. For vendor-specific needs, check the vendor's own official MCP (GitHub, Cloudflare, Notion, Stripe, etc.).

**Specifically search:**
- The official Anthropic servers repo
- The vendor's GitHub organization (e.g., search "github/github-mcp-server", "cloudflare/mcp")
- awesome-mcp-servers curated lists

### Step 5: Is there a community skill or plugin on ClawHub?
Search `clawhub.ai` OR run `clawhub search <topic>`. Community skills sometimes cover things MCP servers don't (host-specific CLIs, OpenClaw-specific workflows).

If you find something: audit per `references/security-audit.md` BEFORE installing.

### Step 6: Only now, consider building custom
If all five steps came up empty, then `references/when-to-build-what.md` tells you which custom path (skill / CLI+skill / plugin / your own MCP server) fits.

Document the user's path: "I checked the ecosystem; here's what I searched and came up empty on; here's what I'll build instead." This justifies the build and helps future re-evaluation.

## Red flags when evaluating community code

Don't install if you see any of these on a community plugin or MCP server:

- **Unmaintained:** last commit > 6 months ago with open issues
- **Tiny install base** (unless niche enough that matters less)
- **No source available** for what claims to be open source
- **Asks for broad credentials** beyond what the scope implies (e.g., a weather MCP asking for GitHub tokens)
- **Updates within the last 2 weeks** from a low-reputation publisher (common supply-chain attack pattern — wait and watch)
- **Name-squats** a popular service (`stripe-mcp-server-v2` when the official is `stripe-mcp`) — verify it's the real vendor
- **Executable binaries** in an MCP server that's "just a wrapper"
- **No documented scope** of what tools it registers / data it accesses

When in doubt: audit per `references/security-audit.md` OR skip.

## Integration patterns

Some scenarios involve multiple ecosystem pieces working together:

### "I want my agent to help me with GitHub AND my local git repos"
- GitHub operations: GitHub's official MCP server
- Local git operations: `@modelcontextprotocol/server-git`
- These are separate; both can run simultaneously
- Coordinate via AGENTS.md rules (when to use which)

### "I want my agent to manage my Synology homelab"
- OpenClaw built-in `exec` via SSH or via custom CLIs
- Document in TOOLS.md which scripts exist
- Consider `mcporter` if you're mounting multiple MCP servers per service (Jellyfin, Sonarr, etc. — each may have its own MCP)
- Wrap Synology-specific calls in skills, not MCP servers (too thin to justify)

### "I want voice and text both on WhatsApp"
- OpenClaw WhatsApp channel (built-in) handles text
- `@openclaw/plugin-voice-call` handles voice
- Both run in same agent; soul handles context-appropriate responses

### "I want the agent to know my Notion AND my Obsidian AND my code"
- Notion: official Notion MCP
- Obsidian: `memory-qmd` backend (native OpenClaw integration)
- Code: GitHub MCP (remote repos) + filesystem MCP (local)
- Memory architecture question too — see `references/memory-system.md` for how these layer

## When the catalog fails you

You'll hit cases where nothing in this catalog fits and you're not sure if that's because:
1. The catalog is incomplete
2. The catalog is stale and something got added since April 2026
3. Nothing exists and custom is the right answer

**Research strategy for these cases:**

1. `web_search` for `<capability> MCP server` — current state of the MCP ecosystem
2. `web_search` for `openclaw <capability>` — OpenClaw-specific solutions
3. Check https://clawhub.ai/search for community skills
4. Check https://github.com/modelcontextprotocol/servers for recently added reference servers
5. Check the vendor's own GitHub org if they have one — official MCP servers often live there

Only AFTER that exhausted, route to `references/when-to-build-what.md` for the custom path decision.

## Summary — the architect mindset

You are not here to reinvent wheels. You are here to assemble a system from the best available parts, with audit discipline appropriate to each part's trust tier, and to build ONLY what genuinely needs building.

Before recommending custom: **catalog → search → ClawHub → build**. In that order. Every time.

## See also

- `references/authoring-plugins.md` — if you determined building is warranted, here's how
- `references/tool-creation.md` — six paths for adding tools; plugin is one of them
- `references/when-to-build-what.md` — the should-you-build-this decision gate
- `references/security-audit.md` — vet any plugin before install, especially from ClawHub
- `assets/audit-checklists/pre-install.md` — fast review for incoming plugins
