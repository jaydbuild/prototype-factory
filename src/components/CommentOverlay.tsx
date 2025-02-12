import { useState, useRef } from 'react';
import { useComments } from '../hooks/useComments';
import { CommentMarker } from './CommentMarker';
import { AddCommentForm } from './AddCommentForm';
import { CommentList } from './CommentList';
import { Comment, CommentFilter, CommentPosition } from '@/types/comment';
import { useToast } from '@/hooks/use-toast';
import { useSupabase } from '@/lib/supabase-provider';
import clsx from 'clsx';

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
  const { session } = useSupabase();

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isCommentMode || selectedPosition || e.button !== 0) return;
    
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setDrawStart({ x, y });
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !drawStart || !isCommentMode) return;

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
      if (selectedPosition.width > 1 && selectedPosition.height > 1) {
        setIsDrawing(false);
      } else {
        setSelectedPosition(null);
      }
    }
    setIsDrawing(false);
    setDrawStart(null);
  };

  const handleAddComment = async (content: string) => {
    if (!selectedPosition || !session?.user) return;

    try {
      const newComment = await addComment({
        prototype_id: prototypeId,
        content,
        position: selectedPosition,
        status: 'open',
        created_by: session.user.id,
        parent_id: null
      });

      setSelectedPosition(null);
      setSelectedComment(newComment);

      toast({
        title: "Success",
        description: "Comment added successfully",
      });

      return newComment;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add comment';
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
      throw error;
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
    if (!session?.user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to reply",
      });
      return;
    }

    try {
      const parentComment = comments.find(c => c.id === parentId);
      if (!parentComment) throw new Error("Parent comment not found");

      await addComment({
        prototype_id: prototypeId,
        content,
        parent_id: parentId,
        position: parentComment.position,
        status: 'open',
        created_by: session.user.id,
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
    <div className="relative h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <div 
          ref={overlayRef}
          className={clsx(
            'absolute inset-0 contain-strict will-change-transform',
            isCommentMode ? 'pointer-events-auto' : 'pointer-events-none',
            isCommentMode && !selectedPosition && 'cursor-crosshair'
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          role="region"
          aria-label="Prototype preview with comments"
        >
          {isDrawing && selectedPosition && !selectedComment && (
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
      </div>
      {isCommentMode && (
        <CommentList
          prototypeId={prototypeId}
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
