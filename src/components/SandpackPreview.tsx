
import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Sandpack, SandpackProvider, SandpackPreview as SandboxPreview, SandpackCodeEditor } from "@codesandbox/sandpack-react";
import { PreviewControls } from './preview/PreviewControls';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FeedbackOverlay } from './feedback/FeedbackOverlay';
import { FeedbackPoint, FeedbackUser } from '@/types/feedback';

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
  const [feedbackPoints, setFeedbackPoints] = useState<FeedbackPoint[]>([]);
  const [feedbackUsers, setFeedbackUsers] = useState<Record<string, FeedbackUser>>({});
  const [currentUser, setCurrentUser] = useState<FeedbackUser | undefined>(undefined);
  const previewContainerRef = useRef<HTMLDivElement>(null);

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

  // Effect to fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser({
          id: user.id,
          name: user.user_metadata?.full_name || user.email,
          avatar_url: user.user_metadata?.avatar_url || null
        });
      }
    };

    fetchCurrentUser();
  }, []);

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
    if (onShare) {
      onShare();
    } else {
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
    }
  };

  const handleFeedbackAdded = (feedback: FeedbackPoint) => {
    setFeedbackPoints(prev => [...prev, feedback]);
  };

  const handleFeedbackUpdated = (feedback: FeedbackPoint) => {
    setFeedbackPoints(prev => 
      prev.map(f => f.id === feedback.id ? feedback : f)
    );
  };

  // Sample files for the Sandpack preview
  const sandpackFiles = {
    '/App.jsx': `
      import React from 'react';

      function App() {
        return (
          <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Hello from Sandpack!</h1>
            <p className="mb-4">This is a simple React app running in a sandbox environment.</p>
            <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Click me
            </button>
          </div>
        );
      }

      export default App;
    `,
    '/index.jsx': `
      import React from 'react';
      import ReactDOM from 'react-dom/client';
      import App from './App';
      import './styles.css';

      ReactDOM.createRoot(document.getElementById('root')).render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
    `,
    '/styles.css': `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        margin: 0;
        padding: 0;
      }
    `,
    '/index.html': `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Prototype Preview</title>
        </head>
        <body>
          <div id="root"></div>
        </body>
      </html>
    `,
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
      
      <Tabs value={viewMode} onValueChange={handleViewModeChange as any} className="flex-1 flex flex-col h-full">
        <TabsContent value="preview" className="flex-1 p-2 outline-none">
          <div className="relative w-full h-full" ref={previewContainerRef}>
            <SandpackProvider 
              template="react"
              files={sandpackFiles}
              theme="light"
              options={{
                visibleFiles: ['/App.jsx', '/styles.css'],
                recompileMode: "delayed",
                recompileDelay: 500,
              }}
            >
              <SandboxPreview showOpenInCodeSandbox={false} />
              {isFeedbackMode && (
                <FeedbackOverlay
                  prototypeId={prototypeId}
                  isFeedbackMode={isFeedbackMode}
                  feedbackPoints={feedbackPoints}
                  onFeedbackAdded={handleFeedbackAdded}
                  onFeedbackUpdated={handleFeedbackUpdated}
                  feedbackUsers={feedbackUsers}
                  currentUser={currentUser}
                  previewContainerRef={previewContainerRef}
                  deviceType={deviceType}
                  orientation={orientation}
                />
              )}
            </SandpackProvider>
          </div>
        </TabsContent>
        <TabsContent value="code" className="flex-1 p-2 outline-none">
          <SandpackProvider 
            template="react"
            files={sandpackFiles}
            theme="light"
            options={{
              visibleFiles: ['/App.jsx', '/styles.css'],
              showNavigator: true,
            }}
          >
            <SandpackCodeEditor showLineNumbers showInlineErrors closableTabs />
          </SandpackProvider>
        </TabsContent>
        <TabsContent value="split" className="flex-1 flex w-full h-full">
          <div className="w-1/2 h-full">
            <SandpackProvider 
              template="react"
              files={sandpackFiles}
              theme="light"
              options={{
                visibleFiles: ['/App.jsx', '/styles.css'],
              }}
            >
              <SandboxPreview showOpenInCodeSandbox={false} />
              {isFeedbackMode && (
                <FeedbackOverlay
                  prototypeId={prototypeId}
                  isFeedbackMode={isFeedbackMode}
                  feedbackPoints={feedbackPoints}
                  onFeedbackAdded={handleFeedbackAdded}
                  onFeedbackUpdated={handleFeedbackUpdated}
                  feedbackUsers={feedbackUsers}
                  currentUser={currentUser}
                  previewContainerRef={previewContainerRef}
                  deviceType={deviceType}
                  orientation={orientation}
                />
              )}
            </SandpackProvider>
          </div>
          <div className="w-1/2 h-full">
            <SandpackProvider 
              template="react"
              files={sandpackFiles}
              theme="light"
              options={{
                visibleFiles: ['/App.jsx', '/styles.css'],
                showNavigator: true,
              }}
            >
              <SandpackCodeEditor showLineNumbers showInlineErrors closableTabs />
            </SandpackProvider>
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
