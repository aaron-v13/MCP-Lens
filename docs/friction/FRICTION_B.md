# Friction Log — Laptop B (Web App & MCP Client)

This log records spec questions, edge cases, browser/transport friction, and SDK behaviors encountered while building the MCP Lens web app.

---

### Entry 1 — 2026-10-15: Client Wire-Tap Token Redaction & Vite Type Definitions
- **What was encountered:** During Phase B1 fixture creation, simulating an HTTP 401 error request initially included a fake raw token string (`Bearer bad-invalid-token`). While building strict unit tests for contract §7 / §2 (no exposed tokens), we enforced that even error simulation payloads in the wire-tap must redact the Authorization header to `Bearer ••••`. In addition, strict TypeScript check in Vite builds requires `vite-env.d.ts` reference types for `import.meta.env.VITE_*`.
- **What was tried:** Ran vitest with assert on wire events; added payload sanitizer in `RawJsonDrawer` and in fixture data. Created `src/vite-env.d.ts`.
- **What was decided:** All wire-tap event views and fixture payloads sanitize Authorization and bearer tokens to `Bearer ••••` across all panels before rendering.
- **Suggested doc fix:** Explicitly mention in §7 that the 401 trigger simulation in the client should record the outgoing header as redacted `Bearer ••••` in the wire-tap event payload.

