import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { ProgressNotificationSchema } from '@modelcontextprotocol/sdk/types.js';
import { WireEvent, WireErrorKind, ToolDefinition } from './lens/types';

export interface CallToolOptions {
  onProgress?: (progress: number, total?: number, message?: string) => void;
}

export type WireEventListener = (event: WireEvent) => void;

export class McpLensClient {
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;
  private connectTime = 0;
  private eventListeners: WireEventListener[] = [];
  private currentCallId?: string;

  public isConnected = false;
  public serverMeta: {
    protocolVersion: string;
    serverName: string;
    serverVersion: string;
  } = {
    protocolVersion: '2025-11-25',
    serverName: 'mcp-lens-notes',
    serverVersion: '0.1.0',
  };

  public subscribe(listener: WireEventListener): () => void {
    this.eventListeners.push(listener);
    return () => {
      this.eventListeners = this.eventListeners.filter((l) => l !== listener);
    };
  }

  private emitEvent(event: WireEvent) {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in wire event listener:', err);
      }
    }
  }

  /**
   * Redacts any authorization token or secret in payload/headers
   */
  public static redactAuthHeader(headers: HeadersInit | Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    if (headers instanceof Headers) {
      headers.forEach((v, k) => {
        out[k.toLowerCase()] = k.toLowerCase() === 'authorization' ? 'Bearer ••••' : v;
      });
    } else if (Array.isArray(headers)) {
      for (const [k, v] of headers) {
        out[k.toLowerCase()] = k.toLowerCase() === 'authorization' ? 'Bearer ••••' : v;
      }
    } else if (typeof headers === 'object' && headers !== null) {
      for (const k of Object.keys(headers)) {
        out[k.toLowerCase()] = k.toLowerCase() === 'authorization' ? 'Bearer ••••' : (headers as Record<string, string>)[k];
      }
    }
    return out;
  }

  /**
   * Helper to parse raw SSE chunks
   */
  public static parseSseStreamLines(buffer: string): { events: Array<{ event?: string; data?: unknown }>; remaining: string } {
    const rawChunks = buffer.split(/\r?\n\r?\n/);
    const remaining = rawChunks.pop() || '';
    const events: Array<{ event?: string; data?: unknown }> = [];

    for (const block of rawChunks) {
      if (!block.trim()) continue;
      const lines = block.split(/\r?\n/);
      let eventType: string | undefined;
      let dataStr = '';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataStr += (dataStr ? '\n' : '') + line.slice(5).trim();
        }
      }

      let parsedData: unknown = dataStr;
      if (dataStr) {
        try {
          parsedData = JSON.parse(dataStr);
        } catch {
          parsedData = dataStr;
        }
      }

      events.push({ event: eventType, data: parsedData });
    }

    return { events, remaining };
  }

  /**
   * Creates the custom wire-tap fetch wrapper that records outgoing/incoming frames
   * and tees SSE bodies without consuming the SDK's stream.
   */
  private createWireTapFetch(_serverUrl?: string, _token?: string): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const startTime = Date.now();
      const relativeTime = Math.max(0, startTime - this.connectTime);
      const reqId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      // 1. Process Request
      let parsedBody: unknown = undefined;
      let method: string | undefined = undefined;
      let rpcId: string | number | undefined = undefined;

      if (init?.body && typeof init.body === 'string') {
        try {
          parsedBody = JSON.parse(init.body);
          if (parsedBody && typeof parsedBody === 'object') {
            const p = parsedBody as Record<string, unknown>;
            method = typeof p.method === 'string' ? p.method : undefined;
            rpcId = (p.id as string | number) || undefined;
          }
        } catch {
          parsedBody = init.body;
        }
      }

      const safeHeaders = McpLensClient.redactAuthHeader(init?.headers || {});

      this.emitEvent({
        id: reqId,
        t: relativeTime,
        direction: 'out',
        kind: 'http-request',
        method,
        rpcId,
        callId: this.currentCallId,
        severity: 'info',
        payload: {
          url: urlStr,
          method: init?.method || 'POST',
          headers: safeHeaders,
          body: parsedBody,
        },
      });

      // Execute actual fetch
      let response: Response;
      try {
        response = await fetch(input, init);
      } catch (networkError: any) {
        const latency = Date.now() - startTime;
        this.emitEvent({
          id: `err-${Date.now()}`,
          t: relativeTime + latency,
          direction: 'in',
          kind: 'error',
          severity: 'error',
          errorKind: 'transport',
          latencyMs: latency,
          callId: this.currentCallId,
          payload: {
            error: networkError.message || 'Network fetch failed',
            status: 0,
          },
        });
        throw networkError;
      }

      const latencyMs = Date.now() - startTime;
      const resId = `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const contentType = response.headers.get('content-type') || '';

      // 2. Handle Transport Errors (e.g. 401, 403, 500)
      if (!response.ok) {
        const cloned = response.clone();
        let errBody: unknown = '';
        try {
          errBody = await cloned.json();
        } catch {
          errBody = await cloned.text();
        }

        this.emitEvent({
          id: resId,
          t: relativeTime + latencyMs,
          direction: 'in',
          kind: 'error',
          method,
          rpcId,
          status: response.status,
          latencyMs,
          callId: this.currentCallId,
          severity: 'error',
          errorKind: 'transport',
          payload: errBody,
        });

        return response;
      }

      // 3. Handle Streaming Responses (text/event-stream) by Tee-ing the stream
      if (contentType.includes('text/event-stream') && response.body) {
        const [sdkStream, tapStream] = response.body.tee();

        // Process wire-tap stream in the background
        (async () => {
          const reader = tapStream.getReader();
          const decoder = new TextDecoder();
          let sseBuffer = '';

          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;

              sseBuffer += decoder.decode(value, { stream: true });
              const { events, remaining } = McpLensClient.parseSseStreamLines(sseBuffer);
              sseBuffer = remaining;

              for (const sseEvt of events) {
                const now = Date.now() - this.connectTime;
                this.emitEvent({
                  id: `sse-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  t: now,
                  direction: 'in',
                  kind: 'sse-event',
                  callId: this.currentCallId,
                  severity: 'info',
                  payload: sseEvt,
                });
              }
            }
          } catch (streamErr) {
            console.warn('Wire-tap stream reader closed:', streamErr);
          }
        })();

        // Return untouched stream to SDK
        return new Response(sdkStream, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }

      // 4. Handle Standard JSON Responses
      const cloned = response.clone();
      try {
        const jsonBody = await cloned.json();
        const hasJsonRpcError = jsonBody && typeof jsonBody === 'object' && jsonBody.error;

        this.emitEvent({
          id: resId,
          t: relativeTime + latencyMs,
          direction: 'in',
          kind: hasJsonRpcError ? 'error' : 'http-response',
          method,
          rpcId,
          status: response.status,
          latencyMs,
          callId: this.currentCallId,
          severity: hasJsonRpcError ? 'error' : 'info',
          errorKind: hasJsonRpcError ? 'protocol' : undefined,
          payload: jsonBody,
        });
      } catch {
        // Non-JSON ok response
      }

      return response;
    };
  }

  /**
   * Connect to MCP Server forcing the 2025-11-25 handshake
   */
  public async connect(serverUrl: string, token: string): Promise<void> {
    this.connectTime = Date.now();
    const wireTapFetch = this.createWireTapFetch(serverUrl, token);

    const transport = new StreamableHTTPClientTransport(new URL(serverUrl), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${token}`,
          Origin:
            typeof window !== 'undefined' && window.location?.origin
              ? window.location.origin
              : 'http://localhost:5173',
        },
      },
      fetch: wireTapFetch,
    });

    const client = new Client(
      {
        name: 'mcp-lens-client',
        version: '0.1.0',
      },
      {
        capabilities: {},
      }
    );

    // Track progress notifications
    client.setNotificationHandler(
      ProgressNotificationSchema,
      (notification: any) => {
        this.emitEvent({
          id: `prog-${Date.now()}`,
          t: Date.now() - this.connectTime,
          direction: 'in',
          kind: 'sse-event',
          callId: this.currentCallId,
          severity: 'info',
          payload: notification,
        });
      }
    );

    await client.connect(transport);

    this.client = client;
    this.transport = transport;
    this.isConnected = true;

    // Record server meta from handshake
    const serverVersion = (client as any).getServerVersion?.();
    if (serverVersion) {
      this.serverMeta.serverName = serverVersion.name || 'mcp-lens-notes';
      this.serverMeta.serverVersion = serverVersion.version || '0.1.0';
    }
  }

  public async listTools(): Promise<ToolDefinition[]> {
    if (!this.client) throw new Error('Client not connected');
    const res = await this.client.listTools();
    return res.tools as ToolDefinition[];
  }

  public async callTool(
    name: string,
    args: Record<string, unknown> = {},
    options?: CallToolOptions
  ): Promise<{
    content: Array<{ type: string; text?: string }>;
    structuredContent?: Record<string, unknown>;
    isError?: boolean;
    durationMs: number;
    errorKind?: WireErrorKind;
  }> {
    if (!this.client) throw new Error('Client not connected');

    const callId = `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.currentCallId = callId;
    const startTime = Date.now();

    try {
      const result = await this.client.callTool(
        {
          name,
          arguments: args,
        },
        undefined,
        {
          onprogress: (progress: any) => {
            options?.onProgress?.(progress.progress, progress.total, progress.message);
          },
        }
      );

      const durationMs = Date.now() - startTime;
      const isError = Boolean(result.isError);

      return {
        content: result.content as Array<{ type: string; text?: string }>,
        structuredContent: (result as any).structuredContent,
        isError,
        durationMs,
        errorKind: isError ? 'tool' : undefined,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      let errorKind: WireErrorKind = 'protocol';

      if (err.code === 401 || err.code === 403 || err.status === 401 || err.status === 403) {
        errorKind = 'transport';
      }

      return {
        content: [{ type: 'text', text: err.message || 'Call failed' }],
        isError: true,
        durationMs,
        errorKind,
      };
    } finally {
      this.currentCallId = undefined;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close().catch(() => {});
    }
    this.client = null;
    this.transport = null;
    this.isConnected = false;
  }
}
