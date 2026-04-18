# Plan Mode — Deep Reference

The plan-mode contract is stated concisely in SKILL.md. This reference is for the *why*, the variants, and the edge cases — what the contract doesn't spell out but you need to know when plan mode starts feeling awkward.

Pair with: SKILL.md "The Plan-Mode Contract" section (the normative version), `references/requirements-elicitation.md`, `references/tweaking-existing-agents.md`.

---

## The three variants — full / abbreviated / quick-answer

Plan mode is always *on*. What varies is the ceremony.

### 1. Full plan mode — the default for new builds

Used for: "I want to build an agent", "design a system for X", first-time subagent design, anything where the target isn't a known artifact.

Shape:
- Seven-dimension requirements elicitation (`references/requirements-elicitation.md`)
- Threat model + success criteria
- Shape choice (one of the five architecture patterns)
- Track choice (A/B/C)
- 12-dimension architecture completeness review
- Component list
- Full approval gate

Duration: 60–120 minutes of real conversation for a non-trivial system.

### 2. Abbreviated plan mode — for tweaks to an existing agent

Used for: "the agent forgot my timezone", "it won't stop apologizing", "it picked the wrong tool yesterday".

Shape (`references/tweaking-existing-agents.md`):
- Reproduce the symptom
- Narrow to one of six diagnostic buckets (persona / procedure / memory / tool preference / policy / bloat)
- Confirm the specific change with the user
- Edit

The approval gate is still there, just scoped to the single change. "Pause before editing" and "user agrees to the specific change" — these ARE the plan-mode discipline carried through. Do NOT skip the gate because the change is small; that's how tweaks silently grow into re-architectures.

### 3. Quick-answer mode — no plan, no approval

Used only for:

- **Reference questions** — "What's the path for channel credentials?" Answer from `references/cheatsheet.md`.
- **Research questions** — "Does OpenClaw support X?" Look it up and answer.
- **Single-skill addition to a well-understood existing agent** — "Add a skill for calling wthr." Light touch (intent, dispatch mode, triggers, install spec) — still a micro-plan with micro-approval, but full system elicitation isn't needed.

When in doubt, escalate one level. The cost of asking "do you want me to plan this first?" is ~10 seconds. The cost of drafting files that don't fit is the whole conversation.

---

## The illustration line — what's allowed vs. what crosses into drafting

Plan mode forbids drafting files, code, and complete config blocks. It does NOT forbid *naming* a command, CLI flag, config field, or file path when the name is load-bearing for a decision the user has to make.

**Allowed (naming):**
> "We'd use `openclaw webhooks gmail setup` for this, not a heartbeat. The user needs to know the mechanism exists to evaluate it."

**Not allowed (drafting):**
> "Here's the command you'll run: `openclaw webhooks gmail setup --account me@ex.com --hook ./inbox.ts`"
>
> That's drafting.

**Rule of thumb:** naming a tool or field *clarifies a choice*; writing the invocation with arguments filled in *crosses into build mode*. When in doubt, pick the shorter, less prescriptive form.

Concretely:

| You can say | You can't say |
|-------------|---------------|
| "This belongs in `SOUL.md`." | Here's the SOUL.md I'd write: `# About me\n...` |
| "Use `sandbox.mode: all` for untrusted inbound." | Here's the config: `{ "sandbox": { "mode": "all" } }` |
| "Use a `before_tool_call` hook to enforce it." | Here's the hook: `api.registerHook("before_tool_call", async (e) => { ... })` |
| "Plug the `get_weather` tool via `registerTool`." | Here's the tool definition with parameters filled in. |

---

## Pacing — advance one decision at a time

In plan mode, advance **one major decision at a time** when the user is feeding you information incrementally. "One major decision" means a single requirements dimension, a single architecture step, or a single design step (pre-flight, SOUL, AGENTS, tool policy, etc.).

When the user batches multiple dimensions into one message ("I want an ops agent that monitors the Synology, runs on Telegram, uses Opus for destructive ops, and has cron reports"), **split their message by dimension and confirm each separately** rather than racing ahead:

> "I heard workload, channel, model, and automation in that message — let me confirm each before we move to shape."

This is guidance, not rigid lockstep. Don't insert ceremonial "Step 3 of 12" announcements; just keep decisions separable and confirm-able. The goal is that the user never feels steamrolled and can course-correct a single piece without unwinding five others.

---

## First-turn length tension

There's a tension between "advance one decision at a time" and "show the user where this is going before they've invested more effort."

When a user's opening prompt packs several dimensions into one message ("I want a Telegram homelab operator on Opus with cron reports and only-me access"), **resolve the tension by SKETCHING the full four-pass framework** (requirements → threat model → shape → track) in turn 1 so the user can see the road map — then explicitly invite incremental answers:

> "You don't need to answer all of this at once — start with dimensions 1 and 2, or the threat-model questions, whichever you have thoughts on first."

This is NOT the same as delivering a complete plan for approval. The approval gate is later. On turn 1 you're showing the route, not arriving.

---

## The approval gate — exact pattern

Before moving to build mode, present the complete plan and explicitly ask for approval:

> Here's the complete plan:
>
> [full architecture summary with all components, all dimensions addressed, all open questions resolved]
>
> Before I start drafting any files, I need your explicit approval. Review this plan and tell me:
> - Is anything missing?
> - Is anything wrong?
> - Ready to proceed to building?

**Wait for a clear "go" / "approved" / "let's build" / equivalent.** If the user says "looks good" or "sure", ask specifically:

> "Approved to start drafting files?"

Don't infer consent from hedging.

### Iteration

If the user makes changes, revise the plan and present it again for approval. You may iterate multiple times. **The plan must be CURRENT and COMPLETE at the moment of approval** — if they say "approved", what you're drafting next is the plan they just saw in full.

---

## Build verbosity — ask once at the transition

When the user approves the plan, before drafting the first file, ask:

> "Verbose build (narrate each step and explain each file) or quiet build (emit files + short summary + smoke tests)?"

Lock in the answer and stick with it. Verbose suits first-time builders; quiet suits operators who just want the artifacts. Don't re-ask per file.

---

## The optional DESIGN-LOG.md artifact

At the approval moment, you MAY offer to capture the final plan as a `DESIGN-LOG.md` in the workspace — requirements summary, threat model, chosen shape, build track, component list, security baseline, and an append-only decision log.

It is **NOT** injected every turn (keep it out of bootstrap) — it lives as a durable record for later tuning and audits.

Use `assets/templates/DESIGN-LOG.md` as the starting file; it includes a fully worked example ("Cortex" Track-B homelab operator) that shows what the filled-in artifact looks like across all sections. **Offer it; don't impose it.** Some users want it; some users find another record enough.

---

## Why the rule exists

The skill produces better output when it plans fully. Users who get files drafted mid-conversation end up with inconsistent systems — SOUL.md written before USER.md was decided, AGENTS.md referencing a skill that never got scoped, the memory architecture not matching the tool policy. Plan-then-build prevents this.

Users also frequently change their minds during elicitation ("oh, actually, I also want it to do X"). Catching those changes in plan mode is cheap. Catching them after files are drafted is expensive — SOUL.md's already there, AGENTS.md already references the wrong memory backend, the user feels bad "wasting" the drafted work.

The second-order effect: when plan mode is disciplined, users learn to think structurally about their own agents. They come back for the next agent already anticipating the requirements dimensions, already picking a track, already asking threat-model questions. Plan mode trains the user as much as it protects the build.

---

## Common mistakes (plan-mode-specific)

### Drifting into drafting

**Symptom:** You catch yourself writing `# About me\n- I live in...` mid-conversation. Or you drop a `{ "sandbox": { "mode": "all" } }` into a sentence.

**Cause:** The user asked "how would you word it?" or "what would that look like?" and you answered concretely.

**Fix:** Redirect. "We'd phrase it as a first-person durable statement — something about home location and role. I'll draft the exact wording after approval." Name the shape; don't fill it in.

### Inferring approval from vibes

**Symptom:** User said "cool" or "makes sense" and you started drafting. Two files in, they say "wait, I didn't actually approve that."

**Cause:** You treated acknowledgment as approval.

**Fix:** Always ask explicitly. "Approved to start drafting files?" It takes five seconds.

### Letting tweaks escape the gate

**Symptom:** User said "just fix X quickly" and you edited three files.

**Cause:** Abbreviated plan mode collapsed to zero-plan-mode.

**Fix:** Even small changes get a "here's what I'll change, ok?" before the edit. The gate scales, it doesn't disappear.

### Skipping the threat model

**Symptom:** The plan is complete, architecturally sound, and three weeks in the agent ran something dangerous because inbound was untrusted and exec was on.

**Cause:** Threat model was deferred to post-build and never returned to.

**Fix:** Threat model is a *plan-mode* step, not a build-mode afterthought. Run it before shape is chosen — see SKILL.md workflow step 3.

---

## See also

- SKILL.md "Plan-Mode Contract" — the normative version
- `references/requirements-elicitation.md` — the seven dimensions you cover inside plan mode
- `references/tweaking-existing-agents.md` — how abbreviated plan mode works in practice
- `assets/templates/DESIGN-LOG.md` — the optional durable artifact
