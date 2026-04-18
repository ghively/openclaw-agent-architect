# Quarterly Re-Audit Checklist

Every 3 months, spend 45 minutes re-auditing the whole gateway from scratch. Plugins, skills, configs, and mental model drift. This is the scheduled forcing function.

Book it as a recurring calendar event. Don't rely on remembering.

---

## 1. Baseline refresh (10 min)

- [ ] `openclaw security audit --deep --json > ~/.openclaw/security-audit-baseline-$(date +%Y-%m-%d).json`
- [ ] Diff against last quarter's baseline — did new critical findings appear between audits?
- [ ] If yes, did post-install-monitoring catch them at the time? If no, add a monitoring rule.

---

## 2. Inventory reconciliation (10 min)

### Plugins

- [ ] `openclaw plugins list --json | jq '.[] | {id, version, author, homepage}'`
- [ ] For each: do I still USE this? (check session transcripts for invocations in the last 30 days)
- [ ] Any plugin that hasn't been invoked in 90 days → **uninstall candidate**
- [ ] Any plugin whose author has gone quiet (no commits, no releases, no replies to issues) → **flag**
- [ ] Any plugin whose author's GitHub / npm identity has changed ownership → **flag and investigate**

### Skills

- [ ] `openclaw skills list --managed --json`
- [ ] For each: has it triggered in the last 90 days?
- [ ] Never-triggered skills: consider removing (each costs listing tokens)
- [ ] Update slugs to latest version where you've observed no behavior change

### MCP servers

- [ ] For each connected MCP server: pin the version in your config (if it isn't already)
- [ ] Check upstream repo for security advisories
- [ ] Verify the tool surface hasn't silently expanded (`openclaw mcp tools <server>`)

---

## 3. Policy posture (10 min)

- [ ] Re-read your `openclaw.json` top-to-bottom — does every setting still reflect your actual use?
- [ ] Dangerous-flag scan: `jq '.. | objects | select(has("security") or has("autoAllowSkills") or has("strictInlineEval"))' ~/.openclaw/openclaw.json`
- [ ] Any `dangerously*: true`? Justification still documented in DESIGN-LOG.md §6? If not → **fix or revert**
- [ ] Channel `dmPolicy` — still correct? (Owner-only agents should never be `open`.)
- [ ] `exec-approvals.json` Layer 2 — any entry you haven't used in 90 days? (remove it; if you need it back, you'll know)
- [ ] `exec-approvals.json` Layer 3 — any auto-allows that crept into Layer 3 via `--add`?

---

## 4. Memory hygiene (5 min)

- [ ] `wc -c ~/.openclaw/workspace/MEMORY.md` — still under 5 KB?
- [ ] `ls ~/.openclaw/workspace/memory/ | wc -l` — how many daily files? (consider pruning or moving to DREAMS after 90 days)
- [ ] `du -sh ~/.openclaw/agents/*/sessions/` — session store growing unboundedly?

---

## 5. Automation health (5 min)

- [ ] `openclaw cron runs --limit 50 --json | jq '.[] | select(.status != "ok")'` — any job has failed more than once in 90 days?
- [ ] Heartbeat cost (if enabled): did you still need it? It's the #1 cost over time; if idle, disable.
- [ ] Standing orders in AGENTS.md — still matching observed behavior? Any program in AGENTS.md whose trigger never fires?

---

## 6. DESIGN-LOG.md update (5 min)

- [ ] Open the agent's `DESIGN-LOG.md` (workspace, not bootstrap)
- [ ] Append a `### YYYY-MM-DD — quarterly re-audit` block documenting anything you changed above
- [ ] Update the "Known-open risks / next tunings" section based on what the quarter revealed

---

## Red flags — stop and investigate

- **Plugin ownership changed** (GitHub org transferred, npm scope moved)
- **New tool appeared** in `plugins inspect` that wasn't there last quarter
- **exec-approvals.json** grew by more than a few entries without your conscious edits
- **Session store** has sessions from agents you thought were decommissioned
- **Command log** has gaps lasting > 1 hour during times the gateway was up
- **Heartbeat** cost this quarter dramatically higher than last quarter
- **A skill** that was never-invoked suddenly started firing

---

## See also

- `pre-install.md` — one-time install audit
- `post-install-monitoring.md` — weekly monitoring
- `upgrade-audit.md` — version-bump audit
- `incident-response.md` — what to do when something's wrong
