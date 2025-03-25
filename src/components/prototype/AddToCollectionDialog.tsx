
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface Collection {
  id: string;
  name: string;
  color: string;
  prototypeCount: number;
}

interface AddToCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPrototypes: string[];
  collections: Collection[];
}

export function AddToCollectionDialog({
  open,
  onOpenChange,
  selectedPrototypes,
  collections
}: AddToCollectionDialogProps) {
  const [selectedCollectionTab, setSelectedCollectionTab] = useState<string>("existing");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionColor, setNewCollectionColor] = useState("#6366F1");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleAddToCollection = async (collectionId: string) => {
    if (selectedPrototypes.length === 0) {
      toast({
        title: "Error",
        description: "No prototypes selected",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('prototype_collections')
        .delete()
        .in('prototype_id', selectedPrototypes);
      
      if (deleteError) throw deleteError;

      const newAssociations = selectedPrototypes.map(prototypeId => ({
        prototype_id: prototypeId,
        collection_id: collectionId
      }));

      const { error: insertError } = await supabase
        .from('prototype_collections')
        .insert(newAssociations);

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: `Added ${selectedPrototypes.length} prototype(s) to collection`,
      });

      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['prototype-collections'] });
      queryClient.invalidateQueries({ queryKey: ['collections-with-counts'] });
      queryClient.invalidateQueries({ queryKey: ['prototypes'] });
    } catch (error) {
      console.error('Error adding to collection:', error);
      toast({
        title: "Error",
        description: "Failed to add to collection",
        variant: "destructive",
      });
    }
  };

  const handleCreateNewCollection = async () => {
    if (!newCollectionName.trim()) {
      toast({
        title: "Error",
        description: "Collection name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: newCollection, error: collectionError } = await supabase
        .from('collections')
        .insert({
          name: newCollectionName.trim(),
          color: newCollectionColor,
        })
        .select()
        .single();

      if (collectionError) throw collectionError;

      if (newCollection) {
        await handleAddToCollection(newCollection.id);
      }

      setNewCollectionName("");
      setNewCollectionColor("#6366F1");
      setSelectedCollectionTab("existing");
      
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['collections-with-counts'] });
    } catch (error) {
      console.error('Error creating collection:', error);
      toast({
        title: "Error",
        description: "Failed to create collection",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add to Collection</DialogTitle>
          <DialogDescription>
            Choose an existing collection or create a new one. 
            Prototypes will be moved from individual view to the collection.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={selectedCollectionTab} onValueChange={setSelectedCollectionTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Existing</TabsTrigger>
            <TabsTrigger value="new">New Collection</TabsTrigger>
          </TabsList>
          
          <TabsContent value="existing" className="py-4">
            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
              {collections.map((collection) => (
                <Button
                  key={collection.id}
                  variant="outline"
                  className="justify-between"
                  style={{ borderColor: collection.color }}
                  onClick={() => handleAddToCollection(collection.id)}
                >
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: collection.color }}
                    />
                    {collection.name}
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {collection.prototypeCount} prototype{collection.prototypeCount !== 1 ? 's' : ''}
                  </span>
                </Button>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="new" className="py-4">
            <div className="grid gap-4">
              <div className="grid w-full items-center gap-1.5">
                <Input
                  placeholder="Collection name"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={newCollectionColor}
                    onChange={(e) => setNewCollectionColor(e.target.value)}
                    className="w-12 h-8 p-1"
                  />
                  <Input
                    value={newCollectionColor}
                    onChange={(e) => setNewCollectionColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <Button onClick={handleCreateNewCollection}>
                Create and Add
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
