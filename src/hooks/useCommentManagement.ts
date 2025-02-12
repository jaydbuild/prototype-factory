
import { useState } from 'react';
import { useSupabase } from '@/lib/supabase-provider';
import { Comment, CommentPosition } from '@/types/comment';
import { Json } from '@/integrations/supabase/types';

export const useCommentManagement = (comment: Comment, onUpdate: () => void) => {
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState(comment.content);
  const [replyContent, setReplyContent] = useState('');
  const { supabase, session } = useSupabase();
  
  const MAX_CONTENT_LENGTH = 1000;
  const canEdit = session?.user?.id === comment.created_by;

  const validateContent = (text: string) => {
    if (text.trim().length === 0) {
      console.log('Content cannot be empty');
      return false;
    }
    if (text.length > MAX_CONTENT_LENGTH) {
      console.log(`Content must be less than ${MAX_CONTENT_LENGTH} characters`);
      return false;
    }
    return true;
  };

  const updateComment = async (newContent: string) => {
    if (!canEdit || !session?.user) {
      console.log('You must be logged in to edit comments');
      return false;
    }

    if (!validateContent(newContent)) return false;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('comments')
        .update({ content: newContent, updated_at: new Date().toISOString() })
        .eq('id', comment.id);

      if (error) throw error;
      onUpdate();
      return true;
    } catch (error: any) {
      console.error('Failed to update comment:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteComment = async () => {
    if (!canEdit || !session?.user) {
      console.log('You must be logged in to delete comments');
      return false;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', comment.id);

      if (error) throw error;
      onUpdate();
      return true;
    } catch (error) {
      console.error('Failed to delete comment:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const addReply = async () => {
    if (!session?.user) {
      console.log('You must be logged in to reply');
      return false;
    }

    if (!validateContent(replyContent)) return false;

    setIsLoading(true);
    try {
      // Convert position to Json type
      const positionJson: Json = {
        x: comment.position.x,
        y: comment.position.y,
        width: comment.position.width,
        height: comment.position.height,
        scrollPosition: comment.position.scrollPosition
      };

      const { error } = await supabase
        .from('comments')
        .insert({
          content: replyContent,
          parent_id: comment.id,
          prototype_id: comment.prototype_id,
          created_by: session.user.id,
          status: 'open',
          position: positionJson,
        });

      if (error) throw error;
      onUpdate();
      return true;
    } catch (error: any) {
      console.error('Failed to post reply:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    content,
    setContent,
    replyContent,
    setReplyContent,
    isLoading,
    canEdit,
    MAX_CONTENT_LENGTH,
    updateComment,
    deleteComment,
    addReply
  };
};
