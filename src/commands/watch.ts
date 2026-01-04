// npx ctx-pilot watch

import { watch } from 'fs';
import { join } from 'path';
import { configExists, loadConfig } from '../config/index.js';
import { loadIndex, buildAutoIndex, saveIndex, getIndexStats } from '../indexer/index.js';
import type { CommandContext } from './types.js';

export async function runWatch(ctx: CommandContext): Promise<void> {
  const { projectRoot } = ctx;

  if (!(await configExists(projectRoot))) {
    console.error('Not configured. Run `npx ctx-pilot init` first.');
    process.exit(1);
  }

  const config = await loadConfig(projectRoot);

  console.log('Watching for file changes... (Ctrl+C to stop)\n');

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isRebuilding = false;

  const rebuild = async () => {
    if (isRebuilding) return;
    isRebuilding = true;

    try {
      const existingIndex = await loadIndex(projectRoot);
      const index = await buildAutoIndex(projectRoot, config, {}, existingIndex);
      await saveIndex(projectRoot, index);
      const stats = getIndexStats(index);
      console.log(`[${new Date().toLocaleTimeString()}] Rebuilt: ${stats.files} files, ${stats.sections} sections`);
    } catch (error) {
      console.error(`[${new Date().toLocaleTimeString()}] Error:`, (error as Error).message);
    } finally {
      isRebuilding = false;
    }
  };

  // Get directories to watch from include patterns
  const dirsToWatch = new Set<string>();
  for (const pattern of config.include) {
    // Extract the base directory from the pattern
    const parts = pattern.split('/');
    if (parts[0] === '**') {
      dirsToWatch.add('.');
    } else if (parts[0] && !parts[0].includes('*')) {
      dirsToWatch.add(parts[0]);
    } else {
      dirsToWatch.add('.');
    }
  }

  // Set up watchers
  for (const dir of dirsToWatch) {
    const watchPath = join(projectRoot, dir);
    try {
      watch(watchPath, { recursive: true }, () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(rebuild, 500);
      });
      console.log(`Watching: ${dir === '.' ? projectRoot : watchPath}`);
    } catch {
      // Directory might not exist, skip silently
    }
  }

  console.log('');

  // Keep process alive
  await new Promise(() => {});
}
