// npx ctx-pilot publish - Push index to team via git

import { configExists, loadConfig } from '../config/index.js';
import { publishToGit, getDefaultTeamConfig } from '../sync/index.js';
import type { CommandContext } from './types.js';

export async function runPublish(ctx: CommandContext): Promise<void> {
  const { projectRoot, args } = ctx;

  if (!(await configExists(projectRoot))) {
    console.error('Not configured. Run `npx ctx-pilot init` first.');
    process.exit(1);
  }

  const config = await loadConfig(projectRoot);
  const teamConfig = config.team || getDefaultTeamConfig();

  // Check for custom commit message
  const messageIndex = args.indexOf('-m') !== -1 ? args.indexOf('-m') : args.indexOf('--message');
  const commitMessage = messageIndex !== -1 ? args[messageIndex + 1] : undefined;

  console.log(`Publishing to origin/${teamConfig.branch}...`);

  const result = await publishToGit(projectRoot, teamConfig, commitMessage);

  switch (result.action) {
    case 'pushed':
      console.log(`\nPublished successfully!`);
      console.log(`Team members can run 'npx ctx-pilot sync' to get the latest index.`);
      break;

    case 'no-changes':
      console.log(`\nNo changes to publish.`);
      console.log(`The index is already committed and pushed.`);
      break;

    case 'error':
      console.error(`\nPublish failed: ${result.message}`);
      console.log(`\nMake sure you have push permissions to origin/${teamConfig.branch}.`);
      process.exit(1);
      break;
  }
}
