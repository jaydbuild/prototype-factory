
import { useEffect, useRef, useState } from 'react';
import sdk from '@stackblitz/sdk';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePrototypeFeedback } from '@/hooks/use-prototype-feedback';
import { PreviewControls } from './preview/PreviewControls';
import { FeedbackOverlay } from './feedback/FeedbackOverlay';
import JSZip from 'jszip';

interface StackBlitzPreviewProps {
  prototypeId: string;
  url?: string | null;
  deploymentUrl?: string | null;
  onShare?: () => void;
}

export function StackBlitzPreview({ prototypeId, url, deploymentUrl, onShare }: StackBlitzPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'code' | 'split'>('preview');
  const [isFeedbackMode, setIsFeedbackMode] = useState(false);
  const { toast } = useToast();
  
  const {
    feedbackPoints,
    isLoading: isFeedbackLoading,
    feedbackUsers,
    currentUser,
    addFeedbackPoint,
    updateFeedbackPoint
  } = usePrototypeFeedback(prototypeId);

  useEffect(() => {
    const loadProject = async () => {
      if (!containerRef.current) return;
      
      try {
        setIsLoading(true);
        setLoadError(null);

        // If we already have a deployment URL (from Supabase storage), 
        // try to use it directly in an iframe instead of StackBlitz
        if (deploymentUrl) {
          console.log("Using existing deployment URL:", deploymentUrl);
          return;
        }

        let files: Record<string, string> = {};
        
        console.log("Fetching prototype file data for ID:", prototypeId);
        
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
              const content = await file.async('text');
              files[path] = content;
            }
          });
          
          await Promise.all(promises);
          
          // Look for index.html at root or in any subdirectory
          let indexFile = Object.keys(files).find(path => 
            path === 'index.html' || path.endsWith('/index.html')
          );
          
          if (!indexFile) {
            // If no index.html, try to find any HTML file
            const anyHtmlFile = Object.keys(files).find(path => path.endsWith('.html'));
            if (anyHtmlFile) {
              indexFile = anyHtmlFile;
              console.log("Using HTML file as index:", anyHtmlFile);
            } else {
              throw new Error('No HTML files found in the ZIP archive');
            }
          }

          // Enhance HTML file with proper CSS imports
          if (indexFile) {
            let htmlContent = files[indexFile];
            
            // Find all CSS files in the archive
            const cssFiles = Object.keys(files).filter(path => path.endsWith('.css'));
            
            // Ensure CSS files are properly linked in the HTML
            if (cssFiles.length > 0) {
              // Create style injections for each CSS file
              const styleInjections = cssFiles.map(cssPath => {
                return `<style>${files[cssPath]}</style>`;
              }).join('\n');
              
              // Insert styles in the head of the HTML
              htmlContent = htmlContent.replace('</head>', `${styleInjections}\n</head>`);
              
              // Update the HTML file with CSS inlined
              files['index.html'] = htmlContent;
              
              // If the index file wasn't at the root, also update it
              if (indexFile !== 'index.html') {
                files[indexFile] = htmlContent;
              }
            }
          }
        } else if (fileName.endsWith('.html')) {
          // Handle HTML file
          console.log("Processing HTML file");
          const text = await fileData.text();
          files['index.html'] = text;
        } else {
          throw new Error('Unsupported file type. Please upload an HTML file or ZIP archive');
        }

        console.log("Creating StackBlitz project with files:", Object.keys(files));
        
        // Create StackBlitz project with correct configuration
        // Fixed: Removed the unsupported 'allowFullScreen' property
        await sdk.embedProject(
          containerRef.current,
          {
            title: 'Prototype Preview',
            description: 'Preview of the uploaded prototype',
            template: 'html',
            files: files,
          },
          {
            height: '100%',
            hideNavigation: true,
            hideDevTools: false,
            showSidebar: false,
            view: viewMode === 'preview' ? 'preview' : viewMode === 'code' ? 'editor' : 'both',
            terminalHeight: 0,
            forceEmbedLayout: true,
          }
        );

        console.log("StackBlitz project loaded successfully");

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
  }, [prototypeId, url, deploymentUrl, toast, viewMode]);

  const handleViewModeChange = (mode: 'preview' | 'code' | 'split') => {
    setViewMode(mode);
    
    // If we have a StackBlitz VM, update its view
    if (containerRef.current && containerRef.current.querySelector('iframe')) {
      try {
        sdk.embedProjectId(
          containerRef.current,
          prototypeId,
          {
            view: mode === 'preview' ? 'preview' : mode === 'code' ? 'editor' : 'both',
          }
        );
      } catch (error) {
        console.error("Error updating StackBlitz view mode:", error);
      }
    }
  };

  const handleToggleFeedbackMode = () => {
    if (!isFeedbackMode && !currentUser) {
      toast({
        title: "Authentication required",
        description: "You need to be logged in to leave feedback.",
        variant: "destructive"
      });
      return;
    }
    setIsFeedbackMode(!isFeedbackMode);
  };

  // If we have a deployment URL, render it in an iframe instead
  if (deploymentUrl) {
    return (
      <div className="relative h-full w-full overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 gap-3 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-muted-foreground">Loading preview...</div>
          </div>
        )}
        
        {/* Custom Controls */}
        <div className="absolute top-2 right-2 z-50">
          <PreviewControls 
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            isFeedbackMode={isFeedbackMode}
            onToggleFeedbackMode={handleToggleFeedbackMode}
            onShareClick={onShare || (() => {})}
          />
        </div>
        
        {/* Feedback Overlay */}
        <FeedbackOverlay
          prototypeId={prototypeId}
          isFeedbackMode={isFeedbackMode}
          feedbackPoints={feedbackPoints}
          onFeedbackAdded={addFeedbackPoint}
          onFeedbackUpdated={updateFeedbackPoint}
          feedbackUsers={feedbackUsers}
          currentUser={currentUser}
        />
        
        <iframe
          src={deploymentUrl}
          className="h-full w-full border-none"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-presentation"
          title="Prototype Preview"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setLoadError('Failed to load iframe content. Check console for details.');
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 gap-3 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-muted-foreground">Loading preview...</div>
        </div>
      )}
      
      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
          <div className="bg-white rounded-lg p-6 shadow-md max-w-md">
            <h3 className="text-lg font-semibold text-destructive mb-2">Preview Error</h3>
            <p className="text-muted-foreground">{loadError}</p>
          </div>
        </div>
      )}
      
      {/* Custom Controls */}
      <div className="absolute top-2 right-2 z-50">
        <PreviewControls 
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          isFeedbackMode={isFeedbackMode}
          onToggleFeedbackMode={handleToggleFeedbackMode}
          onShareClick={onShare || (() => {})}
        />
      </div>
      
      {/* Feedback Overlay */}
      <FeedbackOverlay
        prototypeId={prototypeId}
        isFeedbackMode={isFeedbackMode}
        feedbackPoints={feedbackPoints}
        onFeedbackAdded={addFeedbackPoint}
        onFeedbackUpdated={updateFeedbackPoint}
        feedbackUsers={feedbackUsers}
        currentUser={currentUser}
      />
      
      <div 
        ref={containerRef} 
        className="h-full w-full"
      />
    </div>
  );
}
