import http from 'http';
import fs from 'fs';
import path from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { app } from '../src/index.js';

const PORT = 8787;
const SERVER_URL = `http://localhost:${PORT}/mcp`;
const TOKEN = process.env.MCP_LENS_TOKEN || 'dev-token-change-me';

async function runSmoke() {
  console.log('=== MCP Lens Server Smoke Test ===\n');

  // 1. Start HTTP server in-process for smoke test
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`[1] Server started on ${SERVER_URL}`);

  try {
    // 2. Test 401 Unauthorized (No Token)
    console.log('[2] Testing Auth: No Token -> Expect 401...');
    const noTokenRes = await fetch(SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
    });
    if (noTokenRes.status !== 401) {
      throw new Error(`Expected 401 for missing token, got ${noTokenRes.status}`);
    }
    console.log('    ✓ Correctly received HTTP 401 Unauthorized');

    // 3. Test 403 Forbidden (Disallowed Origin)
    console.log('[3] Testing Origin Check: Disallowed Origin -> Expect 403...');
    const wrongOriginRes = await fetch(SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
        Origin: 'http://malicious-site.example.com',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'initialize', params: {} }),
    });
    if (wrongOriginRes.status !== 403) {
      throw new Error(`Expected 403 for disallowed origin, got ${wrongOriginRes.status}`);
    }
    console.log('    ✓ Correctly received HTTP 403 Forbidden');

    // 4. Test Official SDK Client Connection & Handshake
    console.log('[4] Testing Handshake via Official MCP SDK Client...');
    const transport = new StreamableHTTPClientTransport(new URL(SERVER_URL), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Origin: 'http://localhost:5173',
        },
      },
    });

    const client = new Client(
      {
        name: 'smoke-test-client',
        version: '0.1.0',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
    console.log('    ✓ Handshake initialized successfully!');

    // 5. Test tools/list
    console.log('[5] Testing tools/list...');
    const listRes = await client.listTools();
    console.log(`    ✓ Discovered ${listRes.tools.length} registered tools:`);
    for (const tool of listRes.tools) {
      console.log(`      - ${tool.name}: ${tool.description}`);
    }

    // Save tools.snapshot.json
    const snapshotPath = path.resolve(process.cwd(), '../docs/tools.snapshot.json');
    fs.writeFileSync(snapshotPath, JSON.stringify(listRes, null, 2), 'utf-8');
    console.log(`    ✓ Saved tools snapshot to docs/tools.snapshot.json`);

    // 6. Test search_notes
    console.log('[6] Calling search_notes { query: "strategy" }...');
    const searchRes = await client.callTool({
      name: 'search_notes',
      arguments: { query: 'strategy', limit: 3 },
    });
    console.log(`    ✓ Result content: ${(searchRes.content as any)[0]?.text?.slice(0, 100)}...`);

    // 7. Test summarize
    console.log('[7] Calling summarize { noteId: "n001" }...');
    const sumRes = await client.callTool({
      name: 'summarize',
      arguments: { noteId: 'n001', style: 'brief' },
    });
    console.log(`    ✓ Summary result: ${(sumRes.content as any)[0]?.text?.slice(0, 100)}...`);

    // 8. Test extract_tasks
    console.log('[8] Calling extract_tasks { sinceDays: 7 }...');
    const taskRes = await client.callTool({
      name: 'extract_tasks',
      arguments: { sinceDays: 7 },
    });
    console.log(`    ✓ Extracted tasks: ${(taskRes.content as any)[0]?.text?.slice(0, 100)}...`);

    // 9. Test draft_reply
    console.log('[9] Calling draft_reply { noteId: "n001" }...');
    const draftRes = await client.callTool({
      name: 'draft_reply',
      arguments: { noteId: 'n001', tone: 'formal' },
    });
    console.log(`    ✓ Draft reply: ${(draftRes.content as any)[0]?.text?.slice(0, 100)}...`);

    // 10. Test Tool Error (Unknown noteId -> isError: true)
    console.log('[10] Calling summarize { noteId: "unknown-999" } -> Expect isError: true...');
    const errRes = await client.callTool({
      name: 'summarize',
      arguments: { noteId: 'unknown-999' },
    });
    if (!errRes.isError) {
      throw new Error('Expected isError: true for unknown noteId');
    }
    console.log('    ✓ Correctly received isError: true with message:', (errRes.content as any)[0]?.text);

    await transport.close();
    console.log('\n=== ✓ All Smoke Tests Passed Successfully! ===');
  } finally {
    server.close();
  }
}

runSmoke().catch((err) => {
  console.error('\n❌ Smoke test failed:', err);
  process.exit(1);
});
