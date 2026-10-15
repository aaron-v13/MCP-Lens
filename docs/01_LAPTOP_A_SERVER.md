# 01 — LAPTOP A: SERVER (MCP server, corpus, tools, LLM, AWS Lambda)

> **FOR THE AI AGENT (Antigravity / Gemini Flash):** You are **Laptop A**. You own `server/`, `deploy/`, `LICENSE`, `docs/SPEC_FINDINGS.md`, `docs/tools.snapshot.json`, `docs/friction/FRICTION_A.md`.
> **First, read `docs/00_SHARED_CONTRACT.md` completely.** It defines the endpoint, auth, tool schemas, error rules, corpus rules and stop points. Do not contradict it.
> Work **one phase at a time**. At each `⛔ STOP`, print a short report (what you did, what passed, what you need) and **wait for the developer to type GO**.
> **Never invent protocol details.** Read the spec and the SDK docs. If you cannot browse the web, STOP and say so.

**Kickoff prompt the developer will paste:**
> Read docs/00_SHARED_CONTRACT.md and docs/01_LAPTOP_A_SERVER.md. You are Laptop A. Start at Phase A0 and stop at every ⛔ STOP.

**Stack (default):** TypeScript, Node 20+, `tsx` for dev, `vitest` for tests, `zod` for validation, the **official MCP TypeScript SDK** (generation decided in A1). Small HTTP layer: **Hono** or plain Node `http` — whichever the SDK docs show for Streamable HTTP with the least glue.

---

## Phase A0 — Setup (10 min)

- [ ] `git pull origin main`, `git checkout -b laptop-a`.
- [ ] Confirm `docs/00_SHARED_CONTRACT.md` exists. Create `docs/friction/FRICTION_A.md` with a title line.
- [ ] Check `node -v` ≥ 20 and `npm -v`. Report if missing.

## Phase A1 — Verify the spec and the SDK (NO feature code)

Read, in this order, and take notes:

1. MCP specification, version **2025-11-25**: start at `https://modelcontextprotocol.io/specification/2025-11-25` and read the pages for **lifecycle**, **transports (Streamable HTTP)**, **server/tools**, and **utilities/progress** (and logging, if present).
2. The **changelog of the newest revision (2026-07-28)**: `https://modelcontextprotocol.io/specification/2026-07-28/changelog` — to understand what differs (sessions removed, handshake changes, new headers).
3. Official TypeScript SDK: `https://github.com/modelcontextprotocol/typescript-sdk` and docs at `https://ts.sdk.modelcontextprotocol.io/` (v1) and `https://ts.sdk.modelcontextprotocol.io/v2/` (v2).
4. Alexa+ MCP QuickStart on `developer.amazon.com` (search "Alexa+ MCP QuickStart"). Note any Alexa+-specific expectations.

Write **`docs/SPEC_FINDINGS.md`** answering **every** item below with a one-line answer + the URL it came from. Mark anything you could not confirm as `UNCONFIRMED`.

1. Exact version string for the 2025-11-25 spec; is it still accepted by the hackathon track ("2025-11-25 or later")?
2. `initialize` request fields and response fields; capability negotiation for tools; `notifications/initialized`.
3. `tools/list` response shape; does a tool have `outputSchema`? how is it declared?
4. `tools/call` result shape: `content`, `structuredContent`, `isError`. Difference between a **tool error** and a **protocol error**.
5. Streamable HTTP in 2025-11-25: HTTP methods used, required `Accept` header, response content types (JSON vs `text/event-stream`), session header (if any), `MCP-Protocol-Version` header, Origin validation rule, how a stateless server behaves.
6. **How partial/streamed output is represented** during a long tool call (progress notifications? logging notifications? something else?). Which one will `summarize` use, and why?
7. List of **all request headers** a browser client will send (for the CORS allow-list) and **response headers** the client must read (for CORS expose-list).
8. SDK: package names and exact versions; does the server side support 2025-11-25 over Streamable HTTP; stateless mode flag; does it serve both revisions; **how the client can be forced to use the 2025-11-25 `initialize` handshake**.
9. Lambda feasibility: can the server run in stateless mode behind a Lambda Function URL with **response streaming** (`RESPONSE_STREAM` invoke mode)? Note that API Gateway buffering can break SSE — which AWS front door do you recommend?
10. Recommendation: SDK generation (v1 or v2) and exact versions to use on **both** laptops.

Also append to `FRICTION_A.md` at least 3 entries about anything that was hard to find or ambiguous.

### ⛔ STOP A1
Report the 10 answers in ≤15 lines. Highlight anything `UNCONFIRMED` and your SDK recommendation. **Wait for GO.** (Developer: confirm the protocol decision from contract §3, then commit + push `docs/SPEC_FINDINGS.md` to `main` so Laptop B can read it.)

## Phase A2 — Prove the handshake (the riskiest 20%)

Goal: a real client completes **initialize → tools/list → tools/call** against your server over Streamable HTTP with bearer auth.

- [ ] Scaffold `server/` (`package.json`, `tsconfig.json`, `src/index.ts`, `.env.example`, `.gitignore` incl. `.env`). Use the SDK versions from `SPEC_FINDINGS.md`.
- [ ] Implement the MCP server named `mcp-lens-notes` v`0.1.0` exposing **`search_notes`** only, over a temporary 3-note corpus in `server/corpus/`.
- [ ] HTTP layer on `PORT` (default 8787): single `/mcp` endpoint; bearer check (401 otherwise); `Origin` check (403); CORS per contract §5 and `SPEC_FINDINGS.md` item 7; **stateless**.
- [ ] `server/scripts/smoke.ts`: uses the **official SDK client** against `http://localhost:8787/mcp` with the token, forces the 2025-11-25 handshake, and prints: negotiated protocol version, server capabilities, tool list, result of `search_notes`. Exits non-zero on failure.
- [ ] Also test: no token → 401; wrong Origin → 403.
- [ ] Add `npm run dev`, `npm run smoke`, `npm test`.

**Done when:** `npm run smoke` prints the negotiated version `2025-11-25` and a real `search_notes` result, and the 401/403 tests pass.
Commit: `A2: handshake + auth`.

## Phase A3 — Corpus + all 4 tools (mock LLM only)

- [ ] **Corpus:** generate **50 notes** per contract §9 in `server/corpus/` plus `server/corpus/README.md` (sample-data disclaimer). Use `CORPUS_NOW=2026-10-21`. Verify with a script (`scripts/check-corpus.ts`): 50 files, unique ids, valid frontmatter, ≥18 notes with action items, ≥10 dated within 7 days before `CORPUS_NOW`.
- [ ] **LLM layer:** `src/llm/index.ts` interface (`summarizeStream(text, style): AsyncIterable<string>`, `draftReply(note, tone, intent): Promise<{subject, body}>`), `src/llm/mock.ts` implementing it deterministically offline (extractive summary streamed word-by-word with `SUMMARY_CHUNK_DELAY_MS`; templated draft). `LLM_PROVIDER=mock` is the default.
- [ ] **Tools** exactly per contract §6, with `zod` input validation, `outputSchema` (if supported), `structuredContent` **and** a text `content` mirror, and `meta.llm` / `meta.corpus`:
  - `search_notes` — keyword/BM25 ranking, snippet around best match.
  - `summarize` — **streamed** using the mechanism you chose in `SPEC_FINDINGS.md` (≥3 partial events, then final result). If the SDK cannot do it, use the contract §6.2 fallback and log it.
  - `extract_tasks` — deterministic parser (checkboxes, `TODO:`, `Action:`, `@owner`, `due: …`), `sinceDays` relative to `CORPUS_NOW`.
  - `draft_reply`.
- [ ] **Errors per contract §7:** unknown `noteId` → tool result `isError: true`; invalid args → protocol error. Test both.
- [ ] **Tests (vitest):** each tool happy path; `extract_tasks` returns ≥8 tasks for `sinceDays: 7`; `summarize` emits ≥3 partial events before the final one (assert on the real wire, using the SDK client); error cases.
- [ ] Extend `smoke.ts`: runs the full lifecycle and calls all 4 tools, printing the partial events of `summarize` with timestamps.
- [ ] Write the real `tools/list` output to **`docs/tools.snapshot.json`** (Laptop B uses it to check for drift).
- [ ] Append friction entries (streaming representation, structured output, anything surprising).

**Done when:** `npm test` and `npm run smoke` pass; snapshot file exists.
Commit: `A3: corpus + 4 tools (mock LLM)`.

### ⛔ STOP A3
Report: test results, the `summarize` streaming mechanism, `tools.snapshot.json` summary. **Developer:** run `npm run smoke` yourself, push `laptop-a`, merge to `main`, tell Laptop B the server is ready on `http://localhost:8787/mcp`. **Wait for GO.**

## Phase A4 — Real LLM (needs the developer's resource)

### ⛔ STOP A4 (before coding this phase)
**Ask the developer:** *"Which LLM provider and model should the server use, and have you put the key in `server/.env`?"* Options to offer: **Amazon Bedrock** (best fit for the AWS Builder prize stack, needs AWS credentials/model access), or any hosted model API the developer already has a key for. **Do not guess a provider. Do not ask for the key in chat** — the developer edits `server/.env` themselves. Wait for GO.

After GO:
- [ ] Implement `src/llm/<provider>.ts` behind the existing interface; select via `LLM_PROVIDER`. Read the provider's current docs first — do not invent API shapes.
- [ ] Missing key / provider error → **fallback to mock and set `meta.llm: "mock (fallback)"`**; never crash.
- [ ] Add `.env.example` entries (names only, no values).
- [ ] Smoke test with the real provider: `summarize` still emits ≥3 partial events; `draft_reply` returns subject + body; optional LLM pass for `extract_tasks` only if it is cheap and reliable — otherwise skip.
- [ ] Verify the key never appears in any log, response or file tracked by git (`git grep` check).

**Done when:** smoke passes with `LLM_PROVIDER=<real>` and `meta.llm` shows the provider/model.
Commit: `A4: real LLM provider`.

## Phase A5 — Deploy to AWS Lambda (needs the developer's resource)

### ⛔ STOP A5 (before coding this phase)
**Ask the developer:** *"Is AWS configured on this laptop (`aws sts get-caller-identity` works)? Which region? Do you approve creating a Lambda + Function URL in that account?"* **Never ask for keys in chat.** Wait for GO.

After GO:
- [ ] Use the front door recommended in `SPEC_FINDINGS.md` item 9 (default: **Lambda Function URL with `RESPONSE_STREAM`**, auth type NONE because the app enforces the bearer token). Verify the current AWS docs for Node response streaming — do not assume.
- [ ] `deploy/` with an **AWS SAM** `template.yaml` (or the simplest equivalent), a build step bundling `server/` (corpus files included), and `deploy/README.md` with exact commands.
- [ ] Lambda env vars: `MCP_LENS_TOKEN` (developer sets a **new random value**: `openssl rand -hex 24`), `ALLOWED_ORIGINS`, `CORPUS_NOW`, `LLM_PROVIDER` + provider settings. CORS in exactly one place (contract §5).
- [ ] Deploy. Run `npm run smoke` against the Function URL (`SERVER_URL` override). **Confirm `summarize` chunks arrive incrementally, not all at once** — if buffered, fix or switch front door, and log it in `FRICTION_A.md`.
- [ ] Capture cold-start and warm latency numbers for the README.

**Done when:** smoke passes against the live URL with visible incremental streaming.
Commit: `A5: lambda deploy`.

Report: Function URL, region, what the developer must hand to Laptop B (**URL + token**, via their own secure channel — not committed).

## Phase A6 — Hardening and docs

- [ ] Request body size limit, input length limits, sane timeouts; structured logs without secrets.
- [ ] `LICENSE` (MIT), server section of `README.md` (setup, env, run, test, deploy, honesty notes: sample data, mock vs real LLM).
- [ ] Re-run `npm test`, `npm run smoke` (local + Lambda). Update `tools.snapshot.json` if schemas changed and tell the developer so Laptop B can re-check.
- [ ] Finish `FRICTION_A.md` (≥8 specific entries).
- [ ] Support Laptop B's integration issues when the developer relays them. Fix on your side only.

Commit: `A6: hardening + docs`. Report final status. **Stop.**

---

## Definition of done (Laptop A)
1. `npm run smoke` passes locally and against Lambda, negotiated version shown.
2. 4 tools implemented per contract; `summarize` streams; `extract_tasks` returns structured JSON.
3. 50 notes labeled as sample data; real-vs-mock LLM visible in `meta.llm`.
4. No secrets in git; `.env.example` present; MIT license; friction entries written.
