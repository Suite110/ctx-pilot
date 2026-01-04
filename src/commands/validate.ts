// npx ctx-pilot validate

import { configExists, loadConfig } from '../config/index.js';
import { loadIndex } from '../indexer/index.js';
import { validateIndex, formatValidationResult } from '../validation/index.js';
import type { CommandContext } from './types.js';

export async function runValidate(ctx: CommandContext): Promise<void> {
  const { projectRoot } = ctx;

  if (!(await configExists(projectRoot))) {
    console.error('Not configured. Run `npx ctx-pilot init` first.');
    process.exit(1);
  }

  const config = await loadConfig(projectRoot);
  const index = await loadIndex(projectRoot);

  if (!index) {
    console.error('No index found. Run `npx ctx-pilot auto-index` first.');
    process.exit(1);
  }

  console.log('Validating index...\n');
  const result = await validateIndex(projectRoot, config, index);
  console.log(formatValidationResult(result));

  if (!result.valid) {
    process.exit(1);
  }
}
