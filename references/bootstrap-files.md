# The Supporting Bootstrap Files — USER.md, IDENTITY.md, TOOLS.md, BOOTSTRAP.md

Four files that don't get their own chapter in most guides but are load-bearing for how your agent actually behaves. They're small, easy to underestimate, and get wrong in subtle ways.

Each one has a narrow, specific job. Don't cross-contaminate them.

## How to work through this with the user

**Plan mode applies.** Do not draft any of these files until the user has confirmed what goes in each. See the Plan-Mode Contract in the main SKILL.md.

**Pace:** 10-20 minutes to plan all four. Faster than SOUL/AGENTS because these are smaller and more factual.

**Sequence:**
1. IDENTITY: name + vibe + emoji — sketch 3 lines, confirm
2. USER: walk through facts (timezone, comms style, technical level, household, boundaries) — sketch sections, confirm
3. TOOLS: enumerate custom CLIs + runtime paths + preferences — sketch the structure, confirm
4. BOOTSTRAP: decide between default Q&A / skipBootstrap / custom BOOTSTRAP — no drafting needed if using skipBootstrap
5. Present complete plan for all four → get approval → draft

**Don't:**
- Draft USER.md with behavioral rules (those go in SOUL.md)
- Include credentials, API keys, or secrets in any of these files
- Write TOOLS.md as a dump of every CLI on the host — only what's non-obvious or preference-worthy
- **Produce file content before the user confirms what goes in each**

**Do:**
- Use the templates in `assets/templates/{IDENTITY,USER,TOOLS,BOOTSTRAP-custom}.md` as structure references during planning
- Ask the user to pick first-person or third-person voice for USER.md before drafting
- Call out when user input belongs in a different file (e.g., "that's a SOUL.md rule, let's move it")
- For BOOTSTRAP.md: confirm whether the agent is deploying fresh (needs ritual), skipBootstrap (pre-filled), or custom Q&A

## Quick map

| File | Injected | Job | Typical size |
|------|----------|-----|--------------|
| `IDENTITY.md` | Every DM turn | Nameplate — the agent's own name, vibe, emoji | 100-300 chars |
| `USER.md` | Every DM turn | Who you are, to the agent | 500-2000 chars |
| `TOOLS.md` | Every turn (DM + subagent) | Your host's tool conventions, installed binaries | 500-2000 chars |
| `BOOTSTRAP.md` | First run only | Q&A ritual script — write other files and delete | N/A (delete after) |

All four load BEFORE `SOUL.md` and `AGENTS.md` in typical system prompt assembly, so they provide the factual foundation that persona and procedure rules can reference.

## IDENTITY.md — the agent's nameplate

The agent's own sense of self. Name, vibe, emoji. That's it.

### What belongs

- Agent's name (what it calls itself)
- One-line vibe description (not a whole soul; one line)
- Emoji (appears in some UIs)
- Optional: pronouns if the agent character has them

### What does NOT belong

- Personality rules → `SOUL.md`
- Backstory, lore, fictional biography → skip entirely or put in a skill if it matters for a specific task
- The user's info → `USER.md`
- Operating procedures → `AGENTS.md`

### Why keep it separate from SOUL.md

Two reasons:
1. **Concise identity reads cleaner.** When the model assembles the system prompt, having "I am Molty, a space lobster assistant" in one place and "my voice is sharp and terse" in another is easier for the model to parse than a mushed-together block.
2. **You might change them at different cadences.** Renaming the agent shouldn't mean rewriting its soul. Editing the soul shouldn't mean touching the name.

### Good IDENTITY.md

```markdown
# Identity

**Name:** Molty
**Vibe:** Sharp, concise, slightly irreverent. Space lobster energy.
**Emoji:** 🦞
```

That's the whole file. Three lines. Anything longer is probably soul content that wandered into the wrong file.

### Bad IDENTITY.md (mushed with soul)

```markdown
# Identity

I am Molty, an AI assistant designed to help Gene with daily tasks, 
technical work, and creative projects. I am professional yet approachable, 
always striving to provide clear and accurate assistance. I believe in 
being helpful while maintaining...
```

This is soul-content in an identity file. Cut the behavioral claims. Move them to `SOUL.md`. Keep identity tight.

### How it's used

The model references IDENTITY.md when it needs to say its own name or refer to itself. Without it, the agent might drift between "I'm Claude" / "I'm an AI" / "I'm OpenClaw" depending on the base model and turn. With it, the agent consistently names itself.

## USER.md — who the user is, TO the agent

This is NOT your LinkedIn or a biography. It's facts about you that help the agent serve you.

### What belongs

- **How you want to be addressed** — name, preferred form ("Call me Gene, not Eugene")
- **Timezone** — critical for anything time-sensitive; missing timezone = scheduling bugs
- **Communication preferences** — direct/verbose, formal/casual, pleasantries or not
- **Technical level** — what the agent can assume you know without explaining
- **Current context** — work, major projects, relationships (brief; durable facts only)
- **Hard boundaries** — topics you don't want unsolicited advice about

### What does NOT belong

- Agent's personality ("be friendly to Gene") → `SOUL.md`
- Operating rules ("always ask before sending") → `AGENTS.md`
- Day-to-day context ("Gene is working on the auth refactor today") → `memory/YYYY-MM-DD.md`
- Trivial biographical detail the agent doesn't need (birth year, hobbies the agent will never reference)

### Length

500-2000 characters is the sweet spot. Under 300 and the agent doesn't know you. Over 3000 and you're burning tokens every turn on trivia.

### Good USER.md

```markdown
# User

**Name:** Gene. Call me Gene (not Eugene, not Gene-o).
**Timezone:** America/Chicago (Hendersonville, TN)

**Who I am:** DevOps Engineer at CPI Card Group. Windows server patching, 
Rapid7 InsightVM vulnerability work, Octopus Deploy + GitLab CI/CD, 
automation in PowerShell / Python / Bash / Ansible. Long-term target is 
Solutions Architect, not management.

**Communication style:** Direct. Skip "Great question!" and similar openers. 
Terse is better than verbose. I'll ask follow-ups if I need more.

**Technical level:** Senior engineer. Assume I know Git, Docker, systemd, 
networking basics, cloud fundamentals. Don't explain below that bar.

**Household:** Partner is Tori. Kids live with us. If you reference my 
schedule, remember those people exist.

**Hard boundaries:**
- Don't volunteer legal, financial, or medical advice unless I ask
- Don't lecture about work/life balance, caffeine, screen time, etc.
- Don't pretend to remember things you don't — say "I don't know" cleanly
```

Notice what's NOT in there: my whole work history, age, every tool I use, pet names, anything nobody needs to know to help me in a given message.

### What happens when you get it wrong

**USER.md too short:** agent asks you to repeat context every session. Doesn't know your timezone. Defaults to overly-formal tone.

**USER.md too long:** context budget wasted on trivia. Important preferences buried. Agent cites irrelevant detail.

**USER.md contradicts MEMORY.md:** the agent gets confused and oscillates. If a fact changes (new job, new location), update BOTH files in the same edit.

**USER.md has behavioral rules ("be terse", "don't lecture"):** technically works because rules-anywhere influence behavior, but harder to tune. Those belong in `SOUL.md`. USER.md should describe facts; SOUL.md should describe behavior.

### First-person vs third-person

Pick one and be consistent. Both work:

**First-person (I/me):**
```markdown
I'm a DevOps Engineer. I prefer terse replies. My timezone is America/Chicago.
```

**Third-person (user/the user):**
```markdown
User is a DevOps Engineer. User prefers terse replies. User's timezone is America/Chicago.
```

First-person feels more natural to the model and reduces "the user"-flavored stilted replies. Third-person is more formal and plays better in multi-agent setups where the same USER.md might be loaded by different personas.

**Recommendation:** first-person for personal assistants, third-person when multiple distinct agents share the same user context.

## TOOLS.md — your environment's conventions

This is guidance for the model about YOUR specific host environment. It does NOT enforce anything — tool availability is controlled by `tools.allow`/`deny` in config, sandbox settings, and exec approvals. TOOLS.md just tells the agent what's here and how you prefer to use it.

### What belongs

- **Custom CLIs installed on this host** — things the agent wouldn't know about by default
- **Non-obvious tool preferences** — "use `rg` not `grep`", "use `fd` not `find`"
- **Runtime specifics** — Python version, Node path if unusual, Ruby manager
- **Skill hints** — if you have custom skills the agent should reach for on specific tasks, name them here
- **Host quirks** — "this is macOS; GNU coreutils are at `/opt/homebrew/opt/coreutils/libexec/gnubin`"

### What does NOT belong

- **Tool policy** (allow/deny) → `openclaw.json` `tools.*`
- **Sandbox configuration** → `openclaw.json` `agents.defaults.sandbox`
- **API keys, credentials** → `auth-profiles.json` or env vars (NEVER in a workspace file)
- **Rules about when to use a tool** → `AGENTS.md` (those are procedure)
- **Skill content itself** — skills are separate files; TOOLS.md just names them

### Crucial distinction

TOOLS.md is informational. It tells the agent what EXISTS. If you write "Use `sudo rm -rf` for cleanups" in TOOLS.md, the agent might try — but tool policy and exec approvals can still block it. Don't assume TOOLS.md can grant or revoke access. It can't.

### Good TOOLS.md

```markdown
# Tools

## Custom CLIs installed on this host

- `imsg` — send iMessage via CLI; use this for Mac-originated texts instead of 
  trying to automate the Messages app
- `wthr` — quick local weather lookup; prefer over `web_fetch` for weather
- `sag` — semantic search across my Obsidian vault in `~/notes/`
- `synology-cli` — manage my DS1817+ NAS via DSM API
- `rapid7-report` — custom Python script in `~/bin/` that parses InsightVM CSV exports

## Runtime paths

- **Python:** 3.12 at `~/.pyenv/shims/python3` (pyenv-managed)
- **Node:** 22.x via nvm at `~/.nvm/versions/node/v22.10.0/bin/node`
- **Ruby:** system Ruby; don't assume gems are installed
- **Shell:** zsh by default; scripts should work in bash too

## Preferences

- Use `rg` (ripgrep) not `grep` for search — it's installed, it's fast
- Use `fd` not `find` for file searches
- Use `bat` not `cat` when the output will be shown to me (syntax highlighting)
- Use `gh` (GitHub CLI) not `curl` for GitHub API calls when authenticated
- Use `jq` for JSON; don't try to parse with awk/sed

## Host

macOS 15 (Apple Silicon). Homebrew at `/opt/homebrew/`. GNU coreutils via 
`brew install coreutils` — the `g`-prefixed versions (`gsed`, `gtar`, etc.) 
give GNU behavior where needed.

## Skills worth naming

- `rapid7_risk_report` — when I mention InsightVM exports, reach for this
- `brand_voice` — when I'm drafting public content (blog, social)
- `weekly_infra_report` — Sunday evening; pairs with a cron job
```

### Subagent impact

TOOLS.md is one of only TWO bootstrap files subagents see (the other is AGENTS.md). If a subagent is going to execute shell work, its tool conventions come from here. This is why TOOLS.md matters more than people think — it's the inheritance channel for delegated work.

Keep TOOLS.md useful to a subagent: prefer actionable conventions ("use X not Y") over observations ("I installed X once in 2024").

### Bad TOOLS.md (everything the user has ever installed)

```markdown
# Tools

I have brew installed. I have Python. I have Node. I have Ruby. I have Go. 
I have Rust. I have Docker. I have Kubernetes. I have ffmpeg. I have 
imagemagick. I have ...
```

Useless. The agent assumes standard tools exist. Only mention things that are non-obvious or where you have a specific preference.

## BOOTSTRAP.md — the first-run ritual, then delete

This one is different from the other three: it's a temporary file. It exists for one purpose, runs once, then gets deleted.

### What it is

When you first run `openclaw onboard` or create a brand-new workspace, OpenClaw auto-creates `BOOTSTRAP.md` with a Q&A script. On the first agent turn, the model reads it and runs an interactive onboarding:

1. Asks you your name, preferred pronouns (if relevant), timezone
2. Asks about your communication style preferences
3. Asks about your role / context
4. Asks what you want the agent to be like (voice, vibe)
5. Populates `IDENTITY.md`, `USER.md`, and `SOUL.md` from your answers
6. Deletes itself

### What YOU do with BOOTSTRAP.md

Short answer: **very little, and usually only delete it.**

The out-of-the-box BOOTSTRAP.md works. You message the agent, it walks through the Q&A, files get written, BOOTSTRAP.md goes away. You're done.

### Edit cases

There are two reasons you might edit BOOTSTRAP.md:

**1. You want a different onboarding flow.**
Maybe the default Q&A asks things you don't care about, or skips things you do. You can rewrite the script before the first run. For example, for a DevOps-focused agent you might want it to ask about your tech stack, homelab, etc.

**2. You're bootstrapping an agent with pre-existing context.**
If you're deploying an agent you already designed elsewhere (or a second persona reusing parts of the first), you don't need Q&A at all. You can:
- Skip bootstrap entirely by setting `agent.skipBootstrap: true` in config
- OR replace BOOTSTRAP.md with instructions like "Don't ask me anything. Populate files from `templates/pre-filled-*.md`."

### BOOTSTRAP.md as a designed-agent runbook

For agents that you're designing deliberately — not the out-of-the-box onboarding flow, but a fresh workspace you architected end-to-end — BOOTSTRAP.md can be repurposed as a short **runbook** that takes the design from "files on disk" to "running agent" and then deletes itself. This is the pattern for any Architect-driven build.

Recommended contents, in order:

1. **Gateway token & config**
   - Command to generate a gateway auth token (e.g., `openclaw doctor --generate-gateway-token`).
   - Instruction for inserting the token into `openclaw.json`.

2. **Workspace git setup**
   - `cd ~/.openclaw/workspace-<name>` (or wherever the workspace lives).
   - `git init`, `.gitignore` reminders (always exclude `BOOTSTRAP.md`, secrets files, and any generated caches), first commit, and a push to a **private** remote. Git-backed workspaces are how you roll back failed tweaks cheaply.

3. **Gateway startup**
   - The canonical `openclaw gateway` command for this agent (with the right profile/config path).
   - A note about using `skipBootstrap: true` if the workspace is pre-filled — otherwise the agent will run the Q&A ritual on top of files that already exist.

4. **Smoke-test sequence** (run these in order in the chat UI after the first DM lands):

   1. `status` — confirm the agent is reachable and session info looks right.
   2. `context list` — verify the correct bootstrap files are injected: IDENTITY.md, USER.md, SOUL.md, AGENTS.md, TOOLS.md, HEARTBEAT.md, MEMORY.md.
   3. Ask: **"what do you know about me?"** — confirm that USER.md and MEMORY.md facts surface correctly in-character.
   4. Ask: **"what tools do you have?"** and run `tools verbose` — cross-check against TOOLS.md and the tool policy. Catches mismatches between what the config allows and what the agent thinks it has.
   5. Teach a preference: **"remember that I prefer tabs over spaces."** Then `new` to start a fresh session. Ask: **"what do I prefer for indentation?"** — confirms memory persists across session reset.
   6. Run `openclaw security audit --deep`. Fix any critical findings (file permissions, gateway exposure, dangerous flags set, exec posture issues) before putting the agent into real use.

5. **Troubleshooting table** (small, local to the runbook — don't try to cover everything):

   - Memory test fails → ensure the memory plugin (e.g., `memory-core`) is enabled in config.
   - Tools don't match expectations → reconcile `tools.profile` / `tools.allow` / `tools.deny` against TOOLS.md.
   - BOOTSTRAP.md persists after the ritual → delete it manually (`rm ~/.openclaw/workspace-<name>/BOOTSTRAP.md`) and restart the session; do NOT re-create it.
   - Agent can't find a skill you expect → check skill precedence (workspace `skills/` > project > personal > managed > bundled > `extraDirs`) and `openclaw skills list` to see which actually loaded.

**Delete after use.** BOOTSTRAP.md is write-once: once the smoke tests pass, the file goes away (either the agent deletes it at the end of the ritual, or you remove it manually). Do not re-create it. If something breaks later, debug in chat — don't regenerate a runbook and re-inject it.

### When BOOTSTRAP.md fails to delete

After the ritual, the agent should delete `BOOTSTRAP.md`. If it's still there, something went wrong — usually:
- Agent got distracted mid-ritual and the file persisted
- You killed the session before the cleanup step ran
- A tool policy blocked the delete

Just delete it manually:
```bash
rm ~/.openclaw/workspace/BOOTSTRAP.md
```

Next session start won't recreate it (OpenClaw checks for its presence before seeding).

### Can I skip it entirely?

Yes. In `openclaw.json`:
```json5
{
  agent: {
    skipBootstrap: true
  }
}
```

When `skipBootstrap: true`:
- Workspace still gets seeded with default IDENTITY/USER/SOUL/AGENTS/TOOLS/HEARTBEAT
- BOOTSTRAP.md is NOT created
- First session is a normal session, no Q&A

Use this when:
- You're deploying an agent from a git-backed workspace that already has all files filled in
- You're creating a second agent that should start exactly as designed, no interview
- You're automating agent deployment (e.g., dropping workspaces via config management)

### skipBootstrap + pre-filled workspace = clean deployment

The canonical workflow for a designed agent:

```bash
# 1. Clone your designed workspace
git clone git@github.com:you/openclaw-workspace-main.git ~/.openclaw/workspace

# 2. Set skipBootstrap in config
# (edit openclaw.json)

# 3. Start gateway
openclaw gateway

# 4. Message the agent — no Q&A, it's already itself
```

This is how you deploy the agent you designed using this skill to a new host without redoing onboarding every time.

## File interaction patterns

### How they layer in the system prompt

In rough order of assembly (simplified):
1. IDENTITY — who the agent is
2. USER — who you are to the agent
3. TOOLS — what's available in this environment
4. SOUL — how the agent speaks
5. AGENTS — how the agent operates
6. MEMORY — durable facts
7. (session history)

Think of it as: identity answers "who are you?", user answers "who am I?", tools answer "what can you use?", soul answers "how do you behave?", agents answers "what procedures do you follow?", memory answers "what do you know?"

### What subagents see

Subagent context is STRIPPED compared to a main session. Subagents see:
- `AGENTS.md`
- `TOOLS.md`

They do NOT see:
- `IDENTITY.md` (subagent has no persistent self-concept)
- `USER.md` (user context must come through the task prompt)
- `SOUL.md` (subagents don't perform — they execute)
- `HEARTBEAT.md` (not relevant)
- `BOOTSTRAP.md` (shouldn't exist)
- `MEMORY.md` (subagent can call `memory_search` if needed)

Design accordingly: if a subagent needs to know your name or timezone, put it in the task prompt when you spawn, OR put it in AGENTS.md.

### Edit cadence

- **IDENTITY.md:** rarely. Once at setup. Maybe once more if you rename the agent.
- **USER.md:** when durable life facts change (new job, new location, new family member, changed preferences). Every 3-6 months probably.
- **TOOLS.md:** when you install a new CLI the agent should know about, or when you change toolchain (new Python, different shell, etc.).
- **BOOTSTRAP.md:** once (or never, if you skip bootstrap).

If you're editing USER.md or TOOLS.md weekly, something's wrong — those should be stable. Behaviors that change weekly belong in SOUL.md or AGENTS.md.

## Common gotchas

- **Duplicate facts across files.** Your name in IDENTITY.md, your name in USER.md, your name in MEMORY.md. Pick ONE canonical home and reference from others if needed (usually: USER.md for "your" facts, IDENTITY.md for "agent's" facts).
- **USER.md is really a soul file.** "Gene is a brilliant, hardworking DevOps engineer who deserves thoughtful responses." That's not facts about you — that's an instruction to the agent. Move it to SOUL.md or delete it.
- **TOOLS.md assumes tools exist that aren't installed in sandbox.** If your agent runs sandboxed and TOOLS.md says "use `rg` for search", but ripgrep isn't in the sandbox image, tool calls will fail silently. Match TOOLS.md to what's actually reachable.
- **BOOTSTRAP.md left in the workspace forever.** The agent reads it on every session and re-runs the ritual. Delete it.
- **Editing these files while the agent is running.** Changes take effect on next session start (or on next turn if the skills watcher is watching workspace files — but for bootstrap files specifically, most take effect on next full session reload). When in doubt, `/new` in chat to force re-read.
- **USER.md written as a third party.** "This user is a DevOps engineer at CPI." Fine for multi-agent; stilted for a personal assistant. First-person is usually better: "I'm a DevOps engineer at CPI."

## Templates

Starting points in the assets folder:
- `assets/templates/IDENTITY.md`
- `assets/templates/USER.md`
- `assets/templates/TOOLS.md`
- `assets/templates/BOOTSTRAP-custom.md` — customized onboarding script (replace the default one if you want a DevOps-flavored Q&A, etc.)

## The big picture

These four files are support infrastructure for SOUL.md and AGENTS.md. Get them right and the starring files (soul, agents) can focus on their jobs. Get them wrong (too bloated, too mixed, contradictory) and you end up with an agent that's confused about basic facts while still having a great personality — which is worse than the reverse.

One-line summary for each:
- **IDENTITY.md** — three lines, one-time setup, rarely edit
- **USER.md** — who you are, first-person facts + preferences, edit quarterly
- **TOOLS.md** — what's on this host, preferences for tool choice, edit when environment changes
- **BOOTSTRAP.md** — write-once or skip-entirely, delete after

## See also

- `references/soul-writing.md` — SOUL.md (voice) is the file that lives alongside these procedure/context files
- `references/agents-md-patterns.md` — AGENTS.md is the every-turn procedural companion
- `references/memory-system.md` — MEMORY.md and daily files are the persistent-memory layer
- `SKILL.md` — bootstrap file conventions are enumerated at "Bootstrap files" in the topic router
- `assets/templates/IDENTITY.md`, `USER.md`, `TOOLS.md`, `BOOTSTRAP-custom.md` — ready-to-edit starter files
