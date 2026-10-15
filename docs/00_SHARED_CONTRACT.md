# 00 — SHARED CONTRACT (read first, on BOTH laptops)

> **FOR THE AI AGENT (Antigravity / Gemini Flash):** You are one of two agents building **MCP Lens** in parallel with another agent on another laptop. This file is the contract between you. It is **read-only**: never edit it. If you think it is wrong, STOP and tell the developer.
> Your own task file is `01_LAPTOP_A_SERVER.md` (server) or `02_LAPTOP_B_WEB.md` (web). Work **one phase at a time**. Every `⛔ STOP` marker means: finish the phase, run its checks, show the developer a short report, and **wait for the developer to type "GO"**. Do not continue past a STOP on your own.

---

## 1. What we are building (one paragraph)

**MCP Lens** = a self-hosted **MCP server** (4 tools over ~50 seeded markdown notes) + a **web app** that is (a) a **real MCP client** over **Streamable HTTP** that *visualizes* the whole protocol lifecycle live (handshake → tools/list → tools/call, streamed chunks, latency, errors) and (b) an **Alexa+-style chat panel** that calls the same tools. Target: Amazon Developer Hackathon (Devpost), **Alexa+ track**. Judges may score from the demo video + written description alone, so correctness and legibility of the protocol traffic on screen is the product.

**Deadline: Fri 23 Oct 2026, 12:00 pm PT (= Sat 24 Oct, 12:30 am IST). No edits after. We submit on Thu 22 Oct.**

## 2. Hard rules (both agents)

1. **Never invent protocol details.** Method names, field names, header names, capability shapes, error codes: read the official spec / SDK docs first (URLs in each task file). If you cannot access the web, STOP and tell the developer.
2. **Scope is fixed:** exactly 4 tools, 1 server, 1 web app, 1 static bearer token. **Out of scope:** multi-user, OAuth, databases, mobile, email, extra tools, accounts, voice/TTS.
3. **Honest labeling.** The notes are *seeded sample data*. The chat panel *simulates* the Alexa+ surface (allowed). The real MCP traffic must be visible underneath. **Never claim a real Alexa+ device connection.** Anything produced by a mock (LLM mock, dev mock server) must be labeled as such in the UI/logs.
4. **No secrets in git.** Only `.env.example` is committed. Real keys/tokens live in untracked `.env` files.
5. **Small, polished, reliable beats ambitious.** If a phase is running long, cut features, not correctness.
6. Keep replies to the developer short: what you did, what passed, what you need.

## 3. Protocol decision (IMPORTANT — verified by the developer's assistant on 15 Oct 2026, to be re-confirmed by Laptop A)

Leads found, **not yet confirmed by you** — Laptop A must confirm each in `docs/SPEC_FINDINGS.md` (Phase A1):

- The brief targets spec **2025-11-25 or later**. A **newer revision, 2026-07-28**, now exists. According to its changelog it **removes protocol-level sessions** (no `Mcp-Session-Id`) and, per at least one SDK's release notes, **removes the `initialize` / `notifications/initialized` handshake** (replaced by a discovery mechanism). It also adds mirrored HTTP headers (`Mcp-Method`, `Mcp-Name`, …).
- The official TypeScript SDK **v2** (`@modelcontextprotocol/server`, `@modelcontextprotocol/client`) implements 2026-07-28 and is reported to serve 2025-11-25 as well, negotiated per connection. SDK **v1** (`@modelcontextprotocol/sdk`) is the older generation.
- **Our project's story is the `initialize → tools/list → tools/call` lifecycle made visible.** That lifecycle exists in **2025-11-25**.

**Decision (default, developer may override at STOP A1):** target protocol version **`2025-11-25`**, force the legacy handshake on the client, and make the Lens a *generic wire-tap* so it would also display a 2026-07-28 exchange correctly (it simply renders whatever JSON-RPC messages occur; it must not hard-code the assumption that `initialize` always exists).

**One SDK generation, same on both laptops.** Laptop A picks it in `SPEC_FINDINGS.md`; Laptop B follows. Do not mix v1 on one side and v2 on the other unless A's findings say it works.

## 4. Repo, ownership, git rules

One public GitHub repo `mcp-lens` (created by the developer at STOP 0). Layout:

```
mcp-lens/
├── README.md                 # Laptop B drafts web part, Laptop A adds server/deploy part
├── LICENSE                   # MIT — Laptop A
├── FRICTION_LOG.md           # assembled at the end from the two files below
├── docs/
│   ├── 00_SHARED_CONTRACT.md  # this file (read-only)
│   ├── 01_LAPTOP_A_SERVER.md
│   ├── 02_LAPTOP_B_WEB.md
│   ├── SPEC_FINDINGS.md       # Laptop A writes (Phase A1)
│   ├── tools.snapshot.json    # Laptop A writes (Phase A3): real tools/list output
│   ├── friction/FRICTION_A.md # Laptop A, append-only
│   ├── friction/FRICTION_B.md # Laptop B, append-only
│   ├── DEMO_SCRIPT.md         # Laptop B
│   └── DEVPOST_DESCRIPTION.md # Laptop B
├── server/                    # OWNED BY LAPTOP A (incl. server/corpus/)
├── deploy/                    # OWNED BY LAPTOP A
└── web/                       # OWNED BY LAPTOP B (incl. web/dev-mock/)
```

- **Never edit files owned by the other laptop.** Shared docs are only changed by the developer.
- Laptop A commits to branch `laptop-a`, Laptop B to `laptop-b`. The developer merges both into `main` at integration stops. Commit after every phase: `git commit -m "A2: handshake + auth done"`.
- Both laptops: `git pull origin main` at the start of each phase.

## 5. Network contract

| Item | Value |
|---|---|
| MCP endpoint | `POST {SERVER_URL}` where local `SERVER_URL=http://localhost:8787/mcp` (single endpoint; Streamable HTTP) |
| Auth | Header `Authorization: Bearer <token>` on every request. Wrong/missing → HTTP **401** with a small JSON body `{"error":"unauthorized"}`. |
| Local ports | server **8787**, web **5173**, web dev-mock server **8788** |
| Web app hosting | The web app runs **locally** (Laptop B, `localhost:5173`). Only the server goes to AWS Lambda. |
| CORS | Server must answer browser preflight for the web origin and allow **every request header the SDK/spec sends** (at minimum `Authorization`, `Content-Type`, `Accept`, plus the MCP headers the confirmed spec defines — A lists them in `SPEC_FINDINGS.md`) and **expose** any MCP response header the browser client must read (e.g. a session-id header if the confirmed spec has one). CORS is configured in **one place only** (in code *or* on the Lambda Function URL — A decides and documents it). |
| Origin check | Server validates `Origin` against `ALLOWED_ORIGINS` (default `http://localhost:5173`); an invalid present Origin → **403**. |
| Statelessness | Server must be **stateless per request** (no in-memory session store) so it works on Lambda. If the confirmed 2025-11-25 SDK needs a stateless mode flag, use it. |
| Token handling in the web app | Token is **typed/pasted into a Connect form** (and may be prefilled from `VITE_DEFAULT_TOKEN` for local dev). Keep it in memory/sessionStorage. It is a demo token guarding sample data; the README says so. |

**Environment variables**

Server (`server/.env`): `PORT=8787`, `MCP_LENS_TOKEN=dev-token-change-me`, `ALLOWED_ORIGINS=http://localhost:5173`, `CORPUS_NOW=2026-10-21`, `SUMMARY_CHUNK_DELAY_MS=60`, `LLM_PROVIDER=mock`, plus provider-specific keys added at STOP A4.
Web (`web/.env`): `VITE_DEFAULT_SERVER_URL=http://localhost:8787/mcp`, `VITE_DEFAULT_TOKEN=dev-token-change-me`.

## 6. Tool contract (our own app-level schemas — protocol framing comes from the spec)

Server `name`: `mcp-lens-notes`, `version`: `0.1.0`. Each tool returns BOTH a human-readable `content` text block AND `structuredContent` (if the confirmed spec supports it — expected yes), and declares an `outputSchema` in `tools/list` when supported. Every `structuredContent` includes `meta: { llm: "mock" | "<provider:model>", corpus: "seeded-sample-data" }`.

### 6.1 `search_notes`
- Input: `{ query: string, limit?: integer (1–10, default 5) }`
- Output `structuredContent`: `{ results: [{ noteId: string, title: string, date: string /*YYYY-MM-DD*/, snippet: string, score: number }], meta }`
- Implementation: pure-TypeScript keyword/BM25-style ranking over title + body + tags. No embeddings, no external service.

### 6.2 `summarize` — **STREAMED**
- Input: `{ noteId?: string, query?: string, style?: "brief" | "detailed" }` — exactly one of `noteId` / `query` required (else tool error).
- Behavior: emits **at least 3 incremental partial-output events** before the final result, each carrying the text produced so far or the next chunk. **How a partial event is represented is decided by the confirmed spec** (candidates to evaluate: progress notifications carrying a message, or logging/message notifications, sent on the SSE response stream before the final JSON-RPC response). Laptop A records the choice and its reasoning in `SPEC_FINDINGS.md` and `FRICTION_A.md`.
- Final output: `{ summary: string, sources: [noteId], style, meta }`
- Fallback (from the brief): if streaming cannot be confirmed, ship non-streamed results first and add streaming to `summarize` only. Record it in the friction log.

### 6.3 `extract_tasks`
- Input: `{ noteId?: string, query?: string, sinceDays?: integer (1–60) }` — resolved against `CORPUS_NOW`.
- Output `structuredContent`: `{ tasks: [{ task: string, owner?: string, due?: string /*YYYY-MM-DD*/, sourceNoteId: string, sourceTitle: string }], count: integer, meta }`
- Implementation: **deterministic parser first** (markdown checkboxes `- [ ]`, `TODO:`, `Action:` lines, `@owner`, `due: …`). LLM pass for implicit tasks is optional and only enabled when a real provider is configured.

### 6.4 `draft_reply`
- Input: `{ noteId: string, tone?: "friendly" | "formal" | "brief", intent?: string }`
- Output: `{ subject: string, body: string, noteId: string, meta }`

## 7. Error contract

- **Auth failure** → HTTP 401 (not a JSON-RPC error). The Lens must display it as a transport-level error.
- **Unknown tool / invalid arguments** → protocol-level JSON-RPC error as defined by the spec/SDK.
- **Tool ran but failed** (e.g. `noteId` not found) → tool result with `isError: true` and a readable message (per spec). Laptop A verifies this distinction in `SPEC_FINDINGS.md`.
- The Lens shows all three kinds distinctly. Web has three "Trigger error" demo buttons: bad token, unknown note, invalid arguments.

## 8. LLM contract

- Server has a provider abstraction (`server/src/llm/`) with `LLM_PROVIDER=mock` as default. The **mock must work offline, deterministically**: extractive summaries (first N sentences) streamed word-by-word; templated drafts.
- When a real provider is configured (STOP A4), it replaces the mock for `summarize` and `draft_reply` (and the optional `extract_tasks` pass). If the provider fails or the key is missing, the server falls back to the mock **and says so in `meta.llm`** — it never crashes and never pretends.
- API keys exist **server-side only**.

## 9. Corpus contract

- `server/corpus/*.md`, **50 notes**, each with YAML frontmatter: `id` (e.g. `n001`), `title`, `date` (YYYY-MM-DD, between 2026-09-20 and 2026-10-20), `tags: []`.
- Realistic, varied: meeting notes, project updates, 1:1s, trip planning, reading notes, personal errands, incident reviews, client emails. ~120–300 words each.
- At least **18 notes** contain action items in varied formats; at least **10** of those are dated within the 7 days before `CORPUS_NOW=2026-10-21` so the demo query *"What are my open action items from last week's notes?"* returns a rich, real result.
- A `server/corpus/README.md` states: **"Seeded sample data, fictional people and companies."**

## 10. Stop-point map (for the developer)

| # | Who | When | What the developer must do |
|---|---|---|---|
| STOP 0 | Dev | before anything | Create GitHub repo, clone on both laptops, copy these 3 docs into `docs/` |
| STOP A1 | A | after spec + SDK research | Read `SPEC_FINDINGS.md`, confirm protocol version + SDK generation, say GO |
| STOP A3 | A | server works locally, mock LLM | Run smoke test yourself, push, tell Laptop B the server is ready |
| STOP A4 | A | LLM provider | Choose provider, put key in `server/.env` |
| STOP A5 | A | AWS deploy | Provide AWS credentials/region, approve deploy, copy Function URL + token to Laptop B |
| STOP B2 | B | needs A1 findings | `git pull`, confirm `SPEC_FINDINGS.md` is on `main`, say GO |
| STOP B5 | B | integration | Put real `SERVER_URL`/token in `web/.env`, run end-to-end against local server, then Lambda |
| STOP B6 | Dev | after B6 | Record video, finalize Devpost text, make repo public, submit by 22 Oct |

## 11. Target schedule (today is Thu 15 Oct)

| Day | Laptop A | Laptop B |
|---|---|---|
| Thu 15 | A0–A1 (verify), A2 (handshake) | B0–B1 (UI shell on fixtures) |
| Fri 16 | A3 (corpus + 4 tools, mock LLM) | B2 (client + dev-mock), B3 (Lens) |
| Sat 17 | A4 (real LLM) | B3 finish, B4 (chat panel) |
| Sun 18 | A5 (Lambda) | B5 (integrate vs local server) |
| Mon 19 | A6 (hardening) | B5 vs Lambda, fixes |
| Tue 20 | support | B6 (demo script, description draft) |
| Wed 21 | record video, friction log, README, make repo public | |
| Thu 22 | **SUBMIT** | |
| Fri 23 | buffer only | |

## 12. Friction log protocol

From the first spec question onward, append dated entries to your own file (`docs/friction/FRICTION_A.md` or `_B.md`): *what was unclear, what you tried, what you decided, suggested doc fix*. Honest, specific, short. These feed the ~10% feedback bonus. The developer merges both into `FRICTION_LOG.md` on 21 Oct.
