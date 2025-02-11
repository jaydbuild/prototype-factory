
import { useState } from 'react';
import { useComments } from '../hooks/useComments';
import { CommentMarker } from './CommentMarker';
import { AddCommentForm } from './AddCommentForm';
import { CommentList } from './CommentList';
import { Comment, CommentFilter } from '@/types/comment';
import { MessageCircle, MessageCircleOff } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';

interface CommentOverlayProps {
  prototypeId: string;
}

export const CommentOverlay = ({ prototypeId }: CommentOverlayProps) => {
  const [selectedPosition, setSelectedPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [isCommentMode, setIsCommentMode] = useState(false);
  const [filter, setFilter] = useState<CommentFilter>({ sortBy: 'newest' });
  const { comments, loading, error, addComment, updateCommentStatus, addReply, updateComment, deleteComment } = useComments(prototypeId);
  const { toast } = useToast();

  const handleClick = (e: React.MouseEvent) => {
    if (!isCommentMode) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setSelectedPosition({ x, y });
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
    <div className="absolute inset-0 flex">
      <div 
        className="flex-1 relative"
        onClick={handleClick}
        role="region"
        aria-label="Prototype preview with comments"
      >
        <div className="absolute top-4 left-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsCommentMode(!isCommentMode);
              if (!isCommentMode) {
                toast({
                  description: "Click anywhere on the prototype to add a comment",
                });
              }
            }}
            className={`${
              isCommentMode ? 'bg-blue-100 hover:bg-blue-200' : 'bg-white'
            } flex items-center gap-2 transition-colors duration-200`}
            aria-pressed={isCommentMode}
          >
            {isCommentMode ? (
              <>
                <MessageCircleOff className="h-4 w-4" />
                Disable Comments
              </>
            ) : (
              <>
                <MessageCircle className="h-4 w-4" />
                Enable Comments
              </>
            )}
          </Button>
        </div>

        {comments.map((comment) => (
          <CommentMarker
            key={comment.id}
            comment={comment}
            onStatusChange={updateCommentStatus}
            isSelected={selectedComment?.id === comment.id}
            onSelect={() => setSelectedComment(comment)}
          />
        ))}

        {selectedPosition && (
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
    </div>
  );
};
