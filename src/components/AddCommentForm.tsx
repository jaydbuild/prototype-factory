import { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { X } from 'lucide-react';

interface AddCommentFormProps {
  onSubmit: (content: string) => void;
  onCancel: () => void;
}

export const AddCommentForm = ({ onSubmit, onCancel }: AddCommentFormProps) => {
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSubmit(content);
    setContent('');
  };

  return (
    <Card className="w-72 p-3 shadow-lg">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium">Add Comment</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <form onSubmit={handleSubmit}>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type your comment here..."
          className="min-h-[80px] mb-2"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!content.trim()}
          >
            Add
          </Button>
        </div>
      </form>
    </Card>
  );
};
