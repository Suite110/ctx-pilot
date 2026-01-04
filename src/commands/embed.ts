// npx ctx-pilot embed - Add embeddings to existing index

import { configExists, loadConfig } from '../config/index.js';
import { loadIndex, saveIndex } from '../indexer/index.js';
import { generateEmbedding, isSemanticAvailable } from '../search/semantic.js';
import type { CommandContext } from './types.js';
import type { Section } from '../types.js';

export async function runEmbed(ctx: CommandContext): Promise<void> {
  const { projectRoot, args } = ctx;
  const force = args.includes('--force') || args.includes('-f');
  const verbose = args.includes('--verbose') || args.includes('-v');

  if (!(await configExists(projectRoot))) {
    console.error('Not configured. Run `npx ctx-pilot init` first.');
    process.exit(1);
  }

  const index = await loadIndex(projectRoot);

  if (!index) {
    console.error('No index found. Run `npx ctx-pilot auto-index` first.');
    process.exit(1);
  }

  console.log('Checking semantic search availability...');

  if (!(await isSemanticAvailable())) {
    console.error('\nSemantic search model not available.');
    console.error('Install with: npm install @xenova/transformers');
    console.error('\nNote: First run will download ~50MB model.');
    process.exit(1);
  }

  console.log('Model loaded successfully.\n');

  let totalSections = 0;
  let embedded = 0;
  let skipped = 0;

  for (const file of index.files) {
    for (const section of file.sections) {
      totalSections++;

      // Skip if already has embedding (unless force)
      if ((section as Section).embedding && !force) {
        skipped++;
        continue;
      }

      // Generate embedding from title + preview + keywords
      const text = [
        section.title,
        section.preview,
        section.keywords.join(' '),
      ].join(' ').slice(0, 512); // Truncate for model limits

      if (verbose) {
        console.log(`Embedding: ${file.path} - ${section.title}`);
      }

      const embedding = await generateEmbedding(text);

      if (embedding) {
        (section as Section).embedding = embedding;
        embedded++;
      }
    }
  }

  await saveIndex(projectRoot, index);

  console.log(`\nEmbedding complete!`);
  console.log(`  Total sections: ${totalSections}`);
  console.log(`  Newly embedded: ${embedded}`);
  if (skipped > 0) {
    console.log(`  Skipped (already embedded): ${skipped}`);
  }

  console.log(`\nTo use semantic search, add to .context/config.json:`);
  console.log(`  "search": { "enabled": true }`);
}
