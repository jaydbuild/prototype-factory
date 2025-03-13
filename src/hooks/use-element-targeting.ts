
import { useCallback, useState, useEffect, useRef } from 'react';
import { ElementTarget } from '@/types/feedback';

interface UseElementTargetingOptions {
  iframeSelector?: string;
  enabled?: boolean;
}

export function useElementTargeting({
  iframeSelector = '.sp-preview iframe',
  enabled = false,
}: UseElementTargetingOptions = {}) {
  const [targetedElement, setTargetedElement] = useState<Element | null>(null);
  const [elementTarget, setElementTarget] = useState<ElementTarget | null>(null);
  const [isSelectingElement, setIsSelectingElement] = useState(false);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  
  // Get the iframe element
  const getIframe = useCallback(() => {
    if (iframeRef.current) return iframeRef.current;
    
    const iframe = document.querySelector(iframeSelector) as HTMLIFrameElement;
    if (iframe) {
      iframeRef.current = iframe;
      return iframe;
    }
    
    return null;
  }, [iframeSelector]);
  
  // Generate a unique CSS selector for an element
  const generateSelector = useCallback((element: Element): string => {
    if (!element || !element.tagName) return '';
    
    // Try using ID first
    if (element.id) {
      return `#${element.id}`;
    }
    
    // Try using unique classes
    if (element.classList && element.classList.length > 0) {
      const classSelector = Array.from(element.classList).map(c => `.${c}`).join('');
      // Check if this class combo is unique
      try {
        const iframe = getIframe();
        if (iframe && iframe.contentDocument) {
          const matches = iframe.contentDocument.querySelectorAll(classSelector);
          if (matches.length === 1) {
            return classSelector;
          }
        }
      } catch (e) {
        console.error('Error checking selector uniqueness:', e);
      }
    }
    
    // Use tag name with parent context
    let currentElem = element;
    let selector = element.tagName.toLowerCase();
    let iterations = 0;
    const maxIterations = 4; // Limit to prevent very long selectors
    
    while (currentElem.parentElement && iterations < maxIterations) {
      const parent = currentElem.parentElement;
      const siblings = Array.from(parent.children).filter(
        child => child.tagName === currentElem.tagName
      );
      
      if (siblings.length > 1) {
        const index = siblings.indexOf(currentElem as Element);
        selector = `${currentElem.tagName.toLowerCase()}:nth-child(${index + 1})`;
      }
      
      // Add parent tag
      if (parent.tagName !== 'BODY' && parent.tagName !== 'HTML') {
        selector = `${parent.tagName.toLowerCase()} > ${selector}`;
        currentElem = parent;
      } else {
        break;
      }
      
      iterations++;
    }
    
    return selector;
  }, [getIframe]);
  
  // Generate an XPath for an element
  const generateXPath = useCallback((element: Element): string => {
    if (!element) return '';
    
    let xpath = '';
    let currentElem: Element | null = element;
    
    while (currentElem && currentElem.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling: Element | null = currentElem.previousElementSibling;
      
      while (sibling) {
        if (sibling.tagName === currentElem.tagName) {
          index++;
        }
        sibling = sibling.previousElementSibling;
      }
      
      const tagName = currentElem.tagName.toLowerCase();
      const indexSuffix = index > 1 ? `[${index}]` : '';
      const idPrefix = currentElem.id ? `[@id='${currentElem.id}']` : '';
      
      const step = `/${tagName}${idPrefix}${indexSuffix}`;
      xpath = step + xpath;
      
      currentElem = currentElem.parentElement;
    }
    
    return xpath || '/';
  }, []);
  
  // Extract metadata from an element
  const extractElementMetadata = useCallback((element: Element) => {
    if (!element) return null;
    
    const metadata: ElementTarget['metadata'] = {
      tagName: element.tagName.toLowerCase(),
      text: element.textContent?.trim().substring(0, 100) || '',
      elementType: element.getAttribute('type') || 'element',
      attributes: {},
    };
    
    // Get important attributes
    const attributesToCapture = ['class', 'href', 'src', 'alt', 'title', 'role', 'aria-label'];
    attributesToCapture.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        metadata.attributes = metadata.attributes || {};
        metadata.attributes[attr] = value;
      }
    });
    
    // Try to generate a display name
    if (element.tagName === 'BUTTON' || element.tagName === 'A' || element.tagName === 'INPUT') {
      const label = element.getAttribute('aria-label') || 
                   element.getAttribute('title') || 
                   element.getAttribute('alt') ||
                   element.textContent?.trim();
      if (label) {
        metadata.displayName = label.substring(0, 30);
      }
    } else if (element.tagName === 'IMG') {
      metadata.displayName = element.getAttribute('alt') || 'Image';
    } else if (metadata.text) {
      metadata.displayName = metadata.text.substring(0, 30);
    }
    
    return metadata;
  }, []);
  
  // Generate complete element target information
  const generateElementTarget = useCallback((element: Element): ElementTarget => {
    return {
      selector: generateSelector(element),
      xpath: generateXPath(element),
      metadata: extractElementMetadata(element)
    };
  }, [generateSelector, generateXPath, extractElementMetadata]);
  
  // Find element position relative to the iframe
  const getElementPosition = useCallback((element: Element) => {
    try {
      const iframe = getIframe();
      if (!iframe || !iframe.contentDocument) return null;
      
      const rect = element.getBoundingClientRect();
      const iframeRect = iframe.getBoundingClientRect();
      
      // Calculate the position as percentage of iframe dimensions
      const x = ((rect.left - iframeRect.left + iframe.contentWindow!.scrollX) / iframeRect.width) * 100;
      const y = ((rect.top - iframeRect.top + iframe.contentWindow!.scrollY) / iframeRect.height) * 100;
      const width = (rect.width / iframeRect.width) * 100;
      const height = (rect.height / iframeRect.height) * 100;
      
      return { x, y, width, height };
    } catch (error) {
      console.error('Error getting element position:', error);
      return null;
    }
  }, [getIframe]);
  
  // Highlight an element in the iframe
  const highlightElement = useCallback((element: Element | null) => {
    try {
      if (!element) {
        if (highlightRef.current) {
          highlightRef.current.style.display = 'none';
        }
        return;
      }
      
      const iframe = getIframe();
      if (!iframe || !iframe.contentDocument) return;
      
      const position = getElementPosition(element);
      if (!position) return;
      
      if (!highlightRef.current) {
        highlightRef.current = document.createElement('div');
        highlightRef.current.className = 'element-highlight';
        highlightRef.current.style.position = 'absolute';
        highlightRef.current.style.pointerEvents = 'none';
        highlightRef.current.style.border = '2px solid #3b82f6';
        highlightRef.current.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
        highlightRef.current.style.zIndex = '9999';
        highlightRef.current.style.transition = 'all 0.2s ease-out';
        iframe.parentElement?.appendChild(highlightRef.current);
      }
      
      const highlight = highlightRef.current;
      highlight.style.display = 'block';
      highlight.style.left = `${position.x}%`;
      highlight.style.top = `${position.y}%`;
      highlight.style.width = `${position.width}%`;
      highlight.style.height = `${position.height}%`;
    } catch (error) {
      console.error('Error highlighting element:', error);
    }
  }, [getIframe, getElementPosition]);
  
  // Start element selection mode
  const startElementSelection = useCallback(() => {
    setIsSelectingElement(true);
    
    const iframe = getIframe();
    if (!iframe || !iframe.contentDocument) return;
    
    // Set cursor to indicate element selection mode
    if (iframe.style) {
      iframe.style.cursor = 'crosshair';
    }
    
    // Add mouseover event to highlight elements
    const handleMouseOver = (event: MouseEvent) => {
      if (!isSelectingElement) return;
      
      event.stopPropagation();
      const target = event.target as Element;
      highlightElement(target);
    };
    
    // Add click event to select an element
    const handleClick = (event: MouseEvent) => {
      if (!isSelectingElement) return;
      
      event.preventDefault();
      event.stopPropagation();
      
      const target = event.target as Element;
      setTargetedElement(target);
      const target_info = generateElementTarget(target);
      setElementTarget(target_info);
      setIsSelectingElement(false);
      
      if (iframe.style) {
        iframe.style.cursor = '';
      }
      
      // Remove event listeners
      iframe.contentDocument?.removeEventListener('mouseover', handleMouseOver);
      iframe.contentDocument?.removeEventListener('click', handleClick);
    };
    
    iframe.contentDocument.addEventListener('mouseover', handleMouseOver);
    iframe.contentDocument.addEventListener('click', handleClick);
    
    return () => {
      if (iframe.contentDocument) {
        iframe.contentDocument.removeEventListener('mouseover', handleMouseOver);
        iframe.contentDocument.removeEventListener('click', handleClick);
      }
      if (iframe.style) {
        iframe.style.cursor = '';
      }
    };
  }, [getIframe, isSelectingElement, highlightElement, generateElementTarget]);
  
  // Cancel element selection mode
  const cancelElementSelection = useCallback(() => {
    const iframe = getIframe();
    if (iframe && iframe.style) {
      iframe.style.cursor = '';
    }
    setIsSelectingElement(false);
    highlightElement(null);
  }, [getIframe, highlightElement]);
  
  // Find an element using stored target information
  const findElementByTarget = useCallback((elementTarget: ElementTarget) => {
    try {
      const iframe = getIframe();
      if (!iframe || !iframe.contentDocument) return null;
      
      let element: Element | null = null;
      
      // Try CSS selector first
      if (elementTarget.selector) {
        element = iframe.contentDocument.querySelector(elementTarget.selector);
        if (element) return element;
      }
      
      // Try XPath as fallback
      if (elementTarget.xpath) {
        try {
          const xpathResult = iframe.contentDocument.evaluate(
            elementTarget.xpath,
            iframe.contentDocument,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          );
          
          element = xpathResult.singleNodeValue as Element;
          if (element) return element;
        } catch (e) {
          console.warn('XPath evaluation failed:', e);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding element by target:', error);
      return null;
    }
  }, [getIframe]);
  
  // Clean up highlight on unmount
  useEffect(() => {
    return () => {
      if (highlightRef.current && highlightRef.current.parentElement) {
        highlightRef.current.parentElement.removeChild(highlightRef.current);
        highlightRef.current = null;
      }
    };
  }, []);
  
  return {
    targetedElement,
    elementTarget,
    isSelectingElement,
    startElementSelection,
    cancelElementSelection,
    generateElementTarget,
    getElementPosition,
    highlightElement,
    findElementByTarget
  };
}
