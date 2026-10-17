# MCP Lens

> **A live visual inspector for the Model Context Protocol (MCP) lifecycle over Streamable HTTP paired with an Alexa+-style conversational assistant.**  
> Target: **Amazon Developer Hackathon (Devpost) — Alexa+ Track**

---

## Architecture

```
┌──────────────────────────────────────────────┐
│             MCP Lens Web Client              │
│  - Real MCP Client (@modelcontextprotocol)   │
│  - Custom Wire-Tap (Tee-ing ReadableStream)  │
│  - Live Timeline / Tools / Call Log / Stream │
│  - Simulated Alexa+ Conversational Surface   │
└──────────────────────────────────────────────┘
                       │
                       │  POST /mcp (Streamable HTTP)
                       │  Header: Authorization: Bearer <token>
                       │  Header: Mcp-Session-Id: <uuid>
                       ▼
┌──────────────────────────────────────────────┐
│           MCP Notes Server (Node.js)         │
│  - Spec 2025-11-25 Protocol Implementation   │
│  - Single /mcp Endpoint (Express HTTP + SSE) │
│  - 4 Tools over 50 Seeded Markdown Notes:    │
│    • search_notes (BM25 keyword search)      │
│    • summarize (SSE chunk streaming)         │
│    • extract_tasks (deterministic parser)    │
│    • draft_reply (templated draft response)  │
│  - AWS Lambda Function URL (RESPONSE_STREAM) │
└──────────────────────────────────────────────┘
```

---

## Key Features

1. **Live Protocol Wire-Tap:** Real-time visibility into JSON-RPC 2.0 frames (`initialize`, `notifications/initialized`, `tools/list`, `tools/call`, `notifications/progress`).
2. **True Streamable HTTP & SSE Streaming:** The `summarize` tool emits incremental partial chunks over an SSE stream before returning the final response. The client uses `ReadableStream.tee()` to display raw chunk deltas without breaking the SDK's internal stream consumer.
3. **Deterministic Alexa+ Conversational Surface:** A natural language assistant that routes user queries into MCP tool calls, rendering native checklists with owner/due date chips, search result cards, live streamed summaries, and email drafts.
4. **Three-Tier Error Diagnostics:** Distinct visual categorization for **transport errors** (HTTP 401/403), **protocol errors** (JSON-RPC code -32601), and **tool errors** (`isError: true`).
5. **Airtight Security:** The Authorization bearer token is strictly redacted across all logs, wire views, and raw JSON payloads (`Bearer ••••`).
6. **Serverless on AWS Lambda:** Runs on AWS Lambda Function URLs with `RESPONSE_STREAM` invoke mode to guarantee unbuffered SSE streaming.

---

## Project Structure

```
MCP-Lens/
├── README.md                 # Project documentation & setup guide
├── LICENSE                   # MIT License
├── FRICTION_LOG.md           # Consolidated friction log (16 entries)
├── docs/
│   ├── 00_SHARED_CONTRACT.md  # Core contract between components
│   ├── 01_LAPTOP_A_SERVER.md  # Server specification
│   ├── 02_LAPTOP_B_WEB.md     # Web client specification
│   ├── SPEC_FINDINGS.md       # Verified findings for 10 specification items
│   ├── tools.snapshot.json    # Real tools/list snapshot
│   ├── DEMO_SCRIPT.md         # Shot-by-shot 3-minute video demo script
│   ├── DEVPOST_DESCRIPTION.md # Devpost submission write-up
│   └── friction/
│       ├── FRICTION_A.md      # Server friction log (8 entries)
│       └── FRICTION_B.md      # Web client friction log (8 entries)
├── server/                    # MCP Notes Server
│   ├── corpus/                # 50 seeded markdown notes
│   ├── scripts/               # check-corpus.ts, smoke.ts, generate-corpus.ts
│   └── src/                   # Express HTTP layer, tools, corpus logic
├── web/                       # MCP Lens Web App
│   ├── src/lens/              # WireEvent types, fixtures
│   ├── src/components/        # ConnectionBar, HandshakeTimeline, ToolsPanel, etc.
│   ├── src/chat/              # Intent router for Alexa+ conversational surface
│   └── src/mcpClient.ts       # Real MCP client with wire-tap & SSE parser
└── deploy/                    # AWS SAM template & Lambda configuration
```

---

## Quick Start (Local Development)

### 1. Prerequisites
- **Node.js** $\ge 20$ (tested on v24)
- **npm** $\ge 10$

### 2. Start the MCP Server
```bash
cd server
npm install
npm run check-corpus   # Validates all 50 seeded notes
npm run dev            # Starts server on http://localhost:8787/mcp
```

Run server tests & smoke lifecycle:
```bash
npm test               # Run Vitest unit tests
npm run smoke          # Executes full end-to-end MCP client lifecycle test
```

### 3. Start the MCP Lens Web App
In a second terminal:
```bash
cd web
npm install
npm run dev            # Starts Vite dev server on http://localhost:5173
```

Run web tests:
```bash
npm test               # Runs 21 unit tests (fixtures, router, client wire-tap)
npm run build          # Builds production bundle
```

Open `http://localhost:5173` in your browser and click **Connect**!

---

## Honesty & Data Notice
- **Seeded Sample Data:** The corpus contains 50 seeded markdown notes representing realistic meeting minutes, 1:1 notes, sprint architecture reviews, and incident postmortems with fictional names and projects.
- **Simulated Alexa+ Surface:** The chat panel demonstrates how an Alexa+ conversational surface consumes real MCP server tools; it does not claim a direct connection to a physical Alexa device.
- **Authentic Protocol Traffic:** Every wire event, handshake frame, tools list, and streaming delta displayed in the Lens is real traffic generated by the official Model Context Protocol TypeScript SDK.

---

## License
MIT License — Copyright (c) 2026 Aaron & Team.
