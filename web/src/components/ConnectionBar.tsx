import React from 'react';
import { ServerMeta } from '../lens/types';

interface ConnectionBarProps {
  serverUrl: string;
  setServerUrl: (url: string) => void;
  token: string;
  setToken: (token: string) => void;
  isConnected: boolean;
  onToggleConnect: () => void;
  meta: ServerMeta;
  isFixtureMode: boolean;
  onRunLifecycle?: () => void;
  onTriggerError?: (type: 'transport' | 'protocol' | 'tool') => void;
}

export const ConnectionBar: React.FC<ConnectionBarProps> = ({
  serverUrl,
  setServerUrl,
  token,
  setToken,
  isConnected,
  onToggleConnect,
  meta,
  isFixtureMode,
  onRunLifecycle,
  onTriggerError,
}) => {
  return (
    <header className="connection-bar">
      <div className="conn-row-main">
        <div className="conn-brand">
          <span style={{ fontSize: '18px' }}>🔍</span>
          <span>MCP Lens</span>
        </div>

        <div className="conn-inputs">
          <div className="conn-field-group">
            <span className="conn-field-label">Endpoint</span>
            <input
              type="text"
              className="conn-input"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://localhost:8787/mcp"
            />
          </div>

          <div className="conn-field-group" style={{ maxWidth: '240px' }}>
            <span className="conn-field-label">Token</span>
            <input
              type="password"
              className="conn-input"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="••••••••••••"
            />
          </div>

          <button
            className={`conn-btn ${isConnected ? 'connected' : 'disconnected'}`}
            onClick={onToggleConnect}
          >
            {isConnected ? 'Disconnect' : 'Connect'}
          </button>

          <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>

        {onRunLifecycle && (
          <div className="lens-actions">
            <button className="action-pill-btn" onClick={onRunLifecycle} title="Execute complete MCP lifecycle">
              ▶ Run Full Lifecycle
            </button>
            {onTriggerError && (
              <>
                <button
                  className="action-pill-btn"
                  onClick={() => onTriggerError('transport')}
                  title="Trigger HTTP 401 Unauthorized"
                >
                  ⚡ Err: Bad Token
                </button>
                <button
                  className="action-pill-btn"
                  onClick={() => onTriggerError('protocol')}
                  title="Trigger JSON-RPC -32601 Method Not Found"
                >
                  ⚡ Err: Invalid Tool
                </button>
                <button
                  className="action-pill-btn"
                  onClick={() => onTriggerError('tool')}
                  title="Trigger Tool Execution Error isError: true"
                >
                  ⚡ Err: Unknown Note
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="badges-row">
        <span className="badge badge-protocol">
          <span>Spec:</span>
          <strong>{meta.protocolVersion}</strong>
        </span>

        <span className="badge badge-llm">
          <span>LLM:</span>
          <strong>{meta.llmProvider}</strong>
        </span>

        <span className="badge badge-corpus">
          <span>Corpus:</span>
          <strong>{meta.corpus}</strong>
        </span>

        <span className="badge badge-surface">
          <span>Chat:</span>
          <strong>{meta.surface}</strong>
        </span>

        {isFixtureMode && (
          <span className="fixture-tag" title="Viewing simulated fixture data for local verification">
            FIXTURE DATA
          </span>
        )}
      </div>
    </header>
  );
};
