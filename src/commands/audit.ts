// npx ctx-pilot audit - Index Quality Report

import { configExists, loadConfig } from '../config/index.js';
import { loadIndex } from '../indexer/index.js';
import { auditIndex, formatAuditReport } from '../audit/index.js';
import type { CommandContext } from './types.js';

export async function runAudit(ctx: CommandContext): Promise<void> {
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

  const report = await auditIndex(projectRoot, config, index);
  console.log(formatAuditReport(report));

  // Exit with error code if score is very low
  if (report.score < 50) {
    process.exit(1);
  }
}
