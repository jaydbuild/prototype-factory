
import { useEffect, useState } from 'react';
import { extractFigmaFileKey, generateFigmaEmbedHtml } from '@/utils/figma-utils';
import { Loader2, AlertCircle } from 'lucide-react';

interface FigmaPreviewProps {
  figmaUrl: string | null;
  className?: string;
}

export function FigmaPreview({ figmaUrl, className = '' }: FigmaPreviewProps) {
  const [embedHtml, setEmbedHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!figmaUrl) {
      setEmbedHtml(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    
    // Extract file key from URL
    const { fileKey, error: extractError } = extractFigmaFileKey(figmaUrl);
    
    if (extractError) {
      setError(extractError);
      setEmbedHtml(null);
      setIsLoading(false);
      return;
    }
    
    if (!fileKey) {
      setError('Could not extract file key from URL');
      setEmbedHtml(null);
      setIsLoading(false);
      return;
    }
    
    // Generate embed HTML
    const html = generateFigmaEmbedHtml(fileKey);
    setEmbedHtml(html);
    setError(null);
    
    // Simulate loading delay for iframe
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    
    return () => clearTimeout(timeout);
  }, [figmaUrl]);

  if (!figmaUrl) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-background ${className}`}>
        <p className="text-muted-foreground">No Figma design URL provided</p>
      </div>
    );
  }

  return (
    <div className={`w-full h-full relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading Figma design...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-background p-4">
          <AlertCircle className="h-10 w-10 text-destructive mb-2" />
          <h3 className="text-lg font-medium mb-1">Error Loading Figma Design</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">{error}</p>
        </div>
      )}
      
      {embedHtml && !error && (
        <div 
          className="w-full h-full"
          dangerouslySetInnerHTML={{ __html: embedHtml }}
        />
      )}
    </div>
  );
}
