
import { useState, useCallback, useEffect, useRef } from 'react';
import { ElementTarget } from '@/types/feedback';
import { safelyConvertAttributes, safelyConvertElementMetadata } from '@/utils/feedback-utils';

type ElementTargetingOptions = {
  enabled?: boolean;
};

type ElementPosition = {
  x: number;
  y: number;
  width?: number;
  height?: number;
};

export const useElementTargeting = (options: ElementTargetingOptions = {}) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);
  const [targetedElement, setTargetedElement] = useState<Element | null>(null);
  const [elementTarget, setElementTarget] = useState<ElementTarget | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  
  // Function to start element selection
  const start = useCallback((iframeElement: HTMLIFrameElement | null) => {
    setIframe(iframeElement);
    setIsSelecting(true);
    
    if (iframeElement) {
      const cleanup = startElementSelection(iframeElement, (element) => {
        setTargetedElement(element);
        
        if (element) {
          const target = generateElementTarget(element);
          setElementTarget(target);
        } else {
          setElementTarget(null);
        }
      });
      
      cleanupRef.current = cleanup;
    }
  }, []);
  
  // Function to cancel element selection
  const cancel = useCallback(() => {
    setIsSelecting(false);
    setIframe(null);
    setTargetedElement(null);
    setElementTarget(null);
    
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  }, []);
  
  // Function to highlight an element
  const highlightElement = useCallback((element: Element | null) => {
    if (!iframe || !iframe.contentDocument) return;
    
    // Remove existing highlights
    const existingHighlights = iframe.contentDocument.querySelectorAll('.element-highlight');
    existingHighlights.forEach(highlight => {
      highlight.remove();
    });
    
    if (!element) return;
    
    try {
      // Get element's position
      const position = getElementPosition(element);
      if (!position) return;
      
      // Create highlight element
      const highlight = iframe.contentDocument.createElement('div');
      highlight.className = 'element-highlight';
      highlight.style.position = 'absolute';
      highlight.style.left = `${position.x}%`;
      highlight.style.top = `${position.y}%`;
      highlight.style.width = position.width ? `${position.width}%` : '10px';
      highlight.style.height = position.height ? `${position.height}%` : '10px';
      highlight.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
      highlight.style.border = '2px solid rgb(59, 130, 246)';
      highlight.style.borderRadius = '4px';
      highlight.style.pointerEvents = 'none';
      highlight.style.zIndex = '9999';
      highlight.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
      
      // Add to the document
      iframe.contentDocument.body.appendChild(highlight);
    } catch (error) {
      console.error('Error highlighting element:', error);
    }
  }, [iframe]);
  
  // Function to calculate element position relative to iframe
  const getElementPosition = useCallback((element: Element): ElementPosition | null => {
    if (!iframe || !iframe.contentDocument || !element) return null;
    
    try {
      const rect = (element as HTMLElement).getBoundingClientRect();
      const iframeRect = iframe.getBoundingClientRect();
      
      // Calculate element position as percentage of iframe dimensions
      const x = (rect.left / iframeRect.width) * 100;
      const y = (rect.top / iframeRect.height) * 100;
      const width = (rect.width / iframeRect.width) * 100;
      const height = (rect.height / iframeRect.height) * 100;
      
      return { x, y, width, height };
    } catch (error) {
      console.error('Error getting element position:', error);
      return null;
    }
  }, [iframe]);
  
  // Function to find an element by target data
  const findElementByTarget = useCallback((target: ElementTarget): Element | null => {
    if (!iframe || !iframe.contentDocument) return null;
    
    try {
      // Try to find by selector first
      if (target.selector) {
        const element = iframe.contentDocument.querySelector(target.selector);
        if (element) return element;
      }
      
      // Try to find by XPath
      if (target.xpath) {
        const result = iframe.contentDocument.evaluate(
          target.xpath,
          iframe.contentDocument,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        if (result.singleNodeValue) return result.singleNodeValue as Element;
      }
      
      // Fallback to more complex search by metadata if available
      if (target.metadata) {
        // Implementation for finding by metadata would go here
        // This is a simplified version
        const elements = iframe.contentDocument.querySelectorAll(target.metadata.tagName || '*');
        for (const element of elements) {
          // Check for matching text content
          if (target.metadata.text && element.textContent?.includes(target.metadata.text)) {
            return element;
          }
          
          // Check for matching attributes
          if (target.metadata.attributes) {
            let match = true;
            for (const [key, value] of Object.entries(target.metadata.attributes)) {
              if (element.getAttribute(key) !== value) {
                match = false;
                break;
              }
            }
            if (match) return element;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding element by target:', error);
      return null;
    }
  }, [iframe]);
  
  // Function to generate element target data
  const generateElementTarget = useCallback((element: Element): ElementTarget => {
    let selector = '';
    let xpath = '';
    
    try {
      // Generate CSS selector
      selector = generateSelector(element);
      
      // Generate XPath
      xpath = generateXPath(element);
    } catch (error) {
      console.error('Error generating element target:', error);
    }
    
    // Extract element metadata
    const metadata = {
      tagName: element.tagName,
      text: element.textContent?.trim().substring(0, 100) || '',
      attributes: getElementAttributes(element),
      elementType: getElementType(element)
    };
    
    return {
      selector,
      xpath,
      metadata: safelyConvertElementMetadata(metadata)
    };
  }, []);
  
  // Effect to auto-start if enabled
  useEffect(() => {
    if (options.enabled && iframe) {
      start(iframe);
    }
    
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [options.enabled, iframe, start]);
  
  return {
    isSelecting,
    start,
    cancel,
    iframe,
    targetedElement,
    elementTarget,
    isSelectingElement: isSelecting,
    cancelElementSelection: cancel,
    getElementPosition,
    highlightElement,
    findElementByTarget,
    generateElementTarget
  };
};

// Helper function to generate a CSS selector for an element
function generateSelector(element: Element): string {
  try {
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.classList && element.classList.length) {
      return `.${Array.from(element.classList).join('.')}`;
    }
    
    // Fallback to tag name with nth-child
    let path = element.tagName.toLowerCase();
    let parent = element.parentElement;
    let nthChild = 1;
    
    if (parent) {
      const siblings = Array.from(parent.children);
      const sameTagSiblings = siblings.filter(el => el.tagName === element.tagName);
      
      if (sameTagSiblings.length > 1) {
        nthChild = siblings.indexOf(element) + 1;
        path += `:nth-child(${nthChild})`;
      }
    }
    
    return path;
  } catch (error) {
    console.error('Error generating selector:', error);
    return '';
  }
}

// Helper function to generate an XPath for an element
function generateXPath(element: Element): string {
  try {
    let path = '';
    let current = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousElementSibling;
      
      while (sibling) {
        if (sibling.tagName === current.tagName) {
          index++;
        }
        sibling = sibling.previousElementSibling;
      }
      
      const tagName = current.tagName.toLowerCase();
      const pathSegment = index > 1 ? `${tagName}[${index}]` : tagName;
      
      path = path.length > 0 ? `/${pathSegment}${path}` : pathSegment;
      current = current.parentElement as Element;
    }
    
    return `//${path}`;
  } catch (error) {
    console.error('Error generating XPath:', error);
    return '';
  }
}

// Helper function to get element attributes
function getElementAttributes(element: Element): Record<string, string> {
  const attributes: Record<string, string> = {};
  
  try {
    Array.from(element.attributes).forEach(attr => {
      attributes[attr.name] = attr.value;
    });
  } catch (error) {
    console.error('Error getting element attributes:', error);
  }
  
  return attributes;
}

// Helper function to determine element type
function getElementType(element: Element): string {
  const tagName = element.tagName.toLowerCase();
  
  // Common element types
  switch (tagName) {
    case 'a': return 'link';
    case 'button': return 'button';
    case 'input': {
      const type = element.getAttribute('type');
      if (type) return `input-${type}`;
      return 'input';
    }
    case 'select': return 'select';
    case 'textarea': return 'textarea';
    case 'img': return 'image';
    case 'video': return 'video';
    case 'audio': return 'audio';
    case 'form': return 'form';
    case 'table': return 'table';
    case 'div': {
      // Try to infer semantic meaning from class or role
      const role = element.getAttribute('role');
      if (role) return role;
      
      // Check for common UI component patterns
      const className = element.className;
      if (typeof className === 'string') {
        if (className.includes('card')) return 'card';
        if (className.includes('button')) return 'button';
        if (className.includes('container')) return 'container';
      }
      
      return 'div';
    }
    default: return tagName;
  }
}

// Element selection functionality
export const startElementSelection = (iframe: HTMLIFrameElement | null, callback: (element: Element | null) => void) => {
  if (!iframe) {
    console.warn('No iframe provided for element selection');
    return () => {};
  }

  const document = iframe.contentDocument;

  if (!document) {
    console.warn('Iframe content document is not available');
    return () => {};
  }

  // Change the iframe pointer events to allow selection inside it
  if (iframe && iframe instanceof HTMLElement) {
    iframe.style.pointerEvents = 'none';
  }

  // Add a style for highlighting elements on hover
  const styleElement = document.createElement('style');
  styleElement.innerHTML = `
    .element-hover-highlight {
      outline: 2px dashed rgba(59, 130, 246, 0.5) !important;
      outline-offset: 2px !important;
      background-color: rgba(59, 130, 246, 0.1) !important;
    }
  `;
  document.head.appendChild(styleElement);

  let currentHighlighted: Element | null = null;

  const handleMouseOver = (e: Event) => {
    if (currentHighlighted) {
      currentHighlighted.classList.remove('element-hover-highlight');
    }
    const target = e.target as Element;
    currentHighlighted = target;
    target.classList.add('element-hover-highlight');
    callback(target);
  };

  const handleMouseOut = (e: Event) => {
    const target = e.target as Element;
    target.classList.remove('element-hover-highlight');
  };

  const handleClick = (e: Event) => {
    e.preventDefault();
    e.stopImmediatePropagation();

    const target = e.target as Element;
    callback(target);
  };

  document.addEventListener('mouseover', handleMouseOver, { capture: true });
  document.addEventListener('mouseout', handleMouseOut, { capture: true });
  document.addEventListener('click', handleClick, { capture: true });

  return () => {
    document.removeEventListener('mouseover', handleMouseOver, { capture: true });
    document.removeEventListener('mouseout', handleMouseOut, { capture: true });
    document.removeEventListener('click', handleClick, { capture: true });
    document.head.removeChild(styleElement);
    if (iframe && iframe instanceof HTMLElement) {
      iframe.style.pointerEvents = 'auto';
    }
  };
};

export const cancelElementSelection = (iframe: HTMLIFrameElement | null) => {
  // Reset the iframe pointer events
  if (iframe && iframe instanceof HTMLElement) {
    iframe.style.pointerEvents = 'auto';
  }
};
