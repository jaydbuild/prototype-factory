
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Comment, CommentStatus } from '@/types/comment';
import { Json } from '@/integrations/supabase/types';

export const useComments = (prototypeId: string) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchComments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles:created_by(name, avatar_url)')
        .eq('prototype_id', prototypeId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const typedComments = data?.map(comment => ({
        ...comment,
        position: typeof comment.position === 'string' 
          ? JSON.parse(comment.position) 
          : comment.position,
        status: (comment.status || 'open') as CommentStatus
      })) as Comment[];
      
      setComments(typedComments || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (newComment: Omit<Comment, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const commentData = {
        ...newComment,
        position: newComment.position as Json
      };

      const { data, error } = await supabase
        .from('comments')
        .insert([commentData])
        .select('*, profiles:created_by(name, avatar_url)')
        .single();

      if (error) throw error;

      const typedComment = {
        ...data,
        position: typeof data.position === 'string' 
          ? JSON.parse(data.position) 
          : data.position,
        status: (data.status || 'open') as CommentStatus
      } as Comment;

      setComments(prev => [...prev, typedComment]);
      return typedComment;
    } catch (err) {
      console.error('Error adding comment:', err);
      throw err;
    }
  };

  const updateComment = async (commentId: string, updates: Partial<Comment>) => {
    try {
      const updateData = {
        ...updates,
        position: updates.position ? updates.position as Json : undefined
      };

      const { data, error } = await supabase
        .from('comments')
        .update(updateData)
        .eq('id', commentId)
        .select('*, profiles:created_by(name, avatar_url)')
        .single();

      if (error) throw error;

      const typedComment = {
        ...data,
        position: typeof data.position === 'string' 
          ? JSON.parse(data.position) 
          : data.position,
        status: (data.status || 'open') as CommentStatus
      } as Comment;

      setComments(prev => 
        prev.map(comment => 
          comment.id === commentId ? typedComment : comment
        )
      );

      return typedComment;
    } catch (err) {
      console.error('Error updating comment:', err);
      throw err;
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      setComments(prev => prev.filter(comment => comment.id !== commentId));
    } catch (err) {
      console.error('Error deleting comment:', err);
      throw err;
    }
  };

  const updateCommentStatus = async (commentId: string, status: CommentStatus): Promise<void> => {
    await updateComment(commentId, { status });
  };

  const addReply = async (parentId: string, content: string) => {
    const parentComment = comments.find(c => c.id === parentId);
    if (!parentComment) throw new Error('Parent comment not found');

    return addComment({
      prototype_id: prototypeId,
      content,
      parent_id: parentId,
      position: parentComment.position,
      status: 'open',
      created_by: 'current-user', // Replace with actual user ID
    });
  };

  useEffect(() => {
    fetchComments();
    
    const subscription = supabase
      .channel(`comments:${prototypeId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'comments',
          filter: `prototype_id=eq.${prototypeId}` 
        }, 
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [prototypeId]);

  return {
    comments,
    loading,
    error,
    addComment,
    updateComment,
    deleteComment,
    updateCommentStatus,
    addReply,
    refreshComments: fetchComments
  };
};
