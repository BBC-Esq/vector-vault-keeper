import { pipeline, AutoTokenizer, AutoModel } from '@xenova/transformers';

export interface EmbeddingConfig {
  modelName: string;
  dimensions?: number;
  batchSize: number;
  device: 'cpu' | 'gpu';
}

export class EmbeddingService {
  private pipeline: any;
  private config: EmbeddingConfig;
  private isInitialized = false;

  constructor(config: EmbeddingConfig = {
    modelName: 'Xenova/all-MiniLM-L6-v2', // Good default embedding model
    batchSize: 8,
    device: 'cpu'
  }) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log(`Loading embedding model: ${this.config.modelName}`);
    
    try {
      this.pipeline = await pipeline('feature-extraction', this.config.modelName, {
        quantized: true, // Use quantized model for better performance
        progress_callback: (progress: any) => {
          if (progress.status === 'downloading') {
            console.log(`Downloading: ${Math.round(progress.progress * 100)}%`);
          }
        }
      });
      
      this.isInitialized = true;
      console.log('Embedding model loaded successfully');
    } catch (error) {
      console.error('Failed to load embedding model:', error);
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Clean and prepare text
      const cleanText = text.trim().replace(/\s+/g, ' ');
      
      // Generate embedding
      const output = await this.pipeline(cleanText, {
        pooling: 'mean',
        normalize: true
      });
      
      // Convert to regular array
      return Array.from(output.data);
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  async generateBatchEmbeddings(
    texts: string[],
    onProgress?: (progress: number, currentText?: string) => void
  ): Promise<number[][]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const embeddings: number[][] = [];
    const { batchSize } = this.config;

    // Process in batches for better performance
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      try {
        // Process batch
        const batchEmbeddings = await Promise.all(
          batch.map(text => this.generateEmbedding(text))
        );
        
        embeddings.push(...batchEmbeddings);
        
        if (onProgress) {
          const progress = Math.min((i + batchSize) / texts.length, 1);
          onProgress(progress, batch[0]); // Show first text in batch
        }
      } catch (error) {
        console.error(`Error processing batch starting at index ${i}:`, error);
        // Add empty embeddings for failed batch
        embeddings.push(...batch.map(() => []));
      }
    }

    return embeddings;
  }

  // Get embedding dimensions (useful for vector stores)
  async getDimensions(): Promise<number> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const testEmbedding = await this.generateEmbedding("test");
    return testEmbedding.length;
  }

  // Calculate cosine similarity between embeddings
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have the same dimensions');
    }
    
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  // Find most similar embeddings
  static findMostSimilar(
    queryEmbedding: number[],
    embeddings: number[][],
    topK: number = 5
  ): Array<{ index: number; similarity: number }> {
    const similarities = embeddings.map((embedding, index) => ({
      index,
      similarity: this.cosineSimilarity(queryEmbedding, embedding)
    }));
    
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }
}

// Factory function to maintain backward compatibility
export const createEmbeddingService = (config?: Partial<EmbeddingConfig>): EmbeddingService => {
  return new EmbeddingService(config as EmbeddingConfig);
};

// Legacy functions for backward compatibility
export const generateEmbedding = async (text: string, dimensions?: number): Promise<number[]> => {
  const service = createEmbeddingService();
  return service.generateEmbedding(text);
};

export const generateBatchEmbeddings = async (
  texts: string[],
  dimensions?: number,
  onProgress?: (progress: number) => void
): Promise<number[][]> => {
  const service = createEmbeddingService();
  return service.generateBatchEmbeddings(texts, onProgress);
};