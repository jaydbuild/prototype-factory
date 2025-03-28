
import { DeviceInfo, ElementTarget } from '@/types/feedback';

export function safelyConvertElementMetadata(metadata: any): ElementTarget['metadata'] {
  if (!metadata) return null;
  
  try {
    if (typeof metadata === 'string') {
      return JSON.parse(metadata);
    }
    return metadata;
  } catch (e) {
    console.error('Error parsing element metadata:', e);
    return null;
  }
}

export function safelyConvertDeviceInfo(deviceInfo: any): DeviceInfo | undefined {
  if (!deviceInfo) return undefined;
  
  try {
    // If it's just a string type, create a basic device info object
    if (typeof deviceInfo === 'string') {
      return {
        type: deviceInfo as any,
        width: 1920,
        height: 1080,
        orientation: 'portrait',
        scale: 1
      };
    }
    
    // If it's an object, parse it or use it directly
    let parsedDeviceInfo: any;
    
    if (typeof deviceInfo === 'string') {
      try {
        parsedDeviceInfo = JSON.parse(deviceInfo);
      } catch (e) {
        console.error('Error parsing device info string:', e);
        return undefined;
      }
    } else {
      parsedDeviceInfo = deviceInfo;
    }
    
    return {
      type: parsedDeviceInfo.type || 'desktop',
      width: parsedDeviceInfo.width || 1920,
      height: parsedDeviceInfo.height || 1080,
      orientation: parsedDeviceInfo.orientation || 'portrait',
      scale: parsedDeviceInfo.scale || 1
    };
  } catch (e) {
    console.error('Error handling device info:', e);
    return undefined;
  }
}
