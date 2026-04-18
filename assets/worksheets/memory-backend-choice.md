# Memory Backend Choice

Picking a memory backend is a *capacity* decision, not a *correctness* one. Every backend listed here works; the differences are cost, latency under load, and cross-agent sharing. Start with the simplest one that fits your scale — upgrade only when you see the specific friction it solves.

Pair with: `references/memory-system.md` (full discussion), `assets/templates/MEMORY.md` (seed template).

---

## The four common backends

| Backend | What it is | Strengths | Weak spots |
|---------|------------|-----------|------------|
| **memory-core (SQLite)** | Built-in. File-backed SQLite in `~/.openclaw/`. | Zero setup. Fast for < 10k messages/day. Easy to inspect (`sqlite3`). | Single-writer; cross-agent sharing is clumsy. No vector search. |
| **lancedb** | Columnar embedded vector store. | Vector search on session history; works offline. Still file-backed. | Needs embeddings budget. Overkill if you only grep. |
| **qmd** | Queryable Markdown Memory Database. | Markdown-first; human-readable on disk; good for semantic grep across agents. | Newer, fewer battle-tested patterns. |
| **honcho** | Network service; multi-agent persona + fact store. | First-class cross-agent sharing; persona/user modeling out of the box. | Runs a service. Adds a dependency to debug when it drifts. |

---

## Quick-pick matrix

Cross-reference your row:

| Messages/day | Concurrent agents | Cross-agent sharing? | Semantic / vector search? | Pick |
|-------------:|-------------------:|---------------------|---------------------------|------|
| < 500 | 1 | No | No | **memory-core** |
| < 500 | 1 | No | Yes (search old chats) | **lancedb** |
| 500–5k | 1 | No | No | **memory-core** (still fine) |
| 500–5k | 1 | No | Yes | **lancedb** |
| < 5k | 2–4 | Yes (share facts) | No | **qmd** |
| < 5k | 2–4 | Yes | Yes | **qmd** + lancedb on the side |
| 5k–50k | 1 | No | No | **memory-core**, watch write latency |
| 5k–50k | 1 | No | Yes | **lancedb** |
| 5k–50k | 2+ | Yes | Either | **honcho** |
| > 50k | Any | Any | Any | **honcho** — you've outgrown embedded stores |

---

## Decision order (use this if the matrix doesn't map cleanly)

1. **Default to memory-core.** It's built in. Most single-user homelab agents live here forever.
2. **Upgrade to lancedb only when you need semantic search** across session history. Don't add it pre-emptively — embeddings cost budget and add a background job.
3. **Upgrade to qmd when two or more agents need to read the same facts** and you want those facts as Markdown on disk (readable, diffable, grep-able).
4. **Upgrade to honcho when** (a) you run a small fleet of agents per user, (b) you want per-user persona/fact modeling without rolling it yourself, or (c) write throughput on embedded stores starts slipping.

---

## Durable seeding (applies to all backends)

No matter the backend, the three-file durable memory pattern is the same:

- `MEMORY.md` — 3–5 durable facts, < 5 KB. Seed template at `assets/templates/MEMORY.md`.
- `memory/YYYY-MM-DD.md` — daily scratch. Append-only, auto-created.
- `DREAMS.md` — consolidation of old daily files > 90 days. Append-only.

The backend choice only affects **session memory** (the conversational recall), not the durable seed files above.

---

## Red flags that tell you to upgrade

- Your agent forgets a fact it was told last week → seed it into `MEMORY.md` (backend change won't help).
- Gateway responses got noticeably slower after you crossed 10k messages → memory-core write latency. Move to lancedb or honcho.
- You're managing a second agent and manually copying facts between them → move to qmd or honcho.
- You asked "what did we decide about X last month?" and got a useless answer → you need vector search (lancedb).

---

## See also

- `references/memory-system.md` — the canonical memory reference
- `assets/templates/MEMORY.md` — durable seed template
- `assets/templates/DREAMS.md` — consolidation log template
