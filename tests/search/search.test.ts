import { describe, it, expect } from 'vitest';
import { searchSections } from '../../src/search/index.js';
import type { ProjectIndex } from '../../src/types.js';

// Helper to create a test index
function createTestIndex(files: Array<{
  path: string;
  sections: Array<{
    title: string;
    preview: string;
    keywords: string[];
    tokens?: number;
  }>;
}>): ProjectIndex {
  return {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    files: files.map(f => ({
      path: f.path,
      mtime: new Date().toISOString(),
      hash: 'test-hash',
      sections: f.sections.map(s => ({
        title: s.title,
        lineStart: 1,
        lineEnd: 10,
        preview: s.preview,
        tokens: s.tokens ?? 100,
        keywords: s.keywords,
      })),
    })),
  };
}

describe('searchSections', () => {
  describe('basic search', () => {
    it('should find sections matching query keywords', () => {
      const index = createTestIndex([
        {
          path: 'auth.md',
          sections: [
            { title: 'Authentication', preview: 'User auth flow', keywords: ['authentication', 'user', 'flow'] },
          ],
        },
        {
          path: 'other.md',
          sections: [
            { title: 'Database', preview: 'DB config', keywords: ['database', 'config'] },
          ],
        },
      ]);

      const results = searchSections(index, 'authentication');

      expect(results).toHaveLength(1);
      expect(results[0].file).toBe('auth.md');
      expect(results[0].section.title).toBe('Authentication');
    });

    it('should return empty array for no matches', () => {
      const index = createTestIndex([
        {
          path: 'auth.md',
          sections: [
            { title: 'Authentication', preview: 'Login flow', keywords: ['authentication', 'login'] },
          ],
        },
      ]);

      const results = searchSections(index, 'database');

      expect(results).toHaveLength(0);
    });

    it('should return empty array for empty query', () => {
      const index = createTestIndex([
        {
          path: 'auth.md',
          sections: [
            { title: 'Auth', preview: 'Content', keywords: ['auth'] },
          ],
        },
      ]);

      const results = searchSections(index, '');

      expect(results).toHaveLength(0);
    });

    it('should return empty array for stopwords-only query', () => {
      const index = createTestIndex([
        {
          path: 'auth.md',
          sections: [
            { title: 'Auth', preview: 'Content', keywords: ['auth'] },
          ],
        },
      ]);

      const results = searchSections(index, 'the is a');

      expect(results).toHaveLength(0);
    });
  });

  describe('scoring', () => {
    it('should rank title matches higher than keyword matches', () => {
      const index = createTestIndex([
        {
          path: 'file1.md',
          sections: [
            { title: 'Other Topic', preview: 'some content', keywords: ['other'] },
          ],
        },
        {
          path: 'file2.md',
          sections: [
            { title: 'Authentication Guide', preview: 'some content', keywords: ['guide'] },
          ],
        },
      ]);

      const results = searchSections(index, 'authentication');

      expect(results).toHaveLength(1);
      expect(results[0].section.title).toBe('Authentication Guide');
    });

    it('should score multiple keyword matches higher', () => {
      const index = createTestIndex([
        {
          path: 'file1.md',
          sections: [
            { title: 'Single Match', preview: 'user info', keywords: ['user'] },
          ],
        },
        {
          path: 'file2.md',
          sections: [
            { title: 'Multiple Matches', preview: 'user login auth', keywords: ['user', 'login', 'authentication'] },
          ],
        },
      ]);

      const results = searchSections(index, 'user login');

      expect(results).toHaveLength(2);
      expect(results[0].section.title).toBe('Multiple Matches');
    });

    it('should combine title and keyword scores', () => {
      const index = createTestIndex([
        {
          path: 'file1.md',
          sections: [
            { title: 'User Guide', preview: 'how to use', keywords: ['guide', 'tutorial'] },
          ],
        },
        {
          path: 'file2.md',
          sections: [
            { title: 'User Authentication', preview: 'login flow', keywords: ['user', 'login', 'authentication'] },
          ],
        },
      ]);

      const results = searchSections(index, 'user authentication');

      expect(results).toHaveLength(2);
      // File2 should rank higher (title + keyword match)
      expect(results[0].section.title).toBe('User Authentication');
    });
  });

  describe('options', () => {
    it('should respect maxResults option', () => {
      const index = createTestIndex([
        { path: 'f1.md', sections: [{ title: 'Test 1', preview: 'test', keywords: ['test'] }] },
        { path: 'f2.md', sections: [{ title: 'Test 2', preview: 'test', keywords: ['test'] }] },
        { path: 'f3.md', sections: [{ title: 'Test 3', preview: 'test', keywords: ['test'] }] },
        { path: 'f4.md', sections: [{ title: 'Test 4', preview: 'test', keywords: ['test'] }] },
        { path: 'f5.md', sections: [{ title: 'Test 5', preview: 'test', keywords: ['test'] }] },
      ]);

      const results = searchSections(index, 'test', { maxResults: 3 });

      expect(results).toHaveLength(3);
    });
  });

  describe('multi-word queries', () => {
    it('should match any keyword from query', () => {
      const index = createTestIndex([
        {
          path: 'auth.md',
          sections: [
            { title: 'Login Form', preview: 'user login', keywords: ['login', 'form', 'user'] },
          ],
        },
        {
          path: 'reg.md',
          sections: [
            { title: 'Registration', preview: 'new user signup', keywords: ['registration', 'signup'] },
          ],
        },
      ]);

      const results = searchSections(index, 'login registration');

      expect(results).toHaveLength(2);
    });
  });
});
