import { useState } from 'react';

interface AddCommentFormProps {
  position: { x: number; y: number };
  onSubmit: (content: string) => void;
  onCancel: () => void;
}

export const AddCommentForm = ({ position, onSubmit, onCancel }: AddCommentFormProps) => {
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSubmit(content.trim());
      setContent('');
    }
  };

  return (
    <div
      className="absolute z-50 w-64 transform -translate-x-1/2"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
      }}
    >
      <div className="bg-white rounded-lg shadow-lg p-4">
        <form onSubmit={handleSubmit}>
          <textarea
            className="w-full p-2 border rounded-md mb-3 text-sm"
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add your comment..."
            autoFocus
          />
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!content.trim()}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
