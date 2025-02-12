import { useState, useRef, useEffect } from 'react';
import { useComments } from '../hooks/useComments';
import { CommentMarker } from './CommentMarker';
import { AddCommentForm } from './AddCommentForm';
import { CommentList } from './CommentList';
import { MessageSquarePlus, X } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';
import { useSupabase } from '@/lib/supabase-provider';
import { Comment, CommentPosition, CommentUpdate, CommentFilter } from '../types/comment';
import clsx from 'clsx';

interface Point {
  x: number;
  y: number;
}

interface DrawingBounds {
  start: Point;
  current: Point;
  end: Point | null;
}

export const CommentOverlay = ({ 
  prototypeId,
  children
}: { 
  prototypeId: string;
  children: React.ReactNode;
}) => {
  // UI State
  const [isCommentListVisible, setIsCommentListVisible] = useState(false);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [filter, setFilter] = useState<CommentFilter>({ sortBy: 'newest' });
  
  // Comment State
  const [isDrawingEnabled, setIsDrawingEnabled] = useState(false);
  const [drawStart, setDrawStart] = useState<Point | null>(null);
  const [currentDraw, setCurrentDraw] = useState<Point | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<CommentPosition | null>(null);
  const [isAddingComment, setIsAddingComment] = useState(false);
  
  // Interaction State
  const [isInteractionActive, setIsInteractionActive] = useState(false);
  
  // Scroll State
  const [scrollOffset, setScrollOffset] = useState({ x: 0, y: 0 });
  
  // Refs
  const overlayRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Hooks
  const { comments, loading, addComment, updateCommentStatus, addReply, updateComment, deleteComment } = useComments(prototypeId);
  const { toast } = useToast();
  const { session } = useSupabase();

  // Show comment list when there are comments
  useEffect(() => {
    if (comments.length > 0 && !isCommentListVisible) {
      setIsCommentListVisible(true);
    }
  }, [comments.length]);

  // Scroll handling
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleScroll = () => {
      const doc = iframe.contentDocument;
      if (doc) {
        setScrollOffset({
          x: doc.documentElement.scrollLeft || doc.body.scrollLeft,
          y: doc.documentElement.scrollTop || doc.body.scrollTop
        });
      }
    };

    const contentWindow = iframe.contentWindow;
    contentWindow?.addEventListener('scroll', handleScroll, { passive: true });
    return () => contentWindow?.removeEventListener('scroll', handleScroll);
  }, []);

  const getRelativePosition = (e: React.MouseEvent): Point | null => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return null;

    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    };
  };

  const handleAddCommentClick = () => {
    if (!session?.user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add comments.",
        variant: "destructive"
      });
      return;
    }
    
    setIsInteractionActive(true);
    toast({
      title: 'Draw Area',
      description: 'Click and drag to select comment region',
    });
    setDrawStart(null);
    setCurrentDraw(null);
  };

  const handleCancel = () => {
    setIsInteractionActive(false);
    setIsAddingComment(false);
    setSelectedPosition(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getRelativePosition(e);
    if (!pos) return;
    
    setDrawStart(pos);
    setCurrentDraw(pos);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawStart) return;
    
    const pos = getRelativePosition(e);
    if (!pos) return;
    
    setCurrentDraw(pos);
  };

  const handleMouseUp = () => {
    if (!drawStart || !currentDraw) return;
    
    // Calculate final rectangle
    const x = Math.min(drawStart.x, currentDraw.x);
    const y = Math.min(drawStart.y, currentDraw.y);
    const width = Math.abs(currentDraw.x - drawStart.x);
    const height = Math.abs(currentDraw.y - drawStart.y);
    
    if (width < 5 || height < 5) {
      toast({
        title: "Selection too small",
        description: "Please draw a larger area for the comment",
        variant: "destructive"
      });
      setDrawStart(null);
      setCurrentDraw(null);
      return;
    }
    
    setSelectedPosition({ x, y, width, height });
    setIsAddingComment(true);
    setIsInteractionActive(false);
    setDrawStart(null);
    setCurrentDraw(null);
  };

  const handleAddComment = async (content: string) => {
    if (!selectedPosition || !session?.user) return;

    try {
      await addComment({
        prototype_id: prototypeId,
        content,
        position: selectedPosition,
        status: 'open',
        created_by: session.user.id,
        parent_id: null
      });
      setIsAddingComment(false);
      setIsCommentListVisible(true);
      toast({
        title: 'Comment added',
        description: 'Your comment has been added successfully.'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add comment. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="relative h-full flex flex-col">
      {/* Render children (iframe) first */}
      {children}
      
      {/* Comment overlay */}
      <div 
        ref={overlayRef}
        className={clsx(
          "absolute inset-0",
          isInteractionActive && "cursor-crosshair"
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ pointerEvents: isInteractionActive ? 'auto' : 'none' }}
      >
        {/* Drawing Preview */}
        {drawStart && currentDraw && (
          <div 
            className="absolute border-2 border-primary bg-primary/10 pointer-events-none"
            style={{
              left: `${Math.min(drawStart.x, currentDraw.x)}%`,
              top: `${Math.min(drawStart.y, currentDraw.y)}%`,
              width: `${Math.abs(currentDraw.x - drawStart.x)}%`,
              height: `${Math.abs(currentDraw.y - drawStart.y)}%`
            }}
          />
        )}

        {/* Comment Markers */}
        <div className="absolute inset-0" style={{ pointerEvents: 'auto' }}>
          {comments.map((comment) => (
            <CommentMarker
              key={comment.id}
              comment={comment}
              scrollOffset={scrollOffset}
              onStatusChange={updateCommentStatus}
              isSelected={selectedComment?.id === comment.id}
              onSelect={() => {
                setSelectedComment(comment);
                setIsCommentListVisible(true);
              }}
            />
          ))}
        </div>

        {/* Add Comment Form */}
        {selectedPosition && isAddingComment && (
          <div 
            className="absolute z-50"
            style={{ 
              left: `${selectedPosition.x + (selectedPosition.width / 2)}%`,
              top: `${selectedPosition.y + selectedPosition.height}%`,
              transform: 'translate(-50%, 8px)',
              pointerEvents: 'auto'
            }}
          >
            <AddCommentForm
              onSubmit={handleAddComment}
              onCancel={handleCancel}
            />
          </div>
        )}
      </div>

      {/* Fixed Comment Buttons */}
      <div className="fixed bottom-4 right-4 flex gap-2 z-[100]">
        {/* Add Comment FAB - Always visible */}
        <Button
          variant="default"
          size="icon"
          className="rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handleAddCommentClick}
          disabled={isAddingComment}
          style={{ pointerEvents: 'auto' }}
        >
          <MessageSquarePlus className="h-5 w-5" />
        </Button>

        {/* Comment List Toggle - Only visible when there are comments */}
        {comments.length > 0 && (
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
            onClick={() => setIsCommentListVisible(!isCommentListVisible)}
            style={{ pointerEvents: 'auto' }}
          >
            {isCommentListVisible ? <X className="h-5 w-5" /> : <MessageSquarePlus className="h-5 w-5" />}
          </Button>
        )}
      </div>

      {/* Comment List */}
      {isCommentListVisible && comments.length > 0 && (
        <div 
          className={clsx(
            "fixed right-0 top-[3.5rem] bottom-0 w-80 bg-background border-l",
            "transform transition-transform duration-200 ease-in-out",
            "shadow-lg z-40"
          )}
          style={{ pointerEvents: 'auto' }}
        >
          <CommentList
            prototypeId={prototypeId}
            comments={comments}
            selectedComment={selectedComment}
            onCommentSelect={setSelectedComment}
            onStatusChange={updateCommentStatus}
            onReply={addReply}
            onEdit={async (commentId, content) => {
              await updateComment(commentId, { content });
            }}
            onDelete={deleteComment}
            isLoading={loading}
            filter={filter}
            onFilterChange={setFilter}
          />
        </div>
      )}
    </div>
  );
};
