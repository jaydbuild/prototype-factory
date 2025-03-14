
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

  // Enhanced debug logging
  useEffect(() => {
    if (isFeedbackMode) {
      console.log('PreviewWindow: Feedback mode enabled, checking iframe access');
      
      const checkIframeAccess = () => {
        try {
          if (iframeRef.current && iframeRef.current.contentDocument) {
            console.log('PreviewWindow: Successfully accessed iframe contentDocument');
            return true;
          } else {
            console.warn('PreviewWindow: Cannot access iframe contentDocument yet');
            return false;
          }
        } catch (e) {
          console.error('PreviewWindow: Error accessing iframe contentDocument:', e);
          return false;
        }
      };
      
      // Try multiple times with increasing delays
      let attempts = 0;
      const maxAttempts = 10;
      
      const attemptAccess = () => {
        if (attempts >= maxAttempts) {
          console.error('PreviewWindow: Max attempts reached, cannot access iframe content');
          return;
        }
        
        if (!checkIframeAccess()) {
          attempts++;
          setTimeout(attemptAccess, 500 * attempts);
        }
      };
      
      // Wait for iframe to load before checking
      const handleIframeLoad = () => {
        console.log('PreviewWindow: iframe loaded, checking content access');
        setTimeout(attemptAccess, 100);
      };
      
      if (iframeRef.current) {
        iframeRef.current.addEventListener('load', handleIframeLoad);
        return () => {
          if (iframeRef.current) {
            iframeRef.current.removeEventListener('load', handleIframeLoad);
          }
        };
      }
    }
  }, [isFeedbackMode]);

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
