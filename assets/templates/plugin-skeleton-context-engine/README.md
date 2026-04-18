# Context Engine Plugin Skeleton

Starter for a plugin that replaces OpenClaw's built-in context engine — the component that ingests messages and assembles prompts. Use this when you want full control over what the agent "sees" each turn.

**Use this when:** you want a custom retrieval strategy (vector search, keep-only-summaries, hierarchical), a custom compaction strategy, or a specialized memory backend.

**Don't use this if:** you just want to edit the prompt slightly (use a `before_prompt_build` hook in `plugin-skeleton/`).

## The three-method contract

Your engine provides three async methods:

- **`ingest({ sessionId, message })`** — fires per message. Store, index, or transform as you need.
- **`assemble({ sessionId, messages, tokenBudget })`** — build the context passed to the LLM. Return `{ messages, estimatedTokens, systemPromptAddition? }`.
- **`compact({ sessionId, force })`** — summarize / truncate when over budget. Return `{ ok, compacted }`.

## The `ownsCompaction` decision — read carefully

```typescript
info: { ownsCompaction: true  /* or false */ }
```

- **`ownsCompaction: true`** — your plugin fully owns compaction. `/compact` and overflow recovery call YOUR `compact()`. Built-in auto-compaction is disabled. **You MUST implement a real compaction strategy.** A no-op here silently disables overflow recovery for your agents.
- **`ownsCompaction: false`** — you delegate to the runtime. Your `compact()` should call `delegateCompactionToRuntime(params)`. Safer default if you're prototyping.

**A no-op `compact()` with `ownsCompaction: true` is one of the sharpest footguns in the plugin API.** It looks fine until your agent hits context overflow and silently fails. If you don't want to implement compaction, set `ownsCompaction: false`.

## Customization checklist

1. Rename `example-context-engine` everywhere
2. Decide: `ownsCompaction: true` or `false`?
3. Implement `ingest()` — where do you persist per-message state?
4. Implement `assemble()` — your retrieval / selection strategy given a token budget
5. Implement `compact()` — real summarization (or delegate to runtime)
6. Add monitoring: log token counts in and out of `assemble()` to catch budget drift

## Testing

```bash
openclaw plugins install -l ./
openclaw gateway restart

# Attach the engine to an agent in openclaw.json:
# "agents": { "<agent>": { "contextEngine": "example-context-engine" } }

# Watch how it performs
tail -f ~/.openclaw/logs/commands.log
openclaw session tokens --agent <agent>
```

Run sessions at several context depths — new session, 50 messages, 200 messages, overflow. Each transition exposes different bugs.

## Security notes

A context engine sees everything the agent thinks. Treat the session data it handles like credentials:

- **Don't log raw message contents** unless the user opted in
- **Don't send session data over the network** without an explicit config flag
- **Pin your embedding/vector-store dependencies**
- **Document every external call** `ingest()` and `assemble()` make

## See also

- `../plugin-skeleton/` — general-purpose skeleton
- `../plugin-skeleton-channel/` — channel variant
- `../plugin-skeleton-hook-only/` — policy-only variant
- `references/authoring-plugins.md` — `ownsCompaction` section in particular
- `references/memory-system.md` — memory backend options
