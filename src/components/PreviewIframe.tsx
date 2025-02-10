import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertCircle } from "lucide-react";

interface PreviewIframeProps {
  url: string;
  title: string;
}

export const PreviewIframe = ({ url, title }: PreviewIframeProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 space-y-4 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Preview Unavailable</h3>
          <p className="text-sm text-muted-foreground">
            This prototype cannot be embedded due to security restrictions.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => window.open(url, '_blank')}
          className="gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Open in New Tab
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-muted-foreground">Loading preview...</div>
        </div>
      )}
      <iframe
        src={url}
        title={title}
        className="w-full h-full border-0 rounded-lg"
        sandbox="allow-scripts allow-same-origin"
        loading="lazy"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
};
