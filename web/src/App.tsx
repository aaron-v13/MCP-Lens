import React, { useState, useEffect, useRef } from 'react';
import { ConnectionBar } from './components/ConnectionBar';
import { HandshakeTimeline } from './components/HandshakeTimeline';
import { ToolsPanel } from './components/ToolsPanel';
import { CallLog } from './components/CallLog';
import { StreamView } from './components/StreamView';
import { RawJsonDrawer } from './components/RawJsonDrawer';
import { ChatPanel, ChatMessage } from './components/ChatPanel';
import { McpLensClient } from './mcpClient';
import { routeUserIntent } from './chat/router';
import {
  FIXTURE_WIRE_EVENTS,
  FIXTURE_TOOLS,
  FIXTURE_CALL_LOG,
  FIXTURE_STREAM_STATE,
  FIXTURE_SERVER_META,
} from './lens/fixtures';
import { WireEvent, ToolCallItem, ToolDefinition, StreamedCallState, ServerMeta } from './lens/types';

export const App: React.FC = () => {
  const isFixtureUrl = new URLSearchParams(window.location.search).get('fixtures') === '1';
  const [isFixtureMode, setIsFixtureMode] = useState(isFixtureUrl);

  const [serverUrl, setServerUrl] = useState(
    import.meta.env.VITE_DEFAULT_SERVER_URL || 'http://localhost:8787/mcp'
  );
  const [token, setToken] = useState(
    import.meta.env.VITE_DEFAULT_TOKEN || 'dev-token-change-me'
  );
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'tools' | 'calls' | 'stream'>('timeline');
  const [selectedEvent, setSelectedEvent] = useState<WireEvent | null>(null);

  const [wireEvents, setWireEvents] = useState<WireEvent[]>(
    isFixtureUrl ? FIXTURE_WIRE_EVENTS : []
  );
  const [toolsList, setToolsList] = useState<ToolDefinition[]>(
    isFixtureUrl ? FIXTURE_TOOLS : []
  );
  const [callLog, setCallLog] = useState<ToolCallItem[]>(
    isFixtureUrl ? FIXTURE_CALL_LOG : []
  );
  const [streamState, setStreamState] = useState<StreamedCallState>(FIXTURE_STREAM_STATE);
  const [serverMeta, setServerMeta] = useState<ServerMeta>(FIXTURE_SERVER_META);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      text: 'Hello! I am your Alexa+ assistant backed by a self-hosted Model Context Protocol (MCP) server. Ask me about your notes, action items, or summaries to see the live protocol lifecycle in the Lens.',
    },
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const clientRef = useRef<McpLensClient>(new McpLensClient());

  // Subscribe to client wire-tap events
  useEffect(() => {
    const client = clientRef.current;
    const unsubscribe = client.subscribe((event) => {
      setWireEvents((prev) => [event, ...prev]);

      // If SSE chunk event arrived, update stream state
      if (event.kind === 'sse-event' && event.payload) {
        const p = event.payload as any;
        const delta = p.data?.params?.delta || p.data?.params?.message || '';
        if (delta) {
          setStreamState((prev) => ({
            ...prev,
            tool: 'summarize',
            chunks: [
              ...prev.chunks,
              {
                id: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                callId: event.callId || 'live-call',
                chunkIndex: prev.chunks.length + 1,
                t: event.t,
                deltaText: delta,
                accumulatedText: (prev.chunks[prev.chunks.length - 1]?.accumulatedText || '') + delta,
              },
            ],
          }));
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Attempt auto-connect on load if not explicitly in ?fixtures=1 mode
  useEffect(() => {
    if (!isFixtureUrl) {
      handleConnect(serverUrl, token).catch(() => {});
    }
  }, []);

  // Connect handler
  const handleConnect = async (url = serverUrl, tok = token) => {
    try {
      setIsFixtureMode(false);
      const client = clientRef.current;
      await client.connect(url, tok);
      setIsConnected(true);

      const discoveredTools = await client.listTools();
      setToolsList(discoveredTools);

      setServerMeta({
        protocolVersion: client.serverMeta.protocolVersion,
        serverName: client.serverMeta.serverName,
        serverVersion: client.serverMeta.serverVersion,
        llmProvider: 'mock',
        corpus: 'seeded-sample-data',
        surface: 'simulated-alexa-plus',
      });
    } catch (err: any) {
      console.error('Failed to connect to MCP server:', err);
      setIsConnected(false);
    }
  };

  const handleDisconnect = async () => {
    await clientRef.current.disconnect();
    setIsConnected(false);
  };

  const handleToggleConnect = () => {
    if (isConnected) {
      handleDisconnect();
    } else {
      handleConnect();
    }
  };

  // Run full lifecycle button
  const handleRunLifecycle = async () => {
    setActiveTab('timeline');
    try {
      if (!isConnected) {
        await handleConnect();
      }

      const client = clientRef.current;

      // 1. tools/list
      const tools = await client.listTools();
      setToolsList(tools);

      // 2. search_notes
      const searchRes = await client.callTool('search_notes', { query: 'launch', limit: 3 });
      addCallLogItem('search_notes', { query: 'launch', limit: 3 }, searchRes);

      // 3. summarize with streaming
      setStreamState({
        callId: `sum-${Date.now()}`,
        tool: 'summarize',
        totalExpectedChunks: 5,
        chunks: [],
        isComplete: false,
      });
      setActiveTab('stream');

      const sumRes = await client.callTool('summarize', { noteId: 'n001', style: 'brief' });
      addCallLogItem('summarize', { noteId: 'n001', style: 'brief' }, sumRes);
      setStreamState((prev) => ({
        ...prev,
        isComplete: true,
        finalResult: sumRes.content[0]?.text || '',
      }));

      // 4. extract_tasks
      const taskRes = await client.callTool('extract_tasks', { sinceDays: 7 });
      addCallLogItem('extract_tasks', { sinceDays: 7 }, taskRes);

      // 5. draft_reply
      const draftRes = await client.callTool('draft_reply', { noteId: 'n001', tone: 'formal' });
      addCallLogItem('draft_reply', { noteId: 'n001', tone: 'formal' }, draftRes);

      setActiveTab('calls');
    } catch (err) {
      console.error('Error during full lifecycle run:', err);
    }
  };

  // Helper to add item to call log
  const addCallLogItem = (
    tool: string,
    args: Record<string, unknown>,
    result: {
      content: Array<{ type: string; text?: string }>;
      structuredContent?: Record<string, unknown>;
      isError?: boolean;
      durationMs: number;
      errorKind?: any;
    }
  ) => {
    const item: ToolCallItem = {
      id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tool,
      args,
      startTime: Date.now(),
      durationMs: result.durationMs,
      status: result.isError ? (result.errorKind || 'tool-error') : 'ok',
      resultText: result.content[0]?.text,
      structuredContent: result.structuredContent,
      errorMessage: result.isError ? result.content[0]?.text : undefined,
    };
    setCallLog((prev) => [item, ...prev]);
  };

  // Trigger error simulation buttons
  const handleTriggerError = async (type: 'transport' | 'protocol' | 'tool') => {
    setActiveTab('timeline');
    const client = clientRef.current;

    if (type === 'transport') {
      // Simulate Bad Token -> Expect HTTP 401
      const badClient = new McpLensClient();
      badClient.subscribe((evt) => {
        setWireEvents((prev) => [evt, ...prev]);
        if (evt.errorKind === 'transport') {
          setSelectedEvent(evt);
        }
      });
      try {
        await badClient.connect(serverUrl, 'bad-invalid-token');
      } catch {
        // Expected
      }
    } else if (type === 'protocol') {
      // Simulate invalid tool name -> Expect JSON-RPC error
      if (!isConnected) await handleConnect();
      const res = await client.callTool('non_existent_tool', {});
      addCallLogItem('non_existent_tool', {}, res);
      setActiveTab('calls');
    } else if (type === 'tool') {
      // Simulate unknown note ID -> Expect isError: true
      if (!isConnected) await handleConnect();
      const res = await client.callTool('summarize', { noteId: 'n999-unknown' });
      addCallLogItem('summarize', { noteId: 'n999-unknown' }, res);
      setActiveTab('calls');
    }
  };

  // Handle user conversational chat message
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      if (!isConnected) {
        await handleConnect();
      }

      const client = clientRef.current;
      const route = routeUserIntent(text);

      if (route.tool === 'help') {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `asst-${Date.now()}`,
            sender: 'assistant',
            text: 'I can help you search your notes, extract open action items, stream summaries, and draft email replies via Model Context Protocol tools. Try asking: "What are my open action items from last week\'s notes?"',
          },
        ]);
        setIsChatLoading(false);
        return;
      }

      // Execute tool call via MCP client
      const res = await client.callTool(route.tool, route.args);
      addCallLogItem(route.tool, route.args, res);

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: res.content[0]?.text || '',
        toolCallName: route.tool,
        toolLatencyMs: res.durationMs,
        structuredTasks: (res.structuredContent as any)?.tasks,
        searchResults: (res.structuredContent as any)?.results,
        draftReply:
          route.tool === 'draft_reply'
            ? {
                subject: (res.structuredContent as any)?.subject || 'Draft Reply',
                body: (res.structuredContent as any)?.body || res.content[0]?.text || '',
                noteId: String(route.args.noteId || 'n001'),
              }
            : undefined,
      };

      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `Error calling MCP tool: ${err.message || 'Unknown error'}`,
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSelectLensCall = (toolName: string) => {
    if (toolName === 'summarize') {
      setActiveTab('stream');
    } else {
      setActiveTab('calls');
    }
  };

  const handleClearTraffic = () => {
    setWireEvents([]);
    setCallLog([]);
  };

  const handleResetFixtures = () => {
    setIsFixtureMode(true);
    setWireEvents(FIXTURE_WIRE_EVENTS);
    setToolsList(FIXTURE_TOOLS);
    setCallLog(FIXTURE_CALL_LOG);
    setStreamState(FIXTURE_STREAM_STATE);
  };

  return (
    <div className="app-container">
      {/* Top Banner if in fixture mode */}
      {isFixtureMode && (
        <div className="fixture-banner">
          <div>
            <span className="fixture-tag">FIXTURE DATA MODE</span>
            <span style={{ marginLeft: '10px' }}>
              Viewing recorded protocol fixtures. Click "Connect" above to switch to live Streamable HTTP traffic.
            </span>
          </div>
          <div>
            <button
              onClick={() => handleConnect()}
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff',
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Switch to Live Server
            </button>
          </div>
        </div>
      )}

      {/* Global Connection & Protocol Bar */}
      <ConnectionBar
        serverUrl={serverUrl}
        setServerUrl={setServerUrl}
        token={token}
        setToken={setToken}
        isConnected={isConnected}
        onToggleConnect={handleToggleConnect}
        meta={serverMeta}
        isFixtureMode={isFixtureMode}
        onRunLifecycle={handleRunLifecycle}
        onTriggerError={handleTriggerError}
      />

      {/* Main Two-Column Workspace */}
      <main className="main-workspace">
        {/* Left Column: MCP Lens (Protocol Inspector) */}
        <section className="lens-column">
          <div className="lens-header">
            <div className="lens-title-group">
              <span className="lens-title">Protocol Wire-Tap</span>
              <span className="lens-subtitle">Live Streamable HTTP Inspector</span>
            </div>

            <div className="lens-tabs">
              <button
                className={`lens-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
                onClick={() => setActiveTab('timeline')}
              >
                Wire Events ({wireEvents.length})
              </button>
              <button
                className={`lens-tab-btn ${activeTab === 'tools' ? 'active' : ''}`}
                onClick={() => setActiveTab('tools')}
              >
                Tools ({toolsList.length})
              </button>
              <button
                className={`lens-tab-btn ${activeTab === 'calls' ? 'active' : ''}`}
                onClick={() => setActiveTab('calls')}
              >
                Call Log ({callLog.length})
              </button>
              <button
                className={`lens-tab-btn ${activeTab === 'stream' ? 'active' : ''}`}
                onClick={() => setActiveTab('stream')}
              >
                Stream Inspector
              </button>
            </div>

            <div className="lens-actions">
              <button className="action-pill-btn" onClick={handleClearTraffic} title="Clear event buffer">
                Clear
              </button>
              {!isFixtureMode && (
                <button className="action-pill-btn" onClick={handleResetFixtures} title="Load fixture dataset">
                  Fixtures
                </button>
              )}
            </div>
          </div>

          <div className="lens-body">
            {activeTab === 'timeline' && (
              <HandshakeTimeline
                events={wireEvents}
                onSelectEvent={(evt) => setSelectedEvent(evt)}
                selectedEventId={selectedEvent?.id}
              />
            )}

            {activeTab === 'tools' && (
              <ToolsPanel
                tools={toolsList}
                onTriggerToolCall={(tool) => {
                  handleSelectLensCall(tool);
                }}
              />
            )}

            {activeTab === 'calls' && <CallLog calls={callLog} />}

            {activeTab === 'stream' && <StreamView streamState={streamState} />}
          </div>
        </section>

        {/* Right Column: Chat Panel (Simulated Alexa+ Surface) */}
        <ChatPanel
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          onSelectLensCall={handleSelectLensCall}
          isLoading={isChatLoading}
        />
      </main>

      {/* Slide-over Raw JSON Drawer */}
      <RawJsonDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
};
export default App;
