export interface LLMProvider {
  name: string;
  summarizeStream(
    text: string,
    style?: 'brief' | 'detailed',
    delayMs?: number
  ): AsyncIterable<string>;
  draftReply(
    noteContent: string,
    tone?: 'friendly' | 'formal' | 'brief',
    intent?: string
  ): Promise<{ subject: string; body: string }>;
}

export function getLLMProvider(providerName?: string): LLMProvider {
  const chosen = (providerName || process.env.LLM_PROVIDER || 'mock').toLowerCase();
  // By default, return deterministic offline MockProvider
  // Other providers can be registered or configured in Phase A4
  return new MockLLMProvider();
}

import { MockLLMProvider } from './mock.js';
