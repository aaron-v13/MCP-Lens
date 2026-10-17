import { describe, it, expect } from 'vitest';
import { routeUserIntent } from './router';

describe('Deterministic Intent Router (Alexa+ Simulated Surface)', () => {
  it('routes "What are my open action items from last week\'s notes?" to extract_tasks', () => {
    const route = routeUserIntent("What are my open action items from last week's notes?");
    expect(route.tool).toBe('extract_tasks');
    expect(route.args.sinceDays).toBe(7);
  });

  it('routes "Show me todos from the past 14 days" to extract_tasks with sinceDays: 14', () => {
    const route = routeUserIntent('Show me todos from the past 14 days');
    expect(route.tool).toBe('extract_tasks');
    expect(route.args.sinceDays).toBe(14);
  });

  it('routes "Any follow up tasks in note n014?" to extract_tasks for n014', () => {
    const route = routeUserIntent('Any follow up tasks in note n014?');
    expect(route.tool).toBe('extract_tasks');
    expect(route.args.noteId).toBe('n014');
  });

  it('routes "Summarize note n001" to summarize with brief style', () => {
    const route = routeUserIntent('Summarize note n001');
    expect(route.tool).toBe('summarize');
    expect(route.args.noteId).toBe('n001');
    expect(route.args.style).toBe('brief');
  });

  it('routes "Can you provide a detailed summary of note n003?" to summarize with detailed style', () => {
    const route = routeUserIntent('Can you provide a detailed summary of note n003?');
    expect(route.tool).toBe('summarize');
    expect(route.args.noteId).toBe('n003');
    expect(route.args.style).toBe('detailed');
  });

  it('routes "Draft a reply to note n001" to draft_reply with friendly default', () => {
    const route = routeUserIntent('Draft a reply to note n001');
    expect(route.tool).toBe('draft_reply');
    expect(route.args.noteId).toBe('n001');
    expect(route.args.tone).toBe('friendly');
  });

  it('routes "Write back a formal response to n002" to draft_reply with formal tone', () => {
    const route = routeUserIntent('Write back a formal response to n002');
    expect(route.tool).toBe('draft_reply');
    expect(route.args.noteId).toBe('n002');
    expect(route.args.tone).toBe('formal');
  });

  it('routes "Send a brief response to n005" to draft_reply with brief tone', () => {
    const route = routeUserIntent('Send a brief response to n005');
    expect(route.tool).toBe('draft_reply');
    expect(route.args.noteId).toBe('n005');
    expect(route.args.tone).toBe('brief');
  });

  it('routes "Find notes about launch" to search_notes with query: launch', () => {
    const route = routeUserIntent('Find notes about launch');
    expect(route.tool).toBe('search_notes');
    expect(route.args.query).toBe('launch');
  });

  it('routes "Search for notes about architecture" to search_notes with query: architecture', () => {
    const route = routeUserIntent('Search for notes about architecture');
    expect(route.tool).toBe('search_notes');
    expect(route.args.query).toBe('architecture');
  });

  it('routes "What did we decide about caching?" to search_notes with query: caching', () => {
    const route = routeUserIntent('What did we decide about caching?');
    expect(route.tool).toBe('search_notes');
    expect(route.args.query).toContain('caching');
  });

  it('routes unknown greeting "Hello good morning" to help', () => {
    const route = routeUserIntent('Hello good morning');
    expect(route.tool).toBe('help');
  });
});
