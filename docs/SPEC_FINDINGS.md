# MCP Lens — Specification & SDK Findings (Phase A1)

**Target Spec Version:** `2025-11-25`  
**Date of Research:** 2026-10-17  
**Author:** Laptop A / Laptop B Unified Agent

---

### Item 1: Exact Version String & Hackathon Eligibility
- **Finding:** The exact protocol version string is `"2025-11-25"`. The hackathon Alexa+ track requires "2025-11-25 or later", so `"2025-11-25"` is fully compliant and supported.
- **Reference URL:** `https://modelcontextprotocol.io/specification/2025-11-25`

### Item 2: `initialize` Request/Response & Lifecycle
- **Finding:**
  - Request `params`: `{ protocolVersion: "2025-11-25", capabilities: ClientCapabilities, clientInfo: { name: string, version: string } }`.
  - Response `result`: `{ protocolVersion: "2025-11-25", capabilities: ServerCapabilities, serverInfo: { name: string, version: string }, instructions?: string }`.
  - Client acknowledges completion with the notification `notifications/initialized`.
- **Reference URL:** `https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle`

### Item 3: `tools/list` Shape & `outputSchema`
- **Finding:** The `tools/list` response returns `{ tools: Tool[] }`. Each tool defines `name: string`, `description?: string`, `inputSchema: JSONSchema`, and optional `outputSchema: JSONSchema` for declaring strongly-typed output models.
- **Reference URL:** `https://modelcontextprotocol.io/specification/2025-11-25/server/tools`

### Item 4: `tools/call` Result Shape & Error Semantics
- **Finding:**
  - Standard result: `{ content: ContentBlock[], structuredContent?: Record<string, unknown>, isError?: boolean }`.
  - **Tool Error (`isError: true`):** A successful JSON-RPC response with `result: { isError: true, content: [...] }`. Used when tool execution fails domain validation (e.g. `noteId` not found).
  - **Protocol Error:** A JSON-RPC error response: `{ jsonrpc: "2.0", id, error: { code: number, message: string } }` (e.g. code `-32601` for unknown tool, `-32602` for invalid arguments).
- **Reference URL:** `https://modelcontextprotocol.io/specification/2025-11-25/server/tools`

### Item 5: Streamable HTTP Transport
- **Finding:**
  - Unified single endpoint: `POST /mcp` for JSON-RPC messages; optional `GET /mcp` with `Accept: text/event-stream` for server-sent notifications; `DELETE /mcp` for session teardown.
  - Required headers: `Accept: text/event-stream, application/json`, `Content-Type: application/json`.
  - Session header: `Mcp-Session-Id` returned by server on initialization and sent by client on all subsequent requests.
  - Stateless behavior: On Lambda, requests can be treated independently or use a stateless signed session token. Invalid `Origin` returns HTTP 403 Forbidden.
- **Reference URL:** `https://modelcontextprotocol.io/specification/2025-11-25/transports/streamable-http`

### Item 6: Partial / Streamed Output Representation
- **Finding:** MCP uses `notifications/progress` notifications sent over the SSE connection stream during an in-flight tool call.
  - The request includes `_meta: { progressToken: string | number }`.
  - The server streams notifications with `method: "notifications/progress"` and `params: { progressToken, progress: number, total?: number, message?: string }`.
  - The `summarize` tool will emit incremental chunks using `notifications/progress` with delta text in `message` before returning the final `CallToolResult`.
- **Reference URL:** `https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/progress`

### Item 7: CORS Headers Configuration
- **Finding:**
  - **Request headers (CORS Allow-Headers):** `Authorization`, `Content-Type`, `Accept`, `Mcp-Session-Id`, `Mcp-Protocol-Version`, `Origin`.
  - **Response headers (CORS Expose-Headers):** `Mcp-Session-Id`, `Mcp-Protocol-Version`, `Content-Type`.
- **Reference URL:** `https://modelcontextprotocol.io/specification/2025-11-25/transports/streamable-http`

### Item 8: TypeScript SDK Packages & Handshake Forcing
- **Finding:** The official TypeScript SDK package is `@modelcontextprotocol/sdk`. It provides `Server`, `Client`, `StreamableHTTPServerTransport`, and `StreamableHTTPClientTransport`.
  - Client forces the 2025-11-25 handshake by requesting `protocolVersion: "2025-11-25"` during `client.connect()`.
- **Reference URL:** `https://ts.sdk.modelcontextprotocol.io/`

### Item 9: AWS Lambda Feasibility & Front Door
- **Finding:**
  - AWS Lambda supports response streaming natively via **Function URLs with `RESPONSE_STREAM` invoke mode** using Node.js `awslambda.streamifyResponse`.
  - Recommendation: Use **AWS Lambda Function URL directly** rather than API Gateway, because API Gateway buffers SSE streams and imposes payload size limits.
- **Reference URL:** `https://docs.aws.amazon.com/lambda/latest/dg/response-streaming-tutorial.html`

### Item 10: Unified Recommendation
- **Finding:** Use `@modelcontextprotocol/sdk` (v1 series) for both server and web client. Target protocol `"2025-11-25"` over Streamable HTTP with bearer token authentication and `notifications/progress` for chunk streaming.
- **Status:** All items CONFIRMED.
