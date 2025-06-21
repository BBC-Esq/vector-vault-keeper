
import { pipeline } from '@huggingface/transformers';

let embeddingPipeline: any = null;

// Initialize the embedding pipeline
const initializeEmbeddingPipeline = async () => {
  if (!embeddingPipeline) {
    console.log('Initializing embedding pipeline...');
    embeddingPipeline = await pipeline(
      'feature-extraction',
      'Xenova/e5-small-v2',
      { device: 'webgpu' }
    );
    console.log('Embedding pipeline initialized');
  }
  return embeddingPipeline;
};

// Generate real semantic embeddings using e5-small-v2
export const generateEmbedding = async (text: string, dimensions: number): Promise<number[]> => {
  try {
    const pipeline = await initializeEmbeddingPipeline();
    
    // Prefix text for e5 model (improves performance)
    const prefixedText = `query: ${text}`;
    
    // Generate embedding
    const result = await pipeline(prefixedText, {
      pooling: 'mean',
      normalize: true
    });
    
    // Convert to regular array and ensure correct dimensions
    let embedding = Array.from(result.data);
    
    // If dimensions don't match, truncate or pad
    if (embedding.length !== dimensions) {
      if (embedding.length > dimensions) {
        embedding = embedding.slice(0, dimensions);
      } else {
        // Pad with zeros if too short
        while (embedding.length < dimensions) {
          embedding.push(0);
        }
      }
    }
    
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    // Fallback to hash-based embedding if transformers fail
    return generateHashBasedEmbedding(text, dimensions);
  }
};

// Fallback hash-based embedding (original implementation)
const generateHashBasedEmbedding = (text: string, dimensions: number): number[] => {
  const words = text.toLowerCase().split(/\s+/);
  const embedding = new Array(dimensions).fill(0);
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    let hash1 = 0;
    for (let j = 0; j < word.length; j++) {
      hash1 = ((hash1 << 5) - hash1) + word.charCodeAt(j);
      hash1 = hash1 & hash1;
    }
    
    let hash2 = i * 31 + word.length;
    
    for (let dim = 0; dim < dimensions; dim++) {
      const seed = hash1 + hash2 + dim;
      embedding[dim] += Math.sin(seed) * Math.cos(seed * 0.7) * (1 / Math.sqrt(words.length));
    }
  }
  
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;
};

// Batch embedding generation for multiple chunks
export const generateBatchEmbeddings = async (
  texts: string[], 
  dimensions: number,
  onProgress?: (progress: number) => void
): Promise<number[][]> => {
  const embeddings: number[][] = [];
  
  for (let i = 0; i < texts.length; i++) {
    const embedding = await generateEmbedding(texts[i], dimensions);
    embeddings.push(embedding);
    
    if (onProgress) {
      onProgress((i + 1) / texts.length);
    }
  }
  
  return embeddings;
};
