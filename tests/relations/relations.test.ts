import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  extractImports,
  buildRelationGraph,
  getRelatedFiles,
  findRelatedForResults,
} from '../../src/relations/index.js';
import type { ProjectIndex } from '../../src/types.js';

describe('relations', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `ctx-pilot-relations-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, 'src'), { recursive: true });
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
    const dir = fullPath.substring(0, fullPath.lastIndexOf('/') > -1 ? fullPath.lastIndexOf('/') : fullPath.lastIndexOf('\\'));
    await mkdir(dir, { recursive: true });
    await writeFile(fullPath, content);
  }

  function createTestIndex(files: string[]): ProjectIndex {
    return {
      version: '1.1.0',
      lastUpdated: new Date().toISOString(),
      files: files.map(path => ({
        path,
        sections: [{
          title: `Section in ${path}`,
          lineStart: 1,
          lineEnd: 10,
          preview: 'Test preview',
          keywords: ['test'],
        }],
      })),
    };
  }

  describe('extractImports', () => {
    it('should extract ES6 imports', async () => {
      await createTestFile('src/main.ts', `
import { foo } from './utils';
import bar from './helpers';
`);
      await createTestFile('src/utils.ts', 'export const foo = 1;');
      await createTestFile('src/helpers.ts', 'export default 2;');

      const indexedFiles = new Set(['src/main.ts', 'src/utils.ts', 'src/helpers.ts']);
      const imports = await extractImports('src/main.ts', testDir, indexedFiles);

      expect(imports).toContain('src/utils.ts');
      expect(imports).toContain('src/helpers.ts');
    });

    it('should extract require statements', async () => {
      await createTestFile('src/main.js', `
const foo = require('./utils');
`);
      await createTestFile('src/utils.js', 'module.exports = {};');

      const indexedFiles = new Set(['src/main.js', 'src/utils.js']);
      const imports = await extractImports('src/main.js', testDir, indexedFiles);

      expect(imports).toContain('src/utils.js');
    });

    it('should ignore external packages', async () => {
      await createTestFile('src/main.ts', `
import fs from 'fs';
import { join } from 'path';
import { foo } from './local';
`);
      await createTestFile('src/local.ts', 'export const foo = 1;');

      const indexedFiles = new Set(['src/main.ts', 'src/local.ts']);
      const imports = await extractImports('src/main.ts', testDir, indexedFiles);

      expect(imports).not.toContain('fs');
      expect(imports).not.toContain('path');
      expect(imports).toContain('src/local.ts');
    });

    it('should return empty for non-JS files', async () => {
      await createTestFile('docs/readme.md', '# Documentation');

      const indexedFiles = new Set(['docs/readme.md']);
      const imports = await extractImports('docs/readme.md', testDir, indexedFiles);

      expect(imports).toHaveLength(0);
    });
  });

  describe('buildRelationGraph', () => {
    it('should build graph from imports', async () => {
      await createTestFile('src/main.ts', `import { foo } from './utils';`);
      await createTestFile('src/utils.ts', 'export const foo = 1;');

      const index = createTestIndex(['src/main.ts', 'src/utils.ts']);
      const graph = await buildRelationGraph(testDir, index);

      expect(graph.relations.has('src/main.ts')).toBe(true);
      const mainRelations = graph.relations.get('src/main.ts')!;
      expect(mainRelations.some(r => r.file === 'src/utils.ts')).toBe(true);
    });

    it('should create reverse relationships', async () => {
      await createTestFile('src/main.ts', `import { foo } from './utils';`);
      await createTestFile('src/utils.ts', 'export const foo = 1;');

      const index = createTestIndex(['src/main.ts', 'src/utils.ts']);
      const graph = await buildRelationGraph(testDir, index);

      // utils.ts should have a reverse relation to main.ts
      expect(graph.relations.has('src/utils.ts')).toBe(true);
      const utilsRelations = graph.relations.get('src/utils.ts')!;
      expect(utilsRelations.some(r => r.file === 'src/main.ts')).toBe(true);
    });
  });

  describe('getRelatedFiles', () => {
    it('should return related files sorted by strength', async () => {
      await createTestFile('src/main.ts', `
import { foo } from './utils';
import { bar } from './helpers';
`);
      await createTestFile('src/utils.ts', 'export const foo = 1;');
      await createTestFile('src/helpers.ts', 'export const bar = 2;');

      const index = createTestIndex(['src/main.ts', 'src/utils.ts', 'src/helpers.ts']);
      const graph = await buildRelationGraph(testDir, index);

      const related = getRelatedFiles(graph, 'src/main.ts', 2);

      expect(related).toHaveLength(2);
      expect(related[0].strength).toBeGreaterThanOrEqual(related[1].strength);
    });

    it('should respect maxRelated limit', async () => {
      await createTestFile('src/main.ts', `
import a from './a';
import b from './b';
import c from './c';
`);
      await createTestFile('src/a.ts', 'export default 1;');
      await createTestFile('src/b.ts', 'export default 2;');
      await createTestFile('src/c.ts', 'export default 3;');

      const index = createTestIndex(['src/main.ts', 'src/a.ts', 'src/b.ts', 'src/c.ts']);
      const graph = await buildRelationGraph(testDir, index);

      const related = getRelatedFiles(graph, 'src/main.ts', 1);

      expect(related).toHaveLength(1);
    });

    it('should return empty for files with no relations', async () => {
      await createTestFile('src/standalone.ts', 'const x = 1;');

      const index = createTestIndex(['src/standalone.ts']);
      const graph = await buildRelationGraph(testDir, index);

      const related = getRelatedFiles(graph, 'src/standalone.ts');

      expect(related).toHaveLength(0);
    });
  });

  describe('findRelatedForResults', () => {
    it('should find related files for search results', async () => {
      await createTestFile('src/main.ts', `import { foo } from './utils';`);
      await createTestFile('src/utils.ts', 'export const foo = 1;');
      await createTestFile('src/other.ts', 'const x = 1;');

      const index = createTestIndex(['src/main.ts', 'src/utils.ts', 'src/other.ts']);
      const graph = await buildRelationGraph(testDir, index);

      // If main.ts is in results, utils.ts should be suggested as related
      const related = findRelatedForResults(graph, ['src/main.ts'], 2);

      expect(related.some(r => r.file === 'src/utils.ts')).toBe(true);
    });

    it('should not include files already in results', async () => {
      await createTestFile('src/main.ts', `import { foo } from './utils';`);
      await createTestFile('src/utils.ts', 'export const foo = 1;');

      const index = createTestIndex(['src/main.ts', 'src/utils.ts']);
      const graph = await buildRelationGraph(testDir, index);

      // Both files are already in results
      const related = findRelatedForResults(graph, ['src/main.ts', 'src/utils.ts'], 2);

      expect(related).toHaveLength(0);
    });
  });
});
