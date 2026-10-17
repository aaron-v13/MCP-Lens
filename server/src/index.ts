import express from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createMcpServer } from './server.js';
import { loadCorpus } from './corpus.js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '8787', 10);
const MCP_LENS_TOKEN = process.env.MCP_LENS_TOKEN || 'dev-token-change-me';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

const app = express();

// Pre-load corpus on startup
try {
  const notes = loadCorpus();
  console.log(`[mcp-lens-notes] Pre-loaded corpus with ${notes.length} notes.`);
} catch (err) {
  console.warn('[mcp-lens-notes] Warning: corpus loading deferred or error:', err);
}

// Global CORS & Origin Middleware
app.use((req, res, next) => {
  const origin = req.headers['origin'];

  if (origin) {
    if (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      res.status(403).json({ error: 'forbidden', message: 'Origin not allowed' });
      return;
    }
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version, Origin'
  );
  res.setHeader(
    'Access-Control-Allow-Methods',
    'POST, GET, OPTIONS, DELETE, HEAD'
  );
  res.setHeader(
    'Access-Control-Expose-Headers',
    'Mcp-Session-Id, Mcp-Protocol-Version, Content-Type'
  );

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
});

// Single MCP Endpoint Authentication Middleware
const authenticateBearer: express.RequestHandler = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    res.status(401).json({ error: 'unauthorized', message: 'Missing Authorization header' });
    return;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match || match[1] !== MCP_LENS_TOKEN) {
    res.status(401).json({ error: 'unauthorized', message: 'Invalid Bearer token' });
    return;
  }

  next();
};

// In-memory session store mapping Mcp-Session-Id -> { server, transport }
interface SessionEntry {
  server: Server;
  transport: StreamableHTTPServerTransport;
  lastActive: number;
}
const sessions = new Map<string, SessionEntry>();

// Root endpoint for status
app.get('/', (_req, res) => {
  res.json({
    service: 'mcp-lens-notes',
    version: '0.1.0',
    spec: '2025-11-25',
    endpoint: '/mcp',
    activeSessions: sessions.size,
  });
});

// MCP Streamable HTTP endpoint: all methods (POST, GET, DELETE)
app.all('/mcp', authenticateBearer, async (req, res) => {
  const reqSessionId = req.headers['mcp-session-id'] as string | undefined;

  let session = reqSessionId ? sessions.get(reqSessionId) : undefined;

  if (reqSessionId && !session) {
    res.status(404).json({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Session not found' },
      id: null,
    });
    return;
  }

  if (!session) {
    // New connection / initialization
    const newSessionId = crypto.randomUUID();
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => newSessionId,
    });

    await server.connect(transport);
    session = { server, transport, lastActive: Date.now() };
    sessions.set(newSessionId, session);
  } else {
    session.lastActive = Date.now();
  }

  try {
    await session.transport.handleRequest(req, res);
  } catch (error) {
    console.error('[mcp] Error handling request:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE' && reqSessionId) {
    sessions.delete(reqSessionId);
  }
});

import { fileURLToPath } from 'url';

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  app.listen(PORT, () => {
    console.log(`[mcp-lens-notes] MCP Server listening on http://localhost:${PORT}/mcp (Streamable HTTP)`);
    console.log(`[mcp-lens-notes] Token: ${MCP_LENS_TOKEN ? 'configured' : 'missing'}`);
    console.log(`[mcp-lens-notes] Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  });
}

export { app };
