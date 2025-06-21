
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { chunkDocument, ChunkConfig, extractTextFromFile } from "@/utils/documentProcessor";
import { generateBatchEmbeddings } from "@/utils/embeddingService";
import { FileText, Upload, AlertCircle } from "lucide-react";

interface DocumentUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (chunks: any[]) => void;
  databaseDimensions: number;
}

export function DocumentUploadModal({ 
  open, 
  onClose, 
  onSubmit, 
  databaseDimensions 
}: DocumentUploadModalProps) {
  const [documentName, setDocumentName] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [chunkSize, setChunkSize] = useState(500);
  const [chunkOverlap, setChunkOverlap] = useState(50);
  const [preserveSentences, setPreserveSentences] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setError("");

    try {
      const text = await extractTextFromFile(file);
      setDocumentText(text);
      if (!documentName) {
        const name = file.name.replace(/\.(txt|pdf|docx)$/i, '');
        setDocumentName(name);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process file';
      setError(errorMessage);
      console.error('File processing error:', err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentName.trim() || !documentText.trim()) return;
    
    setIsProcessing(true);
    setProgress(0);
    setError("");
    
    try {
      const config: ChunkConfig = {
        chunkSize,
        chunkOverlap,
        preserveSentences
      };
      
      const documentId = Date.now().toString();
      
      // Step 1: Chunk the document
      const chunks = chunkDocument(documentText, config, documentId, documentName);
      setProgress(10);
      
      // Step 2: Generate embeddings for all chunks
      const chunkTexts = chunks.map(chunk => chunk.content);
      const embeddings = await generateBatchEmbeddings(
        chunkTexts, 
        databaseDimensions,
        (embeddingProgress) => {
          setProgress(10 + (embeddingProgress * 85));
        }
      );
      
      setProgress(95);
      
      // Step 3: Create final records
      const records = chunks.map((chunk, index) => ({
        id: chunk.id,
        content: chunk.content,
        metadata: {
          ...chunk.metadata,
          chunkConfig: config,
          originalDocumentLength: documentText.length,
          fileType: 'processed_document'
        },
        vector: embeddings[index]
      }));
      
      setProgress(100);
      onSubmit(records);
      
      // Reset form
      setDocumentName("");
      setDocumentText("");
      setProgress(0);
      onClose();
    } catch (error) {
      console.error("Error processing document:", error);
      setError("Failed to process document. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Process Document
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="file-upload">Upload Document</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".txt,.pdf,.docx"
                onChange={handleFileUpload}
                className="cursor-pointer"
                disabled={isExtracting || isProcessing}
              />
              <p className="text-xs text-slate-500">
                Upload a .txt, .pdf, or .docx file, or paste text below
              </p>
              {isExtracting && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Extracting text from file...
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="document-name">Document Name</Label>
              <Input
                id="document-name"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="My Document"
                required
                disabled={isProcessing}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="document-text">Document Text</Label>
              <Textarea
                id="document-text"
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
                placeholder="Paste your document text here or upload a file above..."
                rows={6}
                required
                disabled={isProcessing}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="chunk-size">Chunk Size (characters)</Label>
                <Input
                  id="chunk-size"
                  type="number"
                  value={chunkSize}
                  onChange={(e) => setChunkSize(Number(e.target.value))}
                  min="100"
                  max="2000"
                  disabled={isProcessing}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="chunk-overlap">Chunk Overlap</Label>
                <Input
                  id="chunk-overlap"
                  type="number"
                  value={chunkOverlap}
                  onChange={(e) => setChunkOverlap(Number(e.target.value))}
                  min="0"
                  max={Math.floor(chunkSize / 2)}
                  disabled={isProcessing}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="preserve-sentences"
                checked={preserveSentences}
                onChange={(e) => setPreserveSentences(e.target.checked)}
                className="rounded"
                disabled={isProcessing}
              />
              <Label htmlFor="preserve-sentences" className="text-sm">
                Preserve sentence boundaries (using compromise.js)
              </Label>
            </div>
            
            {isProcessing && (
              <div className="grid gap-2">
                <Label>Processing Progress</Label>
                <Progress value={progress} className="w-full" />
                <p className="text-xs text-slate-500">
                  {progress < 10 ? "Chunking document..." : 
                   progress < 95 ? "Generating semantic embeddings with e5-small-v2..." : 
                   "Finalizing..."}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing || isExtracting}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isProcessing || isExtracting || !!error}>
              {isProcessing ? "Processing..." : "Process Document"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
