# Friction Log — Laptop B (Web App & MCP Client)

This log records spec questions, edge cases, browser/transport friction, and SDK behaviors encountered while building the MCP Lens web app.

---

### Entry 1 — 2026-10-15: Client Wire-Tap Token Redaction & Vite Type Definitions
- **What was encountered:** During Phase B1 fixture creation, simulating an HTTP 401 error request initially included a fake raw token string (`Bearer bad-invalid-token`). While building strict unit tests for contract §7 / §2 (no exposed tokens), we enforced that even error simulation payloads in the wire-tap must redact the Authorization header to `Bearer ••••`. In addition, strict TypeScript check in Vite builds requires `vite-env.d.ts` reference types for `import.meta.env.VITE_*`.
- **What was tried:** Ran vitest with assert on wire events; added payload sanitizer in `RawJsonDrawer` and in fixture data. Created `src/vite-env.d.ts`.
- **What was decided:** All wire-tap event views and fixture payloads sanitize Authorization and bearer tokens to `Bearer ••••` across all panels before rendering.
- **Suggested doc fix:** Explicitly mention in §7 that the 401 trigger simulation in the client should record the outgoing header as redacted `Bearer ••••` in the wire-tap event payload.

### Entry 2 — 2026-10-17: Tee-ing ReadableStream for SSE Wire-Tap
- **What was encountered:** The official SDK client consumes the response body stream for Server-Sent Events. Reading the stream directly in a custom fetch wrapper locks the stream reader and prevents the SDK from processing protocol messages.
- **What was tried:** Attempted cloning the response via `response.clone()`, but standard fetch in some browsers restricts body cloning when content-type is `text/event-stream`.
- **What was decided:** Used `response.body.tee()` to create two parallel streams: one consumed in the background by the Lens SSE line parser to emit `sse-event` wire events, and the second passed untouched in a reconstructed `Response` back to the SDK.
- **Suggested doc fix:** Provide guidance in MCP client documentation on intercepting streaming responses for observability without stream starvation.

### Entry 3 — 2026-10-17: Browser CORS and Expose-Headers for Session Tracking
- **What was encountered:** In 2025-11-25 Streamable HTTP, the server communicates session state using the `Mcp-Session-Id` header. In a cross-origin browser setup (`http://localhost:5173` connecting to `http://localhost:8787`), standard browser security prevents JavaScript from reading response headers unless explicitly listed in `Access-Control-Expose-Headers`.
- **What was tried:** Checked client network inspector; saw `Mcp-Session-Id` in DevTools but inaccessible to fetch.
- **What was decided:** Configured server CORS middleware to explicitly expose `Mcp-Session-Id, Mcp-Protocol-Version, Content-Type`.
- **Suggested doc fix:** Document `Access-Control-Expose-Headers` in the Streamable HTTP transport specification for browser clients.

### Entry 4 — 2026-10-17: Forcing 2025-11-25 Handshake on Client
- **What was encountered:** The newest revision 2026-07-28 removes the `initialize` handshake in favor of discovery. We needed to guarantee the client performs the `initialize -> notifications/initialized` sequence.
- **What was tried:** Checked client capabilities and transport options in `@modelcontextprotocol/sdk`.
- **What was decided:** Passed `protocolVersion: "2025-11-25"` during client instantiation and initialization options.
- **Suggested doc fix:** Add an explicit client option in SDK documentation explaining version pinning.

### Entry 5 — 2026-10-17: Distinguishing Error Kinds on UI Surface
- **What was encountered:** Developers frequently confuse HTTP transport errors (e.g. 401/403/500), protocol-level JSON-RPC errors (e.g. -32601 tool not found), and tool-level execution failures (`isError: true` with a 200 OK).
- **What was tried:** Grouped error inspection into unified error chips.
- **What was decided:** Built dedicated categorization logic in `McpLensClient` classifying failures into `transport`, `protocol`, and `tool`, rendering them with distinct color badges and message drawers.
- **Suggested doc fix:** Emphasize the difference between protocol errors and tool `isError: true` in developer guides.

### Entry 6 — 2026-10-17: SSE Chunk Reassembly Across Network Boundaries
- **What was encountered:** When SSE streams are transmitted over TCP/HTTP, packets can split mid-line (e.g. splitting `data: {"st` and `ep": 1}`).
- **What was tried:** Implemented a chunk buffer in `parseSseStreamLines` that keeps uncompleted line fragments in a `remaining` buffer until the trailing `\n\n` boundary arrives.
- **What was decided:** Unit-tested the chunk parser against simulated fragmented network frames in `mcpClient.test.ts`.
- **Suggested doc fix:** Note that SSE consumers must buffer by `\n\n` blocks rather than assuming 1 network read equals 1 SSE event.

### Entry 7 — 2026-10-17: Intent Routing for Simulated Conversational Surface
- **What was encountered:** The brief requires a simulated Alexa+ surface without third-party LLM keys in the browser. Natural language questions needed deterministic, high-accuracy mapping to the 4 tools.
- **What was tried:** Built a regex-based intent router in `web/src/chat/router.ts` prioritizing action items, summaries, draft replies, and search.
- **What was decided:** Extensively unit tested 12 distinct conversational queries to verify proper argument parsing and lookback day extraction.
- **Suggested doc fix:** Provide reference intent routing patterns for testing conversational surfaces against MCP servers.

### Entry 8 — 2026-10-17: State Synchronization Between Fixture & Live Mode
- **What was encountered:** During development and evaluation, users may wish to switch back and forth between offline canned fixtures and live server execution.
- **What was tried:** Kept fixtures accessible via `?fixtures=1` query parameter with a prominent top banner and a button in the UI allowing instant switching to live server mode.
- **What was decided:** Clear visual badges prevent any ambiguity about whether the user is seeing fixture data or real wire traffic.
- **Suggested doc fix:** Recommend standard labelling conventions for demo mock modes in MCP developer tools.
