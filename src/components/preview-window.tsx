
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export function PreviewWindow({ deploymentId }: { deploymentId: string }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const getPublicUrl = async () => {
      const { data: { publicUrl } } = await supabase.storage
        .from('prototype-deployments')
        .getPublicUrl(`${deploymentId}/index.html`);
      
      setPreviewUrl(publicUrl);
      setIsLoading(false);
    };

    getPublicUrl();

    // Clean up on unmount
    return () => {
      if (iframeRef.current) {
        iframeRef.current.src = 'about:blank';
      }
    };
  }, [deploymentId]);

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden rounded-lg border">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={previewUrl}
        className="h-full w-full border-none"
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-presentation allow-top-navigation-by-user-activation"
        title="Prototype Preview"
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
}
