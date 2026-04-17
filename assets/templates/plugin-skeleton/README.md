# Example Plugin — OpenClaw Plugin Skeleton

Starter template for building an OpenClaw plugin. Replace this README with a description of what your plugin actually does before publishing.

## What's here

- `package.json` — npm package metadata with `openclaw.extensions` pointing to the entry file
- `openclaw.plugin.json` — plugin manifest (id, version, minVersion, etc.)
- `index.ts` — entry point with `definePluginEntry` registering a tool and two hooks
- `tsconfig.json` — TypeScript config for ESM + ES2022
- `README.md` — this file

## Quick start

```bash
# Install dependencies
npm install

# Link into your running OpenClaw gateway for development
openclaw plugins install -l ./

# Restart gateway
openclaw gateway restart

# Verify
openclaw plugins inspect example-plugin
# Should show the registered tool and hooks

# In chat, test the tool:
# "Use the example_echo tool with text 'hello world'"
```

## Customization checklist

1. Change `package.json`:
   - `name` to your scoped package name
   - `description` / `author` / `homepage`
2. Change `openclaw.plugin.json`:
   - `id` (must match what you use for config keys)
   - `name`, `description`, `author`, `homepage`
3. Edit `index.ts`:
   - Update the `id` and `name` in `definePluginEntry` to match manifest
   - Remove the example tool if you don't need it
   - Remove hooks you don't use
   - Add your actual functionality

## Publishing

```bash
# ClawHub (preferred for discoverability)
npx clawhub publish . --slug my-plugin --version 0.1.0 --tags latest

# OR npm
npm publish --access public
```

## Security notes

This plugin runs in-process with the OpenClaw gateway. Treat it as trusted code — and if you're publishing, make it easy for OTHERS to audit:

- Pin your dependencies (no `^` or `~`)
- Avoid `postinstall` / `preinstall` scripts
- Document every hook you register and why
- Never hardcode secrets; use SecretRef or environment variables
- Never set `dangerously*` config defaults

See `references/security-audit.md` in the `openclaw-agent-architect` skill for the full audit checklist others will apply to your plugin.

## References

- Building plugins: https://docs.openclaw.ai/plugins/building-plugins
- SDK reference: https://docs.openclaw.ai/plugins/sdk-overview
- Plugin manifest: https://docs.openclaw.ai/plugins/manifest
- Hooks (all 27): https://docs.openclaw.ai/automation/hooks#complete-plugin-hook-reference
