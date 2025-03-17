
import React from 'react';
import { FeedbackPoint as FeedbackPointType, FeedbackStatus } from '@/types/feedback';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';

interface FeedbackPointProps {
  feedback: FeedbackPointType;
  onClick: (feedback: FeedbackPointType) => void;
  isSelected: boolean;
  commentCount: number;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function FeedbackPoint({ 
  feedback, 
  onClick, 
  isSelected,
  commentCount = 0,
  onMouseEnter,
  onMouseLeave
}: FeedbackPointProps) {
  const { position, status } = feedback;
  
  const getStatusColor = (status: FeedbackStatus) => {
    switch (status) {
      case 'open':
        return 'bg-orange-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'resolved':
        return 'bg-green-500';
      case 'closed':
        return 'bg-gray-500';
      default:
        return 'bg-primary';
    }
  };

  // Handle click with explicit event stopping
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onClick(feedback);
  };

  return (
    <div
      className={`absolute flex items-center justify-center -translate-x-1/2 -translate-y-1/2 ${
        isSelected ? 'z-40' : 'z-30'
      } transition-transform duration-150 ease-in-out hover:scale-110`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
      }}
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        onClick={handleClick}
        className={`group relative flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200 ${
          isSelected
            ? 'bg-primary text-primary-foreground scale-125'
            : `${getStatusColor(status)} text-white hover:scale-110`
        } shadow-md border-2 border-white`}
        title="View feedback"
      >
        <MessageCircle className="h-3 w-3" />
        
        {commentCount > 0 && (
          <Badge 
            variant="secondary" 
            className="absolute -top-2 -right-2 h-4 min-w-4 flex items-center justify-center text-[10px] px-1 py-0"
          >
            {commentCount}
          </Badge>
        )}
      </button>
    </div>
  );
}
