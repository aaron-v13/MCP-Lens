import fs from 'fs';
import path from 'path';

const CORPUS_DIR = path.resolve(process.cwd(), 'corpus');

if (!fs.existsSync(CORPUS_DIR)) {
  fs.mkdirSync(CORPUS_DIR, { recursive: true });
}

// README
fs.writeFileSync(
  path.join(CORPUS_DIR, 'README.md'),
  `# Seeded Notes Corpus

> **Notice:** Seeded sample data, fictional people and companies.
This dataset is designed for testing the MCP Lens server action item extraction, BM25 keyword search, summary streaming, and draft reply workflows.
Reference date (\`CORPUS_NOW\`): 2026-10-21.
`
);

interface NoteTemplate {
  id: string;
  title: string;
  date: string;
  tags: string[];
  body: string;
}

const NOTES: NoteTemplate[] = [
  {
    id: 'n001',
    title: 'Q3 Product Strategy Alignment',
    date: '2026-10-18',
    tags: ['strategy', 'product', 'executive'],
    body: `We aligned on the primary deliverables for the upcoming quarter. The primary objective is establishing an open, inspectable protocol infrastructure.
Key decisions made:
1. Target AWS Lambda Function URLs with Streamable HTTP to maintain serverless flexibility.
2. Standardize on the 2025-11-25 MCP specification revision.
3. Ensure the developer experience is frictionless with sub-100ms local dev turnaround.

Action: @sarah to finalize the Devpost demo video storyboard script by due: 2026-10-22.
- [ ] @marcus setup automated integration tests against the Lambda streaming endpoint due: 2026-10-21.
TODO: review initial benchmark metrics with dev lead.`,
  },
  {
    id: 'n002',
    title: 'Hackathon Submission Readiness Review',
    date: '2026-10-20',
    tags: ['hackathon', 'submission', 'alexa'],
    body: `Comprehensive checklist review for our Amazon Developer Hackathon submission. The judges will evaluate how well the MCP lifecycle is visualized and how authentically the protocol flows.
We tested the Alexa+ simulated conversational surface against our 4 tools: search_notes, summarize, extract_tasks, and draft_reply.

- [ ] @alex coordinate final screen recording session due: 2026-10-22
- [ ] @elena verify MIT license and clear documentation in README due: 2026-10-21
Action: @security check that token redaction in all client wire logs is 100% airtight due: 2026-10-21.`,
  },
  {
    id: 'n003',
    title: 'Streamable HTTP SSE Architecture Review',
    date: '2026-10-17',
    tags: ['architecture', 'protocol', 'mcp'],
    body: `Deep dive into Streamable HTTP versus legacy HTTP+SSE transports. With Streamable HTTP, all requests route to a single endpoint. Server-Sent Events allow progress notifications to stream incremental tokens back to the caller while the JSON-RPC call is still active.

- [ ] @devlead review PR #128 for Streamable HTTP SSE parser due: 2026-10-21
TODO: document the buffer-bypassing technique for AWS Lambda response streaming.`,
  },
  {
    id: 'n004',
    title: '1:1 Sync with Platform Engineering',
    date: '2026-10-19',
    tags: ['1-on-1', 'management', 'engineering'],
    body: `Discussed career development, sprint velocity, and technical hurdles with the cloud infrastructure. Overall satisfaction is high with the TypeScript SDK adoption.

Action: @kevin document the cold start mitigation benchmarks due: 2026-10-22.
- [ ] @rachel approve the production staging IAM policies due: 2026-10-20.`,
  },
  {
    id: 'n005',
    title: 'Incident Postmortem: Stale Cache Invalidation',
    date: '2026-10-15',
    tags: ['postmortem', 'infra', 'cache'],
    body: `On Oct 14 at 14:22 UTC, stale search index caches resulted in transient 404 responses for newly seeded markdown notes. The root cause was an asynchronous race condition during filesystem watching.

- [ ] @devops update cache invalidation TTL to 0 in local dev mode due: 2026-10-20
Action: @alex audit cache key hashing across multi-node instances.`,
  },
  {
    id: 'n006',
    title: 'Client Integration Meeting with Acme Labs',
    date: '2026-10-16',
    tags: ['client', 'partnership', 'external'],
    body: `Met with Acme Labs product team to review their requirements for custom MCP tool integrations. They expressed strong interest in our deterministic action item extraction.

- [ ] @sarah draft enterprise pilot proposal letter due: 2026-10-22
TODO: @jason send updated OpenAPI and JSON schema definitions to Acme.`,
  },
  {
    id: 'n007',
    title: 'UI Shell & Dark Theme Polish Notes',
    date: '2026-10-18',
    tags: ['frontend', 'design', 'ui'],
    body: `Refined the dark theme styling for 1080p screen recording readability. High contrast monospace fonts were applied to all timestamps, JSON-RPC method pills, and latency badges.

- [ ] @designer create high-res diagram assets for the Devpost gallery due: 2026-10-22
- [ ] @frontend test keyboard navigation (Esc to close raw JSON drawer) due: 2026-10-19`,
  },
  {
    id: 'n008',
    title: 'Token Security & Redaction Guidelines',
    date: '2026-10-14',
    tags: ['security', 'compliance'],
    body: `Audit of bearer authentication handling. The client wire-tap must intercept outgoing HTTP requests and redact the Authorization header to 'Bearer ••••' before storing or displaying the event in the UI.

Action: @security run git grep to ensure zero sensitive tokens exist in repo due: 2026-10-21.`,
  },
  {
    id: 'n009',
    title: 'BM25 Search Algorithm Optimization',
    date: '2026-10-15',
    tags: ['search', 'algorithms', 'performance'],
    body: `Evaluating search retrieval algorithms for notes under 1000 words. Pure TypeScript BM25 provides deterministic, fast results without external vector database dependencies.

- [ ] @backend benchmark search latency across 100 synthetic queries due: 2026-10-20`,
  },
  {
    id: 'n010',
    title: 'Alexa+ Voice Track Alignment Call',
    date: '2026-10-19',
    tags: ['alexa', 'voice', 'hackathon'],
    body: `Reviewed expectations for the Alexa+ conversational interface track. Simulated conversational surfaces are explicitly permitted as long as the underlying MCP traffic is real and honest.

Action: @sarah ensure conversational chips reflect natural user voice queries due: 2026-10-22.`,
  },
];

// Generate 40 additional realistic notes to reach 50 notes
const TOPICS = [
  { title: 'Frontend Build Optimization', tag: 'build', category: 'engineering' },
  { title: 'Database Migration Strategy', tag: 'database', category: 'backend' },
  { title: 'Team Retrospective Sprint 41', tag: 'agile', category: 'process' },
  { title: 'Weekly Cloud Cost Analysis', tag: 'finops', category: 'cloud' },
  { title: 'Customer Feedback Round 3', tag: 'feedback', category: 'product' },
  { title: 'Design System Typography Guidelines', tag: 'design', category: 'frontend' },
  { title: 'API Rate Limiting Architecture', tag: 'api', category: 'architecture' },
  { title: 'New Hire Onboarding Plan', tag: 'hr', category: 'management' },
  { title: 'Mobile Responsiveness Checklist', tag: 'mobile', category: 'frontend' },
  { title: 'Continuous Deployment Pipeline Health', tag: 'ci-cd', category: 'devops' },
];

for (let i = 11; i <= 50; i++) {
  const padId = `n${String(i).padStart(3, '0')}`;
  const topic = TOPICS[(i - 11) % TOPICS.length];
  
  // Date strictly between 2026-09-20 and 2026-10-20
  // dayOffset 0 to 28
  const dayOffset = (i * 7) % 28; 
  const noteDate = new Date('2026-09-20T12:00:00Z');
  noteDate.setUTCDate(noteDate.getUTCDate() + dayOffset);
  const dateStr = noteDate.toISOString().slice(0, 10);

  const hasActionItem = i % 2 === 0; // ~20 more notes have action items
  const actionText = hasActionItem
    ? `\n- [ ] @team_${i} follow up on ${topic.title.toLowerCase()} action points due: ${dateStr}\nTODO: review outcomes with stakeholders.`
    : '\nAll discussion points were noted and filed for documentation purposes.';

  NOTES.push({
    id: padId,
    title: `${topic.title} Part ${Math.floor(i / 10) + 1}`,
    date: dateStr,
    tags: [topic.tag, topic.category, 'notes'],
    body: `Detailed notes regarding ${topic.title.toLowerCase()} during our routine sync.
We evaluated historical metrics, common bottlenecks, and long-term architectural stability.
Key discussion points:
1. Ensuring modularity across all distributed components.
2. Maintaining strict schema validation for cross-boundary communication.
3. Keeping documentation synchronized with production releases.
${actionText}
Meeting concluded smoothly with general agreement on next milestones.`,
  });
}

// Write all notes
for (const note of NOTES) {
  const fileContent = `---
id: "${note.id}"
title: "${note.title}"
date: "${note.date}"
tags: [${note.tags.map((t) => `"${t}"`).join(', ')}]
---

# ${note.title}

${note.body}
`;

  fs.writeFileSync(path.join(CORPUS_DIR, `${note.id}.md`), fileContent, 'utf-8');
}

console.log(`Generated ${NOTES.length} notes in ${CORPUS_DIR}`);
