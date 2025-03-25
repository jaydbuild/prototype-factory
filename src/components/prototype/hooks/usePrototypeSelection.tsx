
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Prototype } from "@/types/prototype";

export function usePrototypeSelection(prototypes: Prototype[]) {
  const [selectedPrototypes, setSelectedPrototypes] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  return {
    selectedPrototypes,
    togglePrototypeSelection,
    handleSelectAll,
    handleDeleteSelected
  };
}
