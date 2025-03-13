
import React from 'react';
import { FeedbackPoint as FeedbackPointType, FeedbackStatus } from '@/types/feedback';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, CheckCircle, Clock, XCircle, Target, MessageCircle
} from 'lucide-react';

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
  const { position, status, element_target } = feedback;
  
  const getStatusIcon = (status: FeedbackStatus) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-3 w-3 text-orange-500" />;
      case 'in_progress':
        return <Clock className="h-3 w-3 text-blue-500" />;
      case 'resolved':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'closed':
        return <XCircle className="h-3 w-3 text-gray-500" />;
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
      <div className={element_target ? "animate-pulse-once" : ""}>
        <button
          onClick={handleClick}
          className={`group relative flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200 ${
            isSelected
              ? 'bg-primary text-primary-foreground scale-125'
              : 'bg-background text-foreground hover:bg-primary/20 hover:scale-110'
          } shadow-md border-2 ${
            isSelected ? 'border-primary' : 'border-border'
          }`}
          title={element_target?.metadata?.displayName || "View feedback"}
        >
          {getStatusIcon(status)}
          
          {/* Element targeting indicator */}
          {element_target && (
            <span className="absolute -left-1.5 -bottom-1.5 bg-blue-500 text-white rounded-full p-0.5 w-3 h-3 flex items-center justify-center">
              <Target className="h-2 w-2" />
            </span>
          )}
          
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
    </div>
  );
}
