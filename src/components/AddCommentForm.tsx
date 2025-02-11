import { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { CommentPosition } from '@/types/comment';

interface AddCommentFormProps {
  position: CommentPosition;
  onSubmit: (content: string) => Promise<any>;
  onCancel: () => void;
}

export const AddCommentForm = ({ position, onSubmit, onCancel }: AddCommentFormProps) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);
      await onSubmit(content);
      setContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit}
      onClick={(e) => e.stopPropagation()} // Add this to stop click propagation
      onMouseDown={(e) => e.stopPropagation()} // Add this to stop mousedown propagation
      onMouseUp={(e) => e.stopPropagation()} // Add this to stop mouseup propagation
      onMouseMove={(e) => e.stopPropagation()} // Add this to stop mousemove propagation
      className="absolute bg-background/95 backdrop-blur-sm p-4 rounded-lg shadow-lg z-50" // Added z-50 to ensure form stays on top
      style={{
        left: `${position.x}%`,
        top: `${position.y + position.height}%`,
        minWidth: '300px',
      }}
    >
      <Textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setError(null);
        }}
        placeholder="Add your comment..."
        className={`min-h-[100px] mb-2 ${error ? 'border-red-500' : ''}`}
        disabled={isSubmitting}
      />
      {error && (
        <p className="text-sm text-red-500 mb-2">{error}</p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!content.trim() || isSubmitting}
        >
          {isSubmitting ? 'Adding...' : 'Add Comment'}
        </Button>
      </div>
    </form>
  );
};
