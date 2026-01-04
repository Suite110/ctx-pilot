// Shared utilities for commands

import { access } from 'fs/promises';
import { join } from 'path';
import type { Environment, ENVIRONMENTS } from './types.js';

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function detectEnvironment(
  projectRoot: string,
  environments: typeof ENVIRONMENTS
): Promise<Environment> {
  const claudeExists = await pathExists(join(projectRoot, '.claude'));
  const geminiExists = await pathExists(join(projectRoot, '.gemini'));

  if (claudeExists && geminiExists) {
    const claudeSettings = await pathExists(join(projectRoot, '.claude', 'settings.json'));
    const geminiSettings = await pathExists(join(projectRoot, '.gemini', 'settings.json'));
    if (claudeSettings && !geminiSettings) return 'claude';
    if (geminiSettings && !claudeSettings) return 'gemini';
    return 'claude';
  }

  if (claudeExists) return 'claude';
  if (geminiExists) return 'gemini';

  if (process.env.CLAUDE_CODE || process.env.ANTHROPIC_API_KEY) return 'claude';
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) return 'gemini';

  return 'claude';
}

export function parseEnvFlag(args: string[]): Environment | undefined {
  if (args.includes('--claude')) return 'claude';
  if (args.includes('--gemini')) return 'gemini';
  return undefined;
}
