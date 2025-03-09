
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { StackBlitzPreview } from './StackBlitzPreview';
import '@/styles/PreviewIframe.css';

interface PreviewWindowProps {
  url?: string | null;
  onShare?: () => void;
  prototypeId: string;
}

export function PreviewWindow({ prototypeId, url, onShare }: PreviewWindowProps) {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [useStackBlitz, setUseStackBlitz] = useState(false);

  useEffect(() => {
    const fetchPrototypeUrl = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        
        // If url is provided, use it directly
        if (url) {
          console.log("Using provided URL:", url);
          setPreviewUrl(url);
          return;
        }

        // Check if the prototype has a deployment URL in the database
        const { data: prototype, error: prototypeError } = await supabase
          .from('prototypes')
          .select('deployment_status, deployment_url, file_path')
          .eq('id', prototypeId)
          .single();

        if (prototypeError) {
          console.error('Error fetching prototype details:', prototypeError);
          setUseStackBlitz(true);
          return;
        }

        console.log("Prototype data:", prototype);

        // If the prototype is deployed and has a URL, use it
        if (prototype?.deployment_status === 'deployed' && prototype?.deployment_url) {
          console.log("Using deployed URL from database:", prototype.deployment_url);
          setPreviewUrl(prototype.deployment_url);
          return;
        }

        // If we have a file path but no deployment URL, use StackBlitz
        if (prototype?.file_path) {
          console.log("Prototype has file_path but no deployment_url, using StackBlitz");
          setUseStackBlitz(true);
          return;
        }

        // Otherwise, try to generate a URL from storage
        console.log("Fetching from storage for ID:", prototypeId);
        const { data: { publicUrl } } = await supabase.storage
          .from('prototype-deployments')
          .getPublicUrl(`${prototypeId}/index.html`);
        
        console.log("Generated public URL:", publicUrl);
        
        if (publicUrl) {
          setPreviewUrl(publicUrl);
          return;
        }

        // If we still don't have a URL, use StackBlitz
        console.log("No URL found, falling back to StackBlitz");
        setUseStackBlitz(true);
      } catch (error) {
        console.error('Error fetching preview URL:', error);
        setLoadError('Failed to load preview. Using StackBlitz instead.');
        setUseStackBlitz(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrototypeUrl();
  }, [prototypeId, url]);

  // If we're using StackBlitz, render the StackBlitzPreview component
  if (useStackBlitz) {
    return <StackBlitzPreview prototypeId={prototypeId} url={url} deploymentUrl={previewUrl} />;
  }

  // Otherwise, render the traditional iframe
  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setLoadError('Failed to load preview content. Switching to StackBlitz...');
    setUseStackBlitz(true);
  };

  // Define a function to inject CSS fixes into the iframe after it loads
  const injectCssFixesToIframe = (iframe: HTMLIFrameElement) => {
    try {
      if (iframe && iframe.contentDocument) {
        // Create a style element
        const style = iframe.contentDocument.createElement('style');
        style.textContent = `
          /* Fix for bullet points and list styling */
          body { font-family: system-ui, -apple-system, sans-serif; }
          ul { padding-left: 20px; list-style-type: disc !important; }
          ol { padding-left: 20px; list-style-type: decimal !important; }
          li { display: list-item !important; margin: 0.5em 0; }
          li::marker { display: inline-block; }
        `;
        
        // Append it to the iframe's head
        if (iframe.contentDocument.head) {
          iframe.contentDocument.head.appendChild(style);
        }
        
        // Add a class to the body for additional styling
        if (iframe.contentDocument.body) {
          iframe.contentDocument.body.classList.add('preview-style-fix');
        }
      }
    } catch (e) {
      console.error('Error injecting CSS into iframe:', e);
      // Don't fail the preview if this doesn't work
    }
  };

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden rounded-lg border preview-iframe-container">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 gap-3 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-muted-foreground">Loading preview...</div>
        </div>
      )}
      
      {loadError && !useStackBlitz && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
          <div className="bg-white rounded-lg p-6 shadow-md max-w-md">
            <h3 className="text-lg font-semibold text-destructive mb-2">Preview Error</h3>
            <p className="text-muted-foreground">{loadError}</p>
          </div>
        </div>
      )}
      
      {previewUrl && !useStackBlitz && (
        <iframe
          src={previewUrl}
          className="preview-iframe"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-presentation"
          title="Prototype Preview"
          onLoad={(e) => {
            handleIframeLoad();
            // Inject CSS fixes to the iframe
            if (e.currentTarget) {
              injectCssFixesToIframe(e.currentTarget);
            }
          }}
          onError={handleIframeError}
        />
      )}
    </div>
  );
}
