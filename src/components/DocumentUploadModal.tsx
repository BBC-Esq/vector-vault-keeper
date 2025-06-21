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
import { chunkDocument, ChunkConfig } from "@/utils/documentProcessor";
import { EmbeddingService } from "@/utils/embeddingService"; // Changed this import
import { FileText, Upload } from "lucide-react";

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
  const [progress, setProgress] = useState(0);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setDocumentText(text);
        if (!documentName) {
          setDocumentName(file.name.replace('.txt', ''));
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentName.trim() || !documentText.trim()) return;
    
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const config: ChunkConfig = {
        chunkSize,
        chunkOverlap,
        preserveSentences
      };
      
      const documentId = Date.now().toString();
      
      // Step 1: Chunk the document
      const chunks = chunkDocument(documentText, config, documentId, documentName, 'txt'); // Added fileType parameter
      setProgress(25);
      
      // Step 2: Generate embeddings using the new service
      const embeddingService = new EmbeddingService(); // Create service instance
      const chunkTexts = chunks.map(chunk => chunk.content);
      const embeddings = await embeddingService.generateBatchEmbeddings( // Use the class method
        chunkTexts,
        (embeddingProgress) => {
          setProgress(25 + (embeddingProgress * 75));
        }
      );
      
      // Step 3: Create final records
      const records = chunks.map((chunk, index) => ({
        id: chunk.id,
        content: chunk.content,
        metadata: {
          ...chunk.metadata,
          chunkConfig: config,
          originalDocumentLength: documentText.length
        },
        vector: embeddings[index]
      }));
      
      onSubmit(records);
      
      // Reset form
      setDocumentName("");
      setDocumentText("");
      setProgress(0);
      onClose();
    } catch (error) {
      console.error("Error processing document:", error);
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
              <Label htmlFor="file-upload">Upload Text File</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
              <p className="text-xs text-slate-500">
                Upload a .txt file or paste text below
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="document-name">Document Name</Label>
              <Input
                id="document-name"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="My Document"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="document-text">Document Text</Label>
              <Textarea
                id="document-text"
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
                placeholder="Paste your document text here..."
                rows={6}
                required
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
              />
              <Label htmlFor="preserve-sentences" className="text-sm">
                Preserve sentence boundaries
              </Label>
            </div>
            
            {isProcessing && (
              <div className="grid gap-2">
                <Label>Processing Progress</Label>
                <Progress value={progress} className="w-full" />
                <p className="text-xs text-slate-500">
                  {progress < 25 ? "Chunking document..." : 
                   progress < 100 ? "Generating embeddings..." : "Finalizing..."}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isProcessing}>
              {isProcessing ? "Processing..." : "Process Document"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}