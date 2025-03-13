
import { ElementTarget } from '@/types/feedback';

/**
 * Safely converts arbitrary attributes to a Record<string, string>
 * ensuring all values are strings as required by the ElementTarget type
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
 * Safely converts element metadata object to the expected ElementTarget metadata structure
 * ensuring all properties have the correct types
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

/**
 * Extracts displayed text from an element, handling various element types
 */
export function getElementDisplayText(element: Element): string {
  if (!element) return '';
  
  // For form elements, try to get descriptive attributes
  if (element.tagName === 'INPUT' || element.tagName === 'BUTTON' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') {
    const placeholder = element.getAttribute('placeholder');
    const value = (element as HTMLInputElement).value;
    const ariaLabel = element.getAttribute('aria-label');
    const title = element.getAttribute('title');
    
    return placeholder || value || ariaLabel || title || element.textContent || '';
  }
  
  // For image elements, use alt text
  if (element.tagName === 'IMG') {
    return element.getAttribute('alt') || 'Image';
  }
  
  // For most elements, get text content
  return element.textContent || '';
}

/**
 * Gets a concise description of an element for display
 */
export function getElementDescription(element: Element): string {
  if (!element) return '';
  
  const tagName = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const className = element.className ? `.${element.className.split(' ')[0]}` : '';
  const text = getElementDisplayText(element);
  
  const textPreview = text ? ` "${text.substring(0, 15)}${text.length > 15 ? '...' : ''}"` : '';
  
  return `${tagName}${id}${className}${textPreview}`;
}
