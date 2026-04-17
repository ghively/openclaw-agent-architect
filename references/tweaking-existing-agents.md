# Tweaking Existing Agents

Your agent is running. Something about its behavior is wrong. You want to fix it without breaking what already works.

This is the diagnostic and patching reference. Most tweaking problems fall into one of six buckets — identify the bucket, then apply the targeted fix.

## How to work through this with the user

**Plan mode applies, but lightly.** Full plan-mode ceremony is overkill for a targeted file edit. Still: diagnose first, agree on the specific change, THEN edit. Don't charge in with a rewrite.

**Pace:** 5-20 minutes depending on how many buckets the problem touches.

**Sequence:** Reproduce → diagnose which bucket → propose the specific change → get quick confirmation → apply.

**Don't:**
- Rewrite a whole file when a targeted edit will do
- Skip `/context list` check — lots of issues are context-bloat symptoms, not file problems
- Apply multiple bucket fixes at once without verifying each
- Touch files on disk before the user agrees to the specific change
- **Edit without confirming what you're going to change**

**Do:**
- Ask for a fresh-session (`/new`) repro if the problem might be memory drift
- Inspect the actual transcript (`~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`) when the issue is behavioral
- Back up before editing: `cp file file.bak.$(date +%s)` or leverage git
- Apply one change, test, confirm it works before the next change
- Use git to revert if a change makes things worse

## The six buckets

| Symptom | Bucket | Fix location |
|---------|--------|--------------|
| Voice feels off (too corporate, too timid, too verbose) | Persona | `SOUL.md` |
| Agent does half the task, says "done", doesn't verify | Procedure | `AGENTS.md` |
| Agent forgets things it was told recently | Memory | `MEMORY.md` / daily notes / memory tool config |
| Agent doesn't reach for the right tool | Tool preference | `AGENTS.md` or `TOOLS.md` |
| Agent is blocked from doing what it should | Policy | `tools.*`, sandbox, exec approvals |
| Agent is burning context / hitting window limits | Context bloat | bootstrap file sizes, `MEMORY.md` pruning |

### Architect integration — tune vs re-architect

When the Agent Architect skill is invoked against an existing agent, the first real question is whether the **shape** is right. If the shape is right and only behavior needs adjusting, it's a tuning job — route to this doc and work through the six buckets. If the shape is wrong (wrong authority, wrong trust boundary, wrong track), it's a re-architecture and the skill should go back to the design workflow instead.

Rule of thumb:

- Symptoms that land in buckets 1, 2, 3, 4, or 6 (persona, procedure, memory, tool preference, context bloat) are tuning. A targeted edit in one or two files almost always fixes them.
- Symptoms that land in bucket 5 (policy) *might* be tuning, but also might signal that the agent was built on the wrong track — e.g., a chat-only agent now being asked to operate. If the policy fix is substantial (turning on `exec`, introducing `exec-approvals.json`, enabling subagents, switching sandbox mode), treat it as a track change and re-open the design workflow.
- If more than two buckets are implicated at once, that's also a signal to step back rather than patch six things in sequence.

Either way, tuning edits should be **git-backed**. Branch before editing SOUL/AGENTS/MEMORY, keep the diff small, and keep a clean revert path. The tweaking doc assumes git is in use; the Architect skill should set that up on first contact if it isn't already.

## Before editing anything — diagnose

### Step 1 — reproduce the bad behavior

Open a fresh session (`/new`) and deliberately trigger the bug. Capture:
- Exact input you sent
- Exact reply the agent gave
- Which session: main DM, group chat, subagent, cron?

If you can't reproduce on `/new`, it's a session-state artifact — the agent may have been confused by earlier turns. Test on fresh session first; if it doesn't repro, it's probably memory drift, not a file problem.

### Step 2 — check what's actually in context

```
# Send in the session where the bug happens:
/context list
/context detail
```

Look for:
- Is `SOUL.md` loaded? At what size?
- Is `AGENTS.md` loaded? At what size?
- Is `MEMORY.md` truncated? (flag `TRUNCATED` means over the cap)
- Which skills are eligible? Is the relevant one there?
- How many tokens is the system prompt?

If a file you expected is missing or truncated, that's the immediate problem.

### Step 3 — inspect effective policy

```bash
# Tool policy for the current agent
/tools verbose

# Sandbox status
openclaw sandbox explain

# Hook registrations
openclaw hooks list

# Skills eligible for this agent
openclaw skills list --verbose
```

Tools listed that shouldn't be? Missing tools? Sandbox mode different than expected? Those are your clue.

### Step 4 — read the transcript

```bash
# Find the session
ls -lt ~/.openclaw/agents/<agentId>/sessions/ | head

# Look at the raw transcript (JSONL per turn)
cat ~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl | jq 'select(.role == "assistant") | .content'

# Check tool calls
cat ~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl | jq 'select(.type == "tool_use") | {tool: .name, input: .input}'
```

This tells you what the agent actually tried to do. Often the fix is at the tool level, not the prompt level.

## Bucket 1 — Persona (voice / tone / opinion)

### Symptom checklist
- Agent opens with "Great question" / "I'd be happy to help" / "Absolutely"
- Replies are padded with unnecessary context
- Agent hedges ("it depends") when you want a take
- Agent is overly formal / overly casual
- Agent gives long when you want short
- Agent adds disclaimer paragraphs to obvious things

### Fix — edit `SOUL.md`

See `references/soul-writing.md` for the full craft. Quick patches:

**Problem:** Agent opens with corporate greetings

Add (verbatim, direct):
```markdown
## Voice
- Never open with "Great question", "I'd be happy to help", or "Absolutely". 
  Just answer.
- No pleasantries. Answer first.
```

**Problem:** Agent hedges instead of committing

Add:
```markdown
## Stance
- Have opinions. Commit to them. If you change your mind later, say so.
- "I don't know" beats hedged guessing. If genuinely uncertain, say so cleanly.
- When you recommend, recommend — don't list 3 options and let me pick.
```

**Problem:** Replies are too long

Add:
```markdown
## Brevity
- One sentence when one sentence fits.
- No restating what I just said before answering.
- No "let me know if you have questions" endings.
```

**Problem:** Agent lectures / moralizes

Add:
```markdown
## Boundaries
- No disclaimer paragraphs on things I clearly understand.
- No moralizing on questions that aren't moral ones.
- No safety boilerplate I didn't ask for.
```

### Validation

After editing SOUL.md:
1. `/new` in chat (forces re-read)
2. Send the kind of message that triggered the bad behavior
3. Compare replies

If the rule didn't take effect, make it MORE verbatim — the model pattern-matches better on exact phrases ("Never open with 'Great question'" > "Don't be too effusive").

## Bucket 2 — Procedure (execute-verify-report discipline)

### Symptom checklist
- Agent says "I'll do that" but nothing happens
- Agent says "done" when the task failed
- Agent gives up after one failure
- Agent loops on the same failing tool call 5+ times
- Agent silently skips a step when it seems too hard

### Fix — edit `AGENTS.md`

See `references/agents-md-patterns.md`. The execute-verify-report pattern should be at the TOP of your AGENTS.md:

```markdown
## Execution discipline

Every task follows Execute-Verify-Report.

1. Execute: do the work now, not "I'll do it"
2. Verify: confirm it worked (file exists, command succeeded, message sent)
3. Report: what was done, what was verified, what's next

Rules:
- "Done" without verification is not acceptable
- On failure: 1 retry with different approach, then report
- 3 attempts max, then escalate
- Include exact errors in reports, don't paraphrase
```

**Problem:** Agent loops on failing tool

Add to AGENTS.md:
```markdown
## Tool loop detection

If the same tool call fails 3 times with the same error:
STOP. Do not retry. Report the failure with:
- Exact tool call and params
- Exact error returned
- Your best diagnosis
- A proposed alternative approach

Do not try fourth retries. The loop itself is information.
```

OpenClaw has built-in tool loop detection that will eventually abort, but reinforcing the pattern in AGENTS.md makes the agent self-aware about it earlier.

**Problem:** Agent claims "done" without verifying

Add:
```markdown
## Done means verified

"Done" without verification is a lie. Every task:
1. Execute the final step
2. Verify the outcome (read the file, check git status, run the command, 
   check the API response)
3. Report with the verification result quoted

Example of acceptable report:
"Done. Committed as 8f3a2b1; `git log -1` shows the commit. Branch pushed; 
remote shows 8f3a2b1 as HEAD of `main`."

Example of unacceptable report:
"Done, I've committed and pushed the changes."
```

### Validation

Trigger a task that has historically been reported as "done" without being done. Check if the new behavior actually happens. If the agent still does it: make the rules more specific, and add an example of unacceptable behavior verbatim.

## Bucket 3 — Memory (agent forgets)

### Symptom checklist
- Agent forgets something you told it yesterday
- Agent asks you to repeat context you've provided multiple times
- Agent doesn't remember durable preferences
- Agent conflicts with facts in MEMORY.md
- MEMORY.md is growing but not shrinking

### Diagnosis

```bash
# What's in memory?
cat ~/.openclaw/workspace/MEMORY.md | wc -c        # size check
ls -la ~/.openclaw/workspace/memory/                 # daily files

# Can the agent find the fact via search?
openclaw memory search "the thing it forgot"
```

If search returns the right snippet but agent didn't surface it → agent's memory usage discipline needs reinforcement.

If search doesn't find it → the fact isn't persisted.

### Fix — persistence issue

If the agent isn't writing to memory, reinforce in AGENTS.md:

```markdown
## Memory

### Writing to memory
- When I share a DURABLE fact (preference, decision, long-term context), 
  write it to MEMORY.md IMMEDIATELY in the same turn, not "later"
- When I share SESSION-SCOPED context (today's plan, what we're working on), 
  write it to `memory/YYYY-MM-DD.md`
- Confirm the write in your reply: "Saved to MEMORY.md: [brief summary]"
```

### Fix — retrieval issue

If memory has the fact but agent isn't looking:

```markdown
### Reading memory
- At session start: read `memory/YYYY-MM-DD.md` for today and yesterday
- Before asking me to repeat ANY context: run `memory_search` with keywords
- Before making any assumption about my preferences: run `memory_search` 
  for related terms
```

### Fix — MEMORY.md bloat

If MEMORY.md is over 5KB:

1. Manually review — what's genuinely durable vs what's session-scoped?
2. Move session-scoped content to the appropriate daily file
3. Consolidate duplicates
4. Delete stale facts (old job, old project, old preferences)

Or ask the agent itself:
```
Read MEMORY.md and propose a pruning pass:
1. Which items are genuinely durable preferences I'd want a fresh agent to know?
2. Which items are stale (old job, completed projects, revoked decisions)?
3. Which items would be better in daily memory files?
4. Write the cleaned MEMORY.md to MEMORY.md.proposed for my review.
```

Review the proposal, then replace MEMORY.md.

### Fix — agent contradicts itself / memory

If the agent gives contradictory information across sessions, it's a sign:
- MEMORY.md has outdated facts that haven't been updated
- Daily memory files have more recent truth but agent isn't reading them
- OR compaction summarized away context you cared about

Remedies:
1. Pre-compaction flush should catch this — confirm it's running (look in transcript for `🧹 Auto-compaction` markers)
2. Update MEMORY.md proactively when something durable changes
3. Enable `memory-wiki` plugin for structured provenance-tracked facts (see `references/memory-system.md`)

## Bucket 4 — Tool preference (agent reaches for wrong tool)

### Symptom checklist
- Agent uses `exec cat` instead of the `read` tool
- Agent uses `web_search` when `memory_search` would suffice
- Agent uses `exec sleep` for waiting instead of cron/sessions_spawn
- Agent tries `curl` in sandbox where it's not available
- Agent invokes a shell CLI when a bundled tool does the same thing

### Fix — edit `AGENTS.md` tool preferences

```markdown
## Tool preferences

File I/O in workspace:
- `read` / `write` / `edit` / `apply_patch` — never `exec cat/sed/echo > file`
- Multi-hunk edits: `apply_patch`

Memory:
- Before asking me to repeat: `memory_search` FIRST
- For known file: `memory_get`
- Don't use `exec grep` on memory files; use memory tools

Searching code:
- `exec rg -n PATTERN path` (ripgrep is installed)
- Never `exec grep -r` (slow)

Messages to me:
- Always `message` tool, never `exec` with a CLI
- Subject line required for long messages

Long-running work:
- Use `cron` for scheduled retries
- Use `sessions_spawn` for parallel investigation
- NEVER blocking `exec sleep` loops
```

### Fix — missing binary in sandbox

If the agent tries a binary that doesn't exist in sandbox:

```bash
# Install the binary in the sandbox via setupCommand
```
```json5
{
  agents: {
    defaults: {
      sandbox: {
        docker: {
          network: "bridge",  // needed for package installs
          setupCommand: "apt-get update && apt-get install -y ripgrep jq curl"
        }
      }
    }
  }
}
```

Or switch to the common image which has many tools pre-installed:
```bash
scripts/sandbox-common-setup.sh
```
```json5
{
  agents: {
    defaults: {
      sandbox: {
        docker: { image: "openclaw-sandbox-common:bookworm-slim" }
      }
    }
  }
}
```

Recreate the sandbox after config changes:
```bash
openclaw sandbox recreate
```

## Bucket 5 — Policy (agent is blocked)

### Symptom checklist
- Agent says "I can't do that — tool not available" for something you expected
- Exec commands return "blocked by approval policy"
- Specific skills don't appear in the agent's list
- Agent can't see files outside workspace

### Diagnosis

```bash
# What tools does the agent actually see?
# In chat:
/tools verbose

# Why is a specific tool blocked?
openclaw sandbox explain

# What's the exec approval policy?
openclaw approvals list
cat ~/.openclaw/exec-approvals.json | jq

# What's the tool policy in config?
cat ~/.openclaw/openclaw.json | jq '.tools'
```

### Fix — tool not in policy

If the tool is missing:
```json5
{
  tools: {
    allow: ["<tool-name>"]     // additive to profile
  }
}
```

Per-agent:
```json5
{
  agents: {
    list: [
      { id: "main", tools: { allow: ["browser"] } }
    ]
  }
}
```

Remember: `deny` wins over `allow`. Check both.

### Fix — exec approval blocking

If approval denies something you'd expect to auto-allow:
```bash
# Add to allowlist
openclaw approvals allowlist add --agent main --pattern "/usr/local/bin/mytool"

# Or edit ~/.openclaw/exec-approvals.json directly
```

If you want "ask once then remember", respond `allow-always` to the next approval prompt. Inline eval forms (`python -c`, `node -e`) won't be persisted when `strictInlineEval: true` — that's by design.

### Fix — sandbox blocking file access

If the agent can't reach a file outside the workspace:
```json5
{
  agents: {
    defaults: {
      sandbox: {
        workspaceAccess: "rw",   // or "ro"
        docker: {
          binds: ["/Users/gene/Projects:/projects:ro"]
        }
      }
    }
  }
}
```

Then `openclaw sandbox recreate`.

### Fix — skill not appearing

```bash
# Check if it's loaded at all
openclaw skills list

# Check why it's filtered out
openclaw skills list --verbose
# Look for: MISSING_BIN, MISSING_ENV, WRONG_OS, DISABLED, NOT_ELIGIBLE

# Check per-agent allowlist
cat ~/.openclaw/openclaw.json | jq '.agents.list[] | {id, skills}'
```

Per-agent skill allowlists REPLACE defaults (no merge). If your agent has `skills: ["a", "b"]` and you want to add `"c"`, edit to `["a", "b", "c"]`.

## Bucket 6 — Context bloat

### Symptom checklist
- `/context list` shows total >50K tokens on a fresh session
- Agent compacts frequently (every 5-10 turns)
- MEMORY.md is 10KB+
- AGENTS.md is 10KB+
- Multiple `*.md` files show as TRUNCATED

### Diagnosis

```bash
du -h ~/.openclaw/workspace/*.md
du -h ~/.openclaw/workspace/memory/ | sort -h | tail
```

Watch for files over 5KB. A full workspace bootstrap should land ≤20KB per file (hard cap `bootstrapMaxChars: 20000`) and ≤150KB total (`bootstrapTotalMaxChars: 150000`). If you're hitting truncation, you're well past budget.

### Fix — trim bootstrap files

1. **SOUL.md** — should be 500-1500 chars. If longer, cut the filler.
2. **AGENTS.md** — 1-4KB normal, 8KB max for complex agents. Move less-critical content to referenced files (skills).
3. **MEMORY.md** — 5KB cap recommended. Demote session-scoped stuff to daily files.
4. **HEARTBEAT.md** — should be tiny. If it's long, you probably want a standing order + cron, not a heartbeat.
5. **TOOLS.md** — stays useful under 2KB. Don't document every tool; document YOUR conventions.
6. **IDENTITY.md** — 3-5 lines max.
7. **USER.md** — keep to ~2KB.

### Fix — turn bootstrap files into linked references

If you have voluminous reference material the agent sometimes needs:
- Move it to a skill with a markdown body (which only loads on demand)
- OR move to a file the agent can `read` when needed

Don't inject 10KB of API docs on every turn when the agent only needs them once per day.

### Fix — disable heartbeat bootstrap

If heartbeats are eating context for no good reason:
```json5
{
  agent: { heartbeat: { every: "0m" } }  // disable
}
```

OR keep heartbeat but run with light context:
For cron jobs (not heartbeat), the `--light-context` flag skips workspace bootstrap injection. Useful for narrow scheduled tasks that don't need the full persona context.

## Safe config patching

### Always back up before editing
```bash
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.bak.$(date +%Y%m%d-%H%M%S)
```

### Validate JSON before restarting
```bash
# The config supports JSON5 (comments, trailing commas)
# But basic JSON parse catches most syntax issues:
cat ~/.openclaw/openclaw.json | jq empty && echo "Syntax OK"
```

### Use `/config set` in chat for live edits (if enabled)

```json5
{ commands: { config: true } }
```

Then:
```
/config set tools.exec.strictInlineEval=true
/config show tools.exec
```

Writes persist to disk. Advantage: validated before write.

### Use `/debug set` for try-it-first (no disk write)

```json5
{ commands: { debug: true } }
```

Then:
```
/debug set messages.responsePrefix="[test]"
/debug show
/debug reset                         // clear all overrides
```

Changes apply immediately to new config reads but don't persist. Clear via `/debug reset` or gateway restart.

### Restart requirements

Config changes require gateway restart for:
- Tool policy
- Sandbox config
- Channel config
- Plugin enable/disable
- Model provider config

Config changes apply immediately (no restart) for:
- Per-session overrides via `/debug`, `/model`, `/think`, `/fast`, `/exec`
- Memory tool writes

## Common "I broke it" rescues

### Agent won't boot

Check:
```bash
openclaw doctor
openclaw status
openclaw gateway status
```

Common causes:
- JSON syntax error in `openclaw.json` → restore from `.bak`
- Missing binary in `requires.bins` of a skill → disable skill
- Plugin threw on register → inspect gateway logs for the plugin id, disable via `openclaw plugins disable <id>`
- Auth token rotation broke channel login → re-pair with `openclaw channels login`

### Gateway logs location
```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
# or
openclaw logs --follow
```

### Memory index corrupted
```bash
openclaw memory index --force
```

### Session transcript got too large / poisoned
```bash
# Start fresh from scratch, preserving workspace files
# In chat:
/new
# Or delete the specific session (archives, doesn't truly delete):
openclaw sessions delete <sessionKey>
```

### Tool loop won't stop
```bash
# In chat:
/stop
```

Or force-kill the subagent:
```
/subagents kill all
```

## Git-backed workflow for tweaking

If you've kept your workspace in git (strongly recommended from `references/agent-design-workflow.md`):

```bash
# Before making changes
cd ~/.openclaw/workspace
git status                # confirm clean
git checkout -b tune-soul-voice

# Make your edit
vim SOUL.md

# Test in chat with /new
# If good:
git add SOUL.md
git commit -m "Tighten voice: add no-corporate-openers rule"

# If bad:
git checkout -- SOUL.md   # revert just this file

# Periodically:
git push                  # keep remote backup current
```

The ability to `git diff` your workspace across time is invaluable for "when did the agent start doing X?" investigations.

## When to stop tweaking

You're iterating too much if:
- Every session yields a new AGENTS.md rule
- SOUL.md is over 3KB
- You have 10+ standing orders
- You've added skills for things the agent previously did fine without

The goal isn't maximal control. It's a trusted tool that mostly does what you want. Accept some imperfection — it's often cheaper than adding another rule.
