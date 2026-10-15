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
  draftReply?: {
    subject: string;
    body: string;
    noteId: string;
  };
}

interface ChatPanelProps {
  onSendMessage: (text: string) => void;
  onSelectLensCall?: (toolName: string) => void;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'user',
    text: 'What are my open action items from last week\'s notes?',
  },
  {
    id: 'msg-2',
    sender: 'assistant',
    text: 'I found 4 open action items across your team sprint, 1:1, and hackathon notes from the past 7 days:',
    toolCallName: 'extract_tasks',
    toolLatencyMs: 56,
    structuredTasks: [
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
  },
];

export const ChatPanel: React.FC<ChatPanelProps> = ({ onSendMessage, onSelectLensCall }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputVal, setInputVal] = useState('');

  const SUGGESTIONS = [
    { text: "What are my open action items from last week's notes?", featured: true },
    { text: 'Summarize note n001', featured: false },
    { text: 'Find notes about launch', featured: false },
    { text: 'Draft a reply to note n001', featured: false },
  ];

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    onSendMessage(text.trim());

    // Generate responsive simulated response for fixture UI shell
    setTimeout(() => {
      let assistantMsg: ChatMessage;

      if (text.toLowerCase().includes('summar')) {
        assistantMsg = {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          text: 'Here is a brief summary of note n001:',
          toolCallName: 'summarize',
          toolLatencyMs: 380,
          draftReply: undefined,
        };
      } else if (text.toLowerCase().includes('reply') || text.toLowerCase().includes('draft')) {
        assistantMsg = {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          text: 'Drafted reply based on note n001:',
          toolCallName: 'draft_reply',
          toolLatencyMs: 65,
          draftReply: {
            subject: 'Re: Q3 Strategy Follow-up & MCP Architecture',
            body: 'Hi team, thanks for the alignment notes. We are on track for the Streamable HTTP rollout on AWS Lambda. Let me know if any questions arise.',
            noteId: 'n001',
          },
        };
      } else if (text.toLowerCase().includes('find') || text.toLowerCase().includes('search')) {
        assistantMsg = {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          text: 'Found 3 matching notes for "launch": [n002] Launch Day Runbook, [n015] Beta Feedback, [n023] Submission Checklist.',
          toolCallName: 'search_notes',
          toolLatencyMs: 32,
        };
      } else {
        assistantMsg = {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          text: 'Found 4 open action items across your team sprint, 1:1, and hackathon notes from the past 7 days:',
          toolCallName: 'extract_tasks',
          toolLatencyMs: 56,
          structuredTasks: INITIAL_MESSAGES[1].structuredTasks,
        };
      }

      setMessages((prev) => [...prev, assistantMsg]);
    }, 250);
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
                  {m.toolLatencyMs && <span>· {m.toolLatencyMs} ms</span>}
                </div>
              )}

              <div>{m.text}</div>

              {m.structuredTasks && (
                <ul className="task-checklist">
                  {m.structuredTasks.map((t, idx) => (
                    <li key={idx} className="task-item">
                      <input type="checkbox" className="task-checkbox" readOnly defaultChecked={false} />
                      <div className="task-info">
                        <div className="task-title">{t.task}</div>
                        <div className="task-meta">
                          {t.owner && <span>👤 {t.owner}</span>}
                          {t.due && <span>📅 Due: {t.due}</span>}
                          {t.sourceNoteId && <span>📝 {t.sourceNoteId}</span>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {m.draftReply && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '10px',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontWeight: 600, color: 'var(--color-cyan)', fontSize: '12px' }}>
                    Subject: {m.draftReply.subject}
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
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
      </div>

      <div className="chat-suggestions">
        {SUGGESTIONS.map((s, idx) => (
          <button
            key={idx}
            className={`suggestion-chip ${s.featured ? 'featured' : ''}`}
            onClick={() => handleSend(s.text)}
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
        />
        <button type="submit" className="chat-send-btn">
          Send
        </button>
      </form>
    </aside>
  );
};
