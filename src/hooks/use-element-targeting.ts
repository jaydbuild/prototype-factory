import { useState, useCallback, useEffect } from 'react';

type ElementSelectionCallback = (element: Element | null) => void;

export const useElementTargeting = () => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);

  const start = useCallback((iframeElement: HTMLIFrameElement | null) => {
    setIframe(iframeElement);
    setIsSelecting(true);
  }, []);

  const cancel = useCallback(() => {
    setIsSelecting(false);
    setIframe(null);
  }, []);

  return {
    isSelecting,
    start,
    cancel,
    iframe,
  };
};

export const startElementSelection = (iframe: HTMLIFrameElement | null, callback: ElementSelectionCallback) => {
  if (!iframe) {
    console.warn('No iframe provided for element selection');
    return;
  }

  const document = iframe.contentDocument;

  if (!document) {
    console.warn('Iframe content document is not available');
    return;
  }

  // Change the iframe pointer events to allow selection inside it
  if (iframe && iframe instanceof HTMLElement) {
    iframe.style.pointerEvents = 'none';
  }

  const handleClick = (e: Event) => {
    e.preventDefault();
    e.stopImmediatePropagation();

    const target = e.target as Element;
    callback(target);
  };

  document.addEventListener('click', handleClick, { capture: true });

  return () => {
    document.removeEventListener('click', handleClick, { capture: true });
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
