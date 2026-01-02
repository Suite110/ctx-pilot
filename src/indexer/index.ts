import { readFile, writeFile, stat, mkdir } from 'fs/promises';
import { createHash } from 'crypto';
import { join } from 'path';
import type { CtxPilotConfig, ProjectIndex, FileIndex, IndexOptions } from '../types.js';
import { scanFiles } from './file-scanner.js';
import { getParser } from './parsers/index.js';
import { getIndexPath, toAbsolutePath } from '../utils/paths.js';

const INDEX_VERSION = '1.0.0';

export async function loadIndex(projectRoot: string): Promise<ProjectIndex | null> {
  const indexPath = getIndexPath(projectRoot);

  try {
    const content = await readFile(indexPath, 'utf-8');
    const index = JSON.parse(content) as ProjectIndex;

    // Check version compatibility
    if (index.version !== INDEX_VERSION) {
      console.error(`Index version mismatch. Expected ${INDEX_VERSION}, got ${index.version}. Re-indexing.`);
      return null;
    }

    return index;
  } catch {
    return null;
  }
}

export async function saveIndex(projectRoot: string, index: ProjectIndex): Promise<void> {
  const indexPath = getIndexPath(projectRoot);
  const contextDir = join(projectRoot, '.context');

  await mkdir(contextDir, { recursive: true });
  await writeFile(indexPath, JSON.stringify(index, null, 2) + '\n', 'utf-8');
}

function computeHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

async function getFileMtime(filePath: string): Promise<string> {
  try {
    const stats = await stat(filePath);
    return stats.mtime.toISOString();
  } catch {
    return '';
  }
}

async function indexFile(projectRoot: string, relativePath: string): Promise<FileIndex> {
  const absolutePath = toAbsolutePath(projectRoot, relativePath);
  const content = await readFile(absolutePath, 'utf-8');
  const mtime = await getFileMtime(absolutePath);
  const hash = computeHash(content);

  const parser = getParser(relativePath);
  const sections = parser(content, relativePath);

  return {
    path: relativePath,
    mtime,
    hash,
    sections,
  };
}

export async function buildIndex(
  projectRoot: string,
  config: CtxPilotConfig,
  options?: IndexOptions
): Promise<ProjectIndex> {
  const files = await scanFiles(projectRoot, {
    include: config.include,
    exclude: config.exclude,
  });

  const existingIndex = options?.force ? null : await loadIndex(projectRoot);
  const existingFiles = new Map(
    existingIndex?.files.map(f => [f.path, f]) || []
  );

  const indexedFiles: FileIndex[] = [];
  let reusedCount = 0;
  let newCount = 0;

  for (const file of files) {
    const existing = existingFiles.get(file);
    const absolutePath = toAbsolutePath(projectRoot, file);

    // Check if we can reuse existing index entry
    if (existing && !options?.force) {
      const currentMtime = await getFileMtime(absolutePath);

      if (existing.mtime === currentMtime) {
        // File hasn't changed, reuse existing index
        indexedFiles.push(existing);
        reusedCount++;
        continue;
      }

      // Mtime changed, check hash
      try {
        const content = await readFile(absolutePath, 'utf-8');
        const currentHash = computeHash(content);

        if (existing.hash === currentHash) {
          // Content hasn't changed, update mtime and reuse
          indexedFiles.push({ ...existing, mtime: currentMtime });
          reusedCount++;
          continue;
        }
      } catch {
        // File read failed, skip
        continue;
      }
    }

    // Index the file
    try {
      const fileIndex = await indexFile(projectRoot, file);
      indexedFiles.push(fileIndex);
      newCount++;
    } catch (error) {
      console.error(`Warning: Could not index ${file}: ${error}`);
    }
  }

  const index: ProjectIndex = {
    version: INDEX_VERSION,
    lastUpdated: new Date().toISOString(),
    files: indexedFiles,
  };

  await saveIndex(projectRoot, index);

  return index;
}

export async function updateIndex(
  projectRoot: string,
  existingIndex: ProjectIndex,
  config: CtxPilotConfig
): Promise<ProjectIndex> {
  // This is essentially buildIndex with the existing index
  return buildIndex(projectRoot, config, { force: false });
}

export function getIndexStats(index: ProjectIndex): { files: number; sections: number } {
  const sections = index.files.reduce((sum, f) => sum + f.sections.length, 0);
  return {
    files: index.files.length,
    sections,
  };
}
