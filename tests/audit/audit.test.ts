import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { auditIndex, formatAuditReport } from '../../src/audit/index.js';
import { saveConfig } from '../../src/config/index.js';
import type { CtxPilotConfig, ProjectIndex } from '../../src/types.js';

describe('audit', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `ctx-pilot-audit-test-${Date.now()}`);
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

  function createTestIndex(files: Array<{ path: string; sections: Array<{ title: string; keywords: string[] }> }>): ProjectIndex {
    return {
      version: '1.1.0',
      lastUpdated: new Date().toISOString(),
      files: files.map(f => ({
        path: f.path,
        sections: f.sections.map((s, i) => ({
          title: s.title,
          lineStart: i * 10 + 1,
          lineEnd: (i + 1) * 10,
          preview: `Preview of ${s.title}`,
          keywords: s.keywords,
        })),
      })),
    };
  }

  async function createTestFile(relativePath: string, content: string) {
    const fullPath = join(testDir, relativePath);
    const dir = fullPath.substring(0, fullPath.lastIndexOf('\\') > -1 ? fullPath.lastIndexOf('\\') : fullPath.lastIndexOf('/'));
    await mkdir(dir, { recursive: true });
    await writeFile(fullPath, content);
  }

  describe('auditIndex', () => {
    it('should return perfect score for well-indexed project', async () => {
      const config: CtxPilotConfig = {
        pinned: [],
        include: ['**/*.ts'],
        exclude: [],
      };
      await saveConfig(testDir, config);

      await createTestFile('src/index.ts', 'export const foo = 1;');

      const index = createTestIndex([
        {
          path: 'src/index.ts',
          sections: [{ title: 'Main export', keywords: ['foo', 'export', 'main', 'index'] }],
        },
      ]);

      const report = await auditIndex(testDir, config, index);

      expect(report.score).toBeGreaterThanOrEqual(90);
      expect(report.coverage.filesIndexed).toBe(1);
    });

    it('should detect weak keywords', async () => {
      const config: CtxPilotConfig = {
        pinned: [],
        include: ['**/*.ts'],
        exclude: [],
      };
      await saveConfig(testDir, config);

      await createTestFile('src/index.ts', 'export const foo = 1;');

      const index = createTestIndex([
        {
          path: 'src/index.ts',
          sections: [{ title: 'Main', keywords: ['foo'] }], // Only 1 keyword
        },
      ]);

      const report = await auditIndex(testDir, config, index);

      const weakKeywordsIssue = report.issues.find(i => i.type === 'weak_keywords');
      expect(weakKeywordsIssue).toBeDefined();
    });

    it('should detect missing pinned files', async () => {
      const config: CtxPilotConfig = {
        pinned: ['nonexistent.md'],
        include: ['**/*.md'],
        exclude: [],
      };
      await saveConfig(testDir, config);

      const index = createTestIndex([]);

      const report = await auditIndex(testDir, config, index);

      const missingPinnedIssue = report.issues.find(i => i.type === 'missing_pinned');
      expect(missingPinnedIssue).toBeDefined();
      expect(missingPinnedIssue?.file).toBe('nonexistent.md');
    });

    it('should calculate coverage correctly', async () => {
      const config: CtxPilotConfig = {
        pinned: [],
        include: ['**/*.ts'],
        exclude: [],
      };
      await saveConfig(testDir, config);

      await createTestFile('src/a.ts', 'export const a = 1;');
      await createTestFile('src/b.ts', 'export const b = 2;');

      const index = createTestIndex([
        {
          path: 'src/a.ts',
          sections: [{ title: 'A', keywords: ['a', 'export', 'const'] }],
        },
        // b.ts is not indexed
      ]);

      const report = await auditIndex(testDir, config, index);

      expect(report.coverage.filesIndexed).toBe(1);
      expect(report.coverage.filesTotal).toBe(2);
      expect(report.coverage.filesPercent).toBe(50);
    });
  });

  describe('formatAuditReport', () => {
    it('should format report with all sections', () => {
      const report = {
        score: 85,
        coverage: {
          filesIndexed: 10,
          filesTotal: 12,
          filesPercent: 83,
          sectionsWithKeywords: 50,
          sectionsTotal: 55,
          sectionsPercent: 91,
          avgKeywordsPerSection: 5.2,
        },
        issues: [
          { severity: 'warning' as const, type: 'weak_keywords', message: '5 sections have weak keywords' },
        ],
        recommendations: [
          { priority: 'high' as const, action: 'Add synonyms', reason: 'Improve search' },
        ],
      };

      const formatted = formatAuditReport(report);

      expect(formatted).toContain('Overall Score: 85/100');
      expect(formatted).toContain('Files indexed: 10/12');
      expect(formatted).toContain('5 sections have weak keywords');
      expect(formatted).toContain('Add synonyms');
    });

    it('should show success message for high scores', () => {
      const report = {
        score: 95,
        coverage: {
          filesIndexed: 10,
          filesTotal: 10,
          filesPercent: 100,
          sectionsWithKeywords: 50,
          sectionsTotal: 50,
          sectionsPercent: 100,
          avgKeywordsPerSection: 8,
        },
        issues: [],
        recommendations: [],
      };

      const formatted = formatAuditReport(report);

      expect(formatted).toContain('Index is in great shape!');
    });
  });
});
