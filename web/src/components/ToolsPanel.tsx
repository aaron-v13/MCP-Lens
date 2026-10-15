import React from 'react';
import { ToolDefinition } from '../lens/types';

interface ToolsPanelProps {
  tools: ToolDefinition[];
  onTriggerToolCall?: (toolName: string) => void;
}

export const ToolsPanel: React.FC<ToolsPanelProps> = ({ tools, onTriggerToolCall }) => {
  if (!tools || tools.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
        No tools discovered yet. Initializing handshake and tools/list...
      </div>
    );
  }

  return (
    <div className="tools-grid">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-dim)', fontWeight: 600 }}>
          {tools.length} Tools Discovered via <code className="mono">tools/list</code>
        </span>
      </div>

      {tools.map((tool) => {
        const properties = tool.inputSchema?.properties || {};
        const requiredProps = new Set(tool.inputSchema?.required || []);
        const propKeys = Object.keys(properties);

        return (
          <div key={tool.name} className="tool-card">
            <div className="tool-card-header">
              <span className="tool-name">{tool.name}</span>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {tool.outputSchema && <span className="tool-badge-out">outputSchema declared</span>}
                {onTriggerToolCall && (
                  <button
                    className="action-pill-btn"
                    onClick={() => onTriggerToolCall(tool.name)}
                    title={`Test calling ${tool.name}`}
                  >
                    ▶ Test Call
                  </button>
                )}
              </div>
            </div>

            <p className="tool-desc">{tool.description || 'No description provided.'}</p>

            {propKeys.length > 0 ? (
              <div>
                <span className="detail-section-title">Input Parameters</span>
                <table className="schema-table">
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>Type</th>
                      <th>Req</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {propKeys.map((propName) => {
                      const prop = properties[propName];
                      const isRequired = requiredProps.has(propName);
                      return (
                        <tr key={propName}>
                          <td className="prop-name">{propName}</td>
                          <td className="prop-type">
                            {prop.type || 'any'}
                            {prop.enum ? ` (${prop.enum.join('|')})` : ''}
                          </td>
                          <td style={{ color: isRequired ? 'var(--color-red)' : 'var(--text-muted)' }}>
                            {isRequired ? 'yes' : 'no'}
                          </td>
                          <td style={{ color: 'var(--text-dim)' }}>{prop.description || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No input arguments required.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
