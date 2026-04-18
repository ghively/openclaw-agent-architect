# Post-Install Monitoring Checklist

You installed a community skill or plugin. The pre-install audit caught what it could. These checks are how you catch what it couldn't — drift, latent behavior, and slow-burn abuse.

Run the first-week block every day for 7 days after install. Run the ongoing block weekly, forever.

---

## First week after install

### Day 1 — immediately after first use

- [ ] `openclaw security audit --deep --json > /tmp/post-install.json`
- [ ] `diff ~/.openclaw/security-audit-baseline.json /tmp/post-install.json` — any new findings?
- [ ] `openclaw plugins inspect <id>` — registered tools + hooks still match what you expected?
- [ ] Tailed the session transcript of the first real use: `tail -f ~/.openclaw/agents/<agentId>/sessions/<current>.jsonl | jq`
- [ ] No unexpected outbound URLs in the session
- [ ] No unexpected exec calls in the session
- [ ] No prompts modified in ways you didn't expect (if the plugin registers `before_prompt_build`)

### Days 2–7 — daily sampling

- [ ] Sample one recent session per agent per day: `ls -t ~/.openclaw/agents/*/sessions/*.jsonl | head -3`
- [ ] `jq '.[] | select(.type == "tool_use") | .name' <session>` — tool calls look reasonable?
- [ ] `jq '.[] | select(.type == "tool_use" and .name == "web_fetch") | .input.url' <session>` — every outbound URL explainable?
- [ ] `~/.openclaw/logs/commands.log | tail -200` — any exec commands you didn't expect?
- [ ] Any approval prompts that surprised you? (a well-behaved plugin shouldn't trigger many.)

---

## Ongoing — run weekly

### Plugin / skill drift

- [ ] `openclaw plugins list --outdated` — which plugins have new versions?
- [ ] For each outdated plugin: run the `upgrade-audit.md` checklist before bumping
- [ ] `openclaw skills list --managed --json | jq '.[].version'` — snapshot versions, compare to last week's snapshot

### Behavior drift

- [ ] Grep sessions for new patterns: `grep -rh '"name":' ~/.openclaw/agents/*/sessions/*.jsonl | sort | uniq -c | sort -rn | head -20` (most-used tools this week)
- [ ] Compare to last week's snapshot — any tool usage shifted dramatically?
- [ ] Look at heartbeat / cron run tails: `openclaw cron runs --limit 20 --json | jq '.[] | {job, status, duration}'`
- [ ] Any job runs that succeeded but produced unusual output volume?

### Exfiltration smell-test

- [ ] Unique outbound URLs, last 7 days:
      `grep -rh '"url":' ~/.openclaw/agents/*/sessions/*.jsonl | grep -oE 'https?://[^"]+' | sort -u`
- [ ] Cross-check against your known-good list (first run established this list)
- [ ] Any new domain? Investigate before approving

### Audit trail health

- [ ] `command-logger` is still enabled: `openclaw hooks list | grep command-logger`
- [ ] `~/.openclaw/logs/commands.log` is actually being written: `stat -c %y ~/.openclaw/logs/commands.log`
- [ ] Log not silently rotating at the wrong size

---

## Red flags during monitoring — investigate immediately

- **New outbound domain** the plugin wasn't advertised to use
- **Sudden drop** in approval prompts for a plugin that previously asked for them (may indicate skill allowlist change or autoAllowSkills flip)
- **Exec command patterns** with encoded payloads (`base64 -d`, hex decode)
- **Session transcripts** where tool calls happen but the user-facing reply doesn't acknowledge them
- **Cron jobs** that start succeeding after repeated failures without you fixing anything
- **Command log** silently truncating or missing entries for hours at a time
- **Plugin hooks** registering that weren't visible at install (re-run `plugins inspect`)

---

## Automate this

A minimal cron job that runs the critical checks daily and pings you on any deviation:

```bash
# ~/.openclaw/cron/daily-post-install-check.sh
set -e
openclaw security audit --deep --json > /tmp/today-audit.json
diff -q ~/.openclaw/security-audit-baseline.json /tmp/today-audit.json \
  || openclaw message "⚠️ audit drift detected — investigate"
```

Register it:
```
openclaw cron add --name daily-audit --schedule "0 7 * * *" --cmd '~/.openclaw/cron/daily-post-install-check.sh'
```

---

## See also

- `pre-install.md` — the one-time audit at install
- `upgrade-audit.md` — when a plugin or skill version bumps
- `quarterly-reaudit.md` — deeper periodic sweep
- `incident-response.md` — what to do if something's wrong
