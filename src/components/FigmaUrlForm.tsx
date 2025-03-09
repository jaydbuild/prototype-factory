import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FigmaUrlFormProps {
  prototypeId: string;
  onFigmaUrlAdded?: (url: string) => void;
}

export function FigmaUrlForm({ prototypeId, onFigmaUrlAdded }: FigmaUrlFormProps) {
  const [figmaUrl, setFigmaUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!figmaUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid Figma URL",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Update the prototype with the Figma URL
      // Using a direct update with type assertion to handle the case where figma_url is not in the type yet
      const { error } = await supabase
        .from('prototypes')
        .update({ 
          figma_url: figmaUrl.trim() 
        } as any)
        .eq('id', prototypeId);

      if (error) {
        console.error('Error updating Figma URL:', error);
        
        // Fallback approach - try to use a function to update
        const { error: functionError } = await supabase.functions
          .invoke('update-prototype-figma-url', {
            body: { 
              prototypeId,
              figmaUrl: figmaUrl.trim()
            }
          });
          
        if (functionError) {
          throw new Error(functionError.message || 'Failed to update Figma URL');
        }
      }

      toast({
        title: "Success",
        description: "Figma URL added successfully",
      });
      
      // Call the callback with the new URL
      if (onFigmaUrlAdded) {
        onFigmaUrlAdded(figmaUrl.trim());
      }
      
      // Clear the input
      setFigmaUrl("");
    } catch (error: any) {
      console.error('Error adding Figma URL:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add Figma URL",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="figmaUrl">Figma Design URL</Label>
        <Input
          id="figmaUrl"
          value={figmaUrl}
          onChange={(e) => setFigmaUrl(e.target.value)}
          placeholder="https://www.figma.com/file/..."
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Enter the URL of your Figma design to link it to this prototype
        </p>
      </div>
      <Button 
        type="submit" 
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Adding..." : "Add Figma Design"}
      </Button>
    </form>
  );
}
