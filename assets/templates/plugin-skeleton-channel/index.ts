// index.ts — OpenClaw channel plugin entry point
//
// A channel plugin teaches the gateway to send/receive on a new platform.
// Inbound messages become agent sessions; outbound agent replies are routed
// back through send().
//
// Minimum viable channel:
//   - listen(onInbound) — connect and call onInbound(message) per inbound
//   - send(target, content) — deliver outbound to a peer on your platform
//   - validatePeerId(id) — verify that an id is well-formed
//
// Full API: docs.openclaw.ai/plugins/sdk-channel-plugins

import { defineChannelPluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default defineChannelPluginEntry({
  id: "example-channel",
  name: "Example Channel",
  description: "Skeleton channel plugin — replace with your platform adapter",

  register(api) {
    api.registerChannel({
      id: "example-channel",
      displayName: "Example Channel",

      // Default DM policy if the user didn't set one.
      // Safe default = "pairing". Do NOT default to "open".
      defaultDmPolicy: "pairing",

      // Validate that a peer id is well-formed for your platform.
      // Called before pairing and before routing inbound.
      validatePeerId(id: string): boolean {
        // Example: accept any non-empty string of digits (Telegram-like)
        return typeof id === "string" && /^\d+$/.test(id);
      },

      // Start listening. Call `onInbound` once per inbound message.
      // You're responsible for reconnect, backoff, and not crashing on malformed input.
      async listen(onInbound) {
        // Example — poll every 5s, yield messages one at a time.
        // Replace with your actual transport: websocket, webhook, long-poll, etc.
        const pollIntervalMs = 5000;
        let running = true;

        (async () => {
          while (running) {
            try {
              const incoming: Array<{ from: string; text: string }> = await fetchNewMessages();
              for (const msg of incoming) {
                // Size check BEFORE handing off to the agent.
                if (msg.text.length > 10_000) {
                  console.warn(`[example-channel] dropping oversized message from ${msg.from}`);
                  continue;
                }
                await onInbound({
                  peerId: msg.from,
                  content: [{ type: "text", text: msg.text }],
                });
              }
            } catch (err) {
              console.error("[example-channel] listen error:", err);
            }
            await sleep(pollIntervalMs);
          }
        })();

        // Return a teardown function the gateway will call on shutdown.
        return () => {
          running = false;
        };
      },

      // Deliver a message to a peer.
      async send(target, content) {
        const text = content
          .filter((c) => c.type === "text")
          .map((c) => (c as { type: "text"; text: string }).text)
          .join("\n");

        // Example — POST to your platform's send endpoint.
        const response = await fetch("https://api.example.com/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: target.peerId, text }),
        });
        if (!response.ok) {
          throw new Error(`send failed: ${response.status} ${response.statusText}`);
        }
      },
    });

    // Example channel-scoped hook — log every outbound, useful for audit.
    // Remove if you don't need it.
    api.registerHook("message_sent", async (event) => {
      if (event.channel === "example-channel") {
        console.log(`[example-channel] delivered to ${event.peerId}`);
      }
    });
  },
});

// --- helpers --------------------------------------------------------------

async function fetchNewMessages(): Promise<Array<{ from: string; text: string }>> {
  // Replace with your real fetch.
  return [];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
