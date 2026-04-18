# Heartbeat Cost Calculator

Heartbeat is the #1 source of silent cost growth in long-lived agents. An agent "thinking" every 30 minutes, 24 hours a day, runs 48 turns a day you didn't ask for. At 30k tokens per turn that's 1.44M tokens/day. At a Sonnet rate that's real money.

This worksheet translates cadence → weekly cost so you can decide what your background loop is worth.

Pair with: `references/automation-and-hooks.md` (heartbeat design), SKILL.md principle #12 (automation-priority order: alarm → cron → heartbeat).

---

## The formula

```
turns_per_day  = 1440 / cadence_minutes
tokens_per_day = turns_per_day × tokens_per_turn
cost_per_week  = tokens_per_day × 7 × $/token
```

A default heartbeat turn burns **~30k tokens** (system prompt + memory seed + recent session context + tool definitions + one model call). This drifts up as your agent grows.

---

## Pre-computed table (30k tokens/turn, Sonnet 4.6 pricing ≈ $3/M input + $15/M output, 80/20 split ≈ $5.4/M blended)

| Cadence | Turns / day | Tokens / week | Weekly cost (blended) | Feel |
|---------|-------------|---------------|-----------------------|------|
| 0m (off) | 0 | 0 | $0 | The default. |
| 60m | 24 | 5.04M | ~$27 | "Hourly nudge." Cheapest non-zero. |
| 30m | 48 | 10.08M | ~$54 | Classic "always-on assistant." Watch this. |
| 15m | 96 | 20.16M | ~$109 | Starts eating your monthly model budget. |
| 10m | 144 | 30.24M | ~$163 | Usually wrong; you want a cron. |
| 5m | 288 | 60.48M | ~$327 | Almost always wrong; rethink. |
| 1m | 1440 | 302.4M | ~$1,633 | Never intentional. Bug or a test left on. |

Halve the numbers if your turns are closer to 15k tokens. Double them if your agent carries a fat 60k context every turn.

---

## Decision: do I need heartbeat at all?

Principle #13 ordering:

```
alarm  →  cron  →  heartbeat
```

Try in this order:

1. **Alarm** — "wake me when X happens" (a webhook, a file change, a channel message). Zero idle cost. Use whenever the trigger is external.
2. **Cron** — "do X at time Y or every Y minutes". Fixed cost per fire. Use when the trigger is timed but not conversational.
3. **Heartbeat** — "think about what's going on right now". Most expensive. Use *only* when you need the agent to re-evaluate full context without a specific event.

If you find yourself reaching for heartbeat, ask: can I express this as a cron that calls the agent with a specific prompt? If yes → do that instead.

---

## Cadence tuning

If you've concluded heartbeat is the right tool:

- **Start at `60m`.** You can always shorten.
- **Measure for one week** before tightening: count actual useful outputs vs. total turns. If < 10% of turns produce a useful action, cadence is too fast.
- **Tighten only with evidence.** Concrete moments where hourly missed something real.
- **Never go below `10m`** without writing the justification in `DESIGN-LOG.md` §6 and adding a budget alert.

---

## Budget guardrail (put this in your config)

```json
"heartbeat": {
  "every": "30m",
  "budget": {
    "tokensPerWeek": 15000000,
    "onExceed": "disable"
  }
}
```

When the guardrail fires, you learn. When it doesn't exist, you find out via invoice.

---

## Sanity checks

- If your gateway is idle overnight (you're asleep, no one's messaging), is heartbeat still firing? Usually yes. Consider an `active_hours` window.
- If your agent hasn't produced a single action from heartbeat in 7 days, turn it off. The ordering `alarm → cron → heartbeat` means heartbeat is the *last* resort.
- Heartbeat cost scales linearly with context size. Pruning memory (see `references/memory-system.md`) helps.

---

## See also

- `references/automation-and-hooks.md` — heartbeat / cron / alarm design
- `references/operating-live-agents.md` — how to monitor cost drift
- `assets/audit-checklists/quarterly-reaudit.md` — "heartbeat cost vs. last quarter" check
