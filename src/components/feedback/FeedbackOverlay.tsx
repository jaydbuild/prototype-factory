
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FeedbackPoint as FeedbackPointType, FeedbackUser, ElementTarget } from '@/types/feedback';
import { FeedbackPoint } from './FeedbackPoint';
import { CommentThread } from './CommentThread';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useIframeStability } from '@/hooks/use-iframe-stability';
import { useElementTargeting } from '@/hooks/use-element-targeting';
import { Toggle } from '@/components/ui/toggle';
import { Crosshair, X } from 'lucide-react';

interface FeedbackOverlayProps {
  prototypeId: string;
  isFeedbackMode: boolean;
  feedbackPoints: FeedbackPointType[];
  onFeedbackAdded: (feedback: FeedbackPointType) => void;
  onFeedbackUpdated: (feedback: FeedbackPointType) => void;
  feedbackUsers: Record<string, FeedbackUser>;
  currentUser?: FeedbackUser;
  previewContainerRef?: React.RefObject<HTMLDivElement>;
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
  const { toast } = useToast();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [newFeedbackPosition, setNewFeedbackPosition] = useState<{ x: number, y: number } | null>(null);
  const [newFeedbackContent, setNewFeedbackContent] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackPointType | null>(null);
  const [isInteractingWithComment, setIsInteractingWithComment] = useState(false);
  const [isElementSelectMode, setIsElementSelectMode] = useState(false);
  const [elementHighlightEnabled, setElementHighlightEnabled] = useState(true);
  
  // Use the custom hooks for iframe stability and element targeting
  const { isIframeReady, refreshCheck } = useIframeStability({
    containerSelector: '.sp-preview',
    readyCheckInterval: 150,
    maxRetries: 40
  });
  
  const {
    elementTarget,
    isSelectingElement,
    startElementSelection,
    cancelElementSelection,
    getElementPosition,
    highlightElement,
    findElementByTarget
  } = useElementTargeting({
    enabled: isFeedbackMode
  });

  // Refresh iframe check when feedback mode changes
  useEffect(() => {
    if (isFeedbackMode) {
      refreshCheck();
    }
  }, [isFeedbackMode, refreshCheck]);
  
  // Handle element selection mode
  useEffect(() => {
    if (isFeedbackMode && isElementSelectMode && isIframeReady && !isSelectingElement) {
      const cleanup = startElementSelection();
      return cleanup;
    }
  }, [isElementSelectMode, isFeedbackMode, isIframeReady, isSelectingElement, startElementSelection]);
  
  // Display feedback points with element targeting
  useEffect(() => {
    if (!isFeedbackMode || !isIframeReady || !elementHighlightEnabled) return;
    
    // Highlight targeted elements when hovering over feedback points
    const handleFeedbackPointHover = (feedback: FeedbackPointType | null) => {
      if (!feedback || !feedback.element_target) {
        highlightElement(null);
        return;
      }
      
      const element = findElementByTarget(feedback.element_target);
      if (element) {
        highlightElement(element);
      } else {
        highlightElement(null);
      }
    };
    
    // Attach this function to the feedback points (would need component changes)
    // This would be added in the FeedbackPoint component
  }, [isFeedbackMode, isIframeReady, elementHighlightEnabled, highlightElement, findElementByTarget]);

  // Use memoized handler for overlay clicks to prevent unnecessary recreations
  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isFeedbackMode || !overlayRef.current || !isIframeReady) return;
    
    // If we're in element select mode, don't add a feedback point
    if (isElementSelectMode) {
      e.stopPropagation();
      return;
    }
    
    // If we're already interacting with a comment, don't add a new one
    if (isInteractingWithComment) {
      e.stopPropagation();
      return;
    }
    
    // Check if we clicked on an existing feedback point or form
    if ((e.target as HTMLElement).closest('.feedback-point') || 
        (e.target as HTMLElement).closest('.feedback-form') ||
        (e.target as HTMLElement).closest('.comment-thread')) {
      e.stopPropagation();
      return;
    }
    
    try {
      const rect = overlayRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        setNewFeedbackPosition({ x, y });
        setSelectedFeedback(null);
        e.stopPropagation();
      }
    } catch (error) {
      console.error('Error handling overlay click:', error);
    }
  }, [isFeedbackMode, isIframeReady, isInteractingWithComment, isElementSelectMode]);

  // Memoized handlers for feedback interactions
  const handleFeedbackPointClick = useCallback((feedback: FeedbackPointType) => {
    setIsInteractingWithComment(true);
    setSelectedFeedback(feedback);
    setNewFeedbackPosition(null);
    
    // If feedback has element targeting, highlight the element
    if (elementHighlightEnabled && feedback.element_target) {
      const element = findElementByTarget(feedback.element_target);
      if (element) {
        highlightElement(element);
      }
    }
  }, [elementHighlightEnabled, findElementByTarget, highlightElement]);

  const handleCancelNewFeedback = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    setNewFeedbackPosition(null);
    setNewFeedbackContent('');
    
    setTimeout(() => setIsInteractingWithComment(false), 100);
    
    // Clear element targeting
    highlightElement(null);
  }, [highlightElement]);

  const handleSubmitNewFeedback = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!newFeedbackPosition && !elementTarget) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a position or element for feedback."
      });
      return;
    }
    
    if (!newFeedbackContent.trim() || !currentUser) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please add a comment and make sure you're logged in."
      });
      return;
    }

    try {
      // Prepare feedback data including element targeting
      const feedbackData = {
        prototype_id: prototypeId,
        created_by: currentUser.id,
        content: newFeedbackContent,
        position: newFeedbackPosition || { x: 50, y: 50 }, // Default position if using element targeting
        status: 'open',
        element_selector: elementTarget?.selector || null,
        element_xpath: elementTarget?.xpath || null,
        element_metadata: elementTarget?.metadata || null
      };

      const { data, error } = await supabase
        .from('prototype_feedback')
        .insert(feedbackData)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Convert the data to match our FeedbackPoint type with element_target
        const feedback: FeedbackPointType = {
          ...data,
          element_target: elementTarget ? {
            selector: elementTarget.selector,
            xpath: elementTarget.xpath,
            metadata: elementTarget.metadata
          } : undefined
        };
        
        onFeedbackAdded(feedback);
        toast({
          title: "Feedback added",
          description: "Your feedback has been added to the prototype."
        });
      }
      
      setNewFeedbackPosition(null);
      setNewFeedbackContent('');
      highlightElement(null);
      setIsElementSelectMode(false);
      
      setTimeout(() => setIsInteractingWithComment(false), 100);
    } catch (error) {
      console.error("Error adding feedback:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add feedback. Please try again."
      });
      setIsInteractingWithComment(false);
    }
  }, [newFeedbackPosition, newFeedbackContent, currentUser, prototypeId, onFeedbackAdded, toast, elementTarget, highlightElement]);

  const handleUpdateFeedbackStatus = useCallback(async (status: FeedbackPointType['status'], e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    if (!selectedFeedback || !currentUser) return;
    
    try {
      const { data, error } = await supabase
        .from('prototype_feedback')
        .update({ status })
        .eq('id', selectedFeedback.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Include element_target in the updated feedback
        const updatedFeedback: FeedbackPointType = {
          ...data as FeedbackPointType,
          element_target: selectedFeedback.element_target
        };
        
        onFeedbackUpdated(updatedFeedback);
        setSelectedFeedback(updatedFeedback);
        toast({
          title: "Status updated",
          description: `Feedback status changed to ${status}.`
        });
      }
    } catch (error) {
      console.error("Error updating feedback status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update status. Please try again."
      });
    }
  }, [selectedFeedback, currentUser, onFeedbackUpdated, toast]);

  const handleAddReply = useCallback((content: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    toast({
      title: "Reply added",
      description: "Your reply has been added to the feedback."
    });
  }, [toast]);
  
  const handleCloseCommentThread = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    setSelectedFeedback(null);
    highlightElement(null);
    
    setTimeout(() => setIsInteractingWithComment(false), 100);
  }, [highlightElement]);
  
  const toggleElementSelectMode = useCallback(() => {
    if (isElementSelectMode) {
      cancelElementSelection();
      setIsElementSelectMode(false);
    } else {
      setIsElementSelectMode(true);
    }
  }, [isElementSelectMode, cancelElementSelection]);

  if (!isFeedbackMode) {
    return null;
  }

  return (
    <div 
      ref={overlayRef}
      className={`absolute inset-0 ${isIframeReady ? 'cursor-crosshair' : 'cursor-wait'} ${isFeedbackMode ? 'pointer-events-auto' : 'pointer-events-none'}`}
      onClick={handleOverlayClick}
    >
      {!isIframeReady && isFeedbackMode && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/30 z-10">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      )}
      
      {/* Element Selection Controls */}
      {isIframeReady && isFeedbackMode && (
        <div className="absolute top-3 right-3 z-50 flex gap-2">
          <div className="bg-background border rounded-md p-1 shadow-md flex items-center gap-1">
            <Toggle
              pressed={isElementSelectMode}
              onPressedChange={toggleElementSelectMode}
              size="sm"
              className="data-[state=on]:bg-primary"
              aria-label="Target specific elements"
            >
              <Crosshair className="h-4 w-4" />
            </Toggle>
            <Toggle
              pressed={elementHighlightEnabled}
              onPressedChange={setElementHighlightEnabled}
              size="sm"
              className="data-[state=on]:bg-primary"
              aria-label="Highlight elements"
            >
              <div className="w-4 h-4 bg-blue-400/20 border border-blue-400 rounded-sm"></div>
            </Toggle>
          </div>
        </div>
      )}
      
      {/* Feedback Points */}
      {isIframeReady && feedbackPoints.map(feedback => (
        <div 
          key={feedback.id} 
          className="feedback-point"
          onClick={(e) => e.stopPropagation()} 
        >
          <FeedbackPoint
            feedback={feedback}
            onClick={handleFeedbackPointClick}
            isSelected={selectedFeedback?.id === feedback.id}
            commentCount={0}
            onMouseEnter={() => {
              if (elementHighlightEnabled && feedback.element_target) {
                const element = findElementByTarget(feedback.element_target);
                if (element) highlightElement(element);
              }
            }}
            onMouseLeave={() => {
              if (!selectedFeedback || selectedFeedback.id !== feedback.id) {
                highlightElement(null);
              }
            }}
          />
        </div>
      ))}
      
      {/* Selected Feedback Thread */}
      {isIframeReady && selectedFeedback && (
        <div 
          className="absolute comment-thread z-40"
          style={{
            left: `${selectedFeedback.position.x}%`,
            top: `${selectedFeedback.position.y}%`,
            transform: 'translate(10px, -50%)'
          }}
          onClick={(e) => e.stopPropagation()} 
        >
          <CommentThread
            feedback={selectedFeedback}
            onClose={handleCloseCommentThread}
            onUpdateStatus={handleUpdateFeedbackStatus}
            onAddReply={handleAddReply}
            currentUser={currentUser}
            creator={feedbackUsers[selectedFeedback.created_by]}
          />
        </div>
      )}
      
      {/* New Feedback Form */}
      {isIframeReady && (newFeedbackPosition || elementTarget) && (
        <div 
          className="absolute feedback-form z-40"
          style={newFeedbackPosition ? {
            left: `${newFeedbackPosition.x}%`,
            top: `${newFeedbackPosition.y}%`,
            transform: 'translate(10px, -50%)'
          } : {
            left: '50%',
            top: '30%',
            transform: 'translate(-50%, -50%)'
          }}
          onClick={(e) => e.stopPropagation()} 
        >
          <Card className="w-72">
            <CardContent className="p-3">
              {elementTarget && elementTarget.metadata?.displayName && (
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[10px] border border-blue-200">
                    {elementTarget.metadata.tagName}
                  </span>
                  <span className="truncate">{elementTarget.metadata.displayName}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-4 w-4 ml-auto" 
                    onClick={() => {
                      highlightElement(null);
                      setIsElementSelectMode(false);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <Textarea
                placeholder="What's your feedback?"
                value={newFeedbackContent}
                onChange={(e) => setNewFeedbackContent(e.target.value)}
                className="min-h-[80px]"
                autoFocus
                onClick={(e) => e.stopPropagation()} 
              />
            </CardContent>
            <CardFooter className="p-3 pt-0 flex justify-between">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCancelNewFeedback}
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleSubmitNewFeedback}
                disabled={!newFeedbackContent.trim()}
              >
                Submit
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
