// npx ctx-pilot search <query>

import { configExists, loadConfig } from '../config/index.js';
import { loadIndex } from '../indexer/index.js';
import { searchSections, extractTopics } from '../search/index.js';
import type { CommandContext } from './types.js';

export async function runSearch(ctx: CommandContext): Promise<void> {
  const { projectRoot, args } = ctx;

  // Remove the 'search' command itself from args
  const queryArgs = args.filter(a => a !== 'search');
  const query = queryArgs.join(' ');

  if (!query) {
    console.error('Usage: ctx-pilot search <query>');
    process.exit(1);
  }

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

  const topics = extractTopics(query);
  console.log(`Topics extracted: ${topics.length > 0 ? topics.join(', ') : '(none)'}`);

  if (topics.length === 0) {
    console.log('\nNo searchable topics found in query.');
    return;
  }

  const results = searchSections(index, topics.join(' '), { maxResults: 20 });

  if (results.length === 0) {
    console.log('\nNo matches found.');
    return;
  }

  const minScore = config.minScore ?? 1.0;
  console.log(`\nResults (${results.length} matches, threshold: ${minScore}):\n`);

  for (const r of results) {
    const marker = r.score >= minScore ? '✓' : '✗';
    console.log(`${marker} [${r.score.toFixed(2)}] ${r.file}:${r.section.lineStart} - ${r.section.title}`);
    console.log(`  Keywords: ${r.section.keywords.slice(0, 5).join(', ')}`);
  }

  const passing = results.filter((r) => r.score >= minScore).length;
  console.log(`\n${passing} of ${results.length} results pass threshold.`);
}
