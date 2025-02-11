
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Comment } from '@/types/supabase';

export const useComments = (prototypeId: string) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('prototype_id', prototypeId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Ensure position is properly typed
      const typedComments = data?.map(comment => ({
        ...comment,
        position: typeof comment.position === 'string' 
          ? JSON.parse(comment.position) 
          : comment.position
      })) as Comment[];
      
      setComments(typedComments || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (newComment: Omit<Comment, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([newComment])
        .select()
        .single();

      if (error) throw error;

      // Ensure position is properly typed
      const typedComment = {
        ...data,
        position: typeof data.position === 'string' 
          ? JSON.parse(data.position) 
          : data.position
      } as Comment;

      setComments(prev => [...prev, typedComment]);
      return typedComment;
    } catch (err) {
      setError(err as Error);
      return null;
    }
  };

  const updateCommentStatus = async (commentId: string, status: Comment['status']) => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .update({ status })
        .eq('id', commentId)
        .select()
        .single();

      if (error) throw error;

      // Ensure position is properly typed
      const typedComment = {
        ...data,
        position: typeof data.position === 'string' 
          ? JSON.parse(data.position) 
          : data.position
      } as Comment;

      setComments(prev => 
        prev.map(comment => 
          comment.id === commentId ? typedComment : comment
        )
      );
    } catch (err) {
      setError(err as Error);
    }
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
    updateCommentStatus,
    refreshComments: fetchComments
  };
};
