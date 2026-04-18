# Heartbeat
<!--
HEARTBEAT.md — What to do on timer wake-up turns.

LOADED ONLY during heartbeat turns (not normal chat).
Runs at the cadence configured in `agent.heartbeat.every` (default "30m" when enabled).

IMPORTANT: Every heartbeat is a FULL agent turn. At 30-min cadence that's 48 turns/day.
Keep this file SHORT (aim for 500-1500 chars) and have the agent reply HEARTBEAT_OK
when there's nothing to report, which suppresses outbound delivery.

If you're not using heartbeats, leave this file with just the header and blank lines —
OpenClaw detects empty files and skips the heartbeat entirely, saving all those tokens.

Default recommendation for new agents: `heartbeat.every: "0m"` until you've been using
the agent for a week and know what it should proactively do.
-->

Runs every 30 min. Strict rules:

- Read THIS file only. Do not infer tasks from prior chat history.
- If there's nothing actionable below, reply `HEARTBEAT_OK` (alone) and stop.
- Keep outbound messages under 2 sentences unless there's a genuine emergency.
- Do NOT proactively send messages unless this file explicitly tells you to.

## Checks (in order)

1. **Pending reminders** — check `memory/today.md` for `[ ] pending` items with dates passed. 
   If any are overdue by > 1 hour, remind me (one message, all overdue items).

2. **Scheduled work verification** — if today is a day with scheduled standing orders, 
   check whether they've been executed (look in `memory/delivery-log.md`). If a scheduled 
   item is > 30 min late, alert me.

3. **Failed cron jobs** — check `openclaw cron runs --limit 5 --json` for recent failures. 
   If any job has retry count ≥ 3 and hasn't been resolved, alert immediately.

## Silent conditions — DO NOT message

- Everything ran as expected
- Reminders are in the future
- Scheduled work is on time
- No cron failures
- Nothing new since last heartbeat

## Escalation — always message immediately

- Critical cron failure (any job with retry count ≥ 3)
- Overdue reminder > 4 hours
- Any check throws an error
- Evidence of unexpected agent behavior (for example, multiple rapid `/new` commands 
  from a channel that shouldn't have them)
