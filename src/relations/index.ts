// Related Files - discover files that should be read together

import { readFile } from 'fs/promises';
import { join, dirname, extname, basename, relative, resolve } from 'path';
import type { ProjectIndex } from '../types.js';

export interface FileRelation {
  file: string;
  relationType: 'import' | 'cooccurrence' | 'reference';
  strength: number; // 0-1, higher = stronger relationship
}

export interface RelationGraph {
  // Map from file path to related files
  relations: Map<string, FileRelation[]>;
}

// Regular expressions for extracting imports from different languages
const IMPORT_PATTERNS: Record<string, RegExp[]> = {
  js: [
    /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /export\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
  ],
  ts: [
    /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /export\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
  ],
  py: [
    /from\s+(\S+)\s+import/g,
    /import\s+(\S+)/g,
  ],
  go: [
    /import\s+["']([^"']+)["']/g,
    /import\s+\(\s*([^)]+)\s*\)/gs,
  ],
};

function getLanguage(filePath: string): string | null {
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case '.js':
    case '.mjs':
    case '.cjs':
    case '.jsx':
      return 'js';
    case '.ts':
    case '.mts':
    case '.cts':
    case '.tsx':
      return 'ts';
    case '.py':
    case '.pyw':
      return 'py';
    case '.go':
      return 'go';
    default:
      return null;
  }
}

function resolveImportPath(
  importPath: string,
  fromFile: string,
  projectRoot: string,
  indexedFiles: Set<string>
): string | null {
  // Skip external packages
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return null;
  }

  const fromDir = dirname(fromFile);

  // Try to resolve the import
  const candidates = [
    importPath,
    importPath + '.ts',
    importPath + '.tsx',
    importPath + '.js',
    importPath + '.jsx',
    importPath + '/index.ts',
    importPath + '/index.tsx',
    importPath + '/index.js',
    importPath + '/index.jsx',
  ];

  for (const candidate of candidates) {
    const resolvedPath = resolve(projectRoot, fromDir, candidate);
    const relativePath = relative(projectRoot, resolvedPath).replace(/\\/g, '/');

    if (indexedFiles.has(relativePath)) {
      return relativePath;
    }
  }

  return null;
}

export async function extractImports(
  filePath: string,
  projectRoot: string,
  indexedFiles: Set<string>
): Promise<string[]> {
  const language = getLanguage(filePath);
  if (!language) return [];

  const patterns = IMPORT_PATTERNS[language];
  if (!patterns) return [];

  try {
    const content = await readFile(join(projectRoot, filePath), 'utf-8');
    const imports: Set<string> = new Set();

    for (const pattern of patterns) {
      // Reset regex state
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath) {
          const resolved = resolveImportPath(importPath, filePath, projectRoot, indexedFiles);
          if (resolved && resolved !== filePath) {
            imports.add(resolved);
          }
        }
      }
    }

    return Array.from(imports);
  } catch {
    return [];
  }
}

export async function buildRelationGraph(
  projectRoot: string,
  index: ProjectIndex
): Promise<RelationGraph> {
  const relations = new Map<string, FileRelation[]>();
  const indexedFiles = new Set(index.files.map(f => f.path));

  for (const file of index.files) {
    const imports = await extractImports(file.path, projectRoot, indexedFiles);

    // File A imports B -> A is related to B
    const fileRelations: FileRelation[] = imports.map(importedFile => ({
      file: importedFile,
      relationType: 'import' as const,
      strength: 0.8,
    }));

    if (fileRelations.length > 0) {
      relations.set(file.path, fileRelations);
    }

    // Also add reverse relationship: B is imported by A -> B is related to A
    for (const importedFile of imports) {
      const existing = relations.get(importedFile) || [];
      const hasReverse = existing.some(r => r.file === file.path);

      if (!hasReverse) {
        existing.push({
          file: file.path,
          relationType: 'import',
          strength: 0.6, // Lower strength for "imported by"
        });
        relations.set(importedFile, existing);
      }
    }
  }

  return { relations };
}

export function getRelatedFiles(
  graph: RelationGraph,
  targetFile: string,
  maxRelated = 3
): FileRelation[] {
  const related = graph.relations.get(targetFile) || [];

  return related
    .sort((a, b) => b.strength - a.strength)
    .slice(0, maxRelated);
}

export function findRelatedForResults(
  graph: RelationGraph,
  resultFiles: string[],
  maxTotal = 2
): FileRelation[] {
  const seen = new Set(resultFiles);
  const allRelated: FileRelation[] = [];

  for (const file of resultFiles) {
    const related = getRelatedFiles(graph, file, 2);
    for (const rel of related) {
      if (!seen.has(rel.file)) {
        seen.add(rel.file);
        allRelated.push(rel);
      }
    }
  }

  // Sort by strength and take top
  return allRelated
    .sort((a, b) => b.strength - a.strength)
    .slice(0, maxTotal);
}
