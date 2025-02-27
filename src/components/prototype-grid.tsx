
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Grid2X2, List, Plus, Search, Trash2 } from "lucide-react";
import { PrototypeCard } from "./prototype-card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { AddPrototypeDialog } from "./add-prototype-dialog";
import type { Prototype } from "@/types/prototype";

export const PrototypeGrid = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("recent");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPrototypes, setSelectedPrototypes] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: prototypes = [], isLoading } = useQuery({
    queryKey: ['prototypes', sortBy, searchTerm],
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
        
        return (data || []).map((item): Prototype => {
          // Handle sandbox_config parsing and type conversion
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

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search prototypes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recent</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 border rounded-md">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <Grid2X2 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          {selectedPrototypes.length > 0 && (
            <>
              <Button
                variant="secondary"
                onClick={handleSelectAll}
                className="ml-2"
              >
                {selectedPrototypes.length === prototypes.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteSelected}
                className="ml-2"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected ({selectedPrototypes.length})
              </Button>
            </>
          )}
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Prototype
        </Button>
      </div>

      <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
        {prototypes.map((prototype) => (
          <div key={prototype.id} className="relative">
            <input
              type="checkbox"
              checked={selectedPrototypes.includes(prototype.id)}
              onChange={() => togglePrototypeSelection(prototype.id)}
              className="absolute top-2 left-2 z-10 h-4 w-4"
            />
            <PrototypeCard
              key={prototype.id}
              prototype={prototype}
            />
          </div>
        ))}
      </div>

      <AddPrototypeDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
    </div>
  );
};
