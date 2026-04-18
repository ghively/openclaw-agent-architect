# Authoring Custom Skills

Skills teach the agent HOW and WHEN to do specific tasks. Each skill is a directory with a `SKILL.md` file containing YAML frontmatter + markdown instructions. The agent sees skills as entries in its system prompt with a `<description>` and `<location>`; when a skill seems relevant, the agent reads the full `SKILL.md` via the `read` tool.

This reference is the craft of writing one. For the broader skill ecosystem (ClawHub install, plugin-bundled skills, audit), see `references/security-audit.md`.

## How to work through this with the user

**Plan mode applies.** Even for a single skill, do not draft SKILL.md content until the user has approved the skill's shape: name, description, triggers, dispatch mode, required bins, body outline. See the Plan-Mode Contract in the main SKILL.md.

**Pace:** 15-30 minutes for a solid skill.

**Sequence:** Validate path → sketch name + description → decide dispatch mode → sketch frontmatter → outline body structure + examples → present plan → get approval → draft.

**Don't:**
- Skip `references/when-to-build-what.md` — validate that a skill is the right answer before drafting
- Write a bloated description (agent can't match it against user intent)
- Skip examples in the body — input→output pairs are the single highest-leverage content
- Ignore `requires.bins` gating — if the bins don't exist, the skill silently fails to load
- **Draft the SKILL.md until the plan is approved**

**Do:**
- Ask "what should this skill do, and what triggers it?" — the trigger drives the description
- Sharpen the description through 1-2 rewrites during planning; it's the most important field
- Outline 2-3 concrete input→output example pairs during planning
- Verify the dispatch mode choice (model-driven vs `command-dispatch: tool` vs user-only) matches the actual intent
- Use `assets/templates/skill-template.md` as the starting file IN BUILD MODE after plan approval

**What "done" looks like:** A complete SKILL.md file ready to save at `<workspace>/skills/<name>/SKILL.md`. Plus `/new` + test commands for verification. Optionally a companion `{baseDir}/` file if the skill references external config/data.

## When to write a skill vs. when not to

**Write a skill when:**
- There's a specific task you do repeatedly that has a right way to do it
- The agent keeps getting the task subtly wrong without explicit guidance
- You need to invoke a specific CLI tool with a specific pattern
- You have a narrow domain (a product, a codebase, a personal convention) the agent should know

**Don't write a skill when:**
- It's a one-off (just tell the agent in chat)
- It belongs in AGENTS.md (general operating rules, not domain-specific)
- It's really a plugin (needs in-process code, hooks, or custom tools → see `references/authoring-plugins.md`)
- The built-in tools already do this well

Skills are the right answer 80% of the time you want to extend an agent. Plugins are the right answer when you need code execution, custom tools the model calls with structured parameters, or hooks into the agent lifecycle.

## Where to put a skill

Skill precedence on name collision (highest wins):
1. `<workspace>/skills/<skill-name>/` — **use this for personal skills**
2. `<workspace>/.agents/skills/<skill-name>/` — project agent skills
3. `~/.agents/skills/<skill-name>/` — personal agent skills across workspaces
4. `~/.openclaw/skills/<skill-name>/` — managed skills (ClawHub installs go here by default)
5. Bundled skills (shipped with OpenClaw)
6. `skills.load.extraDirs` — lowest precedence

For a personal skill you're writing yourself: `~/.openclaw/workspace/skills/<skill-name>/SKILL.md`.

## Minimum viable SKILL.md

```markdown
---
name: weather_check
description: Check current weather for a location using the wthr CLI
---

# Weather Check Skill

When the user asks about current weather in a named location, use the `exec` tool 
to run `wthr <location>` and format the output clearly.

If no location is given, ask for one. Don't assume my current location from IP 
or memory unless I specifically said to.

Format the reply as:
- Current temp (F, then C in parens)
- Conditions (one line)
- High/low for today
- Any active alerts

Example:
> 72°F (22°C), partly cloudy. High 78 / low 61. No alerts.
```

Save as `~/.openclaw/workspace/skills/weather-check/SKILL.md` and restart the session (`/new`) for the agent to pick it up.

## Frontmatter reference

### Required
```yaml
name: snake_case_identifier
description: One-line hook the agent sees in the skills list
```

**`name`** — unique identifier in `snake_case`. Becomes the slash command name (sanitized to `a-z0-9_`, max 32 chars). Must not conflict with other skill names (workspace > project > personal > managed > bundled > extra dirs precedence).

**`description`** — ONE LINE. This is what the agent sees to decide "is this skill relevant to the current task?" Write it like a targeted search query.

Good descriptions:
- `Check current weather via wthr CLI`
- `Generate a weekly infrastructure report from Synology metrics`
- `Draft a blog post in my personal voice from an outline`

Bad descriptions:
- `Weather stuff` (vague)
- `Handles weather and also forecasts and also alerts and also moon phase` (broad)
- `A skill for weather lookups that can be used when the user wants weather information and also...` (too long)

### Optional top-level fields

```yaml
homepage: https://your-docs-url.example  # shown as "Website" in macOS Skills UI
user-invocable: true                     # default true; exposes as slash command
disable-model-invocation: false          # default false; true = slash-command only
command-dispatch: tool                   # skill bypasses model, calls tool directly
command-tool: exec                       # tool name when command-dispatch: tool
command-arg-mode: raw                    # forwards raw args (default)
```

### `metadata.openclaw` — the gating block

**Important parser rule:** `metadata` must be a **single-line JSON object**. The parser is picky. Multi-line YAML nesting under `metadata:` will fail.

```yaml
metadata: { "openclaw": { "emoji": "🌤", "requires": { "bins": ["wthr"] } } }
```

Full shape:
```yaml
metadata: { "openclaw": {
  "always": false,
  "emoji": "🌤",
  "homepage": "https://example.com",
  "os": ["darwin", "linux"],
  "requires": {
    "bins": ["wthr", "jq"],
    "anyBins": ["curl", "wget"],
    "env": ["WEATHER_API_KEY"],
    "config": ["browser.enabled"]
  },
  "primaryEnv": "WEATHER_API_KEY",
  "install": [
    {
      "id": "brew",
      "kind": "brew",
      "formula": "wthr",
      "bins": ["wthr"],
      "label": "Install wthr CLI (brew)"
    }
  ]
} }
```

Fields:

| Field | Behavior |
|-------|----------|
| `always: true` | Always include, skip other gates |
| `emoji` | Shown in macOS Skills UI |
| `homepage` | Shown as "Website" in Skills UI |
| `os` | Restrict to platforms: `["darwin", "linux", "win32"]` |
| `requires.bins` | All must exist on PATH (or fail to load) |
| `requires.anyBins` | At least one must exist |
| `requires.env` | Env var must exist OR be provided in config |
| `requires.config` | Openclaw.json paths that must be truthy |
| `primaryEnv` | Env var associated with `skills.entries.<n>.apiKey` in config |
| `install` | Installer specs for macOS Skills UI (brew/node/go/uv/download) |

### Install spec shapes

**brew (macOS):**
```json
{ "id": "brew", "kind": "brew", "formula": "wthr", "bins": ["wthr"], "label": "..." }
```

**npm/node:**
```json
{ "id": "npm", "kind": "node", "package": "@acme/foo-cli", "bins": ["foo"], "label": "..." }
```

**uv (Python):**
```json
{ "id": "uv", "kind": "uv", "package": "weather-cli", "bins": ["weather"], "label": "..." }
```

**go:**
```json
{ "id": "go", "kind": "go", "package": "github.com/acme/foo", "bins": ["foo"], "label": "..." }
```

**download:**
```json
{
  "id": "dl-darwin",
  "kind": "download",
  "url": "https://example.com/foo-darwin.tar.gz",
  "archive": "tar.gz",
  "targetDir": "~/.openclaw/tools/<skillKey>",
  "label": "...",
  "os": ["darwin"]
}
```

Gateway picks a single preferred installer when multiple are listed: brew (if available + preferred) → uv → configured node manager → go → download.

### Sandbox gotcha

`requires.bins` is checked on the HOST at skill load time. **If the agent runs in a sandbox, the binary also has to exist INSIDE the container.** The skill loads (host check passes) but tool execution fails silently inside the sandbox.

Solutions:
- Install the binary in the sandbox via `agents.defaults.sandbox.docker.setupCommand`
- Bake it into a custom sandbox image
- Disable sandbox for the agent that uses this skill (trade-off)

## The markdown body

After frontmatter, the rest of the SKILL.md is instructions the agent reads when it loads the skill. Write them as if you were onboarding a new engineer.

### Structure that works

```markdown
# Skill name

## What this is for
One paragraph: when should the agent reach for this skill?

## When to use it
- Bullet 1 with a specific trigger
- Bullet 2

## When NOT to use it
- Bullet 1 (avoid scope creep into other skills)

## How to use it
Step 1: do X
Step 2: do Y
Step 3: format output as Z

## Examples
Input: "example user request"
Output: "example good response"

## Gotchas
- Known edge case 1
- Known edge case 2

## Referenced binaries / files
- `wthr`: installed via brew, man page at `man wthr`
- `{baseDir}/config.json`: skill-bundled defaults
```

### The `{baseDir}` macro

Inside skill instructions, `{baseDir}` substitutes to the skill folder path. Useful for referencing bundled files.

```markdown
Before running, check `{baseDir}/allowlist.txt` to see which locations are pre-approved.
```

### Writing instructions that actually work

The agent reads your SKILL.md body top to bottom. Top gets the most attention. So:
- **Lead with the happy path.** "To check weather: run `wthr <location>`" before "If the city name has spaces, wrap in quotes..."
- **Keep it short.** 500-1500 words is a lot. 200-400 is often better.
- **Be specific about tools.** "Use the `exec` tool to run `wthr`" not "get the weather"
- **Show don't tell.** Include 1-2 example input→output pairs. The model pattern-matches on examples hard.
- **Put exceptions and edge cases AFTER the main flow.** They shouldn't dilute the core instruction.
- **Name your output format.** "Reply as a single line: temp, condition, high/low." Not "respond appropriately."

### Common body pitfalls

- **Lists of 15 rules the agent has to remember.** Distill to 3-5. The rest go in "gotchas" or examples.
- **Prose walls with no structure.** Use headers. The agent uses them like any reader.
- **Redundant "you are a helpful assistant" preambles.** Cut them. The skill body starts AFTER SOUL.md has set voice.
- **Telling the agent WHY you want something a specific way.** Save for comments or skip entirely. Just tell it what to do.

## Token cost awareness

Every eligible skill contributes to the system prompt via a compact XML list. The math (from OpenClaw docs):

- **Base overhead** (when ≥1 skill is eligible): 195 characters
- **Per skill:** 97 chars + XML-escaped length of `<name>`, `<description>`, `<location>`

Formula: `total = 195 + Σ (97 + len(name) + len(description) + len(location))`

Rough estimate: ~24 tokens per skill + field lengths. 10 skills ≈ 300-500 tokens in the system prompt. Not huge, but multiply by every session turn and it adds up.

**Skill bodies are NOT injected automatically.** The agent reads them via the `read` tool only when it thinks the skill is relevant. So body length doesn't cost you per turn — only the description.

Implication: **write long skill bodies with examples; write short descriptions.**

## Skill dispatch modes

### Default: model-driven
User types `/weather_check SF` → input goes to the model with skill context → model decides whether to invoke tools.

### `command-dispatch: tool` — deterministic, no model
Skips the model entirely. Directly calls the specified tool with raw args.

```yaml
---
name: ping
description: Ping a host and return latency
command-dispatch: tool
command-tool: exec
command-arg-mode: raw
metadata: { "openclaw": { "requires": { "bins": ["ping"] } } }
---
```

When the user sends `/ping 8.8.8.8`, the tool is invoked with `{ command: "8.8.8.8", commandName: "/ping", skillName: "ping" }`. No model in the loop.

When to use deterministic dispatch:
- The skill is genuinely a wrapper around a single CLI call
- You want to save the model-call latency and tokens
- Determinism matters (same input → same output)

When NOT to use it:
- The skill needs interpretation, reasoning, or output formatting
- The skill might need to call multiple tools

### `user-invocable: false` — model-only
The skill is available to the model for auto-invocation but does NOT appear as a slash command. Use when:
- The skill is a subroutine other skills reference
- You don't want users triggering it directly

### `disable-model-invocation: true` — slash-only
Inverse: the skill appears as a slash command but is NOT in the model's skill list. Use when:
- The skill is a user-triggered utility that shouldn't auto-invoke
- Combined with `command-dispatch: tool` for a tool-direct shortcut

## Skills are loaded at session start

The eligible skills snapshot is taken WHEN THE SESSION STARTS. Changes to your skill folder during a session don't take effect mid-session unless:
- The skills watcher is enabled (`skills.load.watch: true`)
- A remote node reconnects (brings new skills into view)

Under watcher, SKILL.md edits trigger a refresh on the next agent turn.

For most development, enable the watcher:
```json5
{
  skills: {
    load: { watch: true, watchDebounceMs: 250 }
  }
}
```

Or just `/new` between edits.

## Agent skill allowlists

Separate from location precedence is the per-agent allowlist. If you run multiple agents, you can restrict which skills each sees.

```json5
{
  agents: {
    defaults: {
      skills: ["weather_check", "memory_wiki"]  // baseline set
    },
    list: [
      { id: "main" },                                // inherits defaults
      { id: "ops", skills: ["synology_health", "docker_check"] },  // REPLACES defaults (no merge)
      { id: "locked-down", skills: [] }              // no skills at all
    ]
  }
}
```

Key rules:
- Omit `defaults.skills` for unrestricted (all loaded skills visible)
- Omit `list[].skills` to inherit
- `list[].skills: []` = empty set
- Non-empty `list[].skills` REPLACES defaults entirely — no merging

## Config overrides

Toggle/configure skills via `~/.openclaw/openclaw.json`:

```json5
{
  skills: {
    entries: {
      "weather-check": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "WEATHER_API_KEY" },
        env: { WEATHER_API_KEY: "plaintext-fallback-not-recommended" },
        config: {
          defaultUnit: "fahrenheit",
          cacheMinutes: 15
        }
      },
      "risky-skill": { enabled: false }
    }
  }
}
```

Rules:
- `enabled: false` disables even bundled/installed skills
- `env`: injected ONLY IF not already set in process (won't override real env vars)
- `apiKey`: convenience for skills with `primaryEnv` — accepts plaintext string OR SecretRef object
- `config`: arbitrary custom fields the skill can reference (via `{baseDir}` bundled files or environment)
- `allowBundled`: optional — restricts which BUNDLED skills are eligible (managed/workspace untouched)
- Config keys match skill `name` by default. If you set `metadata.openclaw.skillKey`, use that instead.
- Hyphenated keys: quote them (`"weather-check"`)

## Examples — four complete skills

### Example 1: CLI wrapper (simple)

`~/.openclaw/workspace/skills/ping-host/SKILL.md`:
```markdown
---
name: ping_host
description: Ping a host or IP and return latency + packet loss
metadata: { "openclaw": { "emoji": "📡", "requires": { "bins": ["ping"] } } }
---

# Ping Host

When the user asks to ping a host or check if a host is reachable:

1. Use the `exec` tool to run: `ping -c 4 <host>`
2. Parse the output for:
   - Packet loss percentage
   - Avg round-trip time
3. Report in one line:
   `<host>: X/4 replies, avg Yms, Z% loss`

If the host is unreachable (100% loss), say so explicitly.

## Examples

Input: "ping 8.8.8.8"
Output: "8.8.8.8: 4/4 replies, avg 12ms, 0% loss"

Input: "is github.com up?"
Output: "github.com: 4/4 replies, avg 28ms, 0% loss — yes it's up"

## Gotchas

- On macOS, `ping` uses `-c 4` (not `-n`). On Linux, same. On Windows (WSL2), 
  same Linux syntax works.
- If the hostname doesn't resolve, report "cannot resolve <host>".
```

### Example 2: Domain-specific workflow (medium)

`skills/rapid7-risk-report/SKILL.md`:
```markdown
---
name: rapid7_risk_report
description: Rank Rapid7 InsightVM servers by risk score from a CSV export
metadata: { "openclaw": { "emoji": "🛡️", "requires": { "bins": ["jq", "python3"] } } }
---

# Rapid7 Risk Report

When the user provides a Rapid7 InsightVM CSV export (or points to one in the workspace):

## What this does
Parses the CSV, ranks assets by risk score, identifies critical/exploitable vulnerabilities, 
and surfaces the blast-radius concerns Gene cares about for CPI's infrastructure.

## Steps

1. Confirm the CSV path. Default location: `~/.openclaw/workspace/rapid7-exports/latest.csv`
2. Use `python3` via `exec` to parse:
   ```python
   import csv
   # Parse: asset_name, ip, os, risk_score, vuln_count, critical_count, exploitable_count
   ```
3. Rank top 20 assets by `risk_score` descending
4. Flag assets that are BOTH (high risk) AND (has exploitable vuln) — these are prioritized
5. Generate report at `memory/rapid7-YYYY-MM-DD.md` with:
   - Top 20 assets table
   - Critical section: assets with exploitable vulns
   - OS distribution
   - Trend vs last report (if last report file exists in same dir)

## Output format

```
## Rapid7 Risk Report — YYYY-MM-DD

### Top 20 by risk score
| Rank | Asset | IP | OS | Risk | Crit | Exploitable |
|-----|-------|-----|-----|------|------|-------------|
| 1   | SRV-01 | 10.x.x.x | Win2019 | 8452 | 12 | 3 |

### Prioritized (high risk + exploitable)
- SRV-01 — 3 exploitable critical CVEs; patch ASAP
- ...
```

## Never do
- Don't send the raw CSV contents externally
- Don't expose internal IPs in messages outside DM context
- Don't guess at CVSS or risk ranking — read what Rapid7 exported
```

### Example 3: Deterministic tool dispatch (no model)

`skills/status-check/SKILL.md`:
```markdown
---
name: status
description: Run openclaw status with --all flag
user-invocable: true
disable-model-invocation: true
command-dispatch: tool
command-tool: exec
command-arg-mode: raw
metadata: { "openclaw": { "emoji": "📊" } }
---

# Status

Direct passthrough to `openclaw status --all`. When `/status` is typed, this 
skill runs the command immediately without involving the model.
```

### Example 4: Skill with bundled config

Directory:
```
skills/brand-voice/
├── SKILL.md
└── voice-guide.md
```

SKILL.md:
```markdown
---
name: brand_voice
description: Draft content in Gene's personal brand voice
metadata: { "openclaw": { "emoji": "✍️" } }
---

# Brand Voice

When Gene asks to draft blog posts, social content, or any public-facing writing:

1. Read `{baseDir}/voice-guide.md` for the full voice guide
2. Draft content that matches:
   - Voice markers listed in the guide
   - Structural conventions (hook, body, close)
   - Never-use list (corporate speak, buzzwords)
3. Surface the draft as a markdown block
4. Ask if edits are wanted before committing to final

## NEVER
- Don't publish or post directly. Always surface drafts for approval.
- Don't identify as AI in the public-facing content
- Don't use words on the "never-use" list in the guide
```

`{baseDir}/voice-guide.md` contains the actual voice guide, which the agent reads on first use.

## Testing a skill

```bash
# 1. Verify skill loaded
openclaw skills list

# 2. Check eligibility (missing bins, env, etc.)
openclaw skills list --verbose

# 3. Test with a direct invocation
openclaw agent --message "ping 8.8.8.8"

# 4. In a real chat session
# Send /new to force re-read, then trigger the skill
```

## Publishing to ClawHub

If the skill is generally useful and you want to share:

```bash
clawhub publish ./my-skill \
  --slug my-skill \
  --name "My Skill" \
  --version 1.0.0 \
  --tags latest \
  --changelog "Initial release"
```

Or `clawhub sync --all` to scan and publish everything in your workspace.

Remember: ClawHub is public. Don't publish skills with hardcoded secrets, private paths, or org-specific conventions you can't share.

## Iteration discipline

- First draft: just make it work. Use `openclaw agent --message` to test.
- Second pass: add examples. Examples dramatically improve agent behavior.
- Third pass: add gotchas and edge cases you encountered in testing.
- Long-term: when the agent keeps using it wrong, update the skill — don't accumulate workarounds in AGENTS.md.

Keep the skill version-controlled (same git repo as your workspace). You'll want to roll back sometimes.

## See also

- `references/tool-creation.md` — where skills sit in the six-path taxonomy for extending the agent
- `references/plugin-ecosystem.md` — skill vs plugin vs MCP tradeoffs
- `references/when-to-build-what.md` — decide between ClawHub, writing a skill, or building something new
- `references/failure-modes.md` — skill triggering failures (never fires, wrong context, broken on error)
- `assets/templates/skill-template.md` — starter SKILL.md with frontmatter and section layout
