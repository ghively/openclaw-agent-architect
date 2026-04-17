# Requirements Elicitation — Discovery Before Design

Before you design anything for an OpenClaw system, understand what you're actually being asked to build. Users consistently under-describe their requirements — not out of carelessness, but because they don't know which details matter to the architecture.

Your job in this phase is to extract the full picture through structured questioning. Do NOT start drafting files, recommending agents, or picking models until this phase is substantially complete. Jumping to design with incomplete requirements produces wrong architectures that get rebuilt later.

## How to work through this with the user

**Pace:** 15-30 minutes of discovery conversation. Feels slow. Is worth it.

**Sequence:** Work through the seven requirement dimensions below, one at a time. Ask 2-4 questions per dimension. Summarize what you heard back to the user before moving to the next.

**Don't:**
- Skip questions because the user "seems to know what they want"
- Accept vague answers ("just a general assistant") — push for specificity
- Jump to solutions mid-elicitation ("that sounds like a skill...") — stay in discovery mode until the full picture is there
- Ask all questions as a wall-of-text checklist — work through them conversationally

**Do:**
- Reflect back what you heard after each dimension ("OK, so what I'm hearing is...")
- Call out contradictions or gaps ("You said X but also Y — which is it, or is it both?")
- When the user answers something specific that you don't know about from memory, say so and offer to research (see Research Discipline below)
- Use concrete examples to clarify abstract answers ("When you say 'monitor my homelab' — what specifically? Just uptime, or also logs, disk space, container health, certificate expiry?")

**What "done" looks like:** You have clear answers to every dimension below, or you've explicitly noted which are unknown/deferred. You can write a 1-paragraph summary of the system the user needs. The user has confirmed that summary is correct.

## The seven requirement dimensions

Work through these in order. Each has 2-4 sub-questions. Don't skip any dimension, even if the user seems to have answered some of it already — confirm explicitly.

**Pre-flight = dimensions 1 and 2.** These two alone give you enough to commit to a build track (A / B / C — see SKILL.md "Build tracks"). Dimensions 3–7 refine *components and policy within* the chosen track. It's fine to sketch a tentative track after dimensions 1–2 and then let the remaining dimensions confirm or challenge it. If dimensions 3–7 change your answer to "what authority does this agent need?", reopen the track choice; otherwise move forward.

### Dimension 1 — Purpose and users

What is this system FOR, and who interacts with it?

- **Primary purpose (one sentence):** "The system's job is to ___ for ___ on ___"
- **Who talks to it?** Just the user (single-user personal assistant)? The user + family? A team? Multiple isolated users?
- **Trust level of users:** All fully trusted? Partially trusted (family kids)? Untrusted-inbound possible (public group, email)?
- **What does success look like?** What would make the user say "this is working"?

If the user says "just me", confirm: no spouse, no kids, no coworkers, not even read-only? Because that changes EVERYTHING about trust and isolation.

### Dimension 2 — Workloads and tasks

What does the system actually DO? Not at a high level — specifically.

- **List every distinct job the user wants automated or assisted.** Push for at least 3-5 concrete examples.
- **For each job: is it reactive (user asks, system responds) or proactive (system acts on its own)?**
- **For each job: how often does it happen?** Continuous (heartbeat)? Scheduled (cron)? Triggered by event (email, webhook)? Ad-hoc (user-initiated)?
- **For each job: what's the input volume?** Short messages? Long documents? Live streams? File uploads?

This is where users under-describe the most. "Help me manage my inbox" could be:
- Reactive: "draft replies when I ask" (one skill, one agent)
- Proactive: "triage everything that arrives, draft responses for review, alert on urgent" (three distinct workloads — scheduled cron + triage logic + alert logic)

Extract the specifics. Don't let "manage my inbox" stand.

### Dimension 3 — Channels and surfaces

Where does the user interact with the system?

- **Which messaging channels?** WhatsApp, Telegram, Discord, Slack, iMessage, WebChat?
- **Primary vs secondary channels?** Is one the main way they talk to it, or do they want full parity?
- **Group chats involved?** Or DM-only?
- **Non-messaging surfaces?** Control UI (web), CLI, external HTTP webhooks, Gmail PubSub?

Channel decisions drive binding logic, group-chat mention patterns, and auth complexity. A single-channel system is simple. Multi-channel with different personas per channel is where multi-agent designs emerge.

### Dimension 4 — Data and context

What does the system need to know or remember?

- **Long-term memory:** What durable facts about the user? What about their business, homelab, family, preferences?
- **Working memory:** What context accumulates across a day / week / project?
- **Shared knowledge:** Are there structured knowledge sources (Obsidian vault, Confluence, GitHub wiki, internal docs)?
- **External data sources:** APIs it'll query, databases it'll read, files it'll parse?

The answer to "do you have a knowledge base it should know about" determines whether you want Memory Wiki, QMD backend with external collections, or just plain MEMORY.md + daily files.

### Dimension 5 — Tools and capabilities

What does the system DO in the world?

- **Read-only tasks:** Query, fetch, summarize, research?
- **Write/act tasks:** Send messages, modify files, run commands, execute deployments, post to external services?
- **Sensitive actions:** Anything involving money, deletion, publishing, sending to other people, credentials?
- **Existing integrations:** APIs the user already uses (Jira, GitHub, Notion, Synology, etc.)?
- **Custom CLIs:** Scripts or binaries the user has built/installed that the agent should know about?

This maps directly to tool policy, sandboxing decisions, exec approvals, and (critically) whether the system needs plugin tools vs skills vs MCP servers. Don't decide yet — just capture.

### Dimension 6 — Automation and timing

What happens WITHOUT the user being present?

- **Scheduled work:** Daily briefs, weekly reports, periodic health checks?
- **Event-driven work:** "When email arrives from X, do Y"? "When a webhook fires, do Z"?
- **Background monitoring:** Infrastructure alerts, status checks, polling?
- **Long-running jobs:** Things that might take hours (research, indexing, large summarization)?

This maps to cron jobs, heartbeats, webhooks, standing orders, and subagent patterns. Again — capture, don't decide.

### Dimension 7 — Constraints and non-functional

What limits or requirements matter?

- **Hosting:** Where will the Gateway run? Synology? VPS? Mac? Matters for sandbox, performance, network reach.
- **Budget:** Cost-sensitive? OK with premium models? Subagents on cheap tier?
- **Privacy:** Data stays local? Cloud APIs OK? Specific services off-limits?
- **Compliance / security posture:** Family member with device access? Shared workstation? Security-sensitive workplace?
- **Availability expectations:** 24/7? Business hours only? When on vacation?
- **Maintenance budget:** How much time per week can the user spend iterating on it?

A user who says "I want everything running 24/7 with no maintenance" is describing a different system than one who says "I'll happily tune this weekly."

## The summary step

After all seven dimensions, write a summary back to the user. Format:

```
Here's what I'm hearing:

PURPOSE: [1-sentence system purpose]
USERS: [who interacts with it]
WORKLOADS: [numbered list of distinct jobs]
CHANNELS: [primary + secondary]
DATA: [memory needs + external sources]
CAPABILITIES: [read-only / writes / sensitive]
AUTOMATION: [scheduled / event / background / interactive]
CONSTRAINTS: [hosting, budget, privacy, posture]

Before I design architecture — is this complete and correct? Anything I missed or got wrong?
```

Wait for confirmation or corrections. DO NOT move to architecture design until the user has confirmed the summary is accurate.

Iterate on the summary if the user corrects it. Two or three rounds of "no wait, also..." is normal and healthy — it means requirements are surfacing.

## Research discipline during elicitation

You will hit questions during elicitation where:
- The user mentions a specific tool/service you don't know current details about
- The user asks about a feature you're not sure is supported
- The user describes a workflow that needs specific OpenClaw capability you don't remember accurately
- A decision depends on current behavior of an external system (Telegram API, a specific MCP server, a cloud service)

When this happens: **SAY SO. Offer to research before continuing.**

Script pattern:
> "You mentioned [specific thing]. I want to make sure I'm not making this up from memory — let me check the current docs before we proceed. Is that OK?"

Then use `web_fetch` or `web_search` on:
- `https://docs.openclaw.ai` for OpenClaw-specific details
- The specific tool/service's official docs
- The official OpenClaw GitHub for issues/examples if docs are unclear

Examples where you MUST research:
- User asks about a specific channel feature you're unsure of ("does Telegram support voice messages as input?") → fetch `docs.openclaw.ai/channels/telegram`
- User asks about an MCP server you don't know ("can I use the Stripe MCP server?") → search for it, fetch its README
- User asks about a model provider you haven't memorized details for → fetch `docs.openclaw.ai/providers/<name>`
- User describes a workflow and you're not sure which cron vs heartbeat vs standing-order pattern fits → check `docs.openclaw.ai/automation/*`

Do NOT:
- Guess and move on hoping you're right
- Pretend you know something you don't
- Make up field names for config based on plausibility

Telling the user "let me check this, I don't want to get it wrong" builds trust. Guessing wrong destroys it.

## Common elicitation failure modes

**User gives a narrow answer to a broad question.**
User: "I want to help with my email"
Wrong move: accept it and design an email assistant
Right move: "Is email the only thing? I want to make sure I'm capturing the full system — anything else you'd want it to help with in the same agent, or a separate agent?"

**User conflates multiple jobs into one.**
User: "It should handle my infrastructure"
Wrong move: design one "infrastructure agent"
Right move: "What specifically? Health monitoring, deployment, backup verification, security scanning? These might be one agent, might be three — depends on the specifics."

**User describes what they DON'T want without describing what they DO.**
User: "Not another chatbot that just pastes info back at me"
Wrong move: affirm and move on
Right move: "Got it. So if not that, what DOES a good outcome look like? Walk me through a specific example."

**User has an architecture in mind but hasn't said so.**
User: "...and I want a different persona for work stuff"
Wrong move: treat "different persona" as a soul decision
Right move: "That sounds like a separate agent, actually — different workspace, possibly different model, own session context. Is that what you had in mind, or were you thinking one agent that code-switches?"

**User answers quickly because they think they've already told you.**
User: [answers dimension 2 in 3 seconds]
Wrong move: accept the quick answer
Right move: "That was quick — let me make sure. When you said X, did you mean [narrow interpretation] or [broader interpretation]?"

## Output of this phase

At the end of requirements elicitation, you should have a confirmed summary that includes:

1. System purpose (1 sentence)
2. User(s) and trust model
3. 3-7 specific workloads with their triggers (reactive/proactive/scheduled/event)
4. Channel list with primary/secondary
5. Data/memory needs
6. Capability profile (read-only / write / sensitive)
7. Automation pattern (scheduled / event / background / interactive)
8. Constraints (hosting, budget, privacy, availability, maintenance)
9. User's confirmation that the summary is accurate

Only THEN do you move to `references/system-architecture.md` to decide the shape of the system.
