# Boot
<!--
BOOT.md — executed on gateway startup by the `boot-md` bundled hook.

NOT injected every turn. It's a one-shot script-like file the gateway runs once,
each time the gateway process starts.

Use cases:
  - Re-index a memory collection that wasn't cleanly persisted
  - Re-run a skill install / sync step
  - Emit a "gateway back up" message to a specific channel
  - Check external dependencies (VPN up? NAS reachable?) and log to commands.log

Must enable the hook first:  `openclaw hooks enable boot-md`

Guidance:
  - Keep it short. Boot is not for daily work — schedule that with `cron`.
  - Idempotent only. Running boot 10x in a row should do the same thing as once.
  - Do not exit the process even if a step fails — report and continue.
  - If you need per-agent startup behavior, put it in that agent's AGENTS.md
    as a standing order triggered by `sessions_start`, not here.

Edit cadence: rarely. Startup logic is a smell when it grows.
-->

## On boot

Execute the following checks in order. Report each result to the default channel.

### 1. Gateway health
- `openclaw status` — confirm reachable
- `openclaw security audit --deep --json | jq '.findings.critical'` — must be empty

### 2. External dependencies
<!-- Delete section if not applicable -->
- <e.g. `ping -c 1 my-nas.local`>
- <e.g. `tailscale status | grep -c active`>

### 3. Optional: announce startup
<!-- Delete section if you don't want a startup announcement -->
- Send one-line message to <channel>: "🚀 Gateway up at $(date -u)"

### Failure handling
- Any step fails → log to `~/.openclaw/logs/commands.log` as `boot-md FAILED: <step>`
- Do NOT retry automatically — retries on boot mask real problems
- Do NOT block gateway startup — report and continue

<!--
That's the template. Common additions:

- Re-sync a git-backed workspace: `(cd ~/.openclaw/workspace && git pull --ff-only)`
- Warm a long-load memory index: `openclaw memory reindex`
- Run a skill from boot: `openclaw skills run <slug>` (use sparingly; skill authors usually
  don't expect their skill to be called headless)

Do NOT use boot to:
- Do recurring scheduled work → use `cron` instead
- Process events → use webhooks instead
- Send routine status messages → use a cron job that can fail loudly
-->
