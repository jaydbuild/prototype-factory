import { useState, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CommentOverlay } from "./CommentOverlay";

interface PreviewIframeProps {
  url: string;
  title: string;
  prototypeId: string;
}

const PreviewIframe = forwardRef<HTMLIFrameElement, PreviewIframeProps>(
  ({ url, title, prototypeId }, ref) => {
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

  // Sanitize and validate URL
  const sanitizeUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Invalid protocol');
      }
      return urlObj.toString();
    } catch (e) {
      console.error('Invalid URL:', e);
      setHasError(true);
      return '';
    }
  };

  const sanitizedUrl = sanitizeUrl(url);

  if (hasError || !sanitizedUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Card className="max-w-md p-6 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Preview Unavailable</h3>
            <p className="text-sm text-muted-foreground">
              We couldn't load this prototype preview. The URL might be invalid or the site may not allow embedding.
            </p>
          </div>
          <div className="mt-6 flex justify-center">
            <Button 
              variant="outline" 
              onClick={() => window.open(url, '_blank')}
              className="gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open in New Tab
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <CommentOverlay prototypeId={prototypeId}>
      <div className="relative w-full h-full flex flex-col min-h-0 pointer-events-auto">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-muted-foreground">Loading preview...</p>
            </div>
          </div>
        )}
        <iframe
          ref={ref}
          src={sanitizedUrl}
          title={title}
          className="flex-1 w-full"
          style={{ 
            height: '100%',
            width: '100%',
            display: 'block',
            border: 'none',
            pointerEvents: 'auto' // Always allow interactions
          }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-top-navigation"
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
          referrerPolicy="no-referrer"
          scrolling="auto"
        />
      </div>
    </CommentOverlay>
  );
});

PreviewIframe.displayName = 'PreviewIframe';

export { PreviewIframe };
