import { Comment, CommentFilter } from '../types/comment';
import { Skeleton } from './ui/skeleton';
import { CommentThreadView } from './comments/CommentThreadView';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowDownNarrowWide, ArrowUpNarrowWide } from 'lucide-react';
import { useComments } from '../hooks/useComments';
import { useToast } from '@/hooks/use-toast';

interface CommentListProps {
  comments: Comment[];
  prototypeId: string;
  onStatusChange: (id: string, status: Comment['status']) => Promise<void>;
  onCommentSelect: (comment: Comment) => void;
  onReply: (parentId: string, content: string) => Promise<void>;
  onEdit: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  selectedComment?: Comment | null;
  isLoading?: boolean;
  filter: CommentFilter;
  onFilterChange: (filter: CommentFilter) => void;
}

export const CommentList = ({
  comments,
  prototypeId,
  onStatusChange,
  onCommentSelect,
  onReply,
  onEdit,
  onDelete,
  selectedComment,
  isLoading,
  filter,
  onFilterChange
}: CommentListProps) => {
  const { resolveAllComments } = useComments(prototypeId);
  const { toast } = useToast();

  const handleResolveAll = async () => {
    try {
      await resolveAllComments();
      toast({
        title: "Success",
        description: "All comments resolved successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const filteredComments = comments
    .filter(comment => !filter.status || filter.status.includes(comment.status))
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return filter.sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

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

  return (
    <div className="space-y-4">
      <button
        onClick={handleResolveAll}
        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Resolve all comments"
      >
        Resolve All
      </button>
      <div className="w-80 bg-background/80 backdrop-blur-sm border-l border-border/50 h-[calc(100%-4rem)] overflow-y-auto ml-auto transition-all duration-200 pt-2 mt-50" role="complementary">
        <div className="p-4 border-b border-border/50">
          <h3 className="text-sm font-medium text-foreground/80 mb-4">Comments ({filteredComments.length})</h3>
          <div className="flex items-center gap-2">
            <Select
              value={filter.sortBy}
              onValueChange={(value: 'newest' | 'oldest') => 
                onFilterChange({ ...filter, sortBy: value })
              }
            >
              <SelectTrigger className="w-full h-8 text-xs bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest" className="text-xs">
                  <div className="flex items-center gap-2">
                    <ArrowDownNarrowWide className="w-3 h-3" />
                    Newest first
                  </div>
                </SelectItem>
                <SelectItem value="oldest" className="text-xs">
                  <div className="flex items-center gap-2">
                    <ArrowUpNarrowWide className="w-3 h-3" />
                    Oldest first
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {filteredComments
            .filter(comment => !comment.parent_id)
            .map(comment => {
              const replies = comments.filter(c => c.parent_id === comment.id);
              return (
                <CommentThreadView
                  key={comment.id}
                  comment={comment}
                  replies={replies}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                  isSelected={selectedComment?.id === comment.id}
                />
              );
            })}

          {filteredComments.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p className="text-sm">No comments yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
