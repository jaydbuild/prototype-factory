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
import { Crosshair, X, ChevronUp, ChevronDown } from 'lucide-react';
import { safelyConvertElementMetadata } from '@/utils/feedback-utils';

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
  originalDimensions?: {
    width: number;
    height: number;
  };
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
  scale = 1,
  originalDimensions = { width: 1920, height: 1080 }
}: FeedbackOverlayProps) {
  const { toast } = useToast();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [newFeedbackPosition, setNewFeedbackPosition] = useState<{ x: number, y: number } | null>(null);
  const [newFeedbackContent, setNewFeedbackContent] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackPointType | null>(null);
  const [isInteractingWithComment, setIsInteractingWithComment] = useState(false);
  const [currentHoveredElements, setCurrentHoveredElements] = useState<Element[]>([]);
  const [currentElementIndex, setCurrentElementIndex] = useState(0);
  
  // Use the custom hooks for iframe stability and element targeting
  const { isIframeReady, refreshCheck } = useIframeStability({
    containerSelector: '.sp-preview',
    readyCheckInterval: 150,
    maxRetries: 40
  });
  
  const {
    targetedElement,
    elementTarget,
    isSelectingElement,
    cancelElementSelection,
    getElementPosition,
    highlightElement,
    findElementByTarget,
    generateElementTarget
  } = useElementTargeting({
    enabled: isFeedbackMode && isIframeReady // Enable targeting when feedback mode is on and iframe is ready
  });

  // Refresh iframe check when feedback mode changes
  useEffect(() => {
    console.log("Feedback mode:", isFeedbackMode, "Iframe ready:", isIframeReady);
    if (isFeedbackMode) {
      refreshCheck();
    }
  }, [isFeedbackMode, refreshCheck]);
  
  // For debugging - log when currentHoveredElements changes
  useEffect(() => {
    if (currentHoveredElements.length > 0) {
      console.log(`Currently hovering over ${currentHoveredElements.length} elements, showing index ${currentElementIndex}`);
    }
  }, [currentHoveredElements, currentElementIndex]);
  
  // Use memoized handler for overlay clicks to prevent unnecessary recreations
  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isFeedbackMode || !overlayRef.current || !isIframeReady) return;
    
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
      // If we have hovered elements, use the position of the selected element
      if (currentHoveredElements.length > 0 && currentElementIndex < currentHoveredElements.length) {
        const selectedElement = currentHoveredElements[currentElementIndex];
        const position = getElementPosition(selectedElement);
        if (position) {
          setNewFeedbackPosition({ x: position.x, y: position.y });
          setSelectedFeedback(null);
          e.stopPropagation();
          return;
        }
      }
      
      // Fallback to click position if no element is hovered
      const rect = overlayRef.current.getBoundingClientRect();
      
      // Calculate position as percentages relative to original dimensions
      // taking into account the current scale
      const x = ((e.clientX - rect.left) / (rect.width)) * 100;
      const y = ((e.clientY - rect.top) / (rect.height)) * 100;
      
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        setNewFeedbackPosition({ x, y });
        setSelectedFeedback(null);
        e.stopPropagation();
      }
    } catch (error) {
      console.error('Error handling overlay click:', error);
    }
  }, [isFeedbackMode, isIframeReady, isInteractingWithComment, currentHoveredElements, currentElementIndex, getElementPosition]);

  // Handle key presses for element navigation
  useEffect(() => {
    if (!isFeedbackMode || !isIframeReady) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFeedbackMode || currentHoveredElements.length === 0) return;
      
      // Up arrow to select parent element
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentElementIndex(prev => {
          const newIndex = Math.min(prev + 1, currentHoveredElements.length - 1);
          highlightElement(currentHoveredElements[newIndex]);
          return newIndex;
        });
      }
      
      // Down arrow to select child element
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentElementIndex(prev => {
          const newIndex = Math.max(prev - 1, 0);
          highlightElement(currentHoveredElements[newIndex]);
          return newIndex;
        });
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isFeedbackMode, 
    isIframeReady, 
    highlightElement, 
    currentHoveredElements, 
    currentElementIndex
  ]);
  
  // Use memoized handler for overlay clicks to prevent unnecessary recreations
  

  // Memoized handlers for feedback interactions
  const handleFeedbackPointClick = useCallback((feedback: FeedbackPointType) => {
    setIsInteractingWithComment(true);
    setSelectedFeedback(feedback);
    setNewFeedbackPosition(null);
    
    // If feedback has element targeting, highlight the element
    if (feedback.element_target) {
      const element = findElementByTarget(feedback.element_target);
      if (element) {
        highlightElement(element);
      }
    }
  }, [findElementByTarget, highlightElement]);

  const handleCancelNewFeedback = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    setNewFeedbackPosition(null);
    setNewFeedbackContent('');
    
    setTimeout(() => setIsInteractingWithComment(false), 100);
    
    // Clear element highlighting
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
      // Use the position from the targeted element if available
      let feedbackPosition = newFeedbackPosition || { x: 50, y: 50 };
      
      // If we have a targeted element, get its position
      if (currentHoveredElements.length > 0 && currentElementIndex < currentHoveredElements.length) {
        const selectedElement = currentHoveredElements[currentElementIndex];
        const position = getElementPosition(selectedElement);
        if (position) {
          feedbackPosition = {
            x: position.x,
            y: position.y
          };
        }
      }
      
      // Get element target data if we have a selected element
      let targetData: ElementTarget | null = null;
      if (currentHoveredElements.length > 0 && currentElementIndex < currentHoveredElements.length) {
        const selectedElement = currentHoveredElements[currentElementIndex];
        // Generate element target data and ensure attributes are properly converted to strings
        const rawTargetData = generateElementTarget(selectedElement);
        targetData = {
          selector: rawTargetData.selector,
          xpath: rawTargetData.xpath,
          metadata: safelyConvertElementMetadata(rawTargetData.metadata)
        };
      }
      
      // Prepare feedback data including element targeting
      const feedbackData: any = {
        prototype_id: prototypeId,
        created_by: currentUser.id,
        content: newFeedbackContent,
        position: feedbackPosition,
        status: 'open'
      };
      
      // Add element targeting data if available
      if (targetData) {
        feedbackData.element_selector = targetData.selector || null;
        feedbackData.element_xpath = targetData.xpath || null;
        feedbackData.element_metadata = targetData.metadata || null;
      }

      const { data, error } = await supabase
        .from('prototype_feedback')
        .insert(feedbackData)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Convert the database response to match our FeedbackPoint type
        const feedback: FeedbackPointType = {
          id: data.id,
          prototype_id: data.prototype_id,
          created_by: data.created_by,
          content: data.content,
          position: typeof data.position === 'string' 
            ? JSON.parse(data.position) 
            : data.position,
          created_at: data.created_at,
          updated_at: data.updated_at,
          status: data.status as FeedbackPointType['status'],
          element_target: data.element_selector || data.element_xpath || data.element_metadata
            ? {
                selector: data.element_selector,
                xpath: data.element_xpath,
                metadata: safelyConvertElementMetadata(data.element_metadata)
              }
            : undefined
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
      setCurrentHoveredElements([]);
      
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
  }, [
    newFeedbackPosition, 
    newFeedbackContent, 
    currentUser, 
    prototypeId, 
    onFeedbackAdded, 
    toast, 
    currentHoveredElements, 
    currentElementIndex, 
    generateElementTarget,
    getElementPosition,
    highlightElement,
    elementTarget
  ]);

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
        // Create a properly typed feedback point from the database response
        const updatedFeedback: FeedbackPointType = {
          id: data.id,
          prototype_id: data.prototype_id,
          created_by: data.created_by,
          content: data.content,
          position: typeof data.position === 'string' 
            ? JSON.parse(data.position) 
            : data.position,
          created_at: data.created_at,
          updated_at: data.updated_at,
          status: data.status as FeedbackPointType['status'],
          element_target: data.element_selector || data.element_xpath || data.element_metadata
            ? {
                selector: data.element_selector,
                xpath: data.element_xpath,
                metadata: safelyConvertElementMetadata(data.element_metadata)
              }
            : undefined
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
  
  // Helper for traversing element hierarchy
  const selectParentElement = useCallback(() => {
    if (currentHoveredElements.length === 0) return;
    
    const newIndex = Math.min(currentElementIndex + 1, currentHoveredElements.length - 1);
    setCurrentElementIndex(newIndex);
    highlightElement(currentHoveredElements[newIndex]);
  }, [currentHoveredElements, currentElementIndex, highlightElement]);
  
  const selectChildElement = useCallback(() => {
    if (currentHoveredElements.length === 0) return;
    
    const newIndex = Math.max(currentElementIndex - 1, 0);
    setCurrentElementIndex(newIndex);
    highlightElement(currentHoveredElements[newIndex]);
  }, [currentHoveredElements, currentElementIndex, highlightElement]);

  // Effect to collect hovered elements from the element targeting hook
  useEffect(() => {
    if (!isFeedbackMode || !isIframeReady) return;
    
    // Listen for the targetedElement changes from the element targeting hook
    if (targetedElement) {
      // Build parent chain
      const parentChain: Element[] = [];
      let currentElem: Element | null = targetedElement;
      
      // Collect element and its parents (up to 6 levels)
      while (currentElem && parentChain.length < 6) {
        parentChain.push(currentElem);
        currentElem = currentElem.parentElement;
      }
      
      setCurrentHoveredElements(parentChain);
      setCurrentElementIndex(0); // Always start with the most specific element
    }
  }, [isFeedbackMode, isIframeReady, targetedElement]);

  if (!isFeedbackMode) {
    return null;
  }

  return (
    <div 
      ref={overlayRef}
      className={`absolute inset-0 ${isIframeReady ? 'cursor-crosshair' : 'cursor-wait'} ${isFeedbackMode ? 'pointer-events-auto' : 'pointer-events-none'}`}
      onClick={handleOverlayClick}
      style={{
        // Apply the same scale as the iframe to ensure alignment
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }}
    >
      {!isIframeReady && isFeedbackMode && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/30 z-10">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      )}
      
      {/* Element Navigation Controls (when hovering) */}
      {isIframeReady && currentHoveredElements.length > 0 && (
        <div className="absolute bottom-4 right-4 z-50 bg-background rounded-md shadow-md border p-2">
          <div className="text-xs text-muted-foreground mb-1">
            Element {currentElementIndex + 1} of {currentHoveredElements.length}
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={selectParentElement}
              disabled={currentElementIndex >= currentHoveredElements.length - 1}
              className="h-8 px-2"
            >
              <ChevronUp className="h-4 w-4 mr-1" /> Parent
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={selectChildElement}
              disabled={currentElementIndex <= 0}
              className="h-8 px-2"
            >
              <ChevronDown className="h-4 w-4 mr-1" /> Child
            </Button>
          </div>
          <div className="text-xs mt-1 text-muted-foreground">
            {currentHoveredElements[currentElementIndex]?.tagName.toLowerCase()}
            {currentHoveredElements[currentElementIndex]?.id ? ` #${currentHoveredElements[currentElementIndex]?.id}` : ''}
            {currentHoveredElements[currentElementIndex]?.className ? ` .${currentHoveredElements[currentElementIndex]?.className.split(' ')[0]}` : ''}
          </div>
          <div className="text-[10px] mt-1 text-muted-foreground italic">
            Use arrow keys ↑↓ to navigate elements
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
              if (feedback.element_target) {
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
      {isIframeReady && (newFeedbackPosition || (currentHoveredElements.length > 0)) && (
        <div 
          className="absolute feedback-form z-40"
          style={newFeedbackPosition ? {
            left: `${newFeedbackPosition.x}%`,
            top: `${newFeedbackPosition.y}%`,
            transform: 'translate(10px, -50%)'
          } : currentHoveredElements.length > 0 ? (() => {
              const element = currentHoveredElements[currentElementIndex];
              const position = getElementPosition(element);
              return position ? {
                left: `${position.x}%`,
                top: `${position.y}%`,
                transform: 'translate(10px, -50%)'
              } : {
                left: '50%',
                top: '30%',
                transform: 'translate(-50%, -50%)'
              };
            })() : {
              left: '50%',
              top: '30%',
              transform: 'translate(-50%, -50%)'
            }
          }
          onClick={(e) => e.stopPropagation()} 
        >
          <Card className="w-72">
            <CardContent className="p-3">
              {currentHoveredElements.length > 0 && currentElementIndex < currentHoveredElements.length && (
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[10px] border border-blue-200">
                    {currentHoveredElements[currentElementIndex]?.tagName.toLowerCase()}
                  </span>
                  <span className="truncate">
                    {currentHoveredElements[currentElementIndex]?.textContent?.trim().substring(0, 20) || 'No text content'}
                    {currentHoveredElements[currentElementIndex]?.textContent?.trim().length > 20 ? '...' : ''}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-4 w-4 ml-auto" 
                    onClick={() => {
                      highlightElement(null);
                      setCurrentHoveredElements([]);
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
