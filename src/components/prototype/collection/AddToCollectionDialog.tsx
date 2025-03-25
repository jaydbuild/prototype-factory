
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
import { CollectionWithCount } from "@/types/prototype";
import { ExistingCollectionsTab } from "./collection/ExistingCollectionsTab";
import { NewCollectionForm } from "./collection/NewCollectionForm";

interface AddToCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPrototypes: string[];
  collections: CollectionWithCount[];
}

export function AddToCollectionDialog({
  open,
  onOpenChange,
  selectedPrototypes,
  collections
}: AddToCollectionDialogProps) {
  const [selectedCollectionTab, setSelectedCollectionTab] = useState<string>("existing");
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

  const handleCreateNewCollection = async (collectionName: string, collectionColor: string) => {
    try {
      const { data: newCollection, error: collectionError } = await supabase
        .from('collections')
        .insert({
          name: collectionName,
          color: collectionColor,
        })
        .select()
        .single();

      if (collectionError) throw collectionError;

      if (newCollection) {
        await handleAddToCollection(newCollection.id);
      }
      
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
            <ExistingCollectionsTab 
              collections={collections} 
              onSelectCollection={handleAddToCollection} 
            />
          </TabsContent>
          
          <TabsContent value="new" className="py-4">
            <NewCollectionForm onCreateCollection={handleCreateNewCollection} />
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
