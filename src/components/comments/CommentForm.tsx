
import React, { useState } from 'react';
import { useSupabase } from '@/lib/supabase-provider';
import { CommentPosition } from '@/types/comment';
import { Json } from '@/integrations/supabase/types';

interface CommentFormProps {
  prototypeId: string;
  position: CommentPosition;
  onSubmit: () => void;
}

export const CommentForm: React.FC<CommentFormProps> = ({ 
  prototypeId, 
  position, 
  onSubmit 
}) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { supabase, session } = useSupabase();
  
  const MAX_CONTENT_LENGTH = 1000;

  const handleSubmit = async () => {
    if (!session?.user) {
      console.log('You must be logged in to comment');
      return;
    }

    if (content.trim().length === 0) {
      console.log('Comment cannot be empty');
      return;
    }

    setIsLoading(true);
    try {
      // Convert position to Json type
      const positionJson: Json = {
        x: position.x,
        y: position.y,
        width: position.width,
        height: position.height,
        scrollPosition: position.scrollPosition
      };

      const { error } = await supabase
        .from('comments')
        .insert({
          content,
          prototype_id: prototypeId,
          created_by: session.user.id,
          position: positionJson,
          status: 'open',
        });

      if (error) throw error;
      setContent('');
      onSubmit();
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full p-2 border rounded"
        placeholder="Add a comment..."
        maxLength={MAX_CONTENT_LENGTH}
        disabled={isLoading}
      />
      <div className="text-sm text-gray-500 mt-1">
        {content.length}/{MAX_CONTENT_LENGTH} characters
      </div>
      <div className="mt-2">
        <button
          onClick={handleSubmit}
          className="btn-primary"
          disabled={isLoading}
        >
          {isLoading ? 'Posting...' : 'Post Comment'}
        </button>
      </div>
    </div>
  );
};
