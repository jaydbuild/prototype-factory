import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export function PreviewWindow({ deploymentId }: { deploymentId: string }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getPublicUrl = async () => {
      const { data: { publicUrl } } = await supabase.storage
        .from('prototype-deployments')
        .getPublicUrl(`${deploymentId}/index.html`);
      
      setPreviewUrl(publicUrl);
      setIsLoading(false);
    };

    getPublicUrl();
  }, [deploymentId]);

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden rounded-lg border">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <iframe
        src={previewUrl}
        className="h-full w-full border-none"
        sandbox="allow-scripts allow-same-origin"
        title="Prototype Preview"
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
}
