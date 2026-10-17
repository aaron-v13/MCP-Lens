export interface RoutedIntent {
  tool: 'search_notes' | 'summarize' | 'extract_tasks' | 'draft_reply' | 'help';
  args: Record<string, unknown>;
  confidence: number;
}

export function routeUserIntent(input: string, context?: { lastSearchNoteId?: string }): RoutedIntent {
  const query = input.trim();
  const lower = query.toLowerCase();

  // 1. Action items / tasks / TODOs
  if (/(action\s*item|task|to-?do|follow\s*up)/i.test(lower)) {
    let sinceDays = 7;
    const daysMatch = lower.match(/(?:past|last)\s+(\d+)\s+days?/i);
    if (daysMatch) {
      sinceDays = parseInt(daysMatch[1], 10);
    } else if (lower.includes('last week') || lower.includes('this week') || lower.includes('recent')) {
      sinceDays = 7;
    } else if (lower.includes('month') || lower.includes('30 days')) {
      sinceDays = 30;
    }

    const noteIdMatch = lower.match(/n\d{3}/i);
    const noteId = noteIdMatch ? noteIdMatch[0].toLowerCase() : undefined;

    return {
      tool: 'extract_tasks',
      args: {
        sinceDays,
        noteId,
      },
      confidence: 0.95,
    };
  }

  // 2. Summarize
  if (/summar/i.test(lower)) {
    const noteIdMatch = lower.match(/n\d{3}/i);
    const noteId = noteIdMatch ? noteIdMatch[0].toLowerCase() : context?.lastSearchNoteId || 'n001';
    const style = lower.includes('detail') ? 'detailed' : 'brief';

    return {
      tool: 'summarize',
      args: {
        noteId,
        style,
      },
      confidence: 0.9,
    };
  }

  // 3. Draft reply / respond / response / write back
  if (/(reply|respond|response|draft|write\s*back)/i.test(lower)) {
    const noteIdMatch = lower.match(/n\d{3}/i);
    const noteId = noteIdMatch ? noteIdMatch[0].toLowerCase() : context?.lastSearchNoteId || 'n001';

    let tone: 'friendly' | 'formal' | 'brief' = 'friendly';
    if (lower.includes('formal') || lower.includes('official')) tone = 'formal';
    if (lower.includes('brief') || lower.includes('short')) tone = 'brief';

    return {
      tool: 'draft_reply',
      args: {
        noteId,
        tone,
      },
      confidence: 0.9,
    };
  }

  // 4. Search / find / look up / notes about / what did we
  if (/(find|search|look\s*up|notes?\s*about|what\s*did\s*we)/i.test(lower)) {
    // Extract search query
    let cleaned = lower
      .replace(/^(please\s+)?(can\s+you\s+)?(find|search|look\s*up)(\s+(for|about))?(\s+notes?)?(\s+(about|for|on))?\s*/i, '')
      .replace(/^notes?\s*(about|for|on)?\s*/i, '')
      .replace(/^what\s*did\s*we\s*(discuss|say|decide)?\s*(about|for|on)?\s*/i, '')
      .replace(/[?!.]+$/, '')
      .trim();

    if (!cleaned) cleaned = 'notes';

    return {
      tool: 'search_notes',
      args: {
        query: cleaned,
        limit: 5,
      },
      confidence: 0.85,
    };
  }

  // 5. Default help
  return {
    tool: 'help',
    args: {},
    confidence: 0.5,
  };
}
