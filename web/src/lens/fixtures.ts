import { ToolCallItem, ToolDefinition, WireEvent, StreamedCallState, ServerMeta } from './types';

export const FIXTURE_SERVER_META: ServerMeta = {
  protocolVersion: '2025-11-25',
  serverName: 'mcp-lens-notes',
  serverVersion: '0.1.0',
  llmProvider: 'mock',
  corpus: 'seeded-sample-data',
  surface: 'simulated-alexa-plus',
};

export const FIXTURE_TOOLS: ToolDefinition[] = [
  {
    name: 'search_notes',
    description: 'Search markdown notes using BM25-style keyword ranking across titles, body, and tags.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords or phrases' },
        limit: { type: 'integer', description: 'Maximum results to return (1-10, default 5)' },
      },
      required: ['query'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        results: { type: 'array', description: 'Matched note snippets with relevance scores' },
        meta: { type: 'object', description: 'Execution metadata including LLM provider and corpus' },
      },
    },
  },
  {
    name: 'summarize',
    description: 'Summarize a specific note or search query with incremental streamed chunks.',
    inputSchema: {
      type: 'object',
      properties: {
        noteId: { type: 'string', description: 'Target note ID (e.g. n001)' },
        query: { type: 'string', description: 'Query to summarize across notes' },
        style: { type: 'string', enum: ['brief', 'detailed'], description: 'Summary detail level' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Full generated summary' },
        sources: { type: 'array', description: 'Referenced note IDs' },
        style: { type: 'string' },
        meta: { type: 'object' },
      },
    },
  },
  {
    name: 'extract_tasks',
    description: 'Deterministic extraction of open action items, TODOs, due dates, and assignees from notes.',
    inputSchema: {
      type: 'object',
      properties: {
        noteId: { type: 'string', description: 'Extract from specific note' },
        query: { type: 'string', description: 'Filter tasks by keyword or topic' },
        sinceDays: { type: 'integer', description: 'Lookback window in days (1-60) from reference date' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        tasks: { type: 'array', description: 'List of structured tasks with owner and due date' },
        count: { type: 'integer', description: 'Number of open tasks found' },
        meta: { type: 'object' },
      },
    },
  },
  {
    name: 'draft_reply',
    description: 'Draft a contextual reply to an email or meeting thread note.',
    inputSchema: {
      type: 'object',
      properties: {
        noteId: { type: 'string', description: 'Note ID to reply to' },
        tone: { type: 'string', enum: ['friendly', 'formal', 'brief'], description: 'Draft tone' },
        intent: { type: 'string', description: 'Goal or key points to include in reply' },
      },
      required: ['noteId'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        subject: { type: 'string', description: 'Proposed email subject' },
        body: { type: 'string', description: 'Drafted message body' },
        noteId: { type: 'string' },
        meta: { type: 'object' },
      },
    },
  },
];

export const FIXTURE_WIRE_EVENTS: WireEvent[] = [
  // 1. Handshake Initialize Request
  {
    id: 'evt-001',
    t: 4,
    direction: 'out',
    kind: 'http-request',
    method: 'initialize',
    rpcId: 1,
    latencyMs: 38,
    severity: 'info',
    payload: {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-11-25',
        capabilities: {
          roots: { listChanged: false },
          sampling: {},
        },
        clientInfo: {
          name: 'mcp-lens-client',
          version: '0.1.0',
        },
      },
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer ••••',
      },
    },
  },
  // 2. Handshake Initialize Response
  {
    id: 'evt-002',
    t: 42,
    direction: 'in',
    kind: 'http-response',
    method: 'initialize',
    rpcId: 1,
    status: 200,
    severity: 'info',
    payload: {
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion: '2025-11-25',
        capabilities: {
          tools: { listChanged: false },
          logging: {},
        },
        serverInfo: {
          name: 'mcp-lens-notes',
          version: '0.1.0',
        },
        instructions: 'Self-hosted notes MCP server with deterministic tools and streaming capabilities.',
      },
    },
  },
  // 3. Handshake Initialized Notification
  {
    id: 'evt-003',
    t: 46,
    direction: 'out',
    kind: 'jsonrpc-notification',
    method: 'notifications/initialized',
    severity: 'info',
    payload: {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {},
    },
  },
  // 4. tools/list Request
  {
    id: 'evt-004',
    t: 58,
    direction: 'out',
    kind: 'http-request',
    method: 'tools/list',
    rpcId: 2,
    latencyMs: 24,
    severity: 'info',
    payload: {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer ••••',
      },
    },
  },
  // 5. tools/list Response
  {
    id: 'evt-005',
    t: 82,
    direction: 'in',
    kind: 'http-response',
    method: 'tools/list',
    rpcId: 2,
    status: 200,
    severity: 'info',
    payload: {
      jsonrpc: '2.0',
      id: 2,
      result: {
        tools: FIXTURE_TOOLS,
      },
    },
  },
  // 6. tools/call extract_tasks (Structured result)
  {
    id: 'evt-006',
    t: 140,
    direction: 'out',
    kind: 'http-request',
    method: 'tools/call',
    rpcId: 3,
    callId: 'call-tasks-01',
    latencyMs: 56,
    severity: 'info',
    payload: {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'extract_tasks',
        arguments: {
          sinceDays: 7,
        },
      },
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer ••••',
      },
    },
  },
  {
    id: 'evt-007',
    t: 196,
    direction: 'in',
    kind: 'http-response',
    method: 'tools/call',
    rpcId: 3,
    callId: 'call-tasks-01',
    status: 200,
    severity: 'info',
    payload: {
      jsonrpc: '2.0',
      id: 3,
      result: {
        content: [
          {
            type: 'text',
            text: 'Found 4 open action items across 3 notes from the last 7 days.',
          },
        ],
        structuredContent: {
          tasks: [
            {
              task: 'Finalize serverless cold start benchmarks',
              owner: 'Alex Chen',
              due: '2026-10-22',
              sourceNoteId: 'n014',
              sourceTitle: 'Sprint 42 Architecture Review',
            },
            {
              task: 'Review PR #128 for Streamable HTTP SSE parser',
              owner: 'Dev Lead',
              due: '2026-10-21',
              sourceNoteId: 'n018',
              sourceTitle: '1:1 Sync with Platform Engineering',
            },
            {
              task: 'Update Devpost demo video storyboard script',
              owner: 'Sarah Connor',
              due: '2026-10-22',
              sourceNoteId: 'n023',
              sourceTitle: 'Hackathon Submission Checklist',
            },
            {
              task: 'Verify token header redaction in wire-tap logs',
              owner: 'Security QA',
              due: '2026-10-23',
              sourceNoteId: 'n023',
              sourceTitle: 'Hackathon Submission Checklist',
            },
          ],
          count: 4,
          meta: {
            llm: 'mock',
            corpus: 'seeded-sample-data',
            referenceDate: '2026-10-21',
          },
        },
      },
    },
  },
  // 7. Streamed summarize call with 5 chunks
  {
    id: 'evt-008',
    t: 310,
    direction: 'out',
    kind: 'http-request',
    method: 'tools/call',
    rpcId: 4,
    callId: 'call-sum-01',
    latencyMs: 380,
    severity: 'info',
    payload: {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'summarize',
        arguments: {
          noteId: 'n001',
          style: 'brief',
        },
      },
    },
  },
  {
    id: 'evt-009',
    t: 370,
    direction: 'in',
    kind: 'sse-event',
    callId: 'call-sum-01',
    severity: 'info',
    payload: {
      event: 'message',
      data: {
        jsonrpc: '2.0',
        method: 'notifications/progress',
        params: {
          progressToken: 'prog-01',
          progress: 20,
          total: 100,
          delta: 'Q3 Product Strategy alignment session covered quarterly milestones, ',
        },
      },
    },
  },
  {
    id: 'evt-010',
    t: 440,
    direction: 'in',
    kind: 'sse-event',
    callId: 'call-sum-01',
    severity: 'info',
    payload: {
      event: 'message',
      data: {
        jsonrpc: '2.0',
        method: 'notifications/progress',
        params: {
          progressToken: 'prog-01',
          progress: 40,
          total: 100,
          delta: 'emphasizing the self-hosted MCP server rollout. ',
        },
      },
    },
  },
  {
    id: 'evt-011',
    t: 510,
    direction: 'in',
    kind: 'sse-event',
    callId: 'call-sum-01',
    severity: 'info',
    payload: {
      event: 'message',
      data: {
        jsonrpc: '2.0',
        method: 'notifications/progress',
        params: {
          progressToken: 'prog-01',
          progress: 60,
          total: 100,
          delta: 'Key decisions include targeting AWS Lambda Function URLs with Streamable HTTP ',
        },
      },
    },
  },
  {
    id: 'evt-012',
    t: 590,
    direction: 'in',
    kind: 'sse-event',
    callId: 'call-sum-01',
    severity: 'info',
    payload: {
      event: 'message',
      data: {
        jsonrpc: '2.0',
        method: 'notifications/progress',
        params: {
          progressToken: 'prog-01',
          progress: 80,
          total: 100,
          delta: 'and enforcing a single bearer token authentication model. ',
        },
      },
    },
  },
  {
    id: 'evt-013',
    t: 660,
    direction: 'in',
    kind: 'sse-event',
    callId: 'call-sum-01',
    severity: 'info',
    payload: {
      event: 'message',
      data: {
        jsonrpc: '2.0',
        method: 'notifications/progress',
        params: {
          progressToken: 'prog-01',
          progress: 100,
          total: 100,
          delta: 'Action items were distributed with deadlines leading up to the submission date.',
        },
      },
    },
  },
  {
    id: 'evt-014',
    t: 690,
    direction: 'in',
    kind: 'http-response',
    method: 'tools/call',
    rpcId: 4,
    callId: 'call-sum-01',
    status: 200,
    severity: 'info',
    payload: {
      jsonrpc: '2.0',
      id: 4,
      result: {
        content: [
          {
            type: 'text',
            text: 'Q3 Product Strategy alignment session covered quarterly milestones, emphasizing the self-hosted MCP server rollout. Key decisions include targeting AWS Lambda Function URLs with Streamable HTTP and enforcing a single bearer token authentication model. Action items were distributed with deadlines leading up to the submission date.',
          },
        ],
        structuredContent: {
          summary:
            'Q3 Product Strategy alignment session covered quarterly milestones, emphasizing the self-hosted MCP server rollout. Key decisions include targeting AWS Lambda Function URLs with Streamable HTTP and enforcing a single bearer token authentication model. Action items were distributed with deadlines leading up to the submission date.',
          sources: ['n001'],
          style: 'brief',
          meta: {
            llm: 'mock',
            corpus: 'seeded-sample-data',
          },
        },
      },
    },
  },
  // 8. Transport Error (HTTP 401 Bad Token)
  {
    id: 'evt-015',
    t: 850,
    direction: 'out',
    kind: 'http-request',
    method: 'tools/call',
    rpcId: 5,
    callId: 'call-err-trans',
    latencyMs: 18,
    severity: 'error',
    errorKind: 'transport',
    payload: {
      headers: {
        authorization: 'Bearer ••••',
      },
      note: 'Simulated invalid bearer token request',
    },
  },
  {
    id: 'evt-016',
    t: 868,
    direction: 'in',
    kind: 'error',
    callId: 'call-err-trans',
    status: 401,
    severity: 'error',
    errorKind: 'transport',
    payload: {
      error: 'unauthorized',
      message: 'HTTP 401 Unauthorized: Invalid or missing Bearer token in request header.',
    },
  },
  // 9. Protocol Error (JSON-RPC invalid params / unknown tool)
  {
    id: 'evt-017',
    t: 980,
    direction: 'out',
    kind: 'http-request',
    method: 'tools/call',
    rpcId: 6,
    callId: 'call-err-proto',
    latencyMs: 22,
    severity: 'error',
    errorKind: 'protocol',
    payload: {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'non_existent_tool',
        arguments: {},
      },
    },
  },
  {
    id: 'evt-018',
    t: 1002,
    direction: 'in',
    kind: 'error',
    callId: 'call-err-proto',
    status: 200,
    severity: 'error',
    errorKind: 'protocol',
    payload: {
      jsonrpc: '2.0',
      id: 6,
      error: {
        code: -32601,
        message: 'Method not found: tool "non_existent_tool" is not registered on this server.',
      },
    },
  },
  // 10. Tool Error (Note ID not found - valid JSON-RPC but isError: true)
  {
    id: 'evt-019',
    t: 1120,
    direction: 'out',
    kind: 'http-request',
    method: 'tools/call',
    rpcId: 7,
    callId: 'call-err-tool',
    latencyMs: 31,
    severity: 'error',
    errorKind: 'tool',
    payload: {
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {
        name: 'summarize',
        arguments: {
          noteId: 'n999-unknown',
        },
      },
    },
  },
  {
    id: 'evt-020',
    t: 1151,
    direction: 'in',
    kind: 'error',
    callId: 'call-err-tool',
    status: 200,
    severity: 'error',
    errorKind: 'tool',
    payload: {
      jsonrpc: '2.0',
      id: 7,
      result: {
        isError: true,
        content: [
          {
            type: 'text',
            text: 'Note not found: "n999-unknown" does not exist in the 50 seeded markdown corpus.',
          },
        ],
      },
    },
  },
];

export const FIXTURE_CALL_LOG: ToolCallItem[] = [
  {
    id: 'call-tasks-01',
    tool: 'extract_tasks',
    args: { sinceDays: 7 },
    startTime: 140,
    durationMs: 56,
    status: 'ok',
    resultText: 'Found 4 open action items across 3 notes from the last 7 days.',
    structuredContent: {
      tasks: [
        {
          task: 'Finalize serverless cold start benchmarks',
          owner: 'Alex Chen',
          due: '2026-10-22',
          sourceNoteId: 'n014',
          sourceTitle: 'Sprint 42 Architecture Review',
        },
        {
          task: 'Review PR #128 for Streamable HTTP SSE parser',
          owner: 'Dev Lead',
          due: '2026-10-21',
          sourceNoteId: 'n018',
          sourceTitle: '1:1 Sync with Platform Engineering',
        },
        {
          task: 'Update Devpost demo video storyboard script',
          owner: 'Sarah Connor',
          due: '2026-10-22',
          sourceNoteId: 'n023',
          sourceTitle: 'Hackathon Submission Checklist',
        },
        {
          task: 'Verify token header redaction in wire-tap logs',
          owner: 'Security QA',
          due: '2026-10-23',
          sourceNoteId: 'n023',
          sourceTitle: 'Hackathon Submission Checklist',
        },
      ],
      count: 4,
      meta: {
        llm: 'mock',
        corpus: 'seeded-sample-data',
        referenceDate: '2026-10-21',
      },
    },
  },
  {
    id: 'call-sum-01',
    tool: 'summarize',
    args: { noteId: 'n001', style: 'brief' },
    startTime: 310,
    durationMs: 380,
    status: 'ok',
    resultText:
      'Q3 Product Strategy alignment session covered quarterly milestones, emphasizing the self-hosted MCP server rollout. Key decisions include targeting AWS Lambda Function URLs with Streamable HTTP and enforcing a single bearer token authentication model. Action items were distributed with deadlines leading up to the submission date.',
    structuredContent: {
      summary:
        'Q3 Product Strategy alignment session covered quarterly milestones, emphasizing the self-hosted MCP server rollout. Key decisions include targeting AWS Lambda Function URLs with Streamable HTTP and enforcing a single bearer token authentication model.',
      sources: ['n001'],
      style: 'brief',
      meta: { llm: 'mock', corpus: 'seeded-sample-data' },
    },
  },
  {
    id: 'call-err-trans',
    tool: 'connect/auth',
    args: { token: 'bad-invalid-token' },
    startTime: 850,
    durationMs: 18,
    status: 'transport-error',
    errorMessage: 'HTTP 401 Unauthorized: Invalid or missing Bearer token in request header.',
  },
  {
    id: 'call-err-proto',
    tool: 'non_existent_tool',
    args: {},
    startTime: 980,
    durationMs: 22,
    status: 'protocol-error',
    errorMessage: 'JSON-RPC -32601: Method not found: tool "non_existent_tool" is not registered on this server.',
  },
  {
    id: 'call-err-tool',
    tool: 'summarize',
    args: { noteId: 'n999-unknown' },
    startTime: 1120,
    durationMs: 31,
    status: 'tool-error',
    errorMessage: 'Tool returned error (isError: true): Note "n999-unknown" not found in corpus.',
  },
];

export const FIXTURE_STREAM_STATE: StreamedCallState = {
  callId: 'call-sum-01',
  tool: 'summarize',
  totalExpectedChunks: 5,
  chunks: [
    {
      id: 'chk-1',
      callId: 'call-sum-01',
      chunkIndex: 1,
      t: 370,
      deltaText: 'Q3 Product Strategy alignment session covered quarterly milestones, ',
      accumulatedText: 'Q3 Product Strategy alignment session covered quarterly milestones, ',
    },
    {
      id: 'chk-2',
      callId: 'call-sum-01',
      chunkIndex: 2,
      t: 440,
      deltaText: 'emphasizing the self-hosted MCP server rollout. ',
      accumulatedText: 'Q3 Product Strategy alignment session covered quarterly milestones, emphasizing the self-hosted MCP server rollout. ',
    },
    {
      id: 'chk-3',
      callId: 'call-sum-01',
      chunkIndex: 3,
      t: 510,
      deltaText: 'Key decisions include targeting AWS Lambda Function URLs with Streamable HTTP ',
      accumulatedText:
        'Q3 Product Strategy alignment session covered quarterly milestones, emphasizing the self-hosted MCP server rollout. Key decisions include targeting AWS Lambda Function URLs with Streamable HTTP ',
    },
    {
      id: 'chk-4',
      callId: 'call-sum-01',
      chunkIndex: 4,
      t: 590,
      deltaText: 'and enforcing a single bearer token authentication model. ',
      accumulatedText:
        'Q3 Product Strategy alignment session covered quarterly milestones, emphasizing the self-hosted MCP server rollout. Key decisions include targeting AWS Lambda Function URLs with Streamable HTTP and enforcing a single bearer token authentication model. ',
    },
    {
      id: 'chk-5',
      callId: 'call-sum-01',
      chunkIndex: 5,
      t: 660,
      deltaText: 'Action items were distributed with deadlines leading up to the submission date.',
      accumulatedText:
        'Q3 Product Strategy alignment session covered quarterly milestones, emphasizing the self-hosted MCP server rollout. Key decisions include targeting AWS Lambda Function URLs with Streamable HTTP and enforcing a single bearer token authentication model. Action items were distributed with deadlines leading up to the submission date.',
    },
  ],
  isComplete: true,
  finalResult:
    'Q3 Product Strategy alignment session covered quarterly milestones, emphasizing the self-hosted MCP server rollout. Key decisions include targeting AWS Lambda Function URLs with Streamable HTTP and enforcing a single bearer token authentication model. Action items were distributed with deadlines leading up to the submission date.',
};
