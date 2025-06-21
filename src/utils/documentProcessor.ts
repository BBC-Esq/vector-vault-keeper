
export interface ChunkConfig {
  chunkSize: number;
  chunkOverlap: number;
  preserveSentences: boolean;
}

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    documentId: string;
    documentName: string;
    chunkIndex: number;
    startPosition: number;
    endPosition: number;
    totalChunks: number;
  };
}

// Simple sentence splitter - in production, you'd use a proper NLP library
const splitIntoSentences = (text: string): string[] => {
  return text.split(/[.!?]+/).filter(s => s.trim().length > 0).map(s => s.trim() + '.');
};

export const chunkDocument = (
  text: string,
  config: ChunkConfig,
  documentId: string,
  documentName: string
): DocumentChunk[] => {
  const chunks: DocumentChunk[] = [];
  
  if (config.preserveSentences) {
    const sentences = splitIntoSentences(text);
    let currentChunk = '';
    let chunkIndex = 0;
    let startPosition = 0;
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
      
      if (potentialChunk.length > config.chunkSize && currentChunk.length > 0) {
        // Create chunk
        const chunk: DocumentChunk = {
          id: `${documentId}_chunk_${chunkIndex}`,
          content: currentChunk.trim(),
          metadata: {
            documentId,
            documentName,
            chunkIndex,
            startPosition,
            endPosition: startPosition + currentChunk.length,
            totalChunks: 0 // Will be updated later
          }
        };
        chunks.push(chunk);
        
        // Handle overlap
        const overlapText = currentChunk.slice(-config.chunkOverlap);
        currentChunk = overlapText + ' ' + sentence;
        startPosition = chunk.metadata.endPosition - config.chunkOverlap;
        chunkIndex++;
      } else {
        currentChunk = potentialChunk;
      }
    }
    
    // Add the last chunk if it has content
    if (currentChunk.trim().length > 0) {
      const chunk: DocumentChunk = {
        id: `${documentId}_chunk_${chunkIndex}`,
        content: currentChunk.trim(),
        metadata: {
          documentId,
          documentName,
          chunkIndex,
          startPosition,
          endPosition: startPosition + currentChunk.length,
          totalChunks: 0 // Will be updated later
        }
      };
      chunks.push(chunk);
    }
  } else {
    // Simple character-based chunking
    let position = 0;
    let chunkIndex = 0;
    
    while (position < text.length) {
      const endPosition = Math.min(position + config.chunkSize, text.length);
      const chunkContent = text.slice(position, endPosition);
      
      const chunk: DocumentChunk = {
        id: `${documentId}_chunk_${chunkIndex}`,
        content: chunkContent,
        metadata: {
          documentId,
          documentName,
          chunkIndex,
          startPosition: position,
          endPosition,
          totalChunks: 0 // Will be updated later
        }
      };
      chunks.push(chunk);
      
      // Move position with overlap consideration
      position = endPosition - config.chunkOverlap;
      chunkIndex++;
    }
  }
  
  // Update total chunks count
  chunks.forEach(chunk => {
    chunk.metadata.totalChunks = chunks.length;
  });
  
  return chunks;
};
