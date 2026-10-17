# Friction Log — Laptop A (MCP Server & Cloud Deploy)

This log records spec questions, edge cases, transport friction, and SDK behaviors encountered while building the MCP Lens server.

---

### Entry 1 — 2026-10-17: Spec 2025-11-25 vs 2026-07-28 Session Changes
- **What was encountered:** The newer MCP revision 2026-07-28 removes `Mcp-Session-Id` and drops the `initialize` handshake in favor of discovery. However, the hackathon brief and our product story center on making the `initialize -> tools/list -> tools/call` lifecycle visible.
- **What was tried:** Verified spec history across versions and SDK capabilities.
- **What was decided:** Explicitly targeted `2025-11-25` across client and server so that session establishment and handshake exchanges remain authentic and observable in the Lens wire-tap.
- **Suggested doc fix:** Clarify in the official documentation how migration from 2025-11-25 session headers to 2026-07-28 discovery works for stateful tool streaming.

### Entry 2 — 2026-10-17: Chunk Streaming in Tool Calls
- **What was encountered:** Tools in MCP traditionally return a single `CallToolResult`. For streamed summaries, progress notifications (`notifications/progress`) provide the spec-compliant vehicle to emit partial text before the final response.
- **What was tried:** Researched `notifications/progress` parameter schema (`progressToken`, `progress`, `total`, `message`).
- **What was decided:** Implement `summarize` to emit incremental progress events over the SSE stream with delta text before concluding with the final tool result.
- **Suggested doc fix:** Provide a canonical example in the specification showing progressive text generation using `notifications/progress`.

### Entry 3 — 2026-10-17: AWS Lambda Streaming vs API Gateway
- **What was encountered:** API Gateway standard HTTP APIs buffer streaming responses, destroying the real-time incremental UX of SSE for `summarize`.
- **What was tried:** Evaluated AWS Lambda Function URLs with `RESPONSE_STREAM` invoke mode.
- **What was decided:** Use Lambda Function URLs directly with `awslambda.streamifyResponse` to ensure unbuffered SSE chunk delivery to the web client.
- **Suggested doc fix:** Highlight in deployment documentation that API Gateway buffers chunked responses, while Lambda Function URLs support true streaming.

### Entry 4 — 2026-10-17: StreamableHTTPServerTransport Session Routing
- **What was encountered:** Recreating `StreamableHTTPServerTransport` on every POST request in Express caused `Server not initialized` errors on subsequent calls because the second request hit a new uninitialized server instance.
- **What was tried:** Investigated the SDK's stateful vs stateless transport handling. In stateful mode, the transport maintains connection state and requires `Mcp-Session-Id` tracking across requests.
- **What was decided:** Implemented an in-memory session store mapping `Mcp-Session-Id` to active `{ server, transport }` instances in `server/src/index.ts`.
- **Suggested doc fix:** Add documentation and code examples showing how to implement an Express route handler with session persistence.

### Entry 5 — 2026-10-17: SDK v1 API Naming (`handleRequest` vs `handlePostRequest`)
- **What was encountered:** Early community examples referenced `transport.handlePostRequest(req, res)` and `transport.handleGetRequest(req, res)`. In `@modelcontextprotocol/sdk` v1.6+, the unified method is `transport.handleRequest(req, res)`.
- **What was tried:** Inspected `StreamableHTTPServerTransport.prototype` at runtime to find the supported method signature.
- **What was decided:** Unified all method routing (`app.all('/mcp')`) into `transport.handleRequest(req, res)`.
- **Suggested doc fix:** Update outdated documentation examples to reflect the consolidated `handleRequest` method.

### Entry 6 — 2026-10-17: Strict Corpus Frontmatter & Temporal Alignment
- **What was encountered:** Contract §9 requires 50 notes, with $\ge 18$ containing action items and $\ge 10$ dated within 7 days before `CORPUS_NOW=2026-10-21`. Off-by-one errors in calendar offset calculations initially generated notes slightly outside the Sept 20 – Oct 20 window.
- **What was tried:** Built an automated verification script `server/scripts/check-corpus.ts` that enforces exact counts, date ranges, and action item ratios.
- **What was decided:** Adjusted the generator formula in `generate-corpus.ts` and automated corpus verification as part of CI/testing.
- **Suggested doc fix:** Provide standard test scripts for validating seeded corpus constraints.

### Entry 7 — 2026-10-17: Deterministic Action Items Parser
- **What was encountered:** Notes contain varied action item syntaxes (`- [ ]`, `TODO:`, `Action:`, `@owner`, `due: YYYY-MM-DD`). Relying solely on LLMs for task extraction is slow and prone to hallucination.
- **What was tried:** Implemented a deterministic regex and line parser in `corpus.ts` that reliably extracts owner and due dates before falling back to optional LLM passes.
- **What was decided:** The deterministic parser runs first and guarantees consistent unit-testable outputs in sub-millisecond execution times.
- **Suggested doc fix:** Encourage deterministic parsing for structured document tools where possible.

### Entry 8 — 2026-10-17: Pure TypeScript BM25 Ranking
- **What was encountered:** Using heavy external search dependencies or embedding APIs creates setup friction and external failure points.
- **What was tried:** Implemented a pure TypeScript BM25-style keyword scoring algorithm over titles, tags, and document bodies.
- **What was decided:** The algorithm delivers fast, deterministic search results with snippet highlighting and zero external dependencies.
- **Suggested doc fix:** Share reference lightweight search ranking algorithms for local corpus MCP servers.
