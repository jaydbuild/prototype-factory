
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface PreviewWindowProps {
  deploymentId: string;
  isFeedbackMode?: boolean;
}

export function PreviewWindow({ deploymentId, isFeedbackMode = false }: PreviewWindowProps) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    console.log('PreviewWindow: Component mounted with feedback mode:', isFeedbackMode);
    
    const getPublicUrl = async () => {
      const { data: { publicUrl } } = await supabase.storage
        .from('prototype-deployments')
        .getPublicUrl(`${deploymentId}/index.html`);
      
      console.log('PreviewWindow: Got public URL:', publicUrl);
      setPreviewUrl(publicUrl);
      setIsLoading(false);
    };

    getPublicUrl();

    // Clean up on unmount
    return () => {
      console.log('PreviewWindow: Component unmounting, cleaning up iframe');
      if (iframeRef.current) {
        iframeRef.current.src = 'about:blank';
      }
    };
  }, [deploymentId, isFeedbackMode]);

  return (
    <div className={`relative h-[calc(100vh-4rem)] w-full overflow-hidden rounded-lg border ${isFeedbackMode ? 'sp-preview' : ''}`}>
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
        onLoad={() => {
          console.log('PreviewWindow: iframe loaded');
          setIsLoading(false);
        }}
        data-feedback-mode={isFeedbackMode ? 'true' : 'false'}
      />
    </div>
  );
}
