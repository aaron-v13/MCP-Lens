import { describe, it, expect } from 'vitest';
import {
  FIXTURE_WIRE_EVENTS,
  FIXTURE_TOOLS,
  FIXTURE_CALL_LOG,
  FIXTURE_STREAM_STATE,
} from './fixtures';

describe('MCP Lens Fixtures & Wire Contract', () => {
  it('contains all 4 contract tools in tools/list', () => {
    const toolNames = FIXTURE_TOOLS.map((t) => t.name);
    expect(toolNames).toContain('search_notes');
    expect(toolNames).toContain('summarize');
    expect(toolNames).toContain('extract_tasks');
    expect(toolNames).toContain('draft_reply');
    expect(toolNames.length).toBe(4);
  });

  it('contains valid handshake wire events', () => {
    const initReq = FIXTURE_WIRE_EVENTS.find(
      (e) => e.method === 'initialize' && e.direction === 'out'
    );
    const initRes = FIXTURE_WIRE_EVENTS.find(
      (e) => e.method === 'initialize' && e.direction === 'in'
    );
    expect(initReq).toBeDefined();
    expect(initRes).toBeDefined();
    expect(initRes?.status).toBe(200);
  });

  it('contains at least 3 incremental streamed SSE chunks for summarize', () => {
    const sseChunks = FIXTURE_WIRE_EVENTS.filter(
      (e) => e.kind === 'sse-event' && e.callId === 'call-sum-01'
    );
    expect(sseChunks.length).toBeGreaterThanOrEqual(3);
    expect(FIXTURE_STREAM_STATE.chunks.length).toBeGreaterThanOrEqual(3);
  });

  it('contains distinct error wire events for transport, protocol, and tool errors', () => {
    const transportErr = FIXTURE_WIRE_EVENTS.find(
      (e) => e.errorKind === 'transport' && e.direction === 'in'
    );
    const protocolErr = FIXTURE_WIRE_EVENTS.find(
      (e) => e.errorKind === 'protocol' && e.direction === 'in'
    );
    const toolErr = FIXTURE_WIRE_EVENTS.find(
      (e) => e.errorKind === 'tool' && e.direction === 'in'
    );

    expect(transportErr).toBeDefined();
    expect(transportErr?.status).toBe(401);

    expect(protocolErr).toBeDefined();
    expect((protocolErr?.payload as any)?.error?.code).toBe(-32601);

    expect(toolErr).toBeDefined();
    expect((toolErr?.payload as any)?.result?.isError).toBe(true);
  });

  it('ensures auth tokens are redacted in fixture wire events', () => {
    const wireStr = JSON.stringify(FIXTURE_WIRE_EVENTS);
    expect(wireStr).not.toContain('dev-token-change-me');
    expect(wireStr).not.toContain('secret-token');
    // Any auth header present in payloads should be redacted
    for (const evt of FIXTURE_WIRE_EVENTS) {
      if (evt.payload && typeof evt.payload === 'object') {
        const p = evt.payload as Record<string, any>;
        if (p.headers?.authorization) {
          expect(p.headers.authorization).toBe('Bearer ••••');
        }
      }
    }
  });

  it('has structuredContent in extract_tasks call log', () => {
    const tasksCall = FIXTURE_CALL_LOG.find((c) => c.tool === 'extract_tasks');
    expect(tasksCall).toBeDefined();
    expect(tasksCall?.status).toBe('ok');
    expect(tasksCall?.structuredContent?.tasks).toBeInstanceOf(Array);
    expect((tasksCall?.structuredContent?.tasks as any[]).length).toBe(4);
  });
});
