# MCP Lens — Consolidated Friction Log

> Combined feedback log assembled from Laptop A (Server & Cloud Deploy) and Laptop B (Web App & MCP Client) per contract §12.
> Total Entries: 16 (8 from Server/Deploy, 8 from Web/Client).

---

## Part 1: Server & Cloud Deployment (Laptop A)

### Entry A1 — Spec 2025-11-25 vs 2026-07-28 Session Changes
- **What was encountered:** The newer MCP revision 2026-07-28 removes `Mcp-Session-Id` and drops the `initialize` handshake in favor of discovery. However, the hackathon brief and our product story center on making the `initialize -> tools/list -> tools/call` lifecycle visible.
- **What was tried:** Verified spec history across versions and SDK capabilities.
- **What was decided:** Explicitly targeted `2025-11-25` across client and server so that session establishment and handshake exchanges remain authentic and observable in the Lens wire-tap.
- **Suggested doc fix:** Clarify in the official documentation how migration from 2025-11-25 session headers to 2026-07-28 discovery works for stateful tool streaming.

### Entry A2 — Chunk Streaming in Tool Calls
- **What was encountered:** Tools in MCP traditionally return a single `CallToolResult`. For streamed summaries, progress notifications (`notifications/progress`) provide the spec-compliant vehicle to emit partial text before the final response.
- **What was tried:** Researched `notifications/progress` parameter schema (`progressToken`, `progress`, `total`, `message`).
- **What was decided:** Implement `summarize` to emit incremental progress events over the SSE stream with delta text before concluding with the final tool result.
- **Suggested doc fix:** Provide a canonical example in the specification showing progressive text generation using `notifications/progress`.

### Entry A3 — AWS Lambda Streaming vs API Gateway
- **What was encountered:** API Gateway standard HTTP APIs buffer streaming responses, destroying the real-time incremental UX of SSE for `summarize`.
- **What was tried:** Evaluated AWS Lambda Function URLs with `RESPONSE_STREAM` invoke mode.
- **What was decided:** Use Lambda Function URLs directly with `awslambda.streamifyResponse` to ensure unbuffered SSE chunk delivery to the web client.
- **Suggested doc fix:** Highlight in deployment documentation that API Gateway buffers chunked responses, while Lambda Function URLs support true streaming.

### Entry A4 — StreamableHTTPServerTransport Session Routing
- **What was encountered:** Recreating `StreamableHTTPServerTransport` on every POST request in Express caused `Server not initialized` errors on subsequent calls because the second request hit a new uninitialized server instance.
- **What was tried:** Investigated the SDK's stateful vs stateless transport handling. In stateful mode, the transport maintains connection state and requires `Mcp-Session-Id` tracking across requests.
- **What was decided:** Implemented an in-memory session store mapping `Mcp-Session-Id` to active `{ server, transport }` instances in `server/src/index.ts`.
- **Suggested doc fix:** Add documentation and code examples showing how to implement an Express route handler with session persistence.

### Entry A5 — SDK v1 API Naming (`handleRequest` vs `handlePostRequest`)
- **What was encountered:** Early community examples referenced `transport.handlePostRequest(req, res)` and `transport.handleGetRequest(req, res)`. In `@modelcontextprotocol/sdk` v1.6+, the unified method is `transport.handleRequest(req, res)`.
- **What was tried:** Inspected `StreamableHTTPServerTransport.prototype` at runtime to find the supported method signature.
- **What was decided:** Unified all method routing (`app.all('/mcp')`) into `transport.handleRequest(req, res)`.
- **Suggested doc fix:** Update outdated documentation examples to reflect the consolidated `handleRequest` method.

### Entry A6 — Strict Corpus Frontmatter & Temporal Alignment
- **What was encountered:** Contract §9 requires 50 notes, with $\ge 18$ containing action items and $\ge 10$ dated within 7 days before `CORPUS_NOW=2026-10-21`. Off-by-one errors in calendar offset calculations initially generated notes slightly outside the Sept 20 – Oct 20 window.
- **What was tried:** Built an automated verification script `server/scripts/check-corpus.ts` that enforces exact counts, date ranges, and action item ratios.
- **What was decided:** Adjusted the generator formula in `generate-corpus.ts` and automated corpus verification as part of CI/testing.
- **Suggested doc fix:** Provide standard test scripts for validating seeded corpus constraints.

### Entry A7 — Deterministic Action Items Parser
- **What was encountered:** Notes contain varied action item syntaxes (`- [ ]`, `TODO:`, `Action:`, `@owner`, `due: YYYY-MM-DD`). Relying solely on LLMs for task extraction is slow and prone to hallucination.
- **What was tried:** Implemented a deterministic regex and line parser in `corpus.ts` that reliably extracts owner and due dates before falling back to optional LLM passes.
- **What was decided:** The deterministic parser runs first and guarantees consistent unit-testable outputs in sub-millisecond execution times.
- **Suggested doc fix:** Encourage deterministic parsing for structured document tools where possible.

### Entry A8 — Pure TypeScript BM25 Ranking
- **What was encountered:** Using heavy external search dependencies or embedding APIs creates setup friction and external failure points.
- **What was tried:** Implemented a pure TypeScript BM25-style keyword scoring algorithm over titles, tags, and document bodies.
- **What was decided:** The algorithm delivers fast, deterministic search results with snippet highlighting and zero external dependencies.
- **Suggested doc fix:** Share reference lightweight search ranking algorithms for local corpus MCP servers.

---

## Part 2: Web App & MCP Client (Laptop B)

### Entry B1 — Client Wire-Tap Token Redaction & Vite Type Definitions
- **What was encountered:** During Phase B1 fixture creation, simulating an HTTP 401 error request initially included a fake raw token string (`Bearer bad-invalid-token`). While building strict unit tests for contract §7 / §2 (no exposed tokens), we enforced that even error simulation payloads in the wire-tap must redact the Authorization header to `Bearer ••••`. In addition, strict TypeScript check in Vite builds requires `vite-env.d.ts` reference types for `import.meta.env.VITE_*`.
- **What was tried:** Ran vitest with assert on wire events; added payload sanitizer in `RawJsonDrawer` and in fixture data. Created `src/vite-env.d.ts`.
- **What was decided:** All wire-tap event views and fixture payloads sanitize Authorization and bearer tokens to `Bearer ••••` across all panels before rendering.
- **Suggested doc fix:** Explicitly mention in §7 that the 401 trigger simulation in the client should record the outgoing header as redacted `Bearer ••••` in the wire-tap event payload.

### Entry B2 — Tee-ing ReadableStream for SSE Wire-Tap
- **What was encountered:** The official SDK client consumes the response body stream for Server-Sent Events. Reading the stream directly in a custom fetch wrapper locks the stream reader and prevents the SDK from processing protocol messages.
- **What was tried:** Attempted cloning the response via `response.clone()`, but standard fetch in some browsers restricts body cloning when content-type is `text/event-stream`.
- **What was decided:** Used `response.body.tee()` to create two parallel streams: one consumed in the background by the Lens SSE line parser to emit `sse-event` wire events, and the second passed untouched in a reconstructed `Response` back to the SDK.
- **Suggested doc fix:** Provide guidance in MCP client documentation on intercepting streaming responses for observability without stream starvation.

### Entry B3 — Browser CORS and Expose-Headers for Session Tracking
- **What was encountered:** In 2025-11-25 Streamable HTTP, the server communicates session state using the `Mcp-Session-Id` header. In a cross-origin browser setup (`http://localhost:5173` connecting to `http://localhost:8787`), standard browser security prevents JavaScript from reading response headers unless explicitly listed in `Access-Control-Expose-Headers`.
- **What was tried:** Checked client network inspector; saw `Mcp-Session-Id` in DevTools but inaccessible to fetch.
- **What was decided:** Configured server CORS middleware to explicitly expose `Mcp-Session-Id, Mcp-Protocol-Version, Content-Type`.
- **Suggested doc fix:** Document `Access-Control-Expose-Headers` in the Streamable HTTP transport specification for browser clients.

### Entry B4 — Forcing 2025-11-25 Handshake on Client
- **What was encountered:** The newest revision 2026-07-28 removes the `initialize` handshake in favor of discovery. We needed to guarantee the client performs the `initialize -> notifications/initialized` sequence.
- **What was tried:** Checked client capabilities and transport options in `@modelcontextprotocol/sdk`.
- **What was decided:** Passed `protocolVersion: "2025-11-25"` during client instantiation and initialization options.
- **Suggested doc fix:** Add an explicit client option in SDK documentation explaining version pinning.

### Entry B5 — Distinguishing Error Kinds on UI Surface
- **What was encountered:** Developers frequently confuse HTTP transport errors (e.g. 401/403/500), protocol-level JSON-RPC errors (e.g. -32601 tool not found), and tool-level execution failures (`isError: true` with a 200 OK).
- **What was tried:** Grouped error inspection into unified error chips.
- **What was decided:** Built dedicated categorization logic in `McpLensClient` classifying failures into `transport`, `protocol`, and `tool`, rendering them with distinct color badges and message drawers.
- **Suggested doc fix:** Emphasize the difference between protocol errors and tool `isError: true` in developer guides.

### Entry B6 — SSE Chunk Reassembly Across Network Boundaries
- **What was encountered:** When SSE streams are transmitted over TCP/HTTP, packets can split mid-line (e.g. splitting `data: {"st` and `ep": 1}`).
- **What was tried:** Implemented a chunk buffer in `parseSseStreamLines` that keeps uncompleted line fragments in a `remaining` buffer until the trailing `\n\n` boundary arrives.
- **What was decided:** Unit-tested the chunk parser against simulated fragmented network frames in `mcpClient.test.ts`.
- **Suggested doc fix:** Note that SSE consumers must buffer by `\n\n` blocks rather than assuming 1 network read equals 1 SSE event.

### Entry B7 — Intent Routing for Simulated Conversational Surface
- **What was encountered:** The brief requires a simulated Alexa+ surface without third-party LLM keys in the browser. Natural language questions needed deterministic, high-accuracy mapping to the 4 tools.
- **What was tried:** Built a regex-based intent router in `web/src/chat/router.ts` prioritizing action items, summaries, draft replies, and search.
- **What was decided:** Extensively unit tested 12 distinct conversational queries to verify proper argument parsing and lookback day extraction.
- **Suggested doc fix:** Provide reference intent routing patterns for testing conversational surfaces against MCP servers.

### Entry B8 — State Synchronization Between Fixture & Live Mode
- **What was encountered:** During development and evaluation, users may wish to switch back and forth between offline canned fixtures and live server execution.
- **What was tried:** Kept fixtures accessible via `?fixtures=1` query parameter with a prominent top banner and a button in the UI allowing instant switching to live server mode.
- **What was decided:** Clear visual badges prevent any ambiguity about whether the user is seeing fixture data or real wire traffic.
- **Suggested doc fix:** Recommend standard labelling conventions for demo mock modes in MCP developer tools.
