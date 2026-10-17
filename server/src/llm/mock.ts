import { LLMProvider } from './index.js';

export class MockLLMProvider implements LLMProvider {
  name = 'mock';

  async *summarizeStream(
    text: string,
    style: 'brief' | 'detailed' = 'brief',
    delayMs = 40
  ): AsyncIterable<string> {
    // Extract first 2-3 sentences for brief, or 5-6 for detailed
    const clean = text.replace(/---[\s\S]*?---/, '').trim();
    const sentences = clean
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

    const maxSentences = style === 'detailed' ? 5 : 2;
    const selected = sentences.slice(0, maxSentences).join(' ');
    const summaryText =
      selected.length > 0
        ? selected
        : 'Summary: Routine sync covering operational milestones and action items.';

    // Stream word-by-word or in small chunks
    const words = summaryText.split(' ');
    const chunkSize = Math.max(2, Math.ceil(words.length / 5));

    for (let i = 0; i < words.length; i += chunkSize) {
      const slice = words.slice(i, i + chunkSize).join(' ') + (i + chunkSize < words.length ? ' ' : '');
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
      yield slice;
    }
  }

  async draftReply(
    noteContent: string,
    tone: 'friendly' | 'formal' | 'brief' = 'friendly',
    intent?: string
  ): Promise<{ subject: string; body: string }> {
    const lines = noteContent.split('\n');
    let title = 'Project Update';
    for (const l of lines) {
      if (l.startsWith('# ')) {
        title = l.replace(/^#\s*/, '').trim();
        break;
      }
    }

    let subject = `Re: ${title}`;
    let greeting = 'Hi team,';
    let signoff = 'Best regards,\nPlatform Engineering';

    if (tone === 'formal') {
      greeting = 'Dear Colleagues,';
      signoff = 'Sincerely,\nEngineering Team';
    } else if (tone === 'brief') {
      greeting = 'Team —';
      signoff = 'Thanks.';
    }

    const intentText = intent ? `\nRegarding your note on ${intent}: ` : '\n';

    const body = `${greeting}${intentText}Thank you for sharing the summary on ${title}. We have reviewed the action items and are moving forward with the specified milestones.

Please let us know if any further adjustments are required.

${signoff}`;

    return { subject, body };
  }
}
