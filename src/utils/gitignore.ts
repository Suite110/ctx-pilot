import { readFile } from 'fs/promises';
import { join } from 'path';
import ignoreModule from 'ignore';

const ignore = ignoreModule.default || ignoreModule;

export async function loadGitignorePatterns(projectRoot: string): Promise<string[]> {
  const gitignorePath = join(projectRoot, '.gitignore');

  try {
    const content = await readFile(gitignorePath, 'utf-8');
    return parseGitignore(content);
  } catch {
    // No .gitignore file, return empty patterns
    return [];
  }
}

export function parseGitignore(content: string): string[] {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

export function createIgnoreFilter(patterns: string[]): (path: string) => boolean {
  const ig = ignore().add(patterns);
  return (path: string) => ig.ignores(path);
}

export function mergePatterns(
  gitignorePatterns: string[],
  excludePatterns: string[]
): string[] {
  // Combine patterns, removing duplicates
  const combined = new Set([...gitignorePatterns, ...excludePatterns]);
  return Array.from(combined);
}
