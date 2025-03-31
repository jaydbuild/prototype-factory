
import React from 'react';
import { Button } from '@/components/ui/button';
import { DeviceInfo, DeviceType } from '@/types/feedback';
import { Smartphone, Tablet, Monitor, Filter, Check, RotateCcw } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface FeedbackDeviceFilterProps {
  selectedDeviceType: DeviceType | 'all';
  onSelectDeviceType: (deviceType: DeviceType | 'all') => void;
  deviceCounts: Record<DeviceType | 'all', number>;
  currentDevice: DeviceInfo;
  // Additional props for device selection functionality
  onDeviceChange?: (device: DeviceType) => void;
  onDeviceSelection?: (deviceId: string) => void;
  deviceType?: DeviceType;
  selectedDevice?: string;
  deviceConfigs?: Record<string, { name: string, width: number, height: number }>;
  onOrientationChange?: () => void;
  orientation?: 'portrait' | 'landscape';
}

export function FeedbackDeviceFilter({
  selectedDeviceType,
  onSelectDeviceType,
  deviceCounts,
  currentDevice,
  // Optional new props with defaults
  onDeviceChange,
  onDeviceSelection,
  deviceType = 'desktop',
  selectedDevice = '',
  deviceConfigs = {},
  onOrientationChange,
  orientation = 'portrait'
}: FeedbackDeviceFilterProps) {
  const totalCount = deviceCounts.all;
  
  // Group devices by category for the dropdown menu (similar to PreviewControls)
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
    if (selectedDeviceType === 'all') return 'All Devices';
    
    if (selectedDevice && deviceConfigs[selectedDevice]) {
      return deviceConfigs[selectedDevice].name;
    }
    
    return selectedDeviceType.charAt(0).toUpperCase() + selectedDeviceType.slice(1);
  };
  
  const getDeviceIcon = (type: DeviceType | 'all') => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="h-4 w-4 mr-2" />;
      case 'tablet':
        return <Tablet className="h-4 w-4 mr-2" />;
      case 'desktop':
        return <Monitor className="h-4 w-4 mr-2" />;
      default:
        return null;
    }
  };

  // Handle both feedback filtering and device selection
  const handleSelectDevice = (deviceType: DeviceType | 'all', deviceId?: string) => {
    // Update feedback filter
    onSelectDeviceType(deviceType);
    
    // Update device selection if applicable
    if (deviceType !== 'all' && onDeviceChange) {
      onDeviceChange(deviceType as DeviceType);
    }
    
    if (deviceId && onDeviceSelection) {
      onDeviceSelection(deviceId);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1 flex-shrink-0 w-auto min-w-24">
          <Filter className="h-3.5 w-3.5" />
          <span className="truncate">
            {getCurrentDeviceName()}
          </span>
          <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-[10px]">
            {selectedDeviceType === 'all' ? totalCount : deviceCounts[selectedDeviceType] || 0}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Filter by Device</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          {/* All Devices option */}
          <DropdownMenuItem onClick={() => handleSelectDevice('all')}>
            <span className="w-4 h-4 mr-2 flex justify-center items-center">
              {selectedDeviceType === 'all' && <Check className="h-4 w-4" />}
            </span>
            All Devices
            <Badge variant="secondary" className="ml-auto h-5 min-w-5 px-1 text-[10px]">
              {totalCount}
            </Badge>
          </DropdownMenuItem>
          
          {/* Desktop option */}
          <DropdownMenuItem onClick={() => handleSelectDevice('desktop')}>
            {getDeviceIcon('desktop')}
            <span className="mr-2">Desktop</span>
            {selectedDeviceType === 'desktop' && !selectedDevice && <Check className="h-4 w-4 mr-2" />}
            <Badge variant="secondary" className="ml-auto h-5 min-w-5 px-1 text-[10px]">
              {deviceCounts.desktop || 0}
            </Badge>
          </DropdownMenuItem>
          
          {/* Desktop presets submenu */}
          {desktopDevices.length > 0 && onDeviceSelection && (
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
                      onClick={() => handleSelectDevice('desktop', id)}
                      className={selectedDevice === id ? 'bg-accent' : ''}
                    >
                      {config.name} ({config.width}×{config.height})
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          )}
          
          {/* Tablet option */}
          <DropdownMenuItem onClick={() => handleSelectDevice('tablet')}>
            {getDeviceIcon('tablet')}
            <span className="mr-2">Tablet</span>
            {selectedDeviceType === 'tablet' && !selectedDevice && <Check className="h-4 w-4 mr-2" />}
            <Badge variant="secondary" className="ml-auto h-5 min-w-5 px-1 text-[10px]">
              {deviceCounts.tablet || 0}
            </Badge>
          </DropdownMenuItem>
          
          {/* Tablet devices submenu */}
          {tabletDevices.length > 0 && onDeviceSelection && (
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
                      onClick={() => handleSelectDevice('tablet', id)}
                      className={selectedDevice === id ? 'bg-accent' : ''}
                    >
                      {config.name} ({config.width}×{config.height})
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          )}
          
          {/* Mobile option */}
          <DropdownMenuItem onClick={() => handleSelectDevice('mobile')}>
            {getDeviceIcon('mobile')}
            <span className="mr-2">Mobile</span>
            {selectedDeviceType === 'mobile' && !selectedDevice && <Check className="h-4 w-4 mr-2" />}
            <Badge variant="secondary" className="ml-auto h-5 min-w-5 px-1 text-[10px]">
              {deviceCounts.mobile || 0}
            </Badge>
          </DropdownMenuItem>
          
          {/* Mobile devices submenu */}
          {mobileDevices.length > 0 && onDeviceSelection && (
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
                      onClick={() => handleSelectDevice('mobile', id)}
                      className={selectedDevice === id ? 'bg-accent' : ''}
                    >
                      {config.name} ({config.width}×{config.height})
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          )}
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        {/* Orientation toggle for tablet and mobile */}
        {(deviceType === 'tablet' || deviceType === 'mobile') && onOrientationChange && (
          <DropdownMenuItem onClick={onOrientationChange}>
            <RotateCcw className="h-3.5 w-3.5 mr-2" />
            <span className="text-xs text-muted-foreground">
              Switch to {orientation === 'portrait' ? 'landscape' : 'portrait'} orientation
            </span>
          </DropdownMenuItem>
        )}
        
        {/* Show for current device option */}
        <DropdownMenuItem onClick={() => handleSelectDevice(currentDevice.type)}>
          <span className="text-xs text-muted-foreground flex items-center">
            <Check className="h-3 w-3 mr-1" />
            Show for current device ({currentDevice.width}×{currentDevice.height})
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
