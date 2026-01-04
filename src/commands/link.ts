// npx ctx-pilot link <path> - Link external repository
// npx ctx-pilot unlink <name> - Unlink repository
// npx ctx-pilot links - List linked repositories

import { configExists, loadConfig } from '../config/index.js';
import { linkRepo, unlinkRepo, listLinkedRepos } from '../multi-repo/index.js';
import type { CommandContext } from './types.js';

export async function runLink(ctx: CommandContext): Promise<void> {
  const { projectRoot, args } = ctx;

  if (!(await configExists(projectRoot))) {
    console.error('Not configured. Run `npx ctx-pilot init` first.');
    process.exit(1);
  }

  // Get path argument (first non-flag arg after 'link')
  const pathArg = args.find(a => !a.startsWith('-') && a !== 'link');

  if (!pathArg) {
    console.error('Usage: npx ctx-pilot link <path> [--name <name>]');
    process.exit(1);
  }

  // Get optional name
  const nameIndex = args.indexOf('--name');
  const name = nameIndex !== -1 ? args[nameIndex + 1] : undefined;

  const result = await linkRepo(projectRoot, pathArg, name);

  if (result.success) {
    console.log(result.message);
    console.log('\nRun `npx ctx-pilot links` to see all linked repos.');
  } else {
    console.error(result.message);
    process.exit(1);
  }
}

export async function runUnlink(ctx: CommandContext): Promise<void> {
  const { projectRoot, args } = ctx;

  if (!(await configExists(projectRoot))) {
    console.error('Not configured. Run `npx ctx-pilot init` first.');
    process.exit(1);
  }

  // Get name argument
  const name = args.find(a => !a.startsWith('-') && a !== 'unlink');

  if (!name) {
    console.error('Usage: npx ctx-pilot unlink <name>');
    process.exit(1);
  }

  const result = await unlinkRepo(projectRoot, name);

  if (result.success) {
    console.log(result.message);
  } else {
    console.error(result.message);
    process.exit(1);
  }
}

export async function runLinks(ctx: CommandContext): Promise<void> {
  const { projectRoot } = ctx;

  if (!(await configExists(projectRoot))) {
    console.error('Not configured. Run `npx ctx-pilot init` first.');
    process.exit(1);
  }

  const config = await loadConfig(projectRoot);
  const repos = await listLinkedRepos(projectRoot, config);

  if (repos.length === 0) {
    console.log('No linked repositories.');
    console.log('\nLink a repo with: npx ctx-pilot link <path>');
    return;
  }

  console.log('Linked Repositories:');
  console.log('');

  for (const repo of repos) {
    const status = repo.indexed
      ? `${repo.sections} sections`
      : 'not indexed';
    console.log(`  ${repo.name}`);
    console.log(`    Path: ${repo.path}`);
    console.log(`    Status: ${status}`);
    console.log('');
  }
}
