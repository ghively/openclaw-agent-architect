// index.ts — OpenClaw context engine plugin
//
// A context engine decides what the agent "sees" each turn. This skeleton
// shows the three required methods and the ownsCompaction choice.
//
// READ BEFORE EDITING: references/authoring-plugins.md § "Advanced —
// ownsCompaction for context engines". A no-op compact() with
// ownsCompaction: true silently disables overflow recovery. Don't ship that.

import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { delegateCompactionToRuntime } from "openclaw/plugin-sdk/core";

export default definePluginEntry({
  id: "example-context-engine",
  name: "Example Context Engine",
  description: "Skeleton context engine — replace with your retrieval/compaction strategy",

  register(api) {
    api.registerContextEngine("example-context-engine", () => ({
      info: {
        id: "example-context-engine",
        name: "Example Context Engine",

        // Flip this to true ONLY if you implement a real compact() below.
        // false is the safer default; runtime handles compaction for you.
        ownsCompaction: false,
      },

      // Fires per inbound message. Persist, embed, index — whatever your
      // retrieval strategy needs. Return { ingested: true } to confirm.
      async ingest({ sessionId, message }) {
        // Example: write to an in-memory ring buffer keyed by session.
        buffer(sessionId).push({
          role: message.role,
          text: extractText(message),
          ts: Date.now(),
        });
        return { ingested: true };
      },

      // Build the context for the next LLM call. You decide which messages
      // survive into `tokenBudget`. Return estimatedTokens honestly — the
      // runtime uses it to sanity-check against budget and to decide when
      // to trigger compact().
      async assemble({ sessionId, messages, tokenBudget }) {
        const selected = selectWithinBudget(messages, tokenBudget);
        return {
          messages: selected,
          estimatedTokens: estimateTokens(selected),
          // Optional — append guidance about how to use any tools you rely on.
          systemPromptAddition: undefined,
        };
      },

      // Compact when over budget. Two paths:
      //
      // A) ownsCompaction: true  → You implement a real summarizer here.
      //    A no-op is UNSAFE and breaks /compact and overflow recovery.
      //
      // B) ownsCompaction: false → Delegate to the runtime and move on.
      async compact(params) {
        return delegateCompactionToRuntime(params);
      },
    }));

    // Optional lifecycle visibility — useful during development.
    api.registerHook("session_start", async (event) => {
      console.log(`[example-context-engine] session_start: ${event.sessionKey}`);
    });
    api.registerHook("session_end", async (event) => {
      buffers.delete(event.sessionKey);
      console.log(`[example-context-engine] session_end: ${event.sessionKey}`);
    });
  },
});

// --- stub implementation details ------------------------------------------
// Replace these with your real storage / retrieval strategy.

interface BufferedMessage {
  role: string;
  text: string;
  ts: number;
}

const buffers = new Map<string, BufferedMessage[]>();

function buffer(sessionId: string): BufferedMessage[] {
  let b = buffers.get(sessionId);
  if (!b) {
    b = [];
    buffers.set(sessionId, b);
  }
  return b;
}

function extractText(message: unknown): string {
  // Sketch — adapt to your message shape.
  if (typeof message === "object" && message !== null && "content" in message) {
    return String((message as { content: unknown }).content);
  }
  return "";
}

function selectWithinBudget<T>(messages: T[], _tokenBudget: number): T[] {
  // Replace with your actual selection strategy — recency, relevance,
  // vector-similarity, mixed. Here we pass everything through.
  return messages;
}

function estimateTokens<T>(messages: T[]): number {
  // Crude but better than nothing. Replace with a real tokenizer.
  return messages.reduce((sum, m) => sum + JSON.stringify(m).length / 4, 0);
}
