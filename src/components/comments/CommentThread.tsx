import React, { useState } from 'react';
import { Comment } from '@/types/comment';
import { format } from 'date-fns';
import { useCommentManagement } from '@/hooks/useCommentManagement';

interface CommentThreadProps {
  comment: Comment;
  replies?: Comment[];
  onUpdate: () => void;
}

export const CommentThread: React.FC<CommentThreadProps> = ({ comment, replies = [], onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);

  const {
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
  } = useCommentManagement(comment, onUpdate);

  const handleUpdate = async () => {
    const success = await updateComment(content);
    if (success) setIsEditing(false);
  };

  const handleReply = async () => {
    const success = await addReply();
    if (success) {
      setIsReplying(false);
      setReplyContent('');
    }
  };

  return (
    <div className="border rounded p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <img 
          src={comment.profiles?.avatar_url || '/default-avatar.png'} 
          alt="Avatar"
          className="w-6 h-6 rounded-full"
        />
        <span className="font-medium">{comment.profiles?.name}</span>
        <span className="text-gray-500 text-sm">
          {format(new Date(comment.created_at), 'MMM d, yyyy')}
        </span>
      </div>
      
      {isEditing ? (
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-2 border rounded"
            maxLength={MAX_CONTENT_LENGTH}
            disabled={isLoading}
          />
          <div className="text-sm text-gray-500 mt-1">
            {content.length}/{MAX_CONTENT_LENGTH} characters
          </div>
          <div className="mt-2">
            <button 
              onClick={handleUpdate} 
              className="btn-primary mr-2"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
            <button 
              onClick={() => setIsEditing(false)} 
              className="btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="whitespace-pre-wrap break-words">{comment.content}</p>
          <div className="mt-2 space-x-2">
            {canEdit && (
              <>
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="btn-secondary"
                  disabled={isLoading}
                >
                  Edit
                </button>
                <button 
                  onClick={deleteComment} 
                  className="btn-danger"
                  disabled={isLoading}
                >
                  Delete
                </button>
              </>
            )}
            <button 
              onClick={() => setIsReplying(!isReplying)} 
              className="btn-secondary"
              disabled={isLoading}
            >
              Reply
            </button>
          </div>
        </div>
      )}

      {isReplying && (
        <div className="mt-4">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Write a reply..."
            maxLength={MAX_CONTENT_LENGTH}
            disabled={isLoading}
          />
          <div className="text-sm text-gray-500 mt-1">
            {replyContent.length}/{MAX_CONTENT_LENGTH} characters
          </div>
          <div className="mt-2">
            <button 
              onClick={handleReply} 
              className="btn-primary mr-2"
              disabled={isLoading}
            >
              {isLoading ? 'Posting...' : 'Post Reply'}
            </button>
            <button 
              onClick={() => setIsReplying(false)} 
              className="btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {replies.length > 0 && (
        <div className="ml-4 mt-4 border-l-2 pl-4">
          {replies.map((reply) => (
            <CommentThread key={reply.id} comment={reply} onUpdate={onUpdate} />
          ))}
        </div>
      )}
    </div>
  );
};
