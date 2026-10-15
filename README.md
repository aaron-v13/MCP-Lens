# MCP Lens

> A live visual inspector for the Model Context Protocol (MCP) lifecycle over Streamable HTTP paired with a simulated Alexa+ conversational assistant. Built for the Amazon Developer Hackathon (Devpost) — Alexa+ track.

---

## Architecture Overview

```
┌─────────────────────────────────┐        Streamable HTTP (POST /mcp)       ┌───────────────────────────────────┐
│           MCP Lens UI           │ ───────────────────────────────────────> │         MCP Notes Server          │
│  - Real MCP Client & Wire-Tap   │ <─────────────────────────────────────── │  - Streamable HTTP Transport      │
│  - Handshake / List / Call logs │           Bearer Token Auth              │  - 4 Tools over 50 seeded notes   │
│  - Live SSE Stream Inspector    │                                          │  - Incremental chunk streaming    │
│  - Simulated Alexa+ Surface     │                                          │  - Hosted on AWS Lambda           │
└─────────────────────────────────┘                                          └───────────────────────────────────┘
```

---

## Web App (Laptop B)

The web client is built with **Vite + React + TypeScript** using pure CSS variables (dark theme, 1080p recording optimized). It visualizes every wire-level exchange in real time without obscuring raw protocol frames.

### Features
1. **Live Wire-Tap Timeline:** Inspect JSON-RPC requests, responses, notifications, SSE stream chunks, and transport latencies.
2. **Tools Catalog (`tools/list`):** View registered tools, typed schemas, and output definitions.
3. **Structured Content Inspector:** View parsed results and raw payloads from `tools/call`.
4. **SSE Stream Inspector:** Live view of incremental chunk deltas arriving over Streamable HTTP SSE.
5. **Slide-over Raw JSON Drawer:** Dependency-free JSON viewer with automatic token redaction (`Bearer ••••`).
6. **Simulated Alexa+ Chat Panel:** Natural language queries mapping to MCP tool calls with native checklist and note rendering.

### Getting Started (Web)

```bash
cd web
npm install
npm run dev
```

Run tests:
```bash
npm test
```

Build for production:
```bash
npm run build
```

---

## Server & Deploy (Laptop A)
*(To be populated by Laptop A)*

---

## Honesty & Data Notice
- **Seeded Sample Data:** The note corpus consists of 50 seeded markdown files with fictional people, companies, and projects.
- **Simulated Conversational Surface:** The chat panel demonstrates how an Alexa+-style conversational interface consumes real MCP server tools; it does not claim a direct connection to a physical Alexa device.
- **Protocol Fidelity:** Real JSON-RPC messages and Streamable HTTP headers are surfaced directly from the client wire-tap.
