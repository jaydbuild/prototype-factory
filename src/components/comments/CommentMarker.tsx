import React from 'react';
import { CommentPosition } from '@/types/comment';

interface CommentMarkerProps {
  position: CommentPosition;
  isSelected: boolean;
  onClick: () => void;
}

export const CommentMarker: React.FC<CommentMarkerProps> = ({ position, isSelected, onClick }) => {
  return (
    <div
      className={`absolute w-6 h-6 rounded-full cursor-pointer transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center
        ${isSelected ? 'bg-blue-500' : 'bg-yellow-500'} hover:scale-110 transition-transform`}
      style={{ left: position.x, top: position.y }}
      onClick={onClick}
    >
      <span className="text-white text-xs">💬</span>
    </div>
  );
};
