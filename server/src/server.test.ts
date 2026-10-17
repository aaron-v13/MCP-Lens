import { describe, it, expect, beforeAll } from 'vitest';
import { executeTool } from './tools.js';
import { loadCorpus } from './corpus.js';

describe('MCP Lens Server Tools & Logic', () => {
  beforeAll(() => {
    loadCorpus();
  });

  it('search_notes returns matched notes with scores', async () => {
    const result = await executeTool('search_notes', { query: 'strategy' });
    expect(result.content[0].text).toContain('Found');
    expect(result.structuredContent).toBeDefined();
    expect((result.structuredContent?.results as any[]).length).toBeGreaterThan(0);
    expect(result.structuredContent?.meta).toMatchObject({
      corpus: 'seeded-sample-data',
    });
  });

  it('extract_tasks returns open tasks for past 7 days', async () => {
    const result = await executeTool('extract_tasks', { sinceDays: 7 });
    expect(result.structuredContent).toBeDefined();
    const tasks = result.structuredContent?.tasks as any[];
    expect(tasks).toBeInstanceOf(Array);
    expect(tasks.length).toBeGreaterThanOrEqual(8);
    expect(tasks[0]).toHaveProperty('task');
    expect(tasks[0]).toHaveProperty('sourceNoteId');
  });

  it('summarize streams incremental chunks and provides final summary', async () => {
    const chunks: string[] = [];
    const onProgress = async (_progress: number, _total: number, message: string) => {
      chunks.push(message);
    };

    const result = await executeTool('summarize', { noteId: 'n001' }, onProgress);
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(result.content[0].text.length).toBeGreaterThan(10);
    expect(result.structuredContent?.sources).toContain('n001');
  });

  it('draft_reply creates contextual email draft', async () => {
    const result = await executeTool('draft_reply', { noteId: 'n001', tone: 'formal' });
    expect(result.structuredContent).toBeDefined();
    expect(result.structuredContent?.subject).toContain('Re:');
    expect(result.content[0].text).toContain('Subject:');
  });

  it('returns tool error (isError: true) for unknown noteId', async () => {
    const result = await executeTool('summarize', { noteId: 'n999-invalid' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Note not found');
  });
});
