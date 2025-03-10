import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Folder, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Collection } from "@/types/prototype";

export function PrototypeCollections({ 
  selectedCollection, 
  onSelectCollection 
}: { 
  selectedCollection: string | null;
  onSelectCollection: (collectionId: string | null) => void;
}) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionColor, setNewCollectionColor] = useState("#6366F1");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch collections with prototype counts
  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['collections-with-counts'],
    queryFn: async () => {
      try {
        // First get all collections
        const { data: collectionsData, error: collectionsError } = await supabase
          .from('collections')
          .select('*')
          .order('name') as { data: Collection[] | null, error: any };

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
        }));
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

  // Create a new collection
  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      toast({
        title: "Error",
        description: "Collection name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('collections')
        .insert({
          name: newCollectionName.trim(),
          color: newCollectionColor,
        }) as { data: Collection | null, error: any };

      if (error) throw error;

      toast({
        title: "Success",
        description: "Collection created successfully",
      });

      // Reset form
      setNewCollectionName("");
      setIsCreateDialogOpen(false);
      
      // Refresh collections
      queryClient.invalidateQueries({ queryKey: ['collections-with-counts'] });
    } catch (error: any) {
      console.error('Error creating collection:', error);
      toast({
        title: "Error",
        description: "Failed to create collection",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Collections</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 px-2"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          New
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        <Badge 
          variant={selectedCollection === null ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => onSelectCollection(null)}
        >
          All Uncategorized
        </Badge>
        
        {collections.map((collection) => (
          <Badge
            key={collection.id}
            variant={selectedCollection === collection.id ? "default" : "outline"}
            className="cursor-pointer flex items-center"
            style={{ backgroundColor: selectedCollection === collection.id ? collection.color : 'transparent' }}
            onClick={() => onSelectCollection(collection.id)}
          >
            <Folder className="h-3 w-3 mr-1" />
            {collection.name}
            <span className="ml-1 opacity-70 text-xs">
              ({collection.prototypeCount || 0})
            </span>
          </Badge>
        ))}
      </div>

      {/* Create Collection Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Collection</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="color" className="text-right">
                Color
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="color"
                  type="color"
                  value={newCollectionColor}
                  onChange={(e) => setNewCollectionColor(e.target.value)}
                  className="w-12 h-8 p-1"
                />
                <div className="flex-1">
                  <Input
                    value={newCollectionColor}
                    onChange={(e) => setNewCollectionColor(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCollection}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PrototypeCollectionTag({ 
  prototypeId, 
  collectionId, 
  onRemove 
}: { 
  prototypeId: string;
  collectionId: string;
  onRemove: () => void;
}) {
  // Fetch collection details
  const { data: collection } = useQuery({
    queryKey: ['collection', collectionId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('collections')
          .select('*')
          .eq('id', collectionId)
          .single() as { data: Collection | null, error: any };

        if (error) throw error;
        return data as Collection;
      } catch (error) {
        console.error('Error fetching collection:', error);
        return null;
      }
    }
  });

  if (!collection) return null;

  return (
    <Badge 
      variant="outline" 
      className="flex items-center gap-1" 
      style={{ borderColor: collection.color, color: collection.color }}
    >
      <Folder className="h-3 w-3" />
      {collection.name}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="ml-1 rounded-full hover:bg-muted p-0.5"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}
