
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Grid2X2, List, Plus, Search } from "lucide-react";
import { PrototypeCard } from "./prototype-card";

// Mock data for initial development
const mockPrototypes = [
  {
    id: "1",
    title: "Dashboard Redesign",
    previewUrl: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b",
    sourceUrl: "#",
    timestamp: new Date("2024-03-10"),
    commentCount: 12,
    tags: ["Web", "Dashboard"],
  },
  {
    id: "2",
    title: "Mobile App Interface",
    previewUrl: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6",
    sourceUrl: "#",
    timestamp: new Date("2024-03-09"),
    commentCount: 8,
    tags: ["Mobile", "iOS"],
  },
  {
    id: "3",
    title: "Landing Page",
    previewUrl: "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7",
    sourceUrl: "#",
    timestamp: new Date("2024-03-08"),
    commentCount: 5,
    tags: ["Web", "Marketing"],
  },
];

export const PrototypeGrid = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("recent");

  return (
    <div className="container py-8 max-w-7xl mx-auto px-4 animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-semibold">Prototypes</h1>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Prototype
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search prototypes..."
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-4 w-full sm:w-auto">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="comments">Most Comments</SelectItem>
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
          {mockPrototypes.map((prototype) => (
            <PrototypeCard
              key={prototype.id}
              title={prototype.title}
              previewUrl={prototype.previewUrl}
              sourceUrl={prototype.sourceUrl}
              timestamp={prototype.timestamp}
              commentCount={prototype.commentCount}
              tags={prototype.tags}
              onClick={() => console.log("Clicked:", prototype.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
