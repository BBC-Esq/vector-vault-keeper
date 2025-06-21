
import compromise from 'compromise';
import * as pdfjsLib from 'pdf-parse';
import mammoth from 'mammoth';

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

// Enhanced sentence splitting using compromise
const splitIntoSentences = (text: string): string[] => {
  try {
    const doc = compromise(text);
    const sentences = doc.sentences().out('array');
    return sentences.filter(s => s.trim().length > 0);
  } catch (error) {
    console.warn('Compromise failed, falling back to simple splitting:', error);
    // Fallback to simple sentence splitting
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0).map(s => s.trim() + '.');
  }
};

// Extract text from PDF file
const extractTextFromPDF = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  try {
    const pdf = await pdfjsLib(uint8Array);
    return pdf.text;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF file');
  }
};

// Extract text from DOCX file
const extractTextFromDOCX = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting DOCX text:', error);
    throw new Error('Failed to extract text from DOCX file');
  }
};

// Extract text from uploaded file
export const extractTextFromFile = async (file: File): Promise<string> => {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return extractTextFromPDF(file);
  } else if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx')
  ) {
    return extractTextFromDOCX(file);
  } else {
    throw new Error('Unsupported file type. Please upload a .txt, .pdf, or .docx file.');
  }
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
            totalChunks: 0
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
          totalChunks: 0
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
          totalChunks: 0
        }
      };
      chunks.push(chunk);
      
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
