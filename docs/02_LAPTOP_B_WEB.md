# 02 — LAPTOP B: WEB APP (real MCP client, Lens view, Alexa+-style chat panel)

> **FOR THE AI AGENT (Antigravity / Gemini Flash):** You are **Laptop B**. You own `web/` (including `web/dev-mock/`), `docs/friction/FRICTION_B.md`, `docs/DEMO_SCRIPT.md`, `docs/DEVPOST_DESCRIPTION.md`, and the web part of `README.md`.
> **First, read `docs/00_SHARED_CONTRACT.md` completely.** It defines the endpoint, auth, tool schemas, error rules and stop points. Do not contradict it.
> Work **one phase at a time**. At each `⛔ STOP`, print a short report and **wait for the developer to type GO**.
> **Never invent protocol details.** The client must be a **real MCP client** (official SDK client + a wire-tap), not a fake. If you cannot browse the web, STOP and say so.

**Kickoff prompt the developer will paste:**
> Read docs/00_SHARED_CONTRACT.md and docs/02_LAPTOP_B_WEB.md. You are Laptop B. Start at Phase B0 and stop at every ⛔ STOP.

**Stack (default):** Vite + React + TypeScript, plain CSS (CSS variables, no UI kit), `vitest` for logic tests. The MCP client library is the **official TypeScript SDK client**, same generation as Laptop A picks in `docs/SPEC_FINDINGS.md`.

**What the product must do:** make the MCP lifecycle **legible on screen**. The Lens is the centerpiece; spend your design effort there. The video's first 15 seconds are: type *"What are my open action items from last week's notes?"* → the chat answers **and** the Lens shows the `tools/call` firing live.

---

## Phase B0 — Setup (10 min)

- [ ] `git pull origin main`, `git checkout -b laptop-b`.
- [ ] Create `docs/friction/FRICTION_B.md` with a title line. Check `node -v` ≥ 20.

## Phase B1 — UI shell on fixtures (NO protocol code yet; runs in parallel with Laptop A's research)

- [ ] Scaffold `web/` with Vite React TS. `.env.example`: `VITE_DEFAULT_SERVER_URL`, `VITE_DEFAULT_TOKEN`. `.gitignore` incl. `.env`.
- [ ] Define the **WireEvent model** in `src/lens/types.ts` (protocol-agnostic, generic wire-tap):
  - `kind`: `"http-request" | "http-response" | "jsonrpc-request" | "jsonrpc-response" | "jsonrpc-notification" | "sse-event" | "error"`
  - `id`, `t` (ms since connect), `direction` (`"out"|"in"`), `method?` (JSON-RPC method if any), `rpcId?`, `status?` (HTTP), `latencyMs?`, `payload` (raw JSON), `callId?` (groups events of one tool call), `severity` (`"info"|"error"`), `errorKind?` (`"transport"|"protocol"|"tool"`).
  - The Lens must **not hard-code that `initialize` exists**; it renders whatever JSON-RPC messages appear.
- [ ] `src/lens/fixtures.ts`: a hand-written fake event sequence (handshake, list, a streamed summarize with 5 chunks, a structured extract_tasks result, one error of each kind). **Label it "FIXTURE DATA" in the UI** whenever fixtures are shown.
- [ ] Layout (desktop-first, 1280px wide; usable at 1024): left **Lens** (≈60%), right **Chat panel** (≈40%), top **ConnectionBar**.
- [ ] Build with fixtures:
  - `ConnectionBar`: server URL input, token input (password field), Connect/Disconnect button, status pill, badges: **Protocol version**, **LLM: mock/<provider>** (from `meta.llm`), **"Corpus: seeded sample data"**, **"Chat: simulated Alexa+ surface"**.
  - `HandshakeTimeline`: vertical timeline of wire events, color-coded (outgoing request / incoming response / notification / error), each with relative time and latency; click opens the `RawJsonDrawer`.
  - `ToolsPanel`: renders the `tools/list` result as cards (name, description, input schema as a compact table, output schema badge).
  - `CallLog`: one row per `tools/call` (tool, args summary, duration, status chip: ok / tool-error / protocol-error / transport-error), expandable to show args, result text, **structuredContent** pretty-printed.
  - `StreamView`: shows partial chunks of a streamed call arriving with per-chunk timestamps and a progress bar; final result appended below.
  - `RawJsonDrawer`: slide-over with syntax-highlighted JSON (dependency-free is fine), Copy button; the Authorization header is always shown as `Bearer ••••`.
  - `ChatPanel` shell: message list, input, 4 suggestion chips, banner "Simulated Alexa+ conversational surface — real MCP traffic is shown in the Lens".
- [ ] Visual direction: dark theme, generous spacing, monospace for JSON/method names, one accent color, clear status colors, no clutter. Must look good in a 1080p screen recording.

**Done when:** `npm run dev` shows the full layout driven by fixtures; every panel renders; `npm run build` passes.
Commit: `B1: UI shell`.

## ⛔ STOP B2 (gate before protocol work)

Tell the developer: *"B1 is done. I need Laptop A's `docs/SPEC_FINDINGS.md` on `main` before writing protocol code. Please `git pull origin main` and confirm the file exists, then say GO."* Do not start B2 until it exists and you have read it. Follow its **SDK generation, versions, and handshake-forcing method**.

## Phase B2 — Real client + dev mock server

- [ ] `web/dev-mock/` — a **dev-only** MCP server on port **8788** built with the **official SDK server**, exposing the 4 tools from contract §6 with canned/fake data (including a `summarize` that streams ≥3 partial events using the mechanism in `SPEC_FINDINGS.md`, and an `extract_tasks` with structuredContent). Same bearer check and CORS as contract §5. Banner on startup: `DEV MOCK — fake data`. Document in `web/README.md` that it exists only so the UI can be built before Laptop A's server is ready. (Skip building this if Laptop A's server is already runnable and `docs/tools.snapshot.json` exists — then connect to it directly and say so.)
- [ ] `src/mcpClient.ts` — a **real MCP client**:
  - Uses the official SDK **client** with a Streamable HTTP transport, bearer header, and the method that forces the **2025-11-25** handshake (per `SPEC_FINDINGS.md`).
  - Passes a **custom `fetch`** (the wire-tap): for every HTTP exchange it records a WireEvent for the request (JSON-RPC method/id parsed from the body; Authorization redacted) and, for the response, status + content type + latency. For `text/event-stream` responses, **tee/clone the response body** and emit one `sse-event` WireEvent per SSE event with a timestamp **while the original response still goes untouched to the SDK**. Never consume the stream the SDK needs.
  - Exposes: `connect()`, `listTools()`, `callTool(name, args, { onProgress })`, `disconnect()`, and an `EventTarget`/store the Lens subscribes to.
  - Classifies errors into `transport` (HTTP 401/403/network), `protocol` (JSON-RPC error), `tool` (`isError: true`).
  - Captures streamed partial output for `StreamView` through the same mechanism the SDK/spec provides (progress callback or notification handler — follow `SPEC_FINDINGS.md`).
- [ ] A **"Run full lifecycle"** button: connect → list tools → call each of the 4 tools with sensible sample arguments (e.g. `search_notes {query:"launch"}`, `summarize {noteId:"n001"}`, `extract_tasks {sinceDays:7}`, `draft_reply {noteId:"n001"}`). The Lens updates live.
- [ ] Three **"Trigger error"** buttons: bad token (→ transport error), unknown `noteId` (→ tool error), invalid arguments (→ protocol error). Each must display distinctly.
- [ ] Tests (vitest): wire-tap redacts the token; an SSE body split across chunks is parsed into the right number of events; error classification.

**Done when:** against `dev-mock` (or Laptop A's server), "Run full lifecycle" completes, the Lens shows the real handshake events as they happen, `StreamView` shows ≥3 chunks arriving over time, and all three error buttons render correctly.
Commit: `B2: real client + wire-tap`.

## Phase B3 — Lens polish (this is where the Design/Demo points live)

- [ ] Replace fixtures with live events everywhere (keep fixtures behind a hidden `?fixtures=1` query flag, clearly labeled).
- [ ] Handshake timeline shows: negotiated protocol version, server name/version, server capabilities summary, total handshake time.
- [ ] Per-call latency and a tiny sparkline or bar of last calls' durations. HTTP status shown on each exchange.
- [ ] Auto-scroll with a "pause" toggle; "Clear" button; deep link from a chat message to its Lens entry (highlight + scroll).
- [ ] Empty, loading, disconnected and error states are all designed (no blank panels).
- [ ] Keyboard: `Esc` closes the drawer.

Commit: `B3: lens polish`.

## Phase B4 — Chat panel (simulated Alexa+ surface)

- [ ] **Deterministic intent router** in `src/chat/router.ts` (no LLM, no keys in the browser). Rules, in priority order, case-insensitive:
  - contains `action item|task|todo|to-do|follow up` → `extract_tasks` (map "last week" / "this week" / "past N days" → `sinceDays`: 7 / 7 / N; default 7)
  - contains `summar` → `summarize` (resolve note by id like `n012`, or by title words via a quick `search_notes` call first, or the top result of the last search)
  - contains `reply|respond|draft|write back` → `draft_reply` (same note resolution; tone words `formal|friendly|brief`)
  - contains `find|search|look up|notes about|what did we` → `search_notes`
  - otherwise → friendly help message listing what it can do.
- [ ] Rendering: user bubble; assistant bubble with **tool chips** (`extract_tasks · 142 ms`) that jump to the Lens entry. Structured results render natively: tasks as a checklist with owner + due chips; search results as cards with snippet; summarize streams into the bubble live; draft_reply as an email-like card with Copy.
- [ ] Always show under each assistant answer: `via MCP tools/call → <tool>`; the panel banner stays visible.
- [ ] Suggestion chips = the 4 demo prompts. The first chip is exactly: **"What are my open action items from last week's notes?"**
- [ ] Router unit tests (≥10 phrases).

Commit: `B4: chat panel`.

## ⛔ STOP B5 — Integration (needs the developer's resources)

Tell the developer: *"Ready to connect to the real server. Please (1) make sure Laptop A's server is running (`http://localhost:8787/mcp`) or give me the Lambda Function URL, (2) put `VITE_DEFAULT_SERVER_URL` and `VITE_DEFAULT_TOKEN` in `web/.env` yourself (do not paste the token in chat), then say GO."* Wait for GO.

After GO:
- [ ] Compare `docs/tools.snapshot.json` with the live `tools/list` shown in the Lens; report any drift (names, schema fields). Fix **your side** (the dev-mock and UI assumptions). If the server deviates from the contract, tell the developer — do not edit Laptop A's files.
- [ ] Run the full lifecycle, all 3 error buttons, and the 4 chat prompts against the **local real server**. Then repeat against the **Lambda URL** when available.
- [ ] Verify against Lambda: `summarize` chunks appear **incrementally** in `StreamView` (not all at once); no CORS errors in the console; 401 renders as a transport error.
- [ ] Fix client-side issues. List server-side issues for the developer to relay to Laptop A.

Commit: `B5: integrated`. Report pass/fail table (lifecycle, 4 tools, 3 errors, streaming) for local and Lambda.

## Phase B6 — Demo readiness and submission drafts

- [ ] **`docs/DEMO_SCRIPT.md`** — shot-by-shot script under 3:00 following the brief: 0:00–0:15 hook (the action-items query; chat answers while Lens shows `tools/call` live); 0:15–1:30 three more queries (streaming summarize, structured extract_tasks, full lifecycle button); 1:30–2:30 optional bonus (an existing AI assistant app calling the same server — the developer decides if time allows); closing line *"any Alexa+ integration, made legible and debuggable."* Include exact prompts, which panel to keep on screen, and a **"say clearly: real vs seeded"** moment (real: MCP server, protocol traffic, client; seeded: notes; simulated: Alexa+ chat surface; never claim a real Alexa device).
- [ ] **`docs/DEVPOST_DESCRIPTION.md`** — one-liner, problem (MCP is invisible and hard to debug), what's real vs simulated, architecture (ASCII diagram from the brief), how it uses MCP over Streamable HTTP, AWS Lambda hosting, open-source license, links placeholder for repo/video. Honest, specific, under ~600 words.
- [ ] A **"Demo mode"** polish pass: browser zoom-friendly sizes for 1080p recording, no dev banners visible, fixtures flag off, console clean.
- [ ] Web section of `README.md`: setup, run, dev-mock note, env, screenshots placeholder, honesty notes.
- [ ] Take **3 screenshots** into `docs/images/` (lifecycle timeline, streaming view, chat + Lens side by side) — if you can run a browser; otherwise tell the developer which 3 to capture.
- [ ] Finish `FRICTION_B.md` (≥8 specific entries: SSE/tee-ing, CORS headers, client forcing the handshake, browser limitations, anything the docs didn't say).

Commit: `B6: demo + submission drafts`.

### ⛔ STOP B6 (developer's turn)
Report what is ready. **Developer:** run through the script once, record the video (<3:00, real traffic visible), paste the description into Devpost, merge friction logs into `FRICTION_LOG.md`, make the repo public, submit by **Thu 22 Oct**.

---

## Definition of done (Laptop B)
1. Web client completes a real handshake and all 4 tool calls against the real server (local and Lambda), all visualized in the Lens.
2. `summarize` visibly streams; `extract_tasks` structured result drives the chat checklist.
3. Three error kinds render distinctly; token never displayed in clear text.
4. Real/simulated labels visible in the UI; fixtures/dev-mock never mistaken for real.
5. Demo script, description draft, screenshots, friction log, README section done.
