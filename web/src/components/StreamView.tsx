import React, { useState } from 'react';
import { StreamedCallState } from '../lens/types';

interface StreamViewProps {
  streamState: StreamedCallState;
}

export const StreamView: React.FC<StreamViewProps> = ({ streamState }) => {
  const [visibleChunkCount, setVisibleChunkCount] = useState<number>(streamState.chunks.length);

  const chunks = streamState.chunks.slice(0, visibleChunkCount);
  const total = streamState.totalExpectedChunks || streamState.chunks.length || 1;
  const progressPercent = Math.min(100, Math.round((chunks.length / total) * 100));

  const restartStreamSimulation = () => {
    setVisibleChunkCount(1);
    let current = 1;
    const interval = setInterval(() => {
      current++;
      setVisibleChunkCount(current);
      if (current >= streamState.chunks.length) {
        clearInterval(interval);
      }
    }, 400);
  };

  return (
    <div className="stream-inspector">
      <div className="stream-card">
        <div className="stream-header">
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-cyan)' }}>
              Streamable HTTP SSE Inspector: {streamState.tool}
            </span>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Call ID: <code className="mono">{streamState.callId}</code>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-llm">
              Chunk {chunks.length} of {total} ({progressPercent}%)
            </span>
            <button className="action-pill-btn" onClick={restartStreamSimulation} title="Replay streaming animation">
              ▶ Replay Stream
            </button>
          </div>
        </div>

        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        <div>
          <span className="detail-section-title">Incremental Chunks (Partial Events)</span>
          <div style={{ marginTop: '8px' }}>
            {chunks.map((chunk) => (
              <div key={chunk.id} className="stream-chunk-item">
                <span className="chunk-badge">#{chunk.chunkIndex} · +{chunk.t}ms</span>
                <span className="chunk-text">"{chunk.deltaText}"</span>
              </div>
            ))}
          </div>
        </div>

        {chunks.length === total && streamState.finalResult && (
          <div style={{ marginTop: '16px' }}>
            <span className="detail-section-title" style={{ color: 'var(--color-green)' }}>
              Final Assembled Output
            </span>
            <div className="code-block" style={{ marginTop: '6px', color: '#6ee7b7' }}>
              {streamState.finalResult}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
