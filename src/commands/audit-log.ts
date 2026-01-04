// npx ctx-pilot audit-log - View and manage audit log

import { configExists, loadConfig } from '../config/index.js';
import {
  readAuditLog,
  clearAuditLog,
  enforceRetention,
  formatAuditLog,
  getDefaultAuditLogConfig,
} from '../audit-log/index.js';
import type { CommandContext } from './types.js';

export async function runAuditLog(ctx: CommandContext): Promise<void> {
  const { projectRoot, args } = ctx;

  if (!(await configExists(projectRoot))) {
    console.error('Not configured. Run `npx ctx-pilot init` first.');
    process.exit(1);
  }

  const config = await loadConfig(projectRoot);
  const auditConfig = config.auditLog || getDefaultAuditLogConfig();

  if (!auditConfig.enabled) {
    console.log('Audit log is not enabled.');
    console.log('\nTo enable, add to .context/config.json:');
    console.log('  "auditLog": { "enabled": true }');
    return;
  }

  // Handle subcommands
  if (args.includes('--clear')) {
    const removed = await clearAuditLog(projectRoot, auditConfig);
    console.log(removed === -1 ? 'Audit log cleared.' : `Removed ${removed} entries.`);
    return;
  }

  if (args.includes('--enforce-retention')) {
    const removed = await enforceRetention(projectRoot, auditConfig);
    console.log(`Removed ${removed} entries older than ${auditConfig.retention}.`);
    return;
  }

  if (args.includes('--export')) {
    const format = args.includes('--json') ? 'json' : 'csv';
    const entries = await readAuditLog(projectRoot, auditConfig);

    if (format === 'json') {
      console.log(JSON.stringify(entries, null, 2));
    } else {
      // CSV format
      console.log('timestamp,event,user,prompt_hash,files,score,files_changed');
      for (const entry of entries) {
        const files = entry.files?.join(';') || '';
        console.log(`${entry.ts},${entry.event},${entry.user},${entry.prompt_hash || ''},${files},${entry.score || ''},${entry.files_changed || ''}`);
      }
    }
    return;
  }

  // Default: show recent entries
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 50;

  const entries = await readAuditLog(projectRoot, auditConfig, { limit });

  if (entries.length === 0) {
    console.log('No audit log entries.');
    return;
  }

  console.log(`Audit Log (last ${entries.length} entries)`);
  console.log('='.repeat(40));
  console.log(formatAuditLog(entries));
  console.log('');
  console.log(`Total: ${entries.length} entries`);
  console.log(`Retention: ${auditConfig.retention}`);
}
