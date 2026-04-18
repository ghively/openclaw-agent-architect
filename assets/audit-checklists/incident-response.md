# Incident Response Runbook

Something is wrong. A plugin is behaving oddly, an exfil signal tripped, an audit finding appeared out of nowhere, a cron job did something you didn't sanction. You need to act now, not read a skill reference.

This is the 7-step runbook. Work top to bottom. Do NOT skip steps.

---

## Step 1 — contain (first 2 minutes)

**Stop the bleeding before you investigate.** In order:

- [ ] Stop the gateway process
```
# macOS
launchctl unload ~/Library/LaunchAgents/ai.openclaw.gateway.plist
# Linux / systemd
systemctl --user stop openclaw
# Or: just kill -TERM <pid>
```

- [ ] Bind to loopback only (edit `~/.openclaw/openclaw.json` → `gateway.host: "127.0.0.1"`)

- [ ] Disable any Tailscale Funnel / Serve / Cloudflare tunnel that exposes the gateway externally

- [ ] Disable risky channels — set `channels.<channel>.dmPolicy: "disabled"` on anything that accepts inbound from strangers; remove any `"*"` allow-alls

- [ ] DON'T restart the gateway yet — you'll want to investigate the state as-is first

---

## Step 2 — snapshot state (next 5 minutes)

Before you touch anything, preserve evidence.

- [ ] `cp -r ~/.openclaw ~/.openclaw.incident-$(date +%Y-%m-%dT%H%M%S)`
- [ ] `ps aux | grep -i openclaw > ~/.openclaw.incident-*/ps-snapshot.txt`
- [ ] `netstat -an | grep LISTEN > ~/.openclaw.incident-*/netstat-snapshot.txt`
- [ ] `tail -1000 ~/.openclaw/logs/commands.log > ~/.openclaw.incident-*/commands-tail.log`
- [ ] `find ~ -newer ~/.openclaw.incident-*/ -type f -not -path '*/\.git/*' -not -path '*/node_modules/*' 2>/dev/null > ~/.openclaw.incident-*/recent-files.txt` (catches files written since the snapshot started)

---

## Step 3 — uninstall the suspect (next 5 minutes)

If you have a hypothesis about which plugin or skill is the problem:

- [ ] `openclaw plugins uninstall <id>` (or `openclaw skills remove <slug>`)
- [ ] Verify removal: `openclaw plugins list` and `openclaw skills list`
- [ ] Check that the plugin's files actually left: `ls ~/.openclaw/plugins/<id>/` should 404

If you don't have a hypothesis, skip this step — don't thrash uninstalling things.

---

## Step 4 — rotate, assuming compromise (next 10 minutes)

**Treat the gateway as compromised until proven otherwise.** Rotate:

- [ ] Model API keys (Anthropic console → create new key → update config → revoke old key)
- [ ] Channel credentials (regenerate Telegram bot token, Slack OAuth, Discord bot token, etc., per channel paired on this gateway)
- [ ] Any SSH / cloud / API tokens the plugin or skill could have read from env or config
- [ ] Gateway auth (re-pair approval UI, rotate any shared secrets)

Yes, this is inconvenient. Yes, do it anyway. Credentials are cheap; investigating later to find out they were exfiltrated is expensive.

---

## Step 5 — assess damage (next 30+ minutes)

Now that you're contained and rotated, investigate.

### Session transcripts

- [ ] `find ~/.openclaw.incident-*/agents/*/sessions -name '*.jsonl' | xargs jq '.[] | select(.type == "tool_use")' | jq -s 'sort_by(.input) | unique_by(.name + (.input|tostring))'`
- [ ] Look for tool calls that don't match expected agent behavior
- [ ] Grep every outbound URL: `jq '.[] | select(.type == "tool_use" and .name == "web_fetch") | .input.url' <session> | sort -u`
- [ ] Cross-reference against the baseline — new domains?

### Gateway log

- [ ] `cat /tmp/openclaw/openclaw-*.log | grep -iE 'error|warn|denied|failed'`
- [ ] Patterns of denied attempts that stopped being denied (could mean policy change)

### Exec log

- [ ] `~/.openclaw.incident-*/commands-tail.log` — every exec call, sorted by command
- [ ] Any command with encoded payloads, hex, base64 decode chains
- [ ] Any `curl` / `wget` / `scp` / network-capable binary invoked with an external target

### Filesystem

- [ ] Review `recent-files.txt` — anything written to `~/.ssh/`, `~/.aws/`, `~/.kube/`, `~/.openclaw/credentials/`, dotfiles in `$HOME`?

### Config

- [ ] `git -C ~/.openclaw/workspace log --all --since='7 days ago'` (if workspace is git-backed)
- [ ] Any commits to SOUL.md / AGENTS.md / config that you didn't make?

---

## Step 6 — recover (next hour)

- [ ] Start from a known-good state. If you have a `~/.openclaw.backup.<date>` from before the incident, restore that.
- [ ] If no backup, rebuild config from DESIGN-LOG.md §6 (security baseline) and your documented component list.
- [ ] Re-install only the plugins and skills you've re-audited against the upgrade-audit checklist.
- [ ] Do NOT re-install the suspect plugin/skill until you understand what it did.
- [ ] Restart gateway with `sandbox.mode: "all"` and `workspaceAccess: "none"` until you're confident.
- [ ] Run `openclaw security audit --deep`. Clean baseline before you un-harden.

---

## Step 7 — report and learn

### Report upstream

- [ ] If a third-party plugin or skill was the vector: file a security issue with the maintainer (private channel if one exists)
- [ ] If it was published on ClawHub: report via `clawhub report --slug <slug> --reason security`
- [ ] If severe (supply chain, likely affecting others): email `security@openclaw.ai` with a timeline and your snapshot bundle (redact credentials)

### DESIGN-LOG.md

- [ ] Append `### YYYY-MM-DD — INCIDENT: <short description>` to §7
- [ ] What happened, what you did, what you changed afterward
- [ ] Rollback verification: confirm the system now behaves as intended

### Prevention

- [ ] Add a `before_install` policy rule to prevent the specific class of install next time
- [ ] If a monitoring check would have caught it earlier, add that check to `post-install-monitoring.md` and actually wire it into a cron job

---

## Timing targets

| Step | Target | Notes |
|------|--------|-------|
| 1. Contain | 2 min | Stop gateway + bind loopback first |
| 2. Snapshot | 5 min | Don't skip — state gets overwritten |
| 3. Uninstall | 5 min | Only if you have a hypothesis |
| 4. Rotate | 10 min | Credentials first |
| 5. Assess | 30+ min | Take as long as you need here |
| 6. Recover | ~1 hr | Known-good baseline |
| 7. Report | same day | Before the details fade |

If step 5 surfaces evidence of exfiltration or code execution outside the gateway, this is no longer just a gateway incident — treat it as a host compromise. Rotate broadly, reimage if stakes warrant.

---

## See also

- `pre-install.md` — avoiding incidents in the first place
- `post-install-monitoring.md` — catching them early
- `references/security-audit.md` — the deeper threat model
- Contact: `security@openclaw.ai` for severe / supply-chain issues
