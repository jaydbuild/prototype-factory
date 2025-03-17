
import React, { useState, useRef, useCallback } from 'react';
import { FeedbackPoint, FeedbackUser } from '@/types/feedback';
import { cn } from '@/lib/utils';
import { MessageCircle } from 'lucide-react';

interface FeedbackOverlayProps {
  prototypeId: string;
  isFeedbackMode: boolean;
  feedbackPoints: FeedbackPoint[];
  onFeedbackAdded?: (feedback: FeedbackPoint) => void;
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
  feedbackUsers,
  currentUser,
  previewContainerRef,
  deviceType = 'desktop',
  orientation = 'portrait',
  scale = 1
}: FeedbackOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [clickPosition, setClickPosition] = useState<{ x: number, y: number } | null>(null);
  
  // Handle click to add a comment
  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isFeedbackMode || !previewContainerRef.current || !onFeedbackAdded) return;
    
    // Calculate relative position within the container
    const rect = previewContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setClickPosition({ x, y });
    
    // Create a new feedback point
    const newFeedback: Partial<FeedbackPoint> = {
      prototype_id: prototypeId,
      content: "",
      position: { x, y },
      status: "open",
      created_by: currentUser?.id || "anonymous"
    };
    
    // This would normally display a comment input UI
    console.log("Would add feedback at position:", x, y);
    
    // For now, we're just logging the position - we'd normally show a comment input
    // onFeedbackAdded(newFeedback as FeedbackPoint);
  }, [isFeedbackMode, prototypeId, previewContainerRef, onFeedbackAdded, currentUser]);
  
  // Render feedback points
  const renderFeedbackPoints = () => {
    return feedbackPoints.map((point) => (
      <div
        key={point.id}
        className="absolute flex items-center justify-center -translate-x-1/2 -translate-y-1/2 z-30"
        style={{
          left: `${point.position.x}%`,
          top: `${point.position.y}%`,
        }}
      >
        <div 
          className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-background"
        >
          <MessageCircle className="h-3 w-3" />
        </div>
      </div>
    ));
  };

  return (
    <div 
      ref={overlayRef}
      className={cn(
        "absolute inset-0 pointer-events-none bg-transparent",
        isFeedbackMode && "pointer-events-auto"
      )}
      onClick={handleOverlayClick}
      style={{ 
        pointerEvents: isFeedbackMode ? 'auto' : 'none' 
      }}
    >
      {isFeedbackMode && (
        <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-2 z-[100] border border-border">
          <div className="text-sm font-medium">Feedback Mode</div>
          <div className="text-xs text-muted-foreground">
            Click anywhere to add a comment
          </div>
        </div>
      )}
      
      {/* Display existing feedback points */}
      {isFeedbackMode && renderFeedbackPoints()}
      
      {/* Show indicator for the click position */}
      {clickPosition && isFeedbackMode && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 animate-pulse-once"
          style={{
            left: `${clickPosition.x}%`,
            top: `${clickPosition.y}%`,
            zIndex: 50,
          }}
        >
          <div className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white">
            <MessageCircle className="h-3 w-3" />
          </div>
        </div>
      )}
    </div>
  );
}
