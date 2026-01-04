import { readFile, writeFile, stat as fsStat } from 'fs/promises';
import { join } from 'path';
import type { ProjectIndex, FileIndex, CtxPilotConfig, AutoIndexOptions } from '../types.js';
import { scanFiles } from './file-scanner.js';
import { getParser } from './parsers/index.js';

const INDEX_VERSION = '1.1.0';

export async function loadIndex(projectRoot: string): Promise<ProjectIndex | null> {
  const indexPath = join(projectRoot, '.context', 'index.json');

  try {
    const content = await readFile(indexPath, 'utf-8');
    const index = JSON.parse(content) as ProjectIndex;

    if (index.version !== INDEX_VERSION) {
      console.error(`Index version mismatch. Expected ${INDEX_VERSION}, got ${index.version}.`);
      return null;
    }

    return index;
  } catch {
    return null;
  }
}

export interface IndexStats {
  files: number;
  sections: number;
  totalKeywords: number;
  uniqueKeywords: number;
  avgSectionsPerFile: number;
  emptyFiles: number;
}

export function getIndexStats(index: ProjectIndex): IndexStats {
  const allKeywords: string[] = [];
  let emptyFiles = 0;
  let totalSections = 0;

  for (const file of index.files) {
    if (file.sections.length === 0) emptyFiles++;
    totalSections += file.sections.length;
    for (const section of file.sections) {
      allKeywords.push(...section.keywords);
    }
  }

  return {
    files: index.files.length,
    sections: totalSections,
    totalKeywords: allKeywords.length,
    uniqueKeywords: new Set(allKeywords).size,
    avgSectionsPerFile: index.files.length > 0
      ? Math.round(totalSections / index.files.length)
      : 0,
    emptyFiles,
  };
}

export async function buildAutoIndex(
  projectRoot: string,
  config: CtxPilotConfig,
  options?: AutoIndexOptions,
  existingIndex?: ProjectIndex | null
): Promise<ProjectIndex> {
  const files = await scanFiles(projectRoot, {
    include: config.include,
    exclude: config.exclude,
  });

  // Build lookup for existing file entries
  const existingByPath = new Map<string, FileIndex>();
  if (existingIndex && !options?.force) {
    for (const file of existingIndex.files) {
      existingByPath.set(file.path, file);
    }
  }

  const fileIndexes: FileIndex[] = [];
  let cached = 0;
  let reindexed = 0;

  for (const filePath of files) {
    try {
      const absolutePath = join(projectRoot, filePath);
      const fileStat = await fsStat(absolutePath);
      const mtime = fileStat.mtime.toISOString();

      // Check if we can reuse existing entry
      const existing = existingByPath.get(filePath);
      if (existing?.mtime === mtime && !options?.force) {
        fileIndexes.push(existing);
        cached++;
        if (options?.verbose) {
          console.log(`  Cached: ${filePath}`);
        }
        continue;
      }

      // Re-parse the file
      const content = await readFile(absolutePath, 'utf-8');
      const parser = getParser(filePath);
      const sections = parser(content, filePath);

      if (sections.length > 0) {
        // Mark all sections as auto-generated
        const markedSections = sections.map((s) => ({ ...s, source: 'auto' as const }));

        fileIndexes.push({
          path: filePath,
          sections: markedSections,
          mtime,
        });

        reindexed++;
        if (options?.verbose) {
          console.log(`  Indexed: ${filePath} (${sections.length} sections)`);
        }
      }
    } catch (error) {
      if (options?.verbose) {
        console.log(`  Skipped: ${filePath} (${(error as Error).message})`);
      }
    }
  }

  if (options?.verbose && cached > 0) {
    console.log(`\n  ${cached} cached, ${reindexed} reindexed`);
  }

  return {
    version: INDEX_VERSION,
    lastUpdated: new Date().toISOString(),
    files: fileIndexes,
  };
}

export async function saveIndex(projectRoot: string, index: ProjectIndex): Promise<void> {
  const indexPath = join(projectRoot, '.context', 'index.json');
  await writeFile(indexPath, JSON.stringify(index, null, 2) + '\n', 'utf-8');
}
