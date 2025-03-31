import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CollectionWithCount } from "@/types/prototype";
import { CollectionList } from "./CollectionList";
import { CreateCollectionDialog } from "./CreateCollectionDialog";
import { PrototypeCollectionTag } from "./PrototypeCollectionTag";

interface PrototypeCollectionsProps {
  selectedCollection: string | null;
  onSelectCollection: (id: string | null) => void;
  hideHeadline?: boolean;
}

export function PrototypeCollections({ 
  selectedCollection, 
  onSelectCollection,
  hideHeadline = false
}: PrototypeCollectionsProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch collections with prototype counts
  const { data: collections = [], isLoading } = useQuery<CollectionWithCount[]>({
    queryKey: ['collections-with-counts'],
    queryFn: async () => {
      try {
        // First get all collections
        const { data: collectionsData, error: collectionsError } = await supabase
          .from('collections')
          .select('*')
          .order('name') as { data: CollectionWithCount[] | null, error: any };

        if (collectionsError) throw collectionsError;
        
        // Get counts for each collection by querying prototype_collections directly
        const { data: countsData, error: countsError } = await supabase
          .from('prototype_collections')
          .select('collection_id, prototype_id');
          
        if (countsError) throw countsError;
        
        // Process counts client-side
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
      } catch (error: any) {
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

  return (
    <div className="mb-6">
      {!hideHeadline && (
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Collections</h2>
          <CreateCollectionDialog />
        </div>
      )}
      
      <div className="flex flex-wrap gap-2">
        <CollectionTag 
          isSelected={selectedCollection === null}
          onClick={() => onSelectCollection(null)}
        >
          All Prototypes
        </CollectionTag>
        
        <CollectionList 
          selectedCollection={selectedCollection} 
          onSelectCollection={onSelectCollection} 
        />
      </div>
    </div>
  );
}

export { PrototypeCollectionTag };
