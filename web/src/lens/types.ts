export type WireEventKind =
  | 'http-request'
  | 'http-response'
  | 'jsonrpc-request'
  | 'jsonrpc-response'
  | 'jsonrpc-notification'
  | 'sse-event'
  | 'error';

export type WireDirection = 'out' | 'in';
export type WireSeverity = 'info' | 'error';
export type WireErrorKind = 'transport' | 'protocol' | 'tool';

export interface WireEvent {
  id: string;
  t: number; // ms since connect
  direction: WireDirection;
  kind: WireEventKind;
  method?: string; // JSON-RPC method if any
  rpcId?: string | number;
  status?: number; // HTTP status code
  latencyMs?: number;
  payload: unknown; // raw JSON or parsed body
  callId?: string; // groups events of one tool call
  severity: WireSeverity;
  errorKind?: WireErrorKind;
}

export interface ToolDefinition {
  name: string;
  description?: string;
  inputSchema?: {
    type?: string;
    properties?: Record<string, { type?: string; description?: string; enum?: string[] }>;
    required?: string[];
  };
  outputSchema?: Record<string, unknown>;
}

export interface ToolCallItem {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  startTime: number;
  durationMs?: number;
  status: 'pending' | 'ok' | 'tool-error' | 'protocol-error' | 'transport-error';
  errorMessage?: string;
  resultText?: string;
  structuredContent?: Record<string, unknown>;
}

export interface StreamChunkItem {
  id: string;
  callId: string;
  chunkIndex: number;
  t: number; // timestamp ms
  deltaText: string;
  accumulatedText: string;
}

export interface StreamedCallState {
  callId: string;
  tool: string;
  totalExpectedChunks?: number;
  chunks: StreamChunkItem[];
  isComplete: boolean;
  finalResult?: string;
}

export interface ServerMeta {
  protocolVersion: string;
  serverName: string;
  serverVersion: string;
  llmProvider: string;
  corpus: string;
  surface: string;
}
