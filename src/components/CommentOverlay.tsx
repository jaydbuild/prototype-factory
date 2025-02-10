import { useState } from 'react';
import { Comment } from '../types/supabase';
import { useComments } from '../hooks/useComments';
import { CommentMarker } from './CommentMarker';
import { AddCommentForm } from './AddCommentForm';
import { CommentList } from './CommentList';

type CommentStatus = 'open' | 'resolved' | 'needs review';

interface CommentOverlayProps {
  prototypeId: string;
}

export const CommentOverlay = ({ prototypeId }: CommentOverlayProps) => {
  const [selectedPosition, setSelectedPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const { comments, loading, addComment, updateCommentStatus } = useComments(prototypeId);

  const handleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setSelectedPosition({ x, y });
  };

  const handleAddComment = async (content: string) => {
    if (!selectedPosition) return;

    await addComment({
      prototype_id: prototypeId,
      content,
      position: selectedPosition,
      status: 'open' as CommentStatus,
      created_by: 'current-user', // Replace with actual user ID
      parent_id: null
    });

    setSelectedPosition(null);
  };

  if (loading) {
    return <div>Loading comments...</div>;
  }

  return (
    <div className="absolute inset-0 flex">
      <div className="flex-1 relative" onClick={handleClick}>
        {comments.map(comment => (
          <CommentMarker
            key={comment.id}
            comment={comment}
            onStatusChange={updateCommentStatus}
            isSelected={selectedComment?.id === comment.id}
          />
        ))}
        {selectedPosition && (
          <AddCommentForm
            position={selectedPosition}
            onSubmit={handleAddComment}
            onCancel={() => setSelectedPosition(null)}
          />
        )}
      </div>
      <CommentList
        comments={comments}
        onStatusChange={updateCommentStatus}
        onCommentSelect={setSelectedComment}
        selectedComment={selectedComment}
      />
    </div>
  );
};
