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

function safelyConvertAttributes(attributes: any): Record<string, string> | undefined {
  if (!attributes || typeof attributes !== 'object') {
    return undefined;
  }
  
  if (Array.isArray(attributes)) {
    return undefined;
  }
  
  const result: Record<string, string> = {};
  for (const key in attributes) {
    if (Object.prototype.hasOwnProperty.call(attributes, key)) {
      const value = attributes[key];
      if (value != null) {
        result[key] = String(value);
      }
    }
  }
  
  return Object.keys(result).length > 0 ? result : undefined;
}

function safelyConvertElementMetadata(metadata: any): ElementTarget['metadata'] {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  
  return {
    tagName: typeof metadata.tagName === 'string' ? metadata.tagName : undefined,
    text: typeof metadata.text === 'string' ? metadata.text : undefined,
    attributes: safelyConvertAttributes(metadata.attributes),
    elementType: typeof metadata.elementType === 'string' ? metadata.elementType : undefined,
    displayName: typeof metadata.displayName === 'string' ? metadata.displayName : undefined
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
  scale = 1
}: FeedbackOverlayProps) {
  const { toast } = useToast();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [newFeedbackPosition, setNewFeedbackPosition] = useState<{ x: number, y: number } | null>(null);
  const [newFeedbackContent, setNewFeedbackContent] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackPointType | null>(null);
  const [isInteractingWithComment, setIsInteractingWithComment] = useState(false);
  const [currentHoveredElements, setCurrentHoveredElements] = useState<Element[]>([]);
  const [currentElementIndex, setCurrentElementIndex] = useState(0);
  
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
    enabled: isFeedbackMode && isIframeReady
  });

  useEffect(() => {
    console.log("Feedback mode:", isFeedbackMode, "Iframe ready:", isIframeReady);
    if (isFeedbackMode) {
      refreshCheck();
    }
  }, [isFeedbackMode, refreshCheck]);
  
  useEffect(() => {
    if (currentHoveredElements.length > 0) {
      console.log(`Currently hovering over ${currentHoveredElements.length} elements, showing index ${currentElementIndex}`);
    }
  }, [currentHoveredElements, currentElementIndex]);
  
  useEffect(() => {
    if (!isFeedbackMode || !isIframeReady) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFeedbackMode || currentHoveredElements.length === 0) return;
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentElementIndex(prev => {
          const newIndex = Math.min(prev + 1, currentHoveredElements.length - 1);
          highlightElement(currentHoveredElements[newIndex]);
          return newIndex;
        });
      }
      
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
  
  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isFeedbackMode || !overlayRef.current || !isIframeReady) return;
    
    if (isInteractingWithComment) {
      e.stopPropagation();
      return;
    }
    
    if ((e.target as HTMLElement).closest('.feedback-point') || 
        (e.target as HTMLElement).closest('.feedback-form') ||
        (e.target as HTMLElement).closest('.comment-thread')) {
      e.stopPropagation();
      return;
    }
    
    try {
      if (targetedElement) {
        const position = getElementPosition(targetedElement);
        if (position) {
          setNewFeedbackPosition({ x: position.x, y: position.y });
          setSelectedFeedback(null);
          setIsInteractingWithComment(true);
          e.stopPropagation();
          return;
        }
      }
      
      if (currentHoveredElements.length > 0 && currentElementIndex < currentHoveredElements.length) {
        const selectedElement = currentHoveredElements[currentElementIndex];
        const position = getElementPosition(selectedElement);
        if (position) {
          setNewFeedbackPosition({ x: position.x, y: position.y });
          setSelectedFeedback(null);
          setIsInteractingWithComment(true);
          e.stopPropagation();
          return;
        }
      }
      
      const rect = overlayRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        setNewFeedbackPosition({ x, y });
        setSelectedFeedback(null);
        setIsInteractingWithComment(true);
        e.stopPropagation();
      }
    } catch (error) {
      console.error('Error handling overlay click:', error);
    }
  }, [
    isFeedbackMode, 
    isIframeReady, 
    isInteractingWithComment, 
    targetedElement,
    currentHoveredElements, 
    currentElementIndex, 
    getElementPosition
  ]);

  const handleFeedbackPointClick = useCallback((feedback: FeedbackPointType) => {
    setIsInteractingWithComment(true);
    setSelectedFeedback(feedback);
    setNewFeedbackPosition(null);
    
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
      let feedbackPosition = newFeedbackPosition || { x: 50, y: 50 };
      
      let targetData: ElementTarget | null = null;
      
      if (targetedElement) {
        const position = getElementPosition(targetedElement);
        if (position) {
          feedbackPosition = {
            x: position.x,
            y: position.y
          };
        }
        
        const rawTargetData = generateElementTarget(targetedElement);
        targetData = {
          selector: rawTargetData.selector,
          xpath: rawTargetData.xpath,
          metadata: safelyConvertElementMetadata(rawTargetData.metadata)
        };
      }
      else if (currentHoveredElements.length > 0 && currentElementIndex < currentHoveredElements.length) {
        const selectedElement = currentHoveredElements[currentElementIndex];
        const position = getElementPosition(selectedElement);
        if (position) {
          feedbackPosition = {
            x: position.x,
            y: position.y
          };
        }
        
        const rawTargetData = generateElementTarget(selectedElement);
        targetData = {
          selector: rawTargetData.selector,
          xpath: rawTargetData.xpath,
          metadata: safelyConvertElementMetadata(rawTargetData.metadata)
        };
      }
      
      const feedbackData: any = {
        prototype_id: prototypeId,
        created_by: currentUser.id,
        content: newFeedbackContent,
        position: feedbackPosition,
        status: 'open'
      };
      
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
      setTargetedElement(null);
      
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
    targetedElement,
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

  useEffect(() => {
    if (!isFeedbackMode || !isIframeReady) return;
    
    if (targetedElement) {
      const parentChain: Element[] = [];
      let currentElem: Element | null = targetedElement;
      
      while (currentElem && parentChain.length < 6) {
        parentChain.push(currentElem);
        currentElem = currentElem.parentElement;
      }
      
      setCurrentHoveredElements(parentChain);
      setCurrentElementIndex(0);
    }
  }, [isFeedbackMode, isIframeReady, targetedElement]);

  if (!isFeedbackMode) {
    return null;
  }

  return (
    <div 
      ref={overlayRef}
      className={`absolute inset-0 ${isIframeReady ? 'cursor-pointer' : 'cursor-wait'} ${isFeedbackMode ? 'pointer-events-auto' : 'pointer-events-none'}`}
      onClick={handleOverlayClick}
    >
      {!isIframeReady && isFeedbackMode && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/30 z-10">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      )}
      
      {isIframeReady && isFeedbackMode && !isInteractingWithComment && !selectedFeedback && (
        <div className="absolute top-4 left-4 z-50 bg-background/90 rounded-md shadow-md border p-3 max-w-sm">
          <p className="text-sm font-medium">Feedback Mode</p>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-medium">Hover</span> over elements to highlight them, then <span className="font-medium">click</span> to add your feedback.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Use <span className="font-medium">arrow keys</span> to navigate between parent and child elements.
          </p>
        </div>
      )}
      
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
            Click to add a comment on this element
          </div>
        </div>
      )}
      
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
      
      {isIframeReady && newFeedbackPosition && isInteractingWithComment && (
        <div 
          className="absolute feedback-form z-40"
          style={{
            left: `${newFeedbackPosition.x}%`,
            top: `${newFeedbackPosition.y}%`,
            transform: 'translate(10px, -50%)'
          }}
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
