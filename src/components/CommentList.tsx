
import { Comment } from '../types/comment';
import { Skeleton } from './ui/skeleton';
import { CommentThreadView } from './comments/CommentThreadView';

interface CommentListProps {
  comments: Comment[];
  onStatusChange: (id: string, status: Comment['status']) => Promise<void>;
  onCommentSelect: (comment: Comment) => void;
  onReply: (parentId: string, content: string) => Promise<void>;
  onEdit: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  selectedComment?: Comment | null;
  isLoading?: boolean;
}

export const CommentList = ({ 
  comments, 
  onStatusChange, 
  onCommentSelect,
  onReply,
  onEdit,
  onDelete,
  selectedComment,
  isLoading 
}: CommentListProps) => {
  if (isLoading) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 h-full p-4">
        <Skeleton className="h-8 w-3/4 mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!comments || comments.length === 0) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 h-full">
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-2">Comments</h3>
          <p className="text-gray-500">No comments available</p>
        </div>
      </div>
    );
  }

  // Organize comments into threads
  const threads = comments.reduce((acc, comment) => {
    if (!comment.parent_id) {
      if (!acc[comment.id]) {
        acc[comment.id] = {
          comment,
          replies: []
        };
      } else {
        acc[comment.id].comment = comment;
      }
    } else {
      if (!acc[comment.parent_id]) {
        acc[comment.parent_id] = {
          replies: [comment]
        };
      } else {
        acc[comment.parent_id].replies.push(comment);
      }
    }
    return acc;
  }, {} as Record<string, { comment?: Comment; replies: Comment[] }>);

  return (
    <div className="w-80 bg-white border-l border-gray-200 h-full overflow-y-auto" role="complementary">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold">Comments ({comments.length})</h3>
      </div>
      <div className="p-4 space-y-6">
        {Object.values(threads)
          .filter(thread => thread.comment) // Only show threads with parent comments
          .map(({ comment, replies }) => (
            <CommentThreadView
              key={comment!.id}
              comment={comment!}
              replies={replies}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
            />
          ))}
      </div>
    </div>
  );
};
