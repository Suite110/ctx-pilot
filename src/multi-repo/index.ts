// Multi-Repo Support - share context across repositories

import { readFile, writeFile, access, stat } from 'fs/promises';
import { join, resolve, relative, isAbsolute } from 'path';
import type { ProjectIndex, ScoredSection, CtxPilotConfig } from '../types.js';
import { searchSections } from '../search/index.js';

export interface LinkedRepo {
  name: string;
  path: string;
  include?: string[];
}

export interface MultiRepoConfig {
  linkedRepos: LinkedRepo[];
}

export interface MergedSearchResult extends ScoredSection {
  repoName?: string; // undefined = main repo
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function loadLinkedRepos(
  projectRoot: string,
  config: CtxPilotConfig
): Promise<Map<string, ProjectIndex>> {
  const repos = new Map<string, ProjectIndex>();
  const linkedRepos = (config as CtxPilotConfig & { linkedRepos?: LinkedRepo[] }).linkedRepos;

  if (!linkedRepos || linkedRepos.length === 0) {
    return repos;
  }

  for (const repo of linkedRepos) {
    const repoPath = isAbsolute(repo.path)
      ? repo.path
      : resolve(projectRoot, repo.path);

    const indexPath = join(repoPath, '.context', 'index.json');

    if (!(await fileExists(indexPath))) {
      console.warn(`Linked repo "${repo.name}" has no index at ${indexPath}`);
      continue;
    }

    try {
      const content = await readFile(indexPath, 'utf-8');
      const index = JSON.parse(content) as ProjectIndex;

      // Apply include filters if specified
      if (repo.include && repo.include.length > 0) {
        const patterns = repo.include.map(p =>
          new RegExp('^' + p.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$')
        );

        index.files = index.files.filter(file =>
          patterns.some(pattern => pattern.test(file.path))
        );
      }

      repos.set(repo.name, index);
    } catch (error) {
      console.warn(`Failed to load linked repo "${repo.name}":`, (error as Error).message);
    }
  }

  return repos;
}

export function searchAcrossRepos(
  mainIndex: ProjectIndex,
  linkedRepos: Map<string, ProjectIndex>,
  query: string,
  options?: { maxResults?: number }
): MergedSearchResult[] {
  const allResults: MergedSearchResult[] = [];

  // Search main repo
  const mainResults = searchSections(mainIndex, query, { maxResults: 50 });
  for (const result of mainResults) {
    allResults.push(result);
  }

  // Search linked repos
  for (const [repoName, index] of linkedRepos) {
    const repoResults = searchSections(index, query, { maxResults: 20 });
    for (const result of repoResults) {
      allResults.push({
        ...result,
        file: `[${repoName}] ${result.file}`,
        repoName,
      });
    }
  }

  // Sort by score
  allResults.sort((a, b) => b.score - a.score);

  // Apply limit
  if (options?.maxResults) {
    return allResults.slice(0, options.maxResults);
  }

  return allResults;
}

export async function linkRepo(
  projectRoot: string,
  targetPath: string,
  name?: string
): Promise<{ success: boolean; name: string; message: string }> {
  const resolvedPath = isAbsolute(targetPath)
    ? targetPath
    : resolve(projectRoot, targetPath);

  // Check if target has a ctx-pilot config
  const configPath = join(resolvedPath, '.context', 'config.json');
  if (!(await fileExists(configPath))) {
    return {
      success: false,
      name: name || '',
      message: `No ctx-pilot config found at ${resolvedPath}`,
    };
  }

  // Derive name from path if not provided
  const repoName = name || targetPath.split('/').filter(Boolean).pop() || 'linked';

  // Load current config
  const mainConfigPath = join(projectRoot, '.context', 'config.json');
  let config: CtxPilotConfig & { linkedRepos?: LinkedRepo[] };

  try {
    const content = await readFile(mainConfigPath, 'utf-8');
    config = JSON.parse(content);
  } catch {
    return {
      success: false,
      name: repoName,
      message: 'Could not read main config',
    };
  }

  // Add to linkedRepos
  if (!config.linkedRepos) {
    config.linkedRepos = [];
  }

  // Check for duplicates
  const existing = config.linkedRepos.find(r => r.name === repoName);
  if (existing) {
    return {
      success: false,
      name: repoName,
      message: `Repo "${repoName}" is already linked`,
    };
  }

  // Use relative path if within project tree
  const relativePath = relative(projectRoot, resolvedPath);
  const pathToStore = relativePath.startsWith('..') ? relativePath : targetPath;

  config.linkedRepos.push({
    name: repoName,
    path: pathToStore,
  });

  await writeFile(mainConfigPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

  return {
    success: true,
    name: repoName,
    message: `Linked "${repoName}" from ${pathToStore}`,
  };
}

export async function unlinkRepo(
  projectRoot: string,
  name: string
): Promise<{ success: boolean; message: string }> {
  const mainConfigPath = join(projectRoot, '.context', 'config.json');
  let config: CtxPilotConfig & { linkedRepos?: LinkedRepo[] };

  try {
    const content = await readFile(mainConfigPath, 'utf-8');
    config = JSON.parse(content);
  } catch {
    return {
      success: false,
      message: 'Could not read main config',
    };
  }

  if (!config.linkedRepos) {
    return {
      success: false,
      message: 'No linked repos configured',
    };
  }

  const index = config.linkedRepos.findIndex(r => r.name === name);
  if (index === -1) {
    return {
      success: false,
      message: `Repo "${name}" is not linked`,
    };
  }

  config.linkedRepos.splice(index, 1);

  await writeFile(mainConfigPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

  return {
    success: true,
    message: `Unlinked "${name}"`,
  };
}

export async function listLinkedRepos(
  projectRoot: string,
  config: CtxPilotConfig
): Promise<Array<{ name: string; path: string; indexed: boolean; sections: number }>> {
  const linkedRepos = (config as CtxPilotConfig & { linkedRepos?: LinkedRepo[] }).linkedRepos;

  if (!linkedRepos || linkedRepos.length === 0) {
    return [];
  }

  const results: Array<{ name: string; path: string; indexed: boolean; sections: number }> = [];

  for (const repo of linkedRepos) {
    const repoPath = isAbsolute(repo.path)
      ? repo.path
      : resolve(projectRoot, repo.path);

    const indexPath = join(repoPath, '.context', 'index.json');

    let indexed = false;
    let sections = 0;

    try {
      if (await fileExists(indexPath)) {
        const content = await readFile(indexPath, 'utf-8');
        const index = JSON.parse(content) as ProjectIndex;
        indexed = true;
        sections = index.files.reduce((sum, f) => sum + f.sections.length, 0);
      }
    } catch {
      // Ignore errors
    }

    results.push({
      name: repo.name,
      path: repo.path,
      indexed,
      sections,
    });
  }

  return results;
}
