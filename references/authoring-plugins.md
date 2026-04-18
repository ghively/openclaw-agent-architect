# Authoring Plugins

Plugins extend OpenClaw with **in-process code**: model providers, channels, tools, hooks, services, HTTP routes, providers for speech/image/video/music generation, context engines, memory backends, and more. They're the power tool of the extension system.

This reference covers: when to choose a plugin over a skill, the manifest + entry point, the full registration API, the 27 plugin hooks, and a worked example.

For installation and audit of third-party plugins, see `references/security-audit.md`.

## How to work through this with the user

**Plan mode applies.** Plugins are real engineering work — TypeScript code, manifests, package layout. Do NOT write code until the user has approved the complete plan. See the Plan-Mode Contract in the main SKILL.md.

**Pace:** 30-90 minutes for a well-designed plugin, depending on scope.

**Sequence:** Validate path (is plugin actually right? check `when-to-build-what.md`) → sketch capabilities (tools, hooks, providers, channels) → design each capability in prose (tool names, parameters, hook targets, return shapes) → sketch package structure → present complete plan → get approval → build.

**Don't:**
- Write `definePluginEntry` code before confirming path with `when-to-build-what.md`
- Sketch tool schemas without applying the design principles from `tool-creation.md`
- Skip the hook decision semantics when sketching hooks (`block: true` is terminal; `block: false` is no-op)
- Draft code when a skill with `command-dispatch: tool` would've worked
- **Produce any TypeScript, package.json, or manifest content before plan approval**

**Do:**
- Ask the disambiguating questions: what capabilities? who's the consumer? distribution plan (personal, ClawHub, npm)? dependencies on external APIs?
- Sketch each tool the plan will register using tool design principles (name for intent, flat params, readable returns, structured errors)
- Identify hooks the plugin will register and WHY — each hook is a commitment to ongoing maintenance
- Confirm sync-vs-async constraints for `tool_result_persist` and `before_message_write` (both sync-only)
- After plan approval, use `assets/templates/plugin-skeleton/` as the starting file in build mode

**What "done" looks like (plan mode):** Complete plan covering registered capabilities (tools, hooks, providers, channels), each capability's interface (names, parameters, return shapes, hook targets), package structure, dependency list, security posture. User has explicitly approved.

**What "done" looks like (build mode):** Plugin skeleton filled in with working code; tools registered with real parameter schemas; hooks with real handlers; manifest and package.json complete; test commands provided.

## Plugin vs skill — choose correctly

**Write a plugin when you need:**
- A tool the agent calls with structured parameters (TypeScript function, not shell CLI)
- A hook into the agent lifecycle (before a tool call, after a message sends, before compaction)
- A new channel (a messaging platform OpenClaw doesn't support yet)
- A new model provider (custom LLM endpoint)
- An HTTP endpoint the gateway exposes
- A service running in the background

**Write a skill when you need:**
- Instructions for how the agent should use EXISTING tools
- Markdown-based domain knowledge
- A slash command that wraps a CLI

If you're about to write a plugin and the only thing it does is shell out to a binary, step back — that's probably a skill with a `command-dispatch: tool` dispatch to `exec`.

## Plugin types

OpenClaw recognizes two plugin formats:

### Native plugins (the focus of this doc)
- `openclaw.plugin.json` manifest + runtime TypeScript/JavaScript module
- Executes in-process with the gateway
- Full API access via the Plugin SDK

### Bundle plugins (compatibility layer)
- Codex/Claude/Cursor-compatible directory layouts (`.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/`)
- Mapped onto OpenClaw features automatically
- Useful for reusing existing IDE plugin work

This doc focuses on native plugins. For bundles, see `docs.openclaw.ai/plugins/bundles`.

## Project setup

### Prerequisites
- Node.js ≥ 22
- TypeScript (ESM)
- npm or pnpm

### Minimum package structure
```
my-plugin/
├── package.json
├── openclaw.plugin.json
├── index.ts
└── tsconfig.json  (optional but recommended)
```

### `package.json`
```json
{
  "name": "@myorg/openclaw-my-plugin",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./index.ts"]
  }
}
```

The `openclaw.extensions` field points to the entry file(s). Multiple entries allowed.

### `openclaw.plugin.json`
The manifest. Even a minimal plugin needs one. Full schema at `docs.openclaw.ai/plugins/manifest`.

Minimal:
```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Does the thing"
}
```

### Entry point

```typescript
// index.ts
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { Type } from "@sinclair/typebox";

export default definePluginEntry({
  id: "my-plugin",
  name: "My Plugin",
  description: "Adds a custom tool to OpenClaw",
  register(api) {
    // ... register tools, hooks, providers, channels, etc.
  },
});
```

Key points:
- Default export, always
- `register(api)` is the public contract (old plugins used `activate(api)` — still supported as alias, but new plugins use `register`)
- Use `definePluginEntry` for non-channel plugins; `defineChannelPluginEntry` for channels

### Import conventions

ALWAYS use subpath imports:
```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
```

DO NOT use:
```typescript
// ❌ Deprecated, will be removed
import { ... } from "openclaw/plugin-sdk";
```

Inside your plugin, use local barrel files (`api.ts`, `runtime-api.ts`) for internal imports.

## Registration API

`api` has the following methods. Register anything you provide in `register(api)`.

| Method | Registers |
|--------|-----------|
| `api.registerProvider(...)` | Model provider (LLM) |
| `api.registerChannel(...)` | Chat channel |
| `api.registerTool(...)` | Agent tool (typed function the model calls) |
| `api.registerHook(...)` / `api.on(...)` | Lifecycle hook |
| `api.registerSpeechProvider(...)` | TTS/STT |
| `api.registerRealtimeTranscriptionProvider(...)` | Streaming STT |
| `api.registerRealtimeVoiceProvider(...)` | Duplex realtime voice |
| `api.registerMediaUnderstandingProvider(...)` | Image/audio analysis |
| `api.registerImageGenerationProvider(...)` | Image generation |
| `api.registerMusicGenerationProvider(...)` | Music generation |
| `api.registerVideoGenerationProvider(...)` | Video generation |
| `api.registerWebFetchProvider(...)` | Web fetch/scrape |
| `api.registerWebSearchProvider(...)` | Web search |
| `api.registerHttpRoute(...)` | HTTP endpoint on gateway |
| `api.registerCommand(...)` / `api.registerCli(...)` | CLI subcommands |
| `api.registerContextEngine(...)` | Pluggable context engine |
| `api.registerService(...)` | Background service |
| `api.registerCompactionProvider(...)` | Custom compaction summarizer |

A single plugin can register any combination.

## Registering a tool — the most common case

Tools are typed functions the LLM can call. Use [TypeBox](https://github.com/sinclairzx81/typebox) schemas for parameters.

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { Type } from "@sinclair/typebox";

export default definePluginEntry({
  id: "weather-plugin",
  name: "Weather Plugin",
  register(api) {
    // Required tool — always available
    api.registerTool({
      name: "get_weather",
      description: "Get current weather for a location",
      parameters: Type.Object({
        location: Type.String({ description: "City name or ZIP code" }),
        units: Type.Optional(Type.Union([Type.Literal("f"), Type.Literal("c")])),
      }),
      async execute(_id, params) {
        const response = await fetch(
          `https://api.example.com/weather?q=${params.location}`
        );
        const data = await response.json();
        return {
          content: [
            { type: "text", text: `${data.temp}°${params.units || "f"}, ${data.conditions}` },
          ],
        };
      },
    });

    // Optional tool — user must add to allowlist
    api.registerTool(
      {
        name: "get_forecast",
        description: "Get 7-day forecast",
        parameters: Type.Object({ location: Type.String() }),
        async execute(_id, params) {
          // ...
          return { content: [{ type: "text", text: "forecast data" }] };
        },
      },
      { optional: true }
    );
  },
});
```

Users enable optional tools:
```json5
{ tools: { allow: ["get_forecast"] } }
```

Rules:
- Tool names must NOT collide with core tools (conflicts are skipped silently)
- Use `optional: true` for tools with side effects or extra binary requirements
- Users can allow-all a plugin's tools by adding the plugin id to `tools.allow`

## The 27 plugin hooks

Hooks let plugins intercept the agent/gateway lifecycle. Understand these before building anything non-trivial.

### Execution modes
- **Sequential** — run in priority order, can modify result, chain until `block: true` or `cancel: true`
- **Parallel** — fire-and-forget, all handlers run concurrently

Two hooks are **SYNCHRONOUS ONLY** and must NOT return a Promise:
- `tool_result_persist`
- `before_message_write`

### Model and prompt hooks

| Hook | When | Mode | Return |
|------|------|------|--------|
| `before_model_resolve` | Before model/provider lookup | Sequential | `{ modelOverride?, providerOverride? }` |
| `before_prompt_build` | After model resolved, session messages ready | Sequential | `{ systemPrompt?, prependContext?, appendSystemContext? }` |
| `before_agent_start` | Legacy combined (prefer the two above) | Sequential | Union |
| `llm_input` | Immediately before LLM API call | Parallel | `void` |
| `llm_output` | Immediately after LLM response | Parallel | `void` |

### Agent lifecycle
| Hook | When | Mode |
|------|------|------|
| `agent_end` | After agent run completes | Parallel |
| `before_reset` | When `/new` or `/reset` clears a session | Parallel |
| `before_compaction` | Before compaction summarizes history | Parallel |
| `after_compaction` | After compaction | Parallel |

### Session lifecycle
| Hook | When | Mode |
|------|------|------|
| `session_start` | New session begins | Parallel |
| `session_end` | Session ends | Parallel |

### Message flow
| Hook | When | Mode | Return |
|------|------|------|--------|
| `inbound_claim` | Before command/agent dispatch | Sequential | `{ handled: boolean }` |
| `message_received` | After inbound message received | Parallel | `void` |
| `before_dispatch` | Commands parsed, before model | Sequential | `{ handled: boolean, text? }` |
| `message_sending` | Before outbound delivery | Sequential | `{ content?, cancel? }` |
| `message_sent` | After outbound delivered | Parallel | `void` |
| `before_message_write` | Before transcript write | **SYNC** seq | `{ block?, message? }` |

### Tool execution
| Hook | When | Mode | Return |
|------|------|------|--------|
| `before_tool_call` | Before each tool call | Sequential | `{ params?, block?, blockReason?, requireApproval? }` |
| `after_tool_call` | After tool completes | Parallel | `void` |
| `tool_result_persist` | Before tool result written | **SYNC** seq | `{ message? }` |

### Subagent
| Hook | When | Mode | Return |
|------|------|------|--------|
| `subagent_spawning` | Before subagent session created | Sequential | `{ status, threadBindingReady? }` |
| `subagent_delivery_target` | After spawning, resolve delivery | Sequential | `{ origin? }` |
| `subagent_spawned` | After subagent fully spawned | Parallel | `void` |
| `subagent_ended` | When subagent session terminates | Parallel | `void` |

### Gateway
| Hook | When | Mode |
|------|------|------|
| `gateway_start` | Gateway fully started | Parallel |
| `gateway_stop` | Gateway shutting down | Parallel |

### Install
| Hook | When | Mode | Return |
|------|------|------|--------|
| `before_install` | After built-in scan, before install | Sequential | `{ findings?, block?, blockReason? }` |

## Decision semantics for sequential hooks

These are critical — getting them wrong creates silent policy bugs:

**`before_tool_call`:**
- `{ block: true }` — terminal, stops lower-priority handlers, blocks the tool call
- `{ block: false }` — **no-op**, does NOT clear an earlier block

**`before_install`:**
- `{ block: true }` — terminal, blocks install
- `{ block: false }` — no-op

**`message_sending`:**
- `{ cancel: true }` — terminal, cancels send
- `{ cancel: false }` — no-op

`block` takes precedence over `requireApproval` in `before_tool_call`. If a higher-priority plugin returns `block: true` and a lower-priority plugin returns `requireApproval`, the block wins.

## Tool approval via `before_tool_call`

Plugins can trigger native approval UI (Telegram buttons, Discord components, `/approve`) by returning a `requireApproval` object:

```typescript
api.registerHook("before_tool_call", async (event) => {
  if (event.toolName === "exec" && event.params.command.includes("rm -rf")) {
    return {
      requireApproval: {
        title: "Dangerous destructive operation",
        description: `Agent wants to run: ${event.params.command}`,
        severity: "critical",
        timeoutMs: 120000,
        timeoutBehavior: "deny",
        onResolution: async (decision) => {
          console.log(`User decided: ${decision}`);
          // "allow-once" | "allow-always" | "deny" | "timeout" | "cancelled"
        },
      },
    };
  }
  return { block: false };
});
```

## A complete worked example — rate-limiter plugin

Here's a minimal plugin that limits the agent to 100 tool calls per hour:

```typescript
// index.ts
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

const CALL_LIMIT = 100;
const WINDOW_MS = 60 * 60 * 1000;

export default definePluginEntry({
  id: "rate-limiter",
  name: "Tool Call Rate Limiter",
  description: "Caps tool calls per hour to prevent runaway loops",
  register(api) {
    const callLog: number[] = [];

    api.registerHook("before_tool_call", async (event) => {
      const now = Date.now();
      // Trim old entries
      while (callLog.length > 0 && callLog[0] < now - WINDOW_MS) {
        callLog.shift();
      }

      if (callLog.length >= CALL_LIMIT) {
        return {
          block: true,
          blockReason: `Rate limit: ${CALL_LIMIT} tool calls per hour exceeded. Wait before retrying.`,
        };
      }

      callLog.push(now);
      return { block: false };
    });

    // Expose a tool to check status
    api.registerTool({
      name: "rate_limit_status",
      description: "Check tool call rate limit status",
      parameters: { type: "object", properties: {}, additionalProperties: false },
      async execute() {
        return {
          content: [
            {
              type: "text",
              text: `${callLog.length}/${CALL_LIMIT} calls in the last hour`,
            },
          ],
        };
      },
    });
  },
});
```

## Install / test flow

### Local development (`--link` for in-place editing)
```bash
# In the plugin directory
npm install
npm run build   # if you have a build step

# Install as a link in the running gateway
openclaw plugins install -l ./

# Restart gateway
openclaw gateway restart

# Verify
openclaw plugins inspect rate-limiter
```

Edit → rebuild → restart cycle. With watcher enabled, some plugin types reload automatically; most require restart.

### In-repo plugins (when contributing to openclaw/openclaw itself)
Place under `extensions/` in the repo. Auto-discovered. Run tests:
```bash
pnpm test -- extensions/my-plugin/
```

### Publishing
```bash
# Option A: ClawHub (preferred — comes up first in install resolution)
clawhub publish ./ --name "My Plugin" --version 1.0.0

# Option B: npm
npm publish --access public
```

Either way, users install:
```bash
openclaw plugins install @myorg/openclaw-my-plugin
# OpenClaw checks ClawHub first, falls back to npm
```

## Security considerations when writing plugins

You are writing code that runs IN-PROCESS with the gateway. Full privileges. Take security seriously:

- **Don't call `child_process` with user-controlled input unescaped.** Use the built-in `exec` tool (which goes through sandbox + approvals), not raw Node child_process
- **Don't fetch arbitrary URLs the user provided.** SSRF risks. Use the `web_fetch` tool or scope your HTTP client to a specific allowed domain.
- **Don't write outside `~/.openclaw/plugins/<id>/` or a user-configured path.** Respect the install root.
- **Don't persist secrets in code.** Use the SecretRef mechanism or env vars.
- **Declare network dependencies.** If your plugin calls external APIs, document it in the manifest.
- **Don't disable safety features from your plugin.** A plugin that sets `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true` in its default config is publishing a backdoor.
- **Be explicit about tool requirements.** Optional tools should be genuinely optional, not "required but disguised as optional to bypass scrutiny."

Users will audit your plugin using the checklist in `references/security-audit.md`. Make passing that audit easy for them:
- Pin your dependency versions (no `^` or `~` in `package.json`)
- Avoid `postinstall` scripts
- Keep your source code readable
- Document every hook you register and WHY
- Don't include binaries — let users install dependencies via the normal `install` metadata flow

## Advanced — `ownsCompaction` for context engines

If your plugin is a context engine (`registerContextEngine`), the `info.ownsCompaction` flag controls whether Pi's built-in auto-compaction stays enabled:

```typescript
api.registerContextEngine("my-engine", () => ({
  info: {
    id: "my-engine",
    name: "My Context Engine",
    ownsCompaction: true,  // plugin fully owns compaction
  },
  async ingest({ sessionId, message }) { /* ... */ return { ingested: true }; },
  async assemble({ sessionId, messages, tokenBudget }) {
    return {
      messages: buildContext(messages, tokenBudget),
      estimatedTokens: countTokens(messages),
      systemPromptAddition: "Use X tool to search history...",
    };
  },
  async compact({ sessionId, force }) {
    // If ownsCompaction: true, YOU MUST implement this correctly
    // If ownsCompaction: false, you can call delegateCompactionToRuntime(...)
    return { ok: true, compacted: true };
  },
}));
```

A no-op `compact()` is UNSAFE for an active non-owning engine — it disables the normal `/compact` and overflow-recovery compaction path for that slot. If you don't want to implement compaction, set `ownsCompaction: false` and delegate:

```typescript
import { delegateCompactionToRuntime } from "openclaw/plugin-sdk/core";

async compact(params) {
  return delegateCompactionToRuntime(params);
}
```

## Plugin lifecycle summary

1. User runs `openclaw plugins install <spec>`
2. Built-in dangerous-code scanner runs (critical findings block by default)
3. `before_install` hooks fire (any plugin can veto)
4. Install proceeds — `npm pack` + `npm install --omit=dev` in per-plugin directory
5. User runs `openclaw gateway restart` (or config-watch auto-restarts if watcher + in-process restart enabled)
6. On gateway start, the manifest is loaded
7. `register(api)` is called, plugin registers its capabilities
8. `gateway_start` hooks fire
9. Normal operation: hooks fire on agent events, tools are available, channels listen
10. On shutdown: `gateway_stop` hooks fire, cleanup runs

## Common plugin ideas (starter pack)

- **Usage tracker** — log all tool calls to an audit file, report daily tokens/cost
- **Prompt logger** — write every `llm_input` to a file for review
- **Time-of-day gate** — `before_tool_call` blocks dangerous tools outside business hours
- **Custom channel** — your niche messaging platform
- **Alternative memory backend** — Redis-backed memory, with vector search via a specific provider
- **Context engine** — custom assembly/compaction (e.g., keep only tool-call summaries, drop the raw outputs)
- **Safety net** — `before_compaction` archives the pre-compacted context to disk for recovery

## Pre-submission checklist

Before publishing:
- [ ] `package.json` has correct `openclaw` metadata block
- [ ] `openclaw.plugin.json` manifest present and valid
- [ ] Entry uses `defineChannelPluginEntry` or `definePluginEntry`
- [ ] All imports use focused `plugin-sdk/<subpath>` paths
- [ ] Internal imports use local modules, not SDK self-imports
- [ ] No hardcoded secrets
- [ ] No broad `*` paths in install metadata
- [ ] No `dangerously*` config defaults unless absolutely needed + documented
- [ ] Tests pass (`pnpm test -- extensions/my-plugin/` or your test runner)
- [ ] Version pinned in dependencies
- [ ] README explains every hook/tool/provider registered

## Further reading

Things I didn't cover in depth — go to docs.openclaw.ai:
- Channel plugin internals — `docs.openclaw.ai/plugins/sdk-channel-plugins`
- Provider plugin internals — `docs.openclaw.ai/plugins/sdk-provider-plugins`
- Plugin manifest full schema — `docs.openclaw.ai/plugins/manifest`
- Plugin bundles (Codex/Claude/Cursor) — `docs.openclaw.ai/plugins/bundles`
- SDK reference — `docs.openclaw.ai/plugins/sdk-overview`

## See also

- `references/plugin-ecosystem.md` — catalog → search → ClawHub → build ordering; avoid reinventing
- `references/tool-creation.md` — the six paths for adding tools (plugin is one of them)
- `references/when-to-build-what.md` — decide if a plugin is actually warranted
- `references/security-audit.md` — review checklist for plugins before install
- `assets/templates/plugin-skeleton-channel/`, `plugin-skeleton-context-engine/`, `plugin-skeleton-hook-only/` — starter skeletons
