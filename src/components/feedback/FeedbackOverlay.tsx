import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ElementTarget, FeedbackPoint, FeedbackUser } from '@/types/feedback';
import { useElementTargeting } from '@/hooks/use-element-targeting';
import { cn } from '@/lib/utils';

interface ElementInfoProps {
  element: Element | null;
  elementTarget: ElementTarget | null;
}

const ElementInfo: React.FC<ElementInfoProps> = ({ element, elementTarget }) => {
  if (!element || !elementTarget) return null;
  
  const { metadata } = elementTarget;
  
  return (
    <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-md z-[100] border border-border">
      <h3 className="text-lg font-medium mb-2">Element Inspector</h3>
      
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-semibold">Type:</span> {metadata?.tagName || 'Unknown'}
        </div>
        
        {metadata?.displayName && (
          <div>
            <span className="font-semibold">Name:</span> {metadata.displayName}
          </div>
        )}
        
        {metadata?.text && (
          <div>
            <span className="font-semibold">Text:</span> {metadata.text}
          </div>
        )}
        
        {elementTarget.selector && (
          <div>
            <span className="font-semibold">Selector:</span>
            <code className="ml-1 px-1 py-0.5 bg-gray-100 rounded text-xs">
              {elementTarget.selector}
            </code>
          </div>
        )}
        
        {metadata?.attributes && Object.keys(metadata.attributes).length > 0 && (
          <div>
            <span className="font-semibold">Attributes:</span>
            <div className="ml-2 mt-1 space-y-1">
              {Object.entries(metadata.attributes).map(([key, value]) => (
                <div key={key} className="grid grid-cols-[80px_1fr] gap-1">
                  <code className="text-xs">{key}:</code>
                  <code className="text-xs truncate">{value}</code>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface OverlayElementInspectorProps {
  iframeRef: React.RefObject<HTMLIFrameElement>;
}

const OverlayElementInspector: React.FC<OverlayElementInspectorProps> = ({ iframeRef }) => {
  const [highlightPosition, setHighlightPosition] = useState({ 
    left: 0, 
    top: 0, 
    width: 100, 
    height: 50 
  });
  const [isHovering, setIsHovering] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const mousePositionRef = useRef({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!iframeRef.current) return;
    
    const rect = iframeRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    mousePositionRef.current = { x, y };
    
    // Calculate highlight position - make it centered around the cursor
    const width = 150;
    const height = 50;
    
    setHighlightPosition({
      left: Math.max(0, Math.min(x - width / 2, rect.width - width)),
      top: Math.max(0, Math.min(y - height / 2, rect.height - height)),
      width,
      height
    });
    
    setIsHovering(true);
  }, [iframeRef]);
  
  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
  }, []);
  
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    setSelectedPosition(highlightPosition);
  }, [highlightPosition]);
  
  return (
    <>
      <div 
        className="absolute inset-0 cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />
      
      {isHovering && (
        <div 
          className="element-highlight absolute pointer-events-none"
          style={{
            left: `${highlightPosition.left}px`,
            top: `${highlightPosition.top}px`,
            width: `${highlightPosition.width}px`,
            height: `${highlightPosition.height}px`,
          }}
        />
      )}
      
      {selectedPosition && (
        <div 
          className="element-highlight absolute pointer-events-none animate-pulse-once"
          style={{
            left: `${selectedPosition.left}px`,
            top: `${selectedPosition.top}px`,
            width: `${selectedPosition.width}px`,
            height: `${selectedPosition.height}px`,
            border: '3px solid #22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
          }}
        />
      )}
      
      {selectedPosition && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-md z-[100] border border-border">
          <h3 className="text-lg font-medium mb-2">Element Inspector</h3>
          
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-semibold">Position:</span> 
              <span className="font-mono text-xs ml-1">
                x: {Math.round(selectedPosition.left + selectedPosition.width/2)}, 
                y: {Math.round(selectedPosition.top + selectedPosition.height/2)}
              </span>
            </div>
            <div>
              <span className="font-semibold">Size:</span> 
              <span className="font-mono text-xs ml-1">
                {Math.round(selectedPosition.width)} × {Math.round(selectedPosition.height)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Note: This is an approximate visual inspection. To inspect actual DOM elements, 
              try using browser DevTools.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

interface FeedbackOverlayProps {
  prototypeId: string;
  isFeedbackMode: boolean;
  feedbackPoints: FeedbackPoint[];
  onFeedbackAdded?: (feedback: FeedbackPoint) => void;
  onFeedbackUpdated?: (feedback: FeedbackPoint) => void;
  feedbackUsers: Record<string, FeedbackUser>;
  currentUser: FeedbackUser | null;
  previewContainerRef: React.RefObject<HTMLDivElement>;
  deviceType?: 'desktop' | 'tablet' | 'mobile' | 'custom';
  orientation?: 'portrait' | 'landscape';
  scale?: number;
}

export function FeedbackOverlay({
  prototypeId,
  isFeedbackMode,
  feedbackPoints,
  onFeedbackAdded,
  onFeedbackUpdated,
  feedbackUsers,
  currentUser,
  previewContainerRef,
  deviceType = 'desktop',
  orientation = 'portrait',
  scale = 1
}: FeedbackOverlayProps) {
  const [isIframeReady, setIsIframeReady] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  
  const [loadedPoints, setLoadedPoints] = useState<FeedbackPoint[]>([]);
  
  const {
    targetedElement,
    elementTarget,
    isSelectingElement,
    startElementSelection,
    cancelElementSelection,
    getElementPosition,
    highlightElement,
    findElementByTarget,
    generateElementTarget,
    isIframeReady: isElementTargetingReady,
    setTargetedElement
  } = useElementTargeting({
    enabled: isFeedbackMode && isIframeReady
  });
  
  useEffect(() => {
    setIsIframeReady(isElementTargetingReady);
  }, [isElementTargetingReady]);

  // Display feedback points
  useEffect(() => {
    if (!previewContainerRef.current || !isFeedbackMode) return;
    
    const visiblePoints = feedbackPoints;
    setLoadedPoints(visiblePoints);
    
  }, [feedbackPoints, isFeedbackMode, previewContainerRef]);

  // Find and cache the iframe element
  useEffect(() => {
    if (!previewContainerRef.current) return;
    
    const iframe = previewContainerRef.current.querySelector('iframe');
    if (iframe) {
      iframeRef.current = iframe;
    }
  }, [previewContainerRef]);

  // Handle resizing and scaling for the overlay
  useEffect(() => {
    if (!overlayRef.current || !previewContainerRef.current) return;
    
    const updateOverlaySize = () => {
      if (!overlayRef.current || !previewContainerRef.current) return;
      
      const previewRect = previewContainerRef.current.getBoundingClientRect();
      overlayRef.current.style.width = `${previewRect.width}px`;
      overlayRef.current.style.height = `${previewRect.height}px`;
    };
    
    updateOverlaySize();
    window.addEventListener('resize', updateOverlaySize);
    
    return () => {
      window.removeEventListener('resize', updateOverlaySize);
    };
  }, [previewContainerRef, deviceType, orientation, scale]);
  
  // Clear element when feedback mode is disabled
  useEffect(() => {
    if (!isFeedbackMode) {
      setTargetedElement(null);
    }
  }, [isFeedbackMode, setTargetedElement]);

  return (
    <div 
      ref={overlayRef}
      className={cn(
        "absolute inset-0 pointer-events-none bg-transparent",
        isFeedbackMode && "pointer-events-auto"
      )}
      style={{ 
        pointerEvents: isFeedbackMode ? 'auto' : 'none' 
      }}
    >
      {isFeedbackMode && (
        <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-2 z-[100] border border-border">
          <div className="text-sm font-medium">Element Inspector Mode</div>
          <div className="text-xs text-muted-foreground">
            Hover over the content to inspect elements
          </div>
        </div>
      )}
      
      {/* New visual element inspector overlay */}
      {isFeedbackMode && iframeRef.current && (
        <OverlayElementInspector iframeRef={iframeRef} />
      )}
      
      {/* Original element inspector - keep for now but it won't work cross-origin */}
      {isFeedbackMode && targetedElement && elementTarget && (
        <ElementInfo element={targetedElement} elementTarget={elementTarget} />
      )}
    </div>
  );
}
