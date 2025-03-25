
import { Button } from "@/components/ui/button";
import { CollectionWithCount } from "@/types/prototype";

interface ExistingCollectionsTabProps {
  collections: CollectionWithCount[];
  onSelectCollection: (collectionId: string) => void;
}

export function ExistingCollectionsTab({ 
  collections, 
  onSelectCollection 
}: ExistingCollectionsTabProps) {
  return (
    <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
      {collections.map((collection) => (
        <Button
          key={collection.id}
          variant="outline"
          className="justify-between"
          style={{ borderColor: collection.color }}
          onClick={() => onSelectCollection(collection.id)}
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
  );
}
