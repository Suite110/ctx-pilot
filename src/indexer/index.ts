import { readFile, writeFile } from 'fs/promises';
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

export function getIndexStats(index: ProjectIndex): { files: number; sections: number } {
  const sections = index.files.reduce((sum, f) => sum + f.sections.length, 0);
  return {
    files: index.files.length,
    sections,
  };
}

export async function buildAutoIndex(
  projectRoot: string,
  config: CtxPilotConfig,
  options?: AutoIndexOptions
): Promise<ProjectIndex> {
  const files = await scanFiles(projectRoot, {
    include: config.include,
    exclude: config.exclude,
  });

  const fileIndexes: FileIndex[] = [];

  for (const filePath of files) {
    try {
      const absolutePath = join(projectRoot, filePath);
      const content = await readFile(absolutePath, 'utf-8');
      const parser = getParser(filePath);
      const sections = parser(content, filePath);

      if (sections.length > 0) {
        // Mark all sections as auto-generated
        const markedSections = sections.map((s) => ({ ...s, source: 'auto' as const }));

        fileIndexes.push({
          path: filePath,
          sections: markedSections,
        });

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
