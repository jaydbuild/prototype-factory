import { useState, useEffect } from 'react';
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Sandpack } from "@codesandbox/sandpack-react";
import { PreviewControls } from './preview/PreviewControls';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FeedbackOverlay } from './feedback/FeedbackOverlay';

interface SandpackPreviewProps {
  prototypeId: string;
  url?: string;
  figmaUrl?: string | null;
  onShare?: () => void;
}

export function SandpackPreview({ prototypeId, url, figmaUrl, onShare }: SandpackPreviewProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'code' | 'split' | 'design'>('preview');
  const [isFeedbackMode, setIsFeedbackMode] = useState(false);
  const [deviceType, setDeviceType] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [filesUrl, setFilesUrl] = useState<string | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch the file URL for downloading
    const fetchFilesUrl = async () => {
      try {
        const { data, error } = await supabase
          .from('prototypes')
          .select('file_path')
          .eq('id', prototypeId)
          .single();

        if (error) {
          console.error('Error fetching file path:', error);
          return;
        }

        if (data && data.file_path) {
          const { data: urlData } = await supabase
            .storage
            .from('prototype-uploads')
            .getPublicUrl(data.file_path);

          if (urlData && urlData.publicUrl) {
            setFilesUrl(urlData.publicUrl);
          }
        }
      } catch (err) {
        console.error('Error getting download URL:', err);
      }
    };

    fetchFilesUrl();
  }, [prototypeId]);

  const handleViewModeChange = (mode: 'preview' | 'code' | 'split' | 'design') => {
    setViewMode(mode);
  };

  const handleDeviceChange = (device: 'desktop' | 'tablet' | 'mobile') => {
    setDeviceType(device);
  };

  const handleOrientationChange = () => {
    setOrientation(orientation === 'portrait' ? 'landscape' : 'portrait');
  };

  const handleToggleFeedbackMode = () => {
    setIsFeedbackMode(!isFeedbackMode);
  };

  const handleDownload = () => {
    if (!filesUrl) {
      toast({
        title: "Download Error",
        description: "No file available for download",
        variant: "destructive"
      });
      return;
    }

    // Open the download URL in a new tab
    window.open(filesUrl, '_blank');
    
    toast({
      title: "Download Started",
      description: "Your file download has started"
    });
  };

  const handleShare = () => {
    // Get the current URL to share
    const shareUrl = window.location.href;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        toast({
          title: "Link Copied!",
          description: "Prototype link has been copied to clipboard",
        });
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        toast({
          title: "Share Failed",
          description: "Could not copy the link to clipboard",
          variant: "destructive"
        });
      });
  };

  const sandpackOptions = {
    template: 'vite-react',
    files: {
      '/App.tsx': `
        import React from 'react';

        function App() {
          return (
            <div>
              <h1>Hello from Sandpack!</h1>
            </div>
          );
        }

        export default App;
      `,
      '/index.tsx': `
        import React from 'react';
        import ReactDOM from 'react-dom/client';
        import App from './App';

        ReactDOM.createRoot(document.getElementById('root')).render(
          <React.StrictMode>
            <App />
          </React.StrictMode>
        );
      `,
      '/index.html': `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <link rel="icon" type="image/svg+xml" href="/vite.svg" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Vite + React</title>
          </head>
          <body>
            <div id="root"></div>
            <script type="module" src="/index.tsx"></script>
          </body>
        </html>
      `,
    },
    dependencies: {
      "react": "^18.2.0",
      "react-dom": "^18.2.0"
    },
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b">
        <PreviewControls 
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          isFeedbackMode={isFeedbackMode}
          onToggleFeedbackMode={handleToggleFeedbackMode}
          deviceType={deviceType}
          onDeviceChange={handleDeviceChange}
          orientation={orientation}
          onOrientationChange={handleOrientationChange}
          hasFigmaDesign={!!figmaUrl}
          filesUrl={filesUrl}
          onDownload={handleDownload}
          onShare={handleShare}
        />
      </div>
      
      <Tabs value={viewMode} onValueChange={handleViewModeChange} className="flex-1 flex flex-col h-full">
        <TabsContent value="preview" className="flex-1 p-2 outline-none">
          <div className="relative w-full h-full">
            {isFeedbackMode && <FeedbackOverlay />}
            <div className="overflow-hidden rounded-lg w-full h-full">
              <Sandpack
                options={sandpackOptions}
                className="w-full h-full"
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="code" className="flex-1 p-2 outline-none">
          <Sandpack
            options={sandpackOptions}
            readOnly={true}
            className="w-full h-full"
          />
        </TabsContent>
        <TabsContent value="split" className="flex-1 flex w-full h-full">
          <div className="w-1/2 h-full">
            <div className="relative w-full h-full">
              {isFeedbackMode && <FeedbackOverlay />}
              <div className="overflow-hidden rounded-lg w-full h-full">
                <Sandpack
                  options={sandpackOptions}
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>
          <div className="w-1/2 h-full">
            <Sandpack
              options={sandpackOptions}
              readOnly={true}
              className="w-full h-full"
            />
          </div>
        </TabsContent>
        <TabsContent value="design" className="flex-1 p-2 outline-none">
          {figmaUrl ? (
            <iframe
              src={`https://www.figma.com/embed?embed_host=share&url=${figmaUrl}`}
              width="100%"
              height="600"
              allowFullScreen
              title="Figma Design"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No Figma design available</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
