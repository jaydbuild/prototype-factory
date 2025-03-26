
import React from 'react';
import { Button } from '@/components/ui/button';
import { DeviceInfo, DeviceType } from '@/types/feedback';
import { Smartphone, Tablet, Monitor, Filter, Check } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface FeedbackDeviceFilterProps {
  selectedDeviceType: DeviceType | 'all';
  onSelectDeviceType: (deviceType: DeviceType | 'all') => void;
  deviceCounts: Record<DeviceType | 'all', number>;
  currentDevice: DeviceInfo;
}

export function FeedbackDeviceFilter({
  selectedDeviceType,
  onSelectDeviceType,
  deviceCounts,
  currentDevice
}: FeedbackDeviceFilterProps) {
  const totalCount = deviceCounts.all;
  
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1 max-w-[180px]">
          <Filter className="h-3.5 w-3.5" />
          <span className="truncate">
            {selectedDeviceType === 'all' ? 'All Devices' : (
              selectedDeviceType.charAt(0).toUpperCase() + selectedDeviceType.slice(1)
            )}
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
          <DropdownMenuItem onClick={() => onSelectDeviceType('all')}>
            <span className="w-4 h-4 mr-2 flex justify-center items-center">
              {selectedDeviceType === 'all' && <Check className="h-4 w-4" />}
            </span>
            All Devices
            <Badge variant="secondary" className="ml-auto h-5 min-w-5 px-1 text-[10px]">
              {totalCount}
            </Badge>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => onSelectDeviceType('desktop')}>
            {getDeviceIcon('desktop')}
            {selectedDeviceType === 'desktop' && <Check className="h-4 w-4 mr-2" />}
            Desktop
            <Badge variant="secondary" className="ml-auto h-5 min-w-5 px-1 text-[10px]">
              {deviceCounts.desktop || 0}
            </Badge>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => onSelectDeviceType('tablet')}>
            {getDeviceIcon('tablet')}
            {selectedDeviceType === 'tablet' && <Check className="h-4 w-4 mr-2" />}
            Tablet
            <Badge variant="secondary" className="ml-auto h-5 min-w-5 px-1 text-[10px]">
              {deviceCounts.tablet || 0}
            </Badge>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => onSelectDeviceType('mobile')}>
            {getDeviceIcon('mobile')}
            {selectedDeviceType === 'mobile' && <Check className="h-4 w-4 mr-2" />}
            Mobile
            <Badge variant="secondary" className="ml-auto h-5 min-w-5 px-1 text-[10px]">
              {deviceCounts.mobile || 0}
            </Badge>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onSelectDeviceType(currentDevice.type)}>
          <span className="text-xs text-muted-foreground flex items-center">
            <Check className="h-3 w-3 mr-1" />
            Show for current device ({currentDevice.width}×{currentDevice.height})
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
