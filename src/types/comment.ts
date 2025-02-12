
import { Json } from '@/integrations/supabase/types';

export type CommentStatus = 'open' | 'resolved' | 'needs review';

export interface CommentPosition {
  [key: string]: number | undefined; // Add index signature
  x: number;
  y: number;
  width?: number;
  height?: number;
  scrollPosition?: number;
}

export interface Comment {
  id: string;
  prototype_id: string;
  created_by: string;
  content: string;
  position: CommentPosition;
  status: CommentStatus;
  parent_id?: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface CommentUpdate {
  content?: string;
  status?: CommentStatus;
}

export interface CommentFilter {
  status?: CommentStatus[];
  sortBy: 'newest' | 'oldest';
}

// Type guard to ensure position is CommentPosition
export function isCommentPosition(position: Json): position is CommentPosition {
  if (typeof position !== 'object' || position === null) return false;
  const pos = position as any;
  return typeof pos.x === 'number' && typeof pos.y === 'number';
}
