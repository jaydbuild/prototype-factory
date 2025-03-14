
import { useCallback, useState, useEffect, useRef } from 'react';
import { ElementTarget } from '@/types/feedback';
import { useIframeStability } from './use-iframe-stability';

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
  const eventAttachedRef = useRef(false);
  const iframeContentRef = useRef<Document | null>(null);
  
  const { 
    isIframeReady, 
    getIframeElement, 
    refreshCheck 
  } = useIframeStability({
    containerSelector: iframeSelector.split(' ')[0],
    readyCheckInterval: 300,
    maxRetries: 40,
    onReady: () => {
      console.log('useElementTargeting: iframe is ready via stability hook');
      setupEventListeners();
    }
  });
  
  const generateSelector = useCallback((element: Element): string => {
    if (!element || !element.tagName) return '';
    
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.classList && element.classList.length > 0) {
      const classSelector = Array.from(element.classList).map(c => `.${c}`).join('');
      try {
        const iframe = getIframeElement();
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
    
    let currentElem = element;
    let selector = element.tagName.toLowerCase();
    let iterations = 0;
    const maxIterations = 4;
    
    while (currentElem.parentElement && iterations < maxIterations) {
      const parent = currentElem.parentElement;
      const siblings = Array.from(parent.children).filter(
        child => child.tagName === currentElem.tagName
      );
      
      if (siblings.length > 1) {
        const index = siblings.indexOf(currentElem as Element);
        selector = `${currentElem.tagName.toLowerCase()}:nth-child(${index + 1})`;
      }
      
      if (parent.tagName !== 'BODY' && parent.tagName !== 'HTML') {
        selector = `${parent.tagName.toLowerCase()} > ${selector}`;
        currentElem = parent;
      } else {
        break;
      }
      
      iterations++;
    }
    
    return selector;
  }, [getIframeElement]);
  
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
  
  const extractElementMetadata = useCallback((element: Element) => {
    if (!element) return null;
    
    const metadata: ElementTarget['metadata'] = {
      tagName: element.tagName.toLowerCase(),
      text: element.textContent?.trim().substring(0, 100) || '',
      elementType: element.getAttribute('type') || 'element',
      attributes: {},
    };
    
    const attributesToCapture = ['class', 'href', 'src', 'alt', 'title', 'role', 'aria-label', 'name', 'placeholder'];
    attributesToCapture.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        metadata.attributes = metadata.attributes || {};
        metadata.attributes[attr] = value;
      }
    });
    
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
  
  const generateElementTarget = useCallback((element: Element): ElementTarget => {
    return {
      selector: generateSelector(element),
      xpath: generateXPath(element),
      metadata: extractElementMetadata(element)
    };
  }, [generateSelector, generateXPath, extractElementMetadata]);
  
  const getElementPosition = useCallback((element: Element) => {
    try {
      const iframe = getIframeElement();
      if (!iframe || !iframe.contentDocument) return null;
      
      const rect = element.getBoundingClientRect();
      const iframeRect = iframe.getBoundingClientRect();
      
      const x = ((rect.left + (rect.width / 2) - iframeRect.left + iframe.contentWindow!.scrollX) / iframeRect.width) * 100;
      const y = ((rect.top + (rect.height / 2) - iframeRect.top + iframe.contentWindow!.scrollY) / iframeRect.height) * 100;
      const width = (rect.width / iframeRect.width) * 100;
      const height = (rect.height / iframeRect.height) * 100;
      
      return { x, y, width, height };
    } catch (error) {
      console.error('Error getting element position:', error);
      return null;
    }
  }, [getIframeElement]);
  
  const highlightElement = useCallback((element: Element | null) => {
    try {
      const iframe = getIframeElement();
      if (!iframe) {
        console.log("No iframe found for highlighting");
        return;
      }

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
        
        const previewContainer = iframe.closest('.sp-preview');
        if (previewContainer) {
          console.log("Adding highlight element to preview container");
          previewContainer.style.position = 'relative';
          previewContainer.appendChild(highlightRef.current);
        } else {
          console.log("No preview container found, adding to iframe parent");
          const parent = iframe.parentElement;
          if (parent) {
            parent.style.position = 'relative';
            parent.appendChild(highlightRef.current);
          }
        }
      }
      
      const highlight = highlightRef.current;
      highlight.style.display = 'block';
      
      const iframeRect = iframe.getBoundingClientRect();
      highlight.style.left = `${iframeRect.left + window.scrollX + (position.x - position.width/2) * iframeRect.width / 100}px`;
      highlight.style.top = `${iframeRect.top + window.scrollY + (position.y - position.height/2) * iframeRect.height / 100}px`;
      highlight.style.width = `${position.width * iframeRect.width / 100}px`;
      highlight.style.height = `${position.height * iframeRect.height / 100}px`;
      
      const tagName = element.tagName.toLowerCase();
      highlight.setAttribute('data-element', tagName);
      
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
  }, [getIframeElement, getElementPosition]);
  
  const setupEventListeners = useCallback(() => {
    if (eventAttachedRef.current) {
      console.log("Event listeners already attached");
      return;
    }
    
    try {
      const iframe = getIframeElement();
      if (!iframe) {
        console.log("No iframe found for element targeting");
        return;
      }
      
      let contentDocument: Document | null = null;
      
      try {
        contentDocument = iframe.contentDocument;
        if (!contentDocument) {
          console.log("No contentDocument in iframe");
          return;
        }
      } catch (e) {
        console.error("Error accessing iframe contentDocument", e);
        return;
      }
      
      iframeContentRef.current = contentDocument;
      console.log("Successfully accessed iframe contentDocument", !!contentDocument);
      
      eventAttachedRef.current = true;
      
      console.log("Setting up element targeting event listeners");
    } catch (error) {
      console.error("Error in setupEventListeners:", error);
    }
  }, [getIframeElement]);
  
  const startElementSelection = useCallback(() => {
    console.log("Starting element selection mode");
    setIsSelectingElement(true);
    
    const iframe = getIframeElement();
    if (!iframe) {
      console.log("No iframe found for element selection");
      refreshCheck();
      return () => {};
    }
    
    let contentDocument: Document | null = null;
    
    try {
      contentDocument = iframe.contentDocument;
      if (!contentDocument) {
        console.log("No contentDocument in iframe for element selection");
        refreshCheck();
        return () => {};
      }
    } catch (e) {
      console.error("Error accessing iframe contentDocument for element selection", e);
      return () => {};
    }
    
    iframeContentRef.current = contentDocument;
    
    // Fix TypeScript error by checking if iframe is an HTMLIFrameElement before accessing style
    if (iframe instanceof HTMLIFrameElement) {
      console.log("Setting cursor to crosshair");
      iframe.style.cursor = 'crosshair';
    }
    
    const handleMouseOver = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target || target.nodeType !== Node.ELEMENT_NODE) return;
      
      console.log("Mouse over element:", target.tagName);
      highlightElement(target);
    };
    
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
        
        highlightElement(target);
      }
    };
    
    const handleMouseMove = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target || target.nodeType !== Node.ELEMENT_NODE) return;
      
      if (targetedElement !== target) {
        highlightElement(target);
      }
    };
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isSelectingElement) return;
      
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsSelectingElement(false);
        if (iframe instanceof HTMLIFrameElement) {
          iframe.style.cursor = '';
        }
        highlightElement(null);
        setTargetedElement(null);
        setElementTarget(null);
      }
    };
    
    console.log("Attaching element selection event listeners to contentDocument");
    
    contentDocument.addEventListener('mouseover', handleMouseOver);
    contentDocument.addEventListener('mousemove', handleMouseMove);
    contentDocument.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      console.log("Cleaning up element selection event listeners");
      if (contentDocument) {
        contentDocument.removeEventListener('mouseover', handleMouseOver);
        contentDocument.removeEventListener('mousemove', handleMouseMove);
        contentDocument.removeEventListener('click', handleClick);
      }
      document.removeEventListener('keydown', handleKeyDown);
      if (iframe instanceof HTMLIFrameElement) {
        iframe.style.cursor = '';
      }
    };
  }, [isSelectingElement, highlightElement, generateElementTarget, getIframeElement, targetedElement, refreshCheck]);
  
  const cancelElementSelection = useCallback(() => {
    console.log("Canceling element selection mode");
    const iframe = getIframeElement();
    if (iframe instanceof HTMLIFrameElement) {
      iframe.style.cursor = '';
    }
    setIsSelectingElement(false);
    highlightElement(null);
    setTargetedElement(null);
    setElementTarget(null);
  }, [getIframeElement, highlightElement]);
  
  const findElementByTarget = useCallback((elementTarget: ElementTarget) => {
    try {
      const iframe = getIframeElement();
      if (!iframe || !iframe.contentDocument) return null;
      
      let element: Element | null = null;
      
      if (elementTarget.selector) {
        try {
          element = iframe.contentDocument.querySelector(elementTarget.selector);
          if (element) return element;
        } catch (e) {
          console.warn('Selector evaluation failed:', e);
        }
      }
      
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
      
      if (elementTarget.metadata) {
        const { tagName, attributes } = elementTarget.metadata;
        
        if (tagName && attributes && attributes.id) {
          element = iframe.contentDocument.getElementById(attributes.id);
          if (element && element.tagName.toLowerCase() === tagName.toLowerCase()) {
            return element;
          }
        }
        
        if (tagName && attributes && attributes.class) {
          const potentialElements = Array.from(
            iframe.contentDocument.querySelectorAll(`${tagName}.${attributes.class.split(' ')[0]}`)
          );
          
          if (potentialElements.length === 1) {
            return potentialElements[0];
          }
          
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
  }, [getIframeElement]);
  
  useEffect(() => {
    if (!enabled) return;
    
    console.log("useElementTargeting: Setting up resize listener");
    
    const handleResize = () => {
      if (targetedElement) {
        console.log("Window resized, updating highlight");
        highlightElement(targetedElement);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      console.log("useElementTargeting: Removing resize listener");
      window.removeEventListener('resize', handleResize);
    };
  }, [enabled, targetedElement, highlightElement]);
  
  useEffect(() => {
    if (!enabled || !targetedElement) return;
    
    console.log("useElementTargeting: Setting up mutation observer");
    
    const iframe = getIframeElement();
    if (!iframe || !iframe.contentDocument) return;
    
    const observer = new MutationObserver(() => {
      if (targetedElement) {
        console.log("DOM mutation detected, updating highlight");
        highlightElement(targetedElement);
      }
    });
    
    try {
      observer.observe(iframe.contentDocument, {
        childList: true,
        subtree: true,
        attributes: true
      });
      console.log("Mutation observer attached successfully");
    } catch (e) {
      console.error("Error attaching mutation observer:", e);
    }
    
    return () => {
      console.log("useElementTargeting: Disconnecting mutation observer");
      observer.disconnect();
    };
  }, [enabled, targetedElement, getIframeElement, highlightElement]);
  
  useEffect(() => {
    console.log("useElementTargeting: enabled changed to", enabled);
    
    if (enabled) {
      if (isIframeReady) {
        console.log("Iframe is already ready, setting up event listeners");
        setupEventListeners();
      } else {
        console.log("Iframe not ready yet, will set up listeners when ready");
        refreshCheck();
      }
      
      const cleanup = startElementSelection();
      return cleanup;
    } else {
      console.log("Element targeting disabled, canceling selection");
      cancelElementSelection();
      
      eventAttachedRef.current = false;
    }
  }, [enabled, isIframeReady, setupEventListeners, startElementSelection, cancelElementSelection, refreshCheck]);
  
  useEffect(() => {
    return () => {
      console.log("useElementTargeting: Cleaning up on unmount");
      if (highlightRef.current && highlightRef.current.parentElement) {
        highlightRef.current.parentElement.removeChild(highlightRef.current);
        highlightRef.current = null;
      }
      
      eventAttachedRef.current = false;
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
    findElementByTarget,
    isIframeReady
  };
}
