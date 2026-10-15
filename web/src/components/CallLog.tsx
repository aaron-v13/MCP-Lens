import React, { useState } from 'react';
import { ToolCallItem } from '../lens/types';

interface CallLogProps {
  calls: ToolCallItem[];
}

export const CallLog: React.FC<CallLogProps> = ({ calls }) => {
  const [expandedId, setExpandedId] = useState<string | null>(calls[0]?.id || null);

  if (!calls || calls.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
        No tool calls recorded yet.
      </div>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="call-log-list">
      {calls.map((call) => {
        const isExpanded = expandedId === call.id;

        return (
          <div key={call.id} className="call-log-item">
            <div className="call-log-header" onClick={() => toggleExpand(call.id)}>
              <div className="call-log-left">
                <span className={`status-chip ${call.status}`}>{call.status}</span>
                <span className="call-tool-name">{call.tool}</span>
                <span className="call-args-snippet">{JSON.stringify(call.args)}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {call.durationMs !== undefined && (
                  <span className="latency-badge">{call.durationMs} ms</span>
                )}
                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                  {isExpanded ? '▲' : '▼'}
                </span>
              </div>
            </div>

            {isExpanded && (
              <div className="call-log-details">
                <div>
                  <span className="detail-section-title">Arguments Sent</span>
                  <div className="code-block">{JSON.stringify(call.args, null, 2)}</div>
                </div>

                {call.errorMessage && (
                  <div>
                    <span className="detail-section-title" style={{ color: 'var(--color-red)' }}>
                      Error Details
                    </span>
                    <div className="code-block" style={{ color: 'var(--color-red)' }}>
                      {call.errorMessage}
                    </div>
                  </div>
                )}

                {call.resultText && (
                  <div>
                    <span className="detail-section-title">Human-Readable Content</span>
                    <div className="code-block">{call.resultText}</div>
                  </div>
                )}

                {call.structuredContent && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="detail-section-title" style={{ color: 'var(--color-cyan)' }}>
                        StructuredContent Payload
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        Typed JSON Schema Conforming
                      </span>
                    </div>
                    <div className="code-block" style={{ color: '#bae6fd' }}>
                      {JSON.stringify(call.structuredContent, null, 2)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
