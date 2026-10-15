import React from 'react';
import { WireEvent } from '../lens/types';

interface HandshakeTimelineProps {
  events: WireEvent[];
  onSelectEvent: (event: WireEvent) => void;
  selectedEventId?: string;
}

export const HandshakeTimeline: React.FC<HandshakeTimelineProps> = ({
  events,
  onSelectEvent,
  selectedEventId,
}) => {
  if (!events || events.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
        No wire traffic recorded yet. Connect to the MCP server or run the lifecycle.
      </div>
    );
  }

  const getNodeClass = (event: WireEvent): string => {
    if (event.severity === 'error' || event.kind === 'error') return 'node-error';
    if (event.kind === 'sse-event') return 'node-sse';
    if (event.direction === 'out') return 'node-out';
    return 'node-in';
  };

  const getDirectionArrow = (event: WireEvent): string => {
    if (event.severity === 'error' || event.kind === 'error') return '✕';
    if (event.kind === 'sse-event') return '⚡';
    if (event.direction === 'out') return '→';
    return '←';
  };

  const getEventSummary = (event: WireEvent): string => {
    if (event.errorKind) {
      return `[${event.errorKind.toUpperCase()} ERROR] ${JSON.stringify(event.payload)}`;
    }
    if (event.payload && typeof event.payload === 'object') {
      const p = event.payload as Record<string, unknown>;
      if (p.params && typeof p.params === 'object') {
        const pr = p.params as Record<string, unknown>;
        if (pr.name) return `tool: ${pr.name} (args: ${JSON.stringify(pr.arguments || {})})`;
        if (pr.delta) return `chunk delta: "${pr.delta}"`;
      }
      if (p.result && typeof p.result === 'object') {
        const r = p.result as Record<string, unknown>;
        if (r.tools && Array.isArray(r.tools)) return `catalog returned ${r.tools.length} registered tools`;
        if (r.content && Array.isArray(r.content)) return `returned ${r.content.length} content block(s)`;
      }
      if (p.serverInfo && typeof p.serverInfo === 'object') {
        const si = p.serverInfo as Record<string, unknown>;
        return `connected to ${si.name} v${si.version}`;
      }
    }
    return JSON.stringify(event.payload).slice(0, 80);
  };

  return (
    <div className="timeline-list">
      {events.map((evt) => {
        const isSelected = evt.id === selectedEventId;
        const nodeClass = getNodeClass(evt);
        const arrow = getDirectionArrow(evt);

        return (
          <div
            key={evt.id}
            className={`timeline-item ${evt.severity === 'error' ? 'error' : ''}`}
            style={{
              borderColor: isSelected ? 'var(--color-cyan)' : undefined,
              boxShadow: isSelected ? '0 0 0 1px var(--color-cyan)' : undefined,
            }}
            onClick={() => onSelectEvent(evt)}
            title="Click to inspect raw JSON payload"
          >
            <div className={`node-icon ${nodeClass}`}>{arrow}</div>

            <div className="timeline-content">
              <div className="timeline-row-top">
                <div>
                  <span className="method-tag">
                    {evt.method || (evt.kind === 'sse-event' ? 'SSE chunk' : evt.kind)}
                  </span>
                  <span className={`method-kind-pill kind-${evt.kind}`}>
                    {evt.kind}
                  </span>
                  {evt.status && (
                    <span
                      style={{
                        marginLeft: '6px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        color: evt.status >= 400 ? 'var(--color-red)' : 'var(--color-green)',
                        fontWeight: 700,
                      }}
                    >
                      HTTP {evt.status}
                    </span>
                  )}
                </div>

                <div className="timeline-time-meta">
                  {evt.latencyMs !== undefined && (
                    <span className="latency-badge">{evt.latencyMs} ms</span>
                  )}
                  <span>+{evt.t} ms</span>
                </div>
              </div>

              <div className="timeline-summary">{getEventSummary(evt)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
