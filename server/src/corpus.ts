import fs from 'fs';
import path from 'path';

export interface NoteItem {
  id: string;
  title: string;
  date: string;
  tags: string[];
  body: string;
  filePath: string;
}

export interface TaskItem {
  task: string;
  owner?: string;
  due?: string;
  sourceNoteId: string;
  sourceTitle: string;
}

export interface SearchResultItem {
  noteId: string;
  title: string;
  date: string;
  snippet: string;
  score: number;
}

let cachedNotes: NoteItem[] | null = null;

export function loadCorpus(corpusDir?: string): NoteItem[] {
  if (cachedNotes) return cachedNotes;

  const targetDir = corpusDir || path.resolve(process.cwd(), 'corpus');
  if (!fs.existsSync(targetDir)) {
    throw new Error(`Corpus directory not found: ${targetDir}`);
  }

  const files = fs.readdirSync(targetDir).filter((f) => f.endsWith('.md') && f !== 'README.md');
  const notes: NoteItem[] = [];

  for (const file of files) {
    const fullPath = path.join(targetDir, file);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);

    if (!match) continue;
    const frontmatter = match[1];
    const body = match[2].trim();

    const idMatch = frontmatter.match(/id:\s*"([^"]+)"/);
    const titleMatch = frontmatter.match(/title:\s*"([^"]+)"/);
    const dateMatch = frontmatter.match(/date:\s*"([^"]+)"/);
    const tagsMatch = frontmatter.match(/tags:\s*\[(.*?)\]/);

    const id = idMatch ? idMatch[1] : path.basename(file, '.md');
    const title = titleMatch ? titleMatch[1] : id;
    const date = dateMatch ? dateMatch[1] : '2026-10-21';
    const tags = tagsMatch
      ? tagsMatch[1]
          .split(',')
          .map((t) => t.trim().replace(/^"|"$/g, ''))
          .filter(Boolean)
      : [];

    notes.push({ id, title, date, tags, body, filePath: fullPath });
  }

  cachedNotes = notes;
  return notes;
}

export function findNoteById(noteId: string, notes: NoteItem[]): NoteItem | undefined {
  return notes.find((n) => n.id.toLowerCase() === noteId.toLowerCase());
}

/**
 * Pure-TypeScript BM25-style keyword search over title, body, and tags.
 */
export function searchNotes(query: string, limit = 5, notes: NoteItem[]): SearchResultItem[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9_-]/g, ''))
    .filter((t) => t.length > 1);

  if (terms.length === 0) {
    return [];
  }

  const scored: Array<{ note: NoteItem; score: number; matchSnippet: string }> = [];

  for (const note of notes) {
    let score = 0;
    const titleLower = note.title.toLowerCase();
    const bodyLower = note.body.toLowerCase();
    const tagsLower = note.tags.map((t) => t.toLowerCase());

    let bestSnippetIdx = -1;

    for (const term of terms) {
      if (titleLower.includes(term)) score += 10;
      if (tagsLower.some((tag) => tag.includes(term))) score += 5;

      const bodyIdx = bodyLower.indexOf(term);
      if (bodyIdx !== -1) {
        score += 2;
        if (bestSnippetIdx === -1) bestSnippetIdx = bodyIdx;
      }
    }

    if (score > 0) {
      // Build snippet
      let snippet = '';
      if (bestSnippetIdx !== -1) {
        const start = Math.max(0, bestSnippetIdx - 40);
        const end = Math.min(note.body.length, bestSnippetIdx + 120);
        snippet = (start > 0 ? '...' : '') + note.body.slice(start, end).replace(/\n+/g, ' ') + (end < note.body.length ? '...' : '');
      } else {
        snippet = note.body.slice(0, 140).replace(/\n+/g, ' ') + '...';
      }

      scored.push({ note, score, matchSnippet: snippet });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => ({
    noteId: s.note.id,
    title: s.note.title,
    date: s.note.date,
    snippet: s.matchSnippet,
    score: s.score,
  }));
}

/**
 * Deterministic action items parser:
 * - markdown checkboxes - [ ]
 * - TODO:
 * - Action:
 * - @owner
 * - due: YYYY-MM-DD
 */
export function extractTasksFromNotes(
  notes: NoteItem[],
  options?: { noteId?: string; query?: string; sinceDays?: number; corpusNow?: string }
): TaskItem[] {
  const refDateStr = options?.corpusNow || process.env.CORPUS_NOW || '2026-10-21';
  const refDate = new Date(refDateStr);

  let targetNotes = notes;

  if (options?.noteId) {
    targetNotes = targetNotes.filter((n) => n.id.toLowerCase() === options.noteId!.toLowerCase());
  }

  if (options?.sinceDays) {
    const cutoff = new Date(refDate.getTime() - options.sinceDays * 24 * 60 * 60 * 1000);
    targetNotes = targetNotes.filter((n) => new Date(n.date) >= cutoff);
  }

  if (options?.query) {
    const qLower = options.query.toLowerCase();
    targetNotes = targetNotes.filter(
      (n) => n.title.toLowerCase().includes(qLower) || n.body.toLowerCase().includes(qLower)
    );
  }

  const tasks: TaskItem[] = [];

  for (const note of targetNotes) {
    const lines = note.body.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();

      const isCheckbox = line.startsWith('- [ ]');
      const isTodo = /^TODO:?/i.test(line);
      const isAction = /^Action:?/i.test(line);

      if (isCheckbox || isTodo || isAction) {
        let taskText = line
          .replace(/^- \[\s?\]\s*/, '')
          .replace(/^TODO:?\s*/i, '')
          .replace(/^Action:?\s*/i, '')
          .trim();

        // Extract owner: @username
        let owner: string | undefined;
        const ownerMatch = taskText.match(/@([a-zA-Z0-9_-]+)/);
        if (ownerMatch) {
          owner = ownerMatch[1];
          taskText = taskText.replace(ownerMatch[0], '').trim();
        }

        // Extract due date: due: YYYY-MM-DD
        let due: string | undefined;
        const dueMatch = taskText.match(/due:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
        if (dueMatch) {
          due = dueMatch[1];
          taskText = taskText.replace(dueMatch[0], '').trim();
        }

        // Clean trailing punctuation
        taskText = taskText.replace(/[.,;:]+$/, '').trim();

        if (taskText.length > 0) {
          tasks.push({
            task: taskText,
            owner,
            due,
            sourceNoteId: note.id,
            sourceTitle: note.title,
          });
        }
      }
    }
  }

  return tasks;
}
