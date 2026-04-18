# Research Discipline — When You Don't Know, SAY SO and Go Check

This is the canonical home for the research-discipline rule. SKILL.md summarizes it briefly; this is the full treatment — *when* to research, *how*, *what* to fetch, and *why* this rule exists as a first-class discipline rather than a suggestion.

OpenClaw evolves rapidly. This skill's references are thorough but not exhaustive, and the system's capabilities change between releases. Confidently citing stale detail damages user trust and produces wrong builds. Research pauses are cheap; stale answers are expensive.

Pair with: SKILL.md "Research discipline" section (brief version).

---

## When you MUST research

Fetch from the docs (via `web_fetch` or `web_search`) whenever:

- User asks about a **specific capability** you're not sure is still supported or has changed.
- User mentions a **channel, MCP server, model provider, or tool** you don't have detailed memory of.
- User asks about **config fields or CLI flags** you'd be guessing on.
- User describes a **workflow** and you're unsure which OpenClaw pattern fits.
- User asks about an **external service** (Synology API, Telegram bot API, a specific MCP server, etc.) whose current behavior matters.
- User asks about **version-specific behavior**.

When in doubt: fetch. The cost of a research pause is lower than the cost of confidently citing a stale detail.

---

## Know what's stable vs. version-volatile

Not everything warrants a pause. Keep this mental map:

**Stable — answer from references without fetching:**

- Agent design rules (plan mode, build tracks, the six AGENTS.md sections, three-layer exec-approvals).
- The shape of SOUL.md vs. AGENTS.md (voice vs. procedure).
- The memory-file conventions (MEMORY.md / daily / DREAMS).
- The Execute-Verify-Report pattern.
- Cross-cutting principles #1–16.

**Version-volatile — fetch fresh:**

- Exact CLI flag names.
- Current model IDs and pricing.
- Specific hook event names added in recent releases.
- Plugin manifest schema changes.
- Whether a specific MCP server is currently in ClawHub.
- Any config field you aren't 100% sure is spelled right.

If you're unsure which category you're in, fetch. Recovering from a wrong flag name mid-build is painful.

---

## Primary sources, in priority order

Start at the top, descend as needed:

1. **`https://docs.openclaw.ai`** — OpenClaw-specific details (always start here)
2. **`https://docs.openclaw.ai/cli/*`** — CLI command details
3. **`https://docs.openclaw.ai/concepts/*`** — architecture questions
4. **`https://docs.openclaw.ai/channels/<name>`** — specific channel features
5. **`https://docs.openclaw.ai/providers/<name>`** — model provider details
6. **`https://docs.openclaw.ai/plugins/*`** — plugin SDK / manifest details
7. **`https://github.com/openclaw/openclaw`** — examples, source, issues
8. **`https://clawhub.ai`** — community skills and plugins
9. **The upstream service's own docs** for external APIs (Telegram, Synology, etc.)

---

## Scripts — admitting uncertainty gracefully

The exact phrasing matters less than the transparency.

**Generic:**
> "I want to make sure I don't get this wrong from memory — let me check the current docs on [specific topic] before we proceed. One moment."

**During elicitation, when the user drops a specific:**
> "You mentioned [specific thing]. I want to make sure I'm not making this up from memory — let me check the current docs before we proceed. Is that OK?"

**When several uncertain items pile up in one turn:**
> "Let me check a few things at once — the Telegram bot permission model, the current Opus pricing, and whether the Synology MCP still ships with the 1.x breaking change. One moment."

Then fetch, read, answer precisely. Tell the user what you checked — "I just pulled the channel docs and confirmed X still works the way I thought, but Y changed in 0.22." Transparency is the product.

---

## Batch research; don't pause per dimension

If you hit **multiple uncertain items in the same turn** — a channel, an MCP server, and a model ID, for example — batch them into a single research pass rather than three sequential pauses.

Open a few `web_fetch` calls in parallel if available, or announce a single batched pause. **A single batched research pause feels responsive; three sequential ones feel like stalling.**

Reserve the per-dimension pause for when a later answer meaningfully depends on an earlier one — if you need to know the channel before you know which auth model applies, that's a sequential pause, not a batching failure.

---

## Always

- **Cite what you found** when it's relevant to the user's decision. "Just checked — `tools.exec.ask` is still the current flag; `on-miss` is the right value for what you want."
- **Offer to fetch more detail** when the decision hinges on specifics the user hasn't provided yet.
- **Pause design work to research** rather than charging forward with guesses.
- **Tell the user you researched** — it builds trust, and they can verify.

## Never

- **Guess at specific config field names** ("maybe it's `session.timeout`... or is it `agent.sessionTimeoutSeconds`?"). If you don't remember, fetch.
- **Invent CLI flags** that sound plausible. OpenClaw CLI naming is not always intuitive; guessing produces wrong builds.
- **Describe behavior of an MCP server or channel** you've never actually looked at. Fetch its README.
- **Answer "yes, that's supported"** when you're genuinely unsure.
- **Design around assumed capabilities** without verifying.

---

## Why this rule exists as a first-class discipline

Three reasons:

### 1. OpenClaw moves fast

The project ships multiple times a week. CLI flags rename, hooks get added, manifest schemas extend. A confident answer from six months ago is a wrong answer today. The discipline isn't "be humble"; it's "calibrate your confidence to the freshness of your information."

### 2. The user can't tell the difference without being told

From the user's perspective, a confidently-wrong answer and a researched-right answer look identical *at the moment you give them*. The difference surfaces hours or days later when the command they typed from your answer fails. By then they've lost trust and an hour of work. Telling them "let me check" is the only way they can tell which kind of answer they're getting.

### 3. Stale answers produce wrong architectures

This matters more than single-answer errors. A plan built on an assumed-but-stale capability ("I think the Matrix channel supports reactions") can derail the whole design. Catching the assumption at plan-mode research-check time is cheap; catching it at build-mode test time is expensive.

---

## Research during elicitation — an extra note

During requirements elicitation, users mention services, tools, and APIs you may not know well. The temptation is to nod along and fit them to a pattern you DO know.

Don't. Verify specifically that what the user describes is what they'll actually get. The sketch "Telegram has pairing tokens" is stable enough to answer from; the specific "does Telegram support voice messages as input?" is worth a research pause because the answer drives whether the design needs speech-to-text.

During elicitation, research pauses are especially low-cost — the user already expects you to be probing for detail, and a two-minute fetch fits naturally into "let me confirm before we keep going."

---

## See also

- SKILL.md "Research discipline" — the brief normative version
- `references/plan-mode.md` — where research discipline lives inside the plan-mode contract
- `references/requirements-elicitation.md` — elicitation-specific scripts (consolidated here)
