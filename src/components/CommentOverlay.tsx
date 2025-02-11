import { useState, useRef } from 'react';
import { useComments } from '../hooks/useComments';
import { CommentMarker } from './CommentMarker';
import { AddCommentForm } from './AddCommentForm';
import { CommentList } from './CommentList';
import { Comment, CommentFilter, CommentPosition } from '@/types/comment';
import { useToast } from '@/hooks/use-toast';

interface CommentOverlayProps {
  prototypeId: string;
  isCommentMode: boolean;
}

export const CommentOverlay = ({ prototypeId, isCommentMode }: CommentOverlayProps) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<CommentPosition | null>(null);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [filter, setFilter] = useState<CommentFilter>({ sortBy: 'newest' });
  const overlayRef = useRef<HTMLDivElement>(null);
  
  const { comments, loading, error, addComment, updateCommentStatus, addReply, updateComment, deleteComment } = useComments(prototypeId);
  const { toast } = useToast();

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isCommentMode) return;
    
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setDrawStart({ x, y });
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !drawStart || !overlayRef.current) return;

    const rect = overlayRef.current.getBoundingClientRect();
    const currentX = ((e.clientX - rect.left) / rect.width) * 100;
    const currentY = ((e.clientY - rect.top) / rect.height) * 100;

    setSelectedPosition({
      x: Math.min(drawStart.x, currentX),
      y: Math.min(drawStart.y, currentY),
      width: Math.abs(currentX - drawStart.x),
      height: Math.abs(currentY - drawStart.y),
      scrollPosition: window.scrollY
    });
  };

  const handleMouseUp = () => {
    if (isDrawing && selectedPosition) {
      // Only open comment form if the rectangle has meaningful dimensions
      if (selectedPosition.width > 1 && selectedPosition.height > 1) {
        setIsDrawing(false);
      } else {
        // Reset if the rectangle is too small
        setSelectedPosition(null);
      }
    }
    setIsDrawing(false);
    setDrawStart(null);
  };

  const handleAddComment = async (content: string) => {
    if (!selectedPosition) return;

    try {
      const newComment = await addComment({
        prototype_id: prototypeId,
        content,
        position: selectedPosition,
        status: 'open',
        created_by: 'current-user', // Replace with actual user ID
        parent_id: null
      });

      toast({
        title: "Comment added",
        description: "Your comment has been successfully added.",
      });

      setSelectedPosition(null);
      return newComment;
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add comment. Please try again.",
      });
      throw err;
    }
  };

  const handleEditComment = async (commentId: string, content: string) => {
    try {
      await updateComment(commentId, { content });
      toast({
        title: "Comment updated",
        description: "Your comment has been successfully updated.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update comment. Please try again.",
      });
    }
  };

  const handleReplyToComment = async (parentId: string, content: string) => {
    try {
      const parentComment = comments.find(c => c.id === parentId);
      if (!parentComment) throw new Error("Parent comment not found");

      await addComment({
        prototype_id: prototypeId,
        content,
        parent_id: parentId,
        position: parentComment.position,
        status: 'open',
        created_by: 'current-user', // Replace with actual user ID
      });

      toast({
        title: "Reply added",
        description: "Your reply has been successfully added.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add reply. Please try again.",
      });
    }
  };

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-red-500">Error loading comments: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-row-reverse pointer-events-none">
      <div 
        ref={overlayRef}
        style={{ cursor: isCommentMode ? 'crosshair' : 'default' }}
        className={`absolute inset-0 ${isCommentMode ? 'pointer-events-auto' : 'pointer-events-none'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDrawing(false);
          setDrawStart(null);
        }}
        role="region"
        aria-label="Prototype preview with comments"
      >
        {/* Drawing overlay */}
        {isDrawing && selectedPosition && (
          <div 
            className="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-20 pointer-events-none"
            style={{
              left: `${selectedPosition.x}%`,
              top: `${selectedPosition.y}%`,
              width: `${selectedPosition.width}%`,
              height: `${selectedPosition.height}%`,
            }}
          />
        )}

        {comments.map((comment) => (
          <CommentMarker
            key={comment.id}
            comment={comment}
            onStatusChange={updateCommentStatus}
            isSelected={selectedComment?.id === comment.id}
            onSelect={() => setSelectedComment(comment)}
          />
        ))}

        {selectedPosition && !isDrawing && (
          <AddCommentForm
            position={selectedPosition}
            onSubmit={handleAddComment}
            onCancel={() => setSelectedPosition(null)}
          />
        )}

        {loading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {isCommentMode && (
        <CommentList
          comments={comments}
          onStatusChange={updateCommentStatus}
          onCommentSelect={setSelectedComment}
          selectedComment={selectedComment}
          isLoading={loading}
          onReply={handleReplyToComment}
          onEdit={handleEditComment}
          onDelete={deleteComment}
          filter={filter}
          onFilterChange={setFilter}
        />
      )}
    </div>
  );
};
