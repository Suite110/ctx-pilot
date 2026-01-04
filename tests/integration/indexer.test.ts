import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { buildAutoIndex, loadIndex, getIndexStats, saveIndex } from '../../src/indexer/index.js';
import { saveConfig } from '../../src/config/index.js';
import type { CtxPilotConfig } from '../../src/types.js';

describe('indexer integration', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `ctx-pilot-indexer-test-${Date.now()}`);
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

  describe('buildAutoIndex', () => {
    it('should index markdown files', async () => {
      await createTestFile('docs/guide.md', `# Getting Started

Welcome to the guide.

## Installation

Run npm install.`);

      const config = await setupConfig({ include: ['**/*.md'] });
      const index = await buildAutoIndex(testDir, config);
      const stats = getIndexStats(index);

      expect(stats.files).toBe(1);
      expect(stats.sections).toBeGreaterThan(0);
    });

    it('should index multiple file types', async () => {
      await createTestFile('docs/readme.md', '# README\n\nContent.');
      await createTestFile('src/main.ts', 'function main() { return 1; }');

      const config = await setupConfig({ include: ['**/*.md', '**/*.ts'] });
      const index = await buildAutoIndex(testDir, config);
      const stats = getIndexStats(index);

      expect(stats.files).toBe(2);
    });

    it('should respect exclude patterns', async () => {
      await createTestFile('docs/public.md', '# Public');
      await createTestFile('archive/old.md', '# Old');

      const config = await setupConfig({
        include: ['**/*.md'],
        exclude: ['archive/**'],
      });
      const index = await buildAutoIndex(testDir, config);
      const stats = getIndexStats(index);

      expect(stats.files).toBe(1);
      expect(index.files[0].path).toContain('public');
    });

    it('should handle empty directories', async () => {
      await mkdir(join(testDir, 'empty'), { recursive: true });

      const config = await setupConfig({ include: ['**/*.md'] });
      const index = await buildAutoIndex(testDir, config);
      const stats = getIndexStats(index);

      expect(stats.files).toBe(0);
    });

    it('should handle files with no sections', async () => {
      await createTestFile('empty.txt', '');

      const config = await setupConfig({ include: ['**/*.txt'] });
      const index = await buildAutoIndex(testDir, config);

      // Empty files may still be indexed with 0 sections
      if (index.files.length > 0) {
        expect(index.files[0].sections.length).toBe(0);
      }
    });
  });

  describe('incremental indexing', () => {
    it('should produce consistent results for unchanged files', async () => {
      await createTestFile('file.md', '# Test\n\nContent.');

      const config = await setupConfig();

      // First index
      const index1 = await buildAutoIndex(testDir, config);

      // Second index (should produce same results)
      const index2 = await buildAutoIndex(testDir, config);

      // Same sections should be extracted
      expect(index2.files[0].sections.length).toBe(index1.files[0].sections.length);
    });

    it('should re-index changed files', async () => {
      await createTestFile('file.md', '# Original');

      const config = await setupConfig();
      const index1 = await buildAutoIndex(testDir, config);

      // Modify file
      await createTestFile('file.md', '# Modified\n\n## New Section');

      const index2 = await buildAutoIndex(testDir, config);

      // File content changed, so sections should differ
      expect(getIndexStats(index2).sections).toBeGreaterThan(getIndexStats(index1).sections);
    });

    it('should force re-index all files', async () => {
      await createTestFile('file.md', '# Test');

      const config = await setupConfig();
      await buildAutoIndex(testDir, config);

      // Force re-index
      const index = await buildAutoIndex(testDir, config, { force: true });

      expect(index.files).toHaveLength(1);
    });
  });

  describe('loadIndex', () => {
    it('should return null when no index exists', async () => {
      const index = await loadIndex(testDir);
      expect(index).toBeNull();
    });

    it('should load previously saved index', async () => {
      await createTestFile('file.md', '# Test');

      const config = await setupConfig();
      const index = await buildAutoIndex(testDir, config);
      await saveIndex(testDir, index);

      const loaded = await loadIndex(testDir);

      expect(loaded).not.toBeNull();
      expect(loaded!.files).toHaveLength(1);
    });
  });

  describe('parser integration', () => {
    it('should correctly parse markdown headers', async () => {
      await createTestFile('doc.md', `# Header 1

Content 1.

## Header 2

Content 2.

### Header 3

Content 3.`);

      const config = await setupConfig();
      const index = await buildAutoIndex(testDir, config);

      expect(index.files[0].sections.length).toBeGreaterThanOrEqual(3);
    });

    it('should correctly parse JavaScript functions', async () => {
      await createTestFile('code.js', `function foo() {
  return 1;
}

class Bar {
  method() {}
}

const baz = () => 2;`);

      const config = await setupConfig({ include: ['**/*.js'] });
      const index = await buildAutoIndex(testDir, config);

      expect(index.files[0].sections.length).toBeGreaterThanOrEqual(3);
    });

    it('should correctly parse Python code', async () => {
      await createTestFile('script.py', `def hello():
    print("hello")

class MyClass:
    def method(self):
        pass`);

      const config = await setupConfig({ include: ['**/*.py'] });
      const index = await buildAutoIndex(testDir, config);

      expect(index.files[0].sections.length).toBeGreaterThanOrEqual(2);
    });
  });
});
