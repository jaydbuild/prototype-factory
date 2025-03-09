import { useEffect, useRef, useState } from 'react';
import { 
  SandpackProvider, 
  SandpackPreview as SandpackPreviewComponent,
  SandpackCodeEditor,
  SandpackLayout,
  SandpackFiles,
  Sandpack,
  useSandpack,
  SandpackConsole
} from '@codesandbox/sandpack-react';
import { Loader2, Eye, AlertCircle, RefreshCw, Smartphone, Tablet, Monitor, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePrototypeFeedback } from '@/hooks/use-prototype-feedback';
import { PreviewControls } from './preview/PreviewControls';
import { FeedbackOverlay } from './feedback/FeedbackOverlay';
import JSZip from 'jszip';
import { Button } from '@/components/ui/button';
import '@/styles/sandpack-fix.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Device preview types
type DeviceType = 'desktop' | 'tablet' | 'mobile' | 'custom';
type Orientation = 'portrait' | 'landscape';

interface DeviceConfig {
  name: string;
  width: number;
  height: number;
  devicePixelRatio?: number;
}

// Predefined device configurations
const deviceConfigs: Record<string, DeviceConfig> = {
  // Mobile devices
  'iphone-se': { name: 'iPhone SE', width: 375, height: 667, devicePixelRatio: 2 },
  'iphone-xr': { name: 'iPhone XR', width: 414, height: 896, devicePixelRatio: 2 },
  'iphone-12': { name: 'iPhone 12', width: 390, height: 844, devicePixelRatio: 3 },
  'pixel-5': { name: 'Pixel 5', width: 393, height: 851, devicePixelRatio: 2.75 },
  'galaxy-s20': { name: 'Galaxy S20', width: 360, height: 800, devicePixelRatio: 3 },
  
  // Tablet devices
  'ipad-mini': { name: 'iPad Mini', width: 768, height: 1024, devicePixelRatio: 2 },
  'ipad-pro': { name: 'iPad Pro 11"', width: 834, height: 1194, devicePixelRatio: 2 },
  'galaxy-tab': { name: 'Galaxy Tab S7', width: 800, height: 1280, devicePixelRatio: 2 },
  
  // Desktop presets
  'laptop': { name: 'Laptop (1366x768)', width: 1366, height: 768 },
  'desktop': { name: 'Desktop (1920x1080)', width: 1920, height: 1080 },
};

interface SandpackPreviewProps {
  prototypeId: string;
  url?: string;
  deploymentUrl?: string;
  onShare?: () => void;
}

export function SandpackPreview({ prototypeId, url, deploymentUrl, onShare }: SandpackPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [isFeedbackMode, setIsFeedbackMode] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [files, setFiles] = useState<SandpackFiles>({});
  const [isFilesReady, setIsFilesReady] = useState(false);
  const [activeFile, setActiveFile] = useState<string>('index.html');
  const [isPreviewable, setIsPreviewable] = useState<boolean>(true);
  // Device preview state
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [customDimensions, setCustomDimensions] = useState<{ width: number; height: number }>({ width: 375, height: 667 });
  const [scale, setScale] = useState<number>(1);
  const [showCustomDimensionsDialog, setShowCustomDimensionsDialog] = useState(false);
  const [tempCustomDimensions, setTempCustomDimensions] = useState({ width: 375, height: 667 });
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  // Check if a file is previewable
  const checkIsPreviewable = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    // Files that can be previewed directly
    const previewableExtensions = ['html', 'htm'];
    
    // Files that can be previewed as part of an HTML page
    const supportedAssets = ['js', 'css', 'json', 'svg', 'png', 'jpg', 'jpeg', 'gif', 'webp'];
    
    if (previewableExtensions.includes(extension || '')) {
      return true;
    } else if (supportedAssets.includes(extension || '')) {
      // Check if we have an HTML file that might include this asset
      return Object.keys(files).some(file => file.endsWith('.html') || file.endsWith('.htm'));
    }
    
    return false;
  };
  
  // Handle file change
  const handleFileChange = (file: string) => {
    console.log(`File change detected: ${file}`);
    setActiveFile(file);
    setIsPreviewable(checkIsPreviewable(file));
  };

  // Handle view mode change
  const handleViewModeChange = (mode: 'preview' | 'code') => {
    setViewMode(mode);
    // Reset to desktop view when switching to code view
    if (mode === 'code') {
      setDeviceType('desktop');
      setOrientation('portrait');
    }
    
    // If trying to switch to preview mode but file isn't previewable, stay in code mode
    if (mode === 'preview' && !isPreviewable) {
      toast({
        title: "Preview not available",
        description: `The file "${activeFile}" cannot be previewed directly. Showing code view instead.`,
        variant: "default",
      });
      setViewMode('code');
    }
  };

  // Handle toggle feedback mode
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
    
    // When enabling feedback mode, make sure we're in preview mode
    if (!isFeedbackMode && viewMode !== 'preview') {
      handleViewModeChange('preview');
    }
  };

  // Handle toggle UI
  const handleToggleUI = () => {
    setShowUI(!showUI);
  };
  
  // Custom preview component that shows the correct file
  const CustomPreview = ({ file, hideNavigator = false }: { file: string, hideNavigator?: boolean }) => {
    const { sandpack } = useSandpack();
    const [refreshKey, setRefreshKey] = useState(0);
    const previousFileRef = useRef<string | null>(null);
    
    // Force the preview to update when the file changes
    useEffect(() => {
      // Only update if the file has actually changed
      if (sandpack && file && previousFileRef.current !== file) {
        // Set the active file in Sandpack
        sandpack.setActiveFile(file);
        console.log(`Set active file to: ${file}`);
        
        // Update the ref to track the current file
        previousFileRef.current = file;
      }
    }, [file, sandpack]);

    // Add custom CSS to hide the navigator bar
    useEffect(() => {
      if (hideNavigator) {
        // Add a style element to hide the navigator
        const styleElement = document.createElement('style');
        styleElement.textContent = `
          .sp-navigator {
            display: none !important;
          }
          .sp-preview-container {
            padding-top: 0 !important;
          }
          /* Hide the "Open Sandbox" FAB button */
          .sp-button.sp-preview-actions {
            display: none !important;
          }
          /* Hide the CodeSandbox export button */
          .sp-c-kwibBT.sp-preview-actions,
          .sp-preview-actions {
            display: none !important;
          }
        `;
        document.head.appendChild(styleElement);
        
        return () => {
          // Clean up the style element when component unmounts
          document.head.removeChild(styleElement);
        };
      }
    }, [hideNavigator]);
    
    return (
      <div className="h-full w-full relative">
        <SandpackPreviewComponent 
          className="h-full w-full" 
          showNavigator={!hideNavigator}
          showRefreshButton={false}
        />
      </div>
    );
  };

  // Custom component to listen for file changes
  const FileChangeListener = ({ onFileChange }: { onFileChange: (file: string) => void }) => {
    const { sandpack } = useSandpack();
    const [currentFile, setCurrentFile] = useState<string>(sandpack.activeFile || '');
    
    useEffect(() => {
      // Handle initial file selection
      if (sandpack.activeFile && sandpack.activeFile !== currentFile) {
        onFileChange(sandpack.activeFile);
        setCurrentFile(sandpack.activeFile);
        console.log(`Initial active file: ${sandpack.activeFile}`);
      }
      
      // Set up a listener for file changes
      const handleFileChange = () => {
        if (sandpack.activeFile && sandpack.activeFile !== currentFile) {
          onFileChange(sandpack.activeFile);
          setCurrentFile(sandpack.activeFile);
          console.log(`Active file changed to: ${sandpack.activeFile}`);
        }
      };
      
      // Add event listener for Sandpack's file changes
      document.addEventListener('sandpack-file-change', handleFileChange);
      
      return () => {
        // Remove event listener
        document.removeEventListener('sandpack-file-change', handleFileChange);
      };
    }, [sandpack, onFileChange, currentFile]);
    
    return null;
  };

  // Helper function to get device dimensions
  const getDeviceDimensions = () => {
    if (deviceType === 'desktop') {
      return { width: '100%', height: '100%' };
    }
    
    if (deviceType === 'custom') {
      const { width, height } = customDimensions;
      return orientation === 'portrait' 
        ? { width: `${width}px`, height: `${height}px` } 
        : { width: `${height}px`, height: `${width}px` };
    }
    
    if (selectedDevice && deviceConfigs[selectedDevice]) {
      const { width, height } = deviceConfigs[selectedDevice];
      return orientation === 'portrait' 
        ? { width: `${width}px`, height: `${height}px` } 
        : { width: `${height}px`, height: `${width}px` };
    }
    
    // Default dimensions if no specific device is selected
    switch (deviceType) {
      case 'mobile':
        return orientation === 'portrait' 
          ? { width: '375px', height: '667px' } 
          : { width: '667px', height: '375px' };
      case 'tablet':
        return orientation === 'portrait' 
          ? { width: '768px', height: '1024px' } 
          : { width: '1024px', height: '768px' };
      default:
        return { width: '100%', height: '100%' };
    }
  };

  // Apply device preview styling
  const getDevicePreviewStyle = () => {
    if (deviceType === 'desktop') {
      return {
        width: '100%',
        height: '100%',
        overflow: 'auto'
      };
    }
    
    const { width, height } = getDeviceDimensions();
    
    return {
      width,
      height,
      margin: 'auto',
      border: '12px solid #333',
      borderRadius: '12px',
      boxShadow: '0 0 20px rgba(0, 0, 0, 0.2)',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      transform: scale !== 1 ? `scale(${scale})` : 'none',
      transformOrigin: 'center top'
    };
  };
  
  // Handle device type change
  const handleDeviceTypeChange = (type: DeviceType) => {
    setDeviceType(type);
    
    // Set a default device for each type
    if (type === 'mobile') {
      setSelectedDevice('iphone-12');
    } else if (type === 'tablet') {
      setSelectedDevice('ipad-mini');
    } else if (type === 'desktop') {
      setSelectedDevice('');
    } else if (type === 'custom') {
      setSelectedDevice('');
      // Show custom dimensions dialog
      setTempCustomDimensions(customDimensions);
      setShowCustomDimensionsDialog(true);
    }
    
    // Reset scale when changing device type
    setScale(1);
  };

  // Handle specific device selection
  const handleDeviceSelection = (deviceId: string) => {
    setSelectedDevice(deviceId);
    
    // Set the appropriate device type based on the selected device
    if (deviceId.includes('iphone') || deviceId.includes('pixel') || deviceId.includes('galaxy-s')) {
      setDeviceType('mobile');
    } else if (deviceId.includes('ipad') || deviceId.includes('galaxy-tab')) {
      setDeviceType('tablet');
    } else if (deviceId === 'laptop' || deviceId === 'desktop') {
      setDeviceType('desktop');
    }
  };
  
  // Handle scale change
  const handleScaleChange = (newScale: number) => {
    setScale(newScale);
  };

  // Handle saving custom dimensions
  const handleSaveCustomDimensions = () => {
    setCustomDimensions(tempCustomDimensions);
    setShowCustomDimensionsDialog(false);
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full relative">
      {/* Fixed-height header with controls */}
      <div className={`flex justify-between items-center p-2 ${showUI ? '' : 'hidden'}`}>
        <PreviewControls
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          isFeedbackMode={isFeedbackMode}
          onToggleFeedbackMode={handleToggleFeedbackMode}
          showUI={showUI}
          onToggleUI={handleToggleUI}
          deviceType={deviceType}
          orientation={orientation}
          onDeviceChange={handleDeviceTypeChange}
          onOrientationChange={() => setOrientation(orientation === 'portrait' ? 'landscape' : 'portrait')}
          onScaleChange={handleScaleChange}
          scale={scale}
          selectedDevice={selectedDevice}
          onDeviceSelection={handleDeviceSelection}
          deviceConfigs={deviceConfigs}
          onRefresh={() => {
            // Set refreshing state
            setIsRefreshing(true);
            console.log(`Manually refreshed preview for file: ${activeFile}`);
            
            // Create a temporary iframe to trigger a refresh
            const iframe = document.querySelector('.sp-preview iframe') as HTMLIFrameElement;
            if (iframe) {
              iframe.src = iframe.src;
              
              // Listen for the iframe to load
              iframe.onload = () => {
                // Reset refreshing state after a short delay to ensure the UI updates
                setTimeout(() => {
                  setIsRefreshing(false);
                }, 500);
              };
              
              // Fallback timeout in case onload doesn't fire
              setTimeout(() => {
                setIsRefreshing(false);
              }, 5000);
            } else {
              // If iframe not found, reset state after a short delay
              setTimeout(() => {
                setIsRefreshing(false);
              }, 1000);
            }
          }}
          onShare={onShare}
        />
        
        <div className="flex items-center gap-2">
          {deploymentUrl && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => window.open(deploymentUrl, '_blank')}
            >
              Open Deployed Version
            </Button>
          )}
        </div>
      </div>
      
      {/* UI toggle button when UI is hidden - positioned at top left */}
      {!showUI && (
        <Button
          variant="outline"
          size="sm"
          className="absolute top-2 left-2 z-50 bg-background"
          onClick={handleToggleUI}
        >
          <Eye className="h-4 w-4 mr-1" />
          Show UI
        </Button>
      )}
      
      {/* Loading indicator for initial load */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading prototype...</p>
          </div>
        </div>
      )}
      
      {/* Refreshing indicator */}
      {isRefreshing && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Refreshing prototype...</p>
          </div>
        </div>
      )}
      
      {/* Error display */}
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
          <div className="bg-white rounded-lg p-6 shadow-md max-w-md">
            <h3 className="text-lg font-semibold text-destructive mb-2">Preview Error</h3>
            <p className="text-muted-foreground">{loadError}</p>
          </div>
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
        previewContainerRef={previewContainerRef}
        deviceType={deviceType}
        orientation={orientation}
        scale={scale}
      />
      
      {isFilesReady && (
        <div className="h-full w-full">
          {viewMode === 'preview' && isPreviewable && (
            <div className="h-full w-full flex items-center justify-center overflow-auto">
              <div style={getDevicePreviewStyle()} ref={previewContainerRef}>
                <SandpackProvider
                  key={`preview-${activeFile}-${deviceType}-${orientation}`}
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
                    recompileMode: "immediate",
                    recompileDelay: 0,
                    activeFile: activeFile
                  }}
                  customSetup={{
                    entry: activeFile
                  }}
                >
                  <CustomPreview file={activeFile} hideNavigator={true} />
                </SandpackProvider>
              </div>
            </div>
          )}
          
          {(viewMode === 'code' || !isPreviewable) && (
            <div className="flex h-full w-full">
              {/* Code editor - takes 40% of the space */}
              <div className="w-[40%] h-full">
                <SandpackProvider
                  key={`code-editor-${activeFile}`}
                  template="static"
                  files={files}
                  theme="dark"
                  options={{
                    classes: {
                      "sp-wrapper": "h-full",
                      "sp-layout": "h-full",
                      "sp-stack": "h-full",
                      "sp-code-editor": "h-full",
                      "sp-tabs": "bg-background border-b border-border",
                      "sp-tab-button": "text-muted-foreground hover:text-foreground",
                      "sp-file-explorer": "border-r border-border"
                    },
                    recompileMode: "immediate",
                    recompileDelay: 0,
                    activeFile: activeFile
                  }}
                  customSetup={{
                    entry: activeFile
                  }}
                >
                  <div className="flex h-full flex-col">
                    {!isPreviewable && viewMode === 'preview' && (
                      <div className="bg-muted/50 text-muted-foreground text-sm p-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <span>This file type cannot be previewed directly. Showing code view instead.</span>
                      </div>
                    )}
                    <SandpackCodeEditor
                      showTabs={true}
                      showLineNumbers={true}
                      showInlineErrors={true}
                      wrapContent={true}
                      className="h-full"
                    />
                    <FileChangeListener onFileChange={handleFileChange} />
                  </div>
                </SandpackProvider>
              </div>
              
              {/* Preview - takes 60% of the space */}
              <div className="w-[60%] h-full border-l border-border">
                {isPreviewable ? (
                  <div className="h-full w-full flex items-center justify-center overflow-auto">
                    <div style={getDevicePreviewStyle()}>
                      <SandpackProvider
                        key={`split-preview-${activeFile}-${deviceType}-${orientation}`}
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
                          recompileMode: "immediate",
                          recompileDelay: 0,
                          activeFile: activeFile
                        }}
                        customSetup={{
                          entry: activeFile
                        }}
                      >
                        <CustomPreview file={activeFile} hideNavigator={true} />
                      </SandpackProvider>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted/30">
                    <div className="text-center p-6 max-w-md">
                      <AlertCircle className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">No preview available</h3>
                      <p className="text-sm text-muted-foreground">
                        This file type cannot be previewed directly. You can view the code on the left.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Custom Dimensions Dialog */}
      <Dialog open={showCustomDimensionsDialog} onOpenChange={setShowCustomDimensionsDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Custom Device Dimensions</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="width">Width (px)</Label>
                <Input
                  id="width"
                  type="number"
                  value={tempCustomDimensions.width}
                  onChange={(e) => setTempCustomDimensions({
                    ...tempCustomDimensions,
                    width: parseInt(e.target.value) || 375
                  })}
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="height">Height (px)</Label>
                <Input
                  id="height"
                  type="number"
                  value={tempCustomDimensions.height}
                  onChange={(e) => setTempCustomDimensions({
                    ...tempCustomDimensions,
                    height: parseInt(e.target.value) || 667
                  })}
                />
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Common dimensions:
              <div className="flex flex-wrap gap-1 mt-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-6 text-xs" 
                  onClick={() => setTempCustomDimensions({ width: 375, height: 667 })}
                >
                  375×667
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-6 text-xs" 
                  onClick={() => setTempCustomDimensions({ width: 390, height: 844 })}
                >
                  390×844
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-6 text-xs" 
                  onClick={() => setTempCustomDimensions({ width: 768, height: 1024 })}
                >
                  768×1024
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-6 text-xs" 
                  onClick={() => setTempCustomDimensions({ width: 1366, height: 768 })}
                >
                  1366×768
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-6 text-xs" 
                  onClick={() => setTempCustomDimensions({ width: 1920, height: 1080 })}
                >
                  1920×1080
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomDimensionsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCustomDimensions}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
