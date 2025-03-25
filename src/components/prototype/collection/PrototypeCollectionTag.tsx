
import { Badge } from "@/components/ui/badge";
import { Folder, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Collection } from "@/types/prototype";

interface PrototypeCollectionTagProps {
  prototypeId: string;
  collectionId: string;
  onRemove: () => void;
}

export function PrototypeCollectionTag({ 
  prototypeId, 
  collectionId, 
  onRemove 
}: PrototypeCollectionTagProps) {
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
