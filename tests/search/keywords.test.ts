import { describe, it, expect } from 'vitest';
import { normalizeQuery, extractTopics } from '../../src/search/keywords.js';

describe('normalizeQuery', () => {
  it('should extract keywords from query', () => {
    const keywords = normalizeQuery('authentication flow');
    expect(keywords).toContain('authentication');
    expect(keywords).toContain('flow');
  });

  it('should filter stopwords', () => {
    const keywords = normalizeQuery('how does the user login work?');
    expect(keywords).toContain('user');
    expect(keywords).toContain('login');
    expect(keywords).toContain('work');
    expect(keywords).not.toContain('how');
    expect(keywords).not.toContain('does');
    expect(keywords).not.toContain('the');
  });

  it('should lowercase', () => {
    const keywords = normalizeQuery('Hello WORLD');
    expect(keywords).toContain('hello');
    expect(keywords).toContain('world');
  });

  it('should filter short words', () => {
    const keywords = normalizeQuery('a b c test');
    expect(keywords).not.toContain('a');
    expect(keywords).toContain('test');
  });

  it('should filter pure numbers', () => {
    const keywords = normalizeQuery('version 123');
    expect(keywords).not.toContain('123');
    expect(keywords).toContain('version');
  });

  it('should handle empty string', () => {
    expect(normalizeQuery('')).toEqual([]);
  });
});

describe('extractTopics', () => {
  it('should extract quoted terms', () => {
    const topics = extractTopics('look for "user authentication"');
    expect(topics).toContain('user authentication');
  });

  it('should extract file paths', () => {
    const topics = extractTopics('check src/auth.ts');
    expect(topics).toContain('src/auth.ts');
  });

  it('should extract backtick code', () => {
    const topics = extractTopics('call `getUserById`');
    expect(topics).toContain('getUserById');
  });

  it('should extract camelCase', () => {
    const topics = extractTopics('the handleClick function');
    expect(topics).toContain('handleClick');
  });

  it('should extract PascalCase', () => {
    const topics = extractTopics('the UserProfile component');
    expect(topics).toContain('UserProfile');
  });

  it('should extract ALL_CAPS', () => {
    const topics = extractTopics('check the API endpoint');
    expect(topics).toContain('API');
  });

  it('should include regular keywords', () => {
    const topics = extractTopics('authentication flow');
    expect(topics).toContain('authentication');
    expect(topics).toContain('flow');
  });

  it('should deduplicate', () => {
    const topics = extractTopics('auth auth auth');
    const authCount = topics.filter(t => t === 'auth').length;
    expect(authCount).toBe(1);
  });
});
