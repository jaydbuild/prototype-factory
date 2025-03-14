
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
    
    console.log('useIframeStability: searching for iframe in container', containerSelector);
    
    // Try to find iframe in the specified container first
    if (containerRef.current) {
      const iframe = containerRef.current.querySelector('iframe');
      if (iframe) {
        console.log('useIframeStability: found iframe in cached container');
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
        console.log('useIframeStability: found iframe in document query');
        iframeRef.current = iframe;
        return iframe;
      } else {
        console.log('useIframeStability: no iframe found in container');
      }
    } else {
      console.log('useIframeStability: container not found', containerSelector);
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
        
        // Check if iframe has dimensions
        if (rect.width > 0 && rect.height > 0) {
          console.log('useIframeStability: iframe ready with dimensions', rect.width, rect.height);
          
          // Check for contentDocument access
          let contentDocumentAccessible = false;
          try {
            contentDocumentAccessible = !!iframe.contentDocument;
            console.log('useIframeStability: contentDocument accessible', contentDocumentAccessible);
          } catch (e) {
            console.warn('useIframeStability: contentDocument not accessible', e);
          }
          
          setIsIframeReady(true);
          if (onReady) {
            console.log('useIframeStability: calling onReady callback');
            onReady();
          }
          retryCountRef.current = 0;
          return;
        } else {
          console.log('useIframeStability: iframe has no dimensions yet');
        }
      } else {
        console.log('useIframeStability: iframe not found in check');
      }
      
      // Retry logic with exponential backoff
      retryCountRef.current += 1;
      if (retryCountRef.current < maxRetries) {
        // Use increasing intervals for retries
        const nextInterval = Math.min(readyCheckInterval * Math.pow(1.2, retryCountRef.current), 2000);
        
        console.log(`useIframeStability: retry ${retryCountRef.current}/${maxRetries} in ${Math.round(nextInterval)}ms`);
        timerRef.current = setTimeout(checkIframeReady, nextInterval);
      } else {
        console.warn('useIframeStability: Max iframe ready check retries reached');
      }
    } catch (error) {
      console.error('useIframeStability: Error checking iframe readiness:', error);
      if (isMountedRef.current && retryCountRef.current < maxRetries) {
        timerRef.current = setTimeout(checkIframeReady, readyCheckInterval * 2);
      }
    }
  }, [getIframeElement, onReady, readyCheckInterval, maxRetries]);

  // Handle manual refresh of the iframe check
  const refreshCheck = useCallback(() => {
    console.log('useIframeStability: manual refresh triggered');
    retryCountRef.current = 0;
    iframeRef.current = null; // Force re-query of iframe
    setIsIframeReady(false);
    checkIframeReady();
  }, [checkIframeReady]);

  // Initialize iframe monitoring
  useEffect(() => {
    console.log('useIframeStability: initializing with selector', containerSelector);
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
        console.log('useIframeStability: DOM mutation detected, rechecking iframe');
        // Reset iframe ref to force re-query
        iframeRef.current = null;
        checkIframeReady();
      }
    });
    
    // Only observe the specific container or parent rather than entire body
    const container = document.querySelector(containerSelector)?.parentElement;
    if (container) {
      console.log('useIframeStability: setting up mutation observer on container parent');
      observerRef.current.observe(container, { 
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'style', 'class']
      });
    } else {
      console.warn('useIframeStability: could not find container to observe');
      // Fallback to observing body if container not found
      setTimeout(() => {
        if (isMountedRef.current && document.body) {
          console.log('useIframeStability: fallback - observing body');
          observerRef.current?.observe(document.body, {
            childList: true,
            subtree: true
          });
        }
      }, 500);
    }
    
    // Setup load event handler for the iframe
    const handleIframeLoad = () => {
      console.log('useIframeStability: iframe load event fired');
      if (isMountedRef.current) {
        setIsIframeReady(true);
        if (onReady) {
          console.log('useIframeStability: calling onReady from load event');
          onReady();
        }
      }
    };
    
    const iframe = getIframeElement();
    if (iframe) {
      console.log('useIframeStability: adding load event listener to iframe');
      iframe.addEventListener('load', handleIframeLoad);
    }
    
    return () => {
      console.log('useIframeStability: cleaning up');
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
