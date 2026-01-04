// npx ctx-pilot hook - Install hooks for Claude Code / Gemini CLI

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { CommandContext, Environment } from './types.js';
import { ENVIRONMENTS } from './types.js';
import { detectEnvironment, parseEnvFlag } from './utils.js';

export async function installHook(ctx: CommandContext): Promise<void> {
  const { projectRoot, args } = ctx;
  const forceEnv = parseEnvFlag(args);
  const env = forceEnv || await detectEnvironment(projectRoot, ENVIRONMENTS);

  if (env === 'unknown') {
    console.log('Could not detect AI CLI environment.');
    console.log('Use --claude or --gemini flag to specify.');
    return;
  }

  const config = ENVIRONMENTS[env];
  const settingsDir = join(projectRoot, config.settingsDir);
  const settingsPath = join(settingsDir, config.settingsFile);

  await mkdir(settingsDir, { recursive: true });

  let settings: Record<string, unknown> = {};
  try {
    const content = await readFile(settingsPath, 'utf-8');
    settings = JSON.parse(content);
  } catch {
    // File doesn't exist
  }

  if (!settings.hooks) settings.hooks = {};
  const hooks = settings.hooks as Record<string, unknown[]>;
  if (!hooks[config.hookEvent]) hooks[config.hookEvent] = [];

  const eventHooks = hooks[config.hookEvent] as Array<Record<string, unknown>>;
  const hasHook = eventHooks.some((h) => {
    const hHooks = h.hooks as Array<Record<string, unknown>> | undefined;
    return hHooks?.some((hh) => String(hh.command || '').includes('ctx-pilot'));
  });

  if (hasHook) {
    console.log(`Hook already installed for ${config.name}.`);
    return;
  }

  eventHooks.push({
    matcher: '',
    hooks: [{ type: 'command', command: 'npx ctx-pilot' }],
  });

  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
  console.log(`Hook installed for ${config.name} at ${config.settingsDir}/${config.settingsFile}`);
}
