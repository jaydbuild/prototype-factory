import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FeedbackPoint as FeedbackPointType, FeedbackUser, ElementTarget, DeviceType, DeviceInfo, FeedbackStatus } from '@/types/feedback';
import { FeedbackPoint } from './FeedbackPoint';
import { FeedbackDeviceFilter } from './FeedbackDeviceFilter';
import { CommentThread } from './CommentThread';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useIframeStability } from '@/hooks/use-iframe-stability';
import { useElementTargeting } from '@/hooks/use-element-targeting';
import { Crosshair, X, ChevronUp, ChevronDown, Smartphone, Tablet, Monitor } from 'lucide-react';
import { safelyConvertElementMetadata, safelyConvertDeviceInfo } from '@/utils/feedback-utils';

interface FeedbackOverlayProps {
  prototypeId: string;
  isFeedbackMode: boolean;
  feedbackPoints: FeedbackPointType[];
  onFeedbackAdded: (feedback: FeedbackPointType) => void;
  onFeedbackUpdated: (feedback: FeedbackPointType) => void;
  feedbackUsers: Record<string, FeedbackUser>;
  currentUser?: FeedbackUser;
  previewContainerRef?: React.RefObject<HTMLDivElement>;
  deviceType?: DeviceType;
  orientation?: 'portrait' | 'landscape';
  scale?: number;
  originalDimensions?: {
    width: number;
    height: number;
  };
}

interface SupabaseFeedbackResponse {
  id: string;
  prototype_id: string;
  created_by: string;
  content: string;
  position: any;
  created_at: string;
  updated_at: string | null;
  status: string;
  element_selector?: string | null;
  element_xpath?: string | null;
  element_metadata?: any;
  device_type?: string;
  device_info?: any;
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
  const [selectedDeviceType, setSelectedDeviceType] = useState<DeviceType | 'all'>('all');
  
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

  const currentDeviceInfo: DeviceInfo = {
    type: deviceType,
    width: originalDimensions.width,
    height: originalDimensions.height,
    orientation: orientation,
    scale: scale
  };

  const deviceCounts = useMemo(() => {
    const counts: Record<DeviceType | 'all', number> = {
      all: feedbackPoints.length,
      desktop: 0,
      tablet: 0,
      mobile: 0,
      custom: 0
    };
    
    feedbackPoints.forEach(feedback => {
      if (feedback.device_info?.type) {
        counts[feedback.device_info.type] = (counts[feedback.device_info.type] || 0) + 1;
      } else {
        counts.desktop += 1;
      }
    });
    
    return counts;
  }, [feedbackPoints]);

  const filteredFeedbackPoints = useMemo(() => {
    if (selectedDeviceType === 'all') {
      return feedbackPoints;
    }
    
    return feedbackPoints.filter(feedback => {
      if (!feedback.device_info) {
        return selectedDeviceType === 'desktop';
      }
      
      return feedback.device_info.type === selectedDeviceType;
    });
  }, [feedbackPoints, selectedDeviceType]);

  const isMatchingCurrentDevice = useCallback((feedback: FeedbackPointType) => {
    if (!feedback.device_info) {
      return deviceType === 'desktop';
    }
    
    if (feedback.device_info.type !== deviceType) {
      return false;
    }
    
    if (feedback.device_info.orientation !== orientation) {
      return false;
    }
    
    if (deviceType === 'custom' && feedback.device_info.type === 'custom') {
      const widthDiff = Math.abs(feedback.device_info.width - originalDimensions.width) / originalDimensions.width;
      const heightDiff = Math.abs(feedback.device_info.height - originalDimensions.height) / originalDimensions.height;
      
      return widthDiff <= 0.1 && heightDiff <= 0.1;
    }
    
    return true;
  }, [deviceType, orientation, originalDimensions]);

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
      
      const rect = overlayRef.current.getBoundingClientRect();
      
      const unscaledX = (e.clientX - rect.left) / scale;
      const unscaledY = (e.clientY - rect.top) / scale;
      
      const x = (unscaledX / originalDimensions.width) * 100;
      const y = (unscaledY / originalDimensions.height) * 100;
      
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        setNewFeedbackPosition({ x, y });
        setSelectedFeedback(null);
        e.stopPropagation();
      }
    } catch (error) {
      console.error('Error handling overlay click:', error);
    }
  }, [isFeedbackMode, isIframeReady, isInteractingWithComment, currentHoveredElements, currentElementIndex, getElementPosition, scale, originalDimensions]);
  
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
      
      let targetData: ElementTarget | null = null;
      if (currentHoveredElements.length > 0 && currentElementIndex < currentHoveredElements.length) {
        const selectedElement = currentHoveredElements[currentElementIndex];
        const rawTargetData = generateElementTarget(selectedElement);
        targetData = {
          selector: rawTargetData.selector,
          xpath: rawTargetData.xpath,
          metadata: safelyConvertElementMetadata(rawTargetData.metadata)
        };
      }
      
      const deviceInfo = {
        type: deviceType,
        width: originalDimensions.width,
        height: originalDimensions.height,
        orientation: orientation,
        scale: scale
      };
      
      const feedbackData: any = {
        prototype_id: prototypeId,
        created_by: currentUser.id,
        content: newFeedbackContent,
        position: feedbackPosition,
        status: 'open'
      };
      
      if (deviceInfo) {
        feedbackData.device_info = deviceInfo;
        feedbackData.device_type = deviceInfo.type;
      }
      
      if (targetData) {
        feedbackData.element_selector = targetData.selector || null;
        feedbackData.element_xpath = targetData.xpath || null;
        feedbackData.element_metadata = targetData.metadata || null;
      }

      console.log('Submitting feedback:', feedbackData);

      const { data: resultData, error } = await supabase
        .from('prototype_feedback')
        .insert(feedbackData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (resultData) {
        const supabaseData = resultData as SupabaseFeedbackResponse;
        
        const feedback: FeedbackPointType = {
          id: supabaseData.id,
          prototype_id: supabaseData.prototype_id,
          created_by: supabaseData.created_by,
          content: supabaseData.content,
          position: typeof supabaseData.position === 'string' 
            ? JSON.parse(supabaseData.position) 
            : supabaseData.position,
          created_at: supabaseData.created_at,
          updated_at: supabaseData.updated_at,
          status: supabaseData.status as FeedbackPointType['status'],
          element_target: supabaseData.element_selector || supabaseData.element_xpath || supabaseData.element_metadata
            ? {
                selector: supabaseData.element_selector,
                xpath: supabaseData.element_xpath,
                metadata: safelyConvertElementMetadata(supabaseData.element_metadata)
              }
            : undefined,
          device_info: 'device_info' in supabaseData && supabaseData.device_info
            ? safelyConvertDeviceInfo(supabaseData.device_info)
            : supabaseData.device_type 
              ? {
                  type: supabaseData.device_type as DeviceType,
                  width: originalDimensions.width,
                  height: originalDimensions.height,
                  orientation: 'portrait',
                  scale: 1
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
    elementTarget,
    deviceType,
    originalDimensions,
    orientation,
    scale
  ]);

  const handleUpdateFeedbackStatus = useCallback(async (status: FeedbackPointType['status'], e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    if (!selectedFeedback || !currentUser) return;
    
    try {
      const { data: resultData, error } = await supabase
        .from('prototype_feedback')
        .update({ status })
        .eq('id', selectedFeedback.id)
        .select()
        .single();

      if (error) throw error;

      if (resultData) {
        const supabaseData = resultData as SupabaseFeedbackResponse;
        
        const updatedFeedback: FeedbackPointType = {
          id: supabaseData.id,
          prototype_id: supabaseData.prototype_id,
          created_by: supabaseData.created_by,
          content: supabaseData.content,
          position: typeof supabaseData.position === 'string' 
            ? JSON.parse(supabaseData.position) 
            : supabaseData.position,
          created_at: supabaseData.created_at,
          updated_at: supabaseData.updated_at,
          status: supabaseData.status as FeedbackPointType['status'],
          element_target: supabaseData.element_selector || supabaseData.element_xpath || supabaseData.element_metadata
            ? {
                selector: supabaseData.element_selector,
                xpath: supabaseData.element_xpath,
                metadata: safelyConvertElementMetadata(supabaseData.element_metadata)
              }
            : undefined,
          device_info: 'device_info' in supabaseData && supabaseData.device_info
            ? safelyConvertDeviceInfo(supabaseData.device_info)
            : supabaseData.device_type 
              ? {
                  type: supabaseData.device_type as DeviceType,
                  width: originalDimensions.width,
                  height: originalDimensions.height,
                  orientation: 'portrait',
                  scale: 1
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
  }, [selectedFeedback, currentUser, onFeedbackUpdated, toast, originalDimensions]);

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
      className={`absolute inset-0 ${isIframeReady ? 'cursor-crosshair' : 'cursor-wait'} ${isFeedbackMode ? 'pointer-events-auto' : 'pointer-events-none'}`}
      onClick={handleOverlayClick}
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        width: originalDimensions.width,
        height: originalDimensions.height,
      }}
    >
      {!isIframeReady && isFeedbackMode && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/30 z-10">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      )}
      
      {isIframeReady && (
        <div className="absolute top-4 right-4 z-50">
          <FeedbackDeviceFilter
            selectedDeviceType={selectedDeviceType}
            onSelectDeviceType={setSelectedDeviceType}
            deviceCounts={deviceCounts}
            currentDevice={currentDeviceInfo}
          />
        </div>
      )}
      
      {isIframeReady && (
        <div className="absolute top-4 left-4 z-50 flex items-center gap-1 bg-background/80 py-1 px-2 rounded-md border text-xs text-muted-foreground">
          {deviceType === 'mobile' && <Smartphone className="h-3 w-3" />}
          {deviceType === 'tablet' && <Tablet className="h-3 w-3" />}
          {deviceType === 'desktop' && <Monitor className="h-3 w-3" />}
          <span>
            {deviceType} ({originalDimensions.width}×{originalDimensions.height})
          </span>
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
            Use arrow keys ↑↓ to navigate elements
          </div>
        </div>
      )}
      
      {isIframeReady && filteredFeedbackPoints.map(feedback => (
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
            isMatchingCurrentDevice={isMatchingCurrentDevice(feedback)}
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
