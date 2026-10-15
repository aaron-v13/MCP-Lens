import React, { useState } from 'react';
import { ConnectionBar } from './components/ConnectionBar';
import { HandshakeTimeline } from './components/HandshakeTimeline';
import { ToolsPanel } from './components/ToolsPanel';
import { CallLog } from './components/CallLog';
import { StreamView } from './components/StreamView';
import { RawJsonDrawer } from './components/RawJsonDrawer';
import { ChatPanel } from './components/ChatPanel';
import {
  FIXTURE_WIRE_EVENTS,
  FIXTURE_TOOLS,
  FIXTURE_CALL_LOG,
  FIXTURE_STREAM_STATE,
  FIXTURE_SERVER_META,
} from './lens/fixtures';
import { WireEvent, ToolCallItem } from './lens/types';

export const App: React.FC = () => {
  const [serverUrl, setServerUrl] = useState(
    import.meta.env.VITE_DEFAULT_SERVER_URL || 'http://localhost:8787/mcp'
  );
  const [token, setToken] = useState(
    import.meta.env.VITE_DEFAULT_TOKEN || 'dev-token-change-me'
  );
  const [isConnected, setIsConnected] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'tools' | 'calls' | 'stream'>('timeline');
  const [selectedEvent, setSelectedEvent] = useState<WireEvent | null>(null);

  const [wireEvents, setWireEvents] = useState<WireEvent[]>(FIXTURE_WIRE_EVENTS);
  const [toolsList] = useState(FIXTURE_TOOLS);
  const [callLog, setCallLog] = useState<ToolCallItem[]>(FIXTURE_CALL_LOG);
  const [streamState] = useState(FIXTURE_STREAM_STATE);
  const [serverMeta] = useState(FIXTURE_SERVER_META);

  const handleToggleConnect = () => {
    setIsConnected((prev) => !prev);
  };

  const handleTriggerError = (type: 'transport' | 'protocol' | 'tool') => {
    setActiveTab('calls');
    // Filter to or highlight corresponding error in log
    if (type === 'transport') {
      const errEvent = wireEvents.find((e) => e.errorKind === 'transport');
      if (errEvent) setSelectedEvent(errEvent);
    } else if (type === 'protocol') {
      const errEvent = wireEvents.find((e) => e.errorKind === 'protocol');
      if (errEvent) setSelectedEvent(errEvent);
    } else if (type === 'tool') {
      const errEvent = wireEvents.find((e) => e.errorKind === 'tool');
      if (errEvent) setSelectedEvent(errEvent);
    }
  };

  const handleRunLifecycle = () => {
    setActiveTab('timeline');
    // Briefly simulate refresh of wire events
    setWireEvents([...FIXTURE_WIRE_EVENTS]);
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
    setWireEvents(FIXTURE_WIRE_EVENTS);
    setCallLog(FIXTURE_CALL_LOG);
  };

  return (
    <div className="app-container">
      {/* Top Fixture Banner */}
      <div className="fixture-banner">
        <div>
          <span className="fixture-tag">FIXTURE DATA MODE</span>
          <span style={{ marginLeft: '10px' }}>
            UI Shell verified with seeded protocol fixtures. Real MCP transport connects in Phase B2.
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleResetFixtures}
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
            Reload Fixtures
          </button>
        </div>
      </div>

      {/* Global Connection & Protocol Bar */}
      <ConnectionBar
        serverUrl={serverUrl}
        setServerUrl={setServerUrl}
        token={token}
        setToken={setToken}
        isConnected={isConnected}
        onToggleConnect={handleToggleConnect}
        meta={serverMeta}
        isFixtureMode={true}
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
          onSendMessage={(text) => {
            console.log('User sent query to Alexa+ surface:', text);
          }}
          onSelectLensCall={handleSelectLensCall}
        />
      </main>

      {/* Slide-over Raw JSON Drawer */}
      <RawJsonDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
};
export default App;
