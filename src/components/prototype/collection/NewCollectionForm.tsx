
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NewCollectionFormProps {
  onCreateCollection: (name: string, color: string) => void;
}

export function NewCollectionForm({ onCreateCollection }: NewCollectionFormProps) {
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionColor, setNewCollectionColor] = useState("#6366F1");

  return (
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
      <Button 
        onClick={() => {
          if (newCollectionName.trim()) {
            onCreateCollection(newCollectionName.trim(), newCollectionColor);
            setNewCollectionName("");
            setNewCollectionColor("#6366F1");
          }
        }}
        disabled={!newCollectionName.trim()}
      >
        Create and Add
      </Button>
    </div>
  );
}
