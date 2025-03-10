
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { SandpackPreview } from './SandpackPreview';
import { FigmaPreview } from './FigmaPreview';
import { FigmaUrlForm } from './FigmaUrlForm';
import '@/styles/PreviewIframe.css';

interface PreviewWindowProps {
  url?: string | null;
  onShare?: () => void;
  prototypeId: string;
}

export function PreviewWindow({ prototypeId, url, onShare }: PreviewWindowProps) {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [figmaUrl, setFigmaUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [useSandpack, setUseSandpack] = useState(false);
  const [isShowingFigmaForm, setIsShowingFigmaForm] = useState(false);

  useEffect(() => {
    const fetchPrototypeUrl = async () => {
      setIsLoading(true);
      setLoadError(null);
      
      try {
        // If url is provided, use it directly
        if (url) {
          console.log("Using provided URL:", url);
          setPreviewUrl(url);
          return;
        }

        // Check if the prototype has a deployment URL in the database
        const { data: prototype, error: prototypeError } = await supabase
          .from('prototypes')
          .select('*')
          .eq('id', prototypeId)
          .single();

        if (prototypeError) {
          console.error('Error fetching prototype details:', prototypeError);
          setUseSandpack(true);
          return;
        }

        console.log("Prototype data:", prototype);

        // Check if figma_url exists in the data
        let figmaUrlValue = null;
        try {
          // Try to access figma_url using a type-safe approach
          figmaUrlValue = (prototype as any).figma_url;
          setFigmaUrl(figmaUrlValue);
        } catch (e) {
          console.warn("figma_url column not found in prototype data");
        }

        // If the prototype is deployed and has a URL, use it
        if (prototype && prototype.deployment_status === 'deployed' && prototype.deployment_url) {
          console.log("Using deployment URL:", prototype.deployment_url);
          setPreviewUrl(prototype.deployment_url);
        } else if (prototype && prototype.file_path) {
          // If not deployed but has a file path, use Sandpack
          console.log("Using Sandpack for preview");
          setUseSandpack(true);
        } else {
          // No URL or file path available
          setLoadError("No preview available for this prototype");
        }
      } catch (error) {
        console.error("Error loading preview:", error);
        setLoadError("Failed to load preview");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrototypeUrl();
  }, [prototypeId, url]);

  const handleFigmaUrlAdded = (newFigmaUrl: string) => {
    setFigmaUrl(newFigmaUrl);
    setIsShowingFigmaForm(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-destructive">{loadError}</p>
        </div>
      </div>
    );
  }

  // Show Figma design if explicitly requested or if showing the form
  if (isShowingFigmaForm) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full">
          <FigmaUrlForm 
            prototypeId={prototypeId} 
            onFigmaUrlAdded={handleFigmaUrlAdded}
            initialUrl={figmaUrl || ""}
          />
          <button 
            onClick={() => setIsShowingFigmaForm(false)}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // If we have a Figma URL, show the Figma preview
  if (figmaUrl) {
    return (
      <div className="h-full w-full flex flex-col">
        <div className="p-2 flex justify-end">
          <button 
            onClick={() => setIsShowingFigmaForm(true)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Change Figma URL
          </button>
        </div>
        <div className="flex-1">
          <FigmaPreview figmaUrl={figmaUrl} />
        </div>
      </div>
    );
  }

  if (useSandpack) {
    return (
      <SandpackPreview 
        prototypeId={prototypeId} 
        url={previewUrl || undefined}
        figmaUrl={figmaUrl}
        onShare={onShare}
      />
    );
  }

  return (
    <div className="h-full w-full">
      <iframe 
        src={previewUrl} 
        className="w-full h-full border-0 preview-iframe"
        title="Preview"
        sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
        allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; payment; usb; xr-spatial-tracking"
      />
    </div>
  );
}
