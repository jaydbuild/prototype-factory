
import { ElementTarget } from '@/types/feedback';

/**
 * Safely converts attributes from any type to Record<string, string>
 * This ensures the attributes match the ElementTarget interface
 */
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

/**
 * Safely converts element metadata from any type to ElementTarget['metadata']
 * This ensures the metadata matches the ElementTarget interface
 */
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
