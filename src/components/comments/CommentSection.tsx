
import React, { useEffect, useState } from 'react';
import { Comment, isCommentPosition } from '@/types/comment';
import { useSupabase } from '@/lib/supabase-provider';
import { CommentMarker } from './CommentMarker';
import { CommentThread } from './CommentThread';

interface CommentSectionProps {
  prototypeId: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ prototypeId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentMode, setCommentMode] = useState(false);
  const [selectedComment, setSelectedComment] = useState<string | null>(null);
  const { supabase, session } = useSupabase();

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles(name, avatar_url)')
      .eq('prototype_id', prototypeId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const typedComments = data.map(comment => ({
        ...comment,
        position: isCommentPosition(comment.position) ? comment.position : { x: 0, y: 0 },
        profiles: comment.profiles
      })) as Comment[];
      setComments(typedComments);
    }
  };

  useEffect(() => {
    fetchComments();

    const subscription = supabase
      .channel('comments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, fetchComments)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [prototypeId]);

  const handleClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!commentMode || !session?.user) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const position = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    const { error } = await supabase
      .from('comments')
      .insert({
        prototype_id: prototypeId,
        created_by: session.user.id,
        content: '',
        position,
        status: 'open',
      });

    if (error) {
      console.error('Error creating comment:', error);
      return;
    }

    await fetchComments();
  };

  const getReplies = (commentId: string) => {
    return comments.filter(c => c.parent_id === commentId);
  };

  const rootComments = comments.filter(c => !c.parent_id);

  return (
    <div className="flex h-full">
      <div className="relative flex-1" onClick={handleClick}>
        {comments.map((comment) => (
          <CommentMarker
            key={comment.id}
            position={comment.position}
            isSelected={comment.id === selectedComment}
            onClick={() => setSelectedComment(comment.id)}
          />
        ))}
      </div>
      
      <div className="w-80 border-l overflow-y-auto">
        <div className="p-4">
          <button
            onClick={() => setCommentMode(!commentMode)}
            className="btn-primary w-full mb-4"
          >
            {commentMode ? 'Disable Comment Mode' : 'Enable Comment Mode'}
          </button>
          
          {rootComments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              replies={getReplies(comment.id)}
              onUpdate={fetchComments}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
