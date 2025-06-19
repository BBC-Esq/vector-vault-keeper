
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface AddRecordModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { content: string; metadata: any; vector: number[] }) => void;
  databaseDimensions: number;
  editRecord?: any;
}

export function AddRecordModal({ 
  open, 
  onClose, 
  onSubmit, 
  databaseDimensions,
  editRecord 
}: AddRecordModalProps) {
  const [content, setContent] = useState(editRecord?.content || "");
  const [metadata, setMetadata] = useState(
    editRecord?.metadata ? JSON.stringify(editRecord.metadata, null, 2) : ""
  );
  const [vectorInput, setVectorInput] = useState(
    editRecord?.vector ? editRecord.vector.join(", ") : ""
  );

  const generateRandomVector = () => {
    const vector = Array.from({ length: databaseDimensions }, () => 
      (Math.random() - 0.5) * 2
    );
    setVectorInput(vector.map(v => v.toFixed(6)).join(", "));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      let parsedMetadata = {};
      if (metadata.trim()) {
        try {
          parsedMetadata = JSON.parse(metadata);
        } catch (error) {
          alert("Invalid JSON in metadata field");
          return;
        }
      }

      let vector: number[] = [];
      if (vectorInput.trim()) {
        try {
          vector = vectorInput.split(",").map(v => parseFloat(v.trim()));
          if (vector.length !== databaseDimensions) {
            alert(`Vector must have exactly ${databaseDimensions} dimensions`);
            return;
          }
        } catch (error) {
          alert("Invalid vector format");
          return;
        }
      } else {
        // Generate random vector if none provided
        vector = Array.from({ length: databaseDimensions }, () => 
          (Math.random() - 0.5) * 2
        );
      }

      onSubmit({
        content: content.trim(),
        metadata: parsedMetadata,
        vector
      });
      
      setContent("");
      setMetadata("");
      setVectorInput("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{editRecord ? 'Edit Record' : 'Add New Record'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter the content for this vector record..."
                rows={3}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="metadata">Metadata (JSON)</Label>
              <Textarea
                id="metadata"
                value={metadata}
                onChange={(e) => setMetadata(e.target.value)}
                placeholder='{"category": "example", "tags": ["tag1", "tag2"]}'
                rows={3}
              />
            </div>
            
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="vector">Vector ({databaseDimensions} dimensions)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateRandomVector}
                >
                  Generate Random
                </Button>
              </div>
              <Textarea
                id="vector"
                value={vectorInput}
                onChange={(e) => setVectorInput(e.target.value)}
                placeholder="0.1, 0.2, 0.3, ... (comma-separated values)"
                rows={3}
              />
              <p className="text-xs text-slate-500">
                Leave empty to generate a random vector
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {editRecord ? 'Update Record' : 'Add Record'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
