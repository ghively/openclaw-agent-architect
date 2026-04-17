# Creating Tools for an OpenClaw Agent

"Tool" is an overloaded word in OpenClaw. When someone says "I want to give my agent a new tool," they might mean any of five different things, each with its own build path, cost, and audit profile. This reference is the decision tree, the design principles, and the concrete builds.

If you're here because the agent isn't reaching for the RIGHT tool, that's not a tool-creation problem — see `references/tweaking-existing-agents.md` (bucket 4). This reference is for when the tool doesn't exist yet.

## How to work through this with the user

**Plan mode applies.** Regardless of which of the 5 paths the user ends up on, do not draft the actual deliverable (SKILL.md, plugin code, CLI script, MCP config entry) until the plan is approved. See the Plan-Mode Contract in the main SKILL.md.

**Pace:** 15-60 minutes depending on path. A skill is quick (15 min). A plugin or MCP server takes longer.

**Sequence:** Disambiguate → validate path → outline design using principles → sketch plan → present plan → get approval → build.

**Don't:**
- Assume "tool" means plugin and jump to TypeScript — ask first
- Draft a plugin package before confirming a skill wouldn't work
- Skip the design principles (name for intent, flat params, readable returns, etc.) — these make or break whether the agent actually uses the tool
- Start building before the user has validated the path in `when-to-build-what.md`
- **Produce any code or files before the plan is approved**

**Do:**
- Ask the disambiguating question upfront: "When you say tool, do you mean (a) teach the agent about an existing CLI, (b) custom script + skill wrapper, (c) typed function the model calls with structured params, (d) connect an existing MCP server, or (e) build a new MCP server?"
- Walk through `when-to-build-what.md` questions if the user seems unsure
- Once path is clear, sketch the plan using that path's section of this reference and the corresponding deep-dive reference (`authoring-skills.md` or `authoring-plugins.md`)
- Verify the sketched plan against the design principles BEFORE the user approves it
- After approval, draft the deliverable in build mode

**What "done" looks like:** Depending on path — a complete SKILL.md, a Python/bash script + matching SKILL.md, a working plugin `index.ts` + manifest, or an `mcp.servers` config entry. Plus path-specific test commands.

## The five paths — pick the right one first

Before you build anything, match your need to the right path. Building a plugin when you needed a skill is an expensive mistake.

| You want... | Path | Effort | Reach |
|-------------|------|--------|-------|
| Agent to invoke an existing command with good instructions | **Skill** (markdown only) | Minutes | This agent |
| Agent to run a shell wrapper, maybe a Python script, that you write | **Skill + custom CLI** | Hour | This agent (maybe ClawHub) |
| Agent to call a typed function with structured params the model sees | **Plugin tool** | Hours-day | Any agent; publishable |
| Agent to use third-party APIs/services someone else maintains | **MCP server (external)** | Minutes to connect | Any MCP-compatible agent |
| Ship a tool surface to multiple agents/clients beyond OpenClaw | **Build your own MCP server** | Day+ | Any MCP client |

### When each path fits

**Skill (just markdown).** You already have a CLI installed that does the job. You want the agent to know it exists, when to use it, and what arguments to pass. Example: you have `rg` (ripgrep) installed and you want the agent to use it for searches instead of `grep`. One markdown file, done. No code.

**Skill + custom CLI.** Your task is repetitive enough to deserve a wrapper, but it's just-a-script territory — a Python file, a shell script, maybe a tiny Node program. Agent invokes it via `exec`. The skill tells the agent when and how to use it. Example: `rapid7-report` that parses your InsightVM CSV exports and spits out a ranked table. The logic lives in `~/bin/rapid7-report`; the skill tells the agent it exists.

**Plugin tool.** You want the model to call a typed function with structured parameters — not shell a string. You want it to appear in the agent's tool list alongside built-ins. You might want hooks firing. You want other people to install it via one command. Example: a `jira_create_issue` tool with typed params (project, summary, description, issue_type). Requires TypeScript, real code, testing — but it integrates natively.

**MCP server (external, you just connect).** There's already an MCP server for what you need — GitHub, Notion, filesystem, Slack, Cloudflare, Context7, Linear, etc. You just want to USE it. Register the server in your OpenClaw config under `mcp.servers`, done. No code.

**Build your own MCP server.** You're making a tool surface that multiple clients should use (OpenClaw, Claude Desktop, Cursor, Codex, etc.) OR you have a specific domain (internal CRM, custom database, proprietary API) no public MCP server covers. This is a real engineering project — worth it when the reuse justifies the work.

### The decision flowchart

```
Does an existing CLI already do the work?
├─ YES → Skill (markdown, maybe with bundled config)
└─ NO
   ├─ Does an existing MCP server cover this?
   │  └─ YES → Register it in mcp.servers (no build)
   │
   └─ Do you need typed params the model sees as structured fields,
      or to hook into agent lifecycle events?
      ├─ YES
      │  ├─ Only for OpenClaw agents? → Plugin
      │  └─ For multiple MCP clients? → Build an MCP server
      │
      └─ NO (the logic is a deterministic script)
         └─ Write a CLI + Skill to teach the agent how to use it
```

## Tool design principles (applies to all paths)

Before you build, know what makes a tool the model can ACTUALLY use correctly.

### 1. Name the tool for the intent, not the implementation

Bad: `run_sql_query_against_postgres_database`
Good: `find_customer` — the model maps intent to this easily

The model picks tools by matching your description to the user's intent. Name and describe in terms of WHAT it does for the user, not HOW it works under the hood.

### 2. Parameters: fewer, flatter, more typed

Bad:
```typescript
params: Type.Object({
  options: Type.Object({
    filters: Type.Array(Type.Object({
      field: Type.String(),
      operator: Type.String(),
      value: Type.Any()
    }))
  })
})
```

Good:
```typescript
params: Type.Object({
  query: Type.String({ description: "Natural language search query" }),
  limit: Type.Optional(Type.Integer({ default: 10, minimum: 1, maximum: 100 }))
})
```

Deeply nested structures confuse models. Union types of multiple shapes ("either A or B") confuse them more. A clean flat parameter list with clear descriptions works MUCH better than a theoretically-powerful nested schema.

### 3. Descriptions are instructions

Every parameter description is a chance to constrain behavior. Use them.

```typescript
parameters: Type.Object({
  location: Type.String({
    description: "City name (e.g., 'Nashville') or ZIP code (e.g., '37075'). Do NOT include state abbreviation."
  }),
  units: Type.Optional(Type.String({
    description: "Temperature units. Use 'f' for Fahrenheit, 'c' for Celsius. Defaults to user's locale.",
    default: "f"
  }))
})
```

The model reads these. Sloppy or missing descriptions → sloppy calls.

### 4. Return content blocks the model can reason about

Return text, not raw JSON the model has to parse to understand:

Bad:
```typescript
return { content: [{ type: "text", text: JSON.stringify(data) }] };
```

Good:
```typescript
return {
  content: [{
    type: "text",
    text: `Found 3 customers matching "acme":
- Acme Corp (ID: 1001, status: active)
- Acme Widgets LLC (ID: 1042, status: churned)
- Acme Industries (ID: 1103, status: trial)

Use customer_detail with the ID for full info.`
  }]
};
```

If the model will immediately need to call another tool with data from this one, make the return text tell it how.

### 5. Errors are part of the interface

Don't throw raw exceptions out of `execute`. Return structured errors the model can reason about:

```typescript
async execute(_id, params) {
  try {
    const result = await callTheService(params);
    return { content: [{ type: "text", text: formatResult(result) }] };
  } catch (err) {
    if (err.code === 'AUTH_FAILED') {
      return {
        content: [{
          type: "text",
          text: `Error: Authentication failed. The API key may be expired. Ask the user to check ${process.env.API_KEY_NAME}.`
        }],
        isError: true
      };
    }
    return {
      content: [{
        type: "text",
        text: `Error calling service: ${err.message}. This is retryable.`
      }],
      isError: true
    };
  }
}
```

The model can read this and react appropriately — ask the user for help, retry, or give up cleanly.

### 6. Idempotency where it matters

Tools that have side effects (create a ticket, send an email, write a file) should either:
- Be safely idempotent (same input → same result, no duplicate)
- Return a clear "I just created X" in the response so the agent doesn't try again on retry

Do NOT silently skip duplicates. The agent needs to know a duplicate was skipped or it'll assume the call failed and retry with variations.

### 7. One tool, one job

If your tool takes a `mode` param with 5 values that each do something different, that's five tools, not one. Split them. The model picks from your tool list by matching intent — a single tool that does 5 things dilutes the signal for each.

Exception: variants of the same logical operation (`list_things`, `get_thing`, `find_thing_by_id`) can share a tool if they're really the same question at different specificity.

### 8. Design for the agent, not your mental model

You know the underlying system. The agent doesn't. Its world is: user intent → tool description → parameter schema → execute → response text. Every gap you leave (missing defaults, unclear descriptions, raw API responses) the agent tries to fill with guesses.

Test: give the tool description and parameter schema to someone who's never used the underlying system. Can they call it correctly on the first try? If not, the description/schema needs work before you even think about the implementation.

## Path 1 — Skill (markdown only)

This is the most common case. You're wrapping an existing CLI with instructions.

### Minimum example: `ping` wrapper

`~/.openclaw/workspace/skills/ping-host/SKILL.md`:

```markdown
---
name: ping_host
description: Ping a host or IP and return latency plus packet loss
metadata: { "openclaw": { "emoji": "📡", "requires": { "bins": ["ping"] } } }
---

# Ping Host

When the user asks to ping a host or check if a host is reachable:

1. Use the `exec` tool to run: `ping -c 4 <host>`
2. Parse the output for packet loss percentage and avg round-trip time
3. Report in one line: `<host>: X/4 replies, avg Yms, Z% loss`

If the host is unreachable (100% loss), say so explicitly.

## Examples

Input: "ping 8.8.8.8"
Output: "8.8.8.8: 4/4 replies, avg 12ms, 0% loss"

Input: "is github.com up?"
Output: "github.com: 4/4 replies, avg 28ms, 0% loss — yes it's up"
```

Full spec for SKILL.md, including `command-dispatch: tool` (deterministic, no model), slash command behavior, and all frontmatter fields: see `references/authoring-skills.md` and `assets/templates/skill-template.md`.

### When a skill is enough

- The underlying tool already exists on the host (or via `install` spec in frontmatter)
- The model's judgment is useful (it decides WHEN to use the tool)
- You don't need structured parameters — the model constructs the invocation from natural language
- This agent is the only consumer, or you're willing to publish to ClawHub

## Path 2 — Skill + custom CLI

When the logic is more than a one-liner, write a small script. The skill teaches the agent to use it.

### Minimum example: `rapid7-risk-report`

Your rank-servers-by-risk script at `~/bin/rapid7-risk-report`:

```bash
#!/usr/bin/env python3
"""Usage: rapid7-risk-report <csv-path> [--top N]"""
import sys
import csv
import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("csv_path", type=Path)
    parser.add_argument("--top", type=int, default=20)
    args = parser.parse_args()

    if not args.csv_path.exists():
        print(f"Error: {args.csv_path} does not exist", file=sys.stderr)
        sys.exit(2)

    rows = []
    with open(args.csv_path) as f:
        for row in csv.DictReader(f):
            try:
                rows.append({
                    "name": row.get("Asset Name", "?"),
                    "ip": row.get("IP Address", "?"),
                    "os": row.get("OS", "?"),
                    "risk": float(row.get("Risk Score", "0") or 0),
                    "critical": int(row.get("Critical Vulnerabilities", "0") or 0),
                    "exploitable": int(row.get("Exploitable Vulnerabilities", "0") or 0),
                })
            except (ValueError, KeyError) as e:
                print(f"Warn: skipping row ({e})", file=sys.stderr)

    top = sorted(rows, key=lambda r: r["risk"], reverse=True)[: args.top]

    print(f"Top {len(top)} assets by risk score")
    print(f"{'Rank':>4}  {'Asset':<30}  {'IP':<15}  {'OS':<12}  {'Risk':>8}  {'Crit':>4}  {'Expl':>4}")
    for i, r in enumerate(top, 1):
        print(f"{i:>4}  {r['name'][:30]:<30}  {r['ip']:<15}  {r['os'][:12]:<12}  {r['risk']:>8.1f}  {r['critical']:>4}  {r['exploitable']:>4}")

    exploitable = [r for r in top if r["exploitable"] > 0]
    if exploitable:
        print(f"\n{len(exploitable)} assets in top {args.top} have exploitable vulnerabilities:")
        for r in exploitable:
            print(f"  - {r['name']} ({r['ip']}): {r['exploitable']} exploitable critical(s)")

if __name__ == "__main__":
    main()
```

```bash
chmod +x ~/bin/rapid7-risk-report
```

Matching skill at `~/.openclaw/workspace/skills/rapid7-risk-report/SKILL.md`:

```markdown
---
name: rapid7_risk_report
description: Rank Rapid7 InsightVM assets by risk score from a CSV export
metadata: { "openclaw": { "emoji": "🛡️", "requires": { "bins": ["rapid7-risk-report", "python3"] } } }
---

# Rapid7 Risk Report

When Gene mentions a Rapid7 InsightVM CSV export or asks to rank his servers 
by risk:

1. Confirm the CSV path. Default: `~/.openclaw/workspace/rapid7-exports/latest.csv`
2. Use `exec` to run: `rapid7-risk-report <csv-path> --top 20`
3. Surface the output verbatim (don't paraphrase — the format is intentional)
4. If the output shows assets with exploitable vulnerabilities, note that 
   those should be prioritized for patching

## What to watch for in the output

- The "Rank" column is by risk score — higher is worse
- The "Expl" column (exploitable count) flips a row from "bad" to "fix it now"
- Assets with Expl > 0 are the priority list, regardless of overall rank

## Do not

- Share the raw CSV contents in messages
- Expose internal IPs in messages sent outside of DMs to Gene
- Guess at CVSS or risk ranking — the script reads Rapid7's numbers
```

### When to use path 2 vs path 3

Pick CLI+skill when:
- You're comfortable in your scripting language of choice
- The tool doesn't need to be called by other non-OpenClaw clients
- No special model-facing parameter structure needed (model figures out the args)
- You can accept sandbox limitations (if sandboxed, the CLI must exist in the sandbox image too)

Pick plugin (path 3) when:
- You need typed parameters the model sees as structured fields
- You want to hook into agent lifecycle (`before_tool_call`, `message_sending`, etc.)
- Distribution matters — users install via `openclaw plugins install`

## Path 3 — Plugin tool

Typed function the model calls with structured parameters. Lives in-process with the gateway. Full plugin mechanics in `references/authoring-plugins.md`; here's the tool-focused distillation.

### Minimum example: `jira_create_issue`

`index.ts`:

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { Type } from "@sinclair/typebox";

export default definePluginEntry({
  id: "jira-integration",
  name: "Jira Integration",
  description: "Create and query Jira issues",

  register(api) {
    api.registerTool({
      name: "jira_create_issue",
      description: "Create a new Jira issue in a given project",
      parameters: Type.Object({
        project_key: Type.String({
          description: "Jira project key (e.g., 'CPI', 'DEVOPS'). Uppercase.",
        }),
        summary: Type.String({
          description: "Issue title. Keep under 100 chars.",
          maxLength: 100,
        }),
        description: Type.Optional(Type.String({
          description: "Markdown body. Can be multi-line.",
        })),
        issue_type: Type.Optional(Type.Union([
          Type.Literal("Task"),
          Type.Literal("Bug"),
          Type.Literal("Story"),
        ], { default: "Task" })),
      }),

      async execute(_id, params) {
        const token = process.env.JIRA_API_TOKEN;
        const baseUrl = process.env.JIRA_BASE_URL;

        if (!token || !baseUrl) {
          return {
            content: [{
              type: "text",
              text: "Error: Jira credentials missing. Set JIRA_API_TOKEN and JIRA_BASE_URL.",
            }],
            isError: true,
          };
        }

        try {
          const res = await fetch(`${baseUrl}/rest/api/3/issue`, {
            method: "POST",
            headers: {
              "Authorization": `Basic ${Buffer.from(`:${token}`).toString("base64")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fields: {
                project: { key: params.project_key },
                summary: params.summary,
                description: params.description
                  ? { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: params.description }] }] }
                  : undefined,
                issuetype: { name: params.issue_type ?? "Task" },
              },
            }),
          });

          if (!res.ok) {
            const errText = await res.text();
            return {
              content: [{
                type: "text",
                text: `Error: Jira returned ${res.status}: ${errText}`,
              }],
              isError: true,
            };
          }

          const data = await res.json();
          return {
            content: [{
              type: "text",
              text: `Created ${data.key}: "${params.summary}"\nURL: ${baseUrl}/browse/${data.key}`,
            }],
          };
        } catch (err: any) {
          return {
            content: [{
              type: "text",
              text: `Error calling Jira: ${err.message}. Retryable.`,
            }],
            isError: true,
          };
        }
      },
    });
  },
});
```

Note the patterns:
- Clear parameter descriptions
- Required vs optional marked
- Union types for bounded choices
- Error returns as `isError: true` text blocks, not exceptions
- Return text tells the agent the URL so it can share it

### Required vs optional tools

```typescript
// Required tool — always in the agent's toolbox once plugin is enabled
api.registerTool({
  name: "jira_create_issue",
  // ...
});

// Optional tool — user must explicitly allow it
api.registerTool(
  {
    name: "jira_delete_issue",
    // dangerous side effect; opt-in only
    // ...
  },
  { optional: true }
);
```

User enables:
```json5
{ tools: { allow: ["jira_delete_issue"] } }
```

Use `optional: true` for anything destructive, anything that costs money, or anything requiring extra binaries the user might not have.

### Publishing

Once working:
```bash
# ClawHub (preferred discovery)
clawhub publish . --slug jira-integration --version 0.1.0 --tags latest

# OR npm
npm publish --access public
```

Users install:
```bash
openclaw plugins install @your-scope/openclaw-plugin-jira
```

Full plugin build pipeline, manifest spec, and the complete 27-hook reference is in `references/authoring-plugins.md`.

## Path 4 — Connecting to an external MCP server (no build)

MCP (Model Context Protocol) is Anthropic's standard for tool servers. OpenClaw is an MCP client — you can register any MCP server as a tool source in your config.

### When to reach for an existing MCP server first

- You want GitHub / GitLab / Notion / Slack / Linear / Airtable / Google Drive / databases / filesystem tools
- There's a well-maintained server on https://github.com/modelcontextprotocol/servers or via community
- You're willing to run one more subprocess or connect to one more remote service

**Check `references/plugin-ecosystem.md` first** — it has a curated scenario → server map covering the common categories (development, documentation, web/search, databases, cloud platforms, productivity, payments, etc.) with trust-tier annotations. That catalog directs you to the right server faster than generic search.

### Configuration

MCP servers live under `mcp.servers` in `~/.openclaw/openclaw.json`:

```json5
{
  "mcp": {
    "servers": {
      // stdio — runs a local subprocess
      "context7": {
        "command": "uvx",
        "args": ["context7-mcp"]
      },

      // stdio — Node package
      "github": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"],
        "env": {
          "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..."  // use env var ref in practice
        }
      },

      // SSE / HTTP — remote server
      "docs": {
        "url": "https://mcp.example.com",
        "headers": {
          "Authorization": "Bearer <token>"
        },
        "connectionTimeoutMs": 10000
      },

      // streamable-http transport
      "streaming": {
        "url": "https://mcp.example.com/stream",
        "transport": "streamable-http",
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

### CLI alternatives to hand-editing JSON

```bash
openclaw mcp list
openclaw mcp show context7 --json
openclaw mcp set context7 '{"command":"uvx","args":["context7-mcp"]}'
openclaw mcp set docs '{"url":"https://mcp.example.com"}'
openclaw mcp unset context7
```

These edit the config file — they don't actually connect. Confirm reachability with `openclaw status` after restart.

### Transport types — pick carefully

| Transport | When to use |
|-----------|-------------|
| `stdio` (command + args) | Local subprocess. Lowest latency. Most common for CLIs and npm packages. |
| `sse` (URL only) | Remote over HTTP Server-Sent Events. Default when you specify `url`. |
| `streamable-http` (URL + transport) | Remote with bidirectional HTTP streaming. Opt in explicitly. |

For stdio: the `command` binary must exist on the gateway host's PATH (OR inside the sandbox, if sandboxed). Common pattern: `uvx` (Python tools), `npx -y` (Node tools), or a direct binary path.

For remote (SSE/HTTP): the server has to be reachable from the gateway. If you're on Synology and the server is on a VPS, make sure networking works.

### Security: treat MCP servers as third-party code

An MCP server exposes tools. When mounted, those tools are available to your agent with whatever tool policy allows. A malicious MCP server can:
- Exfiltrate data via tool responses
- Inject misleading content
- Call external APIs on your behalf

Audit external MCP servers the same way you'd audit a plugin:
- Read the source if open
- Pin the version (stdio: exact npm or pypi version; remote: specific URL)
- Start with a minimal tool scope — don't enable everything
- For remote servers, only trust ones you control or highly-reputable public services

Check `references/security-audit.md` for the full audit checklist.

### The mcporter pattern (natural-language config)

There's a community skill called `mcporter` that lets you add MCP servers conversationally instead of editing JSON. Install it from ClawHub if you prefer that interface:

```bash
clawhub install mcporter
```

Still edits the same config — just less error-prone than hand-writing JSON.

## Path 5 — Building your own MCP server

You're building a tool surface other clients besides OpenClaw will use (Claude Desktop, Cursor, Codex, etc.), OR you have a proprietary system (internal CRM, custom database) no public server covers.

### Structure (Node example)

`my-crm-mcp.ts`:

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "my-crm", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_customer",
      description: "Get customer record from CRM by email",
      inputSchema: {
        type: "object",
        properties: {
          email: {
            type: "string",
            description: "Customer email address",
          },
        },
        required: ["email"],
      },
    },
    {
      name: "create_note",
      description: "Add a note to a customer record",
      inputSchema: {
        type: "object",
        properties: {
          customer_id: { type: "string" },
          note: { type: "string", maxLength: 1000 },
        },
        required: ["customer_id", "note"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "get_customer") {
      const customer = await yourCRM.findByEmail(args.email);
      if (!customer) {
        return {
          content: [{ type: "text", text: `No customer found with email ${args.email}` }],
          isError: true,
        };
      }
      return {
        content: [{
          type: "text",
          text: `Customer: ${customer.name} (id: ${customer.id})\nStatus: ${customer.status}\nLast contact: ${customer.lastContactDate}`,
        }],
      };
    }

    if (name === "create_note") {
      const note = await yourCRM.createNote(args.customer_id, args.note);
      return {
        content: [{ type: "text", text: `Note created (id: ${note.id}) on customer ${args.customer_id}` }],
      };
    }

    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Register with OpenClaw

```json5
{
  "mcp": {
    "servers": {
      "my-crm": {
        "command": "node",
        "args": ["/path/to/my-crm-mcp.js"],
        "env": {
          "CRM_API_KEY": "${CRM_API_KEY}"
        }
      }
    }
  }
}
```

### When this is worth it

- The tools will be used by multiple clients (not just OpenClaw)
- The underlying system is proprietary/internal
- You want a clean interface separable from agent runtime
- You're willing to maintain the server as an independent project

### When it ISN'T worth it

- Only OpenClaw will use it → use a plugin instead (simpler, hooks into lifecycle)
- You don't need the protocol standardization → a plugin's easier
- It's a one-off workflow → a skill + script is faster

### Publish

Publish to npm or pypi with an MCP-server name convention. Users install via their MCP client config; for OpenClaw users, they add an entry under `mcp.servers`.

## Testing a new tool

### Path 1 (skill)
```bash
# Check it loaded
openclaw skills list --verbose

# Test in a fresh session
# In chat: /new
# Then: invoke with a natural prompt
```

### Path 2 (CLI + skill)
```bash
# Test the CLI standalone first
rapid7-risk-report ~/test.csv --top 10

# Then: /new in chat, trigger the skill via natural prompt
```

### Path 3 (plugin)
```bash
# Link for local dev
npm install
openclaw plugins install -l ./

# Verify registration
openclaw plugins inspect <id>
# Should show your tool in the tools array

# In chat: /new, then prompt
# Or direct:
openclaw agent --message "Create a Jira issue in CPI for 'test issue'"

# Watch logs for errors
openclaw logs --follow | grep <your-plugin-id>
```

### Path 4 (external MCP server)
```bash
# Add the config
openclaw mcp set <n> '{...}'

# Restart gateway
openclaw gateway restart

# Verify it connected
openclaw status

# In chat: /tools verbose
# Your MCP tools should appear in the list
```

### Path 5 (your own MCP server)
```bash
# Test standalone with MCP inspector first
npx @modelcontextprotocol/inspector node my-crm-mcp.js

# Once working, register with OpenClaw and test in chat
```

## Debugging tools the agent won't use correctly

Common failure modes and fixes:

**Agent doesn't know the tool exists.**
- Verify with `/tools verbose` in chat
- Check `openclaw skills list --verbose` (for skills) or `openclaw plugins inspect` (for plugins)
- Restart session with `/new`
- For skills: check `requires.bins` eligibility

**Agent knows the tool exists but never picks it.**
- Description is too vague. Rewrite it to match the user's natural phrasing.
- Too many overlapping tools. Remove duplicates.
- Tool name doesn't match intent. Rename.

**Agent picks the tool but calls it wrong.**
- Parameter descriptions are unclear.
- Required params are missing from schema (model skips them).
- Examples in skill body would help.

**Agent calls the tool and gets errors.**
- Check return format — the agent needs readable text, not raw JSON
- `isError: true` is properly set on failure returns
- Error text tells the agent WHAT TO DO (retry, ask user, give up)

**Agent retries the tool in a loop.**
- Return text doesn't make it clear the call succeeded
- Idempotency is broken (agent thinks it failed because the effect isn't obvious)
- Tool loop detection should eventually trip; if not, add explicit "STOP" guidance in AGENTS.md

## Tool design checklist — run before approving any tool plan

Before the Architect skill drafts a plugin tool (or any new tool surface), it walks this short checklist with the user. Every item has a one-line answer; if any is vague, the plan isn't ready.

1. **Name reflects user intent, not internal implementation.** `find_customer` beats `run_sql_query_against_customers`. If the name encodes the storage layer or the HTTP verb, rename it.
2. **Parameters are flat, typed, and described.** Every param has a type, a one-sentence description, and sensible defaults where it can. No nested config blobs just because the underlying API has them.
3. **Return format tells the agent what to do next.** Formatted text with a clear "what happened" line is almost always better than a raw JSON dump. If the agent has to parse the return, you've pushed parsing into the model.
4. **Error handling is explicit.** Every error path returns `isError: true` with a readable message. Silent-failure-as-success is the worst default in tool design.
5. **Idempotency is defined.** For mutating tools, say out loud whether retry is safe. If it isn't, the tool needs an idempotency key or a check-before-write step.
6. **One tool, one job.** If the tool takes an `action` param that switches between create/update/delete, split it. The model's tool picker handles distinct names better than branch tables.

This is the checklist version of the "Tool design principles" section earlier in this file. The principles explain the why; this list is what the Architect skill should actually run through, item by item, before saying "yes, let's build it."

## Anti-patterns — tools that look useful but don't work well

1. **The Swiss Army knife tool.** A single `do_thing(action, params)` tool with action `"create"|"update"|"delete"|"search"`. Split into separate tools. The model's tool picker works better on distinct tools.

2. **The nested JSON params tool.** `params: { config: { options: { filters: [...] } } }`. Flatten. The model fills out structured params better when they're one level deep.

3. **The raw-passthrough tool.** `execute_sql(query: string)`. Technically powerful, but the model writes bad SQL under pressure. Prefer `find_customer(email)`, `create_note(customer_id, note)`, etc.

4. **The overlapping tool set.** `get_user`, `find_user`, `lookup_user`, `user_details`. Model can't tell them apart. Pick one name and delete the others.

5. **The silent-failure tool.** Errors returned as `{ content: [{ type: "text", text: "ok" }] }` when things actually failed. The agent trusts you.

6. **The trap-door tool.** A read-only-looking tool that has side effects. `get_user(email)` that also LOGS the query to an audit system and triggers a notification. Document surprising behavior in the description.

7. **The raw-JSON tool.** Returns a giant structured object the agent has to parse. Prefer formatted text that says exactly what the agent needs to know.

8. **The zero-error tool.** Never returns `isError: true`. Returns "something went wrong" as normal text. Agent treats it as success.

## Summary — which path, when

| Situation | Build |
|-----------|-------|
| "I have `rg` installed; teach the agent to use it" | Skill |
| "My InsightVM CSV parser is a Python script at `~/bin/`" | CLI + Skill |
| "I want a `jira_create_issue` tool with typed params" | Plugin tool |
| "I want to use the GitHub MCP server" | External MCP (config only) |
| "I want to expose my CRM to OpenClaw AND Claude Desktop" | Build MCP server |

Design principles apply to all paths:
- Name for intent, not implementation
- Flat, typed parameters with real descriptions
- Return readable text, not raw data
- Errors structured, not thrown
- Idempotency where it matters
- One tool one job

Testing is the same shape across paths: verify registration, test standalone, exercise from chat with natural prompts, debug from logs.

When in doubt, start with the simplest path that fits (skill > CLI+skill > MCP client > plugin > MCP server). You can always upgrade a skill to a plugin later. Downgrading a plugin to a skill is rare because if you went to plugin you probably had a real reason.
