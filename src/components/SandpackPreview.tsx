import { useEffect, useRef, useState } from 'react';
import { 
  SandpackProvider, 
  SandpackPreview as SandpackPreviewComponent,
  SandpackCodeEditor,
  SandpackLayout,
  SandpackFiles,
  Sandpack
} from '@codesandbox/sandpack-react';
import { Loader2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePrototypeFeedback } from '@/hooks/use-prototype-feedback';
import { PreviewControls } from './preview/PreviewControls';
import { FeedbackOverlay } from './feedback/FeedbackOverlay';
import JSZip from 'jszip';
import { Button } from '@/components/ui/button';
import '@/styles/sandpack-fix.css';

interface SandpackPreviewProps {
  prototypeId: string;
  url?: string;
  deploymentUrl?: string;
  onShare?: () => void;
}

export function SandpackPreview({ prototypeId, url, deploymentUrl, onShare }: SandpackPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'code' | 'split'>('preview');
  const [isFeedbackMode, setIsFeedbackMode] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [files, setFiles] = useState<SandpackFiles>({});
  const [isFilesReady, setIsFilesReady] = useState(false);
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
      try {
        setIsLoading(true);
        setLoadError(null);

        // If we already have a deployment URL (from Supabase storage), 
        // use it directly in an iframe instead of Sandpack
        if (deploymentUrl) {
          console.log("Using existing deployment URL:", deploymentUrl);
          return;
        }

        let projectFiles: Record<string, string> = {};
        
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
              projectFiles[path] = content;
            }
          });
          
          await Promise.all(promises);
          
          // Look for index.html at root or in any subdirectory
          let indexFile = Object.keys(projectFiles).find(path => 
            path === 'index.html' || path.endsWith('/index.html')
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

          // Enhance HTML file with proper CSS imports
          if (indexFile) {
            let htmlContent = projectFiles[indexFile];
            
            // Find all CSS files in the archive
            const cssFiles = Object.keys(projectFiles).filter(path => path.endsWith('.css'));
            
            // Ensure CSS files are properly linked in the HTML
            if (cssFiles.length > 0) {
              // Create style injections for each CSS file
              const styleInjections = cssFiles.map(cssPath => {
                return `<style>${projectFiles[cssPath]}</style>`;
              }).join('\n');
              
              // Insert styles in the head of the HTML
              htmlContent = htmlContent.replace('</head>', `${styleInjections}\n</head>`);
              
              // Update the HTML file with CSS inlined
              projectFiles[indexFile] = htmlContent;
            }
            
            // Make sure we have an index.html at the root
            if (indexFile !== 'index.html') {
              projectFiles['index.html'] = projectFiles[indexFile];
            }
          }
        } else if (fileName.endsWith('.html')) {
          // Handle HTML file
          console.log("Processing HTML file");
          const text = await fileData.text();
          projectFiles['index.html'] = text;
        } else {
          throw new Error('Unsupported file type. Please upload an HTML file or ZIP archive');
        }

        // Add a simple support script that defines common prototype functions
        projectFiles['support.js'] = `
// Common prototype functions that might be needed
if (typeof window.menuitemfn === 'undefined') {
  window.menuitemfn = function(id) {
    console.log('Menu item clicked:', id);
    var element = document.getElementById(id);
    if (element) element.click();
  };
}
`;

        // Add script tag to HTML files to include support.js
        Object.keys(projectFiles).forEach(path => {
          if (path.endsWith('.html')) {
            let htmlContent = projectFiles[path];
            if (!htmlContent.includes('support.js')) {
              // Add the script tag right before the closing body tag
              htmlContent = htmlContent.replace('</body>', '<script src="./support.js"></script></body>');
              projectFiles[path] = htmlContent;
            }
          }
        });

        console.log("Creating Sandpack project with files:", Object.keys(projectFiles));
        
        // Set files for Sandpack
        setFiles(projectFiles);
        setIsFilesReady(true);
        console.log("Sandpack project loaded successfully");

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
  }, [prototypeId, url, deploymentUrl, toast]);

  // Handle view mode change
  const handleViewModeChange = (mode: 'preview' | 'code' | 'split') => {
    setViewMode(mode);
    
    // Add analytics or other side effects if needed
    console.log(`View mode changed to: ${mode}`);
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

  const handleToggleUI = () => {
    setShowUI(!showUI);
    // If onShare is provided, call it as well (for backward compatibility)
    if (onShare) {
      onShare();
    }
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
        
        {/* Custom Controls - Only show if showUI is true */}
        {showUI && (
          <div className="absolute top-2 right-2 z-50">
            <PreviewControls 
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              isFeedbackMode={isFeedbackMode}
              onToggleFeedbackMode={handleToggleFeedbackMode}
              showUI={showUI}
              onToggleUI={handleToggleUI}
            />
          </div>
        )}
        
        {/* Always show a minimal toggle button when UI is hidden */}
        {!showUI && (
          <div className="absolute top-2 right-2 z-50">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm shadow-md"
              onClick={handleToggleUI}
              title="Show UI"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        
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
      
      {/* Custom Controls - Only show if showUI is true */}
      {showUI && (
        <div className="absolute top-2 right-2 z-50">
          <PreviewControls 
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            isFeedbackMode={isFeedbackMode}
            onToggleFeedbackMode={handleToggleFeedbackMode}
            showUI={showUI}
            onToggleUI={handleToggleUI}
          />
        </div>
      )}
      
      {/* Always show a minimal toggle button when UI is hidden */}
      {!showUI && (
        <div className="absolute top-2 right-2 z-50">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm shadow-md"
            onClick={handleToggleUI}
            title="Show UI"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      
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
      
      {isFilesReady && (
        <div className="h-full w-full">
          {viewMode === 'preview' && (
            <SandpackProvider
              template="static"
              files={files}
              theme="dark"
              options={{
                classes: {
                  "sp-wrapper": "h-full",
                  "sp-layout": "h-full",
                  "sp-stack": "h-full",
                  "sp-preview": "h-full",
                  "sp-preview-container": "h-full",
                  "sp-preview-iframe": "h-full"
                },
                recompileMode: "delayed",
                recompileDelay: 500
              }}
              customSetup={{
                entry: "index.html"
              }}
            >
              <SandpackPreviewComponent className="h-full w-full" />
            </SandpackProvider>
          )}
          
          {viewMode === 'code' && (
            <Sandpack
              template="static"
              files={files}
              theme="dark"
              options={{
                showNavigator: true,
                showTabs: true,
                showLineNumbers: true,
                showInlineErrors: true,
                wrapContent: true,
                editorHeight: "100%",
                classes: {
                  "sp-wrapper": "h-full",
                  "sp-layout": "h-full",
                  "sp-stack": "h-full",
                  "sp-code-editor": "h-full",
                  "sp-tabs": "bg-background border-b border-border",
                  "sp-tab-button": "text-muted-foreground hover:text-foreground",
                  "sp-file-explorer": "border-r border-border"
                },
                visibleFiles: Object.keys(files),
                activeFile: 'index.html',
                recompileMode: "delayed",
                recompileDelay: 500
              }}
              customSetup={{
                entry: "index.html"
              }}
            />
          )}
          
          {viewMode === 'split' && (
            <Sandpack
              template="static"
              files={files}
              theme="dark"
              options={{
                showNavigator: true,
                showTabs: true,
                showLineNumbers: true,
                showInlineErrors: true,
                wrapContent: true,
                editorHeight: "100%",
                classes: {
                  "sp-wrapper": "h-full",
                  "sp-layout": "h-full",
                  "sp-stack": "h-full",
                  "sp-preview": "h-full",
                  "sp-preview-container": "h-full",
                  "sp-preview-iframe": "h-full",
                  "sp-code-editor": "h-full",
                  "sp-tabs": "bg-background border-b border-border",
                  "sp-tab-button": "text-muted-foreground hover:text-foreground",
                  "sp-file-explorer": "border-r border-border"
                },
                visibleFiles: Object.keys(files),
                activeFile: 'index.html',
                recompileMode: "delayed",
                recompileDelay: 500
              }}
              customSetup={{
                entry: "index.html"
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
