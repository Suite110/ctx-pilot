import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  recordSuggestion,
  getAnalyticsStats,
  clearAnalytics,
  formatAnalyticsStats,
  getDefaultAnalyticsConfig,
} from '../../src/analytics/index.js';

describe('analytics', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `ctx-pilot-analytics-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, '.context'), { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('recordSuggestion', () => {
    it('should record suggestion when analytics enabled', async () => {
      const config = { enabled: true, storage: 'local' as const };

      await recordSuggestion(testDir, config, {
        query: 'test query',
        topicsExtracted: ['test', 'query'],
        filesShown: ['src/test.ts'],
        topScore: 2.5,
      });

      const analyticsPath = join(testDir, '.context', 'analytics.json');
      const content = await readFile(analyticsPath, 'utf-8');
      const data = JSON.parse(content);

      expect(data.suggestions).toHaveLength(1);
      expect(data.suggestions[0].query).toBe('test query');
      expect(data.suggestions[0].filesShown).toContain('src/test.ts');
    });

    it('should not record when analytics disabled', async () => {
      const config = { enabled: false, storage: 'local' as const };

      await recordSuggestion(testDir, config, {
        query: 'test query',
        topicsExtracted: ['test'],
        filesShown: ['src/test.ts'],
      });

      const stats = await getAnalyticsStats(testDir);
      expect(stats.totalSuggestions).toBe(0);
    });

    it('should accumulate multiple suggestions', async () => {
      const config = { enabled: true, storage: 'local' as const };

      await recordSuggestion(testDir, config, {
        query: 'query 1',
        topicsExtracted: ['auth'],
        filesShown: ['src/auth.ts'],
      });

      await recordSuggestion(testDir, config, {
        query: 'query 2',
        topicsExtracted: ['user'],
        filesShown: ['src/user.ts'],
      });

      const stats = await getAnalyticsStats(testDir);
      expect(stats.totalSuggestions).toBe(2);
    });
  });

  describe('getAnalyticsStats', () => {
    it('should return empty stats when no data', async () => {
      const stats = await getAnalyticsStats(testDir);

      expect(stats.totalSuggestions).toBe(0);
      expect(stats.uniqueFilesShown).toBe(0);
      expect(stats.mostSuggestedFiles).toHaveLength(0);
    });

    it('should calculate most suggested files', async () => {
      const config = { enabled: true, storage: 'local' as const };

      // Suggest auth.ts 3 times
      for (let i = 0; i < 3; i++) {
        await recordSuggestion(testDir, config, {
          query: `query ${i}`,
          topicsExtracted: ['auth'],
          filesShown: ['src/auth.ts'],
        });
      }

      // Suggest user.ts 1 time
      await recordSuggestion(testDir, config, {
        query: 'user query',
        topicsExtracted: ['user'],
        filesShown: ['src/user.ts'],
      });

      const stats = await getAnalyticsStats(testDir);

      expect(stats.mostSuggestedFiles[0].file).toBe('src/auth.ts');
      expect(stats.mostSuggestedFiles[0].count).toBe(3);
    });

    it('should track top topics', async () => {
      const config = { enabled: true, storage: 'local' as const };

      await recordSuggestion(testDir, config, {
        query: 'query 1',
        topicsExtracted: ['authentication', 'login'],
        filesShown: ['src/auth.ts'],
      });

      await recordSuggestion(testDir, config, {
        query: 'query 2',
        topicsExtracted: ['authentication'],
        filesShown: ['src/auth.ts'],
      });

      const stats = await getAnalyticsStats(testDir);

      expect(stats.topTopics[0].topic).toBe('authentication');
      expect(stats.topTopics[0].count).toBe(2);
    });

    it('should track queries with no results', async () => {
      const config = { enabled: true, storage: 'local' as const };

      await recordSuggestion(testDir, config, {
        query: 'missing feature',
        topicsExtracted: ['payment'],
        filesShown: [], // No results
      });

      const stats = await getAnalyticsStats(testDir);

      expect(stats.queriesWithNoResults).toHaveLength(1);
      expect(stats.queriesWithNoResults[0].query).toBe('payment');
    });
  });

  describe('clearAnalytics', () => {
    it('should clear all analytics data', async () => {
      const config = { enabled: true, storage: 'local' as const };

      await recordSuggestion(testDir, config, {
        query: 'test',
        topicsExtracted: ['test'],
        filesShown: ['test.ts'],
      });

      await clearAnalytics(testDir);

      const stats = await getAnalyticsStats(testDir);
      expect(stats.totalSuggestions).toBe(0);
    });
  });

  describe('formatAnalyticsStats', () => {
    it('should format empty stats', () => {
      const stats = {
        totalSuggestions: 0,
        uniqueFilesShown: 0,
        dateRange: null,
        mostSuggestedFiles: [],
        topTopics: [],
        queriesWithNoResults: [],
        avgFilesPerSuggestion: 0,
      };

      const formatted = formatAnalyticsStats(stats);

      expect(formatted).toContain('No usage data collected yet');
    });

    it('should format populated stats', () => {
      const stats = {
        totalSuggestions: 100,
        uniqueFilesShown: 25,
        dateRange: { start: '2026-01-01', end: '2026-01-04' },
        mostSuggestedFiles: [{ file: 'src/auth.ts', count: 50 }],
        topTopics: [{ topic: 'authentication', count: 30 }],
        queriesWithNoResults: [{ query: 'payment', count: 5 }],
        avgFilesPerSuggestion: 2.5,
      };

      const formatted = formatAnalyticsStats(stats);

      expect(formatted).toContain('Suggestions: 100');
      expect(formatted).toContain('src/auth.ts');
      expect(formatted).toContain('authentication');
      expect(formatted).toContain('payment');
    });
  });

  describe('getDefaultAnalyticsConfig', () => {
    it('should return disabled by default', () => {
      const config = getDefaultAnalyticsConfig();

      expect(config.enabled).toBe(false);
      expect(config.storage).toBe('local');
    });
  });
});
