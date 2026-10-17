# MCP Lens — Devpost Submission

### One-Liner
**A live visual inspector for the Model Context Protocol (MCP) lifecycle over Streamable HTTP paired with a simulated Alexa+ conversational assistant.**

---

### The Problem
The Model Context Protocol (MCP) allows AI assistants like Alexa+ to dynamically discover and call tools on external servers. However, during development and debugging, MCP traffic is invisible. When a tool call hangs, fails with a subtle session header mismatch, or drops incremental streaming chunks, developers are left guessing whether the fault lies in the transport, the protocol layer, or the tool execution.

---

### What MCP Lens Does
MCP Lens provides a side-by-side developer workspace:
1. **The Lens (Protocol Wire-Tap):** A live inspector built on the official TypeScript MCP SDK. It visualizes the complete protocol lifecycle—the `initialize` handshake, capability negotiation, `tools/list` schema discovery, real-time tool latency, and incremental SSE chunks—without hiding raw JSON-RPC frames.
2. **Alexa+ Conversational Surface:** A natural language assistant panel that demonstrates how an Alexa+ interface drives the server's tools (`extract_tasks`, `search_notes`, `summarize`, and `draft_reply`), rendering native task checklists, search snippets, and email drafts.

---

### Architecture

```
┌─────────────────────────────────────────┐
│        MCP Lens Web Client (5173)       │
│  - Real MCP Client + Custom Wire-Tap    │
│  - Handshake / List / Call Log Panels   │
│  - Live SSE Stream Inspector            │
│  - Simulated Alexa+ Conversational UI   │
└─────────────────────────────────────────┘
                    │
                    │ Streamable HTTP (POST /mcp)
                    │ Bearer Token Authentication
                    ▼
┌─────────────────────────────────────────┐
│       MCP Notes Server (AWS Lambda)     │
│  - Spec 2025-11-25 Implementation       │
│  - Single /mcp Endpoint (Express/Node)  │
│  - 4 Tools over 50 Seeded Markdown Notes│
│  - Incremental Progress SSE Streaming   │
└─────────────────────────────────────────┘
```

---

### How It Uses MCP & Streamable HTTP
- **Strict Protocol Compliance:** Implements MCP specification `2025-11-25` over Streamable HTTP using `@modelcontextprotocol/sdk`.
- **Streamable HTTP & SSE:** Client communication routes through a single `/mcp` endpoint with `Authorization: Bearer <token>` and `Mcp-Session-Id` tracking.
- **Incremental Streaming:** The `summarize` tool emits real-time chunk deltas via `notifications/progress` notifications across an active Server-Sent Events stream before delivering the final result.
- **Tee-ing Without Consumption:** The client wire-tap uses web standard `ReadableStream.tee()` to clone response streams, rendering raw SSE events in the inspector while passing an untouched stream to the SDK.
- **Three-Tier Error Classification:** Distinguishes transport failures (HTTP 401/403), protocol failures (JSON-RPC -32601), and tool failures (`isError: true`).

---

### Cloud Hosting & Deployment
- Hosted serverless on **AWS Lambda** with **Lambda Function URLs in `RESPONSE_STREAM` invoke mode**, bypassing API Gateway buffering to guarantee unbuffered SSE chunk delivery.
- Fully automated with AWS SAM (`deploy/template.yaml`).

---

### Honesty & Attribution Notice
- **Real:** MCP server, official SDK client, Streamable HTTP transport, live SSE streaming, and wire-tap inspector are 100% authentic.
- **Seeded:** The 50 notes in the corpus are seeded sample data with fictional people and projects.
- **Simulated:** The chat panel demonstrates how an Alexa+ conversational surface interacts with MCP tools; it does not claim a connection to a physical Alexa device.

---

### Open Source & Links
- **Repository:** https://github.com/aaron-v13/MCP-Lens
- **License:** MIT License
- **Demo Video:** *(Link to uploaded video)*
