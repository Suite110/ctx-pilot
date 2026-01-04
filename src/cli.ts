#!/usr/bin/env node

import {
  runInit,
  runStatus,
  runAutoIndex,
  runValidate,
  runAudit,
  runSearch,
  runWatch,
  installHook,
  runExport,
  runHook,
  runSync,
  runPublish,
  runAuditLog,
  runStats,
  runEmbed,
  runLink,
  runUnlink,
  runLinks,
  printHelp,
} from './commands/index.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const projectRoot = process.cwd();
  const ctx = { projectRoot, args };

  switch (args[0]) {
    case 'init':
      await runInit(ctx);
      break;
    case 'status':
      await runStatus(ctx);
      break;
    case 'auto-index':
    case 'index':
      await runAutoIndex(ctx);
      break;
    case 'embed':
      await runEmbed(ctx);
      break;
    case 'validate':
      await runValidate(ctx);
      break;
    case 'audit':
      await runAudit(ctx);
      break;
    case 'search':
      await runSearch(ctx);
      break;
    case 'watch':
      await runWatch(ctx);
      break;
    case 'sync':
      await runSync(ctx);
      break;
    case 'publish':
      await runPublish(ctx);
      break;
    case 'audit-log':
      await runAuditLog(ctx);
      break;
    case 'stats':
      await runStats(ctx);
      break;
    case 'link':
      await runLink(ctx);
      break;
    case 'unlink':
      await runUnlink(ctx);
      break;
    case 'links':
      await runLinks(ctx);
      break;
    case 'hook':
    case 'install':
    case 'install-hook':
      await installHook(ctx);
      break;
    case 'export':
      await runExport(ctx);
      break;
    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;
    default:
      await runHook();
  }
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
