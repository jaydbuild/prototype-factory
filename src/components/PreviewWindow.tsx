import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface PreviewWindowProps {
  url?: string;
  onShare?: () => void;
  prototypeId: string;
}

export function PreviewWindow({ prototypeId, url, onShare }: PreviewWindowProps) {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPrototypeUrl = async () => {
      try {
        // If url is provided, use it directly
        if (url) {
          setPreviewUrl(url);
          setIsLoading(false);
          return;
        }

        // Otherwise fetch from storage with correct content type headers
        const { data: { publicUrl }, error } = await supabase.storage
          .from('prototype-deployments')
          .createSignedUrl(`${prototypeId}/index.html`, 3600, {
            download: false,
            transform: {
              metadata: {
                'Content-Type': 'text/html',
                'Cache-Control': 'no-cache',
                'X-Frame-Options': 'SAMEORIGIN'
              }
            }
          });
          
        if (error) {
          console.error('Error fetching preview URL:', error);
          return;
        }

        setPreviewUrl(publicUrl);
      } catch (error) {
        console.error('Error fetching preview URL:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrototypeUrl();
  }, [prototypeId, url]);

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden rounded-lg border">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      {previewUrl && (
        <iframe
          src={previewUrl}
          className="h-full w-full border-none"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-presentation"
          allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi"
          loading="lazy"
          importance="high"
          referrerPolicy="no-referrer"
          title="Prototype Preview"
          onLoad={() => setIsLoading(false)}
        />
      )}
    </div>
  );
}
