
import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Sandpack, SandpackProvider, SandpackPreview as SandboxPreview, SandpackCodeEditor } from "@codesandbox/sandpack-react";
import { PreviewControls } from './preview/PreviewControls';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FeedbackOverlay } from './feedback/FeedbackOverlay';
import { FeedbackPoint, FeedbackUser } from '@/types/feedback';
import JSZip from 'jszip';
import { Loader2 } from 'lucide-react';

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

  // State for file loading
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [isFilesReady, setIsFilesReady] = useState(false);

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

  // Effect to load the prototype files
  useEffect(() => {
    const loadProject = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        
        // Get prototype details to find the file path
        const { data: prototype, error: prototypeError } = await supabase
          .from('prototypes')
          .select('file_path')
          .eq('id', prototypeId)
          .single();

        if (prototypeError) {
          throw new Error(`Error fetching prototype: ${prototypeError.message}`);
        }

        if (!prototype?.file_path) {
          throw new Error('No file path found for prototype');
        }

        console.log("Fetching file from storage:", prototype.file_path);
        
        // Download the file from storage
        const { data: fileData, error: fileError } = await supabase.storage
          .from('prototype-uploads')
          .download(prototype.file_path);

        if (fileError) {
          throw new Error(`Error downloading file: ${fileError.message}`);
        }

        if (!fileData) {
          throw new Error('No file data received');
        }

        // Get file name from path
        const fileName = prototype.file_path.split('/').pop() || 'index.html';
        
        let projectFiles: Record<string, string> = {};
        
        // Process the file based on its type
        if (fileName.endsWith('.zip')) {
          // Handle ZIP file
          console.log("Processing ZIP file");
          const zip = new JSZip();
          const contents = await zip.loadAsync(fileData);
          
          // Extract all files from the ZIP
          const promises = Object.keys(contents.files).map(async (path) => {
            const file = contents.files[path];
            if (!file.dir) {
              try {
                const content = await file.async('text');
                projectFiles[`/${path}`] = content;
              } catch (e) {
                console.error(`Error extracting ${path}:`, e);
              }
            }
          });
          
          await Promise.all(promises);
          
          // Look for index.html at root or in any subdirectory
          let indexFile = Object.keys(projectFiles).find(path => 
            path === '/index.html' || path.endsWith('/index.html')
          );
          
          if (!indexFile) {
            // If no index.html, try to find any HTML file
            const anyHtmlFile = Object.keys(projectFiles).find(path => path.endsWith('.html'));
            if (anyHtmlFile) {
              indexFile = anyHtmlFile;
              console.log("Using HTML file as index:", anyHtmlFile);
            } else {
              throw new Error('No HTML files found in the ZIP archive');
            }
          }
        } else if (fileName.endsWith('.html')) {
          // Handle HTML file
          console.log("Processing HTML file");
          const text = await fileData.text();
          projectFiles['/index.html'] = text;
        } else {
          throw new Error('Unsupported file type. Please upload an HTML file or ZIP archive');
        }

        // If no files were found or something went wrong, use default files
        if (Object.keys(projectFiles).length === 0) {
          projectFiles = {
            '/index.html': `
              <!DOCTYPE html>
              <html lang="en">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Prototype Preview</title>
              </head>
              <body>
                <h1>No content found in the prototype file</h1>
                <p>The file might be empty or contain unsupported content.</p>
              </body>
              </html>
            `
          };
        }

        // Set files for Sandpack
        setFiles(projectFiles);
        setIsFilesReady(true);
        console.log("Project files loaded successfully:", Object.keys(projectFiles));

      } catch (error) {
        console.error('Error loading project:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to load preview');
        toast({
          variant: 'destructive',
          title: 'Preview Error',
          description: error instanceof Error ? error.message : 'Failed to load preview',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [prototypeId, toast]);

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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <span>Loading prototype...</span>
      </div>
    );
  }

  // Error state
  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md max-w-md">
          <h3 className="font-medium mb-2">Error loading prototype</h3>
          <p>{loadError}</p>
        </div>
      </div>
    );
  }

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
      
      {!isFilesReady ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <span>Preparing files...</span>
        </div>
      ) : (
        <Tabs value={viewMode} onValueChange={handleViewModeChange as any} className="flex-1 flex flex-col h-full">
          <TabsContent value="preview" className="flex-1 p-2 outline-none">
            <div className="relative w-full h-full" ref={previewContainerRef}>
              <SandpackProvider 
                template="static"
                files={files}
                theme="light"
                options={{
                  visibleFiles: ['/index.html'],
                  recompileMode: "delayed",
                  recompileDelay: 500,
                }}
              >
                <SandboxPreview />
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
              template="static"
              files={files}
              theme="light"
              options={{
                visibleFiles: Object.keys(files),
                editorHeight: '100%',
              }}
            >
              <SandpackCodeEditor showLineNumbers showInlineErrors closableTabs />
            </SandpackProvider>
          </TabsContent>
          <TabsContent value="split" className="flex-1 flex w-full h-full">
            <div className="w-1/2 h-full">
              <SandpackProvider 
                template="static"
                files={files}
                theme="light"
                options={{
                  visibleFiles: Object.keys(files),
                  recompileMode: "delayed",
                  recompileDelay: 500,
                }}
              >
                <SandboxPreview />
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
                template="static"
                files={files}
                theme="light"
                options={{
                  visibleFiles: Object.keys(files),
                  editorHeight: '100%',
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
      )}
    </div>
  );
}
