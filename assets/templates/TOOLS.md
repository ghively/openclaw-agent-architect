# Tools
<!--
TOOLS.md — guidance about YOUR host environment. What's installed, what to prefer.

Injected into every turn (DM AND subagent). One of only two files subagents see.

INFORMATIONAL ONLY — does not grant or revoke access. Tool policy is enforced
by openclaw.json tools.* (allow/deny), sandbox config, and exec approvals.

BELONGS:
  - Custom CLIs installed on this host (non-obvious)
  - Runtime paths (Python version, Node location, shell)
  - Tool preferences ("use rg not grep", "use fd not find")
  - Host quirks (macOS GNU coreutils at g*, Linux distro details)
  - Skills worth naming (so subagents know what exists)

DOES NOT BELONG:
  - Tool policy (→ openclaw.json tools.*)
  - Sandbox config (→ openclaw.json agents.defaults.sandbox)
  - API keys, credentials (NEVER — use SecretRef or env vars)
  - When to use a tool (→ AGENTS.md — those are procedures)

Edit cadence: when you install a new CLI the agent should know about, or 
when you change toolchain.
-->

## Custom CLIs installed on this host

- `<CLI_NAME>` — <ONE LINE: what it does, when to prefer it over built-ins>
- `<CLI_NAME>` — ...

## Runtime paths

- **Python:** <VERSION> at <PATH>
- **Node:** <VERSION> at <PATH>
- **Shell:** <zsh / bash / fish>
- **Other:** <anything unusual>

## Preferences

- Use `<TOOL_A>` not `<TOOL_B>` for <TASK>
- Use `<TOOL_C>` not `<TOOL_D>` for <TASK>

## Host

<OS AND VERSION>. Package manager: <BREW / APT / PACMAN / etc.>. <ANY NON-STANDARD
PATHS OR CONVENTIONS WORTH KNOWING>.

## Skills worth naming

- `<skill_name>` — <WHEN TO REACH FOR IT>
- `<skill_name>` — ...
