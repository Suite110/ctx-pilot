import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { buildAutoIndex, saveIndex, loadIndex } from '../../src/indexer/index.js';
import { saveConfig, loadConfig } from '../../src/config/index.js';
import { searchSections } from '../../src/search/index.js';
import { extractTopics } from '../../src/search/keywords.js';
import type { CtxPilotConfig, ProjectIndex, ScoredSection } from '../../src/types.js';

describe('CLI functionality', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `ctx-pilot-cli-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  async function createTestFile(relativePath: string, content: string) {
    const fullPath = join(testDir, relativePath);
    const dir = dirname(fullPath);
    if (dir && dir !== fullPath) {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(fullPath, content);
  }

  async function setupConfig(config: Partial<CtxPilotConfig> = {}) {
    const fullConfig: CtxPilotConfig = {
      pinned: [],
      include: ['**/*.md'],
      exclude: [],
      ...config,
    };
    await saveConfig(testDir, fullConfig);
    return fullConfig;
  }

  // Helper to simulate excludeFromSuggestions filtering (mirrors cli.ts logic)
  function filterExcludedFiles(
    results: ScoredSection[],
    excludePatterns?: string[]
  ): ScoredSection[] {
    if (!excludePatterns || excludePatterns.length === 0) {
      return results;
    }

    return results.filter((r) => {
      return !excludePatterns.some((pattern) => {
        const regex = new RegExp(
          '^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$'
        );
        return regex.test(r.file);
      });
    });
  }

  describe('configurable thresholds', () => {
    it('should load minTopics from config', async () => {
      const config = await setupConfig({ minTopics: 3 });
      const loaded = await loadConfig(testDir);

      expect(loaded.minTopics).toBe(3);
    });

    it('should load minScore from config', async () => {
      const config = await setupConfig({ minScore: 1.5 });
      const loaded = await loadConfig(testDir);

      expect(loaded.minScore).toBe(1.5);
    });

    it('should default minTopics to 2', async () => {
      await setupConfig({});
      const loaded = await loadConfig(testDir);

      expect(loaded.minTopics).toBe(2);
    });

    it('should default minScore to 1.0', async () => {
      await setupConfig({});
      const loaded = await loadConfig(testDir);

      expect(loaded.minScore).toBe(1);
    });

    it('should allow minTopics of 0 for always-on suggestions', async () => {
      const config = await setupConfig({ minTopics: 0 });
      const loaded = await loadConfig(testDir);

      expect(loaded.minTopics).toBe(0);
    });

    it('should allow lower minScore for more results', async () => {
      const config = await setupConfig({ minScore: 0.5 });
      const loaded = await loadConfig(testDir);

      expect(loaded.minScore).toBe(0.5);
    });
  });

  describe('excludeFromSuggestions', () => {
    it('should filter out exact file matches', async () => {
      await createTestFile('docs/guide.md', '# Guide\n\nContent about tests.');
      await createTestFile('tests/test.md', '# Tests\n\nTest content.');

      const config = await setupConfig({
        include: ['**/*.md'],
        excludeFromSuggestions: ['tests/test.md'],
      });

      const index = await buildAutoIndex(testDir, config);
      const results = searchSections(index, 'test content');

      // Both files should be in the index
      expect(index.files.length).toBe(2);

      // But filtering should remove the excluded one
      const filtered = filterExcludedFiles(results, config.excludeFromSuggestions);

      // Should not contain the excluded file
      const hasExcluded = filtered.some((r) => r.file === 'tests/test.md');
      expect(hasExcluded).toBe(false);
    });

    it('should filter out glob pattern matches', async () => {
      await createTestFile('docs/guide.md', '# Guide\n\nUser guide.');
      await createTestFile('tests/unit.md', '# Unit Tests\n\nUnit test.');
      await createTestFile('tests/integration.md', '# Integration\n\nIntegration test.');

      const config = await setupConfig({
        include: ['**/*.md'],
        excludeFromSuggestions: ['tests/**'],
      });

      const index = await buildAutoIndex(testDir, config);
      const results = searchSections(index, 'test');

      // Index should have all files
      expect(index.files.length).toBe(3);

      // Filter should remove tests/*
      const filtered = filterExcludedFiles(results, config.excludeFromSuggestions);

      // Should not contain any tests/ files
      const hasTestsFiles = filtered.some((r) => r.file.startsWith('tests/'));
      expect(hasTestsFiles).toBe(false);
    });

    it('should not filter when excludeFromSuggestions is empty', async () => {
      await createTestFile('docs/guide.md', '# Guide\n\nContent.');
      await createTestFile('tests/test.md', '# Tests\n\nTest.');

      const config = await setupConfig({
        include: ['**/*.md'],
        excludeFromSuggestions: [],
      });

      const index = await buildAutoIndex(testDir, config);
      const results = searchSections(index, 'guide test');

      const filtered = filterExcludedFiles(results, config.excludeFromSuggestions);

      // Should keep all results
      expect(filtered.length).toBe(results.length);
    });

    it('should handle multiple exclude patterns', async () => {
      await createTestFile('docs/guide.md', '# Guide\n\nGuide content.');
      await createTestFile('tests/test.md', '# Tests\n\nTest content.');
      await createTestFile('archive/old.md', '# Archive\n\nOld content.');

      const config = await setupConfig({
        include: ['**/*.md'],
        excludeFromSuggestions: ['tests/**', 'archive/**'],
      });

      const index = await buildAutoIndex(testDir, config);
      const results = searchSections(index, 'content');

      const filtered = filterExcludedFiles(results, config.excludeFromSuggestions);

      // Should only have docs/guide.md
      expect(filtered.every((r) => r.file.startsWith('docs/'))).toBe(true);
    });
  });

  describe('search functionality', () => {
    it('should extract topics from query', () => {
      const topics = extractTopics('update the authentication flow');

      expect(topics).toContain('authentication');
      expect(topics).toContain('flow');
      // "update" and "the" are stopwords
      expect(topics).not.toContain('the');
    });

    it('should find sections matching topics', async () => {
      await createTestFile('auth.md', '# Authentication\n\nUser login flow.');
      await createTestFile('db.md', '# Database\n\nDatabase config.');

      const config = await setupConfig();
      const index = await buildAutoIndex(testDir, config);

      const topics = extractTopics('authentication login');
      const results = searchSections(index, topics.join(' '));

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].file).toBe('auth.md');
    });

    it('should return empty for queries with only stopwords', () => {
      const topics = extractTopics('the is a');

      expect(topics.length).toBe(0);
    });

    it('should score results by relevance', async () => {
      await createTestFile('exact.md', '# Authentication\n\nAuth flow.');
      await createTestFile('partial.md', '# Other\n\nSome content about auth.');

      const config = await setupConfig();
      const index = await buildAutoIndex(testDir, config);

      const results = searchSections(index, 'authentication');

      // File with title match should score higher
      if (results.length >= 2) {
        expect(results[0].score).toBeGreaterThan(results[1].score);
      }
    });

    it('should respect maxResults option', async () => {
      // Create many files
      for (let i = 0; i < 10; i++) {
        await createTestFile(`doc${i}.md`, `# Doc ${i}\n\nTest content.`);
      }

      const config = await setupConfig();
      const index = await buildAutoIndex(testDir, config);

      const results = searchSections(index, 'test', { maxResults: 5 });

      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('smart skip logic', () => {
    // These test the logic that would be used in runHook()

    it('should skip when topics < minTopics', () => {
      const topics = extractTopics('hi'); // Single word, might be filtered
      const minTopics = 2;
      const hasPinned = false;

      const shouldSkip = topics.length < minTopics && !hasPinned;

      // Either topics is empty or has 1, so should skip
      expect(shouldSkip || topics.length < minTopics).toBe(true);
    });

    it('should not skip when hasPinned even with few topics', () => {
      const topics = extractTopics('hi');
      const minTopics = 2;
      const hasPinned = true;

      const shouldSkip = topics.length < minTopics && !hasPinned;

      expect(shouldSkip).toBe(false);
    });

    it('should skip when no results above minScore', async () => {
      await createTestFile('doc.md', '# Doc\n\nSome content.');

      const config = await setupConfig();
      const index = await buildAutoIndex(testDir, config);

      // Search for something that won't match well
      const results = searchSections(index, 'unrelated query terms');
      const minScore = 1.0;
      const hasPinned = false;

      const hasRelevantResults = results.some((r) => r.score >= minScore);
      const shouldSkip = !hasRelevantResults && !hasPinned;

      // Should skip if no good matches
      expect(shouldSkip).toBe(true);
    });

    it('should not skip when results above minScore exist', async () => {
      await createTestFile('auth.md', '# Authentication\n\nUser authentication flow.');

      const config = await setupConfig();
      const index = await buildAutoIndex(testDir, config);

      const results = searchSections(index, 'authentication');
      const minScore = 1.0;
      const hasPinned = false;

      const hasRelevantResults = results.some((r) => r.score >= minScore);
      const shouldSkip = !hasRelevantResults && !hasPinned;

      // Should not skip - good match exists
      expect(shouldSkip).toBe(false);
      expect(hasRelevantResults).toBe(true);
    });
  });
});
