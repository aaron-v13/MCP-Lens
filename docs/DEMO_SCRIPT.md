# MCP Lens — 3-Minute Demo Video Script

**Target Duration:** 2:45 (under 3:00 hard limit)  
**Track:** Amazon Developer Hackathon — Alexa+ Track  
**Resolution:** 1080p (1920x1080), browser at 100% or 110% zoom, dark theme active.

---

### Segment 1: The Hook (0:00 – 0:25)
- **Screen:** MCP Lens full desktop split view (Lens on left, Alexa+ chat surface on right). Status pill shows `Connected`, spec badge shows `2025-11-25`.
- **Action:** Click the top suggestion chip: **"What are my open action items from last week's notes?"**
- **Voiceover:**
  > *"When building conversational agents with Alexa+ and the Model Context Protocol, what happens behind the scenes is usually invisible. This is MCP Lens: a real MCP client and live wire-tap that brings the entire protocol lifecycle into view. Right now, our Alexa+ surface routed my question directly into a live MCP `tools/call` to `extract_tasks`. On the right, the answer appears as a structured checklist. On the left, the Lens immediately captured the outgoing request, HTTP headers, latency, and returned structured payload."*

---

### Segment 2: Streaming Summarize & Native Chunks (0:25 – 1:10)
- **Screen:** Switch active Lens tab to **Stream Inspector**.
- **Action:** Type or click: **"Summarize note n001"**. Watch the incremental SSE chunk deltas appear in the progress bar and arrive in the chat bubble.
- **Voiceover:**
  > *"Next, let's look at streaming over Streamable HTTP. When I request a summary of note n001, the MCP server emits incremental progress notifications over Server-Sent Events. In the Stream Inspector, you see every individual chunk delta arriving with per-chunk timestamps and a live progress indicator before the final JSON-RPC response arrives."*

---

### Segment 3: Full Lifecycle & Tools Catalog (1:10 – 1:50)
- **Screen:** Switch to **Wire Events** tab and then **Tools** tab.
- **Action:** Click **"▶ Run Full Lifecycle"** button in the connection bar.
- **Voiceover:**
  > *"Watch what happens when we run the full protocol lifecycle. In seconds, the Lens executes the complete sequence: the `initialize` handshake, capability negotiation, `tools/list` discovery, and sequentially invokes our four registered tools: search_notes, summarize, extract_tasks, and draft_reply. In the Tools catalog, judges can inspect the input parameter tables and declared output schemas."*

---

### Segment 4: Transparent Error Handling & Redaction (1:50 – 2:25)
- **Screen:** Click the three error demonstration buttons in the connection bar.
- **Action:**
  1. Click **"⚡ Err: Bad Token"** -> Highlight HTTP 401 Unauthorized in timeline. Click event to open slide-over Raw JSON Drawer.
  2. Click **"⚡ Err: Invalid Tool"** -> Highlight JSON-RPC -32601 Method Not Found.
  3. Click **"⚡ Err: Unknown Note"** -> Highlight `isError: true` tool domain error.
- **Voiceover:**
  > *"Debugging protocol failures is where developers waste hours. MCP Lens cleanly separates three distinct classes of errors: transport-level failures like this HTTP 401 bad bearer token, protocol-level failures like JSON-RPC code -32601 for unregistered tools, and tool execution failures where `isError: true` is returned. Notice inside our slide-over JSON drawer, sensitive credentials are authenticated via bearer token but strictly redacted to 'Bearer ••••' across all traffic logs."*

---

### Segment 5: Architecture & Closing (2:25 – 2:45)
- **Screen:** Pan over the Connection Bar badges (Spec: 2025-11-25, LLM: mock, Corpus: seeded sample data, Chat: simulated Alexa+ surface).
- **Voiceover:**
  > *"To be completely transparent: our note corpus consists of 50 seeded markdown files with fictional data, and this chat panel simulates the Alexa+ conversational interface. But the MCP server, the Streamable HTTP transport on AWS Lambda, and the client wire-tap are 100% real. Any Alexa+ integration, made legible and debuggable. Thank you."*
