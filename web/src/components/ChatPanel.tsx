import React, { useState } from 'react';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  toolCallName?: string;
  toolLatencyMs?: number;
  structuredTasks?: Array<{
    task: string;
    owner?: string;
    due?: string;
    sourceNoteId?: string;
    sourceTitle?: string;
  }>;
  searchResults?: Array<{
    noteId: string;
    title: string;
    date: string;
    snippet: string;
    score: number;
  }>;
  draftReply?: {
    subject: string;
    body: string;
    noteId: string;
  };
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void> | void;
  onSelectLensCall?: (toolName: string) => void;
  isLoading?: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  onSelectLensCall,
  isLoading = false,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);

  const SUGGESTIONS = [
    { text: "What are my open action items from last week's notes?", featured: true },
    { text: 'Summarize note n001', featured: false },
    { text: 'Find notes about launch', featured: false },
    { text: 'Draft a reply to note n001', featured: false },
  ];

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setInputVal('');
    await onSendMessage(text.trim());
  };

  const handleCopyDraft = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDraftId(id);
    setTimeout(() => setCopiedDraftId(null), 2000);
  };

  return (
    <aside className="chat-column">
      <div className="chat-banner">
        <span>💬</span>
        <span>Simulated Alexa+ conversational surface — real MCP traffic is shown in the Lens</span>
      </div>

      <div className="chat-messages">
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble-row ${m.sender}`}>
            <div className={`chat-bubble ${m.sender}`}>
              {m.toolCallName && (
                <div
                  className="chat-tool-chip"
                  onClick={() => onSelectLensCall?.(m.toolCallName!)}
                  title="Click to view MCP tools/call in the Lens"
                >
                  <span>⚡</span>
                  <span>{m.toolCallName}</span>
                  {m.toolLatencyMs !== undefined && <span>· {m.toolLatencyMs} ms</span>}
                </div>
              )}

              <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>

              {/* Structured Checklist for extract_tasks */}
              {m.structuredTasks && m.structuredTasks.length > 0 && (
                <ul className="task-checklist">
                  {m.structuredTasks.map((t, idx) => (
                    <li key={idx} className="task-item">
                      <input type="checkbox" className="task-checkbox" readOnly defaultChecked={false} />
                      <div className="task-info">
                        <div className="task-title">{t.task}</div>
                        <div className="task-meta">
                          {t.owner && <span>👤 @{t.owner}</span>}
                          {t.due && <span>📅 Due: {t.due}</span>}
                          {t.sourceNoteId && <span>📝 {t.sourceNoteId}</span>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Cards for search_notes */}
              {m.searchResults && m.searchResults.length > 0 && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {m.searchResults.map((r) => (
                    <div
                      key={r.noteId}
                      style={{
                        background: 'var(--bg-input)',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--color-cyan)' }}>
                        <span>[{r.noteId}] {r.title}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{r.date}</span>
                      </div>
                      <div style={{ marginTop: '4px', color: 'var(--text-dim)', fontSize: '11px' }}>
                        {r.snippet}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Card for draft_reply */}
              {m.draftReply && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '12px',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-cyan)', fontSize: '12px' }}>
                      Subject: {m.draftReply.subject}
                    </span>
                    <button
                      className="action-pill-btn"
                      onClick={() => handleCopyDraft(m.id, `${m.draftReply?.subject}\n\n${m.draftReply?.body}`)}
                      title="Copy draft to clipboard"
                    >
                      {copiedDraftId === m.id ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '12px', whiteSpace: 'pre-wrap', color: '#e2e8f0' }}>
                    {m.draftReply.body}
                  </div>
                </div>
              )}

              {m.toolCallName && (
                <div className="chat-tool-attribution">
                  <span>via MCP</span>
                  <code className="mono">tools/call → {m.toolCallName}</code>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="chat-bubble-row assistant">
            <div className="chat-bubble assistant" style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
              Alexa+ is calling MCP tools...
            </div>
          </div>
        )}
      </div>

      <div className="chat-suggestions">
        {SUGGESTIONS.map((s, idx) => (
          <button
            key={idx}
            className={`suggestion-chip ${s.featured ? 'featured' : ''}`}
            onClick={() => handleSend(s.text)}
            disabled={isLoading}
          >
            {s.featured ? '★ ' : ''}
            {s.text}
          </button>
        ))}
      </div>

      <form
        className="chat-input-bar"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(inputVal);
        }}
      >
        <input
          type="text"
          className="chat-input"
          placeholder="Ask Alexa+ (e.g. 'What are my open action items?')"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          disabled={isLoading}
        />
        <button type="submit" className="chat-send-btn" disabled={isLoading || !inputVal.trim()}>
          {isLoading ? '...' : 'Send'}
        </button>
      </form>
    </aside>
  );
};
