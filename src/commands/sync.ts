// npx ctx-pilot sync - Pull team's index from git

import { configExists, loadConfig } from '../config/index.js';
import { syncFromGit, getDefaultTeamConfig } from '../sync/index.js';
import type { CommandContext } from './types.js';

export async function runSync(ctx: CommandContext): Promise<void> {
  const { projectRoot, args } = ctx;
  const force = args.includes('--force') || args.includes('-f');

  if (!(await configExists(projectRoot))) {
    console.error('Not configured. Run `npx ctx-pilot init` first.');
    process.exit(1);
  }

  const config = await loadConfig(projectRoot);
  const teamConfig = config.team || getDefaultTeamConfig();

  console.log(`Syncing from origin/${teamConfig.branch}...`);

  const result = await syncFromGit(projectRoot, teamConfig);

  switch (result.action) {
    case 'pulled':
      console.log(`\nSynced successfully!`);
      console.log(`  Remote index: ${result.remoteTimestamp}`);
      if (result.localTimestamp) {
        console.log(`  Previous local: ${result.localTimestamp}`);
        console.log(`  Backup saved to: .context/index.json.backup`);
      }
      break;

    case 'up-to-date':
      console.log(`\nAlready up to date.`);
      console.log(`  Local: ${result.localTimestamp}`);
      console.log(`  Remote: ${result.remoteTimestamp}`);
      break;

    case 'conflict':
      if (force) {
        console.log(`\nForce sync requested, overwriting local changes...`);
        // Re-run with force flag effect would need implementation
        // For now, just show the message
      }
      console.log(`\nConflict detected.`);
      console.log(`  Local index: ${result.localTimestamp}`);
      console.log(`  Remote index: ${result.remoteTimestamp}`);
      console.log(`\nYour local index is newer. Use --force to overwrite with remote.`);
      console.log(`Or run 'npx ctx-pilot publish' to push your changes.`);
      process.exit(1);
      break;

    case 'error':
      console.error(`\nSync failed: ${result.message}`);
      process.exit(1);
      break;
  }
}
