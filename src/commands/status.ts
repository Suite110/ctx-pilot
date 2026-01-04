// npx ctx-pilot status

import { readFile } from 'fs/promises';
import { join } from 'path';
import { configExists, loadConfig } from '../config/index.js';
import { loadIndex, getIndexStats } from '../indexer/index.js';
import type { CommandContext } from './types.js';
import { ENVIRONMENTS } from './types.js';
import { pathExists, detectEnvironment } from './utils.js';
import { EXPORT_CONFIGS } from './export.js';

export async function runStatus(ctx: CommandContext): Promise<void> {
  const { projectRoot } = ctx;

  if (!(await configExists(projectRoot))) {
    console.log('Status: Not configured');
    console.log('Run `npx ctx-pilot init` to set up.');
    return;
  }

  const config = await loadConfig(projectRoot);
  const index = await loadIndex(projectRoot);
  const env = await detectEnvironment(projectRoot, ENVIRONMENTS);

  console.log('Status: Configured');
  console.log(`Environment: ${env !== 'unknown' ? ENVIRONMENTS[env].name : 'Unknown'}`);
  console.log(`\nConfig (.context/config.json):`);
  console.log(`  Pinned: ${config.pinned.length > 0 ? config.pinned.join(', ') : '(none)'}`);
  console.log(`  Include: ${config.include.join(', ')}`);
  console.log(`  Exclude: ${config.exclude.length > 0 ? config.exclude.join(', ') : '(none)'}`);

  if (index) {
    const stats = getIndexStats(index);
    console.log(`\nIndex (.context/index.json):`);
    console.log(`  Files: ${stats.files}`);
    console.log(`  Sections: ${stats.sections}`);
    console.log(`  Keywords: ${stats.totalKeywords.toLocaleString()} total, ${stats.uniqueKeywords.toLocaleString()} unique`);
    console.log(`  Avg sections/file: ${stats.avgSectionsPerFile}`);
    if (stats.emptyFiles > 0) {
      console.log(`  Empty files: ${stats.emptyFiles}`);
    }
    console.log(`  Last updated: ${index.lastUpdated}`);
  } else {
    console.log(`\nIndex: Not built yet.`);
  }

  // Check hooks
  console.log(`\nHooks:`);
  for (const [, envConfig] of Object.entries(ENVIRONMENTS)) {
    const settingsPath = join(projectRoot, envConfig.settingsDir, envConfig.settingsFile);
    if (await pathExists(settingsPath)) {
      try {
        const content = await readFile(settingsPath, 'utf-8');
        const settings = JSON.parse(content);
        const hooks = settings.hooks?.[envConfig.hookEvent] || [];
        const hasHook = hooks.some((h: Record<string, unknown>) => {
          const hHooks = h.hooks as Array<Record<string, unknown>> | undefined;
          return hHooks?.some((hh) => String(hh.command || '').includes('ctx-pilot'));
        });
        console.log(`  ${envConfig.name}: ${hasHook ? 'Installed' : 'Not installed'}`);
      } catch {
        console.log(`  ${envConfig.name}: Error reading settings`);
      }
    }
  }

  // Check exports
  console.log(`\nExports:`);
  for (const [, exportConfig] of Object.entries(EXPORT_CONFIGS)) {
    const exists = await pathExists(join(projectRoot, exportConfig.outputPath));
    if (exists) {
      console.log(`  ${exportConfig.name}: ${exportConfig.outputPath}`);
    }
  }
}
