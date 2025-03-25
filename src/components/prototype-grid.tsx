
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddPrototypeDialog } from "./add-prototype-dialog";
import { PrototypeCollections } from "./prototype-collections";
import { PrototypeToolbar } from "./prototype/PrototypeToolbar";
import { PrototypeCardList } from "./prototype/PrototypeCardList";
import { AddToCollectionDialog } from "./prototype/AddToCollectionDialog";
import type { Prototype, Collection, CollectionWithCount } from "@/types/prototype";

interface PrototypeCollection {
  prototype_id: string;
  collection_id: string;
}

export const PrototypeGrid = () => {
  // State for view, sort, search and selection
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("recent");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPrototypes, setSelectedPrototypes] = useState<string[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [isAddToCollectionDialogOpen, setIsAddToCollectionDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for prototype-collection mappings
  const { data: prototypeCollections = {} } = useQuery({
    queryKey: ['prototype-collections'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('prototype_collections')
          .select('prototype_id, collection_id') as { data: PrototypeCollection[] | null, error: any };

        if (error) throw error;

        const mapping: Record<string, string[]> = {};
        (data || []).forEach(item => {
          if (!mapping[item.prototype_id]) {
            mapping[item.prototype_id] = [];
          }
          mapping[item.prototype_id].push(item.collection_id);
        });
        
        return mapping;
      } catch (error) {
        console.error('Error fetching prototype collections:', error);
        return {};
      }
    }
  });

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

  // Query for prototypes
  const { data: prototypes = [], isLoading } = useQuery({
    queryKey: ['prototypes', sortBy, searchTerm, selectedCollection, prototypeCollections],
    queryFn: async () => {
      try {
        let query = supabase
          .from('prototypes')
          .select('*');

        if (searchTerm) {
          query = query.ilike('name', `%${searchTerm}%`);
        }

        if (sortBy === 'recent') {
          query = query.order('created_at', { ascending: false });
        } else {
          query = query.order('name');
        }

        const { data, error } = await query;

        if (error) throw error;
        
        let filteredData = data || [];
        
        // Filter by collection if one is selected
        if (selectedCollection) {
          filteredData = filteredData.filter(item => {
            const prototypeCollectionIds = prototypeCollections[item.id] || [];
            return prototypeCollectionIds.includes(selectedCollection);
          });
        } else {
          // Only show prototypes not in any collection in the "All" view
          filteredData = filteredData.filter(item => {
            return !prototypeCollections[item.id] || prototypeCollections[item.id].length === 0;
          });
        }
        
        // Transform data to match Prototype type
        return filteredData.map((item): Prototype => {
          let parsedSandboxConfig: Record<string, unknown> | null = null;
          if (item.sandbox_config) {
            if (typeof item.sandbox_config === 'string') {
              try {
                parsedSandboxConfig = JSON.parse(item.sandbox_config);
              } catch {
                console.warn('Failed to parse sandbox_config:', item.sandbox_config);
              }
            } else if (typeof item.sandbox_config === 'object') {
              parsedSandboxConfig = item.sandbox_config as Record<string, unknown>;
            }
          }

          return {
            id: item.id,
            name: item.name,
            created_at: item.created_at,
            created_by: item.created_by,
            url: item.url,
            preview_url: item.preview_url,
            preview_title: item.preview_title,
            preview_description: item.preview_description,
            preview_image: item.preview_image,
            deployment_status: item.deployment_status as 'pending' | 'processing' | 'deployed' | 'failed',
            deployment_url: item.deployment_url,
            file_path: item.file_path,
            bundle_path: item.bundle_path,
            processed_at: item.processed_at,
            status: item.status,
            figma_url: item.figma_url,
            sandbox_config: parsedSandboxConfig
          };
        });
      } catch (error: any) {
        console.error('Error fetching prototypes:', error);
        toast({
          title: "Error",
          description: "Failed to fetch prototypes",
          variant: "destructive",
        });
        return [];
      }
    },
  });

  // Selection handlers
  const handleDeleteSelected = async () => {
    try {
      const { error } = await supabase.functions.invoke('delete-prototypes', {
        body: { prototypeIds: selectedPrototypes }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Deleted ${selectedPrototypes.length} prototype(s)`,
      });

      setSelectedPrototypes([]);
      queryClient.invalidateQueries({ queryKey: ['prototypes'] });
      queryClient.invalidateQueries({ queryKey: ['prototype-collections'] });
    } catch (error: any) {
      console.error('Error deleting prototypes:', error);
      toast({
        title: "Error",
        description: "Failed to delete prototypes",
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = () => {
    if (selectedPrototypes.length === prototypes.length) {
      setSelectedPrototypes([]);
    } else {
      setSelectedPrototypes(prototypes.map(p => p.id));
    }
  };

  const togglePrototypeSelection = (id: string) => {
    setSelectedPrototypes(prev => 
      prev.includes(id) 
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

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
