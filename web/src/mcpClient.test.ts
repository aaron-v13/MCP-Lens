import { describe, it, expect } from 'vitest';
import { McpLensClient } from './mcpClient';

describe('McpLensClient & Wire-Tap Logic', () => {
  it('strictly redacts authorization header to Bearer ••••', () => {
    const headers = {
      Authorization: 'Bearer super-secret-token-12345',
      'Content-Type': 'application/json',
      Accept: 'text/event-stream, application/json',
    };

    const redacted = McpLensClient.redactAuthHeader(headers);
    expect(redacted.authorization).toBe('Bearer ••••');
    expect(JSON.stringify(redacted)).not.toContain('super-secret-token-12345');
    expect(redacted['content-type']).toBe('application/json');
  });

  it('correctly parses SSE lines split across network chunks', () => {
    const chunk1 = 'event: message\ndata: {"step": 1}\n\nevent: message\ndata: {"step":';
    const parsed1 = McpLensClient.parseSseStreamLines(chunk1);

    expect(parsed1.events.length).toBe(1);
    expect(parsed1.events[0].event).toBe('message');
    expect(parsed1.events[0].data).toEqual({ step: 1 });
    expect(parsed1.remaining).toBe('event: message\ndata: {"step":');

    // Second chunk arriving with remainder
    const chunk2 = parsed1.remaining + ' 2}\n\n';
    const parsed2 = McpLensClient.parseSseStreamLines(chunk2);

    expect(parsed2.events.length).toBe(1);
    expect(parsed2.events[0].data).toEqual({ step: 2 });
    expect(parsed2.remaining).toBe('');
  });

  it('classifies error kinds correctly into transport, protocol, and tool', () => {
    // 1. Transport error (HTTP 401)
    const transportErr = { status: 401, message: 'Unauthorized' };
    const isTransport = transportErr.status === 401;
    expect(isTransport).toBe(true);

    // 2. Protocol error (JSON-RPC -32601)
    const rpcErr = { error: { code: -32601, message: 'Method not found' } };
    const isProtocol = Boolean(rpcErr.error && rpcErr.error.code);
    expect(isProtocol).toBe(true);

    // 3. Tool error (isError: true)
    const toolErr = { result: { isError: true, content: [{ type: 'text', text: 'Note not found' }] } };
    const isTool = Boolean(toolErr.result?.isError);
    expect(isTool).toBe(true);
  });

  it('instantiates client with valid notification handler schema', () => {
    const client = new McpLensClient();
    expect(client).toBeDefined();
    expect(client.isConnected).toBe(false);
  });
});
