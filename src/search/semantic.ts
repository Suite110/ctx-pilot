// Semantic Search - embedding-based similarity search
// Uses @xenova/transformers for local inference (optional dependency)

import type { ProjectIndex, Section, ScoredSection } from '../types.js';

export interface SemanticSearchConfig {
  enabled: boolean;
  model: string;
  weight: number; // 0-1, how much to weight semantic vs keyword
}

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

// Lazy-loaded transformer instance
let pipeline: EmbeddingProvider | null = null;
let loadError: Error | null = null;
let isLoading = false;
let loadPromise: Promise<EmbeddingProvider | null> | null = null;

async function loadTransformers(): Promise<EmbeddingProvider | null> {
  if (pipeline) return pipeline;
  if (loadError) return null;
  if (loadPromise) return loadPromise;

  isLoading = true;
  loadPromise = (async () => {
    try {
      // Dynamic import - only loads if semantic search is used
      // Use Function constructor to avoid TypeScript checking the module
      const importFn = new Function('specifier', 'return import(specifier)');
      const transformers = await importFn('@xenova/transformers');
      const { pipeline: transformerPipeline } = transformers;

      const embedder = await transformerPipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        quantized: true, // Use quantized model for smaller size
      });

      pipeline = {
        async embed(text: string): Promise<number[]> {
          const output = await embedder(text, { pooling: 'mean', normalize: true });
          return Array.from(output.data as Float32Array);
        },
        async embedBatch(texts: string[]): Promise<number[][]> {
          const results: number[][] = [];
          for (const text of texts) {
            const output = await embedder(text, { pooling: 'mean', normalize: true });
            results.push(Array.from(output.data as Float32Array));
          }
          return results;
        },
      };

      return pipeline;
    } catch (error) {
      loadError = error as Error;
      console.error('Failed to load semantic search model:', (error as Error).message);
      console.error('Install with: npm install @xenova/transformers');
      return null;
    } finally {
      isLoading = false;
    }
  })();

  return loadPromise;
}

export async function isSemanticAvailable(): Promise<boolean> {
  const provider = await loadTransformers();
  return provider !== null;
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const provider = await loadTransformers();
  if (!provider) return null;

  try {
    return await provider.embed(text);
  } catch (error) {
    console.error('Embedding generation failed:', (error as Error).message);
    return null;
  }
}

export async function generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  const provider = await loadTransformers();
  if (!provider) return texts.map(() => null);

  try {
    return await provider.embedBatch(texts);
  } catch (error) {
    console.error('Batch embedding generation failed:', (error as Error).message);
    return texts.map(() => null);
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

export async function semanticSearch(
  index: ProjectIndex,
  query: string,
  config: SemanticSearchConfig,
  options?: { maxResults?: number }
): Promise<ScoredSection[]> {
  if (!config.enabled) return [];

  const queryEmbedding = await generateEmbedding(query);
  if (!queryEmbedding) return [];

  const results: ScoredSection[] = [];

  for (const file of index.files) {
    for (const section of file.sections) {
      const sectionEmbedding = (section as Section & { embedding?: number[] }).embedding;
      if (!sectionEmbedding) continue;

      const similarity = cosineSimilarity(queryEmbedding, sectionEmbedding);

      if (similarity > 0.3) { // Minimum similarity threshold
        results.push({
          file: file.path,
          section,
          score: similarity,
        });
      }
    }
  }

  // Sort by similarity descending
  results.sort((a, b) => b.score - a.score);

  if (options?.maxResults) {
    return results.slice(0, options.maxResults);
  }

  return results;
}

export function hybridScore(
  keywordScore: number,
  semanticScore: number,
  semanticWeight: number
): number {
  return semanticScore * semanticWeight + keywordScore * (1 - semanticWeight);
}

export function getDefaultSemanticConfig(): SemanticSearchConfig {
  return {
    enabled: false,
    model: 'all-MiniLM-L6-v2',
    weight: 0.6, // 60% semantic, 40% keyword
  };
}
