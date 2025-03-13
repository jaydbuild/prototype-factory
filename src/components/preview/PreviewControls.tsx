import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Eye, 
  Code, 
  MessageSquare, 
  RefreshCw, 
  Smartphone, 
  Tablet, 
  Monitor, 
  RotateCcw,
  Share2,
  Figma,
  ThumbsUp,
  ArrowLeft,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Settings,
  Download
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Device preview types
type DeviceType = 'desktop' | 'tablet' | 'mobile' | 'custom';
type Orientation = 'portrait' | 'landscape';

// Device configuration interface
interface DeviceConfig {
  name: string;
  width: number;
  height: number;
  devicePixelRatio?: number;
}

interface PreviewControlsProps {
  onViewModeChange: (mode: 'preview' | 'code' | 'split' | 'design') => void;
  viewMode: 'preview' | 'code' | 'split' | 'design';
  isFeedbackMode: boolean;
  onToggleFeedbackMode: () => void;
  showUI?: boolean;
  onToggleUI?: () => void;
  // Enhanced device preview props
  deviceType?: DeviceType;
  orientation?: Orientation;
  onDeviceChange?: (device: DeviceType) => void;
  onOrientationChange?: () => void;
  // New props for enhanced functionality
  scale?: number;
  onScaleChange?: (scale: number) => void;
  selectedDevice?: string;
  onDeviceSelection?: (deviceId: string) => void;
  deviceConfigs?: Record<string, DeviceConfig>;
  // Refresh and share buttons
  onRefresh?: () => void;
  onShare?: () => void;
  // Figma design availability
  hasFigmaDesign?: boolean;
  // New props for download and share
  filesUrl?: string;
  onDownload?: () => void;
}

export function PreviewControls({
  onViewModeChange,
  viewMode,
  isFeedbackMode,
  onToggleFeedbackMode,
  showUI = true,
  onToggleUI,
  // Device preview props with defaults
  deviceType = 'desktop',
  orientation = 'portrait',
  onDeviceChange,
  onOrientationChange,
  // New props with defaults
  scale = 1,
  onScaleChange,
  selectedDevice = '',
  onDeviceSelection,
  deviceConfigs = {},
  // Refresh and share buttons
  onRefresh,
  onShare,
  // Figma design availability
  hasFigmaDesign = false,
  filesUrl,
  onDownload
}: PreviewControlsProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showScaleControls, setShowScaleControls] = useState(false);

  // Group devices by category for the dropdown menu
  const mobileDevices = Object.entries(deviceConfigs).filter(([id]) => 
    id.includes('iphone') || id.includes('pixel') || id.includes('galaxy-s')
  );
  
  const tabletDevices = Object.entries(deviceConfigs).filter(([id]) => 
    id.includes('ipad') || id.includes('galaxy-tab')
  );
  
  const desktopDevices = Object.entries(deviceConfigs).filter(([id]) => 
    id === 'laptop' || id === 'desktop'
  );

  // Get the current device name
  const getCurrentDeviceName = () => {
    if (deviceType === 'desktop' && !selectedDevice) {
      return 'Responsive';
    }
    
    if (selectedDevice && deviceConfigs[selectedDevice]) {
      return deviceConfigs[selectedDevice].name;
    }
    
    return deviceType.charAt(0).toUpperCase() + deviceType.slice(1);
  };

  return (
    <div className="flex items-center gap-2 p-1 rounded-lg backdrop-blur-sm bg-background/80 shadow-md">
      {/* Back button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => navigate(-1)}
        title="Back to dashboard"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
      </Button>
      
      {/* View mode toggle */}
      <Tabs 
        value={viewMode} 
        onValueChange={(value) => onViewModeChange(value as 'preview' | 'code' | 'split' | 'design')}
        className="w-auto"
      >
        <TabsList className="h-8">
          <TabsTrigger value="preview" className="flex items-center gap-1 px-2 h-7">
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </TabsTrigger>
          <TabsTrigger value="code" className="flex items-center gap-1 px-2 h-7">
            <Code className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Code</span>
          </TabsTrigger>
          {hasFigmaDesign && (
            <TabsTrigger value="design" className="flex items-center gap-1 px-2 h-7">
              <Figma className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Design</span>
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      {/* Device type and selection dropdown - only show in preview mode */}
      {viewMode === 'preview' && onDeviceChange && onDeviceSelection && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 flex items-center gap-1 px-2"
              title="Change device type"
            >
              {deviceType === 'desktop' && <Monitor className="h-3.5 w-3.5" />}
              {deviceType === 'tablet' && <Tablet className="h-3.5 w-3.5" />}
              {deviceType === 'mobile' && <Smartphone className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline text-xs">{getCurrentDeviceName()}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Device Type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Desktop option */}
            <DropdownMenuItem 
              onClick={() => onDeviceChange('desktop')}
              className={deviceType === 'desktop' && !selectedDevice ? 'bg-accent' : ''}
            >
              <Monitor className="h-4 w-4 mr-2" />
              Responsive
            </DropdownMenuItem>
            
            {/* Desktop presets submenu */}
            {desktopDevices.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Monitor className="h-4 w-4 mr-2" />
                  Desktop Presets
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {desktopDevices.map(([id, config]) => (
                      <DropdownMenuItem 
                        key={id}
                        onClick={() => onDeviceSelection(id)}
                        className={selectedDevice === id ? 'bg-accent' : ''}
                      >
                        {config.name} ({config.width}×{config.height})
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            )}
            
            <DropdownMenuSeparator />
            
            {/* Tablet option */}
            <DropdownMenuItem 
              onClick={() => onDeviceChange('tablet')}
              className={deviceType === 'tablet' && !selectedDevice ? 'bg-accent' : ''}
            >
              <Tablet className="h-4 w-4 mr-2" />
              Generic Tablet
            </DropdownMenuItem>
            
            {/* Tablet devices submenu */}
            {tabletDevices.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Tablet className="h-4 w-4 mr-2" />
                  Tablet Devices
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {tabletDevices.map(([id, config]) => (
                      <DropdownMenuItem 
                        key={id}
                        onClick={() => onDeviceSelection(id)}
                        className={selectedDevice === id ? 'bg-accent' : ''}
                      >
                        {config.name} ({config.width}×{config.height})
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            )}
            
            <DropdownMenuSeparator />
            
            {/* Mobile option */}
            <DropdownMenuItem 
              onClick={() => onDeviceChange('mobile')}
              className={deviceType === 'mobile' && !selectedDevice ? 'bg-accent' : ''}
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Generic Mobile
            </DropdownMenuItem>
            
            {/* Mobile devices submenu */}
            {mobileDevices.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Mobile Devices
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {mobileDevices.map(([id, config]) => (
                      <DropdownMenuItem 
                        key={id}
                        onClick={() => onDeviceSelection(id)}
                        className={selectedDevice === id ? 'bg-accent' : ''}
                      >
                        {config.name} ({config.width}×{config.height})
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            )}
            
            <DropdownMenuSeparator />
            
            {/* Custom device option */}
            <DropdownMenuItem onClick={() => onDeviceChange('custom')}>
              <Settings className="h-4 w-4 mr-2" />
              Custom Dimensions...
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Orientation toggle - only show for tablet and mobile in preview mode */}
      {viewMode === 'preview' && onOrientationChange && deviceType !== 'desktop' && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onOrientationChange}
          title={`Switch to ${orientation === 'portrait' ? 'landscape' : 'portrait'} orientation`}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      )}
      
      {/* Scale controls - only show in preview mode for non-desktop devices */}
      {viewMode === 'preview' && onScaleChange && deviceType !== 'desktop' && (
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowScaleControls(!showScaleControls)}
            title="Adjust scale"
          >
            {scale >= 1 ? (
              <ZoomIn className="h-3.5 w-3.5" />
            ) : (
              <ZoomOut className="h-3.5 w-3.5" />
            )}
          </Button>
          
          {showScaleControls && (
            <div className="absolute top-full mt-2 right-0 bg-background border rounded-md shadow-md p-3 z-50 w-48">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs">Scale: {Math.round(scale * 100)}%</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => onScaleChange(1)}
                >
                  Reset
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onScaleChange(Math.max(0.25, scale - 0.1))}
                >
                  <ZoomOut className="h-3 w-3" />
                </Button>
                <Slider
                  value={[scale]}
                  min={0.25}
                  max={2}
                  step={0.05}
                  onValueChange={(value) => onScaleChange(value[0])}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onScaleChange(Math.min(2, scale + 0.1))}
                >
                  <ZoomIn className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feedback mode toggle */}
      <div className="flex items-center space-x-2">
        <Switch
          id="feedback-mode"
          checked={isFeedbackMode}
          onCheckedChange={onToggleFeedbackMode}
        />
        <Label htmlFor="feedback-mode" className="text-xs cursor-pointer">
          Feedback Mode
        </Label>
      </div>

      {/* Refresh button */}
      {onRefresh && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onRefresh}
          title="Refresh preview"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      )}

      <div className="flex-1" /> {/* Spacer */}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {/* Download button */}
        {filesUrl && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onDownload}
            title="Download Files"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Share button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onShare}
          title="Share Prototype"
        >
          <Share2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Hide/Unhide UI button */}
      {onToggleUI && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onToggleUI}
          title={showUI ? "Hide UI" : "Show UI"}
        >
          {showUI ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
      )}
    </div>
  );
}
