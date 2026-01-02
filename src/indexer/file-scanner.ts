import fg from 'fast-glob';
import { loadGitignorePatterns, createIgnoreFilter, mergePatterns } from '../utils/gitignore.js';
import { normalizeSlashes } from '../utils/paths.js';

export interface ScanOptions {
  include: string[];
  exclude: string[];
}

export async function scanFiles(
  projectRoot: string,
  options: ScanOptions
): Promise<string[]> {
  const { include, exclude } = options;

  // Load .gitignore patterns
  const gitignorePatterns = await loadGitignorePatterns(projectRoot);

  // Merge user excludes with gitignore
  const allExcludes = mergePatterns(gitignorePatterns, exclude);

  // Add common excludes
  const defaultExcludes = [
    'node_modules/**',
    '.git/**',
    '.context/**',
    'dist/**',
    'build/**',
    '*.min.js',
    '*.bundle.js',
  ];

  const finalExcludes = mergePatterns(allExcludes, defaultExcludes);

  // Create ignore filter for additional filtering
  const ignoreFilter = createIgnoreFilter(finalExcludes);

  // Use fast-glob to find files
  const files = await fg(include, {
    cwd: projectRoot,
    ignore: finalExcludes,
    dot: false,
    onlyFiles: true,
    absolute: false,
  });

  // Additional filtering with ignore patterns
  const filteredFiles = files
    .map(normalizeSlashes)
    .filter(file => !ignoreFilter(file));

  return filteredFiles.sort();
}
