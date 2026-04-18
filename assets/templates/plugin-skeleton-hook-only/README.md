# Hook-Only Plugin Skeleton

Starter for a plugin that adds **no tools** and **no channels** — only lifecycle hooks. Policy, observability, audit, install-gating. The smallest useful shape.

**Use this when:**
- You want to log, audit, or rate-limit without adding capabilities
- You're writing a safety net (e.g., `before_install` gate, `before_tool_call` deny list)
- You want to inject context via `before_prompt_build` without registering a tool
- You're prototyping a policy before turning it into something bigger

**Don't use this if:** the plugin needs to *do* something the agent can invoke (use `plugin-skeleton/` instead).

## What's here

- `index.ts` — three common hook patterns: install gate, tool-call audit, prompt injection guard
- `openclaw.plugin.json`, `package.json`, `tsconfig.json` — minimal metadata

## Hook decision semantics — get these right

Sequential hooks that return `{ block: true | false }`:

- `{ block: true }` — terminal. Stops lower-priority handlers. Enforces the block.
- `{ block: false }` — **no-op**. Does NOT clear an earlier block set by another plugin.

This asymmetry trips almost every plugin author once. If you want to *override* a block, that's not a thing — you need to be higher priority and return `{ block: false }` before the blocker runs. Re-read `references/automation-and-hooks.md` § "hook precedence" before writing any hook with `block: true`.

## Included patterns

### 1. Install gate (`before_install`)

Rejects installs with critical findings from the built-in scanner. Templatize for your own policy (e.g., block any plugin with > 5 MB of unminified JS, or any plugin with a `postinstall` script).

### 2. Tool-call audit (`before_tool_call`)

Writes every tool call to a log file. Useful as a drop-in "I want to see everything this gateway does" plugin. Don't `block` here — just observe.

### 3. Prompt-injection guard (`before_prompt_build`)

Prepends a short system instruction that makes the agent resistant to a specific attack pattern you care about. Cheap, easy to iterate.

Remove any you don't need.

## Customization checklist

1. Rename `example-hook-only` everywhere
2. Keep only the hooks you actually want
3. For each remaining hook, write 1–2 sentences in the README explaining WHY it exists and what would make you remove it
4. If you add a `before_install` gate, document your policy — others need to audit YOUR policy
5. If you add a `before_tool_call` block, test it with a deliberately blocked invocation; verify the agent's response is sane

## Testing

```bash
openclaw plugins install -l ./
openclaw gateway restart
openclaw plugins inspect example-hook-only
# Should show the hooks and NO tools
```

## Security notes

A hook-only plugin is the safest kind of plugin — as long as you resist the urge to reach out of the plugin's scope. Good hook-only plugins:

- Don't write files outside `~/.openclaw/plugins/<id>/`
- Don't make network calls unless the plugin's entire purpose is that
- Don't spawn processes
- Don't read or write credentials

If your hook-only plugin needs any of those, it's not hook-only anymore — move to the full skeleton and add the capability explicitly.

## See also

- `../plugin-skeleton/` — general-purpose skeleton
- `../plugin-skeleton-channel/` — channel variant
- `../plugin-skeleton-context-engine/` — context engine variant
- `references/authoring-plugins.md` — all 27 hooks, decision semantics
- `references/tool-policy-and-security.md` — why `before_install` gates matter
