# Channel Plugin Skeleton

Starter for a plugin that adds a NEW messaging channel to OpenClaw — a platform the gateway can send to and receive from. Examples: Matrix, Mastodon, SMS-via-carrier, an in-house chat.

**Use this when:** you want to teach the gateway to speak a new protocol. Inbound messages become agent sessions; outbound agent replies route back to the user on that platform.

**Don't use this if:** you just want a custom tool (use `plugin-skeleton/`) or a hook-only policy plugin (use `plugin-skeleton-hook-only/`).

## What's here

- `index.ts` — uses `defineChannelPluginEntry` and `api.registerChannel(...)`
- `openclaw.plugin.json` — plugin manifest with `capability: "channel"`
- `package.json` — npm metadata
- `tsconfig.json` — TS config (same as base skeleton)

## The channel contract

Your channel registration must provide:

- `id` — stable string (used in `bindings[].channel` and config keys)
- `displayName` — shown in CLI output
- `send(target, content)` — deliver a message to a user on your platform
- `listen(onInbound)` — start accepting inbound; call `onInbound(msg)` per message
- `validatePeerId(id)` — how do you identify a user? (Telegram: chat ID, Mastodon: @user@instance)
- `dmPolicy` defaults — what should strangers be able to do by default?

Full API reference: https://docs.openclaw.ai/plugins/sdk-channel-plugins

## Customization checklist

1. Rename `example-channel` → your channel id everywhere (manifest, package.json, index.ts)
2. Implement `listen()` — connect to your platform (websocket, polling, webhook)
3. Implement `send()` — post outbound; handle errors, retries, attachments
4. Implement `validatePeerId()` — your platform's user-identifier format
5. Decide your **default `dmPolicy`**:
   - `pairing` (recommended) — only paired peers can DM the agent
   - `enabled` — anyone known to the channel can DM
   - `open` — anyone in the world (only for public bots; `dmPolicy: open` + Track B = never)
6. Add channel-specific config fields to `openclaw.plugin.json` under `configSchema`

## Security notes

Channels are the most sensitive plugin type. A channel plugin with a bug can expose the agent to the whole internet.

- **Default to `dmPolicy: "pairing"`**. Don't make users opt *in* to safety.
- **Validate inbound content size.** Trivially-rate-limit at the channel level before it hits the agent.
- **Never trust platform-supplied "user id"** without calling your own `validatePeerId` first — some platforms let users spoof.
- **Publish attachment size limits** loudly; most users will forget to set them.
- **Pin your SDK/transport dependencies.** An upstream breaking change can DoS every gateway using your channel.

Document each of these in your README before publishing.

## Testing in chat

```bash
# Install locally
openclaw plugins install -l ./

# Restart gateway
openclaw gateway restart

# Verify channel registered
openclaw channels list
# Should show your channel

# Pair a peer
openclaw channels pair --channel example-channel --peer <id>

# Check bindings route messages to the right agent
openclaw bindings list
```

## Publishing

Same as any plugin — see `references/authoring-plugins.md` → "Publishing" section.

## See also

- `../plugin-skeleton/` — general-purpose skeleton (tool + hooks)
- `../plugin-skeleton-context-engine/` — context engine variant
- `../plugin-skeleton-hook-only/` — policy-only variant
- `references/authoring-plugins.md` — full authoring reference
- `references/tool-policy-and-security.md` — channel security
