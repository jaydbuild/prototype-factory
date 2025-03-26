
import { ElementTarget, DeviceInfo } from '@/types/feedback';

// Helper function to safely convert attributes to Record<string, string>
export function safelyConvertAttributes(attributes: any): Record<string, string> | undefined {
  if (!attributes || typeof attributes !== 'object') {
    return undefined;
  }
  
  // If it's an array, we can't convert it to Record<string, string>
  if (Array.isArray(attributes)) {
    return undefined;
  }
  
  // Convert all values to strings
  const result: Record<string, string> = {};
  for (const key in attributes) {
    if (Object.prototype.hasOwnProperty.call(attributes, key)) {
      const value = attributes[key];
      // Skip null or undefined values
      if (value != null) {
        // Convert any value to string
        result[key] = String(value);
      }
    }
  }
  
  return Object.keys(result).length > 0 ? result : undefined;
}

// Helper function to safely convert element metadata
export function safelyConvertElementMetadata(metadata: any): ElementTarget['metadata'] {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  
  return {
    tagName: typeof metadata.tagName === 'string' ? metadata.tagName : undefined,
    text: typeof metadata.text === 'string' ? metadata.text : undefined,
    attributes: safelyConvertAttributes(metadata.attributes),
    elementType: typeof metadata.elementType === 'string' ? metadata.elementType : undefined,
    displayName: typeof metadata.displayName === 'string' ? metadata.displayName : undefined
  };
}

// Helper function to safely convert device info
export function safelyConvertDeviceInfo(deviceInfo: any): DeviceInfo | undefined {
  if (!deviceInfo || typeof deviceInfo !== 'object' || Array.isArray(deviceInfo)) {
    return undefined;
  }
  
  // Ensure we have the required fields with correct types
  if (
    typeof deviceInfo.type !== 'string' || 
    typeof deviceInfo.width !== 'number' || 
    typeof deviceInfo.height !== 'number' || 
    typeof deviceInfo.orientation !== 'string'
  ) {
    return undefined;
  }
  
  // Validate device type
  const validDeviceTypes = ['desktop', 'tablet', 'mobile', 'custom'];
  if (!validDeviceTypes.includes(deviceInfo.type)) {
    return undefined;
  }
  
  // Validate orientation
  const validOrientations = ['portrait', 'landscape'];
  if (!validOrientations.includes(deviceInfo.orientation)) {
    return undefined;
  }
  
  return {
    type: deviceInfo.type,
    width: deviceInfo.width,
    height: deviceInfo.height,
    orientation: deviceInfo.orientation,
    scale: typeof deviceInfo.scale === 'number' ? deviceInfo.scale : undefined
  };
}
