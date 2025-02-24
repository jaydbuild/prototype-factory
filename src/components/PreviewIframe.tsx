
import { useState, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

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

  // Sanitize and validate URL - moved outside of render phase
  const sanitizeUrl = (unsafeUrl: string) => {
    if (!unsafeUrl) return '';
    
    try {
      const urlObj = new URL(unsafeUrl);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        console.error('Invalid protocol:', urlObj.protocol);
        return '';
      }
      return urlObj.toString();
    } catch (e) {
      console.error('Invalid URL:', e);
      return '';
    }
  };

  // Memoize the sanitized URL to prevent recalculation on every render
  const sanitizedUrl = sanitizeUrl(url);
  
  if (!sanitizedUrl || hasError) {
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
    <div className="relative w-full h-full flex flex-col min-h-0">
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
          border: 'none'
        }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-top-navigation"
        loading="lazy"
        onLoad={handleLoad}
        onError={handleError}
        referrerPolicy="no-referrer"
        scrolling="auto"
      />
    </div>
  );
});

PreviewIframe.displayName = 'PreviewIframe';

export { PreviewIframe };
