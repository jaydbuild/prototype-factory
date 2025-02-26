
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrototypeUrl = async () => {
      try {
        setError(null);
        // If url is provided, use it directly
        if (url) {
          setPreviewUrl(url);
          setIsLoading(false);
          return;
        }

        // Create a signed URL with proper content type
        const { data, error } = await supabase.storage
          .from('prototype-deployments')
          .createSignedUrl(`${prototypeId}/index.html`, 3600);
          
        if (error) {
          console.error('Error fetching preview URL:', error);
          setError('Failed to load preview');
          return;
        }

        if (!data?.signedUrl) {
          setError('No preview URL available');
          return;
        }

        // Add content type parameter and set preview URL
        const finalUrl = new URL(data.signedUrl);
        finalUrl.searchParams.append('response-content-type', 'text/html');
        setPreviewUrl(finalUrl.toString());
      } catch (error) {
        console.error('Error fetching preview URL:', error);
        setError('Failed to load preview');
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
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <p className="text-destructive">{error}</p>
        </div>
      )}
      {previewUrl && !error && (
        <iframe
          src={previewUrl}
          className="h-full w-full border-none"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-presentation"
          allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi"
          loading="lazy"
          referrerPolicy="no-referrer"
          title="Prototype Preview"
          onLoad={() => setIsLoading(false)}
        />
      )}
    </div>
  );
}
