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
import { UploadPrototypeDialog } from "./upload-prototype-dialog";

export const PrototypeGrid = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("recent");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: prototypes = [], isLoading } = useQuery({
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
            preview_title,
            preview_description,
            preview_image,
            deployment_status,
            deployment_url,
            created_at
          `);

        if (searchTerm) {
          query = query.ilike('name', `%${searchTerm}%`);
        }

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

        return data || [];
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-foreground"></div>
          <p className="text-sm text-muted-foreground">Loading prototypes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-7xl mx-auto px-4 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Input
            placeholder="Search prototypes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-[300px]"
          />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "bg-accent" : ""}
            >
              <Grid2X2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "bg-accent" : ""}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <UploadPrototypeDialog />
          <AddPrototypeDialog />
        </div>
      </div>

      <div className={`grid gap-6 ${
        viewMode === "grid" 
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" 
          : "grid-cols-1"
      }`}>
        {prototypes.map((prototype) => (
          <PrototypeCard
            key={prototype.id}
            id={prototype.id}
            title={prototype.name}
            previewUrl={prototype.preview_url}
            sourceUrl={prototype.url}
            timestamp={new Date(prototype.created_at)}
            tags={[]}
            previewTitle={prototype.preview_title}
            previewDescription={prototype.preview_description}
            previewImage={prototype.preview_image}
            deploymentStatus={prototype.deployment_status}
            deploymentUrl={prototype.deployment_url}
          />
        ))}
      </div>
    </div>
  );
};
