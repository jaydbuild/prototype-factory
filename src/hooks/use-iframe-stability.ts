
import { useState, useEffect, useRef, useCallback } from 'react';

interface UseIframeStabilityOptions {
  containerSelector?: string;
  onReady?: () => void;
  readyCheckInterval?: number;
  maxRetries?: number;
}

export function useIframeStability({
  containerSelector = '.sp-preview',
  onReady,
  readyCheckInterval = 200,
  maxRetries = 30
}: UseIframeStabilityOptions = {}) {
  const [isIframeReady, setIsIframeReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const retryCountRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Get iframe element - memoized to avoid recreating
  const getIframeElement = useCallback(() => {
    if (iframeRef.current) return iframeRef.current;
    
    // Try to find iframe in the specified container first
    if (containerRef.current) {
      const iframe = containerRef.current.querySelector('iframe');
      if (iframe) {
        iframeRef.current = iframe;
        return iframe;
      }
    }
    
    // Fallback to document query if container doesn't have iframe yet
    const container = document.querySelector(containerSelector);
    containerRef.current = container as HTMLElement;
    
    if (container) {
      const iframe = container.querySelector('iframe');
      if (iframe) {
        iframeRef.current = iframe;
        return iframe;
      }
    }
    
    return null;
  }, [containerSelector]);

  // Check if iframe is ready with dimensions
  const checkIframeReady = useCallback(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    if (!isMountedRef.current) return;
    
    try {
      const iframe = getIframeElement();
      
      if (iframe) {
        const rect = iframe.getBoundingClientRect();
        const contentWindow = iframe.contentWindow;
        
        // Check if iframe has dimensions and content
        if (rect.width > 0 && rect.height > 0 && contentWindow && contentWindow.document) {
          setIsIframeReady(true);
          if (onReady) onReady();
          retryCountRef.current = 0;
          return;
        }
      }
      
      // Retry logic with exponential backoff
      retryCountRef.current += 1;
      if (retryCountRef.current < maxRetries) {
        // Use increasing intervals for retries
        const nextInterval = Math.min(readyCheckInterval * Math.pow(1.2, retryCountRef.current), 2000);
        
        timerRef.current = setTimeout(checkIframeReady, nextInterval);
      } else {
        console.warn('Max iframe ready check retries reached');
      }
    } catch (error) {
      console.error('Error checking iframe readiness:', error);
      if (isMountedRef.current && retryCountRef.current < maxRetries) {
        timerRef.current = setTimeout(checkIframeReady, readyCheckInterval * 2);
      }
    }
  }, [getIframeElement, onReady, readyCheckInterval, maxRetries]);

  // Handle manual refresh of the iframe check
  const refreshCheck = useCallback(() => {
    retryCountRef.current = 0;
    setIsIframeReady(false);
    checkIframeReady();
  }, [checkIframeReady]);

  // Initialize iframe monitoring
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial check
    checkIframeReady();
    
    // Setup mutation observer to watch for iframe insertion or changes
    observerRef.current = new MutationObserver((mutations) => {
      // Don't check on every mutation, only when likely to have changed
      let shouldCheck = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList' || 
           (mutation.type === 'attributes' && 
            mutation.target instanceof HTMLIFrameElement)) {
          shouldCheck = true;
          break;
        }
      }
      
      if (shouldCheck) {
        // Reset iframe ref to force re-query
        iframeRef.current = null;
        checkIframeReady();
      }
    });
    
    // Only observe the specific container or parent rather than entire body
    const container = document.querySelector(containerSelector)?.parentElement;
    if (container) {
      observerRef.current.observe(container, { 
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'style', 'class']
      });
    }
    
    // Setup load event handler for the iframe
    const handleIframeLoad = () => {
      if (isMountedRef.current) {
        setIsIframeReady(true);
        if (onReady) onReady();
      }
    };
    
    const iframe = getIframeElement();
    if (iframe) {
      iframe.addEventListener('load', handleIframeLoad);
    }
    
    return () => {
      isMountedRef.current = false;
      
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      
      if (iframe) {
        iframe.removeEventListener('load', handleIframeLoad);
      }
    };
  }, [containerSelector, checkIframeReady, getIframeElement, onReady]);

  return {
    isIframeReady,
    getIframeElement,
    refreshCheck,
    containerRef: containerRef as React.RefObject<HTMLElement>
  };
}
