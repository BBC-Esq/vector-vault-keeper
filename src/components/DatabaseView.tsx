
import { ArrowLeft, Plus, Search, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface DatabaseViewProps {
  database: any;
  onBack: () => void;
  onAddRecord: () => void;
  onDeleteRecord: (id: string) => void;
  onEditRecord: (record: any) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults: any[];
}

export function DatabaseView({
  database,
  onBack,
  onAddRecord,
  onDeleteRecord,
  onEditRecord,
  searchQuery,
  onSearchChange,
  searchResults
}: DatabaseViewProps) {
  const [activeTab, setActiveTab] = useState<'records' | 'search'>('records');

  const displayRecords = activeTab === 'search' ? searchResults : database.records;

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{database.name}</h1>
          <p className="text-slate-600">{database.description}</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <Button
          variant={activeTab === 'records' ? 'default' : 'outline'}
          onClick={() => setActiveTab('records')}
          className={activeTab === 'records' ? 'bg-blue-600 hover:bg-blue-700' : ''}
        >
          All Records ({database.records.length})
        </Button>
        <Button
          variant={activeTab === 'search' ? 'default' : 'outline'}
          onClick={() => setActiveTab('search')}
          className={activeTab === 'search' ? 'bg-blue-600 hover:bg-blue-700' : ''}
        >
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      {activeTab === 'search' && (
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search vectors by content or metadata..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-slate-600 mt-2">
              Found {searchResults.length} results for "{searchQuery}"
            </p>
          )}
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-slate-800">
          {activeTab === 'records' ? 'Records' : 'Search Results'}
        </h2>
        <Button onClick={onAddRecord} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Record
        </Button>
      </div>

      <div className="grid gap-4">
        {displayRecords.map((record: any) => (
          <Card key={record.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{record.content}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditRecord(record)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteRecord(record.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-3">
                {Object.entries(record.metadata || {}).map(([key, value]) => (
                  <Badge key={key} variant="secondary" className="text-xs">
                    {key}: {String(value)}
                  </Badge>
                ))}
              </div>
              <div className="text-xs text-slate-500">
                Vector: [{record.vector.slice(0, 5).map((v: number) => v.toFixed(3)).join(', ')}...]
                {activeTab === 'search' && record.similarity && (
                  <span className="ml-2 text-blue-600 font-medium">
                    Similarity: {(record.similarity * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {displayRecords.length === 0 && (
          <Card className="border-dashed border-2 border-slate-300">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-600 mb-2">
                {activeTab === 'search' ? 'No search results' : 'No records yet'}
              </h3>
              <p className="text-slate-500 mb-4">
                {activeTab === 'search' 
                  ? 'Try a different search query' 
                  : 'Add your first vector record to get started'
                }
              </p>
              {activeTab === 'records' && (
                <Button onClick={onAddRecord} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Record
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
