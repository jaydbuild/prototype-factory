
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { isValidFigmaUrl } from "@/utils/figma-utils";
import { AlertCircle } from "lucide-react";

interface FigmaUrlFormProps {
  prototypeId: string;
  onFigmaUrlAdded?: (url: string) => void;
  initialUrl?: string;
}

export function FigmaUrlForm({ prototypeId, onFigmaUrlAdded, initialUrl = "" }: FigmaUrlFormProps) {
  const [figmaUrl, setFigmaUrl] = useState(initialUrl);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { toast } = useToast();

  // Validate URL on change
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFigmaUrl(url);
    
    // Clear validation error when input is emptied
    if (!url.trim()) {
      setValidationError(null);
      return;
    }
    
    // Only show validation errors after user has typed something substantial
    if (url.includes('figma.com') && !isValidFigmaUrl(url)) {
      setValidationError('Please enter a valid Figma file URL (e.g., https://www.figma.com/file/abc123/DesignName)');
    } else {
      setValidationError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedUrl = figmaUrl.trim();
    
    if (!trimmedUrl) {
      toast({
        title: "Error",
        description: "Please enter a Figma URL",
        variant: "destructive",
      });
      return;
    }

    // Final validation before submission
    if (!isValidFigmaUrl(trimmedUrl)) {
      setValidationError('Please enter a valid Figma file URL (e.g., https://www.figma.com/file/abc123/DesignName)');
      toast({
        title: "Invalid Figma URL",
        description: "Please enter a valid Figma file URL",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Call the Supabase function to update the prototype
      const { error: functionError } = await supabase.functions
        .invoke('update-prototype-figma-url', {
          body: { 
            prototypeId,
            figmaUrl: trimmedUrl
          }
        });
          
      if (functionError) {
        console.error('Error calling function:', functionError);
        throw new Error(functionError.message || 'Failed to update Figma URL');
      }

      toast({
        title: "Success",
        description: "Figma design linked successfully",
      });
      
      // Call the callback with the new URL
      if (onFigmaUrlAdded) {
        onFigmaUrlAdded(trimmedUrl);
      }
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
          onChange={handleUrlChange}
          placeholder="https://www.figma.com/file/..."
          className={`w-full ${validationError ? 'border-destructive' : ''}`}
        />
        
        {validationError && (
          <div className="flex items-start gap-2 text-destructive text-xs mt-1">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
        
        <p className="text-xs text-muted-foreground">
          Enter the URL of your Figma design to link it to this prototype
        </p>
      </div>
      <Button 
        type="submit" 
        className="w-full"
        disabled={isSubmitting || !!validationError}
      >
        {isSubmitting ? "Adding..." : initialUrl ? "Update Figma Design" : "Add Figma Design"}
      </Button>
    </form>
  );
}
