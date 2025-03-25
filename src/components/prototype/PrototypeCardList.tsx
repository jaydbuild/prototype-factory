
import React from 'react';
import { PrototypeCard } from "@/components/prototype-card";
import { PrototypeCollectionTag } from "@/components/prototype-collections";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Prototype } from "@/types/prototype";
import { useIsMobile } from "@/hooks/use-mobile";

interface PrototypeCardListProps {
  prototypes: Prototype[];
  viewMode: "grid" | "list";
  prototypeCollections: Record<string, string[]>;
  selectedPrototypes: string[];
  togglePrototypeSelection: (id: string) => void;
  collectionId?: string;
}

export function PrototypeCardList({
  prototypes,
  viewMode,
  prototypeCollections,
  selectedPrototypes,
  togglePrototypeSelection,
  collectionId
}: PrototypeCardListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const handleRemoveFromCollection = async (prototypeId: string, collectionId: string) => {
    try {
      await supabase
        .from('prototype_collections')
        .delete()
        .eq('prototype_id', prototypeId)
        .eq('collection_id', collectionId);
      
      queryClient.invalidateQueries({ queryKey: ['prototype-collections'] });
      queryClient.invalidateQueries({ queryKey: ['collections-with-counts'] });
      queryClient.invalidateQueries({ queryKey: ['prototypes'] });
      
      toast({
        title: "Success",
        description: "Removed from collection",
      });
    } catch (error) {
      console.error('Error removing from collection:', error);
      toast({
        title: "Error",
        description: "Failed to remove from collection",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
      {prototypes.map((prototype) => (
        <div key={prototype.id} className="relative">
          <input
            type="checkbox"
            checked={selectedPrototypes.includes(prototype.id)}
            onChange={() => togglePrototypeSelection(prototype.id)}
            className="absolute top-2 left-2 z-10 h-4 w-4"
          />
          <div className="absolute top-2 right-2 z-10 flex flex-wrap gap-1 max-w-[70%] justify-end">
            {(prototypeCollections[prototype.id] || [])?.map(colId => (
              <div key={colId} onClick={(e) => e.stopPropagation()}>
                <PrototypeCollectionTag 
                  prototypeId={prototype.id}
                  collectionId={colId}
                  onRemove={() => handleRemoveFromCollection(prototype.id, colId)}
                />
              </div>
            ))}
          </div>
          <PrototypeCard
            key={prototype.id}
            prototype={prototype}
            collectionId={collectionId}
          />
        </div>
      ))}
      
      {prototypes.length === 0 && (
        <div className={`col-span-full flex items-center justify-center h-40 ${viewMode === "list" ? "w-full" : ""}`}>
          <div className="text-center">
            <p className="text-muted-foreground">No prototypes found</p>
          </div>
        </div>
      )}
    </div>
  );
}
