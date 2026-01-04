// npx ctx-pilot stats - View usage statistics

import { configExists, loadConfig } from '../config/index.js';
import {
  getAnalyticsStats,
  clearAnalytics,
  formatAnalyticsStats,
  getDefaultAnalyticsConfig,
} from '../analytics/index.js';
import type { CommandContext } from './types.js';

export async function runStats(ctx: CommandContext): Promise<void> {
  const { projectRoot, args } = ctx;

  if (!(await configExists(projectRoot))) {
    console.error('Not configured. Run `npx ctx-pilot init` first.');
    process.exit(1);
  }

  const config = await loadConfig(projectRoot);
  const analyticsConfig = config.analytics || getDefaultAnalyticsConfig();

  // Handle clear subcommand
  if (args.includes('--clear')) {
    await clearAnalytics(projectRoot);
    console.log('Analytics data cleared.');
    return;
  }

  // Get days parameter
  const daysArg = args.find(a => a.startsWith('--days='));
  const days = daysArg ? parseInt(daysArg.split('=')[1], 10) : 30;

  const stats = await getAnalyticsStats(projectRoot, days);
  console.log(formatAnalyticsStats(stats));

  if (!analyticsConfig.enabled && stats.totalSuggestions === 0) {
    console.log('');
    console.log('To start collecting usage data, enable analytics in .context/config.json:');
    console.log('  "analytics": { "enabled": true }');
  }
}
