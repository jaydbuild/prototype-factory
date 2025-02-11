
import { Comment } from '../types/supabase';
import { Skeleton } from './ui/skeleton';

type CommentStatus = 'open' | 'resolved' | 'needs review';

interface CommentListProps {
  comments: Comment[];
  onStatusChange: (id: string, status: CommentStatus) => void;
  onCommentSelect: (comment: Comment) => void;
  selectedComment?: Comment | null;
  isLoading?: boolean;
}

export const CommentList = ({ 
  comments, 
  onStatusChange, 
  onCommentSelect, 
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

  return (
    <div className="w-80 bg-white border-l border-gray-200 h-full overflow-y-auto" role="complementary">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold">Comments ({comments.length})</h3>
      </div>
      <div className="divide-y divide-gray-200">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
              selectedComment?.id === comment.id ? 'bg-blue-50' : ''
            }`}
            onClick={() => onCommentSelect(comment)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">
                {comment.created_by}
              </span>
              <select
                value={comment.status}
                onChange={(e) => onStatusChange(comment.id, e.target.value as CommentStatus)}
                className="text-xs border rounded px-2 py-1"
                onClick={(e) => e.stopPropagation()}
                aria-label="Change comment status"
              >
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
                <option value="needs review">Needs Review</option>
              </select>
            </div>
            <p className="text-sm text-gray-600">{comment.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
