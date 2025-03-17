
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ElementTarget, FeedbackPoint, FeedbackUser } from '@/types/feedback';
import { useElementTargeting } from '@/hooks/use-element-targeting';
import { FeedbackPoint as FeedbackPointComponent } from './FeedbackPoint';
import { CommentThread } from './CommentThread';
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
  
  const [showPointForm, setShowPointForm] = useState(false);
  const [pointFormPosition, setPointFormPosition] = useState({ x: 0, y: 0 });
  const [loadedPoints, setLoadedPoints] = useState<FeedbackPoint[]>([]);
  const [activePointId, setActivePointId] = useState<string | null>(null);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  
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
    
    const visiblePoints = feedbackPoints.filter(point => !point.isResolved);
    setLoadedPoints(visiblePoints);
    
  }, [feedbackPoints, isFeedbackMode, previewContainerRef]);

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
      setActivePointId(null);
      setHoveredPointId(null);
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
            Hover over elements to inspect them
          </div>
        </div>
      )}
      
      {/* Display element information when an element is selected */}
      {isFeedbackMode && targetedElement && elementTarget && (
        <ElementInfo element={targetedElement} elementTarget={elementTarget} />
      )}
    </div>
  );
}
