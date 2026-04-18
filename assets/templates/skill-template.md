---
# Required
name: my_skill_name
description: One-line hook the agent sees in the skills list

# Optional top-level
# homepage: https://example.com
# user-invocable: true                       # default true; exposes as slash command
# disable-model-invocation: false            # default false; true = slash-command only
# command-dispatch: tool                     # skill bypasses model, calls tool directly (optional)
# command-tool: exec                         # tool name when command-dispatch: tool
# command-arg-mode: raw                      # forwards raw args (default)

# metadata block MUST be single-line JSON — multi-line YAML nesting breaks the parser
metadata: { "openclaw": { "emoji": "🔧", "requires": { "bins": ["jq"] } } }

# Full metadata shape reference — pick what you need, drop the rest. Keep it one line.
# metadata: { "openclaw": {
#   "always": false,
#   "emoji": "🔧",
#   "homepage": "https://example.com",
#   "os": ["darwin", "linux"],
#   "requires": {
#     "bins": ["jq", "rg"],
#     "anyBins": ["curl", "wget"],
#     "env": ["MY_API_KEY"],
#     "config": ["browser.enabled"]
#   },
#   "primaryEnv": "MY_API_KEY",
#   "install": [
#     { "id": "brew", "kind": "brew", "formula": "jq", "bins": ["jq"], "label": "Install jq" }
#   ]
# } }
---

# My Skill Name

<!--
This is the body. Written for the agent, not for humans — the agent reads this
file via the `read` tool when it decides the skill is relevant.

Skill bodies are NOT injected automatically on every turn. Only the description
(above) appears in the skills list every turn. So: write long bodies with examples,
write SHORT descriptions.

Structure that works:
1. What this is for (one paragraph)
2. When to use it (bullets)
3. When NOT to use it (bullets)
4. How to use it (steps)
5. Examples (input → output)
6. Gotchas (edge cases)
7. Referenced binaries/files
-->

## What this is for

One paragraph describing when the agent should reach for this skill.

## When to use it

- Trigger 1 (specific, concrete)
- Trigger 2
- Trigger 3

## When NOT to use it

- Do not use for [adjacent-but-different case]
- Do not use when [precondition not met]

## How to use it

1. Step 1 — specific action with the tool name
2. Step 2 — what to check / verify
3. Step 3 — how to format output

## Examples

Input: `example user request`
Output: `example good response format`

Input: `another example request`
Output: `another good response`

## Gotchas

- Known edge case 1: [what happens, how to handle]
- Known edge case 2: [what happens, how to handle]

## Referenced resources

- `jq`: installed via brew, used for parsing JSON
- `{baseDir}/config.json`: skill-bundled defaults (replace `{baseDir}` macro at runtime)
