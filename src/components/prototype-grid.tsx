
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AddPrototypeDialog } from "./add-prototype-dialog";
import { PrototypeCollections } from "./prototype/collection/PrototypeCollections";
import { PrototypeToolbar } from "./prototype/PrototypeToolbar";
import { PrototypeCardList } from "./prototype/PrototypeCardList";
import { AddToCollectionDialog } from "./prototype/collection/AddToCollectionDialog";
import { usePrototypeData } from "./prototype/hooks/usePrototypeData";
import { usePrototypeSelection } from "./prototype/hooks/usePrototypeSelection";
import { CollectionWithCount } from "@/types/prototype";
import { useToast } from "@/hooks/use-toast";

export const PrototypeGrid = () => {
  // State for view, sort, search and selection
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("recent");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [isAddToCollectionDialogOpen, setIsAddToCollectionDialogOpen] = useState(false);
  
  const { toast } = useToast();

  // Query for collections with counts
  const { data: collections = [] } = useQuery<CollectionWithCount[]>({
    queryKey: ['collections-with-counts'],
    queryFn: async () => {
      try {
        const { data: collectionsData, error: collectionsError } = await supabase
          .from('collections')
          .select('*')
          .order('name') as { data: Collection[] | null, error: any };

        if (collectionsError) throw collectionsError;
        
        const { data: countsData, error: countsError } = await supabase
          .from('prototype_collections')
          .select('collection_id, prototype_id');
          
        if (countsError) throw countsError;
        
        const countMap: Record<string, number> = {};
        (countsData || []).forEach((item: any) => {
          if (!countMap[item.collection_id]) {
            countMap[item.collection_id] = 0;
          }
          countMap[item.collection_id]++;
        });
        
        return (collectionsData || []).map(collection => ({
          ...collection,
          prototypeCount: countMap[collection.id] || 0
        })) as CollectionWithCount[];
      } catch (error) {
        console.error('Error fetching collections with counts:', error);
        toast({
          title: "Error",
          description: "Failed to fetch collections",
          variant: "destructive",
        });
        return [];
      }
    }
  });

  // Use our custom hooks for data fetching and selection management
  const { prototypes, prototypeCollections, isLoading } = usePrototypeData(
    sortBy, 
    searchTerm, 
    selectedCollection
  );
  
  const { 
    selectedPrototypes, 
    togglePrototypeSelection, 
    handleSelectAll, 
    handleDeleteSelected 
  } = usePrototypeSelection(prototypes);

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-40">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-foreground"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <PrototypeCollections 
        selectedCollection={selectedCollection}
        onSelectCollection={setSelectedCollection}
      />

      <PrototypeToolbar 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortBy={sortBy}
        onSortChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAddPrototype={() => setIsAddDialogOpen(true)}
        selectionMode={selectedPrototypes.length > 0}
        selectedCount={selectedPrototypes.length}
        onSelectAll={handleSelectAll}
        onAddToCollection={() => setIsAddToCollectionDialogOpen(true)}
        onDeleteSelected={handleDeleteSelected}
      />

      <PrototypeCardList 
        prototypes={prototypes}
        viewMode={viewMode}
        prototypeCollections={prototypeCollections}
        selectedPrototypes={selectedPrototypes}
        togglePrototypeSelection={togglePrototypeSelection}
        collectionId={selectedCollection || undefined}
      />

      <AddToCollectionDialog 
        open={isAddToCollectionDialogOpen}
        onOpenChange={setIsAddToCollectionDialogOpen}
        selectedPrototypes={selectedPrototypes}
        collections={collections}
      />

      <AddPrototypeDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
    </div>
  );
};
