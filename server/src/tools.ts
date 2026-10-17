import { z } from 'zod';
import {
  loadCorpus,
  findNoteById,
  searchNotes,
  extractTasksFromNotes,
  NoteItem,
} from './corpus.js';
import { getLLMProvider } from './llm/index.js';

export interface ToolDefinitionInfo {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

export const TOOLS_DEFINITIONS: ToolDefinitionInfo[] = [
  {
    name: 'search_notes',
    description: 'Search markdown notes using BM25-style keyword ranking across titles, body, and tags.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords or phrases' },
        limit: { type: 'integer', description: 'Maximum results to return (1-10, default 5)', minimum: 1, maximum: 10 },
      },
      required: ['query'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              noteId: { type: 'string' },
              title: { type: 'string' },
              date: { type: 'string' },
              snippet: { type: 'string' },
              score: { type: 'number' },
            },
            required: ['noteId', 'title', 'date', 'snippet', 'score'],
          },
        },
        meta: { type: 'object' },
      },
      required: ['results', 'meta'],
    },
  },
  {
    name: 'summarize',
    description: 'Summarize a specific note or search query with incremental streamed chunks.',
    inputSchema: {
      type: 'object',
      properties: {
        noteId: { type: 'string', description: 'Target note ID (e.g. n001)' },
        query: { type: 'string', description: 'Query to summarize across notes' },
        style: { type: 'string', enum: ['brief', 'detailed'], description: 'Summary detail level' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        sources: { type: 'array', items: { type: 'string' } },
        style: { type: 'string' },
        meta: { type: 'object' },
      },
      required: ['summary', 'sources', 'style', 'meta'],
    },
  },
  {
    name: 'extract_tasks',
    description: 'Deterministic extraction of open action items, TODOs, due dates, and assignees from notes.',
    inputSchema: {
      type: 'object',
      properties: {
        noteId: { type: 'string', description: 'Extract from specific note' },
        query: { type: 'string', description: 'Filter tasks by keyword or topic' },
        sinceDays: { type: 'integer', description: 'Lookback window in days (1-60) from reference date', minimum: 1, maximum: 60 },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              task: { type: 'string' },
              owner: { type: 'string' },
              due: { type: 'string' },
              sourceNoteId: { type: 'string' },
              sourceTitle: { type: 'string' },
            },
            required: ['task', 'sourceNoteId', 'sourceTitle'],
          },
        },
        count: { type: 'integer' },
        meta: { type: 'object' },
      },
      required: ['tasks', 'count', 'meta'],
    },
  },
  {
    name: 'draft_reply',
    description: 'Draft a contextual reply to an email or meeting thread note.',
    inputSchema: {
      type: 'object',
      properties: {
        noteId: { type: 'string', description: 'Note ID to reply to' },
        tone: { type: 'string', enum: ['friendly', 'formal', 'brief'], description: 'Draft tone' },
        intent: { type: 'string', description: 'Goal or key points to include in reply' },
      },
      required: ['noteId'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        body: { type: 'string' },
        noteId: { type: 'string' },
        meta: { type: 'object' },
      },
      required: ['subject', 'body', 'noteId', 'meta'],
    },
  },
];

// Zod schemas for validation
const SearchNotesInput = z.object({
  query: z.string().min(1, 'query is required'),
  limit: z.number().int().min(1).max(10).optional().default(5),
});

const SummarizeInput = z.object({
  noteId: z.string().optional(),
  query: z.string().optional(),
  style: z.enum(['brief', 'detailed']).optional().default('brief'),
}).refine((data) => (data.noteId && !data.query) || (!data.noteId && data.query), {
  message: 'Exactly one of noteId or query must be provided',
});

const ExtractTasksInput = z.object({
  noteId: z.string().optional(),
  query: z.string().optional(),
  sinceDays: z.number().int().min(1).max(60).optional(),
});

const DraftReplyInput = z.object({
  noteId: z.string().min(1, 'noteId is required'),
  tone: z.enum(['friendly', 'formal', 'brief']).optional().default('friendly'),
  intent: z.string().optional(),
});

export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export type ProgressCallback = (progress: number, total: number, message: string) => Promise<void>;

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  onProgress?: ProgressCallback,
  corpusDir?: string
): Promise<ToolResult> {
  const notes = loadCorpus(corpusDir);
  const llm = getLLMProvider();
  const metaBase = {
    llm: llm.name,
    corpus: 'seeded-sample-data',
  };

  switch (name) {
    case 'search_notes': {
      const parsed = SearchNotesInput.parse(args);
      const results = searchNotes(parsed.query, parsed.limit, notes);
      const structuredContent = {
        results,
        meta: metaBase,
      };
      const text = results.length > 0
        ? `Found ${results.length} note(s) matching "${parsed.query}":\n` +
          results.map((r) => `- [${r.noteId}] ${r.title} (${r.date}): ${r.snippet}`).join('\n')
        : `No notes found matching "${parsed.query}".`;

      return {
        content: [{ type: 'text', text }],
        structuredContent,
      };
    }

    case 'summarize': {
      const parsed = SummarizeInput.parse(args);
      let targetText = '';
      let sources: string[] = [];

      if (parsed.noteId) {
        const note = findNoteById(parsed.noteId, notes);
        if (!note) {
          return {
            content: [{ type: 'text', text: `Note not found: "${parsed.noteId}" does not exist in the corpus.` }],
            isError: true,
          };
        }
        targetText = `# ${note.title}\n\n${note.body}`;
        sources = [note.id];
      } else if (parsed.query) {
        const found = searchNotes(parsed.query, 3, notes);
        if (found.length === 0) {
          return {
            content: [{ type: 'text', text: `No notes found matching query "${parsed.query}" to summarize.` }],
            isError: true,
          };
        }
        sources = found.map((f) => f.noteId);
        targetText = found
          .map((f) => {
            const note = findNoteById(f.noteId, notes)!;
            return `# ${note.title}\n\n${note.body}`;
          })
          .join('\n\n---\n\n');
      }

      // Stream incremental chunks via onProgress
      let accumulated = '';
      const stream = llm.summarizeStream(targetText, parsed.style, 40);
      let chunkIdx = 0;
      const chunks: string[] = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
        accumulated += chunk;
        chunkIdx++;
        if (onProgress) {
          await onProgress(chunkIdx * 20, 100, chunk);
        }
      }

      const structuredContent = {
        summary: accumulated.trim(),
        sources,
        style: parsed.style,
        meta: metaBase,
      };

      return {
        content: [{ type: 'text', text: accumulated.trim() }],
        structuredContent,
      };
    }

    case 'extract_tasks': {
      const parsed = ExtractTasksInput.parse(args);
      if (parsed.noteId) {
        const note = findNoteById(parsed.noteId, notes);
        if (!note) {
          return {
            content: [{ type: 'text', text: `Note not found: "${parsed.noteId}" does not exist in the corpus.` }],
            isError: true,
          };
        }
      }

      const tasks = extractTasksFromNotes(notes, {
        noteId: parsed.noteId,
        query: parsed.query,
        sinceDays: parsed.sinceDays,
      });

      const structuredContent = {
        tasks,
        count: tasks.length,
        meta: {
          ...metaBase,
          sinceDays: parsed.sinceDays,
          referenceDate: process.env.CORPUS_NOW || '2026-10-21',
        },
      };

      const text = tasks.length > 0
        ? `Extracted ${tasks.length} open task(s):\n` +
          tasks
            .map((t) => `- [ ] ${t.task}${t.owner ? ` (@${t.owner})` : ''}${t.due ? ` (due: ${t.due})` : ''} [${t.sourceNoteId}: ${t.sourceTitle}]`)
            .join('\n')
        : 'No open tasks found matching the criteria.';

      return {
        content: [{ type: 'text', text }],
        structuredContent,
      };
    }

    case 'draft_reply': {
      const parsed = DraftReplyInput.parse(args);
      const note = findNoteById(parsed.noteId, notes);
      if (!note) {
        return {
          content: [{ type: 'text', text: `Note not found: "${parsed.noteId}" does not exist in the corpus.` }],
          isError: true,
        };
      }

      const draft = await llm.draftReply(note.body, parsed.tone, parsed.intent);
      const structuredContent = {
        subject: draft.subject,
        body: draft.body,
        noteId: note.id,
        meta: metaBase,
      };

      const text = `Subject: ${draft.subject}\n\n${draft.body}`;

      return {
        content: [{ type: 'text', text }],
        structuredContent,
      };
    }

    default:
      throw new Error(`Method not found: tool "${name}" is not registered on this server.`);
  }
}
