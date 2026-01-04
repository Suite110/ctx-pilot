// Command registry - exports all commands for cli.ts

export { runInit } from './init.js';
export { runStatus } from './status.js';
export { runAutoIndex } from './auto-index.js';
export { runValidate } from './validate.js';
export { runSearch } from './search.js';
export { runWatch } from './watch.js';
export { installHook } from './hook.js';
export { runExport } from './export.js';
export { runHook } from './run-hook.js';
export { runAudit } from './audit.js';
export { runSync } from './sync.js';
export { runPublish } from './publish.js';
export { runAuditLog } from './audit-log.js';
export { runStats } from './stats.js';
export { runEmbed } from './embed.js';
export { runLink, runUnlink, runLinks } from './link.js';

// Re-export types
export type { CommandContext, Environment, ExportTarget } from './types.js';
export { ENVIRONMENTS } from './types.js';

// Help text
export function printHelp(): void {
  console.log(`ctx-pilot - Intelligent context management for AI coding assistants

Supported:
  Dynamic hooks: Claude Code, Gemini CLI
  Static exports: Cursor, Windsurf, Aider

Usage:
  npx ctx-pilot                Run as hook (reads from stdin)
  npx ctx-pilot init           Create config and install hook
  npx ctx-pilot status         Show config, index, and hook status
  npx ctx-pilot auto-index     Build index from source files
  npx ctx-pilot embed          Add semantic embeddings to index
  npx ctx-pilot validate       Check index for issues
  npx ctx-pilot audit          Score index quality with recommendations
  npx ctx-pilot search <query> Test what matches a query
  npx ctx-pilot watch          Auto-rebuild on file changes

Team Sync (enterprise):
  npx ctx-pilot sync           Pull team's index from git
  npx ctx-pilot publish        Push index to team via git

Analytics (enterprise):
  npx ctx-pilot stats          View usage statistics
  npx ctx-pilot audit-log      View suggestion history (compliance)

Multi-Repo (enterprise):
  npx ctx-pilot link <path>    Link external repository
  npx ctx-pilot unlink <name>  Unlink repository
  npx ctx-pilot links          List linked repositories

Hooks (dynamic, per-prompt):
  npx ctx-pilot hook           Install hook (auto-detects Claude/Gemini)
  npx ctx-pilot hook --claude  Install for Claude Code
  npx ctx-pilot hook --gemini  Install for Gemini CLI

Exports (static files):
  npx ctx-pilot export --cursor    Generate .cursorrules
  npx ctx-pilot export --windsurf  Generate .windsurfrules
  npx ctx-pilot export --aider     Generate .aider.context.md
  npx ctx-pilot export --mdc       Generate .cursor/rules/ctx-pilot.mdc

Options:
  --verbose, -v    Show detailed output (for auto-index)
  --force, -f      Force full rebuild (ignore cache)

Config file: .context/config.json
Index file:  .context/index.json
`);
}
