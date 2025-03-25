
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Grid2X2, List, Plus, Search } from "lucide-react";

interface PrototypeToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  onAddPrototype: () => void;
  selectionMode: boolean;
  selectedCount: number;
  onSelectAll: () => void;
  onAddToCollection: () => void;
  onDeleteSelected: () => void;
}

export function PrototypeToolbar({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  onAddPrototype,
  selectionMode,
  selectedCount,
  onSelectAll,
  onAddToCollection,
  onDeleteSelected,
}: PrototypeToolbarProps) {
  return (
    <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
      <div className="flex items-center gap-4 flex-1 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search prototypes..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recent</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex items-center gap-1 border rounded-md">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => onViewModeChange("grid")}
          >
            <Grid2X2 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => onViewModeChange("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
        
        {selectionMode && (
          <SelectionControls 
            selectedCount={selectedCount} 
            onSelectAll={onSelectAll} 
            onAddToCollection={onAddToCollection}
            onDeleteSelected={onDeleteSelected}
          />
        )}
      </div>
      
      <Button onClick={onAddPrototype}>
        <Plus className="h-4 w-4 mr-2" />
        Add Prototype
      </Button>
    </div>
  );
}

function SelectionControls({ 
  selectedCount, 
  onSelectAll, 
  onAddToCollection, 
  onDeleteSelected 
}: { 
  selectedCount: number;
  onSelectAll: () => void;
  onAddToCollection: () => void;
  onDeleteSelected: () => void;
}) {
  return (
    <>
      <Button
        variant="secondary"
        onClick={onSelectAll}
        className="ml-2"
      >
        {selectedCount > 0 ? 'Deselect All' : 'Select All'}
      </Button>
      <Button
        variant="outline"
        onClick={onAddToCollection}
        className="ml-2"
      >
        <FolderPlus className="h-4 w-4 mr-2" />
        Add to Collection
      </Button>
      <Button
        variant="destructive"
        onClick={onDeleteSelected}
        className="ml-2"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete Selected ({selectedCount})
      </Button>
    </>
  );
}

// Import these here to avoid circular dependencies
import { FolderPlus, Trash2 } from "lucide-react";
