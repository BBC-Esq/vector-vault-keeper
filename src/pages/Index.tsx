import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { DatabaseView } from "@/components/DatabaseView";
import { CreateDatabaseModal } from "@/components/CreateDatabaseModal";
import { AddRecordModal } from "@/components/AddRecordModal";
import { DocumentUploadModal } from "@/components/DocumentUploadModal";
import { useToast } from "@/hooks/use-toast";

// Cosine similarity function
const cosineSimilarity = (a: number[], b: number[]): number => {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
};

// Simple text to vector conversion (for demo purposes)
const textToVector = (text: string, dimensions: number): number[] => {
  const hash = text.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return Array.from({ length: dimensions }, (_, i) => 
    Math.sin(hash + i) * 0.5
  );
};

const Index = () => {
  const [databases, setDatabases] = useState([
    {
      id: "1",
      name: "Product Embeddings",
      description: "Vector embeddings for product search and recommendations",
      dimensions: 384,
      records: [
        {
          id: "1",
          content: "Wireless Bluetooth headphones with noise cancellation",
          metadata: { category: "electronics", price: 199.99, brand: "TechCorp" },
          vector: Array.from({ length: 384 }, () => (Math.random() - 0.5) * 2)
        },
        {
          id: "2", 
          content: "Organic cotton t-shirt in navy blue",
          metadata: { category: "clothing", price: 29.99, brand: "EcoWear" },
          vector: Array.from({ length: 384 }, () => (Math.random() - 0.5) * 2)
        }
      ]
    }
  ]);
  
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedDatabase, setSelectedDatabase] = useState<string>();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const { toast } = useToast();

  const handleCreateDatabase = (data: { name: string; description: string; dimensions: number }) => {
    const newDatabase = {
      id: Date.now().toString(),
      name: data.name,
      description: data.description,
      dimensions: data.dimensions,
      records: []
    };
    
    setDatabases(prev => [...prev, newDatabase]);
    toast({
      title: "Database created",
      description: `${data.name} has been created successfully.`,
    });
  };

  const handleDeleteDatabase = (id: string) => {
    setDatabases(prev => prev.filter(db => db.id !== id));
    if (selectedDatabase === id) {
      setSelectedDatabase(undefined);
      setActiveView('dashboard');
    }
    toast({
      title: "Database deleted",
      description: "The database has been deleted successfully.",
    });
  };

  const handleSelectDatabase = (id: string) => {
    setSelectedDatabase(id);
    setActiveView('database');
  };

  const getCurrentDatabase = () => {
    return databases.find(db => db.id === selectedDatabase);
  };

  const handleAddRecord = (data: { content: string; metadata: any; vector: number[] }) => {
    if (!selectedDatabase) return;
    
    const newRecord = {
      id: Date.now().toString(),
      content: data.content,
      metadata: data.metadata,
      vector: data.vector
    };

    setDatabases(prev => prev.map(db => 
      db.id === selectedDatabase 
        ? { ...db, records: [...db.records, newRecord] }
        : db
    ));

    toast({
      title: "Record added",
      description: "New vector record has been added successfully.",
    });
  };

  const handleProcessDocument = (chunks: any[]) => {
    if (!selectedDatabase) return;

    setDatabases(prev => prev.map(db => 
      db.id === selectedDatabase 
        ? { ...db, records: [...db.records, ...chunks] }
        : db
    ));

    toast({
      title: "Document processed",
      description: `${chunks.length} chunks have been added to the database.`,
    });
  };

  const handleEditRecord = (record: any) => {
    setEditRecord(record);
    setShowAddRecordModal(true);
  };

  const handleUpdateRecord = (data: { content: string; metadata: any; vector: number[] }) => {
    if (!selectedDatabase || !editRecord) return;
    
    const updatedRecord = {
      ...editRecord,
      content: data.content,
      metadata: data.metadata,
      vector: data.vector
    };

    setDatabases(prev => prev.map(db => 
      db.id === selectedDatabase 
        ? { 
            ...db, 
            records: db.records.map(record => 
              record.id === editRecord.id ? updatedRecord : record
            )
          }
        : db
    ));

    setEditRecord(null);
    toast({
      title: "Record updated",
      description: "Vector record has been updated successfully.",
    });
  };

  const handleDeleteRecord = (recordId: string) => {
    if (!selectedDatabase) return;
    
    setDatabases(prev => prev.map(db => 
      db.id === selectedDatabase 
        ? { ...db, records: db.records.filter(record => record.id !== recordId) }
        : db
    ));

    toast({
      title: "Record deleted",
      description: "Vector record has been deleted successfully.",
    });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim() || !selectedDatabase) {
      setSearchResults([]);
      return;
    }

    const currentDb = getCurrentDatabase();
    if (!currentDb) return;

    const queryVector = textToVector(query, currentDb.dimensions);
    
    const results = currentDb.records
      .map(record => ({
        ...record,
        similarity: cosineSimilarity(queryVector, record.vector)
      }))
      .filter(record => 
        record.similarity > 0.1 ||
        record.content.toLowerCase().includes(query.toLowerCase()) ||
        JSON.stringify(record.metadata).toLowerCase().includes(query.toLowerCase())
      )
      .sort((a, b) => b.similarity - a.similarity);

    setSearchResults(results);
  };

  const currentDatabase = getCurrentDatabase();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        databases={databases}
        onSelectDatabase={handleSelectDatabase}
        selectedDatabase={selectedDatabase}
      />
      
      <div className="flex-1">
        {activeView === 'dashboard' && (
          <Dashboard
            databases={databases}
            onCreateDatabase={() => setShowCreateModal(true)}
            onSelectDatabase={handleSelectDatabase}
            onDeleteDatabase={handleDeleteDatabase}
          />
        )}
        
        {activeView === 'database' && currentDatabase && (
          <DatabaseView
            database={currentDatabase}
            onBack={() => setActiveView('dashboard')}
            onAddRecord={() => setShowAddRecordModal(true)}
            onProcessDocument={() => setShowDocumentModal(true)}
            onDeleteRecord={handleDeleteRecord}
            onEditRecord={handleEditRecord}
            searchQuery={searchQuery}
            onSearchChange={handleSearch}
            searchResults={searchResults}
          />
        )}

        {activeView === 'create-db' && (
          <div className="p-6">
            <button
              onClick={() => setActiveView('dashboard')}
              className="mb-4 text-blue-600 hover:text-blue-700"
            >
              ← Back to Dashboard
            </button>
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">Create New Database</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
              >
                Create Database
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateDatabaseModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateDatabase}
      />

      <AddRecordModal
        open={showAddRecordModal}
        onClose={() => {
          setShowAddRecordModal(false);
          setEditRecord(null);
        }}
        onSubmit={editRecord ? handleUpdateRecord : handleAddRecord}
        databaseDimensions={currentDatabase?.dimensions || 384}
        editRecord={editRecord}
      />

      <DocumentUploadModal
        open={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        onSubmit={handleProcessDocument}
        databaseDimensions={currentDatabase?.dimensions || 384}
      />
    </div>
  );
};

export default Index;
