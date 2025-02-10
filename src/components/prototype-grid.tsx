
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Grid2X2, List, Search } from "lucide-react";
import { PrototypeCard } from "./prototype-card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { AddPrototypeDialog } from "./add-prototype-dialog";

export const PrototypeGrid = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("recent");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: prototypes, isLoading } = useQuery({
    queryKey: ['prototypes', sortBy, searchTerm],
    queryFn: async () => {
      try {
        let query = supabase
          .from('prototypes')
          .select(`
            id,
            name,
            url,
            preview_url,
            created_at,
            prototype_tags (
              tags (
                name
              )
            )
          `);

        // Add search filter if searchTerm exists
        if (searchTerm) {
          query = query.ilike('name', `%${searchTerm}%`);
        }

        // Add sorting
        if (sortBy === 'recent') {
          query = query.order('created_at', { ascending: false });
        } else if (sortBy === 'name') {
          query = query.order('name');
        }

        const { data, error } = await query;

        if (error) {
          toast({
            variant: "destructive",
            title: "Error fetching prototypes",
            description: error.message
          });
          throw error;
        }

        return data;
      } catch (error) {
        console.error('Error fetching prototypes:', error);
        toast({
          variant: "destructive",
          title: "Error fetching prototypes",
          description: "Failed to load prototypes. Please try again."
        });
        return [];
      }
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading prototypes...</div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-7xl mx-auto px-4 animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-semibold">Prototypes</h1>
        <AddPrototypeDialog />
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search prototypes..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-4 w-full sm:w-auto">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
                className="rounded-r-none"
              >
                <Grid2X2 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
                className="rounded-l-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className={`grid gap-6 ${
          viewMode === "grid" 
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" 
            : "grid-cols-1"
        }`}>
          {prototypes?.map((prototype) => (
            <PrototypeCard
              key={prototype.id}
              title={prototype.name}
              previewUrl={prototype.preview_url || 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b'}
              sourceUrl={prototype.url}
              timestamp={new Date(prototype.created_at)}
              commentCount={0}
              tags={prototype.prototype_tags?.map(pt => pt.tags.name) || []}
              onClick={() => console.log("Clicked:", prototype.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
