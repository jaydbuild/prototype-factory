
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";

interface EditPrototypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prototype: {
    id: string;
    name: string;
    figma_url?: string | null;
  };
}

export function EditPrototypeDialog({
  open,
  onOpenChange,
  prototype,
}: EditPrototypeDialogProps) {
  const [name, setName] = useState(prototype.name);
  const [figmaUrl, setFigmaUrl] = useState(prototype.figma_url || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('prototypes')
        .update({
          name: name.trim(),
          figma_url: figmaUrl.trim() || null,
        })
        .eq('id', prototype.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Prototype updated successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['prototypes'] });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update prototype",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Prototype</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter prototype name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="figmaUrl">Figma URL (optional)</Label>
            <Input
              id="figmaUrl"
              value={figmaUrl}
              onChange={(e) => setFigmaUrl(e.target.value)}
              placeholder="Enter Figma URL"
              type="url"
            />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Prototype"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
