import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { StackBlitzPreview } from './StackBlitzPreview';

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
          .select('deployment_status, deployment_url')
          .eq('id', prototypeId)
          .single();

        if (prototypeError) {
          console.error('Error fetching prototype details:', prototypeError);
          setUseStackBlitz(true);
          return;
        }

        // If the prototype is deployed and has a URL, use it
        if (prototype?.deployment_status === 'deployed' && prototype?.deployment_url) {
          console.log("Using deployed URL from database:", prototype.deployment_url);
          setPreviewUrl(prototype.deployment_url);
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

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden rounded-lg border">
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
          className="h-full w-full border-none"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-presentation"
          title="Prototype Preview"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      )}
    </div>
  );
}
