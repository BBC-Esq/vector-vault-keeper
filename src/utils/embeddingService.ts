
// Simple text to vector conversion - in production, use OpenAI, Cohere, or Hugging Face
export const generateEmbedding = async (text: string, dimensions: number): Promise<number[]> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Create a more sophisticated hash-based embedding that considers word content
  const words = text.toLowerCase().split(/\s+/);
  const embedding = new Array(dimensions).fill(0);
  
  // Use multiple hash functions to create more diverse embeddings
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Hash 1: Character codes
    let hash1 = 0;
    for (let j = 0; j < word.length; j++) {
      hash1 = ((hash1 << 5) - hash1) + word.charCodeAt(j);
      hash1 = hash1 & hash1; // Convert to 32-bit integer
    }
    
    // Hash 2: Word position influence
    let hash2 = i * 31 + word.length;
    
    // Distribute across embedding dimensions
    for (let dim = 0; dim < dimensions; dim++) {
      const seed = hash1 + hash2 + dim;
      embedding[dim] += Math.sin(seed) * Math.cos(seed * 0.7) * (1 / Math.sqrt(words.length));
    }
  }
  
  // Normalize the embedding vector
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
