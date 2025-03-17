
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
    const attributesToCapture = ['class', 'href', 'src', 'alt', 'title', 'role', 'aria-label', 'name', 'placeholder'];
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
                   element.getAttribute('placeholder') ||
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
      const x = ((rect.left + (rect.width / 2) - iframeRect.left + iframe.contentWindow!.scrollX) / iframeRect.width) * 100;
      const y = ((rect.top + (rect.height / 2) - iframeRect.top + iframe.contentWindow!.scrollY) / iframeRect.height) * 100;
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
      const iframe = getIframe();
      if (!iframe) {
        console.log("No iframe found for highlighting");
        return;
      }

      // Remove existing highlight
      if (!element) {
        if (highlightRef.current && highlightRef.current.parentElement) {
          highlightRef.current.style.display = 'none';
        }
        return;
      }
      
      console.log("Highlighting element:", element.tagName);
      
      const position = getElementPosition(element);
      if (!position) {
        console.log("Could not get element position");
        return;
      }
      
      // Create highlight element if it doesn't exist
      if (!highlightRef.current) {
        highlightRef.current = document.createElement('div');
        highlightRef.current.className = 'element-highlight';
        highlightRef.current.style.position = 'absolute';
        highlightRef.current.style.pointerEvents = 'none';
        highlightRef.current.style.border = '3px solid #3b82f6';
        highlightRef.current.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
        highlightRef.current.style.zIndex = '99999';
        highlightRef.current.style.transition = 'all 0.15s ease-out';
        highlightRef.current.style.borderRadius = '3px';
        highlightRef.current.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.5)';
        
        // Add to appropriate container (preview container)
        const previewContainer = iframe.closest('.sp-preview');
        if (previewContainer) {
          // Fix: Check if previewContainer is HTMLElement before accessing style
          if (previewContainer instanceof HTMLElement) {
            previewContainer.style.position = 'relative';
          }
          previewContainer.appendChild(highlightRef.current);
        } else {
          iframe.parentElement?.appendChild(highlightRef.current);
        }
      }
      
      const highlight = highlightRef.current;
      highlight.style.display = 'block';
      
      // Position based on the iframe's position
      const iframeRect = iframe.getBoundingClientRect();
      highlight.style.left = `${iframeRect.left + window.scrollX + (position.x - position.width/2) * iframeRect.width / 100}px`;
      highlight.style.top = `${iframeRect.top + window.scrollY + (position.y - position.height/2) * iframeRect.height / 100}px`;
      highlight.style.width = `${position.width * iframeRect.width / 100}px`;
      highlight.style.height = `${position.height * iframeRect.height / 100}px`;
      
      // Add tag indicator as a pseudo-element via a data attribute
      const tagName = element.tagName.toLowerCase();
      highlight.setAttribute('data-element', tagName);
      
      // Add attention-getting animation
      highlight.animate([
        { boxShadow: '0 0 0 2px rgba(255,255,255,0.5), 0 0 0 rgba(59, 130, 246, 0.3)' },
        { boxShadow: '0 0 0 2px rgba(255,255,255,0.5), 0 0 10px rgba(59, 130, 246, 0.6)' },
        { boxShadow: '0 0 0 2px rgba(255,255,255,0.5), 0 0 0 rgba(59, 130, 246, 0.3)' }
      ], {
        duration: 1200,
        iterations: 2
      });
    } catch (error) {
      console.error('Error highlighting element:', error);
    }
  }, [getIframe, getElementPosition]);
  
  // Start element selection mode
  const startElementSelection = useCallback(() => {
    console.log("Starting element selection mode");
    setIsSelectingElement(true);
    
    const iframe = getIframe();
    if (!iframe || !iframe.contentDocument) {
      console.log("No iframe found for element selection");
      return () => {};
    }
    
    // Set cursor to indicate element selection mode
    // Fix: Check if iframe is HTMLIFrameElement before accessing style
    if (iframe instanceof HTMLIFrameElement && iframe.style) {
      iframe.style.cursor = 'crosshair';
    }
    
    // Add mouseover event to highlight elements
    const handleMouseOver = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target || target.nodeType !== Node.ELEMENT_NODE) return;
      
      console.log("Mouse over element:", target.tagName);
      highlightElement(target);
    };
    
    // Add click event to select an element
    const handleClick = (event: MouseEvent) => {
      if (!isSelectingElement) return;
      
      event.preventDefault();
      event.stopPropagation();
      
      const target = event.target as Element;
      if (target && target.nodeType === Node.ELEMENT_NODE) {
        console.log("Selected element:", target.tagName);
        setTargetedElement(target);
        const target_info = generateElementTarget(target);
        setElementTarget(target_info);
        
        // Keep highlighting the selected element
        highlightElement(target);
      }
    };
    
    // Handle mouse movement to track hovered elements
    const handleMouseMove = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target || target.nodeType !== Node.ELEMENT_NODE) return;
      
      // Only update if different from current highlight to avoid flickering
      if (targetedElement !== target) {
        highlightElement(target);
      }
    };
    
    // Setup keyboard navigation for element selection
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isSelectingElement) return;
      
      if (event.key === 'Escape') {
        // Cancel element selection on Escape
        event.preventDefault();
        setIsSelectingElement(false);
        // Fix: Check if iframe is HTMLIFrameElement before accessing style
        if (iframe instanceof HTMLIFrameElement && iframe.style) {
          iframe.style.cursor = '';
        }
        highlightElement(null);
        setTargetedElement(null);
        setElementTarget(null);
      }
    };
    
    // Attach all event listeners
    iframe.contentDocument.addEventListener('mouseover', handleMouseOver);
    iframe.contentDocument.addEventListener('mousemove', handleMouseMove);
    iframe.contentDocument.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      if (iframe.contentDocument) {
        iframe.contentDocument.removeEventListener('mouseover', handleMouseOver);
        iframe.contentDocument.removeEventListener('mousemove', handleMouseMove);
        iframe.contentDocument.removeEventListener('click', handleClick);
      }
      document.removeEventListener('keydown', handleKeyDown);
      // Fix: Check if iframe is HTMLIFrameElement before accessing style
      if (iframe instanceof HTMLIFrameElement && iframe.style) {
        iframe.style.cursor = '';
      }
    };
  }, [isSelectingElement, highlightElement, generateElementTarget, getIframe, targetedElement]);
  
  // Cancel element selection mode
  const cancelElementSelection = useCallback(() => {
    const iframe = getIframe();
    // Fix: Check if iframe is HTMLIFrameElement before accessing style
    if (iframe instanceof HTMLIFrameElement && iframe.style) {
      iframe.style.cursor = '';
    }
    setIsSelectingElement(false);
    highlightElement(null);
    setTargetedElement(null);
    setElementTarget(null);
  }, [getIframe, highlightElement]);
  
  // Find an element using stored target information
  const findElementByTarget = useCallback((elementTarget: ElementTarget) => {
    try {
      const iframe = getIframe();
      if (!iframe || !iframe.contentDocument) return null;
      
      let element: Element | null = null;
      
      // Try CSS selector first
      if (elementTarget.selector) {
        try {
          element = iframe.contentDocument.querySelector(elementTarget.selector);
          if (element) return element;
        } catch (e) {
          console.warn('Selector evaluation failed:', e);
        }
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
      
      // Try metadata as a last resort
      if (elementTarget.metadata) {
        const { tagName, attributes } = elementTarget.metadata;
        
        if (tagName && attributes && attributes.id) {
          element = iframe.contentDocument.getElementById(attributes.id);
          if (element && element.tagName.toLowerCase() === tagName.toLowerCase()) {
            return element;
          }
        }
        
        // Try to find by a combination of tag, class, and text content
        if (tagName && attributes && attributes.class) {
          const potentialElements = Array.from(
            iframe.contentDocument.querySelectorAll(`${tagName}.${attributes.class.split(' ')[0]}`)
          );
          
          if (potentialElements.length === 1) {
            return potentialElements[0];
          }
          
          // Filter by text content if available
          if (elementTarget.metadata.text && potentialElements.length > 0) {
            const element = potentialElements.find(el => 
              el.textContent?.trim().includes(elementTarget.metadata!.text!.trim())
            );
            if (element) return element;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding element by target:', error);
      return null;
    }
  }, [getIframe]);
  
  // Setup event listener for window resize to update highlights
  useEffect(() => {
    if (!enabled) return;
    
    const handleResize = () => {
      if (targetedElement) {
        highlightElement(targetedElement);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [enabled, targetedElement, highlightElement]);
  
  // Add mutation observer to handle DOM changes in the iframe
  useEffect(() => {
    if (!enabled || !targetedElement) return;
    
    const iframe = getIframe();
    if (!iframe || !iframe.contentDocument) return;
    
    const observer = new MutationObserver(() => {
      // Re-highlight the element after DOM changes
      if (targetedElement) {
        highlightElement(targetedElement);
      }
    });
    
    observer.observe(iframe.contentDocument, {
      childList: true,
      subtree: true,
      attributes: true
    });
    
    return () => {
      observer.disconnect();
    };
  }, [enabled, targetedElement, getIframe, highlightElement]);
  
  // Start element selection when enabled
  useEffect(() => {
    if (enabled) {
      console.log("Element targeting enabled, starting selection mode");
      const cleanup = startElementSelection();
      return cleanup;
    } else {
      console.log("Element targeting disabled");
      cancelElementSelection();
    }
  }, [enabled, startElementSelection, cancelElementSelection]);
  
  // Clean up highlight on unmount
  useEffect(() => {
    return () => {
      console.log("Cleaning up element targeting");
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
