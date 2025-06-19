
import { Database, Search, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  databases: any[];
  onSelectDatabase: (id: string) => void;
  selectedDatabase?: string;
}

export function Sidebar({ activeView, onViewChange, databases, onSelectDatabase, selectedDatabase }: SidebarProps) {
  return (
    <div className="w-64 bg-slate-900 text-white min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6 text-blue-400" />
          VectorDB
        </h1>
        <p className="text-slate-400 text-sm mt-1">Vector Database Manager</p>
      </div>

      <nav className="space-y-2 mb-8">
        <button
          onClick={() => onViewChange('dashboard')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
            activeView === 'dashboard' 
              ? "bg-blue-600 text-white" 
              : "text-slate-300 hover:bg-slate-800"
          )}
        >
          <Database className="h-4 w-4" />
          Dashboard
        </button>
        
        <button
          onClick={() => onViewChange('search')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
            activeView === 'search' 
              ? "bg-blue-600 text-white" 
              : "text-slate-300 hover:bg-slate-800"
          )}
        >
          <Search className="h-4 w-4" />
          Search
        </button>
      </nav>

      <div className="border-t border-slate-700 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-300">Databases</h3>
          <button
            onClick={() => onViewChange('create-db')}
            className="p-1 hover:bg-slate-800 rounded"
          >
            <Plus className="h-4 w-4 text-slate-400" />
          </button>
        </div>
        
        <div className="space-y-1">
          {databases.map((db) => (
            <button
              key={db.id}
              onClick={() => onSelectDatabase(db.id)}
              className={cn(
                "w-full text-left px-3 py-2 rounded text-sm transition-colors",
                selectedDatabase === db.id
                  ? "bg-blue-600/20 text-blue-300"
                  : "text-slate-400 hover:bg-slate-800"
              )}
            >
              {db.name}
              <div className="text-xs text-slate-500">{db.records.length} records</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
