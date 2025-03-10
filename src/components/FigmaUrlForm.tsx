
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

  const validateFigmaUrl = (url: string): boolean => {
    if (!url.trim()) return false;
    
    try {
      const urlObj = new URL(url);
      return (urlObj.hostname === 'www.figma.com' || urlObj.hostname === 'figma.com') && 
             (urlObj.pathname.includes('/file/') || 
              urlObj.pathname.includes('/design/') ||
              urlObj.pathname.includes('/proto/'));
    } catch (e) {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateFigmaUrl(figmaUrl)) {
      toast({
        title: "Error",
        description: "Please enter a valid Figma URL (should be from figma.com and include /file/, /design/, or /proto/)",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Call the Supabase function to update the Figma URL
      const { error: functionError } = await supabase.functions
        .invoke('update-prototype-figma-url', {
          body: { 
            prototypeId,
            figmaUrl: figmaUrl.trim()
          }
        });
          
      if (functionError) {
        console.error('Error calling function:', functionError);
        throw new Error(functionError.message || 'Failed to update Figma URL');
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
    <div className="w-full h-full flex items-center justify-center p-6 bg-background">
      <div className="max-w-md bg-white p-8 rounded-lg shadow-sm space-y-4">
        <h3 className="text-xl font-medium">Add Figma Design</h3>
        <p className="text-sm text-muted-foreground">
          Enter the URL of your Figma design to view it here.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
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
              Example: https://www.figma.com/file/LKQ4FJ4bTnCSjedbRpk931/Sample-File
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
      </div>
    </div>
  );
}
