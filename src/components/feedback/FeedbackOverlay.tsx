import React, { useState, useRef, useEffect } from 'react';
import { FeedbackPoint as FeedbackPointType, FeedbackUser } from '@/types/feedback';
import { FeedbackPoint } from './FeedbackPoint';
import { CommentThread } from './CommentThread';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const [iframeRect, setIframeRect] = useState<DOMRect | null>(null);

  // Find and track the iframe position
  useEffect(() => {
    const positionOverlay = () => {
      // If we have a direct reference to the preview container, use it
      if (previewContainerRef?.current) {
        const previewContainer = previewContainerRef.current;
        const previewRect = previewContainer.getBoundingClientRect();
        
        // Find the iframe within the preview container
        const iframe = previewContainer.querySelector('iframe') as HTMLIFrameElement;
        
        if (iframe) {
          // Get the iframe's position and dimensions
          const iframeRect = iframe.getBoundingClientRect();
          setIframeRect(iframeRect);
          
          // Position the overlay exactly over the iframe
          if (overlayRef.current) {
            overlayRef.current.style.position = 'fixed';
            overlayRef.current.style.top = `${iframeRect.top}px`;
            overlayRef.current.style.left = `${iframeRect.left}px`;
            overlayRef.current.style.width = `${iframeRect.width}px`;
            overlayRef.current.style.height = `${iframeRect.height}px`;
          }
        } else {
          // Fallback: position over the preview container if iframe not found
          if (overlayRef.current) {
            overlayRef.current.style.position = 'fixed';
            overlayRef.current.style.top = `${previewRect.top}px`;
            overlayRef.current.style.left = `${previewRect.left}px`;
            overlayRef.current.style.width = `${previewRect.width}px`;
            overlayRef.current.style.height = `${previewRect.height}px`;
          }
        }
      } else {
        // Fallback: look for the iframe directly if no preview container ref
        const iframe = document.querySelector('.sp-preview iframe') as HTMLIFrameElement;
        
        if (iframe) {
          // Get the iframe's position and dimensions
          const rect = iframe.getBoundingClientRect();
          setIframeRect(rect);
          
          // Position the overlay exactly over the iframe
          if (overlayRef.current) {
            overlayRef.current.style.position = 'fixed';
            overlayRef.current.style.top = `${rect.top}px`;
            overlayRef.current.style.left = `${rect.left}px`;
            overlayRef.current.style.width = `${rect.width}px`;
            overlayRef.current.style.height = `${rect.height}px`;
          }
        }
      }
    };

    // Position the overlay initially
    if (isFeedbackMode) {
      // Small delay to ensure the iframe is rendered
      const timer = setTimeout(() => {
        positionOverlay();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isFeedbackMode, previewContainerRef, deviceType, orientation, scale]);

  // Set up a resize observer to track changes to the iframe size
  useEffect(() => {
    if (!isFeedbackMode) return;
    
    const handleResize = () => {
      // Small delay to ensure the iframe has been resized
      setTimeout(() => {
        const positionOverlay = () => {
          if (previewContainerRef?.current) {
            const previewContainer = previewContainerRef.current;
            const iframe = previewContainer.querySelector('iframe') as HTMLIFrameElement;
            
            if (iframe) {
              const iframeRect = iframe.getBoundingClientRect();
              setIframeRect(iframeRect);
              
              if (overlayRef.current) {
                overlayRef.current.style.position = 'fixed';
                overlayRef.current.style.top = `${iframeRect.top}px`;
                overlayRef.current.style.left = `${iframeRect.left}px`;
                overlayRef.current.style.width = `${iframeRect.width}px`;
                overlayRef.current.style.height = `${iframeRect.height}px`;
              }
            }
          }
        };
        
        positionOverlay();
      }, 300);
    };

    // Set up the resize observer
    const resizeObserver = new ResizeObserver(handleResize);
    
    // Observe the document body for size changes
    resizeObserver.observe(document.body);
    
    // Also observe the preview container if available
    if (previewContainerRef?.current) {
      resizeObserver.observe(previewContainerRef.current);
    }
    
    // Add window resize listener for good measure
    window.addEventListener('resize', handleResize);

    // Clean up
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [isFeedbackMode, previewContainerRef]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isFeedbackMode || !overlayRef.current || !iframeRect) return;
    
    // Don't add new feedback if clicking on existing feedback or comment thread
    if ((e.target as HTMLElement).closest('.feedback-point') || 
        (e.target as HTMLElement).closest('.feedback-form') ||
        (e.target as HTMLElement).closest('.comment-thread')) {
      return;
    }
    
    // Calculate position relative to the iframe
    const rect = overlayRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Ensure the click is within the bounds of the overlay
    if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
      setNewFeedbackPosition({ x, y });
      setSelectedFeedback(null);
    }
  };

  const handleFeedbackPointClick = (feedback: FeedbackPointType) => {
    setSelectedFeedback(feedback);
    setNewFeedbackPosition(null);
  };

  const handleCancelNewFeedback = () => {
    setNewFeedbackPosition(null);
    setNewFeedbackContent('');
  };

  const handleSubmitNewFeedback = async () => {
    if (!newFeedbackPosition || !newFeedbackContent.trim() || !currentUser) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please add a comment and make sure you're logged in."
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('prototype_feedback')
        .insert({
          prototype_id: prototypeId,
          created_by: currentUser.id,
          content: newFeedbackContent,
          position: newFeedbackPosition,
          status: 'open'
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        onFeedbackAdded(data as FeedbackPointType);
        toast({
          title: "Feedback added",
          description: "Your feedback has been added to the prototype."
        });
      }
      
      setNewFeedbackPosition(null);
      setNewFeedbackContent('');
    } catch (error) {
      console.error("Error adding feedback:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add feedback. Please try again."
      });
    }
  };

  const handleUpdateFeedbackStatus = async (status: FeedbackPointType['status']) => {
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
        onFeedbackUpdated(data as FeedbackPointType);
        setSelectedFeedback(data as FeedbackPointType);
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
  };

  const handleAddReply = (content: string) => {
    // In a real implementation, this would add a reply to the feedback
    // For now, we'll just show a toast
    toast({
      title: "Reply added",
      description: "Your reply has been added to the feedback."
    });
  };

  return (
    <div 
      ref={overlayRef}
      className={`fixed ${isFeedbackMode ? 'cursor-crosshair z-40' : 'pointer-events-none'}`}
      onClick={handleOverlayClick}
      style={{ 
        pointerEvents: isFeedbackMode ? 'auto' : 'none',
      }}
    >
      {/* Existing feedback points */}
      {feedbackPoints.map(feedback => (
        <div key={feedback.id} className="feedback-point">
          <FeedbackPoint
            feedback={feedback}
            onClick={handleFeedbackPointClick}
            isSelected={selectedFeedback?.id === feedback.id}
            commentCount={0} // In a real implementation, this would be the count of replies
          />
        </div>
      ))}
      
      {/* Selected feedback comment thread */}
      {selectedFeedback && (
        <div 
          className="absolute comment-thread z-40"
          style={{
            left: `${selectedFeedback.position.x}%`,
            top: `${selectedFeedback.position.y}%`,
            transform: 'translate(10px, -50%)'
          }}
          onClick={e => e.stopPropagation()}
        >
          <CommentThread
            feedback={selectedFeedback}
            onClose={() => setSelectedFeedback(null)}
            onUpdateStatus={handleUpdateFeedbackStatus}
            onAddReply={handleAddReply}
            currentUser={currentUser}
            creator={feedbackUsers[selectedFeedback.created_by]}
          />
        </div>
      )}
      
      {/* New feedback form */}
      {newFeedbackPosition && (
        <div 
          className="absolute feedback-form z-40"
          style={{
            left: `${newFeedbackPosition.x}%`,
            top: `${newFeedbackPosition.y}%`,
            transform: 'translate(10px, -50%)'
          }}
          onClick={e => e.stopPropagation()}
        >
          <Card className="w-72">
            <CardContent className="p-3">
              <Textarea
                placeholder="What's your feedback?"
                value={newFeedbackContent}
                onChange={e => setNewFeedbackContent(e.target.value)}
                className="min-h-[80px]"
                autoFocus
              />
            </CardContent>
            <CardFooter className="p-3 pt-0 flex justify-between">
              <Button variant="outline" size="sm" onClick={handleCancelNewFeedback}>
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
