
import { useState } from "react";
import { useSupabase } from "@/lib/supabase-provider";
import { useToast } from "@/hooks/use-toast";
import { Project } from "@/types/project";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: (project: Project) => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onProjectCreated,
}: CreateProjectDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { supabase } = useSupabase();
  const { toast } = useToast();

  const resetForm = () => {
    setName("");
    setDescription("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Project name is required",
      });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "You must be logged in to create a project",
        });
        return;
      }
      
      // Use a single transaction via RPC to avoid RLS policy recursion issues
      const { data, error } = await supabase.rpc('create_project_with_owner', { 
        p_name: name.trim(),
        p_description: description.trim() || null,
        p_user_id: userData.user.id 
      } as any); // Using type assertion to bypass TypeScript checking for RPC params
      
      if (error) {
        // Check for specific Supabase errors and provide more helpful messages
        if (error.message.includes('recursion')) {
          throw new Error("Database permission error. Please contact support.");
        }
        throw error;
      }
      
      if (!data) {
        throw new Error("Failed to create project. Please try again.");
      }
      
      // Add the member and prototype counts to match ProjectWithMemberCount
      const projectWithCounts = {
        ...data,
        member_count: 1, // New project has 1 member (the creator)
        prototype_count: 0, // New project has 0 prototypes initially
        role: 'owner' as const // Creator is the owner
      };
      
      toast({
        title: "Success",
        description: "Project created successfully",
      });
      
      onProjectCreated(projectWithCounts);
      onOpenChange(false);
      resetForm();
      
    } catch (error: any) {
      console.error("Error creating project:", error);
      setError(error.message || "Failed to create project. Please try again.");
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create project. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form when dialog is closed
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new project to organize your prototypes.
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="col-span-4">
                Project Name
              </Label>
              <Input
                id="name"
                placeholder="My Awesome Project"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-4"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="col-span-4">
                Description (optional)
              </Label>
              <Textarea
                id="description"
                placeholder="Describe your project"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-4"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
