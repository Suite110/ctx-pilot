// Team Index Sync - git-based sync

import { readFile, writeFile, stat, copyFile } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { TeamConfig, ProjectIndex } from '../types.js';

const execAsync = promisify(exec);

export interface SyncResult {
  success: boolean;
  action: 'pulled' | 'up-to-date' | 'conflict' | 'error';
  message: string;
  localTimestamp?: string;
  remoteTimestamp?: string;
}

export interface PublishResult {
  success: boolean;
  action: 'pushed' | 'no-changes' | 'error';
  message: string;
}

async function isGitRepo(projectRoot: string): Promise<boolean> {
  try {
    await execAsync('git rev-parse --is-inside-work-tree', { cwd: projectRoot });
    return true;
  } catch {
    return false;
  }
}

async function gitPull(projectRoot: string, branch: string): Promise<void> {
  try {
    await execAsync(`git fetch origin ${branch}`, { cwd: projectRoot });
  } catch (error) {
    throw new Error(`Failed to fetch from remote: ${(error as Error).message}`);
  }
}

async function getRemoteFileContent(
  projectRoot: string,
  branch: string,
  filePath: string
): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      `git show origin/${branch}:${filePath}`,
      { cwd: projectRoot, maxBuffer: 10 * 1024 * 1024 }
    );
    return stdout;
  } catch {
    return null;
  }
}

async function getLocalFileContent(projectRoot: string, filePath: string): Promise<string | null> {
  try {
    return await readFile(join(projectRoot, filePath), 'utf-8');
  } catch {
    return null;
  }
}

function parseIndexTimestamp(content: string): Date | null {
  try {
    const index = JSON.parse(content) as ProjectIndex;
    return new Date(index.lastUpdated);
  } catch {
    return null;
  }
}

export async function syncFromGit(
  projectRoot: string,
  config: TeamConfig
): Promise<SyncResult> {
  const { branch, path: indexPath } = config;

  // Check if we're in a git repo
  if (!(await isGitRepo(projectRoot))) {
    return {
      success: false,
      action: 'error',
      message: 'Not a git repository',
    };
  }

  try {
    // Fetch latest from remote
    await gitPull(projectRoot, branch);

    // Get remote index content
    const remoteContent = await getRemoteFileContent(projectRoot, branch, indexPath);
    if (!remoteContent) {
      return {
        success: false,
        action: 'error',
        message: `No index found at ${indexPath} on origin/${branch}`,
      };
    }

    // Get local index content
    const localContent = await getLocalFileContent(projectRoot, indexPath);
    const localTimestamp = localContent ? parseIndexTimestamp(localContent) : null;
    const remoteTimestamp = parseIndexTimestamp(remoteContent);

    if (!remoteTimestamp) {
      return {
        success: false,
        action: 'error',
        message: 'Remote index has invalid format',
      };
    }

    // Compare timestamps
    if (localTimestamp && localTimestamp >= remoteTimestamp) {
      return {
        success: true,
        action: 'up-to-date',
        message: 'Local index is up to date with remote',
        localTimestamp: localTimestamp.toISOString(),
        remoteTimestamp: remoteTimestamp.toISOString(),
      };
    }

    // Check for local modifications that would be overwritten
    if (localTimestamp && localTimestamp > remoteTimestamp) {
      return {
        success: false,
        action: 'conflict',
        message: 'Local index is newer than remote. Use --force to overwrite.',
        localTimestamp: localTimestamp.toISOString(),
        remoteTimestamp: remoteTimestamp.toISOString(),
      };
    }

    // Backup local index if it exists
    if (localContent) {
      const backupPath = join(projectRoot, indexPath + '.backup');
      await copyFile(join(projectRoot, indexPath), backupPath);
    }

    // Write remote content to local
    await writeFile(join(projectRoot, indexPath), remoteContent, 'utf-8');

    return {
      success: true,
      action: 'pulled',
      message: `Synced index from origin/${branch}`,
      localTimestamp: localTimestamp?.toISOString(),
      remoteTimestamp: remoteTimestamp.toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      action: 'error',
      message: (error as Error).message,
    };
  }
}

export async function publishToGit(
  projectRoot: string,
  config: TeamConfig,
  commitMessage?: string
): Promise<PublishResult> {
  const { branch, path: indexPath } = config;

  // Check if we're in a git repo
  if (!(await isGitRepo(projectRoot))) {
    return {
      success: false,
      action: 'error',
      message: 'Not a git repository',
    };
  }

  try {
    // Check if index exists
    try {
      await stat(join(projectRoot, indexPath));
    } catch {
      return {
        success: false,
        action: 'error',
        message: `No local index found at ${indexPath}`,
      };
    }

    // Check if there are changes to the index
    const { stdout: diffOutput } = await execAsync(
      `git diff --name-only -- ${indexPath}`,
      { cwd: projectRoot }
    );

    const { stdout: untrackedOutput } = await execAsync(
      `git ls-files --others --exclude-standard -- ${indexPath}`,
      { cwd: projectRoot }
    );

    if (!diffOutput.trim() && !untrackedOutput.trim()) {
      // Check if it's staged
      const { stdout: stagedOutput } = await execAsync(
        `git diff --cached --name-only -- ${indexPath}`,
        { cwd: projectRoot }
      );

      if (!stagedOutput.trim()) {
        return {
          success: true,
          action: 'no-changes',
          message: 'No changes to publish',
        };
      }
    }

    // Stage the index file
    await execAsync(`git add ${indexPath}`, { cwd: projectRoot });

    // Commit
    const message = commitMessage || `Update ctx-pilot index\n\nGenerated by ctx-pilot`;
    await execAsync(
      `git commit -m "${message.replace(/"/g, '\\"')}"`,
      { cwd: projectRoot }
    );

    // Push
    await execAsync(`git push origin ${branch}`, { cwd: projectRoot });

    return {
      success: true,
      action: 'pushed',
      message: `Published index to origin/${branch}`,
    };
  } catch (error) {
    return {
      success: false,
      action: 'error',
      message: (error as Error).message,
    };
  }
}

export function getDefaultTeamConfig(): TeamConfig {
  return {
    remote: 'git',
    branch: 'main',
    path: '.context/index.json',
  };
}
