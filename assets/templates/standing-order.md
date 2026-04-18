# Standing Order Template
<!--
A single standing order in canonical form. Drop-in to the "Standing orders" section of
AGENTS.md — copy this block, rename "Program: <Name>", fill in each subsection.

A standing order is PERSISTENT AUTHORITY encoded in AGENTS.md. It tells the agent "when
X happens, do Y, with these bounds, and escalate Z." Each program should be testable:
a human reading the block should know, without guessing, what the agent is allowed to
do and what it must ask about.

A good standing order:
  - Has a clear single trigger (cron schedule / event / user phrase)
  - States authority in one sentence
  - Names an approval gate (or declares "none, by exception")
  - Lists 3–7 execution steps (not a novella)
  - Has a "Never" list — the hard constraints this program must not cross
  - Has an escalation path — what condition forces an immediate user alert

A standing order is NOT:
  - A skill (one-off task the agent picks up when asked)
  - A tool policy (that's in config, not prose)
  - A voice rule (that's SOUL.md)

Rule of thumb: if you can express it as "at T, do X, except if Y, then escalate to Z",
it's a standing order. Otherwise it probably belongs in a skill or in config.
-->

### Program: <Name in Title Case>

**Authority:** <one sentence — what the agent is explicitly empowered to do without per-run approval>
<!-- e.g. "Restart services on the homelab allowlist (homeassistant, pihole, jellyfin) when health checks fail." -->

**Trigger:** <specific — cron schedule, event name, or user phrase>
<!-- e.g. "Cron: `0 */6 * * *` (every 6 hours)" or "User says 'check homelab'" -->

**Approval gate:** <one of: None / User approval required / Approval only for anomalies / Approval for out-of-allowlist targets>
<!-- e.g. "None for in-allowlist services; approval required for any restart outside the allowlist." -->

**Escalation:** <what condition sends an immediate user alert, not just a report>
<!-- e.g. "Same service fails health check 3 consecutive runs → alert with last 100 lines of journalctl." -->

**Budget:** <optional — cost/time/resource ceilings>
<!-- e.g. "Max 3 service restart attempts per 6-hour window." -->

### Execution steps

1. <concrete action — name the tool>
2. <concrete action — name the tool>
3. <concrete action — how results are delivered; named channel / format>

### Never

- <hard constraint 1 — what this program must not do under any circumstance>
- <hard constraint 2>
- <hard constraint 3>

<!--
Real example — homelab health check:

### Program: Homelab Health Check

**Authority:** Check status and restart services on the allowlist (homeassistant, pihole,
jellyfin). Read `journalctl` for any enumerated service.

**Trigger:** Cron `0 */6 * * *` (every 6 hours); also on user phrase "check homelab".

**Approval gate:** None for in-allowlist restarts. Approval required for any service
outside the allowlist or any config change.

**Escalation:** Same service fails 3 consecutive health checks → alert via Telegram DM
with last 100 lines of journalctl and current `systemctl status`.

**Budget:** Max 3 restart attempts per service per 6-hour window.

### Execution steps
1. Run `systemctl status <service>` for each service in allowlist (via `exec`).
2. For any service in "failed" or "inactive" state: `systemctl restart <service>`.
3. Re-check status 10 seconds after restart.
4. Report: table of (service, before, after). Deliver to Telegram DM.

### Never
- Restart services outside the allowlist without explicit approval.
- Stop a service (only restart).
- Install or update packages.
- Modify configuration files.
-->
