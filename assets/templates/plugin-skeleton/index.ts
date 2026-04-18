// index.ts — OpenClaw plugin entry point
//
// This skeleton registers:
// 1. A simple custom tool the agent can call
// 2. A `before_tool_call` hook that logs all tool invocations
// 3. A `session_start` hook that logs session starts
//
// Remove or extend each section as needed. See docs.openclaw.ai/plugins for 
// the full API reference.

import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { Type } from "@sinclair/typebox";

export default definePluginEntry({
  id: "example-plugin",
  name: "Example Plugin",
  description: "Skeleton plugin showing tool registration and lifecycle hooks",

  register(api) {
    // --- Custom tool -----------------------------------------------------
    // A typed function the agent can call with structured parameters.
    // Remove this block if your plugin doesn't add tools.

    api.registerTool({
      name: "example_echo",
      description: "Echo back the input with a timestamp — useful for verifying the plugin loaded",
      parameters: Type.Object({
        text: Type.String({ description: "Text to echo back" }),
        uppercase: Type.Optional(Type.Boolean({ description: "If true, uppercase the output" })),
      }),
      async execute(_id, params) {
        const timestamp = new Date().toISOString();
        const text = params.uppercase ? params.text.toUpperCase() : params.text;
        return {
          content: [
            {
              type: "text",
              text: `[${timestamp}] ${text}`,
            },
          ],
        };
      },
    });

    // --- Tool-call audit hook --------------------------------------------
    // Logs every tool call. Use this as a starting point for:
    //   - Rate limiting (see references/authoring-plugins.md)
    //   - Blocking specific dangerous patterns
    //   - Adding approval prompts for sensitive operations
    //
    // Decision semantics reminder:
    //   { block: true } — terminal, stops tool call + lower-priority handlers
    //   { block: false } — no-op; does NOT clear an earlier block
    //   block wins over requireApproval

    api.registerHook("before_tool_call", async (event) => {
      console.log(
        `[example-plugin] tool_call: ${event.toolName} (session=${event.sessionKey})`
      );

      // Example: require approval for exec commands that mention "rm -rf"
      if (event.toolName === "exec" && String(event.params?.command).includes("rm -rf")) {
        return {
          requireApproval: {
            title: "Destructive command",
            description: `Agent wants to run: ${event.params.command}`,
            severity: "critical" as const,
            timeoutMs: 120_000,
            timeoutBehavior: "deny" as const,
            onResolution: async (decision) => {
              console.log(`[example-plugin] rm-rf approval decision: ${decision}`);
            },
          },
        };
      }

      return { block: false };
    });

    // --- Session lifecycle hook ------------------------------------------
    // Fires when any session starts. Useful for:
    //   - Per-session state initialization
    //   - Metrics collection
    //   - Injecting session-scoped context

    api.registerHook("session_start", async (event) => {
      console.log(
        `[example-plugin] session_start: ${event.sessionKey} (agent=${event.agentId})`
      );
    });

    // --- Install gate (optional) -----------------------------------------
    // Uncomment and customize if you want this plugin to gate OTHER installs.
    // See references/security-audit.md for the install-policy pattern.

    // api.registerHook("before_install", async (event) => {
    //   if (event.builtinScan.critical > 0) {
    //     return { block: true, blockReason: "Built-in scanner found critical issues" };
    //   }
    //   return { block: false };
    // });
  },
});
