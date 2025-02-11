
import React, { useState } from 'react';
import { Comment } from '@/types/comment';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Reply, Edit, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';

interface CommentThreadViewProps {
  comment: Comment;
  replies?: Comment[];
  onReply: (parentId: string, content: string) => Promise<void>;
  onEdit: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onStatusChange: (commentId: string, status: Comment['status']) => Promise<void>;
  isSelected?: boolean; // Added isSelected prop
}

export const CommentThreadView: React.FC<CommentThreadViewProps> = ({
  comment,
  replies = [],
  onReply,
  onEdit,
  onDelete,
  onStatusChange,
  isSelected = false, // Add default value
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [replyContent, setReplyContent] = useState('');
  const { toast } = useToast();

  const handleSubmitEdit = async () => {
    try {
      await onEdit(comment.id, editContent);
      setIsEditing(false);
      toast({
        title: "Comment updated",
        description: "Your comment has been successfully updated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update comment. Please try again.",
      });
    }
  };

  const handleSubmitReply = async () => {
    try {
      await onReply(comment.id, replyContent);
      setIsReplying(false);
      setReplyContent('');
      toast({
        title: "Reply added",
        description: "Your reply has been successfully added.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add reply. Please try again.",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(comment.id);
      toast({
        title: "Comment deleted",
        description: "Your comment has been successfully deleted.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete comment. Please try again.",
      });
    }
  };

  return (
    <div className={`space-y-4 ${isSelected ? 'ring-2 ring-blue-500 rounded-lg' : ''}`}>
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium">
              {comment.profiles?.name || 'Anonymous'}
            </span>
            <span className="text-xs text-gray-500">
              {format(new Date(comment.created_at), 'MMM d, yyyy')}
            </span>
          </div>
          <select
            value={comment.status}
            onChange={(e) => onStatusChange(comment.id, e.target.value as Comment['status'])}
            className="text-xs border rounded px-2 py-1"
          >
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="needs review">Needs Review</option>
          </select>
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[100px]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmitEdit}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-700 mb-3">{comment.content}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setIsReplying(!isReplying)}>
                <Reply className="w-4 h-4 mr-1" />
                Reply
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDelete}>
                <Trash className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </div>
          </>
        )}

        {isReplying && (
          <div className="mt-4 space-y-2">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write your reply..."
              className="w-full min-h-[100px]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmitReply}>Reply</Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  setIsReplying(false);
                  setReplyContent('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {replies.length > 0 && (
        <div className="ml-8 space-y-4 border-l-2 border-gray-100 pl-4">
          {replies.map((reply) => (
            <CommentThreadView
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
};
