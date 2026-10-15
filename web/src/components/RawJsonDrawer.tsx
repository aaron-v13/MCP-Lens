import React, { useEffect, useState } from 'react';
import { WireEvent } from '../lens/types';

interface RawJsonDrawerProps {
  event: WireEvent | null;
  onClose: () => void;
}

export const RawJsonDrawer: React.FC<RawJsonDrawerProps> = ({ event, onClose }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!event) return null;

  // Ensure any token in payload or headers is redacted
  const sanitizePayload = (payload: unknown): unknown => {
    if (!payload || typeof payload !== 'object') return payload;

    const copy = JSON.parse(JSON.stringify(payload));
    const redact = (obj: Record<string, unknown>) => {
      for (const key of Object.keys(obj)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey === 'authorization' ||
          lowerKey === 'token' ||
          lowerKey === 'bearer' ||
          lowerKey === 'mcp_lens_token'
        ) {
          obj[key] = 'Bearer ••••';
        } else if (obj[key] && typeof obj[key] === 'object') {
          redact(obj[key] as Record<string, unknown>);
        }
      }
    };

    redact(copy as Record<string, unknown>);
    return copy;
  };

  const cleanPayload = sanitizePayload(event.payload);
  const jsonString = JSON.stringify(cleanPayload, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer-panel">
        <div className="drawer-header">
          <div>
            <span className="drawer-title">Wire-Tap Inspector</span>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Event ID: {event.id}
            </div>
          </div>

          <div className="drawer-controls">
            <button className="drawer-btn" onClick={handleCopy}>
              {copied ? '✓ Copied' : 'Copy JSON'}
            </button>
            <button className="drawer-btn" onClick={onClose}>
              Esc [✕]
            </button>
          </div>
        </div>

        <div className="drawer-body">
          <div className="drawer-meta-grid">
            <div className="drawer-meta-item">
              <div className="drawer-meta-label">Kind</div>
              <div className="drawer-meta-val">{event.kind}</div>
            </div>
            <div className="drawer-meta-item">
              <div className="drawer-meta-label">Direction</div>
              <div className="drawer-meta-val">
                {event.direction === 'out' ? 'Outgoing (Client → Server)' : 'Incoming (Server → Client)'}
              </div>
            </div>
            <div className="drawer-meta-item">
              <div className="drawer-meta-label">Timestamp</div>
              <div className="drawer-meta-val">+{event.t} ms from connect</div>
            </div>
            <div className="drawer-meta-item">
              <div className="drawer-meta-label">Latency</div>
              <div className="drawer-meta-val">{event.latencyMs !== undefined ? `${event.latencyMs} ms` : '—'}</div>
            </div>
            {event.status && (
              <div className="drawer-meta-item">
                <div className="drawer-meta-label">HTTP Status</div>
                <div className="drawer-meta-val">{event.status}</div>
              </div>
            )}
            {event.method && (
              <div className="drawer-meta-item">
                <div className="drawer-meta-label">JSON-RPC Method</div>
                <div className="drawer-meta-val">{event.method}</div>
              </div>
            )}
          </div>

          <span className="detail-section-title">Raw Payload (Redacted Token)</span>
          <pre className="json-viewer" style={{ marginTop: '8px' }}>
            {jsonString}
          </pre>
        </div>
      </div>
    </>
  );
};
