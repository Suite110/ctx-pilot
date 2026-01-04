// npx ctx-pilot auto-index

import { configExists, loadConfig } from '../config/index.js';
import { loadIndex, buildAutoIndex, saveIndex, getIndexStats } from '../indexer/index.js';
import type { CommandContext } from './types.js';

export async function runAutoIndex(ctx: CommandContext): Promise<void> {
  const { projectRoot, args } = ctx;
  const verbose = args.includes('--verbose') || args.includes('-v');
  const force = args.includes('--force') || args.includes('-f');

  if (!(await configExists(projectRoot))) {
    console.error('Not configured. Run `npx ctx-pilot init` first.');
    process.exit(1);
  }

  const config = await loadConfig(projectRoot);
  const existingIndex = await loadIndex(projectRoot);

  console.log('Building auto-index...');
  if (verbose) {
    console.log('');
  }

  const index = await buildAutoIndex(projectRoot, config, { verbose, force }, existingIndex);
  await saveIndex(projectRoot, index);

  const stats = getIndexStats(index);
  console.log(`\nAuto-index complete!`);
  console.log(`  Files: ${stats.files}`);
  console.log(`  Sections: ${stats.sections}`);
  console.log(`\nTip: AI can enhance this index with better keywords and previews.`);
  console.log(`Run \`npx ctx-pilot validate\` to check for issues.`);
}
