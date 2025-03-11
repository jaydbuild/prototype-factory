import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { 
  SandpackProvider, 
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview as SandpackPreviewComponent,
  useSandpack,
  SandpackFiles,
  SandpackPredefinedTemplate,
} from '@codesandbox/sandpack-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FeedbackOverlay } from './feedback/FeedbackOverlay';
import { PreviewControls } from './preview/PreviewControls';
import { FigmaUrlForm } from './FigmaUrlForm';
import { Loader2, Eye, AlertCircle, RefreshCw, Smartphone, Tablet, Monitor, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePrototypeFeedback } from '@/hooks/use-prototype-feedback';
import { FeedbackPoint as FeedbackPointType } from '@/types/feedback';
import { useIframeStability } from '@/hooks/use-iframe-stability';
import JSZip from 'jszip';
import '@/styles/sandpack-fix.css';

type DeviceType = 'desktop' | 'tablet' | 'mobile' | 'custom';
type Orientation = 'portrait' | 'landscape';

interface DeviceConfig {
  name: string;
  width: number;
  height: number;
  devicePixelRatio?: number;
}

const deviceConfigs: Record<string, DeviceConfig> = {
  'iphone-se': { name: 'iPhone SE', width: 375, height: 667, devicePixelRatio: 2 },
  'iphone-xr': { name: 'iPhone XR', width: 414, height: 896, devicePixelRatio: 2 },
  'iphone-12': { name: 'iPhone 12', width: 390, height: 844, devicePixelRatio: 3 },
  'pixel-5': { name: 'Pixel 5', width: 393, height: 851, devicePixelRatio: 2.75 },
  'galaxy-s20': { name: 'Galaxy S20', width: 360, height: 800, devicePixelRatio: 3 },
  
  'ipad-mini': { name: 'iPad Mini', width: 768, height: 1024, devicePixelRatio: 2 },
  'ipad-pro': { name: 'iPad Pro 11"', width: 834, height: 1194, devicePixelRatio: 2 },
  'galaxy-tab': { name: 'Galaxy Tab S7', width: 800, height: 1280, devicePixelRatio: 2 },
  
  'laptop': { name: 'Laptop (1366x768)', width: 1366, height: 768 },
  'desktop': { name: 'Desktop (1920x1080)', width: 1920, height: 1080 },
};

interface SandpackPreviewProps {
  prototypeId: string;
  url?: string;
  deploymentUrl?: string;
  figmaUrl?: string | null;
  onShare?: () => void;
}

const StablePreview = memo(({ file, hideNavigator = false }: { file: string, hideNavigator?: boolean }) => {
  const { sandpack } = useSandpack();
  const previousFileRef = useRef<string | null>(null);
  const { isIframeReady } = useIframeStability({ 
    containerSelector: '.sp-preview',
    readyCheckInterval: 150
  });
  
  useEffect(() => {
    try {
      if (sandpack && file && previousFileRef.current !== file) {
        sandpack.setActiveFile(file);
        console.log(`Set active file to: ${file}`);
        previousFileRef.current = file;
      }
    } catch (error) {
      console.error("Error setting active file:", error);
    }
  }, [file, sandpack]);

  useEffect(() => {
    if (!hideNavigator) return;
    
    try {
      const styleId = 'sandpack-custom-styles';
      let styleElement = document.getElementById(styleId) as HTMLStyleElement;
      
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }
      
      styleElement.textContent = `
        .sp-navigator {
          display: none !important;
        }
        .sp-preview-container {
          padding-top: 0 !important;
        }
        .sp-button.sp-preview-actions {
          display: none !important;
        }
        .sp-c-kwibBT.sp-preview-actions,
        .sp-preview-actions {
          display: none !important;
        }
      `;
    } catch (error) {
      console.error("Error applying custom styles:", error);
    }
  }, [hideNavigator]);
  
  return (
    <div className="h-full w-full relative">
      {!isIframeReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      )}
      <SandpackPreviewComponent 
        className="h-full w-full" 
        showRefreshButton={false}
      />
    </div>
  );
});

StablePreview.displayName = 'StablePreview';

const FileChangeListener = memo(({ onFileChange }: { onFileChange: (file: string) => void }) => {
  const { sandpack } = useSandpack();
  const [currentFile, setCurrentFile] = useState<string>(sandpack.activeFile || '');
  
  useEffect(() => {
    if (sandpack.activeFile && sandpack.activeFile !== currentFile) {
      onFileChange(sandpack.activeFile);
      setCurrentFile(sandpack.activeFile);
      console.log(`Initial active file: ${sandpack.activeFile}`);
    }
    
    const handleFileChange = () => {
      if (sandpack.activeFile && sandpack.activeFile !== currentFile) {
        onFileChange(sandpack.activeFile);
        setCurrentFile(sandpack.activeFile);
        console.log(`Active file changed to: ${sandpack.activeFile}`);
      }
    };
    
    document.addEventListener('sandpack-file-change', handleFileChange);
    
    return () => {
      document.removeEventListener('sandpack-file-change', handleFileChange);
    };
  }, [sandpack, onFileChange, currentFile]);
  
  return null;
});

FileChangeListener.displayName = 'FileChangeListener';

export function SandpackPreview({ prototypeId, url, deploymentUrl, figmaUrl, onShare }: SandpackPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'code' | 'split' | 'design'>('preview');
  const [isFeedbackMode, setIsFeedbackMode] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [files, setFiles] = useState<SandpackFiles>({});
  const [isFilesReady, setIsFilesReady] = useState(false);
  const [activeFile, setActiveFile] = useState<string>('index.html');
  const [isPreviewable, setIsPreviewable] = useState<boolean>(true);
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [customDimensions, setCustomDimensions] = useState<{ width: number; height: number }>({ width: 375, height: 667 });
  const [scale, setScale] = useState<number>(1);
  const [showCustomDimensionsDialog, setShowCustomDimensionsDialog] = useState(false);
  const [tempCustomDimensions, setTempCustomDimensions] = useState({ width: 375, height: 667 });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [figmaUrlState, setFigmaUrlState] = useState<string | null>(figmaUrl || null);
  const { toast } = useToast();
  
  const {
    feedbackPoints,
    isLoading: isFeedbackLoading,
    feedbackUsers,
    currentUser,
    addFeedbackPoint: addFeedbackPointFromHook,
    updateFeedbackPoint: updateFeedbackPointFromHook
  } = usePrototypeFeedback(prototypeId);

  const addFeedbackPoint = useCallback((feedback: FeedbackPointType) => {
    addFeedbackPointFromHook(feedback);
  }, [addFeedbackPointFromHook]);

  const updateFeedbackPoint = useCallback((updatedFeedback: FeedbackPointType) => {
    updateFeedbackPointFromHook(updatedFeedback);
  }, [updateFeedbackPointFromHook]);

  useEffect(() => {
    if (figmaUrl !== undefined) {
      setFigmaUrlState(figmaUrl);
    }
  }, [figmaUrl]);

  useEffect(() => {
    const loadProject = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        if (deploymentUrl) {
          console.log("Using existing deployment URL:", deploymentUrl);
          return;
        }

        let projectFiles: Record<string, string> = {};
        
        console.log("Fetching prototype file data for ID:", prototypeId);
        
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
        
        const { data: fileData, error: fileError } = await supabase.storage
          .from('prototype-uploads')
          .download(prototype.file_path);

        if (fileError) {
          throw new Error(`Error downloading file: ${fileError.message}`);
        }

        if (!fileData) {
          throw new Error('No file data received');
        }

        const fileName = prototype.file_path.split('/').pop() || 'index.html';
        
        if (fileName.endsWith('.zip')) {
          const zip = new JSZip();
          const contents = await zip.loadAsync(fileData);
          
          const promises = Object.keys(contents.files).map(async (path) => {
            const file = contents.files[path];
            if (!file.dir) {
              const content = await file.async('text');
              projectFiles[path] = content;
            }
          });
          
          await Promise.all(promises);
          
          let indexFile = Object.keys(projectFiles).find(path => 
            path === 'index.html' || path.endsWith('/index.html')
          );
          
          if (!indexFile) {
            const anyHtmlFile = Object.keys(projectFiles).find(path => path.endsWith('.html'));
            if (anyHtmlFile) {
              indexFile = anyHtmlFile;
              console.log("Using HTML file as index:", anyHtmlFile);
            } else {
              throw new Error('No HTML files found in the ZIP archive');
            }
          }

          if (indexFile) {
            let htmlContent = projectFiles[indexFile];
            
            const cssFiles = Object.keys(projectFiles).filter(path => path.endsWith('.css'));
            
            if (cssFiles.length > 0) {
              const styleInjections = cssFiles.map(cssPath => {
                return `<style>${projectFiles[cssPath]}</style>`;
              }).join('\n');
              
              htmlContent = htmlContent.replace('</head>', `${styleInjections}\n</head>`);
              
              projectFiles[indexFile] = htmlContent;
            }
            
            if (indexFile !== 'index.html') {
              projectFiles['index.html'] = projectFiles[indexFile];
            }
          }
        } else if (fileName.endsWith('.html')) {
          const text = await fileData.text();
          projectFiles['index.html'] = text;
        } else {
          throw new Error('Unsupported file type. Please upload an HTML file or ZIP archive');
        }

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

        Object.keys(projectFiles).forEach(path => {
          if (path.endsWith('.html')) {
            let htmlContent = projectFiles[path];
            if (!htmlContent.includes('support.js')) {
              htmlContent = htmlContent.replace('</body>', '<script src="./support.js"></script></body>');
              projectFiles[path] = htmlContent;
            }
          }
        });

        console.log("Creating Sandpack project with files:", Object.keys(projectFiles));
        
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

  const checkIsPreviewable = useCallback((filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    const previewableExtensions = ['html', 'htm'];
    
    const supportedAssets = ['js', 'css', 'json', 'svg', 'png', 'jpg', 'jpeg', 'gif', 'webp'];
    
    if (previewableExtensions.includes(extension || '')) {
      return true;
    } else if (supportedAssets.includes(extension || '')) {
      return Object.keys(files).some(file => file.endsWith('.html') || file.endsWith('.htm'));
    }
    
    return false;
  }, [files]);
  
  const handleFileChange = useCallback((file: string) => {
    console.log(`File change detected: ${file}`);
    setActiveFile(file);
    setIsPreviewable(checkIsPreviewable(file));
  }, [checkIsPreviewable]);

  const sandpackKey = useCallback(() => `preview-${prototypeId}`, [prototypeId]);

  const isInitialMount = useRef(true);
  
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
  }, []);

  const handleViewModeChange = useCallback((mode: 'preview' | 'code' | 'split' | 'design') => {
    setViewMode(mode);
    if (mode === 'code') {
      setDeviceType('desktop');
      setOrientation('portrait');
    }
    
    if (mode !== 'preview' && isFeedbackMode) {
      setIsFeedbackMode(false);
    }
    
    if (mode === 'preview' && !isPreviewable) {
      toast({
        title: "Preview not available",
        description: `The file "${activeFile}" cannot be previewed directly. Showing code view instead.`,
        variant: "default",
      });
      setViewMode('code');
    }
  }, [isFeedbackMode, isPreviewable, activeFile, toast]);

  const handleToggleFeedbackMode = useCallback(() => {
    if (!isFeedbackMode && !currentUser) {
      toast({
        title: "Authentication required",
        description: "You need to be logged in to leave feedback.",
        variant: "destructive"
      });
      return;
    }
    
    if (!isFeedbackMode && viewMode !== 'preview') {
      handleViewModeChange('preview');
      setTimeout(() => {
        setIsFeedbackMode(true);
      }, 100);
    } else {
      setIsFeedbackMode(!isFeedbackMode);
    }
  }, [isFeedbackMode, currentUser, viewMode, handleViewModeChange, toast]);

  const handleToggleUI = useCallback(() => {
    setShowUI(!showUI);
  }, [showUI]);

  const getDeviceDimensions = useCallback(() => {
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
  }, [deviceType, orientation, customDimensions, selectedDevice]);

  const getDevicePreviewStyle = useCallback(() => {
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
  }, [deviceType, getDeviceDimensions, scale]);
  
  const handleDeviceTypeChange = useCallback((type: DeviceType) => {
    setDeviceType(type);
    
    if (type === 'mobile') {
      setSelectedDevice('iphone-12');
    } else if (type === 'tablet') {
      setSelectedDevice('ipad-mini');
    } else if (type === 'desktop') {
      setSelectedDevice('');
    } else if (type === 'custom') {
      setSelectedDevice('');
      setTempCustomDimensions(customDimensions);
      setShowCustomDimensionsDialog(true);
    }
    
    setScale(1);
  }, [customDimensions]);

  const handleDeviceSelection = useCallback((deviceId: string) => {
    setSelectedDevice(deviceId);
    
    if (deviceId.includes('iphone') || deviceId.includes('pixel') || deviceId.includes('galaxy-s')) {
      setDeviceType('mobile');
    } else if (deviceId.includes('ipad') || deviceId.includes('galaxy-tab')) {
      setDeviceType('tablet');
    } else if (deviceId === 'laptop' || deviceId === 'desktop') {
      setDeviceType('desktop');
    }
  }, []);
  
  const handleScaleChange = useCallback((newScale: number) => {
    setScale(newScale);
  }, []);

  const handleSaveCustomDimensions = useCallback(() => {
    setCustomDimensions(tempCustomDimensions);
    setShowCustomDimensionsDialog(false);
  }, [tempCustomDimensions]);

  const handleAddFigmaUrl = useCallback((url: string) => {
    if (!url.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid Figma URL",
        variant: "destructive",
      });
      return;
    }
    
    setFigmaUrlState(url.trim());
    
    toast({
      title: "Success",
      description: "Figma URL added successfully",
    });
  }, [toast]);

  const handleFigmaUrlAdded = useCallback((url: string) => {
    setFigmaUrlState(url);
  }, []);

  const renderFigmaIframe = useCallback(() => {
    if (!figmaUrlState) return null;
    
    let figmaUrl = figmaUrlState;
    
    if (!figmaUrl.startsWith('http')) {
      figmaUrl = `https://${figmaUrl}`;
    }
    
    const embedUrl = `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(figmaUrl)}`;
    
    return (
      <div className="w-full h-full flex flex-col">
        <iframe 
          src={embedUrl}
          className="w-full h-full border-0"
          allowFullScreen
        />
      </div>
    );
  }, [figmaUrlState]);

  return (
    <div ref={containerRef} className="flex flex-col h-full relative">
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
          onOrientationChange={() => setOrientation(prev => prev === 'portrait' ? 'landscape' : 'portrait')}
          onScaleChange={handleScaleChange}
          scale={scale}
          selectedDevice={selectedDevice}
          onDeviceSelection={handleDeviceSelection}
          deviceConfigs={deviceConfigs}
          onRefresh={() => {
            setIsRefreshing(true);
            console.log(`Manually refreshed preview for file: ${activeFile}`);
            
            const iframe = document.querySelector('.sp-preview iframe') as HTMLIFrameElement;
            if (iframe) {
              const currentSrc = iframe.src;
              
              const refreshSrc = currentSrc.includes('?') 
                ? `${currentSrc}&_refresh=${Date.now()}` 
                : `${currentSrc}?_refresh=${Date.now()}`;
                
              iframe.src = refreshSrc;
              
              const onLoad = () => {
                setTimeout(() => {
                  setIsRefreshing(false);
                }, 300);
                iframe.removeEventListener('load', onLoad);
              };
              
              iframe.addEventListener('load', onLoad);
              
              setTimeout(() => {
                setIsRefreshing(false);
              }, 3000);
            } else {
              setTimeout(() => {
                setIsRefreshing(false);
              }, 500);
            }
          }}
          onShare={onShare}
          hasFigmaDesign={!!figmaUrlState} 
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
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading prototype...</p>
          </div>
        </div>
      )}
      
      {isRefreshing && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Refreshing prototype...</p>
          </div>
        </div>
      )}
      
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
          <div className="bg-white rounded-lg p-6 shadow-md max-w-md">
            <h3 className="text-lg font-semibold text-destructive mb-2">Preview Error</h3>
            <p className="text-muted-foreground">{loadError}</p>
          </div>
        </div>
      )}
      
      {isFilesReady && (
        <div className="h-full w-full">
          {viewMode === 'preview' && isPreviewable && (
            <div className="h-full w-full flex items-center justify-center overflow-auto">
              <div 
                style={getDevicePreviewStyle()} 
                ref={previewContainerRef}
                className="relative"
              >
                <SandpackProvider
                  key={sandpackKey()}
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
                    activeFile: activeFile,
                    initMode: "immediate",
                    fileResolver: {
                      isFile: async (path: string) => {
                        return Object.keys(files).includes(path);
                      },
                      readFile: async (path: string) => {
                        return typeof files[path] === 'string' ? files[path] : files[path]?.code || '';
                      }
                    }
                  }}
                  customSetup={{
                    entry: activeFile
                  }}
                >
                  <StablePreview 
                    file={activeFile} 
                    hideNavigator={true} 
                  />
                </SandpackProvider>
                
                <div 
                  className={`absolute inset-0 ${isFeedbackMode ? 'pointer-events-auto' : 'pointer-events-none'}`}
                  onClick={(e) => {
                    if (isFeedbackMode) {
                      e.stopPropagation();
                    }
                  }}
                >
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
                </div>
              </div>
            </div>
          )}
          
          {(viewMode === 'code' || !isPreviewable) && (
            <div className="flex h-full w-full">
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
                    activeFile: activeFile,
                    initMode: "immediate",
                    fileResolver: {
                      isFile: async (path: string) => {
                        return Object.keys(files).includes(path);
                      },
                      readFile: async (path: string) => {
                        return typeof files[path] === 'string' ? files[path] : files[path]?.code || '';
                      }
                    }
                  }}
                  customSetup={{
                    entry: activeFile
                  }}
                >
                  <SandpackCodeEditor />
                </SandpackProvider>
              </div>
              
              <div className="w-[60%] h-full">
                <SandpackProvider
                  key={`preview-${activeFile}`}
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
                  <StablePreview 
                    file={activeFile} 
                    hideNavigator={true} 
                  />
                </SandpackProvider>
              </div>
            </div>
          )}
          
          {viewMode === 'design' && (
            <div className="h-full w-full flex items-center justify-center overflow-hidden" data-design-view>
              {figmaUrlState ? renderFigmaIframe() : (
                <div className="w-full h-full">
                  <FigmaUrlForm 
                    prototypeId={prototypeId}
                    onFigmaUrlAdded={handleFigmaUrlAdded}
                  />
                </div>
              )}
            </div>
          )}
          
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
      )}
    </div>
  );
}
